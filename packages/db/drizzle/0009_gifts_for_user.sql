ALTER TABLE `gifts` ADD `for_user_id` text;--> statement-breakpoint
CREATE INDEX `gifts_for_user` ON `gifts` (`for_user_id`,`status`);