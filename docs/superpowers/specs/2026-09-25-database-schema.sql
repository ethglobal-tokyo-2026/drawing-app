-- For review only: drizzle-kit's output for packages/db/src/schema.ts at 4f3cc46, next to the
-- proposal that explains it. The real first migration is generated once the schema is approved,
-- and this file goes then.

CREATE TABLE `board_placements` (
	`user_id` text NOT NULL,
	`sticker_id` text NOT NULL,
	`on_board` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`scale` real NOT NULL,
	`rotation` real NOT NULL,
	`z` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `sticker_id`),
	FOREIGN KEY (`user_id`,`sticker_id`) REFERENCES `sticker_arrivals`(`user_id`,`sticker_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "board_placements_position" CHECK("board_placements"."x" between 0 and 1 and "board_placements"."y" between 0 and 1),
	CONSTRAINT "board_placements_scale" CHECK("board_placements"."scale" > 0 and "board_placements"."scale" <= 1)
);
--> statement-breakpoint
CREATE INDEX `board_placements_sticker` ON `board_placements` (`sticker_id`);--> statement-breakpoint
CREATE TABLE `chain_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`sticker_id` text,
	`gift_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`tx_hash` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run_after` integer NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chain_jobs_kind" CHECK("chain_jobs"."kind" in ('mint', 'confirm_deposit', 'claim', 'reject', 'return_expired')),
	CONSTRAINT "chain_jobs_status" CHECK("chain_jobs"."status" in ('queued', 'submitted', 'confirmed', 'failed', 'cancelled')),
	CONSTRAINT "chain_jobs_subject" CHECK(("chain_jobs"."kind" = 'mint' and "chain_jobs"."sticker_id" is not null) or ("chain_jobs"."kind" <> 'mint' and "chain_jobs"."gift_id" is not null)),
	CONSTRAINT "chain_jobs_confirmed" CHECK(("chain_jobs"."status" = 'confirmed') = ("chain_jobs"."confirmed_at" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chain_jobs_dedupe_key_unique` ON `chain_jobs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `chain_jobs_due` ON `chain_jobs` (`status`,`run_after`);--> statement-breakpoint
CREATE INDEX `chain_jobs_sticker` ON `chain_jobs` (`sticker_id`);--> statement-breakpoint
CREATE INDEX `chain_jobs_gift` ON `chain_jobs` (`gift_id`);--> statement-breakpoint
CREATE TABLE `gift_opens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gift_id` text NOT NULL,
	`user_id` text,
	`context_type` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gift_opens_context" CHECK("gift_opens"."context_type" in ('utou', 'room', 'group', 'square_chat', 'external', 'none')),
	CONSTRAINT "gift_opens_outcome" CHECK("gift_opens"."outcome" in ('accepted', 'already_yours', 'own_gift', 'blocked_group', 'already_opened', 'not_ready', 'gone'))
);
--> statement-breakpoint
CREATE INDEX `gift_opens_gift` ON `gift_opens` (`gift_id`);--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sticker_id` text NOT NULL,
	`giver_id` text NOT NULL,
	`sent_via` text NOT NULL,
	`recipient_id` text,
	`claim_commitment` text NOT NULL,
	`state` text NOT NULL,
	`not_sent_reason` text,
	`send_error` text,
	`escrow_status` text DEFAULT 'missing' NOT NULL,
	`expires_at` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`packed_at` integer NOT NULL,
	`sent_at` integer,
	`accepted_at` integer,
	`accept_seen_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`giver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gifts_id" CHECK(length("gifts"."id") = 66 and "gifts"."id" like '0x%'),
	CONSTRAINT "gifts_claim_commitment" CHECK(length("gifts"."claim_commitment") = 66 and "gifts"."claim_commitment" like '0x%'),
	CONSTRAINT "gifts_state" CHECK("gifts"."state" in ('packed', 'sent', 'accepted', 'not_sent', 'returned')),
	CONSTRAINT "gifts_not_sent_reason" CHECK("gifts"."not_sent_reason" in ('picker_cancelled', 'send_failed', 'taken_out', 'abandoned', 'deposit_failed', 'deposit_mismatch')),
	CONSTRAINT "gifts_escrow_status" CHECK("gifts"."escrow_status" in ('missing', 'pending', 'claimed', 'rejected', 'expired_returned')),
	CONSTRAINT "gifts_sent_via" CHECK("gifts"."sent_via" in ('line_chat', 'handle')),
	CONSTRAINT "gifts_not_to_self" CHECK("gifts"."recipient_id" is null or "gifts"."recipient_id" <> "gifts"."giver_id"),
	CONSTRAINT "gifts_handle_has_recipient" CHECK("gifts"."sent_via" <> 'handle' or "gifts"."recipient_id" is not null),
	CONSTRAINT "gifts_escrow_matches_state" CHECK(("gifts"."state" = 'packed' and "gifts"."escrow_status" in ('missing', 'pending'))
        or ("gifts"."state" = 'sent' and "gifts"."escrow_status" = 'pending')
        or ("gifts"."state" = 'accepted' and "gifts"."escrow_status" in ('pending', 'claimed'))
        or ("gifts"."state" = 'not_sent' and "gifts"."escrow_status" in ('missing', 'pending', 'rejected'))
        or ("gifts"."state" = 'returned' and "gifts"."escrow_status" in ('pending', 'rejected', 'expired_returned'))),
	CONSTRAINT "gifts_not_sent" CHECK(("gifts"."state" = 'not_sent') = ("gifts"."not_sent_reason" is not null)
        and ("gifts"."send_error" is null or "gifts"."state" = 'not_sent')
        and ("gifts"."state" <> 'not_sent' or "gifts"."sent_at" is null)),
	CONSTRAINT "gifts_accepted" CHECK(("gifts"."state" <> 'accepted' or ("gifts"."accepted_at" is not null and "gifts"."recipient_id" is not null))
        and ("gifts"."accepted_at" is null or "gifts"."state" in ('accepted', 'returned'))),
	CONSTRAINT "gifts_sent" CHECK("gifts"."state" <> 'sent' or "gifts"."sent_at" is not null),
	CONSTRAINT "gifts_closed" CHECK(("gifts"."state" in ('not_sent', 'returned')) = ("gifts"."closed_at" is not null)),
	CONSTRAINT "gifts_accept_seen" CHECK("gifts"."accept_seen_at" is null or "gifts"."accepted_at" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_claim_commitment_unique` ON `gifts` (`claim_commitment`);--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_one_at_a_time` ON `gifts` (`sticker_id`) WHERE "gifts"."state" in ('packed', 'sent') or "gifts"."escrow_status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_parties` ON `gifts` (`id`,`sticker_id`,`recipient_id`,`giver_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gifts_idempotency` ON `gifts` (`giver_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `gifts_giver` ON `gifts` (`giver_id`,`state`);--> statement-breakpoint
CREATE INDEX `gifts_recipient` ON `gifts` (`recipient_id`,`state`);--> statement-breakpoint
CREATE INDEX `gifts_transfer_trail` ON `gifts` (`sticker_id`,`accepted_at`);--> statement-breakpoint
CREATE INDEX `gifts_accepted` ON `gifts` (`accepted_at`);--> statement-breakpoint
CREATE TABLE `gratitude` (
	`id` text PRIMARY KEY NOT NULL,
	`gift_id` text NOT NULL,
	`sticker_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text NOT NULL,
	`artist_user_id` text,
	`method` text NOT NULL,
	`switched_at_event` integer,
	`events` integer NOT NULL,
	`total` integer NOT NULL,
	`to_amount` integer NOT NULL,
	`artist_amount` integer NOT NULL,
	`peak_mult` real NOT NULL,
	`peak_tier` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`end_reason` text NOT NULL,
	`event_times` text NOT NULL,
	`tuning_version` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`seen_by_giver_at` integer,
	FOREIGN KEY (`gift_id`,`sticker_id`,`from_user_id`,`to_user_id`) REFERENCES `gifts`(`id`,`sticker_id`,`recipient_id`,`giver_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`,`artist_user_id`) REFERENCES `stickers`(`id`,`artist_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gratitude_method" CHECK("gratitude"."method" in ('tap', 'stroke', 'shake')),
	CONSTRAINT "gratitude_end_reason" CHECK("gratitude"."end_reason" in ('empty', 'hidden', 'closed', 'cap')),
	CONSTRAINT "gratitude_split" CHECK("gratitude"."to_amount" + "gratitude"."artist_amount" = "gratitude"."total" and "gratitude"."to_amount" >= 0 and "gratitude"."artist_amount" >= 0),
	CONSTRAINT "gratitude_artist_amount" CHECK(("gratitude"."artist_user_id" is null and "gratitude"."artist_amount" = 0)
        or ("gratitude"."artist_user_id" is not null and "gratitude"."artist_user_id" <> "gratitude"."from_user_id" and "gratitude"."artist_user_id" <> "gratitude"."to_user_id")),
	CONSTRAINT "gratitude_not_self" CHECK("gratitude"."from_user_id" <> "gratitude"."to_user_id"),
	CONSTRAINT "gratitude_events" CHECK("gratitude"."events" between 1 and 120 and json_array_length("gratitude"."event_times") = "gratitude"."events"),
	CONSTRAINT "gratitude_switch" CHECK(("gratitude"."method" = 'tap') = ("gratitude"."switched_at_event" is null)
        and ("gratitude"."switched_at_event" is null or "gratitude"."switched_at_event" between 0 and "gratitude"."events" - 1)),
	CONSTRAINT "gratitude_tier" CHECK("gratitude"."peak_tier" between 0 and 4),
	CONSTRAINT "gratitude_mult" CHECK("gratitude"."peak_mult" between 1 and 8),
	CONSTRAINT "gratitude_duration" CHECK("gratitude"."duration_ms" between 0 and 8000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gratitude_gift_id_unique` ON `gratitude` (`gift_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gratitude_idempotency_key_unique` ON `gratitude` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `gratitude_to` ON `gratitude` (`to_user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `gratitude_artist` ON `gratitude` (`artist_user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `gratitude_from` ON `gratitude` (`from_user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `gratitude_sticker` ON `gratitude` (`sticker_id`);--> statement-breakpoint
CREATE INDEX `gratitude_recorded` ON `gratitude` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `gratitude_unseen` ON `gratitude` (`to_user_id`) WHERE "gratitude"."seen_by_giver_at" is null;--> statement-breakpoint
CREATE TABLE `line_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`picture_url` text,
	`refreshed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `line_accounts_line_user_id_unique` ON `line_accounts` (`line_user_id`);--> statement-breakpoint
CREATE TABLE `line_notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`payload` text NOT NULL,
	`retry_key` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`sent_at` integer,
	`line_request_id` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "line_notices_kind" CHECK("line_notices"."kind" in ('gift_accepted', 'gratitude', 'gratitude_digest')),
	CONSTRAINT "line_notices_status" CHECK("line_notices"."status" in ('queued', 'sent', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `line_notices_dedupe_key_unique` ON `line_notices` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `line_notices_due` ON `line_notices` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `line_notices_sent` ON `line_notices` (`sent_at`);--> statement-breakpoint
CREATE TABLE `sticker_arrivals` (
	`user_id` text NOT NULL,
	`sticker_id` text NOT NULL,
	`seq` integer NOT NULL,
	`arrived_at` integer NOT NULL,
	`seen_at` integer,
	PRIMARY KEY(`user_id`, `sticker_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sticker_arrivals_seq` ON `sticker_arrivals` (`user_id`,`seq`);--> statement-breakpoint
CREATE TABLE `stickers` (
	`id` text PRIMARY KEY NOT NULL,
	`no` integer NOT NULL,
	`artist_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`sealed_at` integer NOT NULL,
	`time_used` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`outline` text NOT NULL,
	`content_hash` text NOT NULL,
	`metadata_uri` text NOT NULL,
	`token_id` text,
	`minted_at` integer,
	FOREIGN KEY (`artist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stickers_time_used" CHECK("stickers"."time_used" between 0 and 300),
	CONSTRAINT "stickers_size" CHECK("stickers"."width" > 0 and "stickers"."height" > 0),
	CONSTRAINT "stickers_content_hash" CHECK(length("stickers"."content_hash") = 66 and "stickers"."content_hash" like '0x%'),
	CONSTRAINT "stickers_minted" CHECK(("stickers"."token_id" is null) = ("stickers"."minted_at" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_no_unique` ON `stickers` (`no`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_token_id_unique` ON `stickers` (`token_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stickers_id_artist` ON `stickers` (`id`,`artist_id`);--> statement-breakpoint
CREATE INDEX `stickers_owner` ON `stickers` (`owner_id`);--> statement-breakpoint
CREATE INDEX `stickers_artist` ON `stickers` (`artist_id`,`sealed_at`);--> statement-breakpoint
CREATE INDEX `stickers_sealed` ON `stickers` (`sealed_at`);--> statement-breakpoint
CREATE INDEX `stickers_content_hash` ON `stickers` (`content_hash`);--> statement-breakpoint
CREATE TABLE `ticket_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tickets` integer NOT NULL,
	`price_mist` text NOT NULL,
	`tx_digest` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_purchases_tickets" CHECK("ticket_purchases"."tickets" > 0),
	CONSTRAINT "ticket_purchases_status" CHECK("ticket_purchases"."status" in ('pending', 'confirmed', 'failed')),
	CONSTRAINT "ticket_purchases_confirmed" CHECK(("ticket_purchases"."status" = 'confirmed') = ("ticket_purchases"."confirmed_at" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_purchases_tx_digest_unique` ON `ticket_purchases` (`tx_digest`);--> statement-breakpoint
CREATE INDEX `ticket_purchases_user` ON `ticket_purchases` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `ticket_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`ticket_day` text NOT NULL,
	`seq` integer NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`sticker_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`,`user_id`) REFERENCES `stickers`(`id`,`artist_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_uses_source" CHECK("ticket_uses"."source" in ('free', 'paid')),
	CONSTRAINT "ticket_uses_free_limit" CHECK(("ticket_uses"."source" = 'free' and "ticket_uses"."seq" between 0 and 2) or ("ticket_uses"."source" = 'paid' and "ticket_uses"."seq" >= 3))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_sticker_id_unique` ON `ticket_uses` (`sticker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_uses_day_seq` ON `ticket_uses` (`user_id`,`ticket_day`,`seq`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text,
	`time_zone` text DEFAULT 'Asia/Tokyo' NOT NULL,
	`terms_accepted_at` integer,
	`terms_version` text,
	`privy_user_id` text,
	`streak_current` integer DEFAULT 0 NOT NULL,
	`streak_best` integer DEFAULT 0 NOT NULL,
	`streak_day` text,
	`hide_from_leaderboards` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`withdrawn_at` integer,
	CONSTRAINT "users_streak" CHECK("users"."streak_current" >= 0 and "users"."streak_best" >= "users"."streak_current")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_privy_user_id_unique` ON `users` (`privy_user_id`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`chain_id` integer NOT NULL,
	`kind` text NOT NULL,
	`address` text NOT NULL,
	`verified_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "wallets_kind" CHECK("wallets"."kind" in ('smart_account', 'signer_eoa')),
	CONSTRAINT "wallets_address_shape" CHECK(length("wallets"."address") = 42 and "wallets"."address" = lower("wallets"."address"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_address` ON `wallets` (`chain_id`,`address`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_user_kind` ON `wallets` (`user_id`,`chain_id`,`kind`);