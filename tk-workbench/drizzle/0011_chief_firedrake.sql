CREATE TABLE `collection_strategies` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`keywords` text NOT NULL,
	`market` text NOT NULL,
	`platforms_json` text DEFAULT '[]' NOT NULL,
	`signals_json` text DEFAULT '[]' NOT NULL,
	`data_window` text DEFAULT '30d' NOT NULL,
	`min_views` integer DEFAULT 0 NOT NULL,
	`min_likes` integer DEFAULT 0 NOT NULL,
	`max_results` integer DEFAULT 12 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_collection_strategies_task_updated` ON `collection_strategies` (`task_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_collection_strategies_status_updated` ON `collection_strategies` (`status`,`updated_at`);