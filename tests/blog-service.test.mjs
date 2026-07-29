import assert from "node:assert/strict";
import test from "node:test";
import { createBlogService, BlogNotFoundError, BlogValidationError } from "../lib/blog/service.ts";
import { MemoryBlogStore } from "../lib/blog/store.ts";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";

function createService(store = new MemoryBlogStore()) {
  let id = 0;
  return {
    store,
    service: createBlogService(
      store,
      () => "2026-07-24T12:00:00.000Z",
      () => `fixed-id-${++id}`,
    ),
  };
}

test("autosave validates and increments draft version without publishing", async () => {
  const { store, service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const saved = await service.saveDraft({ ...created, title: "今日感悟", slug: "2026-07-24" }, 0);

  assert.equal(saved.draftVersion, 1);
  assert.equal(await store.getPublishedBySlug("2026-07-24"), null);
  assert.equal(saved.updatedAt, "2026-07-24T12:00:00.000Z");
});

test("invalid autosaves do not mutate the stored draft", async () => {
  const { service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });

  await assert.rejects(
    () => service.saveDraft({ ...created, slug: "not-the-date" }, created.draftVersion),
    BlogValidationError,
  );
  assert.equal((await service.loadPost(created.id)).draftVersion, 0);
});

test("autosave validates the authoritative stored type before writing", async () => {
  const { service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });

  await assert.rejects(
    () => service.saveDraft({
      ...created,
      type: "papers",
      slug: "forged-paper-slug",
      metadata: {
        authors: [],
        venue: "arXiv",
        year: 2026,
        paperUrl: "https://arxiv.org/abs/1",
        readAt: "2026-07-24",
        readingMethods: [],
        readingStatus: "queued",
        topics: [],
      },
    }, created.draftVersion),
    /每日感悟的 slug/,
  );
  const stored = await service.loadPost(created.id);
  assert.equal(stored.type, "reflections");
  assert.equal(stored.slug, "2026-07-24");
  assert.equal(stored.draftVersion, 0);
});

test("createPost rejects invalid runtime type and dates without writing", async () => {
  const { service } = createService();

  await assert.rejects(
    () => service.createPost({ type: "unknown", date: "2026-07-24" }),
    BlogValidationError,
  );
  await assert.rejects(
    () => service.createPost({ type: "reflections", date: "2026-02-29" }),
    BlogValidationError,
  );
  assert.deepEqual(await service.listPosts(), []);
});

test("publish rejects invalid drafts and preserves the previous snapshot", async () => {
  const { store, service } = createService();
  const created = await service.createPost({ type: "papers", date: "2026-07-24" });

  await assert.rejects(() => service.publishPost(created.id, created.draftVersion), /标题/);
  assert.equal(await store.getPublishedBySlug(created.slug), null);
});

test("publish delegates its expected version to the store CAS", async () => {
  const { service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const saved = await service.saveDraft({ ...created, title: "今日感悟", summary: "小结" }, 0);
  const published = await service.publishPost(saved.id, saved.draftVersion);

  assert.equal(published.draftVersion, 2);
  await assert.rejects(() => service.publishPost(saved.id, saved.draftVersion), /conflict/i);
});

test("old paper drafts are migrated on read, survive autosave, and publish", async () => {
  const { store, service } = createService();
  const legacy = createEmptyDraft("papers", "legacy-paper", "2026-07-24", []);
  legacy.title = "Legacy paper";
  legacy.summary = "Summary";
  legacy.metadata = { authors: [], venue: "arXiv", year: 2026, paperUrl: "https://arxiv.org/abs/1", readAt: "2026-07-24", readingMethods: ["synthesis"], readingStatus: "completed", topics: [] };
  legacy.sections = legacy.sections.map((section) => section.title === "阅读总结" ? { ...section, standardKey: null, content: "旧文章总结" } : section);
  await store.createDraft(legacy);

  const loaded = await service.loadPost(legacy.id);
  assert.equal(loaded.sections.find((section) => section.title === "阅读总结")?.standardKey, "reading-summary");
  const saved = await service.saveDraft(loaded, loaded.draftVersion);
  const refreshed = await service.loadPost(saved.id);
  assert.equal(refreshed.sections.find((section) => section.title === "阅读总结")?.standardKey, "reading-summary");
  await assert.doesNotReject(() => service.publishPost(refreshed.id, refreshed.draftVersion));
});

test("removing the reading summary component blocks publication", async () => {
  const { service } = createService();
  const created = await service.createPost({ type: "papers", date: "2026-07-24" });
  const draft = {
    ...created,
    title: "Paper",
    summary: "Summary",
    metadata: { authors: [], venue: "arXiv", year: 2026, paperUrl: "https://arxiv.org/abs/1", readAt: "2026-07-24", readingMethods: ["synthesis"], readingStatus: "completed", topics: [] },
    sections: created.sections.filter((section) => section.title !== "阅读总结"),
  };
  const saved = await service.saveDraft(draft, created.draftVersion);
  await assert.rejects(() => service.publishPost(saved.id, saved.draftVersion), /缺少阅读总结组件/);
});

test("allows unknown wiki relations while saving but rejects them while publishing", async () => {
  const { service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const saved = await service.saveDraft({
    ...created,
    title: "带关联的感悟",
    summary: "小结",
    sections: created.sections.map((section, index) => index === 0 ? { ...section, content: "[[missing-post]]" } : section),
  }, created.draftVersion);
  assert.deepEqual(saved.related, ["missing-post"]);
  await assert.rejects(() => service.publishPost(saved.id, saved.draftVersion), /关联文章不存在：missing-post/);
});

test("post reads, deletion, import preview, and Markdown export use service errors without unintended writes", async () => {
  const { store, service } = createService();
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const preview = service.previewImport(`---\ntitle: Imported\nslug: 2026-07-25\ntype: reflections\ndate: 2026-07-25\nsummary: Preview only\ntags: []\nrelated: []\nstatus: published\n---\n\n## 反思\n\n不写入。`);

  assert.equal((await preview).draft.status, "draft");
  assert.equal((await service.listPosts()).length, 1);
  assert.match(await service.exportPost(created.id), /slug: 2026-07-24/);
  await service.deletePost(created.id);
  assert.equal((await service.listPosts()).length, 0);
  await assert.rejects(() => service.loadPost(created.id), BlogNotFoundError);
  await assert.rejects(() => service.deletePost(created.id), BlogNotFoundError);
  assert.equal(await store.getDraft(created.id), null);
});

test("saving a reusable section excludes article content and checklist data", async () => {
  const { service } = createService();
  const template = await service.saveSectionAsTemplate("internship", {
    id: "section-1",
    title: "可复用模块",
    kind: "checklist",
    content: "article-only text",
    items: ["article-only item"],
    relationSlugs: ["article-only-relation"],
    position: 90,
    templateId: null,
    standardKey: "custom",
  });

  assert.deepEqual(template, {
    id: "fixed-id-1",
    postType: "internship",
    title: "可复用模块",
    kind: "checklist",
    position: 90,
    standardKey: "custom",
    enabled: true,
  });
  await service.disableTemplate(template.id);
  assert.equal((await service.listTemplates("internship"))[0].enabled, false);
});

test("template saves reject invalid fields before mutating the store", async () => {
  const { service } = createService();

  await assert.rejects(
    () => service.saveTemplate({
      id: "",
      postType: "internship",
      title: "",
      kind: "long_text",
      position: 10,
      standardKey: null,
      enabled: true,
    }),
    BlogValidationError,
  );
  await assert.rejects(
    () => service.saveTemplate({
      id: "template-1",
      postType: "unknown",
      title: "Bad type",
      kind: "invalid-kind",
      position: -1,
      standardKey: 42,
      enabled: true,
    }),
    BlogValidationError,
  );
  await assert.rejects(
    () => service.saveSectionAsTemplate("unknown", {
      id: "section-1",
      title: "",
      kind: "invalid-kind",
      content: "must not persist",
      items: ["must not persist"],
      relationSlugs: ["must-not-persist"],
      position: Number.NaN,
      templateId: null,
      standardKey: 42,
    }),
    BlogValidationError,
  );
  await assert.rejects(
    () => service.saveTemplate({
      id: "template-enabled",
      postType: "internship",
      title: "Invalid enabled flag",
      kind: "checklist",
      position: 10,
      standardKey: null,
      enabled: "true",
    }),
    BlogValidationError,
  );
  assert.deepEqual(await service.listTemplates("internship"), []);
});
