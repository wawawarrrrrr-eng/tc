CREATE TABLE `ai_video_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`segment_id` text NOT NULL,
	`model_id` text NOT NULL,
	`model_name` text NOT NULL,
	`provider_model` text,
	`duration` integer NOT NULL,
	`ratio` text NOT NULL,
	`reference_mode` text NOT NULL,
	`prompt` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`error` text,
	`video_url` text,
	`group_name` text DEFAULT '未分组' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_video_jobs_created_at` ON `ai_video_jobs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_video_jobs_group_created` ON `ai_video_jobs` (`group_name`,`created_at`);