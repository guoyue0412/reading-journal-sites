# Research Archive Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Guo Yue's public research site and web editor as one restrained, responsive “research archive” without changing the existing content, autosave, asset, or publishing contracts.

**Architecture:** Keep the current Next.js 16/Sites application and server-owned draft pipeline. Add a small typed research-profile module and focused presentation components, then load two late CSS layers after the legacy stylesheet so the redesign is isolated and reversible. Public surfaces and editor chrome share tokens, while the editor's save/version/publish functions remain unchanged.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, TypeScript 5.9.3, Tailwind CSS 4.2.1, React Markdown, KaTeX, Node test runner, Fontsource 5.3.0, Sites/Cloudflare runtime.

## Global Constraints

- Preserve the existing `ContentEntry`, `BlogPostDraft`, `BlogSection`, reading-method, reading-status, application-stage, API payload, D1, R2, Markdown, and publication contracts.
- Reading methods remain exactly `skim`, `deep`, and `synthesis`, displayed as 粗读、细读、总结; they are multi-select. Reading status remains single-select.
- Do not add PWA, service-worker, offline editing, dark mode, animation libraries, BibTeX import, or a new site framework.
- Self-host Newsreader, IBM Plex Sans, and IBM Plex Mono through exact Fontsource `5.3.0` packages; never depend on fonts installed on the visitor's device.
- Use OKLCH design tokens, warm paper, blue-black ink, and dark vermilion accent. Do not add gradients, glass blur, ambient orbs, hover lift, or large decorative shadows.
- Keep body copy at least `17px`, reading measure near `65ch`, and interactive targets at least `44px`.
- Public pages must work at 320, 375, 414, 768, 1024, and 1440 CSS pixels without page-level horizontal scrolling.
- The `/editor` redirect and owner-protected `/admin/posts` editor remain the direct web editing path on phone, tablet, and desktop.
- Do not stage or commit `.superpowers/brainstorm/`.

## File Structure

- `lib/research/archive.ts`: factual public profile, research topics, and project presentation data.
- `components/research-project-list.tsx`: reusable semantic project/evidence list.
- `components/research-topic-index.tsx`: compact research-topic navigation.
- `components/research-shell.tsx`: public masthead, desktop navigation, mobile disclosure, and footer.
- `app/page.tsx`: research-first homepage composition.
- `app/projects/page.tsx`: complete project archive.
- `components/paper-index.tsx`: searchable and sortable bibliography presentation.
- `components/content-index.tsx`, `components/recruiting-index.tsx`, `app/reflections/page.tsx`: record archives.
- `components/markdown-article.tsx`: article metadata, outline, Markdown, media, formula, and related-entry reading surface.
- `components/editor/editor-mobile-bar.tsx`: phone-only editor actions.
- `components/editor/editor-sidebar.tsx`, `components/editor/section-editor.tsx`, `components/editor/structured-editor.tsx`: responsive editor presentation only.
- `app/research-archive.css`: public design tokens and public surfaces.
- `app/editor-archive.css`: admin/editor surfaces and responsive pane behavior.
- `tests/research-archive-layout.test.mjs`: source-level visual contract.
- `tests/rendered-html.test.mjs`: server-rendered public route contract.
- `tests/editor-responsive.test.mjs`, `tests/editor-source.test.mjs`: cross-device editor contract.

---

### Task 1: Lock the typography and visual-foundation contract

**Files:**
- Create: `tests/research-archive-layout.test.mjs`
- Create: `app/research-archive.css`
- Create: `app/editor-archive.css`
- Modify: `app/layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: current root layout and legacy `app/globals.css`.
- Produces: `--archive-*` CSS tokens and locally bundled font families used by every later task.

- [ ] **Step 1: Write the failing visual-foundation test**

Create `tests/research-archive-layout.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("loads self-hosted archive fonts and late isolated style layers", async () => {
  const [layout, packageJson] = await Promise.all([
    read("app/layout.tsx"),
    read("package.json"),
  ]);
  const dependencies = JSON.parse(packageJson).dependencies;

  assert.equal(dependencies["@fontsource-variable/newsreader"], "5.3.0");
  assert.equal(dependencies["@fontsource-variable/ibm-plex-sans"], "5.3.0");
  assert.equal(dependencies["@fontsource/ibm-plex-mono"], "5.3.0");
  assert.match(layout, /@fontsource-variable\/newsreader\/wght\.css/);
  assert.match(layout, /@fontsource-variable\/ibm-plex-sans\/wght\.css/);
  assert.match(layout, /@fontsource\/ibm-plex-mono\/400\.css/);
  assert.ok(layout.indexOf("./globals.css") < layout.indexOf("./research-archive.css"));
  assert.ok(layout.indexOf("./research-archive.css") < layout.indexOf("./editor-archive.css"));
});

test("defines the approved OKLCH palette and excludes decorative effects", async () => {
  const css = await read("app/research-archive.css");

  for (const token of ["--archive-paper", "--archive-ink", "--archive-muted", "--archive-rule", "--archive-accent", "--archive-focus"]) {
    assert.match(css, new RegExp(`${token}:\\s*oklch\\(`));
  }
  assert.match(css, /overflow-x:\s*clip/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|filter:\s*blur/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Run the test and verify the missing foundation fails**

Run:

```bash
node --test tests/research-archive-layout.test.mjs
```

Expected: FAIL because the Fontsource dependencies and both archive stylesheets do not exist.

- [ ] **Step 3: Install exact self-hosted font packages**

Run:

```bash
npm install --save-exact @fontsource-variable/newsreader@5.3.0 @fontsource-variable/ibm-plex-sans@5.3.0 @fontsource/ibm-plex-mono@5.3.0
```

Expected: `package.json` and `package-lock.json` contain all three exact `5.3.0` versions; no unrelated dependency changes appear.

- [ ] **Step 4: Load fonts and late style layers in the root layout**

Replace the import block at the top of `app/layout.tsx` with:

```ts
import type { Metadata } from "next";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/ibm-plex-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import "./research-archive.css";
import "./editor-archive.css";
```

- [ ] **Step 5: Create the public token and reset layer**

Create `app/research-archive.css` with this initial complete foundation:

```css
:root {
  --archive-paper: oklch(97% 0.012 85);
  --archive-paper-soft: oklch(94% 0.014 85);
  --archive-ink: oklch(22% 0.018 255);
  --archive-muted: oklch(49% 0.018 255);
  --archive-rule: oklch(84% 0.015 85);
  --archive-accent: oklch(43% 0.12 28);
  --archive-focus: oklch(57% 0.16 28);
  --archive-display: "Newsreader Variable", "Noto Serif SC", "Songti SC", serif;
  --archive-sans: "IBM Plex Sans Variable", "Noto Sans SC", "PingFang SC", sans-serif;
  --archive-mono: "IBM Plex Mono", "SFMono-Regular", monospace;
  --archive-width: 1180px;
  --archive-reading: 65ch;
}

html { overflow-x: clip; }

body {
  min-width: 320px;
  background: var(--archive-paper);
  color: var(--archive-ink);
  font-family: var(--archive-sans);
  font-size: 17px;
  line-height: 1.7;
}

.research-page {
  min-height: 100vh;
  overflow-x: clip;
  background: var(--archive-paper);
  color: var(--archive-ink);
  font-family: var(--archive-sans);
}

.research-page :focus-visible {
  outline: 2px solid var(--archive-focus);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
```

Create `app/editor-archive.css` with the shared editor variables only:

```css
.admin-page {
  --paper: var(--archive-paper);
  --ink: var(--archive-ink);
  --muted: var(--archive-muted);
  --rule: var(--archive-rule);
  --vermilion: var(--archive-accent);
  --serif: var(--archive-display);
  --sans: var(--archive-sans);
  --mono: var(--archive-mono);
  min-height: 100vh;
  overflow-x: clip;
  background: var(--archive-paper-soft);
  color: var(--archive-ink);
  font-family: var(--archive-sans);
}
```

- [ ] **Step 6: Run the focused test and production build**

Run:

```bash
node --test tests/research-archive-layout.test.mjs
npm run build
```

Expected: the two foundation tests PASS and the production build exits `0`.

- [ ] **Step 7: Commit the isolated foundation**

```bash
git add package.json package-lock.json app/layout.tsx app/research-archive.css app/editor-archive.css tests/research-archive-layout.test.mjs
git commit -m "style: establish research archive design system"
```

### Task 2: Introduce factual research-profile and project components

**Files:**
- Create: `lib/research/archive.ts`
- Create: `components/research-project-list.tsx`
- Create: `components/research-topic-index.tsx`
- Modify: `tests/research-archive-layout.test.mjs`

**Interfaces:**
- Consumes: only current public statements and internal search routes.
- Produces: `researchProfile`, `researchProjects`, `researchTopics`, `ResearchProjectList`, and `ResearchTopicIndex`.

- [ ] **Step 1: Add a failing typed-content test**

Append to `tests/research-archive-layout.test.mjs`:

```js
test("research archive data exposes questions, contributions, and verifiable internal evidence", async () => {
  const { researchProfile, researchProjects, researchTopics } = await import("../lib/research/archive.ts");

  assert.match(researchProfile.field, /具身智能/);
  assert.ok(researchProfile.currentQuestion.length > 20);
  assert.equal(researchProjects.length, 3);
  for (const project of researchProjects) {
    assert.ok(project.id && project.title && project.question && project.contribution);
    assert.ok(project.evidence.length > 0);
    assert.ok(project.evidence.every((item) => item.href.startsWith("/")));
  }
  assert.deepEqual(researchTopics.map((topic) => topic.label), ["VLA", "世界模型", "动作与状态表征", "灵巧操作", "仿真与泛化"]);
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run:

```bash
node --test tests/research-archive-layout.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/research/archive.ts`.

- [ ] **Step 3: Create the typed research archive data**

Create `lib/research/archive.ts`:

```ts
export type ResearchEvidence = { label: string; href: string };
export type ResearchProject = {
  id: string;
  field: string;
  title: string;
  question: string;
  contribution: string;
  evidence: ResearchEvidence[];
};
export type ResearchTopic = { label: string; href: string };

export const researchProfile = {
  name: "郭跃",
  latinName: "Guo Yue",
  field: "具身智能研究",
  statement: "关注视觉—语言—行动模型、世界模型、机器人学习与仿真，连接研究问题和可靠的具身系统。",
  currentQuestion: "如何让机器人从多模态经验中形成可执行、可迁移，并能在真实交互中持续校正的动作理解？",
} as const;

export const researchProjects: ResearchProject[] = [
  {
    id: "lingbot-va",
    field: "VLA",
    title: "LingBot-VA",
    question: "如何让语言条件、视觉观测与机器人动作形成可靠的闭环策略？",
    contribution: "围绕语言驱动操作整理模型、数据与真实执行之间的系统连接。",
    evidence: [{ label: "查看 VLA 研究笔记", href: "/search?q=VLA" }],
  },
  {
    id: "egoengine",
    field: "WORLD MODEL",
    title: "EgoEngine",
    question: "第一视角世界模型如何为交互提供可执行的预测，而不只生成视觉结果？",
    contribution: "围绕第一视角交互组织预测目标、动作条件与执行评估。",
    evidence: [{ label: "查看世界模型笔记", href: "/search?q=世界模型" }],
  },
  {
    id: "genwam",
    field: "SIMULATION",
    title: "GenWAM",
    question: "生成式环境如何同时服务机器人学习、系统验证与泛化评估？",
    contribution: "连接生成式环境、策略学习和可复核的评估流程。",
    evidence: [{ label: "查看仿真研究笔记", href: "/search?q=仿真" }],
  },
];

export const researchTopics: ResearchTopic[] = [
  { label: "VLA", href: "/search?q=VLA" },
  { label: "世界模型", href: "/search?q=世界模型" },
  { label: "动作与状态表征", href: "/search?q=动作表征" },
  { label: "灵巧操作", href: "/search?q=灵巧操作" },
  { label: "仿真与泛化", href: "/search?q=仿真" },
];
```

- [ ] **Step 4: Create the reusable project and topic components**

Create `components/research-project-list.tsx`:

```tsx
import Link from "next/link";
import type { ResearchProject } from "@/lib/research/archive";

export function ResearchProjectList({ projects, compact = false }: { projects: ResearchProject[]; compact?: boolean }) {
  return <ol className={compact ? "archive-projects archive-projects--compact" : "archive-projects"}>
    {projects.map((project, index) => <li id={project.id} key={project.id}>
      <span className="archive-projects__number">{String(index + 1).padStart(2, "0")}</span>
      <article>
        <p className="archive-kicker">{project.field}</p>
        <h3>{project.title}</h3>
        <dl>
          <div><dt>研究问题</dt><dd>{project.question}</dd></div>
          <div><dt>研究贡献</dt><dd>{project.contribution}</dd></div>
        </dl>
        <nav aria-label={`${project.title}研究证据`}>
          {project.evidence.map((item) => <Link href={item.href} key={item.href}>{item.label} <span aria-hidden="true">↗</span></Link>)}
        </nav>
      </article>
    </li>)}
  </ol>;
}
```

Create `components/research-topic-index.tsx`:

```tsx
import Link from "next/link";
import type { ResearchTopic } from "@/lib/research/archive";

export function ResearchTopicIndex({ topics }: { topics: ResearchTopic[] }) {
  return <nav className="archive-topics" aria-label="研究主题">
    <p className="archive-kicker">RESEARCH TOPICS</p>
    <ol>{topics.map((topic, index) => <li key={topic.label}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <Link href={topic.href}>{topic.label}</Link>
    </li>)}</ol>
  </nav>;
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test tests/research-archive-layout.test.mjs
```

Expected: all tests in the file PASS.

- [ ] **Step 6: Commit the content boundary**

```bash
git add lib/research/archive.ts components/research-project-list.tsx components/research-topic-index.tsx tests/research-archive-layout.test.mjs
git commit -m "feat: add typed research archive content"
```

### Task 3: Rebuild the masthead and research-first homepage

**Files:**
- Modify: `components/research-shell.tsx`
- Modify: `app/page.tsx`
- Delete: `components/content-overview.tsx`
- Modify: `app/research-archive.css`
- Modify: `tests/research-archive-layout.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `researchProfile`, `researchProjects`, `researchTopics`, `ResearchProjectList`, public `ContentEntry` records.
- Produces: public masthead and homepage section order: identity → current question → projects → topics → papers → records.

- [ ] **Step 1: Replace outdated homepage assertions with the new order contract**

In `tests/rendered-html.test.mjs`, replace the two homepage tests with:

```js
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

test("homepage project entries expose questions, contributions, and evidence links", async () => {
  const html = await (await render("/")).text();
  for (const text of ["LingBot-VA", "EgoEngine", "GenWAM", "研究问题", "研究贡献", "研究证据"]) {
    assert.match(html, new RegExp(text));
  }
});
```

Append to `tests/research-archive-layout.test.mjs`:

```js
test("masthead has desktop and native mobile navigation without glass chrome", async () => {
  const [shell, css] = await Promise.all([read("components/research-shell.tsx"), read("app/research-archive.css")]);
  assert.match(shell, /<details className="archive-mobile-nav"/);
  assert.match(shell, /href="\/editor"/);
  assert.match(css, /\.archive-masthead/);
  assert.doesNotMatch(css, /backdrop-filter|border-radius:\s*999px/);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail against the old homepage**

Run:

```bash
npm run build
node --test tests/research-archive-layout.test.mjs tests/rendered-html.test.mjs
```

Expected: FAIL because the old hero, content pulse, and navigation are still rendered.

- [ ] **Step 3: Replace the public shell**

Replace `components/research-shell.tsx` with:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [["/", "研究"], ["/projects", "项目"], ["/papers", "论文"], ["/blog", "记录"], ["/about", "关于"]] as const;

function NavigationLinks() {
  return <>{navigation.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</>;
}

export function ResearchShell({ children }: { children: ReactNode }) {
  return <div className="research-page">
    <header className="archive-masthead">
      <div className="archive-masthead__identity">
        <Link href="/" aria-label="郭跃研究档案馆首页"><strong>郭跃</strong><span>GUO YUE</span></Link>
        <p>EMBODIED AI · RESEARCH ARCHIVE</p>
      </div>
      <nav className="archive-desktop-nav" aria-label="公开导航"><NavigationLinks /></nav>
      <nav className="archive-tools" aria-label="站点工具"><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></nav>
      <details className="archive-mobile-nav">
        <summary>菜单</summary>
        <nav aria-label="移动端公开导航"><NavigationLinks /><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></nav>
      </details>
    </header>
    <main>{children}</main>
    <footer className="archive-footer"><p>继续研究，也继续记录。</p><span>郭跃 · Guo Yue</span></footer>
  </div>;
}
```

- [ ] **Step 4: Replace the homepage composition**

Replace `app/page.tsx` with:

```tsx
import Link from "next/link";
import { methodLabels, readingStatusLabels } from "@/components/paper-method-badges";
import { ResearchProjectList } from "@/components/research-project-list";
import { ResearchShell } from "@/components/research-shell";
import { ResearchTopicIndex } from "@/components/research-topic-index";
import { getRecentEntriesByType } from "@/lib/content/query";
import { listPublicEntries } from "@/lib/blog/read-model";
import { researchProfile, researchProjects, researchTopics } from "@/lib/research/archive";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listPublicEntries();
  const papers = getRecentEntriesByType("papers", 3, entries);
  const records = entries.filter((entry) => entry.type !== "papers").slice(0, 4);

  return <ResearchShell>
    <section className="archive-hero">
      <div><p className="archive-kicker">{researchProfile.field}</p><h1>{researchProfile.name}<span>{researchProfile.latinName}</span></h1><p>{researchProfile.statement}</p><nav aria-label="首页主要入口"><Link href="/projects">查看研究项目</Link><Link href="/papers">阅读论文笔记</Link></nav></div>
      <aside aria-labelledby="current-question"><p className="archive-kicker">CURRENT QUESTION</p><h2 id="current-question">当前研究问题</h2><p>{researchProfile.currentQuestion}</p><time dateTime="2026-08-09">更新于 2026.08.09</time></aside>
    </section>
    <section className="archive-section" aria-labelledby="selected-projects"><header><p className="archive-kicker">SELECTED WORK</p><h2 id="selected-projects">精选研究项目</h2><Link href="/projects">完整项目档案 →</Link></header><ResearchProjectList projects={researchProjects} compact /></section>
    <section className="archive-section"><ResearchTopicIndex topics={researchTopics} /></section>
    <section className="archive-section" aria-labelledby="recent-papers"><header><p className="archive-kicker">RECENT READING</p><h2 id="recent-papers">最近论文阅读</h2><Link href="/papers">论文索引 →</Link></header><ol className="archive-reading-list">{papers.map((entry) => <li key={entry.slug}><time dateTime={entry.readAt ?? entry.date}>{entry.readAt ?? entry.date}</time><div><p>{(entry.readingMethods ?? []).map((method) => methodLabels[method]).join(" · ") || "尚未选择阅读方式"} · {readingStatusLabels[entry.readingStatus ?? "queued"]}</p><h3><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h3><p>{entry.summary}</p></div></li>)}</ol></section>
    <section className="archive-section" aria-labelledby="recent-records"><header><p className="archive-kicker">FIELD NOTES</p><h2 id="recent-records">研究之外的记录</h2><Link href="/index">完整内容索引 →</Link></header><ol className="archive-record-list">{records.map((entry) => <li key={entry.slug}><time dateTime={entry.date}>{entry.date}</time><Link href={`/post/${entry.slug}`}>{entry.title}</Link><span>{entry.type}</span></li>)}</ol></section>
  </ResearchShell>;
}
```

- [ ] **Step 5: Add the complete masthead, homepage, project, topic, and footer CSS**

Append to `app/research-archive.css` exact rules for `.archive-masthead`, `.archive-desktop-nav`, `.archive-tools`, `.archive-mobile-nav`, `.archive-hero`, `.archive-section`, `.archive-projects`, `.archive-topics`, `.archive-reading-list`, `.archive-record-list`, and `.archive-footer` with these fixed invariants:

```css
.archive-masthead, .archive-hero, .archive-section, .archive-footer {
  width: min(calc(100% - 48px), var(--archive-width));
  margin-inline: auto;
}
.archive-masthead { min-height: 96px; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 32px; border-block: 1px solid var(--archive-rule); }
.archive-masthead__identity a { display: inline-flex; align-items: baseline; gap: 10px; font-family: var(--archive-display); text-decoration: none; }
.archive-masthead__identity strong { font-size: 22px; }.archive-masthead__identity span, .archive-masthead__identity p { color: var(--archive-muted); font: 600 11px/1.4 var(--archive-sans); letter-spacing: .12em; }
.archive-desktop-nav, .archive-tools { display: flex; gap: 24px; }.archive-desktop-nav a, .archive-tools a { min-height: 44px; display: inline-flex; align-items: center; color: var(--archive-muted); font-size: 14px; text-decoration: none; }
.archive-desktop-nav a:hover, .archive-tools a:hover { color: var(--archive-accent); text-decoration: underline; text-underline-offset: 6px; }
.archive-mobile-nav { display: none; }
.archive-hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr); gap: clamp(48px, 8vw, 120px); padding-block: clamp(72px, 10vw, 144px); }
.archive-hero h1 { margin: 0; font: 600 clamp(48px, 7vw, 80px)/.96 var(--archive-display); letter-spacing: -.045em; }.archive-hero h1 span { display: block; margin-top: 14px; color: var(--archive-muted); font: 500 14px/1 var(--archive-sans); letter-spacing: .16em; }
.archive-hero > div > p:not(.archive-kicker) { max-width: 620px; color: var(--archive-muted); }.archive-hero nav { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 28px; }.archive-hero nav a { min-height: 44px; display: inline-flex; align-items: center; border-bottom: 1px solid var(--archive-ink); text-decoration: none; }
.archive-hero aside { align-self: end; padding-left: 24px; border-left: 2px solid var(--archive-accent); }.archive-hero aside h2 { margin: 0 0 16px; font: 600 24px/1.2 var(--archive-display); }.archive-hero aside time { color: var(--archive-muted); font: 12px/1 var(--archive-mono); }
.archive-kicker { margin: 0 0 12px; color: var(--archive-accent); font: 600 11px/1.3 var(--archive-sans); letter-spacing: .15em; }
.archive-section { padding-block: 64px; border-top: 1px solid var(--archive-rule); }.archive-section > header { display: grid; grid-template-columns: 1fr auto; align-items: end; margin-bottom: 32px; }.archive-section > header .archive-kicker, .archive-section > header h2 { grid-column: 1; }.archive-section > header a { grid-column: 2; grid-row: 1 / 3; color: var(--archive-muted); font-size: 14px; }.archive-section h2 { margin: 0; font: 600 clamp(32px, 4vw, 46px)/1.1 var(--archive-display); letter-spacing: -.035em; }
.archive-projects, .archive-projects ol, .archive-topics ol, .archive-reading-list, .archive-record-list { margin: 0; padding: 0; list-style: none; }.archive-projects > li { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 24px; padding: 32px 0; border-top: 1px solid var(--archive-rule); }.archive-projects__number { color: var(--archive-muted); font: 12px/1 var(--archive-mono); }.archive-projects h3 { margin: 0 0 20px; font: 600 32px/1.1 var(--archive-display); }.archive-projects dl { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }.archive-projects dt { color: var(--archive-muted); font-size: 12px; }.archive-projects dd { margin: 8px 0 0; }.archive-projects nav a { min-height: 44px; display: inline-flex; align-items: center; margin-top: 20px; color: var(--archive-accent); }
.archive-topics ol { border-top: 1px solid var(--archive-rule); }.archive-topics li { display: grid; grid-template-columns: 64px 1fr; align-items: center; border-bottom: 1px solid var(--archive-rule); }.archive-topics li span { color: var(--archive-muted); font: 12px/1 var(--archive-mono); }.archive-topics li a { min-height: 58px; display: flex; align-items: center; font: 500 22px/1.2 var(--archive-display); text-decoration: none; }
.archive-reading-list li { display: grid; grid-template-columns: 144px 1fr; gap: 24px; padding: 24px 0; border-top: 1px solid var(--archive-rule); }.archive-reading-list time, .archive-record-list time { color: var(--archive-muted); font: 12px/1.5 var(--archive-mono); }.archive-reading-list h3 { margin: 4px 0; font: 600 24px/1.25 var(--archive-display); }.archive-reading-list p { margin: 0; color: var(--archive-muted); }
.archive-record-list li { display: grid; grid-template-columns: 144px 1fr auto; gap: 24px; align-items: center; min-height: 64px; border-top: 1px solid var(--archive-rule); }.archive-record-list a { font-family: var(--archive-display); font-size: 20px; }.archive-record-list span { color: var(--archive-muted); font-size: 12px; }
.archive-footer { display: flex; justify-content: space-between; padding-block: 48px; border-top: 1px solid var(--archive-rule); font-family: var(--archive-display); }.archive-footer span { color: var(--archive-muted); font-family: var(--archive-sans); font-size: 13px; }
@media (max-width: 760px) {
  .archive-masthead, .archive-hero, .archive-section, .archive-footer { width: min(calc(100% - 32px), var(--archive-width)); }
  .archive-masthead { min-height: 76px; grid-template-columns: 1fr auto; }.archive-desktop-nav, .archive-tools { display: none; }.archive-mobile-nav { display: block; }.archive-mobile-nav summary { min-width: 44px; min-height: 44px; display: grid; place-items: center; cursor: pointer; }.archive-mobile-nav nav { position: absolute; z-index: 30; right: 16px; width: min(280px, calc(100vw - 32px)); padding: 12px 16px; border: 1px solid var(--archive-rule); background: var(--archive-paper); }.archive-mobile-nav nav a { min-height: 44px; display: flex; align-items: center; border-bottom: 1px solid var(--archive-rule); }
  .archive-hero { grid-template-columns: 1fr; gap: 48px; padding-block: 64px; }.archive-hero aside { align-self: auto; }.archive-section > header { display: block; }.archive-section > header a { display: inline-flex; margin-top: 16px; }.archive-projects > li, .archive-reading-list li, .archive-record-list li { grid-template-columns: 1fr; gap: 8px; }.archive-projects dl { grid-template-columns: 1fr; gap: 18px; }.archive-footer { display: grid; gap: 8px; }
}
```

- [ ] **Step 6: Delete the obsolete content-pulse component and run tests**

Delete `components/content-overview.tsx`, then run:

```bash
npm run build
node --test tests/research-archive-layout.test.mjs tests/rendered-html.test.mjs
```

Expected: build exits `0`; all focused tests PASS; the homepage no longer renders the artificial monthly targets.

- [ ] **Step 7: Commit the public shell and homepage**

```bash
git add components/research-shell.tsx app/page.tsx app/research-archive.css tests/research-archive-layout.test.mjs tests/rendered-html.test.mjs
git add -u components/content-overview.tsx
git commit -m "feat: rebuild homepage as research archive"
```

### Task 4: Convert projects and papers into evidence and bibliography views

**Files:**
- Modify: `app/projects/page.tsx`
- Modify: `app/papers/page.tsx`
- Modify: `components/paper-index.tsx`
- Modify: `app/research-archive.css`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `tests/editor-source.test.mjs`

**Interfaces:**
- Consumes: `researchProjects`, `ResearchProjectList`, existing paper `ContentEntry` fields.
- Produces: project archive and keyword/status/method/topic/year/venue-filtered bibliography without schema changes.

- [ ] **Step 1: Write failing server-render and source tests**

Update the paper-index test in `tests/editor-source.test.mjs` to assert:

```js
test("paper bibliography supports query, method, status, topic, year, venue, and date order", async () => {
  const source = await readFile(new URL("../components/paper-index.tsx", import.meta.url), "utf8");
  for (const state of ["query", "readingMethod", "readingStatus", "topic", "year", "venue", "order"]) {
    assert.match(source, new RegExp(`\\[${state},\\s*set${state[0].toUpperCase()}${state.slice(1)}\\]`));
  }
  assert.match(source, /type="search"/);
  assert.match(source, /readingMethods\?\.includes/);
  assert.match(source, /localeCompare/);
  assert.match(source, /paper-bibliography/);
  assert.match(source, />清除筛选</);
});
```

Append to `tests/rendered-html.test.mjs`:

```js
test("projects render research questions, contributions, and evidence without card grids", async () => {
  const html = await (await render("/projects")).text();
  assert.match(html, /研究问题/);
  assert.match(html, /研究贡献/);
  assert.match(html, /查看 VLA 研究笔记/);
  assert.doesNotMatch(html, /project-grid/);
});

test("papers render the bibliography labels backed by existing reading fields", async () => {
  const html = await (await render("/papers")).text();
  for (const label of ["关键词", "阅读方式", "执行状态", "主题", "年份", "来源", "排序", "粗读", "细读", "总结"]) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /复现|对比阅读/);
});
```

- [ ] **Step 2: Run the focused tests and verify the old card/matrix layout fails**

```bash
npm run build
node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs
```

Expected: the new projects and bibliography assertions FAIL.

- [ ] **Step 3: Replace the projects page with the shared evidence list**

Replace `app/projects/page.tsx` with:

```tsx
import { ResearchProjectList } from "@/components/research-project-list";
import { ResearchShell } from "@/components/research-shell";
import { researchProjects } from "@/lib/research/archive";

export default function ProjectsPage() {
  return <ResearchShell>
    <header className="archive-page-heading"><p className="archive-kicker">SELECTED WORK</p><h1>研究项目</h1><p>从研究问题、个人贡献和可验证产物理解每一项工作。</p></header>
    <section className="archive-page-section" aria-label="研究项目档案"><ResearchProjectList projects={researchProjects} /></section>
  </ResearchShell>;
}
```

- [ ] **Step 4: Refactor paper filtering without changing content types**

In `components/paper-index.tsx`, add state and filtering exactly as follows, retaining the existing `methods`, `statuses`, connection links, and empty states:

```tsx
const [query, setQuery] = useState("");
const [order, setOrder] = useState<"newest" | "oldest">("newest");
const needle = query.trim().toLocaleLowerCase();
const hasFilters = Boolean(query || topic || year || venue || readingStatus || readingMethod);

const filteredEntries = entries.filter((entry) =>
  (!needle || [entry.title, entry.summary, entry.venue ?? "", ...(entry.authors ?? []), ...(entry.topics ?? [])].some((value) => value.toLocaleLowerCase().includes(needle))) &&
  (!topic || entry.topics?.includes(topic)) &&
  (!year || String(entry.year) === year) &&
  (!venue || entry.venue === venue) &&
  (!readingStatus || entry.readingStatus === readingStatus) &&
  (!readingMethod || entry.readingMethods?.includes(readingMethod as ReadingMethod))
).sort((left, right) => {
  const comparison = (left.readAt ?? left.date).localeCompare(right.readAt ?? right.date);
  return order === "newest" ? -comparison : comparison;
});

function clearFilters() {
  setQuery(""); setTopic(""); setYear(""); setVenue(""); setReadingStatus(""); setReadingMethod(""); setOrder("newest");
}
```

Replace the filter markup with labelled controls including:

```tsx
<div className="paper-filters" aria-label="论文筛选">
  <label>关键词<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
  <label>阅读方式<select value={readingMethod} onChange={(event) => setReadingMethod(event.target.value)}><option value="">全部方式</option>{methods.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
  <label>执行状态<select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}><option value="">全部状态</option>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
  <label>主题<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">全部主题</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label>
  <label>年份<select value={year} onChange={(event) => setYear(event.target.value)}><option value="">全部年份</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
  <label>来源<select value={venue} onChange={(event) => setVenue(event.target.value)}><option value="">全部来源</option>{venues.map((value) => <option key={value}>{value}</option>)}</select></label>
  <label>排序<select value={order} onChange={(event) => setOrder(event.target.value as "newest" | "oldest")}><option value="newest">最近阅读</option><option value="oldest">最早阅读</option></select></label>
  {hasFilters ? <button type="button" onClick={clearFilters}>清除筛选</button> : null}
</div>
```

Replace the result portion after the filter controls with this complete bibliography and mobile rendering:

```tsx
{!entries.length ? (
  <p className="empty-state">还没有论文阅读。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>，再放入论文内容目录。</p>
) : filteredEntries.length ? (
  <section aria-live="polite" aria-labelledby="paper-bibliography-title">
    <div className="paper-bibliography-heading"><p className="archive-kicker">BIBLIOGRAPHY</p><h2 id="paper-bibliography-title">论文档案</h2><p>{filteredEntries.length} 篇论文</p></div>
    <ol className="paper-bibliography">
      {filteredEntries.map((entry) => <li key={entry.slug}>
        <time dateTime={entry.readAt ?? entry.date}>{entry.readAt ?? entry.date}</time>
        <PaperMethodBadges methods={entry.readingMethods ?? []} status={entry.readingStatus ?? "queued"} showInactive={false} />
        <div>
          <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
          <p className="paper-bibliography__source">{entry.authors?.join("、")} · {entry.year} · {entry.venue ?? "未注明来源"}</p>
          <ul className="paper-index-topics" aria-label="论文主题">{(entry.topics ?? []).map((value) => <li key={value}>{value}</li>)}</ul>
          {connections[entry.slug]?.length ? <nav className="paper-index-connections" aria-label="关联文章">{connections[entry.slug].map((related) => <Link href={`/post/${related.slug}`} key={related.slug}>{related.title}</Link>)}</nav> : null}
        </div>
        <span className="paper-bibliography__status">{readingStatusLabels[entry.readingStatus ?? "queued"]}</span>
      </li>)}
    </ol>
    <div className="paper-mobile-list">
      {filteredEntries.map((entry) => <article key={entry.slug}>
        <p>{entry.readAt ?? entry.date} · {entry.venue ?? "未注明来源"}</p>
        <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
        <p>{entry.authors?.join("、")} · {entry.year}</p>
        <PaperMethodBadges methods={entry.readingMethods ?? []} status={entry.readingStatus ?? "queued"} showInactive={false} />
        <ul className="paper-index-topics" aria-label="论文主题">{(entry.topics ?? []).map((value) => <li key={value}>{value}</li>)}</ul>
        {connections[entry.slug]?.length ? <nav className="paper-index-connections" aria-label="关联文章">{connections[entry.slug].map((related) => <Link href={`/post/${related.slug}`} key={related.slug}>{related.title}</Link>)}</nav> : null}
        <p>{entry.summary}</p>
      </article>)}
    </div>
  </section>
) : (
  <div className="empty-state"><p>没有符合当前条件的论文，请调整上方筛选条件。</p><button type="button" onClick={clearFilters}>清除筛选</button></div>
)}
```

- [ ] **Step 5: Add page, filter, and bibliography CSS**

Append to `app/research-archive.css`:

```css
.archive-page-heading, .archive-page-section, .index-page, .article-page, .search-index { width: min(calc(100% - 48px), 980px); margin-inline: auto; }.archive-page-heading { padding-block: 80px 48px; }.archive-page-heading h1 { margin: 0; font: 600 clamp(44px, 6vw, 64px)/1 var(--archive-display); }.archive-page-heading > p:last-child { max-width: 620px; color: var(--archive-muted); }
.paper-filters { display: grid; grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(120px, 1fr)); gap: 16px; padding-block: 24px; border-block: 1px solid var(--archive-rule); }.paper-filters label { display: grid; gap: 6px; color: var(--archive-muted); font-size: 12px; }.paper-filters input, .paper-filters select, .paper-filters button { min-height: 44px; padding-inline: 10px; border: 1px solid var(--archive-rule); border-radius: 4px; background: var(--archive-paper); color: var(--archive-ink); font-family: var(--archive-sans); }
.paper-bibliography { margin: 32px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--archive-rule); }.paper-bibliography > li { display: grid; grid-template-columns: 120px 150px minmax(0, 1fr) 110px; gap: 20px; padding: 24px 0; border-bottom: 1px solid var(--archive-rule); }.paper-bibliography time, .paper-bibliography__source { color: var(--archive-muted); font: 12px/1.5 var(--archive-mono); }.paper-bibliography h2 { margin: 0 0 6px; font: 600 23px/1.25 var(--archive-display); }.paper-bibliography h2 a { text-decoration: none; }.paper-bibliography__status { color: var(--archive-accent); font-size: 13px; }
@media (max-width: 900px) { .paper-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }.paper-bibliography { display: none; }.paper-mobile-list { display: block; } }
@media (max-width: 560px) { .archive-page-heading, .archive-page-section, .index-page, .article-page, .search-index { width: min(calc(100% - 32px), 980px); }.paper-filters { grid-template-columns: 1fr; } }
```

- [ ] **Step 6: Run project and paper regressions**

```bash
npm run build
node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs tests/content-index.test.mjs
```

Expected: all focused tests PASS, including existing paper methods, status, related links, and published-content filtering.

- [ ] **Step 7: Commit project and paper views**

```bash
git add app/projects/page.tsx app/papers/page.tsx components/paper-index.tsx app/research-archive.css tests/rendered-html.test.mjs tests/editor-source.test.mjs
git commit -m "feat: add evidence projects and paper bibliography"
```

### Task 5: Unify record indexes and long-form article reading

**Files:**
- Modify: `app/blog/page.tsx`
- Modify: `app/index/page.tsx`
- Modify: `components/content-index.tsx`
- Modify: `components/recruiting-index.tsx`
- Modify: `app/reflections/page.tsx`
- Modify: `components/markdown-article.tsx`
- Modify: `app/research-archive.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: existing public `ContentEntry` values and related-entry query logic.
- Produces: one consistent ledger language for blog, unified index, internship, recruiting, reflections, and article reading.

- [ ] **Step 1: Add failing rendered-route assertions**

Append to `tests/rendered-html.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test and verify legacy ambient classes fail**

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

Expected: FAIL because ambient/card classes remain in the records and article markup.

- [ ] **Step 3: Replace decorative class hooks with archive ledger hooks**

Make these exact semantic substitutions while preserving existing data and links:

```tsx
// components/content-index.tsx
<header className="archive-index-heading">…</header>
<section className="archive-index-list" aria-label={`${title}文章列表`}>
<article className="archive-index-entry" key={entry.slug}>…</article>

// components/recruiting-index.tsx
<section className="archive-recruiting-stages" aria-label="秋招阶段筛选">…</section>
<div className="archive-recruiting-ledger" aria-live="polite">…</div>
<article className="archive-recruiting-entry" key={entry.slug}>…</article>

// app/reflections/page.tsx
<div className="archive-reflection-ledger">…</div>
<section className="archive-reflection-month" …>…</section>
<article className="archive-reflection-day" …>…</article>
```

Replace `app/blog/page.tsx` with this complete server-filtered ledger:

```tsx
import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";

export const dynamic = "force-dynamic";
const labels = { papers: "论文阅读", jobs: "秋招记录", internship: "实习日记", reflections: "个人随笔" } as const;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "all" } = await searchParams;
  const needle = q.trim().toLocaleLowerCase();
  const entries = (await listPublicEntries()).filter((entry) =>
    (type === "all" || entry.type === type) &&
    (!needle || [entry.title, entry.summary, ...entry.tags].some((value) => value.toLocaleLowerCase().includes(needle))),
  );
  return <ResearchShell><div className="index-page">
    <header className="archive-index-heading"><p className="archive-kicker">WRITING</p><h1>记录</h1><p>论文之外，保存秋招、实习和每日思考。</p></header>
    <form className="archive-record-filter" method="get"><label>搜索<input type="search" name="q" defaultValue={q} /></label><label>类型<select name="type" defaultValue={type}><option value="all">全部</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button type="submit">筛选</button></form>
    <ol className="archive-record-list">{entries.map((entry) => <li key={entry.slug}><time dateTime={entry.date}>{entry.date}</time><Link href={`/post/${entry.slug}`}>{entry.title}</Link><span>{labels[entry.type]}</span></li>)}</ol>
    {!entries.length ? <p className="empty-state">没有符合条件的已发布文章。</p> : null}
  </div></ResearchShell>;
}
```

Replace `app/index/page.tsx` with this complete grouped index, preserving all four content modules:

```tsx
import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";
import type { ContentEntry } from "@/lib/content/types";

export const dynamic = "force-dynamic";
const groups: Array<{ type: ContentEntry["type"]; title: string }> = [{ type: "papers", title: "论文阅读" }, { type: "internship", title: "实习日记" }, { type: "jobs", title: "秋招记录" }, { type: "reflections", title: "个人随笔" }];

export default async function IndexPage() {
  const entries = await listPublicEntries();
  return <ResearchShell><div className="index-page"><header className="archive-index-heading"><p className="archive-kicker">KNOWLEDGE INDEX</p><h1>完整内容索引</h1><p>四类内容独立归档，通过时间、标签和关联文章共同连接。</p></header><div className="archive-index-groups">{groups.map((group) => {
    const items = entries.filter((entry) => entry.type === group.type);
    return <section key={group.type}><header><h2>{group.title}</h2><span>{items.length} 篇</span></header><ol>{items.map((entry) => <li key={entry.slug}><time dateTime={entry.date}>{entry.date}</time><Link href={`/post/${entry.slug}`}>{entry.title}</Link></li>)}</ol></section>;
  })}</div></div></ResearchShell>;
}
```

- [ ] **Step 4: Remove ambient wrappers from the article component**

In `components/markdown-article.tsx`:

```tsx
<header className={`article-header article-header--${entry.type}`}>
```

Keep the current `article-meta`, `PaperMethodBadges`, next action, tags, heading IDs, React Markdown plugins, related-entry links, and `throwOnError: false`. Replace:

```tsx
<aside className="article-related content-panel" aria-label="相关文章与日记">
```

with:

```tsx
<aside className="article-related" aria-label="相关文章与日记">
```

At mobile widths, render the existing outline as a bordered section before the article body; do not hide headings or generate a second set of IDs.

- [ ] **Step 5: Add archive ledger and reading CSS**

Append rules that share these exact structural invariants:

```css
.archive-index-heading { padding-block: 72px 36px; border-bottom: 1px solid var(--archive-rule); }.archive-index-heading h1 { margin: 0; font: 600 clamp(40px, 6vw, 60px)/1 var(--archive-display); }.archive-index-heading > p:last-child { max-width: 620px; color: var(--archive-muted); }
.archive-index-list, .archive-recruiting-ledger, .archive-reflection-ledger { border-top: 1px solid var(--archive-rule); }.archive-index-entry, .archive-recruiting-entry { display: grid; grid-template-columns: 72px minmax(0, 1fr) 44px; gap: 24px; padding: 28px 0; border-bottom: 1px solid var(--archive-rule); }.archive-index-entry h2, .archive-recruiting-entry h2 { margin: 4px 0; font: 600 25px/1.25 var(--archive-display); }
.archive-recruiting-stages { display: grid; grid-template-columns: repeat(5, 1fr); border-block: 1px solid var(--archive-rule); }.archive-recruiting-stages button { min-height: 64px; border: 0; border-right: 1px solid var(--archive-rule); background: transparent; color: var(--archive-ink); }.archive-recruiting-stages button[aria-pressed="true"] { box-shadow: inset 0 -2px var(--archive-accent); color: var(--archive-accent); }
.archive-reflection-month { display: grid; grid-template-columns: 150px minmax(0, 1fr); padding-block: 36px; border-top: 1px solid var(--archive-rule); }.archive-reflection-day { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 24px; padding: 24px 0; border-bottom: 1px solid var(--archive-rule); }.archive-reflection-day h4 { font: 500 24px/1.3 var(--archive-display); }
.article-header { padding-block: 72px 42px; border-bottom: 1px solid var(--archive-rule); }.article-header h1 { max-width: 850px; margin: 0; font: 600 clamp(42px, 6vw, 64px)/1.05 var(--archive-display); letter-spacing: -.035em; }.article-summary { max-width: 65ch; color: var(--archive-muted); }.article-reading-layout { display: grid; grid-template-columns: 180px minmax(0, var(--archive-reading)); justify-content: center; gap: 52px; margin-top: 42px; }.article-outline { position: sticky; top: 24px; align-self: start; padding-right: 20px; border-right: 1px solid var(--archive-rule); }.reading-body { min-width: 0; max-width: var(--archive-reading); font-family: var(--archive-display); font-size: 17px; line-height: 1.8; }.markdown-body table, .markdown-body pre, .markdown-body .katex-display { display: block; max-width: 100%; overflow-x: auto; }.article-related { max-width: var(--archive-reading); margin: 64px auto 0; padding-top: 32px; border-top: 1px solid var(--archive-rule); }
@media (max-width: 760px) { .archive-index-entry, .archive-recruiting-entry, .archive-reflection-month, .archive-reflection-day { grid-template-columns: 1fr; gap: 8px; }.archive-recruiting-stages { grid-template-columns: 1fr; }.archive-recruiting-stages button { border-right: 0; border-bottom: 1px solid var(--archive-rule); }.article-reading-layout { display: block; }.article-outline { position: static; margin-bottom: 28px; padding: 0 0 20px; border-right: 0; border-bottom: 1px solid var(--archive-rule); } }
```

- [ ] **Step 6: Run all public-route regressions**

```bash
npm run build
node --test tests/content-index.test.mjs tests/public-read-model.test.mjs tests/rendered-html.test.mjs
```

Expected: all tests PASS; draft exclusion, related links, LaTeX, tables, code, recruiting metadata, and reflection order remain intact.

- [ ] **Step 7: Commit public archives and reading surfaces**

```bash
git add app/blog/page.tsx app/index/page.tsx app/reflections/page.tsx components/content-index.tsx components/recruiting-index.tsx components/markdown-article.tsx app/research-archive.css tests/rendered-html.test.mjs
git commit -m "style: unify archive indexes and article reading"
```

### Task 6: Make the editor intentionally responsive without touching persistence

**Files:**
- Create: `components/editor/editor-mobile-bar.tsx`
- Modify: `components/editor/editor-sidebar.tsx`
- Modify: `components/editor/section-editor.tsx`
- Modify: `components/editor/structured-editor.tsx`
- Modify: `components/admin-shell.tsx`
- Modify: `app/editor-archive.css`
- Modify: `tests/editor-responsive.test.mjs`
- Modify: `tests/editor-source.test.mjs`

**Interfaces:**
- Consumes: existing `mobilePane`, `SaveState`, `flushAutosave`, `publish`, `drawerOpen`, and all current editor callbacks.
- Produces: desktop three-pane workspace, tablet post drawer plus edit/preview switch, phone bottom action bar, and module action disclosure.

- [ ] **Step 1: Replace obsolete Apple-material tests with archive editor tests**

Replace `tests/editor-responsive.test.mjs` with:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("editor exposes desktop, tablet, and phone presentation controls", async () => {
  const [editor, sidebar, mobileBar, css] = await Promise.all([
    read("components/editor/structured-editor.tsx"), read("components/editor/editor-sidebar.tsx"),
    read("components/editor/editor-mobile-bar.tsx"), read("app/editor-archive.css"),
  ]);
  assert.match(editor, /sidebarOpen/);
  assert.match(editor, /studio-posts-toggle/);
  assert.match(sidebar, /isOpen/);
  assert.match(mobileBar, /添加模块/);
  assert.match(mobileBar, /预览/);
  assert.match(mobileBar, /发布/);
  assert.match(css, /grid-template-columns:\s*220px\s+minmax\(440px,\s*1fr\)\s+360px/);
  assert.match(css, /@media\s*\(max-width:\s*1024px\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /padding-bottom:\s*calc\(88px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
});

test("editor archive chrome has no glass, gradients, or hover lift", async () => {
  const css = await read("app/editor-archive.css");
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|translateY\(-/);
  assert.match(css, /min-height:\s*44px/);
});

test("section actions are grouped in a native keyboard-accessible disclosure", async () => {
  const section = await read("components/editor/section-editor.tsx");
  assert.match(section, /<details className="studio-section-menu"/);
  assert.match(section, /<summary>模块操作<\/summary>/);
  for (const action of ["上移", "下移", "复制", "删除"]) assert.match(section, new RegExp(action));
});
```

- [ ] **Step 2: Run editor tests and verify the responsive controls are missing**

```bash
node --test tests/editor-responsive.test.mjs tests/editor-source.test.mjs
```

Expected: FAIL because the tablet drawer, phone bar, and module disclosure do not exist.

- [ ] **Step 3: Create the phone action bar**

Create `components/editor/editor-mobile-bar.tsx`:

```tsx
import type { MobilePane, SaveState } from "./editor-types";

export function EditorMobileBar({ pane, saveState, disabled, onAdd, onPaneChange, onPublish }: {
  pane: MobilePane;
  saveState: SaveState;
  disabled: boolean;
  onAdd: () => void;
  onPaneChange: (pane: MobilePane) => void;
  onPublish: () => void;
}) {
  const saveLabel = ({ idle: "待保存", saving: "保存中", saved: "已保存", failed: "保存失败", conflict: "版本冲突" } as const)[saveState];
  return <nav className="studio-mobile-bar" aria-label="移动端编辑操作">
    <button type="button" disabled={disabled} onClick={onAdd}>添加模块</button>
    <button type="button" aria-pressed={pane === "preview"} onClick={() => onPaneChange(pane === "preview" ? "edit" : "preview")}>{pane === "preview" ? "继续编辑" : "预览"}</button>
    <span className={`save-state--${saveState}`} aria-live="polite">{saveLabel}</span>
    <button type="button" disabled={disabled || saveState === "saving"} onClick={onPublish}>发布</button>
  </nav>;
}
```

- [ ] **Step 4: Add tablet drawer state while preserving every save function byte-for-byte**

In `StructuredEditor`, add only presentation state near existing state:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

Add this button to the toolbar after the owner name:

```tsx
<button className="studio-posts-toggle" type="button" aria-expanded={sidebarOpen} aria-controls="studio-post-list" onClick={() => setSidebarOpen((value) => !value)}>文章列表</button>
```

Pass presentation props to the sidebar and close it after selecting:

```tsx
<EditorSidebar id="studio-post-list" isOpen={sidebarOpen} posts={posts} selectedId={selectedId} creating={creating} onSelect={(id) => { setSidebarOpen(false); void selectPost(id); }} onCreate={(type) => { setSidebarOpen(false); void createPost(type); }} />
```

Render the mobile bar immediately before `AddSectionDrawer`:

```tsx
<EditorMobileBar pane={mobilePane} saveState={saveState} disabled={!current} onAdd={() => setDrawerOpen(true)} onPaneChange={setMobilePane} onPublish={() => void publish()} />
```

Do not edit `persistDraft`, `scheduleAutosave`, `flushAutosave`, `selectPost`, `createPost`, `publish`, `saveAsNewArticle`, or `importMarkdown` except for the shown presentation callbacks.

- [ ] **Step 5: Add sidebar props and module disclosure**

Extend `EditorSidebar` props with `id: string` and `isOpen: boolean`, then render:

```tsx
<aside id={id} className={`studio-sidebar${isOpen ? " is-open" : ""}`} aria-label="文章列表">
```

Replace the action buttons in `SectionEditor` with:

```tsx
<details className="studio-section-menu"><summary>模块操作</summary><div>
  <button type="button" onClick={() => onMove(-1)} aria-label={`上移${section.title}`}>上移</button>
  <button type="button" onClick={() => onMove(1)} aria-label={`下移${section.title}`}>下移</button>
  <button type="button" onClick={onDuplicate}>复制</button>
  <button type="button" onClick={onDelete}>删除</button>
</div></details>
```

- [ ] **Step 6: Implement the complete editor CSS override**

Expand `app/editor-archive.css` with:

```css
.admin-header { border-bottom: 1px solid var(--archive-rule); background: var(--archive-paper); }.admin-main { width: min(calc(100% - 32px), 1440px); max-width: none; padding: 36px 0 72px; }
.structured-editor { border: 1px solid var(--archive-rule); border-radius: 6px; background: var(--archive-paper); box-shadow: none; }.studio-toolbar, .studio-toolbar--floating { position: sticky; top: 0; z-index: 20; min-height: 60px; padding: 8px 12px; border-bottom: 1px solid var(--archive-rule); background: var(--archive-paper); box-shadow: none; }.studio-toolbar button, .studio-toolbar a, .studio-import { min-height: 44px; border: 1px solid var(--archive-rule); border-radius: 4px; background: transparent; box-shadow: none; }.studio-posts-toggle { display: none !important; }
.studio-layout { display: grid; grid-template-columns: 220px minmax(440px, 1fr) 360px; min-height: 72vh; }.studio-sidebar { top: 60px; max-height: calc(100vh - 60px); padding: 16px 12px; background: var(--archive-paper-soft); }.studio-sidebar button, .studio-fields input, .studio-fields select, .studio-fields textarea, .studio-section input, .studio-section textarea, .studio-drawer input, .studio-drawer select { min-height: 44px; border-radius: 4px; background: var(--archive-paper); }.studio-sidebar button.is-active { border-color: var(--archive-accent); background: var(--archive-paper); box-shadow: inset 3px 0 var(--archive-accent); }
.studio-form { padding: 28px; }.studio-preview { padding: 28px 22px; border-left: 1px solid var(--archive-rule); background: var(--archive-paper); }.studio-section, .studio-fields__specific { border: 1px solid var(--archive-rule); border-radius: 6px; background: transparent; box-shadow: none; }.studio-section:hover { border-color: var(--archive-rule); box-shadow: none; }.studio-section textarea, .studio-preview code, .studio-preview pre { font-family: var(--archive-mono); }
.studio-section-menu { margin-left: auto; }.studio-section-menu summary { min-height: 44px; display: inline-flex; align-items: center; cursor: pointer; }.studio-section-menu > div { position: absolute; z-index: 5; right: 28px; display: grid; min-width: 160px; padding: 8px; border: 1px solid var(--archive-rule); background: var(--archive-paper); }.studio-mobile-bar { display: none; }
.studio-message[role="status"] { border-left: 3px solid var(--archive-accent); background: var(--archive-paper-soft); }.studio-recovery { background: oklch(94% .035 80); }
@media (max-width: 1024px) {
  .studio-posts-toggle { display: inline-flex !important; }.studio-layout { display: block; }.studio-sidebar { position: fixed; z-index: 40; inset: 60px auto 0 0; width: min(320px, 86vw); max-height: none; transform: translateX(-100%); transition: transform 180ms ease; }.studio-sidebar.is-open { transform: translateX(0); }.studio-form, .studio-preview { min-height: 70vh; border-left: 0; }.studio-layout[data-mobile-pane="edit"] .studio-form { display: block; }.studio-layout[data-mobile-pane="edit"] .studio-preview { display: none; }.studio-layout[data-mobile-pane="preview"] .studio-form { display: none; }.studio-layout[data-mobile-pane="preview"] .studio-preview { display: block; }.studio-mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .admin-main { width: 100%; padding: 0 0 calc(88px + env(safe-area-inset-bottom)); }.admin-copy { padding-inline: 16px; }.structured-editor { border-inline: 0; border-radius: 0; }.studio-toolbar { overflow-x: auto; }.studio-toolbar .studio-import, .studio-toolbar > a, .studio-toolbar .material-action--primary, .studio-save-state { display: none; }.studio-form, .studio-preview { padding: 16px; }.studio-fields, .studio-fields__specific { grid-template-columns: 1fr; }.studio-fields > label, .studio-fields__specific > label, .studio-choice { grid-column: 1; }.studio-section__heading { flex-wrap: wrap; }.studio-mobile-tabs { display: none; }.studio-mobile-bar { position: fixed; z-index: 50; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; padding: 8px 8px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid var(--archive-rule); background: var(--archive-paper); }.studio-mobile-bar > * { min-height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--archive-ink); font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) { .studio-sidebar { transition-duration: 1ms; } }
```

- [ ] **Step 7: Run editor preservation and responsive tests**

```bash
node --test tests/editor-responsive.test.mjs tests/editor-source.test.mjs tests/editor-api-source.test.mjs tests/blog-service.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-assets.test.mjs
npm run build
```

Expected: every test PASS and build exits `0`. In particular, autosave serialization, `flushAutosave`, version conflicts, backend error fields, Markdown round-trip, reusable modules, image assets, and explicit publish remain verified.

- [ ] **Step 8: Commit responsive editor presentation**

```bash
git add components/editor/editor-mobile-bar.tsx components/editor/editor-sidebar.tsx components/editor/section-editor.tsx components/editor/structured-editor.tsx components/admin-shell.tsx app/editor-archive.css tests/editor-responsive.test.mjs tests/editor-source.test.mjs
git commit -m "style: make web editor responsive across devices"
```

### Task 7: Remove obsolete visual contracts and complete accessibility states

**Files:**
- Delete: `tests/react-bits-layout.test.mjs`
- Modify: `tests/research-archive-layout.test.mjs`
- Modify: `app/research-archive.css`
- Modify: `app/editor-archive.css`
- Modify: `components/research-shell.tsx`
- Modify: `components/paper-index.tsx`

**Interfaces:**
- Consumes: all redesigned public/editor class contracts.
- Produces: one authoritative style test and complete focus, disabled, loading, error, success, and reduced-motion states.

- [ ] **Step 1: Add failing anti-regression assertions**

Append to `tests/research-archive-layout.test.mjs`:

```js
test("new presentation files do not reintroduce the retired visual language", async () => {
  const [publicCss, editorCss, home, shell] = await Promise.all([
    read("app/research-archive.css"), read("app/editor-archive.css"), read("app/page.tsx"), read("components/research-shell.tsx"),
  ]);
  const combined = `${publicCss}\n${editorCss}\n${home}\n${shell}`;
  assert.doesNotMatch(combined, /ambient|glass|linear-gradient|radial-gradient|backdrop-filter|translateY\(-/i);
  assert.doesNotMatch(combined, /border-radius:\s*999px/);
});

test("all archive controls expose focus, disabled, and status treatments", async () => {
  const [publicCss, editorCss] = await Promise.all([read("app/research-archive.css"), read("app/editor-archive.css")]);
  assert.match(publicCss, /:focus-visible/);
  assert.match(editorCss, /:disabled/);
  for (const state of ["saving", "saved", "failed", "conflict"]) assert.match(editorCss, new RegExp(`save-state--${state}`));
});
```

- [ ] **Step 2: Run the contract and observe missing state styles**

```bash
node --test tests/research-archive-layout.test.mjs
```

Expected: FAIL until all explicit editor states are defined and retired hooks are removed from the new layer.

- [ ] **Step 3: Add explicit state styles**

Append to `app/editor-archive.css`:

```css
.structured-editor button:disabled, .structured-editor input:disabled, .structured-editor select:disabled { cursor: not-allowed; opacity: .52; }
.save-state--saving { color: var(--archive-muted); }.save-state--saved { color: oklch(43% .09 145); }.save-state--failed, .save-state--conflict { color: var(--archive-accent); }
.structured-editor button:not(:disabled):active, .archive-masthead a:active, .archive-section a:active { opacity: .7; }
```

Do not add a fabricated active-route state to the server shell. Visible focus rings and page headings remain the reliable navigation indicators until route-aware navigation is introduced as a separate, tested feature.

- [ ] **Step 4: Delete the obsolete React Bits contract**

Delete `tests/react-bits-layout.test.mjs`. Its required behavior is superseded by `tests/research-archive-layout.test.mjs`, while its gradient, ambient, floating, and material assertions conflict with the approved design.

- [ ] **Step 5: Run lint, build, and the full suite**

```bash
npm run lint
npm run build
node --test tests/*.test.mjs
```

Expected: lint and build exit `0`; the full Node suite reports zero failures.

- [ ] **Step 6: Commit the completed visual contract**

```bash
git add app/research-archive.css app/editor-archive.css components/research-shell.tsx components/paper-index.tsx tests/research-archive-layout.test.mjs
git add -u tests/react-bits-layout.test.mjs
git commit -m "test: enforce research archive visual contract"
```

### Task 8: Verify real viewport and editing workflows, then publish

**Files:**
- Modify only if verification exposes a defect: the smallest owning file from Tasks 1–7.
- No generated content or `.superpowers/brainstorm/` files may enter the release commit.

**Interfaces:**
- Consumes: the complete redesigned site and existing Sites deployment workflow.
- Produces: verified local release, pushed commit, successful Sites deployment, and public smoke evidence.

- [ ] **Step 1: Establish a clean release candidate**

Run:

```bash
git status --short
git diff --check
npm test
```

Expected: only `.superpowers/brainstorm/` may remain untracked; `git diff --check` is clean; build and all tests pass.

- [ ] **Step 2: Start the production-equivalent local server**

Run:

```bash
npm run build
npm run start
```

Expected: the server starts without compilation errors and serves the application locally. Keep the process running in its own terminal session for browser verification.

- [ ] **Step 3: Verify public routes at every required width**

Using the browser inspector responsive viewport, visit `/`, `/projects`, `/papers`, `/jobs`, `/reflections`, `/post/unitacvla-reading`, and `/search` at 320, 375, 414, 768, 1024, and 1440 CSS pixels.

For every route and width, confirm all of the following:

```text
no document-level horizontal scroll
masthead navigation remains reachable
body copy is at least 17px
all interactive targets are at least 44px
project evidence links remain visible
paper filters remain labelled and usable
formula, code, and table overflow stays inside its own container
focus-visible treatment is present with keyboard navigation
reduced-motion disables positional animation
```

Expected: every check passes. If any item fails, write a focused regression assertion first, make the smallest CSS/component fix, rerun its focused tests, and commit with `fix: correct <surface> responsive behavior`.

- [ ] **Step 4: Verify the real owner editor workflow on desktop, tablet, and phone**

At 1440, 768, and 375 CSS pixels, sign in as the configured owner and visit `/editor`. Use a disposable draft and execute this exact workflow:

```text
create reflection draft
enter title and Markdown body
wait for 已保存
refresh and confirm content persists
add a custom Markdown module
save it as a reusable module
paste or upload one local image
insert one inline and one display LaTeX formula
switch edit/preview
export Markdown
import the exported Markdown as a new draft
publish the valid draft
remove a required reading-summary block from a paper draft and confirm publication is rejected with backend error and fields
restore the block and confirm publication succeeds
```

Expected: every step succeeds; the invalid paper publish is the only intentionally blocked action; no draft is written into another article.

- [ ] **Step 5: Re-run release gates after browser verification**

```bash
npm run lint
npm test
git status --short
git log -8 --oneline
```

Expected: lint, build, and all tests pass; only intended source/test changes and the untracked preview directory are present; the task commits are visible.

- [ ] **Step 6: Push the verified commit**

Use `github:yeet` to confirm the exact diff, commit any verified browser-only fix, and push the current branch. Do not push generated content changes or `.superpowers/brainstorm/`.

Expected: remote HEAD equals local HEAD.

- [ ] **Step 7: Deploy through Sites and verify the public release**

Use `sites:sites-hosting` on the verified checkout. Deploy only after the pushed full commit SHA is known.

After deployment succeeds, request these public URLs and require HTTP `200`:

```text
https://guoyue-reading-journal.guoguoyue315.chatgpt.site/
https://guoyue-reading-journal.guoguoyue315.chatgpt.site/projects
https://guoyue-reading-journal.guoguoyue315.chatgpt.site/papers
https://guoyue-reading-journal.guoguoyue315.chatgpt.site/post/unitacvla-reading
https://guoyue-reading-journal.guoguoyue315.chatgpt.site/editor
```

Expected: public pages render the research-archive design; `/editor` reaches the owner authentication/editing path; the deployed version reports `succeeded` and references the pushed full commit SHA.

- [ ] **Step 8: Record final evidence in the handoff**

Report:

```text
final commit SHA
remote branch
test count and zero-failure result
production build result
viewport widths verified
editor workflows verified
Sites deployment version and succeeded status
public URL
any intentionally deferred scope from the design specification
```

## Plan Self-Review

| Confirmed specification area | Implemented by |
| --- | --- |
| Research-first information architecture | Tasks 2–3 |
| Newsreader, IBM Plex Sans, IBM Plex Mono, OKLCH palette | Task 1 |
| Evidence-oriented project archive | Tasks 2 and 4 |
| Multi-select reading methods and single-select execution status | Task 4 |
| Independent blog, internship, recruiting, paper, and reflection archives | Task 5 |
| Markdown, LaTeX, image, relation, and narrow-screen overflow preservation | Tasks 5–6 |
| Desktop, tablet, and phone web editing | Task 6 |
| Autosave, conflict, import/export, reusable modules, and publish-error preservation | Task 6 |
| Keyboard, focus, status, reduced-motion, and touch-target behavior | Task 7 |
| Required viewport and real editing workflow verification | Task 8 |
| Git push, Sites publication, and public smoke test | Task 8 |

Self-review found no uncovered specification requirement. PWA, offline editing, dark mode, BibTeX import, new animation dependencies, data-schema changes, and framework migration remain explicitly outside this plan.
