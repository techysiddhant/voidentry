CREATE TABLE `contact` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_user_name_unique` ON `contact` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type_code` text NOT NULL,
	`label` text NOT NULL,
	`hint` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_code`) REFERENCES `payment_method_type`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_method_type` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_type_code_unique` ON `payment_method_type` (`code`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`default_calendar` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
INSERT INTO `payment_method_type` (`id`, `code`, `name`, `created_at`, `updated_at`) VALUES 
('pmt-cash', 'cash', 'Cash', unixepoch()*1000, unixepoch()*1000),
('pmt-card', 'card', 'Card', unixepoch()*1000, unixepoch()*1000),
('pmt-upi', 'upi', 'UPI', unixepoch()*1000, unixepoch()*1000),
('pmt-netbanking', 'netbanking', 'Net Banking', unixepoch()*1000, unixepoch()*1000),
('pmt-wallet', 'wallet', 'Wallet', unixepoch()*1000, unixepoch()*1000);