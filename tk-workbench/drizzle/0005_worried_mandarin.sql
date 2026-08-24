CREATE TABLE `video_metric_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`media_id` text NOT NULL,
	`task_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`media_name` text DEFAULT '' NOT NULL,
	`video_url` text DEFAULT '' NOT NULL,
	`cover_url` text DEFAULT '' NOT NULL,
	`published_at` integer DEFAULT 0 NOT NULL,
	`metrics_json` text NOT NULL,
	`trend_json` text NOT NULL,
	`captured_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_video_snapshots_item_captured` ON `video_metric_snapshots` (`item_id`,`captured_at`);--> statement-breakpoint
CREATE INDEX `idx_video_snapshots_published` ON `video_metric_snapshots` (`published_at`);--> statement-breakpoint
CREATE TABLE `video_weekly_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`range_start` integer NOT NULL,
	`range_end` integer NOT NULL,
	`report_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_video_reports_created` ON `video_weekly_reports` (`created_at`);