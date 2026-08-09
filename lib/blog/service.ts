import { createEmptyDraft } from "./default-templates.ts";
import {
  exportPostMarkdown,
  importPostMarkdown,
  type ImportResult,
} from "./markdown.ts";
import { SlugConflictError, VersionConflictError, type BlogStore } from "./store.ts";
import type {
  BlogPostDraft,
  BlogSection,
  PostType,
  SectionTemplate,
} from "./types.ts";
import { validateDraft, validateForPublish } from "./validation.ts";
import { derivePostRelations, normalizeMarkdownPost } from "./markdown-sections.ts";
import { extractLocalAssetIds } from "./markdown-sections.ts";
import type { BlogAssetStore } from "./asset-store.ts";

const postTypes: readonly PostType[] = ["jobs", "internship", "papers", "reflections"];
const sectionKinds = ["long_text", "short_text", "checklist", "markdown", "relation"] as const;
const maxSlugCreateAttempts = 3;

function isPostType(value: unknown): value is PostType {
  return typeof value === "string" && postTypes.includes(value as PostType);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function validateCreatePostInput(input: { type: PostType; date: string }): string[] {
  const errors: string[] = [];
  if (!isPostType(input.type)) errors.push("文章类型无效");
  if (!isValidIsoDate(input.date)) errors.push("日期必须是有效的 YYYY-MM-DD");
  return errors;
}

function validateTemplateInput(template: SectionTemplate): string[] {
  const errors: string[] = [];
  if (typeof template.id !== "string" || !template.id.trim()) errors.push("模板 ID 不能为空");
  if (!isPostType(template.postType)) errors.push("文章类型无效");
  if (typeof template.title !== "string" || !template.title.trim()) errors.push("组件名称不能为空");
  if (!sectionKinds.includes(template.kind)) errors.push("组件类型无效");
  if (!Number.isInteger(template.position) || template.position < 0) {
    errors.push("模板位置必须是非负整数");
  }
  if (template.standardKey !== null && typeof template.standardKey !== "string") {
    errors.push("模板标准键必须是字符串或空值");
  }
  if (typeof template.enabled !== "boolean") errors.push("模板启用状态必须是布尔值");
  return errors;
}

export class BlogValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(errors.join("；"));
    this.name = "BlogValidationError";
    this.errors = [...errors];
  }
}

export class BlogNotFoundError extends Error {
  constructor() {
    super("文章不存在");
    this.name = "BlogNotFoundError";
  }
}

export interface BlogService {
  createPost(input: { type: PostType; date: string }): Promise<BlogPostDraft>;
  listPosts(): Promise<BlogPostDraft[]>;
  loadPost(id: string): Promise<BlogPostDraft>;
  saveDraft(draft: BlogPostDraft, expectedVersion: number): Promise<BlogPostDraft>;
  deletePost(id: string): Promise<void>;
  publishPost(id: string, expectedVersion: number): ReturnType<BlogStore["publish"]>;
  listTemplates(type: PostType): Promise<SectionTemplate[]>;
  saveTemplate(template: SectionTemplate): Promise<SectionTemplate>;
  saveSectionAsTemplate(postType: PostType, section: BlogSection): Promise<SectionTemplate>;
  disableTemplate(id: string): Promise<void>;
  previewImport(markdown: string): Promise<ImportResult>;
  createImportedPost(markdown: string): Promise<ImportResult>;
  exportPost(id: string): Promise<string>;
}

export function createBlogService(
  store: BlogStore,
  clock: () => string,
  ids: () => string,
  assetStore?: BlogAssetStore,
): BlogService {
  async function loadPost(id: string): Promise<BlogPostDraft> {
    const draft = await store.getDraft(id);
    if (!draft) throw new BlogNotFoundError();
    return normalizeMarkdownPost(draft);
  }

  async function nextAvailableSlug(baseSlug: string): Promise<string> {
    const draftSlugs = new Set((await store.listDrafts()).map((post) => post.slug));
    let suffix = 1;
    let candidate = baseSlug;

    while (draftSlugs.has(candidate) || await store.getPublishedBySlug(candidate)) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    return candidate;
  }

  async function prepareImport(markdown: string): Promise<ImportResult> {
    const imported = importPostMarkdown(markdown, { id: ids(), now: clock() });
    if (!imported.errors.length) {
      const baseSlug = imported.draft.type === "reflections"
        ? imported.draft.date
        : imported.draft.slug;
      imported.draft.slug = await nextAvailableSlug(baseSlug);
    }
    imported.errors = validateDraft(imported.draft);
    return imported;
  }

  async function assertImportedAssets(draft: BlogPostDraft): Promise<void> {
    if (!assetStore) return;
    const assetIds = [...new Set(draft.sections.flatMap((section) => extractLocalAssetIds(section.content)))];
    const assets = await Promise.all(assetIds.map((assetId) => assetStore.getById(assetId)));
    const invalid = assetIds.filter((_, index) => !assets[index] || assets[index]!.visibility !== "published");
    if (invalid.length) {
      throw new BlogValidationError(invalid.map((id) => `图片不存在或不属于当前文章：${id}`));
    }
  }

  return {
    async createPost(input) {
      const errors = validateCreatePostInput(input);
      if (errors.length) throw new BlogValidationError(errors);
      const templates = await store.listTemplates(input.type);
      const baseDraft = createEmptyDraft(input.type, ids(), input.date, templates);
      const now = clock();
      for (let attempt = 0; attempt < maxSlugCreateAttempts; attempt += 1) {
        const draft = normalizeMarkdownPost({
          ...baseDraft,
          slug: await nextAvailableSlug(baseDraft.slug),
          createdAt: now,
          updatedAt: now,
        });
        try {
          return await store.createDraft(draft);
        } catch (error) {
          if (!(error instanceof SlugConflictError) || attempt === maxSlugCreateAttempts - 1) throw error;
        }
      }
      throw new SlugConflictError();
    },

    async listPosts() {
      return (await store.listDrafts()).map(normalizeMarkdownPost);
    },

    loadPost,

    async saveDraft(draft, expectedVersion) {
      const stored = await loadPost(draft.id);
      const canonical = normalizeMarkdownPost({
        ...draft,
        id: stored.id,
        type: stored.type,
        status: stored.status,
        publishedRevisionId: stored.publishedRevisionId,
        createdAt: stored.createdAt,
        updatedAt: clock(),
      });
      const errors = validateDraft(canonical);
      if (errors.length) throw new BlogValidationError(errors);
      return store.saveDraft(canonical, expectedVersion);
    },

    async deletePost(id) {
      await loadPost(id);
      await store.deleteDraft(id);
    },

    async publishPost(id, expectedVersion) {
      const draft = normalizeMarkdownPost(await loadPost(id));
      if (draft.draftVersion !== expectedVersion) throw new VersionConflictError();
      const knownSlugs = new Set((await store.listDrafts()).map((post) => post.slug));
      const missingRelations = derivePostRelations(draft).filter((slug) => !knownSlugs.has(slug));
      if (missingRelations.length) {
        throw new BlogValidationError(missingRelations.map((slug) => `关联文章不存在：${slug}`));
      }
      const errors = validateForPublish(draft);
      if (errors.length) throw new BlogValidationError(errors);
      const assetIds = [...new Set(draft.sections.flatMap((section) => extractLocalAssetIds(section.content)))];
      let ownedDraftAssetIds: string[] = [];
      if (assetStore) {
        const assets = await Promise.all(assetIds.map((assetId) => assetStore.getById(assetId)));
        const invalid = assetIds.filter((_, index) => {
          const asset = assets[index];
          return !asset || (asset.postId !== draft.id && asset.visibility !== "published");
        });
        if (invalid.length) {
          throw new BlogValidationError(invalid.map((id) => `图片不存在或不属于当前文章：${id}`));
        }
        ownedDraftAssetIds = assetIds.filter((_, index) => {
          const asset = assets[index];
          return asset?.postId === draft.id && asset.visibility === "draft";
        });
      }
      const publishedAt = clock();
      const snapshot = await store.publish(draft, expectedVersion, ids(), publishedAt);
      if (assetStore) await assetStore.markPublished(draft.id, ownedDraftAssetIds, publishedAt);
      return snapshot;
    },

    listTemplates(type) {
      return store.listTemplates(type);
    },

    async saveTemplate(template) {
      const errors = validateTemplateInput(template);
      if (errors.length) throw new BlogValidationError(errors);
      return store.saveTemplate(template);
    },

    async saveSectionAsTemplate(postType, section) {
      const template = {
        id: ids(),
        postType,
        title: section.title,
        kind: "markdown" as const,
        position: section.position,
        standardKey: section.standardKey,
        enabled: true,
      };
      const errors = validateTemplateInput(template);
      if (errors.length) throw new BlogValidationError(errors);
      return store.saveTemplate(template);
    },

    disableTemplate(id) {
      return store.disableTemplate(id);
    },

    async previewImport(markdown) {
      return prepareImport(markdown);
    },

    async createImportedPost(markdown) {
      for (let attempt = 0; attempt < maxSlugCreateAttempts; attempt += 1) {
        const imported = await prepareImport(markdown);
        if (imported.errors.length) return imported;
        await assertImportedAssets(imported.draft);
        try {
          imported.draft = await store.createDraft(normalizeMarkdownPost(imported.draft));
          return imported;
        } catch (error) {
          if (!(error instanceof SlugConflictError) || attempt === maxSlugCreateAttempts - 1) throw error;
        }
      }
      throw new SlugConflictError();
    },

    async exportPost(id) {
      return exportPostMarkdown(await loadPost(id));
    },
  };
}
