PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	CONSTRAINT "ticket_uses_known_kind" CHECK("__new_ticket_uses"."kind" in ('daily', 'reserve')),
	CONSTRAINT "ticket_uses_kind" CHECK("__new_ticket_uses"."kind" = 'daily' or "__new_ticket_uses"."day_index" >= 3)
);
--> statement-breakpoint
-- A use of another kind, which only a hand edit writes, becomes daily, so every row copies: daily tickets expire with their day, where reserve would take a paid one. The WHERE is the new check, negated; every other use copies as it was.
UPDATE `ticket_uses` SET `kind` = 'daily' WHERE NOT (`kind` IN ('daily', 'reserve'));--> statement-breakpoint
INSERT INTO `__new_ticket_uses`("id", "user_id", "idempotency_key", "ticket_day", "day_index", "kind", "sticker_id", "created_at", "updated_at", "kyoto_seika_practice") SELECT "id", "user_id", "idempotency_key", "ticket_day", "day_index", "kind", "sticker_id", "created_at", "updated_at", "kyoto_seika_practice" FROM `ticket_uses`;--> statement-breakpoint
DROP TABLE `ticket_uses`;--> statement-breakpoint
ALTER TABLE `__new_ticket_uses` RENAME TO `ticket_uses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day` ON `ticket_uses` (`user_id`,`ticket_day`,`day_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_idempotency_key` ON `ticket_uses` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE TRIGGER `ticket_uses_updated_at` AFTER UPDATE ON `ticket_uses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_uses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
