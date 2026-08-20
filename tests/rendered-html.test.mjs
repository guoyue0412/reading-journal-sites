import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(pathname = "/", origin = "http://localhost") {
  const requestOrigin = new URL(origin);
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${encodeURIComponent(pathname)}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, requestOrigin), {
      headers: {
        accept: "text/html",
        host: requestOrigin.host,
        "x-forwarded-proto": requestOrigin.protocol.slice(0, -1),
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("derives absolute Open Graph and X image URLs from the incoming host", async () => {
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(layout, /openGraph\s*:/);
  assert.match(layout, /twitter\s*:/);
  assert.match(layout, /new URL\(["']\/og\.png["']/);
  assert.match(layout, /images\s*:\s*\[socialImage\]/);
  assert.match(layout, /process\.env\.PUBLIC_ORIGIN/);

  const response = await render("/", "https://journal.guoyue.test");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(
    html,
    /<meta[^>]+property="og:image"[^>]+content="https:\/\/journal\.guoyue\.test\/og\.png"/,
  );
  assert.match(
    html,
    /<meta[^>]+name="twitter:image"[^>]+content="https:\/\/journal\.guoyue\.test\/og\.png"/,
  );
});

test("server-renders the research archive homepage in the approved order", async () => {
  const response = await render("/");
  const html = await response.text();

  assert.equal(response.status, 200);
  for (const text of ["郭跃", "当前研究问题", "精选研究项目", "研究主题", "最近论文阅读", "研究之外的记录"]) {
    assert.match(html, new RegExp(text));
  }
  const positions = ["当前研究问题", "精选研究项目", "研究主题", "最近论文阅读", "研究之外的记录"].map((text) => html.indexOf(text));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(html, /href="\/projects"/);
  assert.match(html, /href="\/editor"/);
  assert.doesNotMatch(html, /CONTENT PULSE|overview-progress|文章管理/);
});

test("marks only the true current public navigation destination", async () => {
  for (const [pathname, href] of [["/", "/"], ["/projects", "/projects"], ["/papers", "/papers"], ["/blog", "/blog"], ["/about", "/about"]]) {
    const html = await (await render(pathname)).text();
    const currentLinks = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)].map((match) => match[0]);
    assert.equal(currentLinks.length, 2, pathname);
    assert.ok(currentLinks.every((link) => link.includes(`href="${href}"`)), pathname);
  }

  const articleHtml = await (await render("/post/unitacvla-reading")).text();
  assert.equal((articleHtml.match(/aria-current="page"/g) ?? []).length, 0);
});

test("marks search as the current desktop and mobile site tool", async () => {
  const html = await (await render("/search")).text();
  const currentLinks = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)].map((match) => match[0]);

  assert.equal(currentLinks.length, 2);
  assert.ok(currentLinks.every((link) => link.includes('href="/search"')));
});

test("safely falls back for repeated public archive query parameters", async () => {
  const response = await render("/blog?q=VLA&q=robot&type=jobs&type=papers");

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /UniTacVLA/);
  assert.match(html, /秋招不是一场考试/);
});

test("normalizes an unsupported scalar archive type to all", async () => {
  const response = await render("/blog?type=not-a-public-entry-type");

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<option value="all" selected="">全部<\/option>/);
  assert.match(html, /UniTacVLA/);
  assert.match(html, /秋招不是一场考试/);
});

test("server-renders a labeled research-topic heading and recency-ordered Chinese record labels", async () => {
  const html = await (await render("/")).text();
  const recordList = html.match(/<ol class="archive-record-list">([\s\S]*?)<\/ol>/)?.[1] ?? "";

  assert.match(html, /<nav[^>]+aria-labelledby="research-topics"[^>]*>/);
  assert.match(html, /<h2 id="research-topics">研究主题<\/h2>/);
  assert.match(html, /RESEARCH TOPICS/);
  const recordDates = ["2026-07-22", "2026-07-21", "2026-07-18", "2026-06-23"];
  const datePositions = recordDates.map((date) => recordList.indexOf(date));
  assert.ok(datePositions.every((position) => position >= 0));
  assert.deepEqual([...datePositions].sort((left, right) => left - right), datePositions);
  for (const label of ["秋招记录", "实习日记", "个人感悟"]) {
    assert.match(recordList, new RegExp(label));
  }
});

test("homepage project entries expose questions, contributions, and evidence links", async () => {
  const html = await (await render("/")).text();
  for (const text of ["LingBot-VA", "EgoEngine", "GenWAM", "研究问题", "研究贡献", "研究证据"]) {
    assert.match(html, new RegExp(text));
  }
});

test("keeps all four legacy content indexes reachable", async () => {
  const routes = [
    ["/jobs", "具身智能算法工程师"],
    ["/internship", "实习第 47 天"],
    ["/papers", "UniTacVLA"],
    ["/reflections", "2026-07-22"],
  ];

  for (const [pathname, entry] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, new RegExp(entry), pathname);
  }
});

test("server-renders a title-only Markdown index", async () => {
  const response = await render("/index");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /内容索引/);
  assert.match(html, /论文精读/);
  assert.match(html, /href="\/post\/unitacvla-reading"/);
});

test("uses the canonical post route for internal article links", async () => {
  const [blogHtml, indexHtml] = await Promise.all([
    render("/blog").then((response) => response.text()),
    render("/index").then((response) => response.text()),
  ]);

  for (const html of [blogHtml, indexHtml]) {
    assert.match(html, /href="\/post\/unitacvla-reading"/);
    assert.doesNotMatch(html, /href="\/blog\/unitacvla-reading"/);
  }
});

test("papers render the bibliography labels backed by existing reading fields", async () => {
  const response = await render("/papers");
  const html = await response.text();

  assert.equal(response.status, 200);
  for (const label of ["关键词", "阅读方式", "执行状态", "主题", "年份", "来源", "排序", "粗读", "细读", "总结"]) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /复现|对比阅读|阅读方式矩阵/);
  assert.match(html, /已完成/);
  assert.match(html, /UniTacVLA/);
  assert.match(html, /UniTacVLA Team/);
  assert.match(html, /2026-05-10/);
  assert.match(html, /tactile-sensing/);
  assert.match(html, /2026-07-22/);
  assert.match(html, /关于长期主义，我最近改变的三个看法/);
  assert.match(html, /class="paper-mobile-list__status">已完成<\/span>/);
});

test("projects render research questions, contributions, and evidence without card grids", async () => {
  const html = await (await render("/projects")).text();
  assert.match(html, /研究问题/);
  assert.match(html, /研究贡献/);
  assert.match(html, /查看 VLA 研究笔记/);
  assert.doesNotMatch(html, /project-grid/);
});

test("server-renders the recruiting funnel and岗位 archive metadata", async () => {
  const response = await render("/jobs");
  const html = await response.text();

  assert.equal(response.status, 200);
  for (const label of ["投递", "笔试", "面试", "Offer", "结束"]) assert.match(html, new RegExp(label));
  assert.match(html, /个人秋招总览/);
  assert.match(html, /具身智能算法工程师/);
  assert.match(html, /下一步/);
});

test("server-renders a paper article with LaTeX metadata and a related reflection", async () => {
  const response = await render("/post/unitacvla-reading");

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /katex/);
  assert.match(html, /UniTacVLA Team/);
  assert.match(html, /arXiv/);
  assert.match(html, /2026/);
  assert.match(html, /href="\/post\/2026-07-22"/);
  assert.match(html, /关于长期主义，我最近改变的三个看法/);
  assert.match(html, /<table>/);
  assert.match(html, /<pre><code/);
  assert.match(html, /粗读/);
  assert.match(html, /细读/);
  assert.match(html, /总结/);
  assert.match(html, /已完成/);
  assert.match(html, /ON THIS PAGE/);
  assert.match(html, /href="#section-细读记录"/);
});

test("reflection articles expose previous, next, and same-day navigation states", async () => {
  const [newer, older] = await Promise.all([
    render("/post/2026-07-22").then((response) => response.text()),
    render("/post/2026-07-21").then((response) => response.text()),
  ]);

  assert.match(newer, /上一篇/);
  assert.match(newer, /href="\/post\/2026-07-21"/);
  assert.match(older, /下一篇/);
  assert.match(older, /href="\/post\/2026-07-22"/);
  assert.match(newer, /同日关联/);
  assert.match(newer, /同日无其他随笔/);
});

test("server-renders recruiting metadata on a岗位 article", async () => {
  const response = await render("/post/autumn-recruiting-journey");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /个人秋招总览/);
  assert.match(html, /具身智能算法工程师/);
  assert.match(html, /面试/);
  assert.match(html, /持续复盘面试并补强系统落地表达/);
});

test("returns the editorial 404 response for an unknown post slug", async () => {
  const response = await render("/post/does-not-exist");

  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /页面没有找到/);
  assert.match(html, /返回首页/);
});

test("keeps a validated draft out of worker routes, module indexes, and search", async () => {
  const [post, jobs, search] = await Promise.all([
    render("/post/final-review-private-draft"),
    render("/jobs"),
    render("/search"),
  ]);

  assert.equal(post.status, 404);
  assert.doesNotMatch(await jobs.text(), /FINAL REVIEW PRIVATE DRAFT/);
  assert.doesNotMatch(await search.text(), /FINAL REVIEW PRIVATE DRAFT/);
});

test("renders same-month reflections newest first", async () => {
  const response = await render("/reflections");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.ok(html.indexOf("2026-07-22") < html.indexOf("2026-07-21"));
});

test("server-renders unified local search for all four content modules", async () => {
  const response = await render("/search");

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<label[^>]*for="site-search"[^>]*>[^<]*搜索/);
  assert.match(html, /<input[^>]*id="site-search"[^>]*type="search"/);
  assert.match(html, /秋招记录/);
  assert.match(html, /实习日记/);
  assert.match(html, /论文阅读/);
  assert.match(html, /个人感悟/);
});

test("prefills query-link searches and filters public archive entries", async () => {
  const response = await render("/search?q=arXiv");

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<input[^>]*id="site-search"[^>]*value="arXiv"/);
  const searchResults = html.match(/<div class="search-results">([\s\S]*?)<\/div>/)?.[1] ?? "";
  assert.match(searchResults, /UniTacVLA/);
  assert.doesNotMatch(searchResults, /个人秋招总览/);
});

test("removes the disposable starter preview and dependency", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/i);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /Guo Yue Research/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});

test("uses the editorial serif stack for body copy", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /body\s*{[^}]*font-family:\s*var\(--serif\)/s);
});

test("gives the daily reflection title link a 44px touch target", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.reflection-feature h3 a\s*{[^}]*min-height:\s*44px/s,
  );
});

test("uses the personal blog package identity in both manifests", async () => {
  const [packageJson, packageLock] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  ]);

  assert.equal(JSON.parse(packageJson).name, "guoyue-personal-blog");
  assert.equal(JSON.parse(packageLock).name, "guoyue-personal-blog");
  assert.equal(
    JSON.parse(packageLock).packages[""].name,
    "guoyue-personal-blog",
  );
});

test("includes editor source coverage in the standard test command", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.match(packageJson.scripts.test, /tests\/(?:\*|editor-source)\.test\.mjs/);
});

test("record indexes use ledger semantics instead of ambient cards", async () => {
  for (const pathname of ["/blog", "/index", "/internship", "/jobs", "/reflections"]) {
    const html = await (await render(pathname)).text();
    assert.match(html, /archive-(record|index|recruiting|reflection)/, pathname);
    assert.doesNotMatch(html, /--ambient|interactive-panel|interactive-row/, pathname);
  }
});

test("articles expose metadata, outline, readable markdown, and related records", async () => {
  const html = await (await render("/post/unitacvla-reading")).text();
  assert.match(html, /article-reading-layout/);
  assert.match(html, /article-outline/);
  assert.match(html, /markdown-body/);
  assert.match(html, /相关文章与日记/);
  assert.match(html, /katex/);
  assert.doesNotMatch(html, /article-header--ambient|content-panel/);
});
