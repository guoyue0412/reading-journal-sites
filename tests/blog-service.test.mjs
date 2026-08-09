import assert from "node:assert/strict";
import test from "node:test";
import { createBlogService, BlogNotFoundError, BlogValidationError } from "../lib/blog/service.ts";
import { MemoryBlogStore, SlugConflictError } from "../lib/blog/store.ts";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";
import { validateDraft } from "../lib/blog/validation.ts";
import { MemoryBlogAssetStore } from "../lib/blog/asset-store.ts";

function createService(store = new MemoryBlogStore(), assetStore) {
  let id = 0;
  return {
    store,
    service: createBlogService(
      store,
      () => "2026-07-24T12:00:00.000Z",
      () => `fixed-id-${++id}`,
      assetStore,
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

test("createPost gives repeated same-day article types distinct addresses", async () => {
  const { service } = createService();

  const first = await service.createPost({ type: "internship", date: "2026-07-24" });
  const second = await service.createPost({ type: "internship", date: "2026-07-24" });

  assert.equal(first.slug, "internship-2026-07-24");
  assert.equal(second.slug, "internship-2026-07-24-2");
});

test("ordinary post creation retries a slug race with a complete draft", async () => {
  class OneShotCreateRaceStore extends MemoryBlogStore {
    raceNextCreate = true;
    async createDraft(draft) {
      if (this.raceNextCreate) {
        this.raceNextCreate = false;
        await super.createDraft({
          ...draft,
          id: "ordinary-racer",
          title: "Ordinary racer",
          sections: draft.sections.map((section, index) => ({ ...section, id: `ordinary-racer-section-${index}` })),
        });
        throw new SlugConflictError();
      }
      return super.createDraft(draft);
    }
  }
  const { service } = createService(new OneShotCreateRaceStore());

  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });

  assert.equal(created.slug, "2026-07-24-2");
  assert.equal(created.type, "reflections");
  assert.ok(created.sections.length > 0);
  assert.equal((await service.listPosts()).length, 2);
});

test("ordinary post creation bounds repeated slug retries", async () => {
  class PersistentCreateRaceStore extends MemoryBlogStore {
    createAttempts = 0;
    async createDraft() {
      this.createAttempts += 1;
      throw new SlugConflictError();
    }
  }
  const store = new PersistentCreateRaceStore();
  const { service } = createService(store);

  await assert.rejects(
    () => service.createPost({ type: "reflections", date: "2026-07-24" }),
    SlugConflictError,
  );
  assert.equal(store.createAttempts, 3);
  assert.deepEqual(await service.listPosts(), []);
});

test("same-day reflection imports reserve a distinct slug without changing their date or content", async () => {
  const { service } = createService();
  await service.createPost({ type: "reflections", date: "2026-07-24" });

  const preview = await service.previewImport(`---
title: Imported reflection
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: Imported without changing its journal date
tags: [import]
related: []
status: draft
---

## 反思

原样保留的导入内容。`);
  const created = await service.createPost({ type: "reflections", date: preview.draft.date });
  const saved = await service.saveDraft({
    ...preview.draft,
    id: created.id,
    draftVersion: created.draftVersion,
    createdAt: created.createdAt,
    sections: preview.draft.sections.map((section, index) => ({ ...section, id: `imported-section-${index}` })),
  }, created.draftVersion);

  assert.deepEqual(preview.errors, []);
  assert.equal(preview.draft.date, "2026-07-24");
  assert.equal(preview.draft.slug, "2026-07-24-2");
  assert.equal(created.slug, "2026-07-24-2");
  assert.equal(saved.slug, "2026-07-24-2");
  assert.match(saved.sections[0].content, /原样保留的导入内容/);
});

test("re-importing a versioned reflection allocates from its date and revalidates the final draft", async () => {
  const { service } = createService();
  await service.createPost({ type: "reflections", date: "2026-07-24" });
  await service.createPost({ type: "reflections", date: "2026-07-24" });

  const preview = await service.previewImport(`---
title: Imported reflection again
slug: 2026-07-24-2
type: reflections
date: 2026-07-24
summary: Re-import the versioned reflection
tags: [import]
related: []
status: draft
---

## 反思

仍然保留原始日期。`);

  assert.equal(preview.draft.date, "2026-07-24");
  assert.equal(preview.draft.slug, "2026-07-24-3");
  assert.deepEqual(preview.errors, validateDraft(preview.draft));
});

test("committing an import reallocates after a preview racer and never creates an empty placeholder", async () => {
  const { service } = createService();
  await service.createPost({ type: "reflections", date: "2026-07-24" });
  const markdown = `---
title: Imported after racer
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: Full imported content
tags: [import, latex]
related: [known-note]
status: draft
---

## 反思

竞态后仍然完整，行内公式 $E=mc^2$。

## 自定义模块

块级公式：

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$`;

  const preview = await service.previewImport(markdown);
  assert.equal(preview.draft.slug, "2026-07-24-2");
  const racer = await service.createPost({ type: "reflections", date: "2026-07-24" });
  assert.equal(racer.slug, "2026-07-24-2");

  const committed = await service.createImportedPost(markdown);
  const posts = await service.listPosts();

  assert.deepEqual(committed.errors, []);
  assert.equal(committed.draft.slug, "2026-07-24-3");
  assert.equal(committed.draft.title, "Imported after racer");
  assert.equal(committed.draft.date, "2026-07-24");
  assert.equal(committed.draft.summary, "Full imported content");
  assert.deepEqual(committed.draft.tags, ["import", "latex"]);
  assert.deepEqual(committed.draft.related, ["known-note"]);
  assert.equal(committed.draft.sections.length, 2);
  assert.match(committed.draft.sections[0].content, /竞态后仍然完整，行内公式 \$E=mc\^2\$。/);
  assert.match(committed.draft.sections[1].content, /\\int_0\^1 x\^2 dx = \\frac\{1\}\{3\}/);
  assert.equal(posts.length, 3);
  assert.equal(posts.filter((post) => post.title === "Imported after racer").length, 1);
});

test("committing an import retries one slug race and stores the complete draft at the next address", async () => {
  class OneShotRaceStore extends MemoryBlogStore {
    raceNextImport = false;
    async createDraft(draft) {
      if (this.raceNextImport && draft.title === "Imported with atomic race") {
        this.raceNextImport = false;
        const racer = {
          ...createEmptyDraft("reflections", "atomic-racer", draft.date, []),
          slug: draft.slug,
          title: "Atomic racer",
          sections: draft.sections.map((section, index) => ({ ...section, id: `atomic-racer-section-${index}` })),
        };
        await super.createDraft(racer);
        throw new SlugConflictError();
      }
      return super.createDraft(draft);
    }
  }
  const store = new OneShotRaceStore();
  const { service } = createService(store);
  await service.createPost({ type: "reflections", date: "2026-07-24" });
  store.raceNextImport = true;

  const committed = await service.createImportedPost(`---
title: Imported with atomic race
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: Retry the atomic allocation
tags: [import]
related: []
status: draft
---

## 反思

重试后完整保存。`);

  assert.deepEqual(committed.errors, []);
  assert.equal(committed.draft.slug, "2026-07-24-3");
  assert.match(committed.draft.sections[0].content, /重试后完整保存/);
  assert.equal((await service.listPosts()).length, 3);
});

test("committing an import bounds repeated slug retries without storing a placeholder", async () => {
  class PersistentRaceStore extends MemoryBlogStore {
    importAttempts = 0;
    async createDraft(draft) {
      if (draft.title === "Never committed") {
        this.importAttempts += 1;
        throw new SlugConflictError();
      }
      return super.createDraft(draft);
    }
  }
  const store = new PersistentRaceStore();
  const { service } = createService(store);
  await service.createPost({ type: "reflections", date: "2026-07-24" });

  await assert.rejects(() => service.createImportedPost(`---
title: Never committed
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: Bound retries
tags: [import]
related: []
status: draft
---

## 反思

不应留下空草稿。`), SlugConflictError);

  assert.equal(store.importAttempts, 3);
  assert.equal((await service.listPosts()).length, 1);
});

test("publishing promotes an owned draft asset", async () => {
  const assets = new MemoryBlogAssetStore();
  const { service } = createService(new MemoryBlogStore(), assets);
  const created = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const asset = {
    id: "11111111-1111-4111-8111-111111111111", postId: created.id, objectKey: `posts/${created.id}/figure.png`,
    originalName: "figure.png", safeName: "figure.png", contentType: "image/png", sizeBytes: 12, sha256: "own-hash",
    visibility: "draft", createdAt: "2026-07-24T10:00:00.000Z", updatedAt: "2026-07-24T10:00:00.000Z",
  };
  await assets.createDraftAsset(asset);
  const saved = await service.saveDraft({
    ...created,
    title: "Original with image",
    summary: "Own asset",
    sections: created.sections.map((section, index) => index === 0 ? { ...section, content: `![figure](/media/${asset.id}/figure.png)` } : section),
  }, created.draftVersion);

  await service.publishPost(saved.id, saved.draftVersion);
  assert.equal((await assets.getById(asset.id))?.visibility, "published");
});

test("an exported published asset remains immutable and can be shared by an imported post", async () => {
  const assets = new MemoryBlogAssetStore();
  const { service } = createService(new MemoryBlogStore(), assets);
  const original = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const asset = {
    id: "22222222-2222-4222-8222-222222222222", postId: original.id, objectKey: `posts/${original.id}/figure.png`,
    originalName: "figure.png", safeName: "figure.png", contentType: "image/png", sizeBytes: 12, sha256: "published-hash",
    visibility: "draft", createdAt: "2026-07-24T10:00:00.000Z", updatedAt: "2026-07-24T10:00:00.000Z",
  };
  await assets.createDraftAsset(asset);
  const originalSaved = await service.saveDraft({
    ...original,
    title: "Published source",
    summary: "Exported with image",
    sections: original.sections.map((section, index) => index === 0 ? { ...section, content: `![figure](/media/${asset.id}/figure.png)` } : section),
  }, original.draftVersion);
  await service.publishPost(originalSaved.id, originalSaved.draftVersion);
  const publishedAsset = await assets.getById(asset.id);

  const imported = await service.createImportedPost(await service.exportPost(originalSaved.id));
  assert.notEqual(imported.draft.id, originalSaved.id);
  assert.match(imported.draft.sections[0].content, new RegExp(asset.id));
  await service.publishPost(imported.draft.id, imported.draft.draftVersion);

  assert.deepEqual(await assets.getById(asset.id), publishedAsset);
  assert.equal((await assets.getById(asset.id))?.postId, originalSaved.id);
  assert.equal((await assets.getById(asset.id))?.objectKey, `posts/${original.id}/figure.png`);

  await service.deletePost(originalSaved.id);
  assert.deepEqual(await assets.getById(asset.id), publishedAsset);
});

test("an import rejects another draft's private asset before creating a draft", async () => {
  const assets = new MemoryBlogAssetStore();
  const { service } = createService(new MemoryBlogStore(), assets);
  const original = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const asset = {
    id: "33333333-3333-4333-8333-333333333333", postId: original.id, objectKey: `posts/${original.id}/private.png`,
    originalName: "private.png", safeName: "private.png", contentType: "image/png", sizeBytes: 12, sha256: "draft-hash",
    visibility: "draft", createdAt: "2026-07-24T10:00:00.000Z", updatedAt: "2026-07-24T10:00:00.000Z",
  };
  await assets.createDraftAsset(asset);
  const originalSaved = await service.saveDraft({
    ...original,
    title: "Private source",
    summary: "Draft image",
    sections: original.sections.map((section, index) => index === 0 ? { ...section, content: `![private](/media/${asset.id}/private.png)` } : section),
  }, original.draftVersion);
  await assert.rejects(
    async () => service.createImportedPost(await service.exportPost(originalSaved.id)),
    /图片不存在或不属于当前文章/,
  );
  assert.equal((await assets.getById(asset.id))?.visibility, "draft");
  assert.equal((await assets.getById(asset.id))?.postId, originalSaved.id);
  assert.equal((await service.listPosts()).length, 1);
});

test("an import rejects missing asset references before creating a draft", async () => {
  const assets = new MemoryBlogAssetStore();
  const { service } = createService(new MemoryBlogStore(), assets);
  const markdown = `---
title: Missing image
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: Missing asset must not persist
tags: []
related: []
status: draft
---

## 反思

![missing](/media/44444444-4444-4444-8444-444444444444/missing.png)`;

  await assert.rejects(() => service.createImportedPost(markdown), /图片不存在或不属于当前文章/);
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
    kind: "markdown",
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
    kind: "markdown",
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
