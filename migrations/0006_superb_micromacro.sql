CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`color` text DEFAULT 'bg-teal' NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_user_name_unique` ON `category` (`user_id`,`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text NOT NULL,
	`category_id` text NOT NULL,
	`sub_category_id` text,
	`date` text NOT NULL,
	`payment_method_id` text,
	`payment_type` text NOT NULL,
	`payment_card_name` text,
	`comment` text,
	`split_mode` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_category_id`) REFERENCES `sub_category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expense_user_cycle_idx` ON `expense` (`user_id`,`cycle_id`);--> statement-breakpoint
CREATE INDEX `expense_user_date_idx` ON `expense` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `expense_split_participant` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`contact_id` text,
	`share` integer NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sub_category` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sub_category_category_user_name_unique` ON `sub_category` (`category_id`,`user_id`,`name`) WHERE deleted_at IS NULL;