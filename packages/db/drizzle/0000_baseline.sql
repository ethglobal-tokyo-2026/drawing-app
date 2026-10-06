CREATE TABLE `chat_menu_batches` (
	`ticket_day` text PRIMARY KEY NOT NULL,
	`line_request_id` text,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "chat_menu_batches_status" CHECK("chat_menu_batches"."status" in ('sent', 'done', 'failed')),
	CONSTRAINT "chat_menu_batches_request" CHECK("chat_menu_batches"."status" = 'failed' or "chat_menu_batches"."line_request_id" is not null)
);
--> statement-breakpoint
CREATE TABLE `gifts` (
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
	`pushed_to_giver_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`giver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`for_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gifts_id" CHECK(length("gifts"."id") = 66 and "gifts"."id" like '0x%'),
	CONSTRAINT "gifts_claim_commitment" CHECK(length("gifts"."claim_commitment") = 66 and "gifts"."claim_commitment" like '0x%'),
	CONSTRAINT "gifts_status" CHECK("gifts"."status" in ('packed', 'sent', 'received', 'taken_out', 'returned')),
	CONSTRAINT "gifts_escrow_status" CHECK("gifts"."escrow_status" in ('missing', 'pending', 'claimed', 'taken_out', 'expired_returned')),
	CONSTRAINT "gifts_status_dates" CHECK(("gifts"."status" = 'packed' and "gifts"."sent_at" is null and "gifts"."received_at" is null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'sent' and "gifts"."sent_at" is not null and "gifts"."received_at" is null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'received' and "gifts"."received_at" is not null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'taken_out' and "gifts"."taken_out_at" is not null and "gifts"."received_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'returned' and "gifts"."returned_at" is not null and "gifts"."received_at" is null and "gifts"."taken_out_at" is null)),
	CONSTRAINT "gifts_status_escrow" CHECK(("gifts"."status" = 'packed' and "gifts"."escrow_status" in ('missing', 'pending'))
        or ("gifts"."status" = 'sent' and "gifts"."escrow_status" = 'pending')
        or ("gifts"."status" = 'received' and "gifts"."escrow_status" = 'claimed')
        or ("gifts"."status" = 'taken_out' and "gifts"."escrow_status" in ('missing', 'taken_out'))
        or ("gifts"."status" = 'returned' and "gifts"."escrow_status" in ('pending', 'expired_returned'))),
	CONSTRAINT "gifts_receiver" CHECK(("gifts"."receiver_id" is null) = ("gifts"."received_at" is null)),
	CONSTRAINT "gifts_not_to_self" CHECK("gifts"."receiver_id" is null or "gifts"."receiver_id" <> "gifts"."giver_id"),
	CONSTRAINT "gifts_not_for_self" CHECK("gifts"."for_user_id" is null or "gifts"."for_user_id" <> "gifts"."giver_id"),
	CONSTRAINT "gifts_expiry" CHECK("gifts"."expires_at" > "gifts"."created_at"),
	CONSTRAINT "gifts_pushed" CHECK("gifts"."pushed_to_giver_at" is null or "gifts"."received_at" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_claim_commitment_unique` ON `gifts` (`claim_commitment`);--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_one_per_sticker` ON `gifts` (`sticker_id`) WHERE "gifts"."status" in ('packed', 'sent') or "gifts"."escrow_status" = 'pending';--> statement-breakpoint
CREATE INDEX `gifts_giver` ON `gifts` (`giver_id`,`status`);--> statement-breakpoint
CREATE INDEX `gifts_receiver` ON `gifts` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `gifts_for_user` ON `gifts` (`for_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `gifts_transfer_trail` ON `gifts` (`sticker_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_received` ON `gifts` (`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_push_due` ON `gifts` (`received_at`) WHERE "gifts"."status" = 'received' and "gifts"."pushed_to_giver_at" is null;--> statement-breakpoint
CREATE TABLE `gratitude` (
	`gift_id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`method` text NOT NULL,
	`hits` integer NOT NULL,
	`total` integer NOT NULL,
	`peak_mult` real NOT NULL,
	`peak_tier` integer NOT NULL,
	`original_artist_gratitude_share` integer NOT NULL,
	`game_config_version` text NOT NULL,
	`replay` blob NOT NULL,
	`seen_by_giver_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gratitude_method" CHECK("gratitude"."method" in ('tap', 'stroke', 'shake')),
	CONSTRAINT "gratitude_hits" CHECK("gratitude"."hits" between 1 and 120),
	CONSTRAINT "gratitude_original_artist_share" CHECK("gratitude"."original_artist_gratitude_share" between 0 and "gratitude"."total"),
	CONSTRAINT "gratitude_tier" CHECK("gratitude"."peak_tier" between 0 and 4),
	CONSTRAINT "gratitude_mult" CHECK("gratitude"."peak_mult" between 1 and 8)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gratitude_idempotency_key_unique` ON `gratitude` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `gratitude_created` ON `gratitude` (`created_at`);--> statement-breakpoint
CREATE TABLE `sticker_placements` (
	`user_id` text NOT NULL,
	`sticker_id` text NOT NULL,
	`on_board` integer,
	`x` real,
	`y` real,
	`scale` real,
	`rotation` real,
	`z` integer,
	`seen_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `sticker_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sticker_placements_placement" CHECK(("sticker_placements"."on_board" is null and "sticker_placements"."x" is null and "sticker_placements"."y" is null and "sticker_placements"."scale" is null and "sticker_placements"."rotation" is null and "sticker_placements"."z" is null)
        or ("sticker_placements"."on_board" is not null and "sticker_placements"."x" between 0 and 1 and "sticker_placements"."y" between 0 and 1
          and "sticker_placements"."scale" > 0 and "sticker_placements"."scale" <= 1 and "sticker_placements"."rotation" is not null and "sticker_placements"."z" is not null))
);
--> statement-breakpoint
CREATE TABLE `sticker_timelapses` (
	`sticker_id` text PRIMARY KEY NOT NULL,
	`ops` blob NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stickers` (
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
	FOREIGN KEY (`artist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stickers_time_used" CHECK("stickers"."time_used" between 0 and 180),
	CONSTRAINT "stickers_size" CHECK("stickers"."width" > 0 and "stickers"."height" > 0),
	CONSTRAINT "stickers_content_hash" CHECK(length("stickers"."content_hash") = 66 and "stickers"."content_hash" like '0x%'),
	CONSTRAINT "stickers_veiled" CHECK("stickers"."nsfw" = ("stickers"."veiled_hash" is not null)),
	CONSTRAINT "stickers_object_id" CHECK("stickers"."object_id" is null or (length("stickers"."object_id") = 66 and "stickers"."object_id" like '0x%'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_number_unique` ON `stickers` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_object_id_unique` ON `stickers` (`object_id`);--> statement-breakpoint
CREATE INDEX `stickers_owner` ON `stickers` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stickers_content_hash` ON `stickers` (`content_hash`);--> statement-breakpoint
CREATE INDEX `stickers_artist` ON `stickers` (`artist_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stickers_created` ON `stickers` (`created_at`);--> statement-breakpoint
CREATE TABLE `sui_transactions` (
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `ticket_purchases`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sui_transactions_kind" CHECK("sui_transactions"."kind" in ('mint', 'deposit', 'take_out', 'claim', 'return', 'payment')),
	CONSTRAINT "sui_transactions_outcome" CHECK("sui_transactions"."outcome" is null or "sui_transactions"."outcome" in ('succeeded', 'failed', 'dead')),
	CONSTRAINT "sui_transactions_subject" CHECK(("sui_transactions"."kind" = 'mint' and "sui_transactions"."sticker_id" is not null and "sui_transactions"."user_id" is null and "sui_transactions"."gift_id" is null and "sui_transactions"."purchase_id" is null)
        or ("sui_transactions"."kind" = 'deposit' and "sui_transactions"."user_id" is not null and "sui_transactions"."sticker_id" is not null and "sui_transactions"."gift_id" is not null and "sui_transactions"."purchase_id" is null)
        or ("sui_transactions"."kind" = 'take_out' and "sui_transactions"."user_id" is not null and "sui_transactions"."gift_id" is not null and "sui_transactions"."purchase_id" is null)
        or ("sui_transactions"."kind" in ('claim', 'return') and "sui_transactions"."user_id" is null and "sui_transactions"."gift_id" is not null and "sui_transactions"."purchase_id" is null)
        or ("sui_transactions"."kind" = 'payment' and "sui_transactions"."user_id" is not null and "sui_transactions"."purchase_id" is not null and "sui_transactions"."sticker_id" is null and "sui_transactions"."gift_id" is null)),
	CONSTRAINT "sui_transactions_settled" CHECK(("sui_transactions"."outcome" is null) = ("sui_transactions"."settled_at" is null)),
	CONSTRAINT "sui_transactions_failure" CHECK(case "sui_transactions"."outcome" when 'failed' then "sui_transactions"."failure" is not null when 'dead' then 1 else "sui_transactions"."failure" is null end),
	CONSTRAINT "sui_transactions_submitted" CHECK("sui_transactions"."submitted_at" is null or "sui_transactions"."sender_signature" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_digest_unique` ON `sui_transactions` (`digest`);--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_sticker` ON `sui_transactions` (`sticker_id`) WHERE "sui_transactions"."outcome" is null and "sui_transactions"."kind" in ('mint', 'deposit');--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_gift` ON `sui_transactions` (`gift_id`) WHERE "sui_transactions"."outcome" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_purchase` ON `sui_transactions` (`purchase_id`) WHERE "sui_transactions"."outcome" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `sui_transactions_open_payment` ON `sui_transactions` (`sender`) WHERE "sui_transactions"."outcome" is null and "sui_transactions"."kind" = 'payment';--> statement-breakpoint
CREATE INDEX `sui_transactions_open` ON `sui_transactions` (`created_at`) WHERE "sui_transactions"."outcome" is null;--> statement-breakpoint
CREATE INDEX `sui_transactions_gift` ON `sui_transactions` (`gift_id`);--> statement-breakpoint
CREATE INDEX `sui_transactions_sticker` ON `sui_transactions` (`sticker_id`);--> statement-breakpoint
CREATE TABLE `ticket_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer NOT NULL,
	`price_yen` integer NOT NULL,
	`paid_jpyc` text,
	`verified_at` integer,
	`given_up_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_purchases_pack" CHECK("ticket_purchases"."tickets" > 0 and "ticket_purchases"."price_yen" > 0),
	CONSTRAINT "ticket_purchases_payment" CHECK(("ticket_purchases"."paid_jpyc" is null) = ("ticket_purchases"."verified_at" is null))
);
--> statement-breakpoint
CREATE INDEX `ticket_purchases_user` ON `ticket_purchases` (`user_id`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_open` ON `ticket_purchases` (`created_at`) WHERE "ticket_purchases"."verified_at" is null and "ticket_purchases"."given_up_at" is null;--> statement-breakpoint
CREATE TABLE `ticket_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
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
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day` ON `ticket_uses` (`user_id`,`ticket_day`,`day_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_idempotency_key` ON `ticket_uses` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text,
	`line_display_name` text,
	`line_picture_url` text,
	`handle` text,
	`language` text NOT NULL,
	`language_choice` text,
	`nsfw_opted_in_at` integer,
	`sui_address` text,
	`terms_accepted_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "users_line" CHECK(("users"."deleted_at" is null and "users"."line_user_id" is not null and "users"."line_display_name" is not null)
        or ("users"."deleted_at" is not null and "users"."line_user_id" is null and "users"."line_display_name" is null and "users"."line_picture_url" is null)),
	CONSTRAINT "users_sui_address" CHECK("users"."sui_address" is null
        or (length("users"."sui_address") = 66 and "users"."sui_address" like '0x%' and "users"."sui_address" = lower("users"."sui_address")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_line_user_id_unique` ON `users` (`line_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_sui_address_unique` ON `users` (`sui_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle` ON `users` (lower("handle"));--> statement-breakpoint
CREATE TRIGGER `users_updated_at` AFTER UPDATE ON `users` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `users` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `stickers_updated_at` AFTER UPDATE ON `stickers` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `stickers` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `sticker_timelapses_updated_at` AFTER UPDATE ON `sticker_timelapses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_timelapses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_uses_updated_at` AFTER UPDATE ON `ticket_uses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_uses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_purchases_updated_at` AFTER UPDATE ON `ticket_purchases` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_purchases` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `sticker_placements_updated_at` AFTER UPDATE ON `sticker_placements` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_placements` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `gifts_updated_at` AFTER UPDATE ON `gifts` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `gifts` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `gratitude_updated_at` AFTER UPDATE ON `gratitude` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `gratitude` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `chat_menu_batches_updated_at` AFTER UPDATE ON `chat_menu_batches` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `chat_menu_batches` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `sui_transactions_updated_at` AFTER UPDATE ON `sui_transactions` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sui_transactions` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
