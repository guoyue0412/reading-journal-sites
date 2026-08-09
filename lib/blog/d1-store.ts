import { env } from "cloudflare:workers";
import type {
  BlogPostDraft,
  BlogSection,
  PostMetadata,
  PostStatus,
  PostType,
  PublishedSnapshot,
  SectionKind,
  SectionTemplate,
} from "./types.ts";
import {
  SlugConflictError,
  VersionConflictError,
  type BlogStore,
} from "./store.ts";
import { mapD1WriteError } from "./d1-errors.ts";
import type { BlogAssetStore, DraftAssetAliasInput } from "./asset-store.ts";

const BOOTSTRAP_MARKER = "blog_bootstrapped";

interface D1ResultLike<T = unknown> {
  results: T[];
  meta: { changes: number };
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  run<T = unknown>(): Promise<D1ResultLike<T>>;
  all<T = unknown>(): Promise<D1ResultLike<T>>;
  first<T = unknown>(): Promise<T | null>;
}

interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1ResultLike<T>[]>;
}

interface PostRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  date: string;
  summary: string;
  tags_json: string;
  related_json: string;
  metadata_json: string;
  status: string;
  draft_version: number;
  published_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SectionRow {
  id: string;
  post_id: string;
  kind: string;
  title: string;
  content: string;
  items_json: string;
  relation_slugs_json: string;
  position: number;
  template_id: string | null;
  standard_key: string | null;
}

interface TemplateRow {
  id: string;
  post_type: string;
  title: string;
  kind: string;
  position: number;
  standard_key: string | null;
  enabled: number;
}

interface SaveDiagnosticRow {
  draft_version: number;
  slug_reserved: number;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function resultRows<T>(result: { results?: unknown[] }): T[] {
  return (result.results ?? []) as T[];
}

function rowToSection(row: SectionRow): BlogSection {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as SectionKind,
    content: row.content,
    items: parseJson<string[]>(row.items_json),
    relationSlugs: parseJson<string[]>(row.relation_slugs_json),
    position: row.position,
    templateId: row.template_id,
    standardKey: row.standard_key,
  };
}

function rowToDraft(row: PostRow, sections: BlogSection[]): BlogPostDraft {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type as PostType,
    title: row.title,
    date: row.date,
    summary: row.summary,
    tags: parseJson<string[]>(row.tags_json),
    related: parseJson<string[]>(row.related_json),
    status: row.status as PostStatus,
    metadata: parseJson<PostMetadata>(row.metadata_json),
    sections,
    draftVersion: row.draft_version,
    publishedRevisionId: row.published_revision_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTemplate(row: TemplateRow): SectionTemplate {
  return {
    id: row.id,
    postType: row.post_type as PostType,
    title: row.title,
    kind: row.kind as SectionKind,
    position: row.position,
    standardKey: row.standard_key,
    enabled: Boolean(row.enabled),
  };
}

function sectionInsert(
  d1: D1DatabaseLike,
  section: BlogSection,
  postId: string,
  writeToken: string,
): D1PreparedStatementLike {
  return d1.prepare(
    "INSERT INTO post_sections (id, post_id, kind, title, content, items_json, relation_slugs_json, position, template_id, standard_key) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND last_write_token=?11)",
  ).bind(
    section.id,
    postId,
    section.kind,
    section.title,
    section.content,
    JSON.stringify(section.items),
    JSON.stringify(section.relationSlugs),
    section.position,
    section.templateId,
    section.standardKey,
    writeToken,
  );
}

function relationInsert(
  d1: D1DatabaseLike,
  postId: string,
  targetSlug: string,
  index: number,
  writeToken: string,
): D1PreparedStatementLike {
  return d1.prepare(
    "INSERT INTO post_relations (id, source_post_id, target_slug, relation_type) SELECT ?1, ?2, ?3, 'related' WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND last_write_token=?4)",
  ).bind(`${postId}:related:${index}`, postId, targetSlug, writeToken);
}

export class D1BlogStore implements BlogStore {
  async listDrafts(): Promise<BlogPostDraft[]> {
    const d1 = this.#database();
    const results = await d1.batch([
      d1.prepare("SELECT id, slug, type, title, date, summary, tags_json, related_json, metadata_json, status, draft_version, published_revision_id, created_at, updated_at FROM posts ORDER BY date DESC, created_at DESC"),
      d1.prepare("SELECT id, post_id, kind, title, content, items_json, relation_slugs_json, position, template_id, standard_key FROM post_sections ORDER BY post_id, position"),
    ]);
    return this.#combineRows(resultRows<PostRow>(results[0]), resultRows<SectionRow>(results[1]));
  }

  async getDraft(id: string): Promise<BlogPostDraft | null> {
    const d1 = this.#database();
    const results = await d1.batch([
      d1.prepare("SELECT id, slug, type, title, date, summary, tags_json, related_json, metadata_json, status, draft_version, published_revision_id, created_at, updated_at FROM posts WHERE id=?1").bind(id),
      d1.prepare("SELECT id, post_id, kind, title, content, items_json, relation_slugs_json, position, template_id, standard_key FROM post_sections WHERE post_id=?1 ORDER BY position").bind(id),
    ]);
    const posts = resultRows<PostRow>(results[0]);
    if (!posts[0]) {
      return null;
    }
    return rowToDraft(posts[0], resultRows<SectionRow>(results[1]).map(rowToSection));
  }

  async createDraft(draft: BlogPostDraft): Promise<BlogPostDraft> {
    const d1 = this.#database();
    const writeToken = crypto.randomUUID();
    const statements = [
      d1.prepare(
        "INSERT INTO posts (id, slug, type, title, date, summary, tags_json, related_json, metadata_json, status, draft_version, published_revision_id, published_slug, last_write_token, created_at, updated_at) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL, ?13, ?14, ?15 WHERE NOT EXISTS (SELECT 1 FROM posts WHERE published_slug=?2)",
      ).bind(
        draft.id,
        draft.slug,
        draft.type,
        draft.title,
        draft.date,
        draft.summary,
        JSON.stringify(draft.tags),
        JSON.stringify(draft.related),
        JSON.stringify(draft.metadata),
        draft.status,
        draft.draftVersion,
        draft.publishedRevisionId,
        writeToken,
        draft.createdAt,
        draft.updatedAt,
      ),
      ...draft.sections.map((section) => sectionInsert(d1, section, draft.id, writeToken)),
      ...draft.related.map((targetSlug, index) => relationInsert(
        d1,
        draft.id,
        targetSlug,
        index,
        writeToken,
      )),
    ];

    let results: D1ResultLike[];
    try {
      results = await d1.batch(statements);
    } catch (error) {
      throw mapD1WriteError(error);
    }
    if (results[0].meta.changes !== 1) {
      throw new SlugConflictError();
    }
    return structuredClone(draft);
  }

  async createDraftWithAssetAliases(
    draft: BlogPostDraft,
    aliases: readonly DraftAssetAliasInput[],
    assetStore: BlogAssetStore,
  ): Promise<BlogPostDraft> {
    void assetStore;
    if (aliases.some((alias) => alias.postId !== draft.id)) {
      throw new Error("图片别名所属文章不一致");
    }
    const d1 = this.#database();
    const writeToken = crypto.randomUUID();
    const statements = [
      d1.prepare(
        "INSERT INTO posts (id, slug, type, title, date, summary, tags_json, related_json, metadata_json, status, draft_version, published_revision_id, published_slug, last_write_token, created_at, updated_at) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL, ?13, ?14, ?15 WHERE NOT EXISTS (SELECT 1 FROM posts WHERE published_slug=?2)",
      ).bind(
        draft.id,
        draft.slug,
        draft.type,
        draft.title,
        draft.date,
        draft.summary,
        JSON.stringify(draft.tags),
        JSON.stringify(draft.related),
        JSON.stringify(draft.metadata),
        draft.status,
        draft.draftVersion,
        draft.publishedRevisionId,
        writeToken,
        draft.createdAt,
        draft.updatedAt,
      ),
      ...draft.sections.map((section) => sectionInsert(d1, section, draft.id, writeToken)),
      ...draft.related.map((targetSlug, index) => relationInsert(
        d1,
        draft.id,
        targetSlug,
        index,
        writeToken,
      )),
      ...aliases.map((alias) => d1.prepare(
        "INSERT INTO blog_assets (id, post_id, object_key, original_name, safe_name, content_type, size_bytes, sha256, visibility, created_at, updated_at) SELECT ?1, ?2, (SELECT object_key FROM blog_assets WHERE id=?4), (SELECT original_name FROM blog_assets WHERE id=?4), (SELECT safe_name FROM blog_assets WHERE id=?4), (SELECT content_type FROM blog_assets WHERE id=?4), (SELECT size_bytes FROM blog_assets WHERE id=?4), (SELECT sha256 FROM blog_assets WHERE id=?4), 'draft', ?3, ?3 WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND last_write_token=?5)",
      ).bind(alias.id, alias.postId, alias.now, alias.sourceAssetId, writeToken)),
    ];

    let results: D1ResultLike[];
    try {
      results = await d1.batch(statements);
    } catch (error) {
      throw mapD1WriteError(error);
    }
    if (results[0].meta.changes !== 1) {
      throw new SlugConflictError();
    }
    return structuredClone(draft);
  }

  async importDraft(draft: BlogPostDraft): Promise<BlogPostDraft> {
    const existing = (await this.listDrafts()).find((post) => post.slug === draft.slug);
    if (existing) return existing;
    return this.createDraft(draft);
  }

  async saveDraft(draft: BlogPostDraft, expectedVersion: number): Promise<BlogPostDraft> {
    const nextVersion = expectedVersion + 1;
    const writeToken = crypto.randomUUID();
    const d1 = this.#database();
    const statements = [
      d1.prepare(
        "UPDATE posts SET slug=?1, title=?2, summary=?3, date=?4, tags_json=?5, related_json=?6, metadata_json=?7, draft_version=?8, updated_at=?9, last_write_token=?10 WHERE id=?11 AND draft_version=?12 AND NOT EXISTS (SELECT 1 FROM posts AS reserved WHERE reserved.published_slug=?1 AND reserved.id<>?11)",
      ).bind(
        draft.slug,
        draft.title,
        draft.summary,
        draft.date,
        JSON.stringify(draft.tags),
        JSON.stringify(draft.related),
        JSON.stringify(draft.metadata),
        nextVersion,
        draft.updatedAt,
        writeToken,
        draft.id,
        expectedVersion,
      ),
      d1.prepare(
        "DELETE FROM post_sections WHERE post_id=?1 AND EXISTS (SELECT 1 FROM posts WHERE id=?1 AND last_write_token=?2)",
      ).bind(draft.id, writeToken),
      ...draft.sections.map((section) => d1.prepare(
        "INSERT INTO post_sections (id, post_id, kind, title, content, items_json, relation_slugs_json, position, template_id, standard_key) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10 WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND last_write_token=?11)",
      ).bind(
        section.id,
        draft.id,
        section.kind,
        section.title,
        section.content,
        JSON.stringify(section.items),
        JSON.stringify(section.relationSlugs),
        section.position,
        section.templateId,
        section.standardKey,
        writeToken,
      )),
      d1.prepare(
        "DELETE FROM post_relations WHERE source_post_id=?1 AND EXISTS (SELECT 1 FROM posts WHERE id=?1 AND last_write_token=?2)",
      ).bind(draft.id, writeToken),
      ...draft.related.map((targetSlug, index) => d1.prepare(
        "INSERT INTO post_relations (id, source_post_id, target_slug, relation_type) SELECT ?1, ?2, ?3, 'related' WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND last_write_token=?4)",
      ).bind(`${draft.id}:related:${index}`, draft.id, targetSlug, writeToken)),
    ];

    const diagnosticIndex = statements.length;
    statements.push(d1.prepare(
      "SELECT draft_version, EXISTS (SELECT 1 FROM posts AS reserved WHERE reserved.published_slug=?2 AND reserved.id<>?1) AS slug_reserved FROM posts WHERE id=?1",
    ).bind(draft.id, draft.slug));
    const canonicalPostIndex = statements.length;
    statements.push(d1.prepare(
      "SELECT id, slug, type, title, date, summary, tags_json, related_json, metadata_json, status, draft_version, published_revision_id, created_at, updated_at FROM posts WHERE id=?1 AND last_write_token=?2",
    ).bind(draft.id, writeToken));
    const canonicalSectionsIndex = statements.length;
    statements.push(d1.prepare(
      "SELECT id, post_id, kind, title, content, items_json, relation_slugs_json, position, template_id, standard_key FROM post_sections WHERE post_id=?1 AND EXISTS (SELECT 1 FROM posts WHERE id=?1 AND last_write_token=?2) ORDER BY position",
    ).bind(draft.id, writeToken));

    let results: D1ResultLike[];
    try {
      results = await d1.batch(statements);
    } catch (error) {
      throw mapD1WriteError(error);
    }
    if (results[0].meta.changes !== 1) {
      const diagnostic = resultRows<SaveDiagnosticRow>(results[diagnosticIndex])[0];
      if (diagnostic?.draft_version === expectedVersion && diagnostic.slug_reserved) {
        throw new SlugConflictError();
      }
      throw new VersionConflictError();
    }
    const canonicalPost = resultRows<PostRow>(results[canonicalPostIndex])[0];
    if (!canonicalPost) {
      throw new Error(`Canonical draft missing after save: ${draft.id}`);
    }
    const canonicalSections = resultRows<SectionRow>(results[canonicalSectionsIndex]).map(rowToSection);
    return rowToDraft(canonicalPost, canonicalSections);
  }

  async deleteDraft(id: string): Promise<void> {
    const d1 = this.#database();
    await d1.batch([
      d1.prepare("DELETE FROM post_relations WHERE source_post_id=?1").bind(id),
      d1.prepare("DELETE FROM post_sections WHERE post_id=?1").bind(id),
      d1.prepare("DELETE FROM post_revisions WHERE post_id=?1").bind(id),
      d1.prepare("DELETE FROM posts WHERE id=?1").bind(id),
    ]);
  }

  async publish(
    draft: BlogPostDraft,
    expectedVersion: number,
    revisionId: string,
    publishedAt: string,
  ): Promise<PublishedSnapshot> {
    const nextVersion = expectedVersion + 1;
    const snapshot: PublishedSnapshot = structuredClone({
      ...draft,
      status: "published" as const,
      draftVersion: nextVersion,
      publishedRevisionId: revisionId,
      revisionId,
      publishedAt,
    });
    const d1 = this.#database();
    const results = await d1.batch([
      d1.prepare(
        "INSERT INTO post_revisions (id, post_id, revision_number, slug, date, snapshot_json, published_at) SELECT ?1, ?2, COALESCE((SELECT MAX(revision_number) FROM post_revisions WHERE post_id=?2), 0) + 1, ?3, ?4, ?5, ?6 WHERE EXISTS (SELECT 1 FROM posts WHERE id=?2 AND draft_version=?7) AND NOT EXISTS (SELECT 1 FROM posts AS reserved WHERE reserved.id<>?2 AND (reserved.slug=?3 OR reserved.published_slug=?3))",
      ).bind(
        revisionId,
        draft.id,
        draft.slug,
        draft.date,
        JSON.stringify(snapshot),
        publishedAt,
        expectedVersion,
      ),
      d1.prepare(
        "UPDATE posts SET published_revision_id=?1, published_slug=?2, status='published', draft_version=?3, updated_at=?4 WHERE id=?5 AND draft_version=?6 AND NOT EXISTS (SELECT 1 FROM posts AS reserved WHERE reserved.id<>?5 AND (reserved.slug=?2 OR reserved.published_slug=?2)) AND EXISTS (SELECT 1 FROM post_revisions WHERE id=?1 AND post_id=?5 AND slug=?2)",
      ).bind(revisionId, draft.slug, nextVersion, publishedAt, draft.id, expectedVersion),
      d1.prepare(
        "SELECT draft_version, EXISTS (SELECT 1 FROM posts AS reserved WHERE reserved.id<>?1 AND (reserved.slug=?2 OR reserved.published_slug=?2)) AS slug_reserved FROM posts WHERE id=?1",
      ).bind(draft.id, draft.slug),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
      const diagnostic = resultRows<SaveDiagnosticRow>(results[2])[0];
      if (diagnostic?.draft_version === expectedVersion && diagnostic.slug_reserved) {
        throw new SlugConflictError();
      }
      throw new VersionConflictError();
    }
    return structuredClone(snapshot);
  }

  async getPublishedBySlug(slug: string): Promise<PublishedSnapshot | null> {
    const row = await this.#database().prepare(
      "SELECT revisions.snapshot_json FROM posts INNER JOIN post_revisions AS revisions ON revisions.id=posts.published_revision_id WHERE posts.published_slug=?1 LIMIT 1",
    ).bind(slug).first<{ snapshot_json: string }>();
    return row ? parseJson<PublishedSnapshot>(row.snapshot_json) : null;
  }

  async listPublished(): Promise<PublishedSnapshot[]> {
    const result = await this.#database().prepare(
      "SELECT revisions.snapshot_json FROM posts INNER JOIN post_revisions AS revisions ON revisions.id=posts.published_revision_id ORDER BY revisions.date DESC, revisions.published_at DESC",
    ).all<{ snapshot_json: string }>();
    return result.results.map((row) => parseJson<PublishedSnapshot>(row.snapshot_json));
  }

  async listTemplates(type: PostType): Promise<SectionTemplate[]> {
    const result = await this.#database().prepare(
      "SELECT id, post_type, title, kind, position, standard_key, enabled FROM section_templates WHERE post_type=?1 ORDER BY position, id",
    ).bind(type).all<TemplateRow>();
    return result.results.map(rowToTemplate);
  }

  async saveTemplate(template: SectionTemplate): Promise<SectionTemplate> {
    await this.#database().prepare(
      "INSERT INTO section_templates (id, post_type, title, kind, position, standard_key, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(id) DO UPDATE SET post_type=excluded.post_type, title=excluded.title, kind=excluded.kind, position=excluded.position, standard_key=excluded.standard_key, enabled=excluded.enabled",
    ).bind(
      template.id,
      template.postType,
      template.title,
      template.kind,
      template.position,
      template.standardKey,
      template.enabled ? 1 : 0,
    ).run();
    return structuredClone(template);
  }

  async disableTemplate(id: string): Promise<void> {
    await this.#database().prepare(
      "UPDATE section_templates SET enabled=0 WHERE id=?1",
    ).bind(id).run();
  }

  async hasBootstrapMarker(): Promise<boolean> {
    const row = await this.#database().prepare(
      "SELECT 1 AS present FROM blog_state WHERE key=?1 LIMIT 1",
    ).bind(BOOTSTRAP_MARKER).first<{ present: number }>();
    return row !== null;
  }

  async markBootstrapped(now: string): Promise<void> {
    await this.#database().prepare(
      "INSERT INTO blog_state (key, value, updated_at) VALUES (?1, 'true', ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
    ).bind(BOOTSTRAP_MARKER, now).run();
  }

  #database(): D1DatabaseLike {
    if (!env.DB) {
      throw new Error("Cloudflare D1 binding `DB` is unavailable");
    }
    return env.DB as D1DatabaseLike;
  }

  #combineRows(posts: PostRow[], sectionRows: SectionRow[]): BlogPostDraft[] {
    const sectionsByPost = new Map<string, BlogSection[]>();
    for (const row of sectionRows) {
      const sections = sectionsByPost.get(row.post_id) ?? [];
      sections.push(rowToSection(row));
      sectionsByPost.set(row.post_id, sections);
    }
    return posts.map((post) => rowToDraft(post, sectionsByPost.get(post.id) ?? []));
  }
}
