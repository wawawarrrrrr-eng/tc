CREATE TABLE `research_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`product_name` text NOT NULL,
	`country` text NOT NULL,
	`platform` text NOT NULL,
	`language` text NOT NULL,
	`status` text NOT NULL,
	`status_label` text NOT NULL,
	`progress` integer DEFAULT 100 NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`mode_label` text DEFAULT '商品调研' NOT NULL,
	`codex_thread_id` text,
	`asset_count` integer DEFAULT 0 NOT NULL,
	`result_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_research_projects_updated_at` ON `research_projects` (`updated_at`);