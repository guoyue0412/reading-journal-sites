# Editor Background Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent background saves from replacing text that is newer than the save request.

**Architecture:** The structured editor keeps the newest draft in a ref, serializes PATCH requests, and tracks a monotonically increasing local edit revision. A response updates the canonical draft version only if no newer local revision exists; otherwise it queues the newest draft for a follow-up save.

**Tech Stack:** React 19, TypeScript, Next/Vinext, Node test runner.

## Global Constraints

- Preserve the existing D1 PATCH API and optimistic `expectedVersion` contract.
- Start autosave 800 ms after the last edit.
- Never reload the route or replace newer editor content from an earlier response.

---

### Task 1: Serialize draft persistence

**Files:**
- Modify: `components/editor/structured-editor.tsx`
- Test: `tests/editor-source.test.mjs`

**Interfaces:**
- Consumes: `BlogPostDraft`, `PATCH /api/editor/posts/:id`, and `expectedVersion`.
- Produces: `scheduleAutosave(next: BlogPostDraft)` and `flushAutosave(): Promise<BlogPostDraft | null>` that save the newest local snapshot without stale-response replacement.

- [ ] **Step 1: Write the failing source test**

```js
assert.match(source, /const saveInFlight = useRef\(false\)/);
assert.match(source, /const editRevision = useRef\(0\)/);
assert.match(source, /const requestRevision = editRevision\.current/);
assert.match(source, /if \(requestRevision === editRevision\.current\)/);
assert.match(source, /}, 800\)/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/editor-source.test.mjs`

Expected: FAIL because the editor has no serialized-save refs or 800 ms delay.

- [ ] **Step 3: Implement serialized persistence**

```ts
const saveInFlight = useRef(false);
const editRevision = useRef(0);
const queuedSave = useRef<BlogPostDraft | null>(null);

function scheduleAutosave(next: BlogPostDraft) {
  editRevision.current += 1;
  // Update local state, then queue one 800 ms save.
}

async function persistDraft(next: BlogPostDraft) {
  if (saveInFlight.current) { queuedSave.current = next; return null; }
  saveInFlight.current = true;
  const requestRevision = editRevision.current;
  // PATCH next; only setCurrent(payload.post) when requestRevision matches the current revision.
  // Finally, save queuedSave or currentRef.current when it is newer.
}
```

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/editor-source.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/editor/structured-editor.tsx tests/editor-source.test.mjs docs/superpowers/
git commit -m "fix: keep editor stable during background saves"
```

### Task 2: Verify the deployable site

**Files:**
- Modify: no additional files.

**Interfaces:**
- Consumes: completed Task 1 implementation.
- Produces: a validated production build.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 3: Commit any final correction**

```bash
git add components/editor/structured-editor.tsx tests/editor-source.test.mjs
git commit -m "test: verify editor background save"
```
