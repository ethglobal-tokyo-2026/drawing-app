PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- The old table moves aside, so the new one is created under its own name, as the schema writes it:
-- renaming a table into place would requote its name in sqlite_master.
ALTER TABLE `ticket_uses` RENAME TO `__old_ticket_uses`;--> statement-breakpoint
CREATE TABLE `ticket_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`ticket_day` text NOT NULL,
	`day_index` integer NOT NULL,
	`kind` text NOT NULL,
	`sticker_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_uses_day_index" CHECK("ticket_uses"."day_index" >= 0),
	CONSTRAINT "ticket_uses_kind" CHECK("ticket_uses"."kind" = case when "ticket_uses"."day_index" < 3 then 'daily' else 'reserve' end)
);
--> statement-breakpoint
-- A day's first uses were its daily tickets.
INSERT INTO `ticket_uses`("id", "user_id", "ticket_day", "day_index", "kind", "sticker_id", "created_at", "updated_at") SELECT "id", "user_id", "ticket_day", "day_index", case when "day_index" < 3 then 'daily' else 'reserve' end, "sticker_id", "created_at", "updated_at" FROM `__old_ticket_uses`;--> statement-breakpoint
DROP TABLE `__old_ticket_uses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day` ON `ticket_uses` (`user_id`,`ticket_day`,`day_index`);--> statement-breakpoint
CREATE TRIGGER `ticket_uses_updated_at` AFTER UPDATE ON `ticket_uses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_uses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
