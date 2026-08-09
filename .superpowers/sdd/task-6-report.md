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

## Review-fix follow-up

Independent review identified four coupled presentation gaps: late archive rules did not beat legacy material specificity, the tablet drawer remained keyboard/pointer reachable while visually off-screen, 1024px landscape incorrectly collapsed to one pane, and responsive controls lacked executable component evidence.

### Review RED

After adding cross-file cascade checks and React component behavior tests:

```text
node --test tests/editor-responsive.test.mjs tests/editor-components-interaction.test.mjs
tests 7
pass 2
fail 5
```

The two passes covered the existing mobile-bar and sidebar callbacks. The five expected failures covered absent high-specificity resets, missing 1060px/portrait rules, missing closed-sidebar interaction blocking, missing disclosure positioning, and missing focus restoration. The first StructuredEditor test attempt exposed a test-only Vite alias/cache setup error; adding the repository alias and a `/tmp` cache produced the genuine `focusCalls === 0` RED before production code changed.

A final focused assertion also demonstrated that delayed `visibility` left the closed drawer exposed during transition (`0/1`); removing the visibility transition made closing immediate.

### Review GREEN

```text
node --test tests/editor-responsive.test.mjs tests/editor-components-interaction.test.mjs
tests 7
pass 7
fail 0

node --test tests/editor-components-interaction.test.mjs tests/editor-responsive.test.mjs tests/editor-source.test.mjs tests/editor-api-source.test.mjs tests/blog-service.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-assets.test.mjs
tests 55
pass 55
fail 0
```

The interaction suite uses React 19, `react-test-renderer`, and Vite SSR to verify all five save labels, disabled states, pane/add/publish callbacks, sidebar identity/open state/select/create callbacks, and StructuredEditor close-plus-focus behavior.

### Review changes

- Added explicit archive-specificity resets for admin header blur/shadow, editor/sidebar/preview legacy colors and shadows, drawer glass/radius/float shadow, save-state pill radius, toolbar hover shadow, active-sidebar styling, and semitransparent 10px legacy controls.
- At `<=1060px`, the article sidebar becomes a drawer while edit and preview remain a two-column workspace. Closed state uses immediate `visibility: hidden` and `pointer-events: none`; `is-open` restores both.
- At `<=1024px` portrait, or `<=800px`, `mobilePane` controls the single visible pane. Therefore 1024px landscape retains simultaneous edit and preview while 1024px portrait switches panes. The 1060px threshold removes the previous 1025–1052px gap.
- Selecting or creating an article closes the drawer and returns focus to the article-list toggle through presentation wrappers only.
- The native module menu now establishes its own positioning context and aligns its menu at `right: 0`.

### Review verification

- `npm run build` — exit `0`, all Vinext stages completed.
- `npm run lint` — exit `0`, no findings.
- `npm test` — build passed; 150 tests ran, 149 passed, 1 failed.
- `git diff --check` — exit `0`, no findings.

The only full-suite failure is still the Task 7-owned `tests/react-bits-layout.test.mjs` ambient assertion; the review fix added no failure. Existing deprecation, proxy, and route-classification warnings remain non-failing.

The byte audit against `f4022d1` again matched all eight protected bodies and the same SHA-256 prefixes recorded above. `StructuredEditor` changed only by adding the article-toggle ref, focus-restoring presentation wrapper, and presentation callback wiring.

Review-fix files:

- `app/editor-archive.css`
- `components/editor/structured-editor.tsx`
- `tests/editor-responsive.test.mjs`
- `tests/editor-components-interaction.test.mjs`
- `.superpowers/sdd/task-6-report.md`

## Final review-fix follow-up

The final review found three remaining cascade gaps and one missing parent-level creation-path assertion. Tests were extended before presentation code changed.

### Final RED and GREEN

```text
node --test tests/editor-responsive.test.mjs tests/editor-components-interaction.test.mjs
RED:   tests 8, pass 6, fail 2
GREEN: tests 8, pass 8, fail 0
```

The two genuine RED failures proved that the actual `studio-toolbar material-toolbar` class combination still inherited legacy blur and that the section-title action still inherited its legacy purple treatment. The StructuredEditor creation-path test already passed against the focus-restoring presentation wrapper: it mocked a valid POST response, exercised the real parent `createPost` callback, verified drawer close plus toggle focus, and restored `globalThis.fetch` in `finally`.

The minimal archive-layer fix adds a higher-specificity toolbar blur reset, a dedicated high-contrast primary publish hover triple, and base/hover archive-token resets for the section-title action.

```text
node --test tests/editor-components-interaction.test.mjs tests/editor-responsive.test.mjs tests/editor-source.test.mjs tests/editor-api-source.test.mjs tests/blog-service.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-assets.test.mjs
tests 56
pass 56
fail 0
```

### Final verification

- `npm run build` — exit `0`; all Vinext stages completed. The first sandboxed attempt was unable to regenerate `lib/content/generated.ts`; the identical approved rerun passed.
- `npm run lint` — exit `0`, no findings.
- `git diff --check` — exit `0`, no findings.
- `npm test` — build passed; 151 tests ran, 150 passed, 1 failed.

The sole full-suite failure remains the same Task 7-owned `index-heading--ambient` assertion in `tests/react-bits-layout.test.mjs`; Task 6 did not touch that file and added no failure.

The final byte audit against `f4022d1` again reports all eight protected function bodies unchanged with the same SHA-256 prefixes recorded above. This follow-up changes only `app/editor-archive.css`, the responsive contract, the executable interaction test, and this report.
