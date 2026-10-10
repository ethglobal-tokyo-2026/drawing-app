CREATE TABLE `veiled_images` (
	`veiled_hash` text PRIMARY KEY NOT NULL,
	`sticker_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "veiled_images_veiled_hash" CHECK(length("veiled_images"."veiled_hash") = 66 and "veiled_images"."veiled_hash" like '0x%')
);
--> statement-breakpoint
-- Each veil a sticker names now, once, from the earliest sticker that names it: stickers sealed from one PNG share its veil.
INSERT INTO `veiled_images` (`veiled_hash`, `sticker_id`)
SELECT `veiled_hash`, `id` FROM (
  SELECT `veiled_hash`, `id`, row_number() OVER (PARTITION BY `veiled_hash` ORDER BY `created_at`, `number`) AS `nth`
  FROM `stickers` WHERE `veiled_hash` IS NOT NULL
) WHERE `nth` = 1;--> statement-breakpoint
CREATE TRIGGER `veiled_images_updated_at` AFTER UPDATE ON `veiled_images` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `veiled_images` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
