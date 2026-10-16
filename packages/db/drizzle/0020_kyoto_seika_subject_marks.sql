CREATE TABLE `kyoto_seika_subjects_marked_for_deletion` (
	`word` text PRIMARY KEY NOT NULL,
	`marked_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`marked_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TRIGGER `kyoto_seika_subjects_marked_for_deletion_updated_at` AFTER UPDATE ON `kyoto_seika_subjects_marked_for_deletion` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `kyoto_seika_subjects_marked_for_deletion` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
