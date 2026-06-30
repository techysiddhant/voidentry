CREATE UNIQUE INDEX `cycle_user_id_id_unique` ON `cycle` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cycle_user_label_unique` ON `cycle` (`user_id`,`label`) WHERE deleted_at IS NULL;--> statement-breakpoint
DROP INDEX `contact_user_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `contact_user_name_unique` ON `contact` (`user_id`,`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`default_calendar` integer DEFAULT false NOT NULL,
	`active_cycle_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`,`active_cycle_id`) REFERENCES `cycle`(`user_id`,`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`("id", "user_id", "currency", "default_calendar", "active_cycle_id", "created_at", "updated_at") SELECT "id", "user_id", "currency", "default_calendar", "active_cycle_id", "created_at", "updated_at" FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);