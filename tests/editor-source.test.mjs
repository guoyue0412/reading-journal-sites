import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
  assert.match(source, /read_at:/);
  assert.match(source, /paper_url:/);
  assert.match(source, /reading_status:/);
  assert.doesNotMatch(source, /\b(?:readAt|paperUrl|readingStatus):/);
});

test("portable editor provides schema-aligned paper and recruiting templates", async () => {
  const source = await readFile(editorUrl, "utf8");

  assert.match(source, /reading_methods:\s*"\[\]"/);
  assert.match(source, /reading_status:\s*"queued"/);
  for (const heading of ["## 粗读记录", "## 细读记录", "## 阅读总结"]) {
    assert.match(source, new RegExp(heading));
  }
  for (const field of ["company", "role", "location", "application_stage", "applied_at", "next_action"]) {
    assert.match(source, new RegExp(`${field}:`));
  }
  for (const heading of ["## 投递", "## 笔试", "## 面试", "## 最终复盘"]) {
    assert.match(source, new RegExp(heading));
  }
  for (const value of ["skim", "deep", "synthesis", "in_progress", "synthesizing", "completed", "archived", "written_test", "interview", "offer", "closed"]) {
    assert.match(source, new RegExp(value));
  }
});

test("Markdown import remains pointer-usable and has a visible keyboard focus indicator", async () => {
  const [source, css] = await Promise.all([
    readFile(editorUrl, "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /<label className="portable-editor__import">/);
  assert.match(css, /\.portable-editor__import:focus-within\s*>\s*span\s*{[^}]*outline:/s);
  assert.match(css, /\.portable-editor__import input\s*{[^}]*(?:clip-path|clip):/s);
  assert.doesNotMatch(css, /\.portable-editor__import input\s*{[^}]*pointer-events:\s*none/s);
});

test("search and module empty states provide reset and first-Markdown actions", async () => {
  const [search, generic, papers, reflections] = await Promise.all([
    readFile(new URL("../components/search-index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/content-index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/paper-index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reflections/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(search, /setQuery\(""\)/);
  assert.match(search, /setActiveType\(""\)/);
  assert.match(search, />清除搜索与筛选</);
  assert.match(generic, /第一篇 Markdown/);
  assert.match(generic, /href="\/editor"/);
  assert.match(papers, /还没有论文阅读/);
  assert.match(papers, /第一篇 Markdown/);
  assert.match(papers, /没有符合当前条件的论文/);
  assert.match(reflections, /第一篇 Markdown/);
  assert.match(reflections, /href="\/editor"/);
});

test("rich Markdown tables and code blocks own narrow-screen horizontal scrolling", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.markdown-body\s*{[^}]*min-width:\s*0/s);
  assert.match(css, /\.markdown-body table\s*{[^}]*display:\s*block[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.markdown-body pre\s*{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
});

test("editor route uses the shared shell and responsive panes", async () => {
  const [page, source, css] = await Promise.all([
    readFile(new URL("../app/editor/page.tsx", import.meta.url), "utf8"),
    readFile(editorUrl, "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SiteShell/);
  assert.match(page, /PortableEditor/);
  assert.match(css, /@media\s*\(max-width:\s*719px\)/);
  assert.match(css, /@media\s*\(min-width:\s*720px\)/);
  assert.match(css, /\.portable-editor__error/);
  assert.doesNotMatch(source, /\bhidden=/);
  assert.doesNotMatch(css, /\[hidden\]/);
  assert.match(source, /is-active/);
});

test("export slug is read only from leading frontmatter", async () => {
  const source = await readFile(editorUrl, "utf8");
  const helper = source.match(
    /function exportSlug\(markdown: string\) \{([\s\S]*?)\n\}/,
  );
  assert.ok(helper, "exportSlug helper must remain independently testable");
  const exportSlug = Function("markdown", helper[1]);

  assert.equal(
    exportSlug("---\ntitle: Note\nslug: frontmatter-slug\n---\nslug: body-slug"),
    "frontmatter-slug",
  );
  assert.equal(
    exportSlug("---\ntitle: No slug\n---\nslug: body-slug"),
    "draft",
  );
  assert.equal(
    exportSlug("# Example\n\n```yaml\nslug: fenced-example\n```"),
    "draft",
  );
});

test("progress components expose text-labelled methods and both overview groups", async () => {
  const badgesUrl = new URL("../components/paper-method-badges.tsx", import.meta.url);
  const overviewUrl = new URL("../components/progress-overview.tsx", import.meta.url);
  await assert.doesNotReject(access(badgesUrl));
  await assert.doesNotReject(access(overviewUrl));
  const [badges, overview] = await Promise.all([
    readFile(badgesUrl, "utf8"),
    readFile(overviewUrl, "utf8"),
  ]);

  for (const label of ["粗读", "细读", "总结", "已采用", "未采用"]) {
    assert.match(badges, new RegExp(label));
  }
  assert.match(overview, /论文阅读概览/);
  assert.match(overview, /秋招进展概览/);
  assert.match(overview, /href="\/papers"/);
  assert.match(overview, /href="\/jobs"/);
  assert.match(badges, /尚未选择阅读方式/);
});

test("paper index filters by reading method and status with a responsive resettable matrix", async () => {
  const source = await readFile(new URL("../components/paper-index.tsx", import.meta.url), "utf8");
  const badges = await readFile(new URL("../components/paper-method-badges.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /readingMethod/);
  assert.match(source, /readingMethods\?\.includes/);
  for (const status of ["queued", "in_progress", "synthesizing", "completed", "archived"]) {
    assert.match(badges, new RegExp(status));
  }
  assert.match(source, /<table/);
  assert.match(source, /paper-mobile-list/);
  assert.match(source, />清除筛选</);
  assert.match(css, /\.paper-matrix/);
  assert.match(css, /\.paper-mobile-list/);
  assert.match(css, /min-height:\s*44px/);
});

test("recruiting index exposes a five-stage funnel,岗位 cards and reset action", async () => {
  const sourceUrl = new URL("../components/recruiting-index.tsx", import.meta.url);
  await assert.doesNotReject(access(sourceUrl));
  const [source, css] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const label of ["投递", "笔试", "面试", "Offer", "结束", "下一步", "清除筛选"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /company/);
  assert.match(source, /role/);
  assert.match(source, /applicationStage/);
  assert.match(css, /\.recruiting-funnel/);
  assert.match(css, /\.recruiting-card/);
});
