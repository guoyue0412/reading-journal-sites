import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses one ambient shell and honors reduced motion", async () => {
  const [shell, css] = await Promise.all([read("components/site-shell.tsx"), read("app/globals.css")]);
  assert.match(shell, /site-page site-shell/);
  assert.match(shell, /site-ambient--one/);
  assert.match(shell, /site-ambient--two/);
  assert.match(css, /@keyframes ambient-drift/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.site-ambient \{ animation: none; \}/);
});

test("applies shared visual markers without animating reading content", async () => {
  const [home, index, papers, article, css] = await Promise.all([
    read("app/page.tsx"), read("components/content-index.tsx"), read("components/paper-index.tsx"), read("components/markdown-article.tsx"), read("app/globals.css"),
  ]);
  assert.match(home, /reading-hero/);
  assert.match(home, /interactive-panel/);
  assert.match(index, /index-heading--ambient/);
  assert.match(papers, /panel-controls/);
  assert.match(article, /article-header--ambient/);
  assert.match(article, /markdown-body reading-body/);
  assert.match(css, /\.reading-body::before/);
  assert.doesNotMatch(article, /interactive-panel.*markdown-body|markdown-body.*interactive-panel/s);
});

test("keeps the structured editor on the shared material system and responsive layout", async () => {
  const [editor, css] = await Promise.all([read("components/editor/structured-editor.tsx"), read("app/globals.css")]);
  assert.match(editor, /studio-surface/);
  assert.match(editor, /aria-live="polite"/);
  assert.match(css, /\.studio-surface \{/);
  assert.match(css, /grid-template-columns: 205px minmax\(440px, 1fr\) 340px/);
  assert.match(css, /@media \(max-width: 950px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
