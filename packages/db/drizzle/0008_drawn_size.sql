PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Each sticker's drawn size was read from its timelapse into sticker_drawn_sizes before this ran, by a one-shot step since removed; a database without stickers had none to read.
CREATE TABLE IF NOT EXISTS `sticker_drawn_sizes` (`sticker_id` text PRIMARY KEY NOT NULL, `drawn_width` real NOT NULL, `drawn_height` real NOT NULL);--> statement-breakpoint
CREATE TABLE `__new_stickers` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`artist_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`time_used` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`outline` text NOT NULL,
	`nsfw` integer NOT NULL,
	`content_hash` text NOT NULL,
	`veiled_hash` text,
	`object_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`kyoto_seika_subjects` text,
	`cdn_purge_due_at` integer,
	`has_sharp_copy` integer DEFAULT false NOT NULL,
	`drawn_width` real NOT NULL,
	`drawn_height` real NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stickers_time_used" CHECK("__new_stickers"."time_used" between 0 and 1800),
	CONSTRAINT "stickers_kyoto_seika_subjects" CHECK("__new_stickers"."kyoto_seika_subjects" is null or (json_valid("__new_stickers"."kyoto_seika_subjects") and json_array_length("__new_stickers"."kyoto_seika_subjects") = 2)),
	CONSTRAINT "stickers_size" CHECK("__new_stickers"."width" > 0 and "__new_stickers"."height" > 0),
	CONSTRAINT "stickers_drawn_size" CHECK("__new_stickers"."drawn_width" > 0 and "__new_stickers"."drawn_height" > 0),
	CONSTRAINT "stickers_content_hash" CHECK(length("__new_stickers"."content_hash") = 66 and "__new_stickers"."content_hash" like '0x%'),
	CONSTRAINT "stickers_veiled" CHECK("__new_stickers"."nsfw" = ("__new_stickers"."veiled_hash" is not null)),
	CONSTRAINT "stickers_object_id" CHECK("__new_stickers"."object_id" is null or (length("__new_stickers"."object_id") = 66 and "__new_stickers"."object_id" like '0x%'))
);
--> statement-breakpoint
INSERT INTO `__new_stickers`("id", "number", "artist_id", "owner_id", "time_used", "width", "height", "outline", "nsfw", "content_hash", "veiled_hash", "object_id", "created_at", "updated_at", "kyoto_seika_subjects", "cdn_purge_due_at", "has_sharp_copy", "drawn_width", "drawn_height") SELECT s."id", s."number", s."artist_id", s."owner_id", s."time_used", s."width", s."height", s."outline", s."nsfw", s."content_hash", s."veiled_hash", s."object_id", s."created_at", s."updated_at", s."kyoto_seika_subjects", s."cdn_purge_due_at", s."has_sharp_copy", d."drawn_width", d."drawn_height" FROM `stickers` s LEFT JOIN `sticker_drawn_sizes` d ON d.`sticker_id` = s.`id`;--> statement-breakpoint
DROP TABLE `stickers`;--> statement-breakpoint
ALTER TABLE `__new_stickers` RENAME TO `stickers`;--> statement-breakpoint
DROP TABLE `sticker_drawn_sizes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_number_unique` ON `stickers` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_object_id_unique` ON `stickers` (`object_id`);--> statement-breakpoint
CREATE INDEX `stickers_owner` ON `stickers` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stickers_content_hash` ON `stickers` (`content_hash`);--> statement-breakpoint
CREATE INDEX `stickers_artist` ON `stickers` (`artist_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stickers_created` ON `stickers` (`created_at`);--> statement-breakpoint
CREATE INDEX `stickers_cdn_purge_due` ON `stickers` (`cdn_purge_due_at`) WHERE "stickers"."cdn_purge_due_at" is not null;--> statement-breakpoint
-- Saved spots were sized under the old rule: each goes once into its sticker's new range, half to twice its natural size (NATURAL_SCALE board px per drawn unit on the 390 px phone board; the large layout's a size larger, LARGE_LANDING_GROWTH).
UPDATE `sticker_placements` SET `scale` = round(min(max(`scale`, d.`natural` / 2), d.`natural` * 2), 4)
FROM (SELECT `id`, max(`drawn_width`, `drawn_height`) * 0.25 / 390 AS `natural` FROM `stickers`) AS d
WHERE d.`id` = `sticker_placements`.`sticker_id` AND `scale` IS NOT NULL;--> statement-breakpoint
UPDATE `sticker_placements` SET `large_scale` = round(min(max(`large_scale`, d.`natural` / 2), d.`natural` * 2), 4)
FROM (SELECT `id`, max(`drawn_width`, `drawn_height`) * 0.25 / 390 * 1.25 AS `natural` FROM `stickers`) AS d
WHERE d.`id` = `sticker_placements`.`sticker_id` AND `large_scale` IS NOT NULL;--> statement-breakpoint
CREATE TRIGGER `stickers_updated_at` AFTER UPDATE ON `stickers` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `stickers` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
