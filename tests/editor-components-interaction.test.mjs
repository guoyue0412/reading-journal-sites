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

test("mobile editor tools expose real import and export actions", async () => {
  const { EditorMobileBar } = await vite.ssrLoadModule("/components/editor/editor-mobile-bar.tsx");
  let importCalls = 0;
  let exportCalls = 0;
  let renderer;

  try {
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(EditorMobileBar, {
        pane: "edit",
        saveState: "saved",
        disabled: false,
        onAdd() {},
        onPaneChange() {},
        onPublish() {},
        onImport: () => { importCalls += 1; },
        onExport: () => { exportCalls += 1; },
      }));
    });

    assert.equal(renderer.root.findByType("summary").children.join(""), "更多工具");
    const importButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "导入 Markdown");
    const exportButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "导出 Markdown");
    assert.ok(importButton);
    assert.ok(exportButton);
    await act(async () => { importButton.props.onClick(); exportButton.props.onClick(); });
    assert.equal(importCalls, 1);
    assert.equal(exportCalls, 1);
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

test("add section drawer preserves title focus across a parent callback rerender and keeps its keyboard focus contract", async () => {
  const { AddSectionDrawer } = await vite.ssrLoadModule("/components/editor/add-section-drawer.tsx");
  const originalDocument = globalThis.document;
  const listeners = new Set();
  const outside = { focusCalls: 0, focus() { this.focusCalls += 1; documentMock.activeElement = this; } };
  const closeButton = { focus() { documentMock.activeElement = this; }, hasAttribute() { return false; } };
  const titleInput = { focus() { documentMock.activeElement = this; }, hasAttribute() { return false; } };
  const saveTemplate = { focus() { documentMock.activeElement = this; }, hasAttribute() { return false; } };
  const addButton = { focus() { documentMock.activeElement = this; }, hasAttribute() { return false; } };
  const dialog = {
    querySelector() { return closeButton; },
    querySelectorAll() { return [closeButton, titleInput, saveTemplate, addButton]; },
  };
  const documentMock = {
    activeElement: outside,
    addEventListener(type, listener) { if (type === "keydown") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "keydown") listeners.delete(listener); },
  };
  let renderer;
  let initialCloseCalls = 0;
  let latestCloseCalls = 0;
  const render = async (open, onClose) => {
    const props = { open, insertionPosition: 10, templates: [], onClose, onAdd: async () => {} };
    await act(async () => {
      if (renderer) renderer.update(React.createElement(AddSectionDrawer, props));
      else renderer = TestRenderer.create(React.createElement(AddSectionDrawer, props), {
        createNodeMock: (element) => element.type === "div" && element.props.className === "studio-drawer" ? dialog : {},
      });
    });
  };

  try {
    globalThis.document = documentMock;
    await render(true, () => { initialCloseCalls += 1; });
    assert.equal(documentMock.activeElement, closeButton, "opening focuses the first drawer control");

    const title = renderer.root.findAllByType("input").find((input) => input.props.placeholder === "例如：创新点、相关论文");
    assert.ok(title);
    await act(async () => { title.props.onChange({ target: { value: "保留焦点" } }); });
    titleInput.focus();

    await render(true, () => { latestCloseCalls += 1; });
    assert.equal(documentMock.activeElement, titleInput, "a parent rerender does not steal focus from the module title");

    let prevented = false;
    documentMock.activeElement = addButton;
    for (const listener of listeners) listener({ key: "Tab", shiftKey: false, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(documentMock.activeElement, closeButton, "Tab wraps from the last control");

    documentMock.activeElement = closeButton;
    for (const listener of listeners) listener({ key: "Tab", shiftKey: true, preventDefault() {} });
    assert.equal(documentMock.activeElement, addButton, "Shift+Tab wraps from the first control");

    for (const listener of listeners) listener({ key: "Escape" });
    assert.equal(initialCloseCalls, 0);
    assert.equal(latestCloseCalls, 1, "Escape uses the latest parent callback");

    await render(false, () => { latestCloseCalls += 1; });
    assert.equal(documentMock.activeElement, outside, "closing restores focus to the opener");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
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

test("Markdown import commits the full draft atomically after confirmation", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const preview = { ...createEmptyDraft("reflections", "preview-2", "2026-08-09", []), slug: "2026-08-09-2", title: "导入文章" };
  const committed = { ...preview, id: "imported-3", slug: "2026-08-09-3", sections: preview.sections.map((section, index) => ({ ...section, id: `imported-3-section-${index}` })) };
  const markdown = "---\ntitle: 导入文章\nslug: 2026-08-09\ntype: reflections\ndate: 2026-08-09\nsummary: 完整导入\ntags: []\nrelated: []\nstatus: draft\n---\n\n## 反思\n\n正文";
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalConfirm = globalThis.confirm;
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      const payload = fetchCalls.length === 1
        ? { draft: preview, errors: [], warnings: [] }
        : { draft: committed, errors: [], warnings: [] };
      return { ok: true, json: async () => payload };
    };
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(StructuredEditor, {
        initialPosts: [current],
        initialTemplates: [],
        ownerName: "Guo Yue",
      }));
    });

    const importInput = renderer.root.findAllByType("input").find((input) => input.props.accept === ".md,text/markdown");
    assert.ok(importInput);
    await act(async () => {
      importInput.props.onChange({ target: { files: [{ text: async () => markdown }], value: "selected.md" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    assert.deepEqual(fetchCalls.map(([url]) => url), ["/api/editor/import", "/api/editor/import"]);
    assert.deepEqual(JSON.parse(fetchCalls[1][1].body), { markdown, create: true });
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/imported-3/export");
    assert.equal(renderer.root.findByProps({ className: "studio-save-state save-state--saved" }).children.join(""), "已保存");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalConfirm === undefined) delete globalThis.confirm;
    else globalThis.confirm = originalConfirm;
  }
});

test("Markdown import keeps the current article and shows a commit API error", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const preview = { ...createEmptyDraft("reflections", "preview-2", "2026-08-09", []), slug: "2026-08-09-2", title: "导入文章" };
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalConfirm = globalThis.confirm;
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      if (fetchCalls.length === 1) return { ok: true, json: async () => ({ draft: preview, errors: [], warnings: [] }) };
      return { ok: false, json: async () => ({ error: "文章地址竞争，请重试", code: "SLUG_CONFLICT" }) };
    };
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(StructuredEditor, {
        initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue",
      }));
    });
    const importInput = renderer.root.findAllByType("input").find((input) => input.props.accept === ".md,text/markdown");
    await act(async () => {
      importInput.props.onChange({ target: { files: [{ text: async () => "markdown" }], value: "selected.md" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    assert.deepEqual(fetchCalls.map(([url]) => url), ["/api/editor/import", "/api/editor/import"]);
    assert.match(renderer.root.findByProps({ className: "studio-message" }).children.join(""), /文章地址竞争，请重试/);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-1/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalConfirm === undefined) delete globalThis.confirm;
    else globalThis.confirm = originalConfirm;
  }
});

test("a failed autosave keeps the old selection when choosing another article", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const first = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "第一篇" };
  const second = { ...createEmptyDraft("reflections", "post-2", "2026-08-10", []), title: "第二篇" };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
    globalThis.fetch = async (input, init) => { fetchCalls.push([String(input), init]); throw new Error("offline"); };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [first, second], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "第一篇");
    await act(async () => { title.props.onChange({ target: { value: "第一篇未保存" } }); });
    const secondButton = renderer.root.findAllByType("button").find((button) => button.findAllByType("span").some((span) => span.children.join("") === "第二篇"));
    await act(async () => { secondButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });

    assert.deepEqual(fetchCalls.map(([url]) => url), ["/api/editor/posts/post-1"]);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-1/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("new article creation waits for a successful autosave and never posts an empty draft on network failure", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const created = { ...createEmptyDraft("jobs", "post-created", "2026-08-10", []), title: "错误创建" };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      if (String(input) === "/api/editor/posts") return { ok: true, json: async () => ({ post: created }) };
      throw new Error("offline");
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "当前文章");
    await act(async () => { title.props.onChange({ target: { value: "未保存修改" } }); });
    const createButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "+ 秋招进展");
    await act(async () => { createButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });

    assert.deepEqual(fetchCalls.map(([url]) => url), ["/api/editor/posts/post-1"]);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-1/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("save-as-copy stops on a version conflict without posting a placeholder", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      if (init?.method === "PATCH") return { ok: false, status: 409, json: async () => ({ code: "VERSION_CONFLICT" }) };
      return { ok: true, json: async () => ({ post: { ...current, id: "placeholder" } }) };
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "当前文章");
    await act(async () => { title.props.onChange({ target: { value: "冲突修改" } }); });
    const publishButton = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publishButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });
    const copyButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "另存为新文章");
    assert.ok(copyButton);
    await act(async () => { copyButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });

    assert.equal(fetchCalls.filter(([url]) => url === "/api/editor/posts").length, 0);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-1/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("a reflection copy keeps the server-reserved slug and persists the complete article", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = {
    ...createEmptyDraft("reflections", "post-1", "2026-08-09", []),
    title: "当前文章",
    summary: "完整摘要",
    sections: createEmptyDraft("reflections", "post-1", "2026-08-09", []).sections.map((section, index) => index === 0 ? { ...section, content: "完整正文" } : section),
  };
  const copy = {
    ...current,
    id: "post-copy",
    slug: "2026-08-09-2",
    title: "冲突中的完整文章（副本）",
    sections: current.sections.map((section, index) => ({ ...section, id: `post-copy-section-${index}` })),
  };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  const fetchCalls = [];
  let currentPatchAttempts = 0;
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(init.body) : {};
      fetchCalls.push([url, init, body]);
      if (url === "/api/editor/posts/post-1") {
        currentPatchAttempts += 1;
        if (currentPatchAttempts === 1) return { ok: false, status: 409, json: async () => ({ code: "VERSION_CONFLICT" }) };
        return { ok: true, status: 200, json: async () => ({ post: { ...body.draft, draftVersion: 1 } }) };
      }
      if (url === "/api/editor/posts/post-1/copy") {
        return { ok: true, status: 200, json: async () => ({ post: { ...copy, title: "冲突中的完整文章（副本）" } }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "当前文章");
    await act(async () => { title.props.onChange({ target: { value: "冲突中的完整文章" } }); });
    const publishButton = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publishButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });
    const copyButton = renderer.root.findAllByType("button").find((button) => button.children.join("") === "另存为新文章");
    await act(async () => { copyButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 20)); });

    const copyCreate = fetchCalls.find(([url]) => url === "/api/editor/posts/post-1/copy");
    assert.ok(copyCreate);
    assert.deepEqual(copyCreate[2], { expectedVersion: 1 });
    assert.equal(fetchCalls.some(([url]) => url === "/api/editor/posts" || url === "/api/editor/posts/post-copy"), false);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-copy/export");
    assert.ok(renderer.root.findAllByType("input").some((input) => input.props.value === "冲突中的完整文章（副本）"));
    assert.ok(renderer.root.findAllByType("textarea").some((input) => input.props.value === "完整摘要"));
    assert.equal(renderer.root.findByProps({ className: "studio-save-state save-state--saved" }).children.join(""), "已保存");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("import preview never commits or switches when flushing the current draft fails", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const preview = { ...createEmptyDraft("reflections", "preview", "2026-08-09", []), slug: "2026-08-09-2", title: "导入文章" };
  const originals = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage, confirm: globalThis.confirm };
  const fetchCalls = [];
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.confirm = () => true;
    globalThis.localStorage = { setItem() {}, getItem() { return null; }, removeItem() {} };
    globalThis.fetch = async (input, init) => {
      fetchCalls.push([String(input), init]);
      if (String(input) === "/api/editor/import") return { ok: true, json: async () => ({ draft: preview, errors: [], warnings: [] }) };
      throw new Error("offline");
    };
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue" })); });
    const title = renderer.root.findAllByType("input").find((input) => input.props.value === "当前文章");
    await act(async () => { title.props.onChange({ target: { value: "未保存导入前修改" } }); });
    const importInput = renderer.root.findAllByType("input").find((input) => input.props.accept === ".md,text/markdown");
    await act(async () => {
      importInput.props.onChange({ target: { files: [{ text: async () => "markdown" }], value: "selected.md" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    assert.deepEqual(fetchCalls.map(([url]) => url), ["/api/editor/import", "/api/editor/posts/post-1"]);
    assert.equal(fetchCalls.some(([, init]) => JSON.parse(init?.body ?? "{}").create === true), false);
    const exportLink = renderer.root.findAllByType("a").find((link) => link.children.join("") === "导出 Markdown");
    assert.equal(exportLink.props.href, "/api/editor/posts/post-1/export");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("publish recovers from authentication and network failures with actionable messages", async () => {
  const { StructuredEditor } = await vite.ssrLoadModule("/components/editor/structured-editor.tsx");
  const current = { ...createEmptyDraft("reflections", "post-1", "2026-08-09", []), title: "当前文章" };
  const originals = { fetch: globalThis.fetch, window: globalThis.window };
  let renderer;

  try {
    globalThis.window = globalThis;
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) });
    await act(async () => { renderer = TestRenderer.create(React.createElement(StructuredEditor, { initialPosts: [current], initialTemplates: [], ownerName: "Guo Yue" })); });
    const publishButton = renderer.root.findByProps({ className: "material-action material-action--primary" });
    await act(async () => { publishButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });
    assert.match(renderer.root.findByProps({ className: "studio-message" }).children.join(""), /重新登录/);

    globalThis.fetch = async () => { throw new Error("offline"); };
    await act(async () => { publishButton.props.onClick(); await new Promise((resolve) => setTimeout(resolve, 10)); });
    assert.match(renderer.root.findByProps({ className: "studio-message" }).children.join(""), /网络.*发布/);
    assert.doesNotMatch(renderer.root.findByProps({ className: "studio-message" }).children.join(""), /正在发布/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
