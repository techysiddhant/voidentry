PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expense` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`cycle_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text NOT NULL,
	`category_id` text NOT NULL,
	`sub_category_id` text,
	`date` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`comment` text,
	`split_mode` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_expense_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_cycle_id_cycle_id_fk` FOREIGN KEY (`cycle_id`) REFERENCES `cycle`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expense_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`),
	CONSTRAINT `fk_expense_sub_category_id_sub_category_id_fk` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_category`(`id`),
	CONSTRAINT `fk_expense_payment_method_id_payment_method_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_expense`(`id`, `user_id`, `cycle_id`, `amount`, `note`, `category_id`, `sub_category_id`, `date`, `payment_method_id`, `comment`, `split_mode`, `created_at`, `updated_at`, `deleted_at`) SELECT `id`, `user_id`, `cycle_id`, `amount`, `note`, `category_id`, `sub_category_id`, `date`, `payment_method_id`, `comment`, `split_mode`, `created_at`, `updated_at`, `deleted_at` FROM `expense`;--> statement-breakpoint
DROP TABLE `expense`;--> statement-breakpoint
ALTER TABLE `__new_expense` RENAME TO `expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `expense_user_cycle_idx` ON `expense` (`user_id`,`cycle_id`);--> statement-breakpoint
CREATE INDEX `expense_user_date_idx` ON `expense` (`user_id`,`date`);