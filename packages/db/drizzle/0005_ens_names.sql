ALTER TABLE `stickers` ADD `ens_named_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `ens_label` text;--> statement-breakpoint
ALTER TABLE `users` ADD `ens_named_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_ens_label_unique` ON `users` (`ens_label`);