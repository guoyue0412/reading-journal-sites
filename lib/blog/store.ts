import type {
  BlogPostDraft,
  PostType,
  PublishedSnapshot,
  SectionTemplate,
} from "./types.ts";

export class VersionConflictError extends Error {
  constructor() {
    super("Draft version conflict");
    this.name = "VersionConflictError";
  }
}

export class SlugConflictError extends Error {
  constructor() {
    super("Slug already exists");
    this.name = "SlugConflictError";
  }
}

export interface BlogStore {
  listDrafts(): Promise<BlogPostDraft[]>;
  getDraft(id: string): Promise<BlogPostDraft | null>;
  createDraft(draft: BlogPostDraft): Promise<BlogPostDraft>;
  importDraft(draft: BlogPostDraft): Promise<BlogPostDraft>;
  saveDraft(draft: BlogPostDraft, expectedVersion: number): Promise<BlogPostDraft>;
  deleteDraft(id: string): Promise<void>;
  publish(
    draft: BlogPostDraft,
    expectedVersion: number,
    revisionId: string,
    publishedAt: string,
  ): Promise<PublishedSnapshot>;
  getPublishedBySlug(slug: string): Promise<PublishedSnapshot | null>;
  listPublished(): Promise<PublishedSnapshot[]>;
  listTemplates(type: PostType): Promise<SectionTemplate[]>;
  saveTemplate(template: SectionTemplate): Promise<SectionTemplate>;
  disableTemplate(id: string): Promise<void>;
  hasBootstrapMarker(): Promise<boolean>;
  markBootstrapped(now: string): Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function compareDrafts(left: BlogPostDraft, right: BlogPostDraft): number {
  return right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt);
}

export class MemoryBlogStore implements BlogStore {
  readonly #drafts = new Map<string, BlogPostDraft>();
  readonly #revisions = new Map<string, PublishedSnapshot>();
  readonly #publishedSlugs = new Map<string, string>();
  readonly #templates = new Map<string, SectionTemplate>();
  #bootstrappedAt: string | null = null;

  async listDrafts(): Promise<BlogPostDraft[]> {
    return [...this.#drafts.values()].sort(compareDrafts).map(clone);
  }

  async getDraft(id: string): Promise<BlogPostDraft | null> {
    const draft = this.#drafts.get(id);
    return draft ? clone(draft) : null;
  }

  async createDraft(draft: BlogPostDraft): Promise<BlogPostDraft> {
    this.#assertSlugAvailable(draft.slug, draft.id);
    if (this.#drafts.has(draft.id)) {
      throw new Error(`Draft already exists: ${draft.id}`);
    }
    const stored = clone(draft);
    this.#drafts.set(stored.id, stored);
    return clone(stored);
  }

  async importDraft(draft: BlogPostDraft): Promise<BlogPostDraft> {
    const existing = [...this.#drafts.values()].find((post) => post.slug === draft.slug);
    return existing ? clone(existing) : this.createDraft(draft);
  }

  async saveDraft(draft: BlogPostDraft, expectedVersion: number): Promise<BlogPostDraft> {
    const current = this.#drafts.get(draft.id);
    if (!current || current.draftVersion !== expectedVersion) {
      throw new VersionConflictError();
    }
    this.#assertSlugAvailable(draft.slug, draft.id);

    const stored = clone({
      ...draft,
      type: current.type,
      status: current.status,
      draftVersion: expectedVersion + 1,
      publishedRevisionId: current.publishedRevisionId,
      createdAt: current.createdAt,
    });
    this.#drafts.set(stored.id, stored);
    return clone(stored);
  }

  async deleteDraft(id: string): Promise<void> {
    this.#drafts.delete(id);
    this.#publishedSlugs.delete(id);
    for (const [revisionId, revision] of this.#revisions) {
      if (revision.id === id) {
        this.#revisions.delete(revisionId);
      }
    }
  }

  async publish(
    draft: BlogPostDraft,
    expectedVersion: number,
    revisionId: string,
    publishedAt: string,
  ): Promise<PublishedSnapshot> {
    const current = this.#drafts.get(draft.id);
    if (!current || current.draftVersion !== expectedVersion) {
      throw new VersionConflictError();
    }
    this.#assertSlugAvailable(draft.slug, draft.id);
    if (this.#revisions.has(revisionId)) {
      throw new Error(`Revision already exists: ${revisionId}`);
    }

    const nextVersion = expectedVersion + 1;
    const snapshot = clone({
      ...draft,
      status: "published" as const,
      draftVersion: nextVersion,
      publishedRevisionId: revisionId,
      createdAt: current.createdAt,
      revisionId,
      publishedAt,
    });
    this.#revisions.set(revisionId, snapshot);
    this.#publishedSlugs.set(current.id, snapshot.slug);
    this.#drafts.set(current.id, clone({
      ...current,
      status: "published",
      draftVersion: nextVersion,
      publishedRevisionId: revisionId,
    }));
    return clone(snapshot);
  }

  async getPublishedBySlug(slug: string): Promise<PublishedSnapshot | null> {
    for (const [draftId, publishedSlug] of this.#publishedSlugs) {
      if (publishedSlug !== slug) {
        continue;
      }
      const draft = this.#drafts.get(draftId);
      if (!draft?.publishedRevisionId) {
        continue;
      }
      const snapshot = this.#revisions.get(draft.publishedRevisionId);
      if (snapshot) {
        return clone(snapshot);
      }
    }
    return null;
  }

  async listPublished(): Promise<PublishedSnapshot[]> {
    return [...this.#drafts.values()]
      .filter((draft) => draft.publishedRevisionId !== null)
      .flatMap((draft) => {
        const snapshot = this.#revisions.get(draft.publishedRevisionId!);
        return snapshot ? [clone(snapshot)] : [];
      })
      .sort(compareDrafts);
  }

  async listTemplates(type: PostType): Promise<SectionTemplate[]> {
    return [...this.#templates.values()]
      .filter((template) => template.postType === type)
      .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      .map(clone);
  }

  async saveTemplate(template: SectionTemplate): Promise<SectionTemplate> {
    const stored = clone(template);
    this.#templates.set(stored.id, stored);
    return clone(stored);
  }

  async disableTemplate(id: string): Promise<void> {
    const template = this.#templates.get(id);
    if (template) {
      this.#templates.set(id, clone({ ...template, enabled: false }));
    }
  }

  async hasBootstrapMarker(): Promise<boolean> {
    return this.#bootstrappedAt !== null;
  }

  async markBootstrapped(now: string): Promise<void> {
    this.#bootstrappedAt = now;
  }

  #assertSlugAvailable(slug: string, draftId: string): void {
    const conflictsWithDraft = [...this.#drafts.values()]
      .some((draft) => draft.slug === slug && draft.id !== draftId);
    const conflictsWithPublished = [...this.#publishedSlugs]
      .some(([postId, publishedSlug]) => publishedSlug === slug && postId !== draftId);
    if (conflictsWithDraft || conflictsWithPublished) {
      throw new SlugConflictError();
    }
  }
}
