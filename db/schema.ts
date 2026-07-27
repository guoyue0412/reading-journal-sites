import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull().default(""),
  date: text("date").notNull(),
  summary: text("summary").notNull().default(""),
  tagsJson: text("tags_json").notNull().default("[]"),
  relatedJson: text("related_json").notNull().default("[]"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  status: text("status").notNull().default("draft"),
  draftVersion: integer("draft_version").notNull().default(0),
  publishedRevisionId: text("published_revision_id"),
  publishedSlug: text("published_slug"),
  lastWriteToken: text("last_write_token"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("posts_slug_uq").on(table.slug),
  uniqueIndex("posts_published_slug_uq").on(table.publishedSlug),
  index("posts_type_date_idx").on(table.type, table.date),
]);

export const postSections = sqliteTable("post_sections", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  itemsJson: text("items_json").notNull().default("[]"),
  relationSlugsJson: text("relation_slugs_json").notNull().default("[]"),
  position: integer("position").notNull(),
  templateId: text("template_id"),
  standardKey: text("standard_key"),
}, (table) => [
  uniqueIndex("post_sections_position_uq").on(table.postId, table.position),
]);

export const sectionTemplates = sqliteTable("section_templates", {
  id: text("id").primaryKey(),
  postType: text("post_type").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  position: integer("position").notNull(),
  standardKey: text("standard_key"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const postRevisions = sqliteTable("post_revisions", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  slug: text("slug").notNull(),
  date: text("date").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  publishedAt: text("published_at").notNull(),
}, (table) => [
  uniqueIndex("post_revisions_number_uq").on(table.postId, table.revisionNumber),
  index("post_revisions_slug_idx").on(table.slug),
  index("post_revisions_date_idx").on(table.date),
]);

export const postRelations = sqliteTable("post_relations", {
  id: text("id").primaryKey(),
  sourcePostId: text("source_post_id").notNull(),
  targetSlug: text("target_slug").notNull(),
  relationType: text("relation_type").notNull(),
}, (table) => [
  uniqueIndex("post_relations_edge_uq").on(table.sourcePostId, table.targetSlug, table.relationType),
]);

export const blogState = sqliteTable("blog_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
