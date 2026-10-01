PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ticket_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer NOT NULL,
	`price_yen` integer NOT NULL,
	`paid_jpyc` text,
	`tx_digest` text,
	`verified_at` integer,
	`given_up_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_purchases_pack" CHECK("__new_ticket_purchases"."tickets" > 0 and "__new_ticket_purchases"."price_yen" > 0),
	CONSTRAINT "ticket_purchases_payment" CHECK(("__new_ticket_purchases"."tx_digest" is null) = ("__new_ticket_purchases"."paid_jpyc" is null) and ("__new_ticket_purchases"."verified_at" is null or "__new_ticket_purchases"."tx_digest" is not null))
);
--> statement-breakpoint
-- given_up_at is new, so it starts null.
INSERT INTO `__new_ticket_purchases`("id", "user_id", "tickets", "price_yen", "paid_jpyc", "tx_digest", "verified_at", "created_at", "updated_at") SELECT "id", "user_id", "tickets", "price_yen", "paid_jpyc", "tx_digest", "verified_at", "created_at", "updated_at" FROM `ticket_purchases`;--> statement-breakpoint
DROP TABLE `ticket_purchases`;--> statement-breakpoint
ALTER TABLE `__new_ticket_purchases` RENAME TO `ticket_purchases`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_purchases_tx_digest_unique` ON `ticket_purchases` (`tx_digest`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_user` ON `ticket_purchases` (`user_id`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_open` ON `ticket_purchases` (`created_at`) WHERE "ticket_purchases"."verified_at" is null and "ticket_purchases"."given_up_at" is null;--> statement-breakpoint
CREATE TRIGGER `ticket_purchases_updated_at` AFTER UPDATE ON `ticket_purchases` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_purchases` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;