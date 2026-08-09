import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";
import {
  MemoryBlogStore,
  SlugConflictError,
  VersionConflictError,
} from "../lib/blog/store.ts";
import { MemoryBlogAssetStore } from "../lib/blog/asset-store.ts";

test("saving requires the expected draft version", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("reflections", "p1", "2026-07-24", []);
  const created = await store.createDraft({ ...input, slug: "first" });
  const saved = await store.saveDraft({ ...created, title: "First" }, 0);
  assert.equal(saved.draftVersion, 1);
  await assert.rejects(
    () => store.saveDraft({ ...saved, title: "Stale" }, 0),
    VersionConflictError,
  );
});

test("publishing stores an immutable snapshot", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("reflections", "p2", "2026-07-24", []);
  const draft = await store.createDraft({ ...input, slug: "second" });
  const revision = await store.publish(
    draft,
    draft.draftVersion,
    "r1",
    "2026-07-24T12:10:00.000Z",
  );
  revision.title = "Mutated return value";
  draft.sections[0].content = "Mutated draft";

  const published = await store.getPublishedBySlug("second");
  assert.equal(published?.revisionId, "r1");
  assert.equal(published?.title, "");
  assert.equal(published?.sections[0].content, "");
});

test("draft reads and writes do not expose stored object references", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("papers", "p3", "2026-07-24", []);
  input.slug = "paper-three";
  await store.createDraft(input);
  input.sections[0].content = "mutated after create";

  const firstRead = await store.getDraft("p3");
  assert.equal(firstRead?.sections[0].content, "");
  firstRead.sections[0].content = "mutated read";

  const secondRead = await store.getDraft("p3");
  assert.equal(secondRead?.sections[0].content, "");
});

test("duplicate slugs are rejected on create and save", async () => {
  const store = new MemoryBlogStore();
  const first = createEmptyDraft("papers", "p4", "2026-07-24", []);
  const second = createEmptyDraft("papers", "p5", "2026-07-25", []);
  first.slug = "unique-paper";
  second.slug = "unique-paper";
  await store.createDraft(first);
  await assert.rejects(() => store.createDraft(second), SlugConflictError);

  second.slug = "second-paper";
  const created = await store.createDraft(second);
  await assert.rejects(
    () => store.saveDraft({ ...created, slug: "unique-paper" }, created.draftVersion),
    SlugConflictError,
  );
});

test("publishing rejects stale versions without replacing the current revision", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("internship", "p6", "2026-07-24", []);
  input.slug = "internship-six";
  const draft = await store.createDraft(input);
  const first = await store.publish(draft, 0, "r2", "2026-07-24T12:00:00.000Z");

  await assert.rejects(
    () => store.publish(draft, 0, "r3", "2026-07-24T13:00:00.000Z"),
    VersionConflictError,
  );
  assert.equal(first.draftVersion, 1);
  assert.equal((await store.getDraft(draft.id))?.draftVersion, 1);
  assert.equal((await store.getPublishedBySlug("internship-six"))?.revisionId, first.revisionId);
});

test("concurrent publishes have one optimistic-concurrency winner", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("internship", "p8", "2026-07-24", []);
  input.slug = "internship-eight";
  const draft = await store.createDraft(input);

  const outcomes = await Promise.allSettled([
    store.publish(draft, 0, "r5", "2026-07-24T12:00:00.000Z"),
    store.publish(draft, 0, "r6", "2026-07-24T12:00:01.000Z"),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected");
  assert.ok(rejected && rejected.reason instanceof VersionConflictError);
});

test("publish and autosave race for the same optimistic version", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("internship", "p12", "2026-07-24", []);
  input.slug = "internship-twelve";
  const draft = await store.createDraft(input);

  const outcomes = await Promise.allSettled([
    store.publish(draft, 0, "r10", "2026-07-24T12:00:00.000Z"),
    store.saveDraft({ ...draft, title: "Racing autosave" }, 0),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected");
  assert.ok(rejected && rejected.reason instanceof VersionConflictError);
  assert.equal((await store.getDraft(draft.id))?.draftVersion, 1);
});

test("Memory publish guards never promote assets when version, revision, or slug checks fail", async () => {
  const store = new MemoryBlogStore();
  const assets = new MemoryBlogAssetStore();
  const draftInput = createEmptyDraft("reflections", "asset-guarded", "2026-07-24", []);
  draftInput.slug = "asset-guarded";
  const draft = await store.createDraft(draftInput);
  const asset = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    postId: draft.id,
    objectKey: `posts/${draft.id}/guarded.png`,
    originalName: "guarded.png",
    safeName: "guarded.png",
    contentType: "image/png",
    sizeBytes: 12,
    sha256: "guarded-hash",
    visibility: "draft",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
  };
  await assets.createDraftAsset(asset);

  await assert.rejects(
    () => store.publishWithAssets(draft, 1, "stale-revision", "2026-07-24T12:00:00.000Z", [asset.id], assets),
    VersionConflictError,
  );

  const reservedInput = createEmptyDraft("reflections", "reserved-post", "2026-07-25", []);
  reservedInput.slug = "reserved-public";
  const reserved = await store.createDraft(reservedInput);
  await store.publish(reserved, 0, "taken-revision", "2026-07-24T12:01:00.000Z");
  await assert.rejects(
    () => store.publishWithAssets(draft, 0, "taken-revision", "2026-07-24T12:02:00.000Z", [asset.id], assets),
    /Revision already exists/,
  );
  await assert.rejects(
    () => store.publishWithAssets({ ...draft, slug: "reserved-public" }, 0, "new-revision", "2026-07-24T12:03:00.000Z", [asset.id], assets),
    SlugConflictError,
  );

  assert.deepEqual(await assets.getById(asset.id), asset);
  assert.equal((await store.getDraft(draft.id))?.draftVersion, 0);
  assert.equal(await store.getPublishedBySlug(draft.slug), null);
});

test("public slug, date, and ordering remain pinned to immutable revisions", async () => {
  const store = new MemoryBlogStore();
  const olderInput = createEmptyDraft("papers", "p9", "2026-07-20", []);
  olderInput.slug = "old-public-slug";
  const newerInput = createEmptyDraft("papers", "p10", "2026-07-23", []);
  newerInput.slug = "newer-public-post";
  const older = await store.createDraft(olderInput);
  const newer = await store.createDraft(newerInput);
  const publishedOlder = await store.publish(older, 0, "r7", "2026-07-24T12:00:00.000Z");
  await store.publish(newer, 0, "r8", "2026-07-24T12:01:00.000Z");

  await store.saveDraft({
    ...publishedOlder,
    slug: "new-private-slug",
    date: "2026-07-25",
  }, publishedOlder.draftVersion);

  assert.equal((await store.getPublishedBySlug("old-public-slug"))?.date, "2026-07-20");
  assert.equal(await store.getPublishedBySlug("new-private-slug"), null);
  assert.deepEqual(
    (await store.listPublished()).map((snapshot) => snapshot.slug),
    ["newer-public-post", "old-public-slug"],
  );
});

test("published slugs remain reserved across private renames", async () => {
  const store = new MemoryBlogStore();
  const firstInput = createEmptyDraft("papers", "p13", "2026-07-20", []);
  firstInput.slug = "shared";
  const secondInput = createEmptyDraft("papers", "p14", "2026-07-21", []);
  secondInput.slug = "second-private";
  const first = await store.createDraft(firstInput);
  const second = await store.createDraft(secondInput);
  const published = await store.publish(first, 0, "r11", "2026-07-24T12:00:00.000Z");
  const privateFirst = await store.saveDraft({ ...published, slug: "private-a" }, published.draftVersion);

  const third = createEmptyDraft("papers", "p15", "2026-07-22", []);
  third.slug = "shared";
  await assert.rejects(() => store.createDraft(third), SlugConflictError);
  await assert.rejects(
    () => store.saveDraft({ ...second, slug: "shared" }, second.draftVersion),
    SlugConflictError,
  );
  await assert.rejects(
    () => store.publish({ ...second, slug: "shared" }, second.draftVersion, "r12", "2026-07-24T12:01:00.000Z"),
    SlugConflictError,
  );

  const restored = await store.saveDraft({ ...privateFirst, slug: "shared" }, privateFirst.draftVersion);
  const republished = await store.publish(restored, restored.draftVersion, "r13", "2026-07-24T12:02:00.000Z");
  assert.equal((await store.getPublishedBySlug("shared"))?.revisionId, republished.revisionId);
});

test("saving returns canonical store-owned fields after publishing", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("jobs", "p11", "2026-07-24", []);
  input.slug = "canonical-job";
  const created = await store.createDraft(input);
  const published = await store.publish(created, 0, "r9", "2026-07-24T12:00:00.000Z");

  const saved = await store.saveDraft({
    ...published,
    type: "papers",
    status: "draft",
    publishedRevisionId: null,
    createdAt: "1999-01-01T00:00:00.000Z",
    title: "Private edit",
  }, published.draftVersion);

  assert.equal(saved.type, "jobs");
  assert.equal(saved.status, "published");
  assert.equal(saved.publishedRevisionId, "r9");
  assert.equal(saved.createdAt, created.createdAt);
  assert.equal(saved.draftVersion, 2);
});

test("D1 error mapping translates only the posts.slug unique constraint", async () => {
  const { mapD1WriteError } = await import("../lib/blog/d1-errors.ts");
  const slugError = new Error("D1_ERROR: UNIQUE constraint failed: posts.slug: SQLITE_CONSTRAINT");
  const sectionError = new Error("D1_ERROR: UNIQUE constraint failed: post_sections.post_id, post_sections.position: SQLITE_CONSTRAINT");
  const primaryKeyError = new Error("D1_ERROR: UNIQUE constraint failed: posts.id: SQLITE_CONSTRAINT");

  assert.ok(mapD1WriteError(slugError) instanceof SlugConflictError);
  assert.equal(mapD1WriteError(sectionError), sectionError);
  assert.equal(mapD1WriteError(primaryKeyError), primaryKeyError);
});

test("D1 save returns canonical rows read inside its mutation batch", async () => {
  const source = await readFile(new URL("../lib/blog/d1-store.ts", import.meta.url), "utf8");
  const start = source.indexOf("async saveDraft(");
  const end = source.indexOf("async deleteDraft(", start);
  const saveDraftSource = source.slice(start, end);

  assert.doesNotMatch(saveDraftSource, /this\.#?getDraft\(/);
  assert.match(saveDraftSource, /canonicalPostIndex\s*=\s*statements\.length/);
  assert.match(saveDraftSource, /canonicalSectionsIndex\s*=\s*statements\.length/);
  assert.match(saveDraftSource, /results\[canonicalPostIndex\]/);
  assert.match(saveDraftSource, /results\[canonicalSectionsIndex\]/);
});

test("complete draft and asset aliases commit atomically in Memory and one D1 batch", async () => {
  const store = new MemoryBlogStore();
  const assets = new MemoryBlogAssetStore();
  const source = {
    id: "11111111-1111-4111-8111-111111111111",
    postId: "source-post",
    objectKey: "posts/source-post/figure.png",
    originalName: "figure.png",
    safeName: "figure.png",
    contentType: "image/png",
    sizeBytes: 12,
    sha256: "atomic-hash",
    visibility: "draft",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
  };
  await assets.createDraftAsset(source);
  const draft = createEmptyDraft("reflections", "atomic-import", "2026-07-25", []);
  const alias = {
    sourceAssetId: source.id,
    id: "22222222-2222-4222-8222-222222222222",
    postId: draft.id,
    now: "2026-07-25T10:00:00.000Z",
  };

  await store.createDraftWithAssetAliases(draft, [alias], assets);
  assert.equal((await store.getDraft(draft.id))?.id, draft.id);
  assert.equal((await assets.getById(alias.id))?.postId, draft.id);

  const missingDraft = createEmptyDraft("reflections", "atomic-missing", "2026-07-26", []);
  const firstRolledBackAliasId = "33333333-3333-4333-8333-333333333333";
  const missingAliasId = "44444444-4444-4444-8444-444444444444";
  const sourceBeforeFailure = await assets.getById(source.id);
  await assert.rejects(
    () => store.createDraftWithAssetAliases(missingDraft, [
      { ...alias, id: firstRolledBackAliasId, postId: missingDraft.id },
      { ...alias, sourceAssetId: "missing", id: missingAliasId, postId: missingDraft.id },
    ], assets),
    /图片不存在/,
  );
  assert.equal(await store.getDraft(missingDraft.id), null);
  assert.equal(await assets.getById(firstRolledBackAliasId), null);
  assert.equal(await assets.getById(missingAliasId), null);
  assert.deepEqual(await assets.getById(source.id), sourceBeforeFailure);

  const [sourceCode, schema] = await Promise.all([
    readFile(new URL("../lib/blog/d1-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_dark_proudstar.sql", import.meta.url), "utf8"),
  ]);
  const start = sourceCode.indexOf("async createDraftWithAssetAliases(");
  const end = sourceCode.indexOf("async createDraftCopy(", start);
  const atomicSource = sourceCode.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.equal((atomicSource.match(/\.batch\(/g) ?? []).length, 1);
  assert.match(atomicSource, /INSERT INTO blog_assets/);
  assert.match(atomicSource, /last_write_token/);
  assert.match(atomicSource, /SELECT object_key FROM blog_assets/);
  assert.match(atomicSource, /mapD1WriteError/);
  assert.match(schema, /`object_key` text NOT NULL/);
});

test("D1 copy creation guards source id and version in the same atomic batch", async () => {
  const source = await readFile(new URL("../lib/blog/d1-store.ts", import.meta.url), "utf8");
  const start = source.indexOf("async createDraftCopy(");
  const end = source.indexOf("async importDraft(", start);
  const method = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.equal((method.match(/\.batch\(/g) ?? []).length, 1);
  assert.match(method, /sourceId/);
  assert.match(method, /expectedVersion/);
  assert.match(method, /EXISTS \(SELECT 1 FROM posts WHERE id=.*draft_version=/);
  assert.match(method, /INSERT INTO blog_assets/);
  assert.match(method, /VersionConflictError/);
  assert.match(method, /results\[diagnosticIndex\]/);
});

test("D1 asset publish guards references, promotes owned drafts, and commits in one batch", async () => {
  const source = await readFile(new URL("../lib/blog/d1-store.ts", import.meta.url), "utf8");
  const start = source.indexOf("async publishWithAssets(");
  const end = source.indexOf("async getPublishedBySlug(", start);
  const method = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.equal((method.match(/\.batch\(/g) ?? []).length, 1);
  assert.match(method, /INSERT INTO post_revisions[\s\S]*blog_assets/);
  assert.match(method, /UPDATE posts[\s\S]*blog_assets/);
  assert.match(method, /UPDATE blog_assets SET visibility='published'/);
  assert.match(method, /post_id=.*OR visibility='published'/);
  assert.match(method, /invalidAssetIndex/);
  assert.match(method, /AssetReferenceError/);
});

test("templates and bootstrap state satisfy the store contract", async () => {
  const store = new MemoryBlogStore();
  const template = {
    id: "template-1",
    postType: "jobs",
    title: "Offer",
    kind: "checklist",
    position: 50,
    standardKey: null,
    enabled: true,
  };

  const saved = await store.saveTemplate(template);
  saved.title = "mutated";
  assert.equal((await store.listTemplates("jobs"))[0].title, "Offer");
  await store.disableTemplate(template.id);
  assert.equal((await store.listTemplates("jobs"))[0].enabled, false);

  assert.equal(await store.hasBootstrapMarker(), false);
  await store.markBootstrapped("2026-07-24T12:00:00.000Z");
  assert.equal(await store.hasBootstrapMarker(), true);
});

test("deleting a draft removes it from draft and published listings", async () => {
  const store = new MemoryBlogStore();
  const input = createEmptyDraft("jobs", "p7", "2026-07-24", []);
  input.slug = "job-seven";
  const draft = await store.createDraft(input);
  await store.publish(draft, 0, "r4", "2026-07-24T12:00:00.000Z");

  await store.deleteDraft(draft.id);
  assert.equal(await store.getDraft(draft.id), null);
  assert.deepEqual(await store.listPublished(), []);
});
