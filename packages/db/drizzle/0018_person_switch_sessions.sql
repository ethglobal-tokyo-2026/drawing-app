CREATE TABLE `person_switch_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`authenticated_user_id` text NOT NULL,
	`selected_user_id` text NOT NULL,
	`selection_version` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`authenticated_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selected_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `person_switch_sessions_expiration` ON `person_switch_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `__sui_transactions_sequence` (`seq` integer);
--> statement-breakpoint
INSERT INTO `__sui_transactions_sequence` SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'sui_transactions';
--> statement-breakpoint
CREATE TABLE `__new_sui_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`sender` text NOT NULL,
	`user_id` text,
	`sticker_id` text,
	`gift_id` text,
	`purchase_id` integer,
	`digest` text NOT NULL,
	`tx_bytes` text NOT NULL,
	`sponsor_signature` text NOT NULL,
	`sender_signature` text,
	`expires_at` integer NOT NULL,
	`submitted_at` integer,
	`outcome` text,
	`failure` text,
	`settled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`requested_by_user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `ticket_purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sui_transactions_kind" CHECK("__new_sui_transactions"."kind" in ('mint', 'deposit', 'take_out', 'claim', 'return', 'payment')),
	CONSTRAINT "sui_transactions_outcome" CHECK("__new_sui_transactions"."outcome" is null or "__new_sui_transactions"."outcome" in ('succeeded', 'failed', 'dead')),
	CONSTRAINT "sui_transactions_subject" CHECK(("__new_sui_transactions"."kind" = 'mint' and "__new_sui_transactions"."sticker_id" is not null and "__new_sui_transactions"."user_id" is null and "__new_sui_transactions"."gift_id" is null and "__new_sui_transactions"."purchase_id" is null)
        or ("__new_sui_transactions"."kind" = 'deposit' and "__new_sui_transactions"."user_id" is not null and "__new_sui_transactions"."sticker_id" is not null and "__new_sui_transactions"."gift_id" is not null and "__new_sui_transactions"."purchase_id" is null)
        or ("__new_sui_transactions"."kind" = 'take_out' and "__new_sui_transactions"."user_id" is not null and "__new_sui_transactions"."gift_id" is not null and "__new_sui_transactions"."purchase_id" is null)
        or ("__new_sui_transactions"."kind" in ('claim', 'return') and "__new_sui_transactions"."user_id" is null and "__new_sui_transactions"."gift_id" is not null and "__new_sui_transactions"."purchase_id" is null)
        or ("__new_sui_transactions"."kind" = 'payment' and "__new_sui_transactions"."user_id" is not null and "__new_sui_transactions"."purchase_id" is not null and "__new_sui_transactions"."sticker_id" is null and "__new_sui_transactions"."gift_id" is null)),
	CONSTRAINT "sui_transactions_settled" CHECK(("__new_sui_transactions"."outcome" is null) = ("__new_sui_transactions"."settled_at" is null)),
	CONSTRAINT "sui_transactions_failure" CHECK(case "__new_sui_transactions"."outcome" when 'failed' then "__new_sui_transactions"."failure" is not null when 'dead' then 1 else "__new_sui_transactions"."failure" is null end),
	CONSTRAINT "sui_transactions_submitted" CHECK("__new_sui_transactions"."submitted_at" is null or "__new_sui_transactions"."sender_signature" is not null)
);

--> statement-breakpoint
INSERT INTO `__new_sui_transactions` (`id`, `kind`, `sender`, `user_id`, `sticker_id`, `gift_id`, `purchase_id`, `digest`, `tx_bytes`, `sponsor_signature`, `sender_signature`, `expires_at`, `submitted_at`, `outcome`, `failure`, `settled_at`, `created_at`, `updated_at`) SELECT `id`, `kind`, `sender`, `user_id`, `sticker_id`, `gift_id`, `purchase_id`, `digest`, `tx_bytes`, `sponsor_signature`, `sender_signature`, `expires_at`, `submitted_at`, `outcome`, `failure`, `settled_at`, `created_at`, `updated_at` FROM `sui_transactions`;
--> statement-breakpoint
DROP TABLE `sui_transactions`;
--> statement-breakpoint
ALTER TABLE `__new_sui_transactions` RENAME TO `sui_transactions`;
--> statement-breakpoint
UPDATE `sqlite_sequence` SET `seq` = max(`seq`, coalesce((SELECT `seq` FROM `__sui_transactions_sequence`), 0)) WHERE `name` = 'sui_transactions';
--> statement-breakpoint
DROP TABLE `__sui_transactions_sequence`;
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_digest_unique` ON `sui_transactions` (`digest`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_sticker` ON `sui_transactions` (`sticker_id`) WHERE "sui_transactions"."outcome" is null and "sui_transactions"."kind" in ('mint', 'deposit');
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_gift` ON `sui_transactions` (`gift_id`) WHERE "sui_transactions"."outcome" is null;
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_purchase` ON `sui_transactions` (`purchase_id`) WHERE "sui_transactions"."outcome" is null;
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_payment` ON `sui_transactions` (`sender`) WHERE "sui_transactions"."outcome" is null and "sui_transactions"."kind" = 'payment';
--> statement-breakpoint
CREATE INDEX `sui_transactions_open` ON `sui_transactions` (`created_at`) WHERE "sui_transactions"."outcome" is null;
--> statement-breakpoint
CREATE INDEX `sui_transactions_user` ON `sui_transactions` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `sui_transactions_gift` ON `sui_transactions` (`gift_id`);
--> statement-breakpoint
CREATE INDEX `sui_transactions_sticker` ON `sui_transactions` (`sticker_id`);
--> statement-breakpoint
CREATE TRIGGER `sui_transactions_updated_at` AFTER UPDATE ON `sui_transactions` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sui_transactions` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `person_switch_sessions_updated_at` AFTER UPDATE ON `person_switch_sessions` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `person_switch_sessions` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
