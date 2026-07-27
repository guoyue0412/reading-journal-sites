import assert from "node:assert/strict";
import test from "node:test";
import { ensureLegacyContentImported } from "../lib/blog/bootstrap.ts";
import { MemoryBlogStore } from "../lib/blog/store.ts";
import { LEGACY_CONTENT_ENTRIES } from "../lib/content/legacy-generated.ts";

function ids() { let value = 0; return () => `legacy-${++value}`; }

test("bootstrap imports published and draft legacy entries exactly once", async () => {
  const store = new MemoryBlogStore();
  await ensureLegacyContentImported(store, LEGACY_CONTENT_ENTRIES, () => "2026-07-24T12:00:00.000Z", ids());
  const first = await store.listDrafts();
  await ensureLegacyContentImported(store, LEGACY_CONTENT_ENTRIES, () => "2026-07-24T12:00:00.000Z", ids());
  assert.equal((await store.listDrafts()).length, first.length);
  assert.equal(first.length, LEGACY_CONTENT_ENTRIES.length);
  assert.ok(first.some((post) => post.status === "draft"));
  assert.equal((await store.listPublished()).length, LEGACY_CONTENT_ENTRIES.filter((entry) => entry.status === "published").length);
});
