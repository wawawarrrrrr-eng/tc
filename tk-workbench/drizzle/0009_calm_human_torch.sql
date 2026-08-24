CREATE TABLE `content_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_date` text NOT NULL,
	`target_count` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text NOT NULL,
	`codex_thread_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_plans_date_updated` ON `content_plans` (`plan_date`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_content_plans_status_updated` ON `content_plans` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `content_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`product_name` text NOT NULL,
	`platform` text NOT NULL,
	`target_account` text NOT NULL,
	`video_type` text NOT NULL,
	`script_direction` text NOT NULL,
	`publish_time` text NOT NULL,
	`success_metric` text NOT NULL,
	`next_agent` text NOT NULL,
	`dependency_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'waiting_confirmation' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_content_tasks_plan_order` ON `content_tasks` (`plan_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_content_tasks_status_updated` ON `content_tasks` (`status`,`updated_at`);