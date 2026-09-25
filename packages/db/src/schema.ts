import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// This database is the source of truth for every screen. Where World Chain holds the owner of
// record (the sticker NFT and the gift escrow), the columns marked "chain mirror" cache it, and
// chain_jobs tracks the transactions that keep the two in step. Screens never wait for the chain.

/** A CHECK that a column holds one of a closed set of values. */
const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in ${sql.raw(`(${values.map((v) => `'${v}'`).join(", ")})`)}`;

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const isBytes32 = (column: AnySQLiteColumn): SQL =>
  sql`length(${column}) = 66 and ${column} like '0x%'`;

// ------------------------------------------------------------------ people

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /** Unique, ENS-normalized (ENSIP-15); Japanese works. Null until the name label is stuck on. */
    handle: text("handle").unique(),
    /** IANA zone. Ticket days and streak days turn over at 4:00 here. */
    timeZone: text("time_zone").notNull().default("Asia/Tokyo"),
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    termsVersion: text("terms_version"),
    /** The Privy user (did:privy:…) holding this person's wallets; set once Privy has seen them. */
    privyUserId: text("privy_user_id").unique(),
    /** Cached from seal days, because a missed day lowers the streak instead of resetting it. */
    streakCurrent: integer("streak_current").notNull().default(0),
    streakBest: integer("streak_best").notNull().default(0),
    /** The last ticket day the streak counted (YYYY-MM-DD). */
    streakDay: text("streak_day"),
    hideFromLeaderboards: integer("hide_from_leaderboards", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    /** Set on withdrawal: the LINE data is deleted and the stickers keep their artist. */
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    check("users_streak", sql`${t.streakCurrent} >= 0 and ${t.streakBest} >= ${t.streakCurrent}`),
  ],
);

/** LINE Login identity. Its own table so withdrawal can delete LINE data without touching stickers. */
export const lineAccounts = sqliteTable("line_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** The verified ID token's `sub`; also the Official account's push target. */
  lineUserId: text("line_user_id").notNull().unique(),
  /** Refreshed from the verified ID token each session, never from the page. */
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  refreshedAt: integer("refreshed_at", { mode: "timestamp_ms" }).notNull(),
});

export const walletKinds = ["smart_account", "signer"] as const;

/**
 * Addresses of the Privy wallets a person controls. Stickers are minted to and claimed by the
 * smart account, never the signer.
 */
export const wallets = sqliteTable(
  "wallets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    chainId: integer("chain_id").notNull(),
    kind: text("kind", { enum: walletKinds }).notNull(),
    /** Lowercase 0x address. */
    address: text("address").notNull(),
    /** When the server confirmed the address with Privy. */
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("wallets_address").on(t.chainId, t.address),
    uniqueIndex("wallets_user_kind").on(t.userId, t.chainId, t.kind),
    check("wallets_kind", oneOf(t.kind, walletKinds)),
    check(
      "wallets_address_shape",
      sql`length(${t.address}) = 42 and ${t.address} = lower(${t.address})`,
    ),
  ],
);

// ------------------------------------------------------------------ stickers

/** A sealed sticker. Everything but the owner and the chain mirror is fixed at seal. */
export const stickers = sqliteTable(
  "stickers",
  {
    /** Server-made UUID. The NFT's sticker key is keccak256 of this string. */
    id: text("id").primaryKey(),
    /** The running number shown as No.0147, global across artists. */
    no: integer("no").notNull().unique(),
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id),
    /** Current holder. While a gift is open the sticker is in escrow on chain, and this stays the giver. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    sealedAt: integer("sealed_at", { mode: "timestamp_ms" }).notNull(),
    /** Seconds on the drawing clock, which pauses, so it's the client's figure. */
    timeSpentS: integer("time_spent_s").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** The cut line as an SVG path in image pixels: sheet packing, ticket stub outlines, glue ghosts. */
    outline: text("outline").notNull(),
    /** keccak256 of the sealed PNG; names its file. Chain mirror: StickerNFT.contentHashOf. */
    contentHash: text("content_hash").notNull().unique(),
    /** Immutable metadata JSON. Chain mirror: StickerNFT.tokenURI. */
    metadataUri: text("metadata_uri").notNull(),
    /** uint256 as a decimal string, assigned by the contract when the mint confirms. Chain mirror. */
    tokenId: text("token_id").unique(),
    mintedAt: integer("minted_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    index("stickers_artist").on(t.artistId, t.sealedAt),
    index("stickers_sealed").on(t.sealedAt),
    check("stickers_time_spent", sql`${t.timeSpentS} between 1 and 300`),
    check("stickers_size", sql`${t.width} > 0 and ${t.height} > 0`),
    check("stickers_content_hash", isBytes32(t.contentHash)),
    check("stickers_minted", sql`(${t.tokenId} is null) = (${t.mintedAt} is null)`),
  ],
);

export const ticketSources = ["free", "paid"] as const;

/**
 * A spent drawing ticket. It's spent at the first stroke and linked to the sticker at seal; an
 * abandoned drawing keeps its ticket spent with no sticker.
 */
export const ticketUses = sqliteTable(
  "ticket_uses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** YYYY-MM-DD in the person's time zone, turning over at 4:00. */
    ticketDay: text("ticket_day").notNull(),
    /** Order within the day; free tickets go first. */
    seq: integer("seq").notNull(),
    source: text("source", { enum: ticketSources }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    stickerId: text("sticker_id")
      .unique()
      .references(() => stickers.id),
  },
  (t) => [
    uniqueIndex("ticket_uses_day_seq").on(t.userId, t.ticketDay, t.seq),
    check("ticket_uses_source", oneOf(t.source, ticketSources)),
    // Three free tickets a day, enforced where a race can't slip past it.
    check(
      "ticket_uses_free_limit",
      sql`(${t.source} = 'free' and ${t.seq} between 0 and 2) or (${t.source} = 'paid' and ${t.seq} >= 3)`,
    ),
  ],
);

/**
 * A sticker's permanent spot in its holder's sticker tray. Sheets are packed from `seq`, so a
 * given sticker's spot stays blank and a sticker given back returns to it.
 */
export const stickerArrivals = sqliteTable(
  "sticker_arrivals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    seq: integer("seq").notNull(),
    /** At seal for your own stickers, at accept for gifts. */
    arrivedAt: integer("arrived_at", { mode: "timestamp_ms" }).notNull(),
    /** When its sheet was open as the pouch zipped shut; clears the NEW dot. */
    seenAt: integer("seen_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    uniqueIndex("sticker_arrivals_seq").on(t.userId, t.seq),
  ],
);

/**
 * Where a sticker sits on a person's sticker board. It outlives giving: the giver's placement
 * becomes the glue ghost while the receiver gets a placement of their own.
 */
export const boardPlacements = sqliteTable(
  "board_placements",
  {
    /** The board's owner; each person has one sticker board. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    /** False when the sticker is back in the sticker tray. */
    onBoard: integer("on_board", { mode: "boolean" }).notNull(),
    /** Center, as fractions of the board's field. */
    x: real("x").notNull(),
    y: real("y").notNull(),
    /** The sticker's long side as a fraction of the board's width. */
    scale: real("scale").notNull(),
    rotationDeg: real("rotation_deg").notNull(),
    z: integer("z").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    index("board_placements_sticker").on(t.stickerId),
    check("board_placements_position", sql`${t.x} between 0 and 1 and ${t.y} between 0 and 1`),
    check("board_placements_scale", sql`${t.scale} > 0 and ${t.scale} <= 1`),
  ],
);

// ------------------------------------------------------------------ giving and receiving

export const giftStates = ["packed", "sent", "accepted", "taken_out", "returned"] as const;
/** StickerGiftEscrow's GiftStatus, verbatim. */
export const escrowStatuses = [
  "missing",
  "pending",
  "claimed",
  "rejected",
  "expired_returned",
] as const;
export const giftRoutes = ["line_chat", "handle"] as const;

/**
 * One Giving of one sticker. Packing puts the sticker into the escrow; the card goes out through
 * LINE's one-friend picker (or straight to a handle); accepting claims it for the receiver.
 */
export const gifts = sqliteTable(
  "gifts",
  {
    /** Random bytes32 hex; the escrow's giftId. */
    id: text("id").primaryKey(),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    giverId: text("giver_id")
      .notNull()
      .references(() => users.id),
    sentVia: text("sent_via", { enum: giftRoutes }).notNull(),
    /** Known at send for a handle gift; set by the accept for a LINE chat gift. */
    recipientId: text("recipient_id").references(() => users.id),
    /**
     * keccak256 of the one-time claim token. The token itself lives only in the card's link; the
     * escrow holds this same commitment. Accept looks the gift up by it.
     */
    claimCommitment: text("claim_commitment").notNull().unique(),
    state: text("state", { enum: giftStates }).notNull(),
    /** Chain mirror: StickerGiftEscrow.gifts(id).status. */
    escrowStatus: text("escrow_status", { enum: escrowStatuses }).notNull().default("missing"),
    /** The escrow's expiry: after it, anyone can send the sticker back to the giver. */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
    /** LINE's picker reported the card sent. */
    sharedAt: integer("shared_at", { mode: "timestamp_ms" }),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    /** Taken out of the bag, or returned after expiry. */
    closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    // One open gift per sticker.
    uniqueIndex("gifts_open_sticker")
      .on(t.stickerId)
      .where(sql`${t.state} in ('packed', 'sent')`),
    uniqueIndex("gifts_idempotency").on(t.giverId, t.idempotencyKey),
    index("gifts_giver").on(t.giverId, t.state),
    index("gifts_recipient").on(t.recipientId, t.state),
    index("gifts_trail").on(t.stickerId, t.acceptedAt),
    check("gifts_id", isBytes32(t.id)),
    check("gifts_claim_commitment", isBytes32(t.claimCommitment)),
    check("gifts_state", oneOf(t.state, giftStates)),
    check("gifts_escrow_status", oneOf(t.escrowStatus, escrowStatuses)),
    check("gifts_sent_via", oneOf(t.sentVia, giftRoutes)),
    check("gifts_not_to_self", sql`${t.recipientId} is null or ${t.recipientId} <> ${t.giverId}`),
    check(
      "gifts_handle_has_recipient",
      sql`${t.sentVia} <> 'handle' or ${t.recipientId} is not null`,
    ),
    check(
      "gifts_accepted",
      sql`(${t.state} = 'accepted') = (${t.acceptedAt} is not null) and (${t.state} <> 'accepted' or ${t.recipientId} is not null)`,
    ),
    check("gifts_shared", sql`${t.state} not in ('sent', 'accepted') or ${t.sharedAt} is not null`),
    check(
      "gifts_closed",
      sql`(${t.state} in ('taken_out', 'returned')) = (${t.closedAt} is not null)`,
    ),
  ],
);

/** LIFF's getContext().type when the card was opened. */
export const openContexts = ["utou", "room", "group", "square_chat", "external", "none"] as const;
export const openOutcomes = [
  "accepted",
  "already_yours",
  "own_gift",
  "blocked_group",
  "already_opened",
  "gone",
] as const;

/** Every open of a gift card, including refused ones: shows why a card didn't work. */
export const giftOpens = sqliteTable(
  "gift_opens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    giftId: text("gift_id")
      .notNull()
      .references(() => gifts.id),
    /** Null when the card was opened before signing in. */
    userId: text("user_id").references(() => users.id),
    /** Reported by the page, so a hint for blocking group chats, never proof. */
    contextType: text("context_type", { enum: openContexts }).notNull(),
    outcome: text("outcome", { enum: openOutcomes }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("gift_opens_gift").on(t.giftId),
    check("gift_opens_context", oneOf(t.contextType, openContexts)),
    check("gift_opens_outcome", oneOf(t.outcome, openOutcomes)),
  ],
);

// ------------------------------------------------------------------ gratitude

export const gratitudeMethods = ["tap", "stroke", "shake"] as const;
export const comboEndReasons = ["empty", "hidden", "closed", "cap"] as const;

/**
 * One gratitude mini-game combo: the receiver of one accepted gift thanking its giver, at most
 * once per gift. The server replays `eventTimes` to get the total it stores.
 */
export const gratitude = sqliteTable(
  "gratitude",
  {
    id: text("id").primaryKey(),
    giftId: text("gift_id")
      .notNull()
      .unique()
      .references(() => gifts.id),
    /** Copied from the gift, for per-sticker glow and trail queries. */
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    /** The receiver, who plays the mini-game. */
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id),
    /** The giver. */
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id),
    /** The sticker's artist, when the giver isn't the artist. */
    artistUserId: text("artist_user_id").references(() => users.id),
    method: text("method", { enum: gratitudeMethods }).notNull(),
    /** Counted taps, passes or reversals: the hits. */
    events: integer("events").notNull(),
    /** The replayed gratitude, multiplier included. */
    total: integer("total").notNull(),
    /** Stored per record, so changing the artist's share never rewrites history. */
    toAmount: integer("to_amount").notNull(),
    artistAmount: integer("artist_amount").notNull(),
    peakMult: real("peak_mult").notNull(),
    /** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
    peakTier: integer("peak_tier").notNull(),
    durationMs: integer("duration_ms").notNull(),
    endReason: text("end_reason", { enum: comboEndReasons }).notNull(),
    /** Milliseconds after the first counted event: the replay. */
    eventTimes: text("event_times", { mode: "json" }).notNull().$type<number[]>(),
    /** Which tuning the replay ran with. */
    tuningVersion: text("tuning_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
    /** The giver watched the replay; drives the pink tag and the unseen feed. */
    seenByGiverAt: integer("seen_by_giver_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("gratitude_to").on(t.toUserId, t.recordedAt),
    index("gratitude_artist").on(t.artistUserId, t.recordedAt),
    index("gratitude_from").on(t.fromUserId, t.recordedAt),
    index("gratitude_sticker").on(t.stickerId),
    index("gratitude_unseen")
      .on(t.toUserId)
      .where(sql`${t.seenByGiverAt} is null`),
    check("gratitude_method", oneOf(t.method, gratitudeMethods)),
    check("gratitude_end_reason", oneOf(t.endReason, comboEndReasons)),
    check(
      "gratitude_split",
      sql`${t.toAmount} + ${t.artistAmount} = ${t.total} and ${t.toAmount} >= 0 and ${t.artistAmount} >= 0`,
    ),
    check("gratitude_artist", sql`${t.artistUserId} is not null or ${t.artistAmount} = 0`),
    check("gratitude_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
    check(
      "gratitude_events",
      sql`${t.events} between 1 and 120 and json_array_length(${t.eventTimes}) = ${t.events}`,
    ),
    check("gratitude_tier", sql`${t.peakTier} between 0 and 4`),
    check("gratitude_mult", sql`${t.peakMult} between 1 and 8`),
    check("gratitude_duration", sql`${t.durationMs} between 0 and 8000`),
  ],
);

// ------------------------------------------------------------------ outboxes

export const noticeKinds = ["gift_accepted", "gratitude", "gratitude_digest"] as const;
export const noticeStatuses = ["queued", "sent", "failed"] as const;

/**
 * Official account pushes through the Messaging API, written in the same transaction as the change
 * they announce. A 200 from LINE doesn't prove delivery, so the app shows the same news in-app.
 */
export const lineNotices = sqliteTable(
  "line_notices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind", { enum: noticeKinds }).notNull(),
    /** e.g. gift_accepted:{giftId}; one push per event, however often the worker retries. */
    dedupeKey: text("dedupe_key").notNull().unique(),
    payload: text("payload", { mode: "json" }).notNull(),
    /** Sent as X-Line-Retry-Key on every attempt. */
    retryKey: text("retry_key").notNull(),
    status: text("status", { enum: noticeStatuses }).notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }).notNull(),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    lineRequestId: text("line_request_id"),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => [
    index("line_notices_due").on(t.status, t.nextAttemptAt),
    index("line_notices_sent").on(t.sentAt),
    check("line_notices_kind", oneOf(t.kind, noticeKinds)),
    check("line_notices_status", oneOf(t.status, noticeStatuses)),
  ],
);

export const chainJobKinds = [
  "mint",
  "confirm_deposit",
  "claim",
  "reject",
  "return_expired",
] as const;
export const chainJobStatuses = ["queued", "submitted", "confirmed", "failed"] as const;

/**
 * World Chain transactions the server sends or watches: minting at seal, confirming the giver's
 * escrow deposit, claiming at accept, returning a sticker taken out of the bag or left past expiry.
 */
export const chainJobs = sqliteTable(
  "chain_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: chainJobKinds }).notNull(),
    /** e.g. mint:{stickerId}, claim:{giftId}; the contracts' own checks make a repeat revert harmlessly. */
    dedupeKey: text("dedupe_key").notNull().unique(),
    stickerId: text("sticker_id").references(() => stickers.id),
    giftId: text("gift_id").references(() => gifts.id),
    status: text("status", { enum: chainJobStatuses }).notNull().default("queued"),
    /** A transaction or user operation hash; the giver's own deposit is reported by the app. */
    txHash: text("tx_hash"),
    attempts: integer("attempts").notNull().default(0),
    /** A claim waits here until the receiver's smart account exists. */
    runAfter: integer("run_after", { mode: "timestamp_ms" }).notNull(),
    lastError: text("last_error"),
    createdAt: createdAt(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("chain_jobs_due").on(t.status, t.runAfter),
    check("chain_jobs_kind", oneOf(t.kind, chainJobKinds)),
    check("chain_jobs_status", oneOf(t.status, chainJobStatuses)),
    check(
      "chain_jobs_subject",
      sql`(${t.kind} = 'mint' and ${t.stickerId} is not null) or (${t.kind} <> 'mint' and ${t.giftId} is not null)`,
    ),
    check(
      "chain_jobs_confirmed",
      sql`(${t.status} = 'confirmed') = (${t.confirmedAt} is not null)`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Sticker = typeof stickers.$inferSelect;
export type NewSticker = typeof stickers.$inferInsert;
export type Gift = typeof gifts.$inferSelect;
export type Gratitude = typeof gratitude.$inferSelect;
export type BoardPlacement = typeof boardPlacements.$inferSelect;
