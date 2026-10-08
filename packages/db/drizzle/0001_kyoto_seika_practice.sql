PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	FOREIGN KEY (`artist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stickers_time_used" CHECK("__new_stickers"."time_used" between 0 and 1800),
	CONSTRAINT "stickers_kyoto_seika_subjects" CHECK("__new_stickers"."kyoto_seika_subjects" is null or (json_valid("__new_stickers"."kyoto_seika_subjects") and json_array_length("__new_stickers"."kyoto_seika_subjects") = 2)),
	CONSTRAINT "stickers_size" CHECK("__new_stickers"."width" > 0 and "__new_stickers"."height" > 0),
	CONSTRAINT "stickers_content_hash" CHECK(length("__new_stickers"."content_hash") = 66 and "__new_stickers"."content_hash" like '0x%'),
	CONSTRAINT "stickers_veiled" CHECK("__new_stickers"."nsfw" = ("__new_stickers"."veiled_hash" is not null)),
	CONSTRAINT "stickers_object_id" CHECK("__new_stickers"."object_id" is null or (length("__new_stickers"."object_id") = 66 and "__new_stickers"."object_id" like '0x%'))
);
--> statement-breakpoint
-- kyoto_seika_subjects is new, so every sticker starts with none.
INSERT INTO `__new_stickers`("id", "number", "artist_id", "owner_id", "time_used", "width", "height", "outline", "nsfw", "content_hash", "veiled_hash", "object_id", "created_at", "updated_at") SELECT "id", "number", "artist_id", "owner_id", "time_used", "width", "height", "outline", "nsfw", "content_hash", "veiled_hash", "object_id", "created_at", "updated_at" FROM `stickers`;--> statement-breakpoint
DROP TABLE `stickers`;--> statement-breakpoint
ALTER TABLE `__new_stickers` RENAME TO `stickers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_number_unique` ON `stickers` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_object_id_unique` ON `stickers` (`object_id`);--> statement-breakpoint
CREATE INDEX `stickers_owner` ON `stickers` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stickers_content_hash` ON `stickers` (`content_hash`);--> statement-breakpoint
CREATE INDEX `stickers_artist` ON `stickers` (`artist_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stickers_created` ON `stickers` (`created_at`);--> statement-breakpoint
CREATE TABLE `__new_ticket_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`ticket_day` text NOT NULL,
	`day_index` integer NOT NULL,
	`kind` text NOT NULL,
	`sticker_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`kyoto_seika_practice` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_uses_day_index" CHECK("__new_ticket_uses"."day_index" >= 0),
	CONSTRAINT "ticket_uses_kind" CHECK("__new_ticket_uses"."kind" = 'daily' or "__new_ticket_uses"."day_index" >= 3)
);
--> statement-breakpoint
-- kyoto_seika_practice is new, so every use starts false.
INSERT INTO `__new_ticket_uses`("id", "user_id", "idempotency_key", "ticket_day", "day_index", "kind", "sticker_id", "created_at", "updated_at") SELECT "id", "user_id", "idempotency_key", "ticket_day", "day_index", "kind", "sticker_id", "created_at", "updated_at" FROM `ticket_uses`;--> statement-breakpoint
DROP TABLE `ticket_uses`;--> statement-breakpoint
ALTER TABLE `__new_ticket_uses` RENAME TO `ticket_uses`;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day` ON `ticket_uses` (`user_id`,`ticket_day`,`day_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_idempotency_key` ON `ticket_uses` (`user_id`,`idempotency_key`);--> statement-breakpoint
ALTER TABLE `users` ADD `kyoto_seika_practice_on_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `kyoto_seika_dark_subjects_on_at` integer;--> statement-breakpoint
CREATE TRIGGER `stickers_updated_at` AFTER UPDATE ON `stickers` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `stickers` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_uses_updated_at` AFTER UPDATE ON `ticket_uses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_uses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
