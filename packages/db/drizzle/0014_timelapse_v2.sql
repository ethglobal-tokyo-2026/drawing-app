PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- migrate.ts converts stored v1 recordings before this migration adds the format marker.
CREATE TABLE `__new_sticker_timelapses` (
	`sticker_id` text PRIMARY KEY NOT NULL,
	`ops` blob NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`format` integer DEFAULT 2 NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sticker_timelapses_format" CHECK("__new_sticker_timelapses"."format" = 2)
);
--> statement-breakpoint
INSERT INTO `__new_sticker_timelapses`("sticker_id", "ops", "created_at", "updated_at") SELECT "sticker_id", "ops", "created_at", "updated_at" FROM `sticker_timelapses`;--> statement-breakpoint
DROP TABLE `sticker_timelapses`;--> statement-breakpoint
ALTER TABLE `__new_sticker_timelapses` RENAME TO `sticker_timelapses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TRIGGER `sticker_timelapses_updated_at` AFTER UPDATE ON `sticker_timelapses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_timelapses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
