CREATE TABLE `blog_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`safe_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`visibility` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_assets_post_hash_uq` ON `blog_assets` (`post_id`,`sha256`);--> statement-breakpoint
CREATE INDEX `blog_assets_post_idx` ON `blog_assets` (`post_id`);