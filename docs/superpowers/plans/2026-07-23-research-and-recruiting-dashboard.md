# Research and Recruiting Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing personal blog with a visual paper-reading matrix and recruiting funnel while preserving Obsidian publishing, long-form reading, LaTeX, module isolation, and responsive behavior.

**Architecture:** Extend the build-time Markdown schema into typed paper and recruiting metadata, then expose reusable query summaries to focused client components. Keep Markdown parsing and validation in the generator, presentation in reusable badges/funnels/indexes, and Obsidian templates aligned with the same frontmatter contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, vinext/Vite, React Markdown, KaTeX, Node test runner, Markdown frontmatter generated at build time.

## Global Constraints

- Paper reading methods are multi-select: `skim`, `deep`, `synthesis`.
- Paper execution status is single-select: `queued`, `in_progress`, `synthesizing`, `completed`, `archived`.
- Only queued papers may use `reading_methods: []`; every other status requires at least one method.
- Non-queued paper methods and actual `## 粗读记录`, `## 细读记录`, `## 阅读总结` sections must agree in both directions.
- Recruiting stage is single-select: `applied`, `written_test`, `interview`, `offer`, `closed`.
- Preserve the existing paper-like visual identity, mobile editing, LaTeX, GFM, search, cross-module relations, draft isolation, and four content directories.
- Status must never be communicated by color alone; controls require visible labels, keyboard focus, and 44px touch targets.
- No new database, authentication, comment system, external recruiting integration, or automatic phone-to-production deployment.

---

### Task 1: Typed content schema and fixture migration

**Files:**
- Modify: `lib/content/types.ts`
- Modify: `scripts/generate-content-index.mjs`
- Modify: `content/papers/unitacvla-reading.md`
- Modify: `content/jobs/autumn-recruiting-journey.md`
- Test: `tests/content-index.test.mjs`

**Interfaces:**
- Produces: `ReadingMethod`, `ReadingStatus`, `ApplicationStage`, and optional recruiting fields on `ContentEntry`.
- Produces runtime fields `readingMethods`, `readingStatus`, `company`, `role`, `location`, `applicationStage`, `appliedAt`, `nextAction`.

- [ ] **Step 1: Write failing schema tests**

Add isolated-generator cases that expect:

```js
assert.deepEqual(paper.readingMethods, ["skim", "synthesis"]);
assert.equal(paper.readingStatus, "completed");
assert.equal(job.applicationStage, "interview");
assert.match(await generatorFailure({ "papers/bad.md": duplicateMethods }), /reading_methods.*duplicate/i);
assert.match(await generatorFailure({ "papers/bad.md": emptyActiveMethods }), /reading_methods.*at least one/i);
assert.match(await generatorFailure({ "papers/bad.md": missingDeepSection }), /细读记录/i);
assert.match(await generatorFailure({ "jobs/bad.md": missingCompany }), /company/i);
```

- [ ] **Step 2: Run the schema tests and verify RED**

Run: `node --test tests/content-index.test.mjs`  
Expected: FAIL because new fields and validation do not exist.

- [ ] **Step 3: Implement minimal schema and normalization**

Define exact types:

```ts
export type ReadingMethod = "skim" | "deep" | "synthesis";
export type ReadingStatus = "queued" | "in_progress" | "synthesizing" | "completed" | "archived";
export type ApplicationStage = "applied" | "written_test" | "interview" | "offer" | "closed";
```

Validate arrays, uniqueness, status-method rules, method-section agreement, recruiting required fields, and optional ISO `applied_at`. Normalize snake_case fields in `runtimeEntry()`.

- [ ] **Step 4: Migrate bundled published fixtures**

The paper fixture becomes:

```yaml
reading_methods: [deep, synthesis]
reading_status: completed
```

and its body receives `## 细读记录` and `## 阅读总结`. The recruiting fixture receives `company`, `role`, `location`, `application_stage`, `applied_at`, and `next_action`, plus actual `## 投递`, `## 面试`, and `## 最终复盘` sections.

- [ ] **Step 5: Run schema tests and verify GREEN**

Run: `node --test tests/content-index.test.mjs`  
Expected: all content-index tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content/types.ts scripts/generate-content-index.mjs content/papers/unitacvla-reading.md content/jobs/autumn-recruiting-journey.md tests/content-index.test.mjs
git commit -m "feat: model paper methods and recruiting stages"
```

### Task 2: Reusable progress queries and metadata components

**Files:**
- Modify: `lib/content/query.ts`
- Create: `components/paper-method-badges.tsx`
- Create: `components/progress-overview.tsx`
- Test: `tests/content-index.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Produces: `getPaperStatusCounts(): Record<ReadingStatus, number>`.
- Produces: `getRecruitingStageCounts(): Record<ApplicationStage, number>`.
- Produces: `PaperMethodBadges({ methods, status })` and `ProgressOverview({ paperCounts, recruitingCounts })`.

- [ ] **Step 1: Write failing query and rendering tests**

```js
assert.deepEqual(getPaperStatusCounts(), { queued: 0, in_progress: 0, synthesizing: 0, completed: 1, archived: 0 });
assert.deepEqual(getRecruitingStageCounts(), { applied: 0, written_test: 0, interview: 1, offer: 0, closed: 0 });
assert.match(html, /粗读|细读|总结/);
assert.match(html, /论文阅读概览/);
assert.match(html, /秋招进展概览/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/content-index.test.mjs tests/rendered-html.test.mjs`  
Expected: FAIL because queries and components are missing.

- [ ] **Step 3: Implement count queries and badges**

Initialize all enum keys to zero, count only generated published entries, and return new objects. Render all three paper method labels with `已采用` or `未采用` text so meaning is not color-only.

- [ ] **Step 4: Implement compact dual overview**

Render two linked groups with exact Chinese labels and numeric counts. Use semantic headings and lists; do not add charts or third-party visualization dependencies.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/content-index.test.mjs tests/rendered-html.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content/query.ts components/paper-method-badges.tsx components/progress-overview.tsx tests/content-index.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: add reusable blog progress summaries"
```

### Task 3: Visual paper-reading matrix and responsive filters

**Files:**
- Modify: `components/paper-index.tsx`
- Modify: `app/papers/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/editor-source.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `ContentEntry.readingMethods`, `ContentEntry.readingStatus`, `PaperMethodBadges`.
- Produces: client-side filters for method, status, topic, venue, and year with a reset action.

- [ ] **Step 1: Write failing paper-index tests**

Assert source contains `readingMethod`, all five new status values, a reset button, and mobile card labels. Assert server-rendered paper page includes the matrix headings `粗读`, `细读`, `总结`, and status text.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs`  
Expected: FAIL against the old four-status list.

- [ ] **Step 3: Implement filtering and matrix markup**

Use inclusion semantics:

```ts
(!readingMethod || entry.readingMethods?.includes(readingMethod as ReadingMethod))
```

Render a semantic desktop table and equivalent mobile cards from the same filtered array. Include a `清除筛选` button when no results match.

- [ ] **Step 4: Add responsive visual styles**

Use existing paper, ink, muted, rule, and vermilion tokens. Show the table at desktop widths and cards below `760px`; do not require horizontal scrolling. Every select and button must be at least 44px high.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/paper-index.tsx app/papers/page.tsx app/globals.css tests/editor-source.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: visualize paper reading methods"
```

### Task 4: Recruiting funnel and岗位 archive

**Files:**
- Create: `components/recruiting-index.tsx`
- Modify: `app/jobs/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/editor-source.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: recruiting fields on `ContentEntry` and `getRecruitingStageCounts()`.
- Produces: `RecruitingIndex({ entries })` with stage filters, funnel counts, cards, and reset action.

- [ ] **Step 1: Write failing recruiting-index tests**

Assert source and server HTML include `投递`, `笔试`, `面试`, `Offer`, `结束`, `下一步`, `清除筛选`, company, and role.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs`  
Expected: FAIL because the generic content index has no funnel.

- [ ] **Step 3: Implement funnel and stage filtering**

Render the five stages as labeled buttons with counts. Selecting a stage filters the cards; selecting the active stage again or using `清除筛选` restores all entries. Cards show company, role, location, applied date, current stage, next action, summary, and article link.

- [ ] **Step 4: Add responsive styles**

Desktop uses a five-column thin-rule funnel; mobile stacks stages and cards vertically. Preserve visible focus, text labels, and 44px controls.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/editor-source.test.mjs tests/rendered-html.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/recruiting-index.tsx app/jobs/page.tsx app/globals.css tests/editor-source.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: add recruiting progress funnel"
```

### Task 5: Homepage and article metadata integration

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/markdown-article.tsx`
- Modify: `app/globals.css`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: both count queries, `ProgressOverview`, and `PaperMethodBadges`.
- Produces: homepage progress overview and paper/recruiting metadata on detail pages.

- [ ] **Step 1: Write failing homepage and article tests**

Assert homepage contains both overview headings and current counts. Assert the paper article contains the three method labels and new status; assert the recruiting article contains company, role, stage, and next action.

- [ ] **Step 2: Run rendering tests and verify RED**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: FAIL because the new metadata is not rendered.

- [ ] **Step 3: Integrate overview and detail metadata**

Insert `ProgressOverview` after recent content. Reuse `PaperMethodBadges` in paper article headers. Add recruiting metadata rows only for `jobs` entries with the new fields.

- [ ] **Step 4: Add restrained supporting styles**

Keep the first viewport editorial, use thin rules and numeric typography, and avoid dashboard chrome. Stack progress groups below `760px`.

- [ ] **Step 5: Run rendering tests and verify GREEN**

Run: `node --test tests/rendered-html.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/markdown-article.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: surface reading and recruiting progress"
```

### Task 6: Editor and Obsidian template alignment

**Files:**
- Modify: `components/portable-editor.tsx`
- Modify: `tests/editor-source.test.mjs`
- Modify outside repository: `/Users/guoyue/Library/Mobile Documents/iCloud~md~obsidian/Documents/paper-reading-vault/博客/模板/论文阅读.md`
- Create outside repository: `/Users/guoyue/Library/Mobile Documents/iCloud~md~obsidian/Documents/paper-reading-vault/博客/模板/秋招进展.md`

**Interfaces:**
- Produces Markdown compatible with Task 1 schema.
- Preserves `scripts/sync-obsidian-blog.mjs` behavior without adding a second schema parser.

- [ ] **Step 1: Write failing editor template tests**

Assert the paper template contains `reading_methods`, the five allowed status values in its guidance, and the three optional headings. Assert the jobs template contains all recruiting fields and the four recommended sections.

- [ ] **Step 2: Run editor tests and verify RED**

Run: `node --test tests/editor-source.test.mjs`  
Expected: FAIL because templates still use the old schema.

- [ ] **Step 3: Update portable editor templates**

Default paper draft uses:

```yaml
reading_methods: []
reading_status: queued
```

and includes commented guidance plus the three optional headings. Default jobs draft contains required recruiting fields and `application_stage: applied` with 投递、笔试、面试、最终复盘 sections.

- [ ] **Step 4: Run editor tests and verify GREEN**

Run: `node --test tests/editor-source.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Update actual Obsidian templates after requesting exact vault write access**

Write the same schema and headings into the user’s configured `博客/模板` files. Do not change user-authored notes or publish a sample article.

- [ ] **Step 6: Commit repository changes**

```bash
git add components/portable-editor.tsx tests/editor-source.test.mjs
git commit -m "feat: align writing templates with progress models"
```

### Task 7: Full regression, accessibility, and deployment

**Files:**
- Verify: `lib/content/generated.ts`
- Verify: `.openai/hosting.json`
- Build artifact: `outputs/guoyue-blog-research-dashboard.tar.gz`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified source commit, Sites saved version, and private production deployment.

- [ ] **Step 1: Run the real Obsidian sync and content build**

Run: `npm run blog:sync && npm run content:build`  
Expected: zero or more notes sync successfully; generated index contains all valid published entries.

- [ ] **Step 2: Run complete verification**

Run: `npm test && npm run lint`  
Expected: all tests PASS, production build succeeds, lint exits 0.

- [ ] **Step 3: Inspect status and commit any verification fixes**

Run: `git status --short` and confirm no ignored local config or generated archive is staged. Commit only intentional source changes.

- [ ] **Step 4: Push the exact HEAD to the existing Sites source branch**

Create a short-lived write credential, push `HEAD` to its returned branch using per-command authentication, and verify the pushed commit matches `git rev-parse HEAD`.

- [ ] **Step 5: Package and save a new Sites version**

Run the bundled `package-site.sh PROJECT_DIR ARCHIVE_PATH`, then save with the exact HEAD commit and resulting archive.

- [ ] **Step 6: Deploy privately and poll to a terminal state**

Use the existing project ID from `.openai/hosting.json`, deploy the saved version with owner-only access, and poll until `succeeded` or `failed`. On success, report the unchanged production URL.
