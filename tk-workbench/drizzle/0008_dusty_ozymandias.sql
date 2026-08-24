CREATE TABLE `publish_project_links` (
	`task_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_publish_project_links_project` ON `publish_project_links` (`project_id`,`created_at`);