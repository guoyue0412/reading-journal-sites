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

test("toolbar formatting uses the textarea's live selection", async () => {
  const { MarkdownSectionEditor } = await vite.ssrLoadModule("/components/editor/markdown-section-editor.tsx");
  let renderer;

  try {
    function Parent() {
      const [value, setValue] = React.useState("ABC");
      return React.createElement(MarkdownSectionEditor, { postId: "post-a", label: "正文", value, onChange: setValue });
    }
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(Parent), {
        createNodeMock: (element) => element.type === "textarea" ? { selectionStart: 1, selectionEnd: 2 } : {},
      });
    });

    const bold = renderer.root.findAllByType("button").find((button) => button.children.join("") === "粗体");
    await act(async () => { bold.props.onClick(); });

    assert.equal(renderer.root.findByType("textarea").props.value, "A**B**C");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
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

test("an upload never replaces selected text that changed while the request was pending", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const post = await makePost("post-a", "文章 A", "ABC");
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = (url) => {
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(StructuredEditor, { initialPosts: [post], initialTemplates: [], ownerName: "Guo Yue" }),
        { createNodeMock: (element) => element.type === "textarea" ? { selectionStart: 1, selectionEnd: 2 } : {} },
      );
    });
    await act(async () => {
      editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } });
    });
    const editedSection = renderer.root.findAllByType("textarea").find((textarea) => textarea.props.value === "ABC");
    await act(async () => { editedSection.props.onChange({ target: { value: "AXC" } }); });

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/a.png", safeName: "a.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.ok(renderer.root.findAllByType("textarea").some((textarea) => textarea.props.value === "AXC![a.png](/uploads/a.png)"));
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

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

test("deleting a section clears its failed upload so the remaining draft can publish", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const postA = await makePost("post-a", "文章 A", "A");
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage, confirm: globalThis.confirm };
  const calls = [];
  let persisted = postA;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      calls.push([String(url), init]);
      if (String(url) === "/api/editor/assets") return { ok: false, json: async () => ({ error: "存储失败" }) };
      if (String(url) === "/api/editor/posts/post-a") {
        const body = JSON.parse(init.body);
        persisted = { ...body.draft, draftVersion: body.expectedVersion + 1 };
        return { ok: true, json: async () => ({ post: persisted }) };
      }
      if (String(url) === "/api/editor/posts/post-a/publish") return { ok: true, json: async () => ({ post: { ...persisted, status: "published", draftVersion: persisted.draftVersion + 1 } }) };
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => {
      editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const deleteButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "删除");
    await act(async () => { deleteButton.props.onClick(); });
    const publish = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publish.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 20)); });

    assert.equal(calls.filter(([url]) => url === "/api/editor/posts/post-a").length, 1);
    assert.equal(calls.filter(([url]) => url.endsWith("/publish")).length, 1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("conflict recovery waits for a pending upload and imports the latest image without another stale PATCH", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const postA = await makePost("post-a", "文章 A", "A");
  const recovered = { ...postA, id: "post-recovered", slug: "2026-08-10-2", draftVersion: 0 };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const calls = [];
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
      calls.push([String(url), init, body]);
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      if (String(url) === "/api/editor/posts/post-a") return { ok: false, status: 409, json: async () => ({ code: "VERSION_CONFLICT" }) };
      if (String(url) === "/api/editor/import") return { ok: true, status: 200, json: async () => ({ draft: recovered, errors: [], warnings: [] }) };
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "文章 A");
    await act(async () => { title.props.onChange({ target: { value: "冲突文章" } }); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
    const copyButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "另存为新文章");
    assert.ok(copyButton);
    await act(async () => { copyButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(calls.filter(([url]) => url === "/api/editor/import").length, 0, "conflict recovery remains gated while the upload is pending");

    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: "/uploads/a.png", safeName: "a.png" }) });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assert.equal(calls.filter(([url]) => url === "/api/editor/posts/post-a").length, 1, "the conflicted PATCH is never retried");
    const imports = calls.filter(([url]) => url === "/api/editor/import");
    assert.equal(imports.length, 1);
    assert.match(imports[0][2].markdown, /!\[a\.png\]\(\/uploads\/a\.png\)/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("deleting a section ignores its later upload failure and never resurrects the section", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const postA = await makePost("post-a", "文章 A", "A");
  const sectionLabel = `${postA.sections[0].title}内容`;
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage, confirm: globalThis.confirm };
  const calls = [];
  let resolveUpload;
  let persisted = postA;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      calls.push([String(url), init]);
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      if (String(url) === "/api/editor/posts/post-a") {
        const body = JSON.parse(init.body);
        persisted = { ...body.draft, draftVersion: body.expectedVersion + 1 };
        return { ok: true, json: async () => ({ post: persisted }) };
      }
      if (String(url) === "/api/editor/posts/post-a/publish") return { ok: true, json: async () => ({ post: { ...persisted, status: "published", draftVersion: persisted.draftVersion + 1 } }) };
      throw new Error(`unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    const deleteButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "删除");
    await act(async () => { deleteButton.props.onClick(); });
    await act(async () => {
      resolveUpload({ ok: false, json: async () => ({ error: "迟到的上传失败" }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publish = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publish.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 20)); });

    assert.equal(renderer.root.findAllByType("textarea").some((textarea) => textarea.props["aria-label"] === sectionLabel), false);
    assert.equal(calls.filter(([url]) => url.endsWith("/publish")).length, 1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("a failed pending upload blocks conflict recovery without importing or retrying the stale PATCH", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const postA = await makePost("post-a", "文章 A", "A");
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const calls = [];
  let resolveUpload;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, init) => {
      calls.push([String(url), init]);
      if (String(url) === "/api/editor/assets") return new Promise((resolve) => { resolveUpload = resolve; });
      if (String(url) === "/api/editor/posts/post-a") return { ok: false, status: 409, json: async () => ({ code: "VERSION_CONFLICT" }) };
      throw new Error(`conflict recovery must remain local after upload failure: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [postA], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "文章 A");
    await act(async () => { title.props.onChange({ target: { value: "冲突文章" } }); });
    await act(async () => { editorFileInput(renderer).props.onChange({ target: { files: [new File(["image"], "a.png", { type: "image/png" })], value: "a.png" } }); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 850)); });
    const copyButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "另存为新文章");
    await act(async () => { copyButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => {
      resolveUpload({ ok: false, json: async () => ({ error: "存储失败" }) });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    assert.equal(calls.filter(([url]) => url === "/api/editor/posts/post-a").length, 1);
    assert.equal(calls.filter(([url]) => url === "/api/editor/import").length, 0);
    assert.ok(renderer.root.findAllByType("input").some((input) => input.props.value === "冲突文章"));
    assert.equal(renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown").props.href, "/api/editor/posts/post-a/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
