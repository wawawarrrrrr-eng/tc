CREATE TABLE `video_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`product_name` text DEFAULT '待补充产品' NOT NULL,
	`source_id` text NOT NULL,
	`source_json` text NOT NULL,
	`analysis_id` text,
	`research_id` text,
	`current_stage` text DEFAULT '02' NOT NULL,
	`status` text DEFAULT '已创建' NOT NULL,
	`workflow_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_video_projects_code` ON `video_projects` (`code`);--> statement-breakpoint
CREATE INDEX `idx_video_projects_source` ON `video_projects` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_video_projects_updated` ON `video_projects` (`updated_at`);--> statement-breakpoint
ALTER TABLE `ai_video_jobs` ADD `project_id` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_ai_video_jobs_project_created` ON `ai_video_jobs` (`project_id`,`created_at`);