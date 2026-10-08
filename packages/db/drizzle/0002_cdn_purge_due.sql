ALTER TABLE `stickers` ADD `cdn_purge_due_at` integer;--> statement-breakpoint
CREATE INDEX `stickers_cdn_purge_due` ON `stickers` (`cdn_purge_due_at`) WHERE "stickers"."cdn_purge_due_at" is not null;