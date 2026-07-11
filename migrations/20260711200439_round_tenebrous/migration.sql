CREATE TABLE `category` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'bg-teal' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_category_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `contact` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_contact_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `cycle` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_cycle_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`type_code` text NOT NULL,
	`label` text NOT NULL,
	`hint` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_payment_method_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_payment_method_type_code_payment_method_type_code_fk` FOREIGN KEY (`type_code`) REFERENCES `payment_method_type`(`code`)
);
--> statement-breakpoint
CREATE TABLE `payment_method_type` (
	`id` text PRIMARY KEY,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_category` (
	`id` text PRIMARY KEY,
	`category_id` text NOT NULL,
	`user_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_sub_category_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_sub_category_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL UNIQUE,
	`currency` text DEFAULT 'INR' NOT NULL,
	`default_calendar` integer DEFAULT false NOT NULL,
	`active_cycle_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_user_preferences_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_preferences_user_id_active_cycle_id_cycle_user_id_id_fk` FOREIGN KEY (`user_id`,`active_cycle_id`) REFERENCES `cycle`(`user_id`,`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_code_unique` ON `category` (`code`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `category_user_name_unique` ON `category` (`user_id`,`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `contact_user_name_unique` ON `contact` (`user_id`,`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `cycle_user_id_id_unique` ON `cycle` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cycle_user_label_unique` ON `cycle` (`user_id`,`label`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sub_category_category_user_code_unique` ON `sub_category` (`category_id`,`user_id`,`code`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sub_category_category_user_name_unique` ON `sub_category` (`category_id`,`user_id`,`name`) WHERE deleted_at IS NULL;