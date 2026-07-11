CREATE TABLE `consent_audit_logs` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`terms_accepted` integer NOT NULL,
	`privacy_accepted` integer NOT NULL,
	`artifact_version` text NOT NULL,
	`purpose_scope` text NOT NULL,
	`ip_address` text NOT NULL,
	`timestamp_utc` integer NOT NULL,
	CONSTRAINT `fk_consent_audit_logs_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
