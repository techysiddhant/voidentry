PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_consent_audit_logs` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`terms_accepted` integer NOT NULL,
	`privacy_accepted` integer NOT NULL,
	`artifact_version` text NOT NULL,
	`purpose_scope` text NOT NULL,
	`ip_address` text NOT NULL,
	`timestamp_utc` integer NOT NULL,
	CONSTRAINT `fk_consent_audit_logs_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_consent_audit_logs`(`id`, `user_id`, `terms_accepted`, `privacy_accepted`, `artifact_version`, `purpose_scope`, `ip_address`, `timestamp_utc`) SELECT `id`, `user_id`, `terms_accepted`, `privacy_accepted`, `artifact_version`, `purpose_scope`, `ip_address`, `timestamp_utc` FROM `consent_audit_logs`;--> statement-breakpoint
DROP TABLE `consent_audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_consent_audit_logs` RENAME TO `consent_audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;