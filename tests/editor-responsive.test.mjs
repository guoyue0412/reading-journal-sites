import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("editor exposes desktop, tablet, and phone presentation controls", async () => {
  const [editor, sidebar, mobileBar, css] = await Promise.all([
    read("components/editor/structured-editor.tsx"), read("components/editor/editor-sidebar.tsx"),
    read("components/editor/editor-mobile-bar.tsx"), read("app/editor-archive.css"),
  ]);
  assert.match(editor, /sidebarOpen/);
  assert.match(editor, /studio-posts-toggle/);
  assert.match(sidebar, /isOpen/);
  assert.match(mobileBar, /添加模块/);
  assert.match(mobileBar, /预览/);
  assert.match(mobileBar, /发布/);
  assert.match(css, /grid-template-columns:\s*220px\s+minmax\(440px,\s*1fr\)\s+360px/);
  assert.match(css, /@media\s*\(max-width:\s*1024px\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /padding-bottom:\s*calc\(88px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
});

test("editor archive chrome has no glass, gradients, or hover lift", async () => {
  const css = await read("app/editor-archive.css");
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|translateY\(-/);
  assert.match(css, /min-height:\s*44px/);
});

test("section actions are grouped in a native keyboard-accessible disclosure", async () => {
  const section = await read("components/editor/section-editor.tsx");
  assert.match(section, /<details className="studio-section-menu"/);
  assert.match(section, /<summary>模块操作<\/summary>/);
  for (const action of ["上移", "下移", "复制", "删除"]) assert.match(section, new RegExp(action));
});
