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

test("public read falls back only when a required blog table is missing or the local Cloudflare module is unavailable", async () => {
  const fallback = [{ slug: "legacy", status: "published" }];

  for (const error of [
    new Error("D1_ERROR: no such table: blog_state: SQLITE_ERROR"),
    new Error("table posts does not exist"),
    Object.assign(new Error("Received protocol 'cloudflare:'"), {
      code: "ERR_UNSUPPORTED_ESM_URL_SCHEME",
    }),
    new Error("Cannot find module 'cloudflare:workers'"),
  ]) {
    const store = {
      hasBootstrapMarker: async () => { throw error; },
    };
    assert.deepEqual(await listPublicEntries(store, fallback), fallback, error.message);
  }
});

test("public read propagates non-schema D1 errors instead of returning static fallback", async () => {
  for (const databaseError of [
    new Error("D1_ERROR: database temporarily unavailable"),
    new Error("D1_ERROR: not authorized to access database"),
    new Error("D1_ERROR: database disk image is malformed"),
  ]) {
    const store = {
      hasBootstrapMarker: async () => { throw databaseError; },
    };

    await assert.rejects(
      () => listPublicEntries(store, [{ slug: "must-not-leak", status: "published" }]),
      (error) => {
        assert.equal(error, databaseError);
        return true;
      },
      databaseError.message,
    );
  }
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

test("public read gives Memory, D1, and static same-day papers a deterministic order", async () => {
  function paperDraft(id, slug, createdAt) {
    return {
      ...createEmptyDraft("papers", id, "2026-07-24", []),
      slug,
      title: slug,
      createdAt,
    };
  }
  const memoryStore = new MemoryBlogStore();
  const alpha = await memoryStore.createDraft(paperDraft("post-alpha", "alpha", "2026-07-24T13:00:00.000Z"));
  const zeta = await memoryStore.createDraft(paperDraft("post-zeta", "zeta", "2026-07-24T12:00:00.000Z"));
  const alphaSnapshot = await memoryStore.publish(alpha, alpha.draftVersion, "revision-alpha", "2026-07-24T12:00:00.000Z");
  const zetaSnapshot = await memoryStore.publish(zeta, zeta.draftVersion, "revision-zeta", "2026-07-24T13:00:00.000Z");
  const shuffledStatic = [alphaSnapshot, zetaSnapshot].map(snapshotToContentEntry);
  for (const entry of shuffledStatic) delete entry.publishedAt;
  const d1Store = {
    hasBootstrapMarker: async () => true,
    listPublished: async () => [alphaSnapshot, zetaSnapshot],
  };
  const expected = ["zeta", "alpha"];

  await memoryStore.markBootstrapped("2026-07-24T14:00:00.000Z");
  assert.deepEqual((await listPublicEntries(memoryStore, [])).map((entry) => entry.slug), expected);
  assert.deepEqual((await listPublicEntries(d1Store, [])).map((entry) => entry.slug), expected);
  assert.deepEqual((await listPublicEntries(new MemoryBlogStore(), shuffledStatic)).map((entry) => entry.slug), expected);
});
