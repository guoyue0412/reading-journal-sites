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
  assert.match(source, /const importInputRef = useRef/);
  assert.match(source, /ref=\{importInputRef\}/);
  assert.match(source, /onImport=\{\(\) => importInputRef\.current\?\.click\(\)\}/);
  assert.match(source, /onExport=\{exportCurrentDraft\}/);
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

test("editor serializes autosaves and keeps newer local edits ahead of stale responses", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /const saveInFlight = useRef\(false\)/);
  assert.match(source, /const editRevision = useRef\(0\)/);
  assert.match(source, /const requestRevision = editRevision\.current/);
  assert.match(source, /if \(requestRevision === editRevision\.current && activePostId\.current === next\.id\)/);
  assert.match(source, /}, 800\)/);
  assert.match(source, /const activePostId = useRef<string \| null>\(initialPosts\[0\]\?\.id \?\? null\)/);
  assert.match(source, /void persistDraft\(\{ \.\.\.queued, draftVersion: savedPost\.draftVersion \}\)/);

  const scheduleAutosave = source.slice(source.indexOf("function scheduleAutosave"), source.indexOf("async function flushAutosave"));
  assert.match(scheduleAutosave, /if \(saveInFlight\.current\) \{\s*queuedSave\.current = next;\s*return;\s*\}/s);

  const selectPost = source.slice(source.indexOf("async function selectPost"), source.indexOf("async function createPost"));
  assert.match(selectPost, /if \(id === selectedId\) return;[\s\S]*?const saved = await flushAutosave\(\);\s*if \(!saved\) return;[\s\S]*?const local/);
});

test("every new-article path flushes the old draft before switching active articles", async () => {
  const source = await readFile(editorUrl, "utf8");
  const createPost = source.slice(source.indexOf("async function createPost"), source.indexOf("function updateSection"));
  const saveAsNewArticle = source.slice(source.indexOf("async function saveAsNewArticle"), source.indexOf("async function importMarkdown"));
  const importMarkdown = source.slice(source.indexOf("async function importMarkdown"), source.indexOf("const typeTemplates"));

  for (const path of [createPost, saveAsNewArticle, importMarkdown]) {
    assert.ok(path.indexOf("await flushAutosave();") >= 0);
    assert.ok(path.indexOf("await flushAutosave();") < path.indexOf("activePostId.current ="));
  }
});

test("phone editor keeps import and export in a 44px non-scrolling tool menu", async () => {
  const [bar, css] = await Promise.all([
    readFile(new URL("../components/editor/editor-mobile-bar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/editor-archive.css", import.meta.url), "utf8"),
  ]);

  assert.match(bar, /<details className="studio-mobile-tools">/);
  assert.match(bar, /<summary>更多工具<\/summary>/);
  assert.match(bar, />导入 Markdown<\/button>/);
  assert.match(bar, />导出 Markdown<\/button>/);
  assert.match(css, /\.studio-mobile-bar\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.studio-mobile-tools[^}]*min-width:\s*0/s);
  assert.match(css, /\.studio-mobile-tools button[^}]*min-height:\s*44px/s);
});

test("custom sections can be added and saved as reusable templates", async () => {
  const drawer = await readFile(new URL("../components/editor/add-section-drawer.tsx", import.meta.url), "utf8");
  assert.match(drawer, /kind:\s*"markdown"/);
  assert.doesNotMatch(drawer, /内容类型<select/);
  assert.match(drawer, /保存为常用模块/);
  assert.match(drawer, /standardKey:\s*template\.standardKey/);
});

test("publish errors show the backend error and field details", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /payload\.error/);
  assert.match(source, /formatApiError/);
  assert.match(source, /fields/);
});

test("saving an article copy uses one canonical server-side creation", async () => {
  const source = await readFile(editorUrl, "utf8");
  const copy = source.slice(source.indexOf("async function saveAsNewArticle"), source.indexOf("async function importMarkdown"));
  assert.match(copy, /`\/api\/editor\/posts\/\$\{saved\.id\}\/copy`/);
  assert.match(copy, /JSON\.stringify\(\{ expectedVersion: saved\.draftVersion \}\)/);
  assert.match(copy, /setCurrent\(payload\.post\)/);
  assert.doesNotMatch(copy, /fetch\("\/api\/editor\/posts"/);
  assert.doesNotMatch(copy, /scheduleAutosave\(/);
  assert.doesNotMatch(copy, /crypto\.randomUUID\(/);
});

test("writing studio exposes semantic save feedback and material action hooks", async () => {
  const source = await readFile(editorUrl, "utf8");
  assert.match(source, /studio-save-state/);
  assert.match(source, /material-action/);
  assert.match(source, /aria-live="polite"/);
});

test("admin posts page is owner-protected and renders the structured studio", async () => {
  const page = await readFile(new URL("../app/admin/posts/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireBlogOwner/);
  assert.match(page, /StructuredEditor/);
  assert.match(page, /force-dynamic/);
  assert.match(page, /createEditorBlogService/);
  assert.match(page, /service\.listPosts\(\)/);
  assert.match(page, /service\.listTemplates\(type\)/);
  assert.doesNotMatch(page, /store\.listDrafts\(\)/);
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

test("admin editor route uses the admin shell and structured panes", async () => {
  const [page, source] = await Promise.all([
    readFile(new URL("../app/admin/posts/page.tsx", import.meta.url), "utf8"),
    readFile(editorUrl, "utf8"),
  ]);

  assert.match(page, /AdminShell/);
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

test("paper bibliography supports query, multi-select methods, single status, topic, year, venue, and date order", async () => {
  const source = await readFile(new URL("../components/paper-index.tsx", import.meta.url), "utf8");
  const badges = await readFile(new URL("../components/paper-method-badges.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/research-archive.css", import.meta.url), "utf8");

  for (const state of ["query", "readingMethods", "readingStatus", "topic", "year", "venue", "order"]) {
    assert.match(source, new RegExp(`\\[${state},\\s*set${state[0].toUpperCase()}${state.slice(1)}\\]`));
  }
  assert.match(source, /type="search"/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /checked=\{readingMethods\.includes\(value\)\}/);
  assert.match(source, /<select value=\{readingStatus\}/);
  assert.match(source, /filterAndSortPaperEntries\(entries, filters\)/);
  assert.match(source, /hasPaperBibliographyFilters\(filters\)/);
  assert.match(source, /paper-bibliography/);
  for (const status of ["queued", "in_progress", "synthesizing", "completed", "archived"]) {
    assert.match(badges, new RegExp(status));
  }
  assert.doesNotMatch(source, /<table/);
  assert.match(source, /paper-mobile-list/);
  assert.match(source, />清除筛选</);
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
