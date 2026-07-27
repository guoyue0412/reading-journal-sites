import assert from "node:assert/strict";
import test from "node:test";
import { listPublicEntries } from "../lib/blog/read-model.ts";
import { MemoryBlogStore } from "../lib/blog/store.ts";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";

test("public read falls back before bootstrap", async () => {
  const store = new MemoryBlogStore();
  const fallback = [{ slug: "legacy", status: "published" }];
  assert.deepEqual(await listPublicEntries(store, fallback), fallback);
});

test("public read returns immutable snapshots and excludes later draft edits", async () => {
  const store = new MemoryBlogStore();
  const draft = createEmptyDraft("reflections", "post-public", "2026-07-24", []);
  draft.title = "Published"; draft.summary = "summary";
  const created = await store.createDraft(draft);
  await store.publish(created, created.draftVersion, "revision-1", "2026-07-24T12:00:00.000Z");
  const current = await store.getDraft(created.id);
  await store.saveDraft({ ...current, title: "Unpublished edit" }, current.draftVersion);
  await store.markBootstrapped("2026-07-24T12:00:00.000Z");
  const entries = await listPublicEntries(store, []);
  assert.equal(entries[0].title, "Published");
});
