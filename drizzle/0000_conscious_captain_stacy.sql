CREATE TABLE `blog_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_post_id` text NOT NULL,
	`target_slug` text NOT NULL,
	`relation_type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_relations_edge_uq` ON `post_relations` (`source_post_id`,`target_slug`,`relation_type`);--> statement-breakpoint
CREATE TABLE `post_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`slug` text NOT NULL,
	`date` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_revisions_number_uq` ON `post_revisions` (`post_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `post_revisions_slug_idx` ON `post_revisions` (`slug`);--> statement-breakpoint
CREATE INDEX `post_revisions_date_idx` ON `post_revisions` (`date`);--> statement-breakpoint
CREATE TABLE `post_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`items_json` text DEFAULT '[]' NOT NULL,
	`relation_slugs_json` text DEFAULT '[]' NOT NULL,
	`position` integer NOT NULL,
	`template_id` text,
	`standard_key` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_sections_position_uq` ON `post_sections` (`post_id`,`position`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`related_json` text DEFAULT '[]' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`draft_version` integer DEFAULT 0 NOT NULL,
	`published_revision_id` text,
	`published_slug` text,
	`last_write_token` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_uq` ON `posts` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_published_slug_uq` ON `posts` (`published_slug`);--> statement-breakpoint
CREATE INDEX `posts_type_date_idx` ON `posts` (`type`,`date`);--> statement-breakpoint
CREATE TABLE `section_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`post_type` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`standard_key` text,
	`enabled` integer DEFAULT true NOT NULL
);
