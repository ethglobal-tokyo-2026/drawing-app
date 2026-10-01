ALTER TABLE `stickers` ADD `veiled_hash` text;--> statement-breakpoint
CREATE INDEX `stickers_content_hash` ON `stickers` (`content_hash`);