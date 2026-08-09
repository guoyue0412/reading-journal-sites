import assert from "node:assert/strict";
import test from "node:test";
import react from "@vitejs/plugin-react";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalSelf = globalThis.self;
globalThis.self = globalThis;

let vite;
test.before(async () => {
  const root = new URL("../", import.meta.url).pathname;
  vite = await createServer({
    appType: "custom",
    configFile: false,
    logLevel: "silent",
    plugins: [react()],
    root,
    cacheDir: `/tmp/reading-journal-markdown-section-editor-vite-${process.pid}`,
    resolve: { alias: { "@": root } },
    server: { middlewareMode: true },
  });
});

test.after(async () => {
  if (vite) await vite.close();
  if (originalSelf === undefined) delete globalThis.self;
  else globalThis.self = originalSelf;
});

test("an image upload inserts into the latest parent text at the cursor captured when the upload began", async () => {
  const { MarkdownSectionEditor } = await vite.ssrLoadModule("/components/editor/markdown-section-editor.tsx");
  const originalFetch = globalThis.fetch;
  const changes = [];
  let resolveUpload;
  let uploadStarted;
  let textareaNode;
  let renderer;

  try {
    const started = new Promise((resolve) => { uploadStarted = resolve; });
    globalThis.fetch = () => {
      uploadStarted();
      return new Promise((resolve) => { resolveUpload = resolve; });
    };
    function Parent() {
      const [value, setValue] = React.useState("A");
      return React.createElement(MarkdownSectionEditor, {
        postId: "post-a",
        label: "正文",
        value,
        onChange(next) { changes.push(next); setValue(next); },
      });
    }
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(Parent), {
        createNodeMock(element) {
          if (element.type === "textarea") {
            textareaNode = { selectionStart: 1, selectionEnd: 1 };
            return textareaNode;
          }
          return {};
        },
      });
    });

    const imageInput = renderer.root.findAllByType("input").find((input) => input.props.type === "file");
    assert.ok(imageInput);
    await act(async () => {
      imageInput.props.onChange({ target: { files: [new File(["image"], "upload.png", { type: "image/png" })], value: "upload.png" } });
      await started;
    });
    const imageButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "上传中…");
    assert.equal(imageButton.props.disabled, true, "the duplicate-upload control stays disabled while the request is pending");
    assert.equal(renderer.root.findByType("textarea").props.disabled, undefined, "typing remains available while upload is pending");

    await act(async () => {
      renderer.root.findByType("textarea").props.onChange({ target: { value: "AB" } });
    });
    assert.equal(renderer.root.findByType("textarea").props.value, "AB", "the parent rerenders with text typed during the upload");

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/upload.png", safeName: "upload.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.deepEqual(changes, ["AB", "A![upload.png](/uploads/upload.png)B"]);
    assert.equal(renderer.root.findByType("textarea").props.value, "A![upload.png](/uploads/upload.png)B");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});

test("an image upload error re-enables its control and reports the server error without disabling typing", async () => {
  const { MarkdownSectionEditor } = await vite.ssrLoadModule("/components/editor/markdown-section-editor.tsx");
  const originalFetch = globalThis.fetch;
  let renderer;

  try {
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: "存储失败" }) });
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(MarkdownSectionEditor, {
        postId: "post-a", label: "正文", value: "A", onChange() {},
      }));
    });
    const imageInput = renderer.root.findAllByType("input").find((input) => input.props.type === "file");
    await act(async () => {
      imageInput.props.onChange({ target: { files: [new File(["image"], "upload.png", { type: "image/png" })], value: "upload.png" } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const imageButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "图片");
    assert.equal(imageButton.props.disabled, false);
    assert.equal(renderer.root.findByType("textarea").props.disabled, undefined);
    assert.equal(renderer.root.findByProps({ role: "alert" }).children.join(""), "存储失败");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});

async function makePost(id, title, content) {
  const { createEmptyDraft } = await vite.ssrLoadModule("/lib/blog/default-templates.ts");
  const post = createEmptyDraft("reflections", id, "2026-08-10", []);
  return { ...post, title, sections: post.sections.map((section, index) => index === 0 ? { ...section, content } : section) };
}

function editorFileInput(renderer) {
  return renderer.root.findAllByType("input").find((input) => input.props.accept?.startsWith("image/"));
}

test("selecting article B waits for article A's upload to merge and save before switching", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const postA = await makePost("post-a", "文章 A", "A");
  const postB = await makePost("post-b", "文章 B", "B");
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      if (String(url) === "/api/editor/posts/post-a") {
        const body = JSON.parse(init.body);
        return { ok: true, json: async () => ({ post: { ...body.draft, draftVersion: body.expectedVersion + 1 } }) };
      }
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA, postB], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    const postList = renderer.root.findByProps({ className: "studio-posts-toggle" });
    await act(async () => { postList.props.onClick(); });
    const articleB = renderer.root.findAllByType("button").find((button) => button.findAllByType("span").some((span) => span.children.join("") === "文章 B"));
    await act(async () => { articleB.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 20)); });
    assert.ok(renderer.root.findAllByType("input").some((input) => input.props.value === "文章 A"), "the selection remains on A while its image is pending");

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/a.png", safeName: "a.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.ok(renderer.root.findAllByType("input").some((input) => input.props.value === "文章 B"));
    assert.ok(renderer.root.findAllByType("textarea").some((textarea) => textarea.props.value === "B"));
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test("a pending upload cannot resurrect a section deleted before its response", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const postA = await makePost("post-a", "文章 A", "A");
  const sectionLabel = `${postA.sections[0].title}内容`;
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = (url) => String(url) === "/api/editor/assets"
      ? new Promise((resolve) => { resolveUpload = resolve; })
      : { ok: true, json: async () => ({}) };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    const deleteButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "删除");
    await act(async () => { deleteButton.props.onClick(); });
    assert.equal(renderer.root.findAllByType("textarea").some((textarea) => textarea.props["aria-label"] === sectionLabel), false);

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/a.png", safeName: "a.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(renderer.root.findAllByType("textarea").some((textarea) => textarea.props["aria-label"] === sectionLabel), false);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("publishing waits for the current article upload and saves its returned image before publishing", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const postA = await makePost("post-a", "文章 A", "A");
  const calls = [];
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      calls.push([String(url), init]);
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      if (String(url) === "/api/editor/posts/post-a") {
        const body = JSON.parse(init.body);
        return { ok: true, json: async () => ({ post: { ...body.draft, draftVersion: body.expectedVersion + 1 } }) };
      }
      if (String(url) === "/api/editor/posts/post-a/publish") return { ok: true, json: async () => ({ post: { ...postA, draftVersion: 2, publishedAt: "2026-08-10T00:00:00.000Z" } }) };
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    const publish = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publish.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(calls.filter(([url]) => url.endsWith("/publish")).length, 0, "the publish request is gated on the pending image upload");

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/a.png", safeName: "a.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.equal(calls.filter(([url]) => url === "/api/editor/posts/post-a").length, 1, "the completed image is persisted first");
    assert.equal(calls.filter(([url]) => url.endsWith("/publish")).length, 1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("a failed image upload remains visible in its module and blocks publication with a workspace warning", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const postA = await makePost("post-a", "文章 A", "A");
  const calls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      calls.push([String(url), init]);
      if (String(url) === "/api/editor/assets") return { ok: false, json: async () => ({ error: "存储失败" }) };
      throw new Error(`publication must not be requested after an upload failure: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => {
      editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(renderer.root.findAllByProps({ role: "alert" }).some((alert) => alert.children.join("") === "存储失败"), "the module retains its own upload error");
    const publish = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publish.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(calls.filter(([url]) => url.endsWith("/publish")).length, 0);
    assert.ok(renderer.root.findAllByType("p").some((paragraph) => paragraph.children.join("").includes("图片上传失败")), "the workspace exposes the blocking upload error");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
