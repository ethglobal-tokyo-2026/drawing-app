PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sticker_timelapses` (
	`sticker_id` text PRIMARY KEY NOT NULL,
	`ops` blob NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`format` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sticker_timelapses_format" CHECK("__new_sticker_timelapses"."format" = 3)
);
--> statement-breakpoint
INSERT INTO `__new_sticker_timelapses`("sticker_id", "ops", "created_at", "updated_at") SELECT t."sticker_id", (SELECT s."ops" FROM temp.timelapse_v3_stage s WHERE s.sticker_id = t.sticker_id), t."created_at", t."updated_at" FROM `sticker_timelapses` t;--> statement-breakpoint
DROP TABLE `sticker_timelapses`;--> statement-breakpoint
ALTER TABLE `__new_sticker_timelapses` RENAME TO `sticker_timelapses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP TABLE temp.timelapse_v3_stage;--> statement-breakpoint
CREATE TRIGGER `sticker_timelapses_updated_at` AFTER UPDATE ON `sticker_timelapses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_timelapses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
