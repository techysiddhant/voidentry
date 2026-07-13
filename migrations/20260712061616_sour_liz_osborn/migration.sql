CREATE TABLE `expense` (
	`id` text PRIMARY KEY,
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
	CONSTRAINT `fk_expense_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_cycle_id_cycle_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycle`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`),
	CONSTRAINT `fk_expense_sub_category_id_sub_category_id_fk` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_category`(`id`),
	CONSTRAINT `fk_expense_payment_method_id_payment_method_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `expense_split_participant` (
	`id` text PRIMARY KEY,
	`expense_id` text NOT NULL,
	`contact_id` text,
	`share` integer NOT NULL,
	CONSTRAINT `fk_expense_split_participant_expense_id_expense_id_fk` FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_split_participant_contact_id_contact_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contact`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `expense_user_cycle_idx` ON `expense` (`user_id`,`cycle_id`);--> statement-breakpoint
CREATE INDEX `expense_user_date_idx` ON `expense` (`user_id`,`date`);