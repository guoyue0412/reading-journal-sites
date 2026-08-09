import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses the research shell with responsive public navigation", async () => {
  const [shell, css] = await Promise.all([read("components/site-shell.tsx"), read("app/globals.css")]);
  assert.match(shell, /ResearchShell/);
  assert.match(css, /\.research-header/);
  assert.match(css, /\.research-nav/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test("uses a research home while retaining article reading surfaces", async () => {
  const [home, index, papers, article, css] = await Promise.all([
    read("app/page.tsx"), read("components/content-index.tsx"), read("components/paper-index.tsx"), read("components/markdown-article.tsx"), read("app/globals.css"),
  ]);
  assert.match(home, /archive-hero/);
  assert.match(home, /<ResearchProjectList projects={researchProjects} compact \/>/);
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
