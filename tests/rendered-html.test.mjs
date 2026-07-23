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

test("server-renders the editorial homepage without starter markers", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /郭跃/);
  assert.match(html, /写给自己，也与世界分享/);
  assert.match(html, /秋招记录/);
  assert.match(html, /实习日记/);
  assert.match(html, /论文阅读/);
  assert.match(html, /个人感悟/);
  assert.match(html, /近期阅读与记录/);
  assert.doesNotMatch(
    html,
    /codex-preview|SkeletonPreview|react-loading-skeleton/i,
  );
});

test("server-renders all four module indexes", async () => {
  const routes = [
    ["/jobs", "秋招记录", "秋招不是一场考试"],
    ["/internship", "实习日记", "实习第 47 天"],
    ["/papers", "论文阅读", "UniTacVLA"],
    ["/reflections", "个人感悟", "2026-07-22"],
  ];

  for (const [pathname, label, entry] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, new RegExp(label), pathname);
    assert.match(html, new RegExp(entry), pathname);
  }
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

test("removes the disposable starter preview and dependency", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/i);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /郭跃｜阅读、成长与思考/);
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

  assert.match(packageJson.scripts.test, /tests\/editor-source\.test\.mjs/);
});
