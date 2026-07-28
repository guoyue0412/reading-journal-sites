import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const editorUrl = new URL("../components/editor/structured-editor.tsx", import.meta.url);

test("structured editor supports server drafts, recovery, Markdown import, and export", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /\/api\/editor\/import/);
  assert.match(source, /accept=["']\.md,text\/markdown["']/);
  assert.match(source, /\.text\(\)/);
  assert.match(source, /\/export/);
});

test("structured editor autosaves drafts but publishes only on explicit action", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /setTimeout/);
  assert.match(source, /expectedVersion/);
  assert.match(source, /VERSION_CONFLICT/);
  assert.match(source, /\/publish/);
  assert.match(source, />发布</);
  assert.match(source, />编辑</);
  assert.match(source, />预览</);
});

test("custom sections can be added and saved as reusable templates", async () => {
  const drawer = await readFile(new URL("../components/editor/add-section-drawer.tsx", import.meta.url), "utf8");
  for (const kind of ["long_text", "short_text", "checklist", "markdown", "relation"]) assert.match(drawer, new RegExp(kind));
  assert.match(drawer, /保存为常用模块/);
  assert.match(drawer, /standardKey:\s*template\.standardKey/);
});

test("publish errors show the backend error and field details", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /payload\.error/);
  assert.match(source, /formatApiError/);
  assert.match(source, /fields/);
});

test("saving an article copy preserves structured component identities", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.doesNotMatch(source, /sections:\s*current\.sections\.map\(\(section\)\s*=>\s*\(\{[^}]*standardKey:\s*null/);
});

test("editor page is owner-protected and renders the structured studio", async () => {
  const page = await readFile(new URL("../app/editor/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireBlogOwner/);
  assert.match(page, /StructuredEditor/);
  assert.match(page, /force-dynamic/);
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

test("editor route uses the shared shell and structured panes", async () => {
  const [page, source] = await Promise.all([
    readFile(new URL("../app/editor/page.tsx", import.meta.url), "utf8"),
    readFile(editorUrl, "utf8"),
  ]);

  assert.match(page, /SiteShell/);
  assert.match(page, /StructuredEditor/);
  assert.match(source, /studio-layout/);
  assert.match(source, /ArticlePreview/);
  assert.doesNotMatch(source, /\bhidden=/);
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
