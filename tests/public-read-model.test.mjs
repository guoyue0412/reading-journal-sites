import assert from "node:assert/strict";
import test from "node:test";
import { listPublicEntries, snapshotToContentEntry } from "../lib/blog/read-model.ts";
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
  assert.equal(entries[0].updatedAt, "2026-07-24T00:00:00.000Z");
});

test("public read gives shuffled static and D1 reflections the same query order", async () => {
  function reflectionSnapshot(slug) {
    const draft = createEmptyDraft("reflections", `post-${slug}`, "2026-07-24", []);
    return {
      ...draft,
      slug,
      title: slug,
      status: "published",
      revisionId: `revision-${slug}`,
      publishedAt: "2026-07-24T12:00:00.000Z",
    };
  }
  const snapshots = [
    reflectionSnapshot("2026-07-24"),
    reflectionSnapshot("2026-07-24-3"),
    reflectionSnapshot("2026-07-24-2"),
  ];
  const d1Store = {
    hasBootstrapMarker: async () => true,
    listPublished: async () => snapshots,
  };
  const expected = ["2026-07-24-3", "2026-07-24-2", "2026-07-24"];

  assert.deepEqual(
    (await listPublicEntries(new MemoryBlogStore(), snapshots.map(snapshotToContentEntry))).map((entry) => entry.slug),
    expected,
  );
  assert.deepEqual(
    (await listPublicEntries(d1Store, [])).map((entry) => entry.slug),
    expected,
  );
});
