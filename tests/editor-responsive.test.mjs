import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("editor has desktop, tablet, and mobile layout rules", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /grid-template-columns:\s*205px\s+minmax\(440px,\s*1fr\)\s+340px/);
  assert.match(css, /@media\s*\(max-width:\s*950px\)/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/);
});

test("section ordering and drawer actions are keyboard operable", async () => {
  const [section, drawer, editor] = await Promise.all([readFile(new URL("../components/editor/section-editor.tsx", import.meta.url), "utf8"), readFile(new URL("../components/editor/add-section-drawer.tsx", import.meta.url), "utf8"), readFile(new URL("../components/editor/structured-editor.tsx", import.meta.url), "utf8")]);
  assert.match(section, /aria-label=.*上移/); assert.match(section, /aria-label=.*下移/);
  assert.match(drawer, /role="dialog"/); assert.match(drawer, /aria-modal="true"/); assert.match(drawer, /Escape/);
  for (const action of ["重试保存", "导出当前草稿", "重新加载线上草稿", "另存为新文章"]) assert.match(editor, new RegExp(action));
});
