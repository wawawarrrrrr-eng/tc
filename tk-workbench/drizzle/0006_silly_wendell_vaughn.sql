CREATE TABLE `analysis_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_json` text NOT NULL,
	`mode` text NOT NULL,
	`mode_label` text NOT NULL,
	`status` text NOT NULL,
	`status_label` text NOT NULL,
	`progress` integer DEFAULT 100 NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`codex_thread_id` text,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_projects_updated_at` ON `analysis_projects` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_analysis_projects_source_mode` ON `analysis_projects` (`source_id`,`mode`);