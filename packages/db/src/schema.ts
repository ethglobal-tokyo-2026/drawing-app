import { sql, type SQL } from "drizzle-orm";
import {
  blob,
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

// World Chain is the owner of record: StickerNFT says who holds a sticker, and StickerGiftEscrow
// says where each gift stands. This database keeps what the chain doesn't know (LINE, the Sticker
// Board, gratitude, tickets) and a small index of chain state that screens list and filter by:
// stickers.token_id, stickers.owner_id and gifts.escrow_status. Each column says when it's set;
// docs/superpowers/specs/2026-09-25-database-schema.md walks through the flows that set them.

/** The database's clock, in milliseconds. */
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

/**
 * created_at is set once, by the database, on insert. updated_at starts equal and moves on every
 * update: Drizzle sets it in the statement, and each table's updated_at trigger (a custom
 * migration) catches updates made outside Drizzle.
 */
const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now)
    .$onUpdate(() => now),
});

/** A CHECK that a column holds one of a closed set of values. */
const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in ${sql.raw(`(${values.map((v) => `'${v}'`).join(", ")})`)}`;

const isBytes32 = (column: AnySQLiteColumn): SQL =>
  sql`length(${column}) = 66 and ${column} like '0x%'`;

// ------------------------------------------------------------------ people

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /**
     * The verified ID token's `sub`, set at the first sign-in. Finds a returning person, and is the
     * Official account's push target. Cleared on withdrawal.
     */
    lineUserId: text("line_user_id").unique(),
    /**
     * From the verified ID token, refreshed at every sign-in. LINE gives each person only their own
     * profile, so this is how other people see them. Cleared on withdrawal.
     */
    lineDisplayName: text("line_display_name"),
    linePictureUrl: text("line_picture_url"),
    /**
     * Unique ignoring letter case. Set at the first sign-in to the LINE name when no one has it,
     * otherwise from the handle prompt; null only until the prompt is answered.
     */
    handle: text("handle"),
    /** IANA zone from the device at the first sign-in. Ticket days turn over at 4:00 here. */
    timeZone: text("time_zone").notNull().default("Asia/Tokyo"),
    /**
     * The Privy smart wallet on World Chain, lowercase. Stickers are minted and claimed to it, and it
     * maps chain events back to a person. Set from Privy the first time the server needs it.
     */
    smartAccountAddress: text("smart_account_address").unique(),
    /** Set on the first action, which carries the terms line. */
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_handle").on(sql`lower(${t.handle})`),
    check(
      "users_line",
      sql`(${t.withdrawnAt} is null and ${t.lineUserId} is not null and ${t.lineDisplayName} is not null)
        or (${t.withdrawnAt} is not null and ${t.lineUserId} is null and ${t.lineDisplayName} is null and ${t.linePictureUrl} is null)`,
    ),
    check(
      "users_smart_account_address",
      sql`${t.smartAccountAddress} is null
        or (length(${t.smartAccountAddress}) = 42 and ${t.smartAccountAddress} = lower(${t.smartAccountAddress}))`,
    ),
  ],
);

// ------------------------------------------------------------------ stickers

/** A sealed sticker. Everything but owner_id and the mint is fixed at seal; created_at is the seal. */
export const stickers = sqliteTable(
  "stickers",
  {
    /** Made by the server at seal. The NFT's sticker key is keccak256 of this string. */
    id: text("id").primaryKey(),
    /** The running number shown as No.0147, counted across everyone at seal. */
    number: integer("number").notNull().unique(),
    /** The Original Artist. */
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id),
    /**
     * Who holds it: the artist at seal, then each receiver at receive. Indexes the NFT's owner as a
     * person, a few seconds ahead of the chain while a claim lands.
     */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    /** Seconds on the drawing clock, which pauses. 0 if sealed within the first second. */
    timeUsed: integer("time_used").notNull(),
    /** The sticker image's size; the mask and resin masks share it. */
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** The cut line as an SVG path in image pixels. */
    outline: text("outline").notNull(),
    /** keccak256 of the sticker PNG. Names its five image files, and is passed to the mint. */
    contentHash: text("content_hash").notNull(),
    /** The metadata JSON's IPFS address, known at seal. Passed to the mint as its tokenURI. */
    metadataUri: text("metadata_uri").notNull(),
    /** uint256 as decimal text. Set with mint_tx_hash when the mint lands. */
    tokenId: text("token_id").unique(),
    mintTxHash: text("mint_tx_hash"),
    ...timestamps(),
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    index("stickers_artist").on(t.artistId, t.createdAt),
    index("stickers_created").on(t.createdAt),
    check("stickers_time_used", sql`${t.timeUsed} between 0 and 180`),
    check("stickers_size", sql`${t.width} > 0 and ${t.height} > 0`),
    check("stickers_content_hash", isBytes32(t.contentHash)),
    check("stickers_minted", sql`(${t.tokenId} is null) = (${t.mintTxHash} is null)`),
  ],
);

/**
 * How a sticker was drawn, for its timelapse: inserted with the sticker at seal. Its own table so
 * board and tray reads never load it.
 */
export const stickerTimelapses = sqliteTable("sticker_timelapses", {
  stickerId: text("sticker_id")
    .primaryKey()
    .references(() => stickers.id),
  /**
   * Gzipped JSON with a format version: the ink canvas's size, where the sticker sits on it, and
   * every op in the order drawn (the app's strokes and fills, with their times).
   */
  ops: blob("ops", { mode: "buffer" }).notNull(),
  ...timestamps(),
});

/**
 * A spent ticket: inserted at the first stroke, linked to its sticker at seal. An abandoned
 * drawing keeps its ticket spent with no sticker.
 */
export const ticketUses = sqliteTable(
  "ticket_uses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** YYYY-MM-DD in the person's zone, turning over at 4:00. */
    ticketDay: text("ticket_day").notNull(),
    /** Order within the day, from 0. Free tickets go first, so 0–2 are the day's free ones. */
    dayIndex: integer("day_index").notNull(),
    stickerId: text("sticker_id")
      .unique()
      .references(() => stickers.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ticket_uses_day").on(t.userId, t.ticketDay, t.dayIndex),
    check("ticket_uses_day_index", sql`${t.dayIndex} >= 0`),
  ],
);

/** Tickets bought with Sui. They count once verified_at is set. */
export const ticketPurchases = sqliteTable(
  "ticket_purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tickets: integer("tickets").notNull(),
    /** The price in MIST, as decimal text. */
    priceMist: text("price_mist").notNull(),
    /** The Sui transaction digest; one payment counts once. */
    txDigest: text("tx_digest").notNull().unique(),
    /** Set once the server has checked the payment on Sui (at once for the mock payment). */
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("ticket_purchases_user").on(t.userId),
    check("ticket_purchases_tickets", sql`${t.tickets} > 0`),
  ],
);

/**
 * A sticker's placement on a person's Sticker Board: on the board, or waiting in its sticker tray.
 * Inserted when the sticker first reaches them (at seal, or at receive), so created_at orders the
 * tray. It stays after they give the sticker away: the board keeps its outline, and its spot on
 * the sticker sheet stays empty.
 */
export const stickerPlacements = sqliteTable(
  "sticker_placements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    // Null until the owner's board first lands the sticker, then moved by every drag, resize, turn
    // and Remove. The app's `placement`: { on, x, y, s, r, z }.
    /** False while it waits in the sticker tray; its last spot is kept. */
    onBoard: integer("on_board", { mode: "boolean" }),
    /** Centre, as fractions of the board's field. */
    x: real("x"),
    y: real("y"),
    /** The long side, as a fraction of the board's width. */
    scale: real("scale"),
    /** Clockwise, in degrees. */
    rotation: real("rotation"),
    /** Stacking order; higher is on top. */
    z: integer("z"),
    /** The tray was closed with its sticker sheet open. Null shows the NEW badge. */
    seenAt: integer("seen_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "sticker_placements_placement",
      sql`(${t.onBoard} is null and ${t.x} is null and ${t.y} is null and ${t.scale} is null and ${t.rotation} is null and ${t.z} is null)
        or (${t.onBoard} is not null and ${t.x} between 0 and 1 and ${t.y} between 0 and 1
          and ${t.scale} > 0 and ${t.scale} <= 1 and ${t.rotation} is not null and ${t.z} is not null)`,
    ),
  ],
);

// ------------------------------------------------------------------ Giving and Receiving

/** The app's gift states, with Receiving's. */
export const giftStatuses = ["packed", "sent", "received", "taken_out"] as const;
/** StickerGiftEscrow's GiftStatus, verbatim. */
export const escrowStatuses = [
  "missing",
  "pending",
  "claimed",
  "rejected",
  "expired_returned",
] as const;

/**
 * One Giving of one sticker. Inserted when the sticker is packaged; the giver's smart wallet then
 * sends it to the escrow. status says where it stands, and each step also keeps its own date.
 */
export const gifts = sqliteTable(
  "gifts",
  {
    /** The escrow's giftId: random bytes32 from createGiftClaim. */
    id: text("id").primaryKey(),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    giverId: text("giver_id")
      .notNull()
      .references(() => users.id),
    /**
     * keccak256 of the Gift Claim Token, which only the gift link carries. Receiving finds the gift
     * by it; the escrow holds the same value but can't be searched by it.
     */
    claimCommitment: text("claim_commitment").notNull().unique(),
    status: text("status", { enum: giftStatuses }).notNull().default("packed"),
    /**
     * StickerGiftEscrow.gifts(id).status: `pending` once the deposit is read and checked, `claimed`
     * or `rejected` when our claim or reject lands.
     */
    escrowStatus: text("escrow_status", { enum: escrowStatuses }).notNull().default("missing"),
    /** LINE's picker reported the gift message sent. */
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    /** Taken back out before sending: by the giver, or by the server when the deposit didn't match. */
    takenOutAt: integer("taken_out_at", { mode: "timestamp_ms" }),
    /** Set with received_at when someone receives it. */
    receiverId: text("receiver_id").references(() => users.id),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }),
    /** Our relayer's claimGift, set when sent. */
    claimTxHash: text("claim_tx_hash"),
    /** Our relayer's rejectGift, set when sent. */
    rejectTxHash: text("reject_tx_hash"),
    /** The Official account's "Bob accepted your sticker ♡" push went out, or was given up on. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    // One gift per sticker at a time: while it's in the bag or sent, and while the escrow still holds
    // the NFT, since the escrow refuses a second deposit of the same token.
    uniqueIndex("gifts_one_per_sticker")
      .on(t.stickerId)
      .where(sql`${t.status} in ('packed', 'sent') or ${t.escrowStatus} = 'pending'`),
    index("gifts_giver").on(t.giverId, t.status),
    index("gifts_receiver").on(t.receiverId),
    index("gifts_transfer_trail").on(t.stickerId, t.receivedAt),
    index("gifts_received").on(t.receivedAt),
    index("gifts_escrow_open")
      .on(t.escrowStatus)
      .where(sql`${t.escrowStatus} in ('missing', 'pending')`),
    index("gifts_push_due")
      .on(t.receivedAt)
      .where(sql`${t.status} = 'received' and ${t.pushedToGiverAt} is null`),
    check("gifts_id", isBytes32(t.id)),
    check("gifts_claim_commitment", isBytes32(t.claimCommitment)),
    check("gifts_status", oneOf(t.status, giftStatuses)),
    check("gifts_escrow_status", oneOf(t.escrowStatus, escrowStatuses)),
    // Each status has its dates, and no others. A received gift may lack sent_at: the message can
    // go out while the picker never reports back.
    check(
      "gifts_status_dates",
      sql`(${t.status} = 'packed' and ${t.sentAt} is null and ${t.receivedAt} is null and ${t.takenOutAt} is null)
        or (${t.status} = 'sent' and ${t.sentAt} is not null and ${t.receivedAt} is null and ${t.takenOutAt} is null)
        or (${t.status} = 'received' and ${t.receivedAt} is not null and ${t.takenOutAt} is null)
        or (${t.status} = 'taken_out' and ${t.takenOutAt} is not null and ${t.sentAt} is null and ${t.receivedAt} is null)`,
    ),
    // What the escrow can hold at each status. Nothing is sent or received before the deposit.
    check(
      "gifts_status_escrow",
      sql`(${t.status} = 'packed' and ${t.escrowStatus} in ('missing', 'pending'))
        or (${t.status} = 'sent' and ${t.escrowStatus} = 'pending')
        or (${t.status} = 'received' and ${t.escrowStatus} in ('pending', 'claimed'))
        or (${t.status} = 'taken_out' and ${t.escrowStatus} in ('missing', 'pending', 'rejected'))`,
    ),
    check("gifts_receiver", sql`(${t.receiverId} is null) = (${t.receivedAt} is null)`),
    check("gifts_not_to_self", sql`${t.receiverId} is null or ${t.receiverId} <> ${t.giverId}`),
    check(
      "gifts_transactions",
      sql`(${t.claimTxHash} is null or ${t.status} = 'received')
        and (${t.rejectTxHash} is null or ${t.status} = 'taken_out')`,
    ),
    check("gifts_pushed", sql`${t.pushedToGiverAt} is null or ${t.status} = 'received'`),
  ],
);

// ------------------------------------------------------------------ gratitude

export const gratitudeMethods = ["tap", "stroke", "shake"] as const;

/**
 * One gratitude Mini-game combo: the receiver thanking the giver for one received gift, at most
 * once. The mini-game's GratitudeResult, recorded; created_at is when. Columns hold what's
 * queried; everything a replay needs is in `replay`.
 */
export const gratitude = sqliteTable(
  "gratitude",
  {
    /** The received gift it thanks; the giver, receiver and sticker come from it. */
    giftId: text("gift_id")
      .primaryKey()
      .references(() => gifts.id),
    /** Made on the device at the first hit. The same key again gets the stored record. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    /** The method the combo ended in: Inspired is tap, Magic is stroke or shake. */
    method: text("method", { enum: gratitudeMethods }).notNull(),
    /** Hits: counted taps, stroke passes or shake reversals. One tap that sends is 1. */
    hits: integer("hits").notNull(),
    /** The server's replayed gratitude, multiplier included. */
    total: integer("total").notNull(),
    peakMult: real("peak_mult").notNull(),
    /** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
    peakTier: integer("peak_tier").notNull(),
    /**
     * The Original Artist's 20%, out of the giver's part, when the Original Artist is neither the
     * giver nor the receiver; otherwise 0. Stored, so changing the share never rewrites history.
     */
    originalArtistGratitudeShare: integer("original_artist_gratitude_share").notNull(),
    /** GAME_CONFIG's version, which the server replayed with; every version stays in code for replays. */
    gameConfigVersion: text("game_config_version").notNull(),
    /**
     * Gzipped JSON with a format version: every touch with its time and position and whether it
     * counted, stroke paths, shake reversals, where the method switched, the duration and end
     * reason (sent, empty, cap, hidden, closed), the random seed for pop-ins and particles, and the
     * thanker's intensity. Decodes to the result's hitTimes.
     */
    replay: blob("replay", { mode: "buffer" }).notNull(),
    /** The giver watched the replay (the pink tag's unseen feed). */
    seenByGiverAt: integer("seen_by_giver_at", { mode: "timestamp_ms" }),
    /** Its push, or the digest that included it, went out or was given up on. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("gratitude_created").on(t.createdAt),
    index("gratitude_push_due")
      .on(t.createdAt)
      .where(sql`${t.pushedToGiverAt} is null`),
    check("gratitude_method", oneOf(t.method, gratitudeMethods)),
    check("gratitude_hits", sql`${t.hits} between 1 and 120`),
    check(
      "gratitude_original_artist_share",
      sql`${t.originalArtistGratitudeShare} between 0 and ${t.total}`,
    ),
    check("gratitude_tier", sql`${t.peakTier} between 0 and 4`),
    check("gratitude_mult", sql`${t.peakMult} between 1 and 8`),
  ],
);

export type User = typeof users.$inferSelect;
export type Sticker = typeof stickers.$inferSelect;
export type NewSticker = typeof stickers.$inferInsert;
export type StickerPlacement = typeof stickerPlacements.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type Gratitude = typeof gratitude.$inferSelect;
