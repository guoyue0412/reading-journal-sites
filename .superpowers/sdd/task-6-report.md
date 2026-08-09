# Task 6 — Responsive archive editor presentation

## Delivered

- Added a phone-only bottom action bar for adding modules, toggling preview, reading save state, and publishing.
- Added a tablet article-list toggle and off-canvas sidebar state; selecting or creating an article closes the drawer through presentation callbacks only.
- Kept the desktop editor as a `220px / minmax(440px, 1fr) / 360px` three-pane workspace.
- Replaced inline module action buttons with a native, keyboard-accessible `details` / `summary` disclosure.
- Added the late editor archive layer for 1024px tablet and 640px phone presentation, 44px targets, safe-area bottom clearance, and reduced-motion behavior.
- Added no new gradients, glass, ambient effects, hover lift, pills, or large decorative shadows to the Task 6 layer.

## TDD evidence

### RED

After replacing only `tests/editor-responsive.test.mjs` with the approved archive editor contract:

```text
node --test tests/editor-responsive.test.mjs tests/editor-source.test.mjs
tests 18
pass 15
fail 3
```

The three expected failures proved that the phone action-bar file, 44px archive override, and native module disclosure were missing. All 15 existing source/persistence assertions still passed.

### GREEN

```text
node --test tests/editor-responsive.test.mjs tests/editor-source.test.mjs tests/editor-api-source.test.mjs tests/blog-service.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-assets.test.mjs
tests 51
pass 51
fail 0
```

The first GREEN attempt was 50/51 because the supplied shorthand `padding` did not satisfy the approved explicit `padding-bottom` safe-area contract. The minimal CSS correction then passed 51/51.

## Persistence boundary audit

Compared with baseline `f4022d1`, exact source slices and SHA-256 prefixes match for every protected function body:

- `persistDraft` — unchanged (`35a7aac91dfa`)
- `scheduleAutosave` — unchanged (`82620b0cae25`)
- `flushAutosave` — unchanged (`27dd228a1403`)
- `selectPost` — unchanged (`7f80212624fb`)
- `createPost` — unchanged (`46745bdbba6d`)
- `publish` — unchanged (`41a53cd1ec28`)
- `saveAsNewArticle` — unchanged (`9faf6d005602`)
- `importMarkdown` — unchanged (`aefe81a2595f`)

The `StructuredEditor` diff contains only the mobile-bar import, `sidebarOpen` presentation state, article-list toggle, approved sidebar close callbacks, and mobile-bar render. No API payload, version-conflict, Markdown, asset, reading-summary, autosave, or publish implementation changed.

## Verification

- `npm run build` — exit `0`; generated 5 public and 8 legacy entries and completed all Vinext stages. The sandboxed first attempt hit `EPERM` while regenerating `lib/content/generated.ts`; the identical approved rerun passed.
- `npm run lint` — exit `0`, no findings.
- `git diff --check` — exit `0`, no findings.
- `npm test` — production build passed; 146 tests ran, 145 passed, 1 failed.

The sole full-suite failure remains the planned obsolete assertion in `tests/react-bits-layout.test.mjs` requiring `index-heading--ambient`. Task 6 did not touch that Task 7-owned file. The pre-Task-6 baseline was 146/147; replacing four obsolete editor-responsive tests with three archive contracts changes the expected count to 145/146 while preserving the same single failure and adding no new failures.

## Files

- `components/editor/editor-mobile-bar.tsx`
- `components/editor/editor-sidebar.tsx`
- `components/editor/section-editor.tsx`
- `components/editor/structured-editor.tsx`
- `app/editor-archive.css`
- `tests/editor-responsive.test.mjs`
- `.superpowers/sdd/task-6-report.md`

`components/admin-shell.tsx` and `tests/editor-source.test.mjs` were reviewed and verified but required no textual change under the plan's explicit implementation steps.

## Risks and boundaries

- Real pointer, keyboard, and viewport screenshot validation remains assigned to the later acceptance task; Task 6 covers source contracts, persistence regressions, lint, and production build.
- Existing Node `module.register()` deprecation, proxy-detection, React test-renderer deprecation, and Vinext route-classification warnings remain non-failing and unchanged.
- Existing modified Task 1 and Task 3 reports remain untouched and unstaged.
