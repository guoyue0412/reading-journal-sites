# Task 7 — Retired visual contracts and accessibility states

## Delivered

- Added one authoritative anti-regression contract for the new public/editor presentation files. It rejects ambient/glass language, gradients, hover lift, pill radii, `panel-controls`, and every non-`none` `filter` or `backdrop-filter` declaration.
- Preserved the required `backdrop-filter: none` and `-webkit-backdrop-filter: none` resets that neutralize legacy glass rules.
- Added explicit public and editor hover, keyboard-focus, pressed, disabled, loading, success, error, conflict, and reduced-motion treatments with archive tokens and high-contrast status colors.
- Removed the obsolete `panel-controls` compatibility class from `PaperIndex`; `app/research-archive.css` remains the independent owner of the paper filter grid, surface, controls, and responsive layout.
- Deleted `tests/react-bits-layout.test.mjs`, whose ambient/material assertions conflicted with the approved archive language.
- Left `ResearchShell` route-neutral: no fabricated server-side active-route state was added.

## TDD evidence

### RED

Command:

```bash
node --test tests/research-archive-layout.test.mjs
```

Result before production changes: **10 tests, 8 passed, 2 failed**.

- `new presentation files do not reintroduce the retired visual language` failed on `PaperIndex`'s remaining `panel-controls` class.
- `all archive controls expose complete interaction and status treatments` failed first on the missing public `:active` treatment; the same contract continued through disabled, editor focus, status, error, and reduced-motion assertions.

### GREEN

The same focused command after the minimal implementation reported **10 tests, 10 passed, 0 failed**.

Focused cross-surface regression:

```bash
node --test tests/research-archive-layout.test.mjs tests/editor-responsive.test.mjs tests/editor-components-interaction.test.mjs tests/paper-index-interaction.test.mjs
```

Result: **19 tests, 19 passed, 0 failed**.

## Final verification

- `npm run lint` — exited `0`, no lint errors.
- `npm run build` — exited `0`; generated 5 public and 8 legacy entries, completed all five Vinext build stages.
- `node --test tests/*.test.mjs` — **150 tests, 150 passed, 0 failed** when run with write access required by content-generation tests.
- `npm test` — production build succeeded, then **150 tests, 150 passed, 0 failed**.
- `git diff --check` — exited `0` with no whitespace errors.

## Scope review

Changed only the two archive CSS layers, `PaperIndex`, the authoritative archive layout test, deletion of the React Bits layout test, and this report. No schema, API, editor persistence, protected save functions, publishing route, data contract, or server navigation behavior changed. Pre-existing modifications to Task 1 and Task 3 reports remain untouched and unstaged.

## Concerns

No blocking concerns. Build/test output retains pre-existing Node `DEP0205`, `react-test-renderer` deprecation, proxy-detection, and Vinext route-classification warnings. A sandboxed standalone Node-suite attempt produced 7 `EPERM` failures because content tests rewrite generated files; the identical authorized rerun passed 150/150.
