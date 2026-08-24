CREATE TABLE `source_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`source_id` text NOT NULL,
	`platform` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`embed_url` text DEFAULT '' NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`classification_json` text DEFAULT '{}' NOT NULL,
	`fit_score` integer DEFAULT 0 NOT NULL,
	`decision` text DEFAULT 'observe' NOT NULL,
	`status` text DEFAULT 'classified' NOT NULL,
	`agent_job_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_assets_task_source` ON `source_assets` (`task_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_source_assets_task_score` ON `source_assets` (`task_id`,`fit_score`);--> statement-breakpoint
CREATE INDEX `idx_source_assets_status_updated` ON `source_assets` (`status`,`updated_at`);