import assert from "node:assert/strict";
import test from "node:test";
import react from "@vitejs/plugin-react";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";

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
    cacheDir: `/tmp/reading-journal-editor-components-vite-${process.pid}`,
    resolve: { alias: { "@": root } },
    server: { middlewareMode: true },
  });
});

test.after(async () => {
  if (vite) await vite.close();
  if (originalSelf === undefined) delete globalThis.self;
  else globalThis.self = originalSelf;
});

test("mobile editor bar renders every save state and executes pane, add, and publish actions", async () => {
  const { EditorMobileBar } = await vite.ssrLoadModule("/components/editor/editor-mobile-bar.tsx");
  const paneChanges = [];
  let addCalls = 0;
  let publishCalls = 0;
  let renderer;
  const render = async (pane, saveState, disabled = false) => {
    const props = {
      pane,
      saveState,
      disabled,
      onAdd: () => { addCalls += 1; },
      onPaneChange: (next) => paneChanges.push(next),
      onPublish: () => { publishCalls += 1; },
    };
    await act(async () => {
      if (renderer) renderer.update(React.createElement(EditorMobileBar, props));
      else renderer = TestRenderer.create(React.createElement(EditorMobileBar, props));
    });
  };

  try {
    for (const [state, label] of [["idle", "待保存"], ["saving", "保存中"], ["saved", "已保存"], ["failed", "保存失败"], ["conflict", "版本冲突"]]) {
      await render("edit", state);
      assert.equal(renderer.root.findByType("span").children.join(""), label);
    }

    await render("edit", "saved");
    let buttons = renderer.root.findAllByType("button");
    await act(async () => { buttons[0].props.onClick(); buttons[1].props.onClick(); buttons[2].props.onClick(); });
    assert.equal(addCalls, 1);
    assert.deepEqual(paneChanges, ["preview"]);
    assert.equal(publishCalls, 1);

    await render("preview", "saving", true);
    buttons = renderer.root.findAllByType("button");
    assert.equal(buttons[0].props.disabled, true);
    assert.equal(buttons[1].children.join(""), "继续编辑");
    assert.equal(buttons[2].props.disabled, true);
    await act(async () => { buttons[1].props.onClick(); });
    assert.deepEqual(paneChanges, ["preview", "edit"]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});

test("editor sidebar exposes drawer state and executes selection and creation callbacks", async () => {
  const { EditorSidebar } = await vite.ssrLoadModule("/components/editor/editor-sidebar.tsx");
  const post = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "测试文章" };
  const selections = [];
  const creations = [];
  let renderer;

  try {
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(EditorSidebar, {
        id: "studio-post-list",
        isOpen: false,
        posts: [post],
        selectedId: post.id,
        creating: false,
        onSelect: (id) => selections.push(id),
        onCreate: (type) => creations.push(type),
      }));
    });
    let aside = renderer.root.findByType("aside");
    assert.equal(aside.props.id, "studio-post-list");
    assert.equal(aside.props.className, "studio-sidebar");

    await act(async () => {
      renderer.update(React.createElement(EditorSidebar, {
        id: "studio-post-list",
        isOpen: true,
        posts: [post],
        selectedId: post.id,
        creating: false,
        onSelect: (id) => selections.push(id),
        onCreate: (type) => creations.push(type),
      }));
    });
    aside = renderer.root.findByType("aside");
    assert.equal(aside.props.className, "studio-sidebar is-open");
    const buttons = renderer.root.findAllByType("button");
    await act(async () => { buttons[0].props.onClick(); buttons.at(-1).props.onClick(); });
    assert.deepEqual(creations, ["jobs"]);
    assert.deepEqual(selections, [post.id]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});

test("structured editor closes the article drawer and restores focus after selection and creation", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const post = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "测试文章" };
  const created = { ...createEmptyDraft("jobs", "post-2", "2026-08-10", []), title: "新建文章" };
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  let focusCalls = 0;
  let renderer;

  try {
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      return { ok: true, json: async () => ({ post: created }) };
    };
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(StructuredEditor, {
        initialPosts: [post],
        initialTemplates: [],
        ownerName: "Guo Yue",
      }), {
        createNodeMock: (element) => element.props.className === "studio-posts-toggle"
          ? { focus: () => { focusCalls += 1; } }
          : {},
      });
    });
    const root = renderer.root;
    const articleList = () => root.findAllByType("aside").find((aside) => aside.props.id === "studio-post-list");
    const toggle = root.findByProps({ className: "studio-posts-toggle" });
    await act(async () => { toggle.props.onClick(); });
    assert.equal(articleList().props.className, "studio-sidebar is-open");

    const postButton = root.findAllByType("button").find((button) =>
      button.findAllByType("span").some((span) => span.children.join("") === "测试文章"));
    assert.ok(postButton);
    await act(async () => { postButton.props.onClick(); });
    assert.equal(articleList().props.className, "studio-sidebar");
    assert.equal(focusCalls, 1);

    await act(async () => { toggle.props.onClick(); });
    assert.equal(articleList().props.className, "studio-sidebar is-open");
    const createButton = articleList().findAllByType("button").find((button) => button.children.join("") === "+ 秋招进展");
    assert.ok(createButton);
    await act(async () => {
      createButton.props.onClick();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(articleList().props.className, "studio-sidebar");
    assert.equal(focusCalls, 2);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0][0], "/api/editor/posts");
    assert.equal(fetchCalls[0][1].method, "POST");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
});
