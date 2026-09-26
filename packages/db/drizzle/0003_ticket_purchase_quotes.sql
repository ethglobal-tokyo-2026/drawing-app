PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- SQLite can't add a NOT NULL column without a default, so the table is rebuilt. The old table
-- moves aside, so the new one is created under its own name, as the schema writes it: renaming a
-- table into place would requote its name in sqlite_master.
ALTER TABLE `ticket_purchases` RENAME TO `__old_ticket_purchases`;--> statement-breakpoint
CREATE TABLE `ticket_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer NOT NULL,
	`price_yen` integer NOT NULL,
	`sui_yen` text NOT NULL,
	`paid_mist` text NOT NULL,
	`tx_digest` text NOT NULL,
	`verified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_purchases_pack" CHECK("ticket_purchases"."tickets" > 0 and "ticket_purchases"."price_yen" > 0)
);
--> statement-breakpoint
-- Purchases recorded before quotes existed had no quote price: '0' marks them.
INSERT INTO `ticket_purchases`("id", "user_id", "tickets", "price_yen", "sui_yen", "paid_mist", "tx_digest", "verified_at", "created_at", "updated_at") SELECT "id", "user_id", "tickets", "price_yen", '0', "paid_mist", "tx_digest", "verified_at", "created_at", "updated_at" FROM `__old_ticket_purchases`;--> statement-breakpoint
DROP TABLE `__old_ticket_purchases`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_purchases_tx_digest_unique` ON `ticket_purchases` (`tx_digest`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_user` ON `ticket_purchases` (`user_id`);--> statement-breakpoint
CREATE TRIGGER `ticket_purchases_updated_at` AFTER UPDATE ON `ticket_purchases` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_purchases` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
