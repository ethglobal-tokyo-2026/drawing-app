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
	`returned_at` integer,
	`claim_tx_hash` text,
	`reject_tx_hash` text,
	`return_tx_hash` text,
	`pushed_to_giver_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`giver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gifts_id" CHECK(length("gifts"."id") = 66 and "gifts"."id" like '0x%'),
	CONSTRAINT "gifts_claim_commitment" CHECK(length("gifts"."claim_commitment") = 66 and "gifts"."claim_commitment" like '0x%'),
	CONSTRAINT "gifts_status" CHECK("gifts"."status" in ('packed', 'sent', 'received', 'taken_out', 'returned')),
	CONSTRAINT "gifts_escrow_status" CHECK("gifts"."escrow_status" in ('missing', 'pending', 'claimed', 'rejected', 'expired_returned')),
	CONSTRAINT "gifts_status_dates" CHECK(("gifts"."status" = 'packed' and "gifts"."sent_at" is null and "gifts"."received_at" is null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'sent' and "gifts"."sent_at" is not null and "gifts"."received_at" is null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'received' and "gifts"."received_at" is not null and "gifts"."taken_out_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'taken_out' and "gifts"."taken_out_at" is not null and "gifts"."received_at" is null and "gifts"."returned_at" is null)
        or ("gifts"."status" = 'returned' and "gifts"."returned_at" is not null and "gifts"."taken_out_at" is null)),
	CONSTRAINT "gifts_status_escrow" CHECK(("gifts"."status" = 'packed' and "gifts"."escrow_status" in ('missing', 'pending'))
        or ("gifts"."status" = 'sent' and "gifts"."escrow_status" = 'pending')
        or ("gifts"."status" = 'received' and "gifts"."escrow_status" in ('pending', 'claimed'))
        or ("gifts"."status" = 'taken_out' and "gifts"."escrow_status" in ('missing', 'pending', 'rejected'))
        or ("gifts"."status" = 'returned' and "gifts"."escrow_status" in ('pending', 'expired_returned'))),
	CONSTRAINT "gifts_receiver" CHECK(("gifts"."receiver_id" is null) = ("gifts"."received_at" is null)),
	CONSTRAINT "gifts_not_to_self" CHECK("gifts"."receiver_id" is null or "gifts"."receiver_id" <> "gifts"."giver_id"),
	CONSTRAINT "gifts_expiry" CHECK("gifts"."expires_at" > "gifts"."created_at"),
	CONSTRAINT "gifts_transactions" CHECK(("gifts"."claim_tx_hash" is null or "gifts"."received_at" is not null)
        and ("gifts"."reject_tx_hash" is null or "gifts"."status" = 'taken_out')
        and ("gifts"."return_tx_hash" is null or "gifts"."status" = 'returned')),
	CONSTRAINT "gifts_pushed" CHECK("gifts"."pushed_to_giver_at" is null or "gifts"."received_at" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_claim_commitment_unique` ON `gifts` (`claim_commitment`);--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_one_per_sticker` ON `gifts` (`sticker_id`) WHERE "gifts"."status" in ('packed', 'sent') or "gifts"."escrow_status" = 'pending';--> statement-breakpoint
CREATE INDEX `gifts_giver` ON `gifts` (`giver_id`,`status`);--> statement-breakpoint
CREATE INDEX `gifts_receiver` ON `gifts` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `gifts_transfer_trail` ON `gifts` (`sticker_id`,`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_received` ON `gifts` (`received_at`);--> statement-breakpoint
CREATE INDEX `gifts_escrow_open` ON `gifts` (`escrow_status`) WHERE "gifts"."escrow_status" in ('missing', 'pending');--> statement-breakpoint
CREATE INDEX `gifts_expiring` ON `gifts` (`expires_at`) WHERE "gifts"."status" in ('packed', 'sent');--> statement-breakpoint
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
	`pushed_to_giver_at` integer,
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
CREATE INDEX `gratitude_push_due` ON `gratitude` (`created_at`) WHERE "gratitude"."pushed_to_giver_at" is null;--> statement-breakpoint
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
	`content_hash` text NOT NULL,
	`metadata_uri` text NOT NULL,
	`token_id` text,
	`mint_tx_hash` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stickers_time_used" CHECK("stickers"."time_used" between 0 and 180),
	CONSTRAINT "stickers_size" CHECK("stickers"."width" > 0 and "stickers"."height" > 0),
	CONSTRAINT "stickers_content_hash" CHECK(length("stickers"."content_hash") = 66 and "stickers"."content_hash" like '0x%'),
	CONSTRAINT "stickers_minted" CHECK(("stickers"."token_id" is null) = ("stickers"."mint_tx_hash" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_number_unique` ON `stickers` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_token_id_unique` ON `stickers` (`token_id`);--> statement-breakpoint
CREATE INDEX `stickers_owner` ON `stickers` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stickers_artist` ON `stickers` (`artist_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stickers_created` ON `stickers` (`created_at`);--> statement-breakpoint
CREATE TABLE `ticket_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer NOT NULL,
	`price_yen` integer NOT NULL,
	`paid_mist` text NOT NULL,
	`tx_digest` text NOT NULL,
	`verified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_purchases_pack" CHECK("ticket_purchases"."tickets" > 0 and "ticket_purchases"."price_yen" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_purchases_tx_digest_unique` ON `ticket_purchases` (`tx_digest`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_user` ON `ticket_purchases` (`user_id`);--> statement-breakpoint
CREATE TABLE `ticket_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`ticket_day` text NOT NULL,
	`day_index` integer NOT NULL,
	`sticker_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_uses_day_index" CHECK("ticket_uses"."day_index" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day` ON `ticket_uses` (`user_id`,`ticket_day`,`day_index`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text,
	`line_display_name` text,
	`line_picture_url` text,
	`handle` text,
	`time_zone` text DEFAULT 'Asia/Tokyo' NOT NULL,
	`smart_account_address` text,
	`terms_accepted_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "users_line" CHECK(("users"."deleted_at" is null and "users"."line_user_id" is not null and "users"."line_display_name" is not null)
        or ("users"."deleted_at" is not null and "users"."line_user_id" is null and "users"."line_display_name" is null and "users"."line_picture_url" is null)),
	CONSTRAINT "users_smart_account_address" CHECK("users"."smart_account_address" is null
        or (length("users"."smart_account_address") = 42 and "users"."smart_account_address" = lower("users"."smart_account_address")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_line_user_id_unique` ON `users` (`line_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_smart_account_address_unique` ON `users` (`smart_account_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle` ON `users` (lower("handle"));