# Task 3 Report: Rebuild the masthead and research-first homepage

## Status

Complete. The public homepage now follows the approved research-archive order: identity → current question → projects → topics → papers → records. The public shell uses desktop navigation plus native `<details>` mobile navigation, and the obsolete content-pulse component is deleted.

## TDD evidence

### RED

1. Replaced the two outdated homepage assertions in `tests/rendered-html.test.mjs` and appended the masthead contract to `tests/research-archive-layout.test.mjs` before editing production code.
2. The first sandboxed `npm run build` attempt exited `1` because the sandbox denied writing `lib/content/generated.ts` with `EPERM`. This was an execution-permission issue, not an application failure. Re-running the exact command with approved worktree write access exited `0`, generated 5 public and 8 legacy content entries, and completed the Vinext production build.
3. `node --test tests/research-archive-layout.test.mjs tests/rendered-html.test.mjs` then exited `1`: 23 tests total, 20 passed, 3 failed. The expected failures were:
   - `server-renders the research archive homepage in the approved order`: missing `郭跃` and the new ordered homepage content.
   - `homepage project entries expose questions, contributions, and evidence links`: missing the typed project question/contribution/evidence rendering.
   - `masthead has desktop and native mobile navigation without glass chrome`: missing `<details className="archive-mobile-nav">`.

These failures directly demonstrated that the old homepage, content pulse, and shell did not satisfy the new contract.

### GREEN

1. Implemented the specified public shell, homepage composition, CSS, and obsolete component deletion.
2. `npm run build` exited `0`, generated 5 public and 8 legacy content entries, and completed all five Vinext build stages.
3. `node --test tests/research-archive-layout.test.mjs tests/rendered-html.test.mjs` exited `0`: 23/23 passed, 0 failed.
4. The first `npm test` integration run completed the build but exited `1`: 126/127 passed. The sole failure was a stale source-level assertion in `tests/react-bits-layout.test.mjs` looking for the retired `research-hero` class. Preserving that class would have reactivated legacy radial-gradient, blur, pill, and ambient-orb styling from `app/globals.css`, contradicting the approved design.
5. Updated the compatibility test to assert `archive-hero` and the typed `<ResearchProjectList projects={researchProjects} compact />` composition. The intermediate targeted run exposed the second stale literal-content assertion (2/3 passed); after updating it to the typed composition contract, `node --test tests/react-bits-layout.test.mjs` exited `0`: 3/3 passed.
6. Final fresh `npm test` exited `0`: the production build completed and the full suite passed 127/127, with 0 failures, skips, cancellations, or todos.

## Changed files

- `app/page.tsx` — rebuilt the homepage from typed profile/projects/topics and public content records; uses `methodLabels` and `readingStatusLabels` for Chinese paper metadata.
- `app/research-archive.css` — added the complete masthead, homepage, project, topic, reading, record, footer, and mobile rules.
- `components/research-shell.tsx` — replaced the old shell with the archive masthead, public/tools navigation, native mobile menu, and archive footer.
- `tests/rendered-html.test.mjs` — replaced outdated homepage tests with order, editor-link, content-pulse-removal, and project-evidence contracts.
- `tests/research-archive-layout.test.mjs` — added the native mobile navigation and no-glass-chrome contract.
- `tests/react-bits-layout.test.mjs` — aligned the existing compatibility assertion with the new archive hero and typed project composition discovered by the full-suite gate.

## Deleted file

- `components/content-overview.tsx` — obsolete artificial monthly-target/content-pulse component.

## Self-review

- Verified the homepage order in rendered HTML and confirmed `/projects`, `/papers`, `/index`, `/search`, and `/editor` remain internal routes.
- Confirmed paper method and status copy comes from `methodLabels` and `readingStatusLabels`; no raw reading enum status is rendered.
- Confirmed the search query-link integration fix and editor/content/API contracts were not modified.
- Confirmed the archive stylesheet contains no gradients, `backdrop-filter`, blur, 999px pills, hover lift, glass chrome, or ambient orbs.
- Confirmed desktop and mobile navigation preserve 44px interaction targets, with native `<details>/<summary>` for mobile.
- Confirmed `git diff --cached --check` was clean and the commit contained only the seven reviewed Task 3 files. The unrelated pre-existing modification to `.superpowers/sdd/task-1-report.md` was left untouched and unstaged.

## Commit

- `302f086cb1341677f5a73316593d4a6c72f4ec0a feat: rebuild homepage as research archive`

## Concerns

- No known functional concerns.
- The successful builds emit an existing Node `DEP0205` deprecation warning for `module.register()` and a proxy-environment warning; neither caused a build or test failure.
- The report is written after the code commit so it can record the immutable commit SHA; it is not part of that commit.

## Review fixes

### Scope

- Homepage non-paper records now filter published entries first, then use the shared `getRecentEntries(4, records)` query so generated fallback ordering cannot control visible recency.
- Homepage record types render as Chinese labels: `jobs` → `秋招记录`, `internship` → `实习日记`, and `reflections` → `个人感悟`.
- The masthead identity, topic links, paper-title links, and record-title links each have explicit flex alignment and `min-height: 44px` touch-target rules.
- `ResearchTopicIndex` retains its `RESEARCH TOPICS` kicker and now exposes the visible `<h2 id="research-topics">研究主题</h2>` heading, with the enclosing navigation associated through `aria-labelledby`.

### TDD evidence

#### RED

- `node --test tests/research-archive-layout.test.mjs` exited `1`: 4 passed, 2 failed. The failures were the missing explicit 44px source contracts and the homepage's direct filtered `.slice(0, 4)` rather than `getRecentEntries` recency query.
- After a fresh production build, `node --test tests/rendered-html.test.mjs` exited `1`: 19 passed, 1 failed. The new SSR regression correctly failed because the rendered topic navigation had no `aria-labelledby="research-topics"` association or visible `研究主题` heading; the output also showed raw record types and generated-order records.

#### GREEN

- `node --test tests/research-archive-layout.test.mjs` exited `0`: 6 passed, 0 failed.
- `npm run build && node --test tests/rendered-html.test.mjs` exited `0`: production build completed; 20 passed, 0 failed. The rendered record-list order is asserted as `2026-07-22 → 2026-07-21 → 2026-07-18 → 2026-06-23`, proving the two recent reflections appear before the older non-paper records.
- Final `npm test` exited `0`: 130 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo. `npm run lint` and `git diff --check` also exited `0` with no output.

### Self-review

- Re-read the scoped diff: only homepage query/presentation, topic semantics, touch-target styling, and their contracts changed; no data, API, editor, Markdown, publish, or effect behavior changed.
- The unrelated pre-existing `.superpowers/sdd/task-1-report.md` modification remains unstaged.
