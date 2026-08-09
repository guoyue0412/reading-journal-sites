# Task 5 — Record indexes and long-form article reading

## Delivered

- Replaced ambient/card hooks on `/blog`, `/index`, `/internship`, `/jobs`, and `/reflections` with one archive-ledger vocabulary.
- Preserved the public `ContentEntry` read path, published-only filtering, existing article URLs, related-entry queries, paper reading methods/status, recruiting metadata, and reflection ordering.
- Preserved the existing React Markdown, GFM, math, KaTeX `throwOnError: false`, table, code, and heading-ID rendering path.
- Kept a single outline bound to the rendered heading IDs; the same outline moves ahead of the body at mobile width without duplicating headings or IDs.
- Added 44px-or-larger targets for the new filters, index links, article metadata links, outline links, recruiting links, and reflection links.
- Added only rule-and-whitespace archive styling; no gradients, glass, ambient effects, hover lift, pills, or large decorative shadows were introduced.

## TDD evidence

### RED

After adding only the two rendered-route tests, `npm run build` exited `0`, then:

```text
node --test tests/rendered-html.test.mjs
tests 23
pass 21
fail 2
```

Both failures were expected: record routes lacked `archive-*` ledger hooks, while the article still rendered `article-header--ambient` and `content-panel`.

### GREEN

```text
node --test tests/rendered-html.test.mjs
tests 23
pass 23
fail 0

node --test tests/content-index.test.mjs tests/public-read-model.test.mjs tests/rendered-html.test.mjs
tests 42
pass 42
fail 0
```

The focused command first encountered six `EPERM` fixture-write failures under the sandbox; the identical approved rerun passed 42/42. These were environment failures, not assertion failures.

## Verification

- `npm run build` — exit `0`; generated 5 public and 8 legacy entries and completed all Vinext build stages.
- `npm run lint` — exit `0`, no findings.
- `git diff --check` — exit `0`, no findings.
- `npm test` — build passed; 147 tests ran, 146 passed, 1 failed.

The sole full-suite failure is the pre-existing `tests/react-bits-layout.test.mjs` assertion that requires `index-heading--ambient`. The approved plan assigns deletion of that obsolete test to Task 7, so Task 5 does not modify or stage it.

## Files

- `app/blog/page.tsx`
- `app/index/page.tsx`
- `app/reflections/page.tsx`
- `app/research-archive.css`
- `components/content-index.tsx`
- `components/recruiting-index.tsx`
- `components/markdown-article.tsx`
- `tests/rendered-html.test.mjs`
- `.superpowers/sdd/task-5-report.md`

## Risks and boundaries

- Full-suite green depends on Task 7 removing its explicitly obsolete React Bits contract.
- Existing Node `DEP0205`, proxy-detection, and Vinext route-classification warnings remain unchanged.
- No schema, API, editor, autosave, D1, R2, asset, Markdown persistence, or publication code was touched.
- Existing modified Task 1 and Task 3 reports remain untouched and unstaged.
