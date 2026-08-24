CREATE TABLE `reference_image_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`project_code` text NOT NULL,
	`product_name` text NOT NULL,
	`shot_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`prompt` text NOT NULL,
	`image_url` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reference_images_project_created` ON `reference_image_assets` (`project_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reference_images_project_shot_version` ON `reference_image_assets` (`project_id`,`shot_id`,`version`);