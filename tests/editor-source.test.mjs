import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editorUrl = new URL("../components/portable-editor.tsx", import.meta.url);

test("portable editor supports templates, local drafts, Markdown import, and export", async () => {
  const source = await readFile(editorUrl, "utf8");

  assert.match(source, /ContentType/);
  assert.match(source, /guoyue-blog-draft-v1/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /accept=["']\.md,text\/markdown["']/);
  assert.match(source, /\.text\(\)/);
  assert.match(source, /new Blob/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.match(source, /slug.*\.md/s);
});

test("portable editor exposes all module templates and mobile editing tabs", async () => {
  const source = await readFile(editorUrl, "utf8");

  for (const moduleName of ["jobs", "internship", "papers", "reflections"]) {
    assert.match(source, new RegExp(`${moduleName}:`), moduleName);
  }
  assert.match(source, /date:\s*date/);
  assert.match(source, /slug:\s*date/);
  assert.match(source, />编辑</);
  assert.match(source, />预览</);
  assert.match(source, /<textarea/);
  assert.match(source, /ReactMarkdown/);
  assert.match(source, /remarkMath/);
  assert.match(source, /rehypeKatex/);
});

test("editor route uses the shared shell and responsive panes", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/editor/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SiteShell/);
  assert.match(page, /PortableEditor/);
  assert.match(css, /@media\s*\(max-width:\s*719px\)/);
  assert.match(css, /@media\s*\(min-width:\s*720px\)/);
  assert.match(css, /\.portable-editor__error/);
});
