# 郭跃个人博客 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建并发布一个支持跨模块索引、LaTeX、每日感悟和全设备 Markdown 编辑的郭跃个人博客。

**Architecture:** 四类 Markdown 内容在独立目录中维护，由构建期脚本生成只读统一索引，运行时不读取文件系统。React 服务端页面负责内容与路由，少量客户端组件负责筛选、搜索和草稿编辑；统一渲染层处理 Markdown、GFM 与 KaTeX。

**Tech Stack:** vinext、Next.js 16、React 19、TypeScript、Tailwind CSS 4、react-markdown、remark-gfm、remark-math、rehype-katex、KaTeX、Node test runner。

## Global Constraints

- 视觉采用暖纸色 `#F3EEE4`、深墨色 `#20201E`、灰褐 `#78736A`、边界 `#C8C0B2`、朱红 `#B8422F`。
- 秋招、实习、论文、每日感悟分别保存在 `content/jobs/`、`content/internship/`、`content/papers/`、`content/reflections/`。
- 模块只能依赖共享内容契约和 UI 组件，不能直接读取其他模块内部实现。
- 首页近期内容优先按 `read_at` 排序，没有该字段时使用 `date`。
- 每日感悟以自然日为唯一索引单位，同一天维护一个条目。
- Markdown 支持 GFM、行内 LaTeX 和独立公式块；公式失败时降级保留原文。
- 编辑器在手机使用编辑/预览标签，平板支持紧凑双栏，电脑使用双栏。
- 首版草稿仅保存在当前设备并支持 Markdown 导入导出，不实现账户、匿名发布或云同步。
- 页面必须适配 320px、768px、1440px，键盘焦点可见，并尊重 `prefers-reduced-motion`。

---

## File Map

- `content/*/*.md`：四个互相隔离的内容源。
- `lib/content/types.ts`：共享内容类型与模块元数据。
- `scripts/generate-content-index.mjs`：构建期读取 Markdown、校验 frontmatter、生成统一索引。
- `lib/content/generated.ts`：自动生成的运行时安全内容索引。
- `lib/content/query.ts`：近期内容、模块筛选、搜索与关联计算。
- `components/site-shell.tsx`：全站顶栏、移动导航和页脚。
- `components/content-index.tsx`：通用模块索引。
- `components/paper-index.tsx`：论文筛选客户端组件。
- `components/search-index.tsx`：统一搜索客户端组件。
- `components/markdown-article.tsx`：Markdown、GFM 与 KaTeX 渲染。
- `components/portable-editor.tsx`：本地草稿、导入、导出和响应式预览。
- `app/*`：首页、四模块、搜索、文章详情和编辑路由。
- `tests/content-index.test.mjs`：内容生成和索引规则测试。
- `tests/rendered-html.test.mjs`：实际 worker 输出和 starter 清理测试。

---

### Task 1: 构建期 Markdown 内容系统

**Files:**
- Create: `content/jobs/autumn-recruiting-journey.md`
- Create: `content/internship/day-47-model-in-production.md`
- Create: `content/papers/unitacvla-reading.md`
- Create: `content/reflections/2026-07-22.md`
- Create: `lib/content/types.ts`
- Create: `scripts/generate-content-index.mjs`
- Create: `lib/content/generated.ts`
- Create: `tests/content-index.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ContentType`, `ContentEntry`, `PaperEntry`, `CONTENT_ENTRIES`。
- `ContentEntry` fields: `title`, `slug`, `type`, `date`, `readAt`, `summary`, `tags`, `related`, `status`, `body`。

- [ ] **Step 1: 安装渲染依赖并锁定版本**

Run:

```bash
npm install react-markdown remark-gfm remark-math rehype-katex katex
npm install -D @types/katex
```

Expected: `package.json` 和 `package-lock.json` 更新，安装命令退出码为 0。

- [ ] **Step 2: 先写内容生成失败测试**

Create `tests/content-index.test.mjs` with assertions equivalent to:

```js
test("generates four isolated modules with cross references", async () => {
  const entries = await loadGeneratedEntries();
  assert.deepEqual(new Set(entries.map((entry) => entry.type)),
    new Set(["jobs", "internship", "papers", "reflections"]));
  assert.equal(entries.find((entry) => entry.type === "reflections").slug, "2026-07-22");
  assert.ok(entries.some((entry) => entry.related.includes("unitacvla-reading")));
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `node --test tests/content-index.test.mjs`

Expected: FAIL，因为生成器和索引尚不存在。

- [ ] **Step 4: 定义共享类型并创建四篇真实示例 Markdown**

Use this exact type shape in `lib/content/types.ts`:

```ts
export type ContentType = "jobs" | "internship" | "papers" | "reflections";
export type ReadingStatus = "queued" | "reading" | "reviewed" | "reproduced";

export interface ContentEntry {
  title: string;
  slug: string;
  type: ContentType;
  date: string;
  readAt?: string;
  summary: string;
  tags: string[];
  related: string[];
  status: "draft" | "published";
  body: string;
  authors?: string[];
  venue?: string;
  year?: number;
  paperUrl?: string;
  readingStatus?: ReadingStatus;
  topics?: string[];
}
```

The paper body must include both `$\pi(a_t\mid o_{\le t})$` and a `$$...$$` block. The daily reflection must use slug `2026-07-22` and explicitly relate to `unitacvla-reading`.

- [ ] **Step 5: 实现生成器并接入构建脚本**

`scripts/generate-content-index.mjs` must scan only the four whitelisted module directories, parse simple YAML arrays and scalars, reject duplicate slugs, reject a reflection slug that differs from its date, warn on unresolved `related` values, and emit `lib/content/generated.ts` as a JSON-backed typed array.

Change scripts to:

```json
{
  "content:build": "node scripts/generate-content-index.mjs",
  "dev": "npm run content:build && WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext dev",
  "build": "npm run content:build && WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext build"
}
```

- [ ] **Step 6: 运行内容测试并提交**

Run: `npm run content:build && node --test tests/content-index.test.mjs`

Expected: PASS，生成 4 个 published entries，且每日感悟与论文存在显式关联。

Commit:

```bash
git add package.json package-lock.json content lib/content scripts tests/content-index.test.mjs
git commit -m "feat: add isolated markdown content system"
```

---

### Task 2: 统一查询与交叉索引

**Files:**
- Create: `lib/content/query.ts`
- Extend: `tests/content-index.test.mjs`

**Interfaces:**
- Consumes: `ContentEntry`, `CONTENT_ENTRIES`。
- Produces: `getRecentEntries(limit)`, `getEntriesByType(type)`, `searchEntries(query)`, `getRelatedEntries(slug)`。

- [ ] **Step 1: 写查询规则失败测试**

Add exact behavior checks:

```js
assert.equal(getRecentEntries(1)[0].slug, "unitacvla-reading");
assert.ok(searchEntries("触觉").some((entry) => entry.slug === "unitacvla-reading"));
assert.ok(getRelatedEntries("2026-07-22").some((entry) => entry.slug === "unitacvla-reading"));
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/content-index.test.mjs`

Expected: FAIL，因为查询函数尚不存在。

- [ ] **Step 3: 实现纯函数查询层**

Implement recency as `Date.parse(readAt ?? date)`, search across `title`, `summary`, `tags`, `topics`, `venue`, and relations in priority order: explicit `related`, shared tags/topics, then same-date entries. Return copies and never mutate `CONTENT_ENTRIES`.

- [ ] **Step 4: 运行测试并提交**

Run: `node --test tests/content-index.test.mjs`

Expected: PASS for sorting, search, module isolation, and relationships.

Commit:

```bash
git add lib/content/query.ts tests/content-index.test.mjs
git commit -m "feat: add cross-module content index"
```

---

### Task 3: 安静编辑部视觉系统、首页与模块索引

**Files:**
- Create: `components/site-shell.tsx`
- Create: `components/content-index.tsx`
- Create: `components/paper-index.tsx`
- Create: `app/jobs/page.tsx`
- Create: `app/internship/page.tsx`
- Create: `app/papers/page.tsx`
- Create: `app/reflections/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Replace: `app/globals.css`
- Remove: `app/_sites-preview/SkeletonPreview.tsx`
- Remove: `app/_sites-preview/preview.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: query functions from Task 2。
- Produces: shared site shell and route-level HTML for `/`, `/jobs`, `/internship`, `/papers`, `/reflections`。

- [ ] **Step 1: 把 starter 测试改为产品失败测试**

Assert rendered `/` contains `郭跃`, `写给自己，也与世界分享`, all four module labels, `近期阅读与记录`, and does not contain `codex-preview`, `SkeletonPreview`, or `react-loading-skeleton`.

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL on product copy because starter skeleton still renders.

- [ ] **Step 3: 实现共享壳与首页**

Use semantic `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`. Homepage sections must appear in this order: hero, four module entrances, recent reading stream, paper progress, daily reflection, cross-module relation strip.

- [ ] **Step 4: 实现四个独立模块页**

`content-index.tsx` receives only `title`, `description`, and a `ContentEntry[]`. `paper-index.tsx` is a client component with topic, year, venue, and reading-status filters. Reflections group by year/month/day and use the date as the visible primary key.

- [ ] **Step 5: 完成视觉与响应式 CSS**

Define the five required color tokens, serif/sans/mono stacks, 112px desktop page padding, 28px tablet padding, 18px mobile padding, visible `:focus-visible`, touch targets of at least 44px, and reduced-motion overrides. Avoid decorative images and SVG illustrations.

- [ ] **Step 6: 清理 starter 并提交**

Remove `react-loading-skeleton`, refresh the lockfile, remove the preview directory and metadata marker, set `lang="zh-CN"`, title `郭跃｜阅读、成长与思考`, and a site-specific description.

Run: `npm test`

Expected: PASS and no starter markers in rendered HTML or dependencies.

Commit:

```bash
git add app components tests package.json package-lock.json
git commit -m "feat: build editorial blog routes"
```

---

### Task 4: Markdown、LaTeX、文章详情与统一搜索

**Files:**
- Create: `components/markdown-article.tsx`
- Create: `components/search-index.tsx`
- Create: `app/post/[slug]/page.tsx`
- Create: `app/search/page.tsx`
- Extend: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `ContentEntry`, `searchEntries`, `getRelatedEntries`。
- Produces: article detail renderer and client-side unified search。

- [ ] **Step 1: 写 LaTeX 与搜索失败测试**

Render `/post/unitacvla-reading` and assert the HTML includes a KaTeX marker, paper metadata, and a related daily reflection link. Assert `/search` includes a labeled search input and the four content types.

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL with missing routes or KaTeX output.

- [ ] **Step 3: 实现 Markdown 与公式渲染**

Configure `react-markdown` with `remark-gfm`, `remark-math`, and `rehype-katex`; import KaTeX CSS once. Wrap display math in an overflow container. Set `throwOnError: false` so invalid expressions preserve readable source instead of crashing the page.

- [ ] **Step 4: 实现文章详情和统一搜索**

Article pages render module metadata, body, tags, explicit and inferred relations, and a back link. Search uses one input and optional module chips; it searches the prebuilt index without network requests.

- [ ] **Step 5: 运行测试并提交**

Run: `npm test`

Expected: PASS with KaTeX HTML, related entries, and searchable index surface.

Commit:

```bash
git add app/post app/search components/markdown-article.tsx components/search-index.tsx tests/rendered-html.test.mjs
git commit -m "feat: add latex articles and unified search"
```

---

### Task 5: 全设备 Markdown 便携编辑器

**Files:**
- Create: `components/portable-editor.tsx`
- Create: `app/editor/page.tsx`
- Create: `tests/editor-source.test.mjs`

**Interfaces:**
- Consumes: `ContentType`, `MarkdownArticle` renderer conventions。
- Produces: local draft editing, preview, import, export, module templates。

- [ ] **Step 1: 写编辑能力失败测试**

Source assertions must verify `localStorage`, `.md` file import, `Blob`, `URL.createObjectURL`, module template selection, and separate mobile tabs labeled `编辑` and `预览`.

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/editor-source.test.mjs`

Expected: FAIL because the editor component does not exist.

- [ ] **Step 3: 实现响应式编辑器**

Use a client component with controlled Markdown text, a module `<select>`, debounced local draft persistence under `guoyue-blog-draft-v1`, file input accepting `.md,text/markdown`, and export filename derived from frontmatter slug. Reflection templates default to the current local date for both `date` and `slug`.

- [ ] **Step 4: 实现设备布局与故障提示**

Below 720px show one pane controlled by `编辑`/`预览`; from 720px show two panes when space allows. Catch storage and file errors, show a visible message, and keep export available.

- [ ] **Step 5: 运行测试并提交**

Run: `node --test tests/editor-source.test.mjs && npm test`

Expected: PASS; build includes `/editor` and existing routes remain green.

Commit:

```bash
git add app/editor components/portable-editor.tsx tests/editor-source.test.mjs
git commit -m "feat: add portable markdown editor"
```

---

### Task 6: 社交预览、最终验证与 Sites 发布

**Files:**
- Create: `public/og.png`
- Modify: `app/layout.tsx`
- Modify: `.openai/hosting.json`

**Interfaces:**
- Consumes: finished site visual system and successful build。
- Produces: exact validated source commit, deployable archive, private Sites production URL。

- [ ] **Step 1: 生成并检查唯一社交预览图**

Generate one 1200×630 landscape card using the finished paper/ink/red visual language and exact text `郭跃` plus `阅读、成长与思考`. Reject invented or malformed text; retry at most once. Save the accepted image as `public/og.png` and wire host-derived absolute Open Graph and X metadata.

- [ ] **Step 2: 运行全量验证**

Run:

```bash
npm run lint
npm test
npm run build
git diff --check
```

Expected: all commands exit 0; `dist/server/index.js` exists; no starter metadata or preview dependency remains.

- [ ] **Step 3: 提交准确的验证状态**

```bash
git add .
git commit -m "feat: complete Guo Yue personal blog"
git status --short
```

Expected: working tree clean.

- [ ] **Step 4: 创建并记录 Sites 项目**

Call `create_site` once with title `郭跃｜阅读、成长与思考`, description `郭跃记录秋招、实习、论文阅读与每日感悟的个人博客`, and a valid unique slug. Persist the returned opaque `project_id` unchanged in `.openai/hosting.json`.

- [ ] **Step 5: 推送、打包、保存版本并私有部署**

Push the validated branch-head commit using the short-lived per-command credential. Package the project with `scripts/package-site.sh`, save one version with the exact commit SHA and archive, deploy using `deploy_private_site_version`, and poll `get_deployment_status` until `succeeded` or `failed`.

- [ ] **Step 6: 完成发布交接**

On success, open the exact deployed URL in Codex when that capability is available, stop the retained dev server, and report the private Sites URL. On failure, report the visible failure reason without exposing credentials.
