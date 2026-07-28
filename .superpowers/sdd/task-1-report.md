# Task 1 Implementation Report

## Delivered

- Added a failing source-level regression test for serialized editor autosaves and stale-response protection.
- Added a single-flight save queue, local edit revisions, and an 800 ms autosave debounce.
- A PATCH response now updates the active editor draft only when no newer local edit exists; a newer draft is saved with the returned server version after the active request completes.
- `flushAutosave` waits for queued persistence and skips redundant PATCH requests for the already-saved revision.

## Verification

- `node --test tests/editor-source.test.mjs` — passed: 14 tests.
- `npm run lint` — not runnable in this checkout because `eslint` is not installed (`sh: eslint: command not found`).

## Self-review

- The existing PATCH body and `expectedVersion` contract are unchanged.
- Newer local text is not replaced by an older response, and recovery storage is cleared only for the matching edit revision.

## Fix

- Editing while a PATCH is in flight now queues the newest snapshot immediately, then persists it with the server version returned by the completed request. Normal idle edits retain the 800 ms debounce.
- Switching articles now awaits every active or queued save before changing the selection. An active-article identity guard also prevents a late response for another article from replacing the visible editor draft.
- Strengthened `tests/editor-source.test.mjs` to assert the immediate queue, returned-version chaining, active-article guard, and unconditional selection flush.

### Verification

- `node --test tests/editor-source.test.mjs` — passed: 14 tests.
- `npm test` — focused source tests passed; the build then stopped because this checkout has no `vinext` executable (`sh: vinext: command not found`).

## Fix — Cross-article save handoff

- `createPost`, `saveAsNewArticle`, and `importMarkdown` now await `flushAutosave()` before changing the active article or visible draft.
- This drains any pending debounce, queued snapshot, or in-flight PATCH for the prior article, so a returned version is never reused as the `expectedVersion` for the newly active article.
- Added a focused source-level regression test covering all three switch paths.
