PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sticker_id` text NOT NULL,
	`giver_id` text NOT NULL,
	`claim_commitment` text NOT NULL,
	`status` text DEFAULT 'packed' NOT NULL,
	`escrow_status` text DEFAULT 'missing' NOT NULL,
	`expires_at` integer NOT NULL,
	`sent_at` integer,
	`taken_out_at` integer,
	`receiver_id` text,
	`received_at` integer,
	`for_user_id` text,
	`returned_at` integer,
	`claim_tx_hash` text,
	`pushed_to_giver_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`giver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`for_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gifts_id" CHECK(length("__new_gifts"."id") = 66 and "__new_gifts"."id" like '0x%'),
	CONSTRAINT "gifts_claim_commitment" CHECK(length("__new_gifts"."claim_commitment") = 66 and "__new_gifts"."claim_commitment" like '0x%'),
	CONSTRAINT "gifts_status" CHECK("__new_gifts"."status" in ('packed', 'sent', 'received', 'taken_out', 'returned')),
	CONSTRAINT "gifts_escrow_status" CHECK("__new_gifts"."escrow_status" in ('missing', 'pending', 'claimed', 'rejected', 'expired_returned')),
	CONSTRAINT "gifts_status_dates" CHECK(("__new_gifts"."status" = 'packed' and "__new_gifts"."sent_at" is null and "__new_gifts"."received_at" is null and "__new_gifts"."taken_out_at" is null and "__new_gifts"."returned_at" is null)
        or ("__new_gifts"."status" = 'sent' and "__new_gifts"."sent_at" is not null and "__new_gifts"."received_at" is null and "__new_gifts"."taken_out_at" is null and "__new_gifts"."returned_at" is null)
        or ("__new_gifts"."status" = 'received' and "__new_gifts"."received_at" is not null and "__new_gifts"."taken_out_at" is null and "__new_gifts"."returned_at" is null)
        or ("__new_gifts"."status" = 'taken_out' and "__new_gifts"."taken_out_at" is not null and "__new_gifts"."received_at" is null and "__new_gifts"."returned_at" is null)
        or ("__new_gifts"."status" = 'returned' and "__new_gifts"."returned_at" is not null and "__new_gifts"."received_at" is null and "__new_gifts"."taken_out_at" is null)),
	CONSTRAINT "gifts_status_escrow" CHECK(("__new_gifts"."status" = 'packed' and "__new_gifts"."escrow_status" in ('missing', 'pending'))
        or ("__new_gifts"."status" = 'sent' and "__new_gifts"."escrow_status" = 'pending')
        or ("__new_gifts"."status" = 'received' and "__new_gifts"."escrow_status" = 'claimed')
        or ("__new_gifts"."status" = 'taken_out' and "__new_gifts"."escrow_status" in ('missing', 'pending', 'rejected'))
        or ("__new_gifts"."status" = 'returned' and "__new_gifts"."escrow_status" in ('pending', 'expired_returned'))),
	CONSTRAINT "gifts_receiver" CHECK(("__new_gifts"."receiver_id" is null) = ("__new_gifts"."received_at" is null)),
	CONSTRAINT "gifts_not_to_self" CHECK("__new_gifts"."receiver_id" is null or "__new_gifts"."receiver_id" <> "__new_gifts"."giver_id"),
	CONSTRAINT "gifts_not_for_self" CHECK("__new_gifts"."for_user_id" is null or "__new_gifts"."for_user_id" <> "__new_gifts"."giver_id"),
	CONSTRAINT "gifts_expiry" CHECK("__new_gifts"."expires_at" > "__new_gifts"."created_at"),
	CONSTRAINT "gifts_claim_tx_hash" CHECK("__new_gifts"."claim_tx_hash" is null or "__new_gifts"."received_at" is not null),
	CONSTRAINT "gifts_pushed" CHECK("__new_gifts"."pushed_to_giver_at" is null or "__new_gifts"."received_at" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_gifts`("id", "sticker_id", "giver_id", "claim_commitment", "status", "escrow_status", "expires_at", "sent_at", "taken_out_at", "receiver_id", "received_at", "for_user_id", "returned_at", "claim_tx_hash", "pushed_to_giver_at", "created_at", "updated_at") SELECT "id", "sticker_id", "giver_id", "claim_commitment", "status", "escrow_status", "expires_at", "sent_at", "taken_out_at", "receiver_id", "received_at", "for_user_id", "returned_at", "claim_tx_hash", "pushed_to_giver_at", "created_at", "updated_at" FROM `gifts`;--> statement-breakpoint
DROP TABLE `gifts`;--> statement-breakpoint
ALTER TABLE `__new_gifts` RENAME TO `gifts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_claim_commitment_unique` ON `gifts` (`claim_commitment`);--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_one_per_sticker` ON `gifts` (`sticker_id`) WHERE "gifts"."status" in ('packed', 'sent') or "gifts"."escrow_status" = 'pending';--> statement-breakpoint
CREATE INDEX `gifts_giver` ON `gifts` (`giver_id`,`status`);--> statement-breakpoint
CREATE INDEX `gifts_receiver` ON `gifts` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `gifts_for_user` ON `gifts` (`for_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `gifts_transfer_trail` ON `gifts` (`sticker_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_received` ON `gifts` (`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_push_due` ON `gifts` (`received_at`) WHERE "gifts"."status" = 'received' and "gifts"."pushed_to_giver_at" is null;--> statement-breakpoint
DROP INDEX `gratitude_push_due`;--> statement-breakpoint
ALTER TABLE `gratitude` DROP COLUMN `pushed_to_giver_at`;--> statement-breakpoint
ALTER TABLE `ticket_uses` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_idempotency_key` ON `ticket_uses` (`user_id`,`idempotency_key`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `time_zone`;--> statement-breakpoint
-- Gifts received before the giver's message existed count as announced, so none goes out late.
UPDATE `gifts` SET `pushed_to_giver_at` = `received_at` WHERE `status` = 'received' AND `pushed_to_giver_at` IS NULL;--> statement-breakpoint
CREATE TRIGGER `gifts_updated_at` AFTER UPDATE ON `gifts` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `gifts` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
