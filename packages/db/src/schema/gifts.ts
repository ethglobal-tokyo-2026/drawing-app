import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { isBytes32, oneOf, timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/** The app's gift states, Receiving's, and the escrow's return after GIFT_EXPIRY_MS. */
export const giftStatuses = ["packed", "sent", "received", "taken_out", "returned"] as const;
/** StickerGiftEscrow's GiftStatus, verbatim. */
export const escrowStatuses = [
  "missing",
  "pending",
  "claimed",
  "rejected",
  "expired_returned",
] as const;

/**
 * One Giving of one sticker. Inserted at Packaging; the giver's smart wallet then sends the sticker
 * to the escrow. status says where it stands, and each step keeps its own date. The giver can take
 * it back until it's received, expired or not.
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
     * once Receiving's claim lands, and `rejected` or `expired_returned` as a take-out or the
     * expiry sweep reads it.
     */
    escrowStatus: text("escrow_status", { enum: escrowStatuses }).notNull().default("missing"),
    /**
     * The escrow's expiry, GIFT_EXPIRY_MS after Packaging; the deposit carries it. Receiving is
     * refused after it; the giver can still take the gift out until the expiry sweep sends it back.
     */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    /** LINE's picker reported the Gift Message sent. */
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    /**
     * Taken back before anyone received it, from the bag or after sending; or by the server, for a
     * deposit that didn't match.
     */
    takenOutAt: integer("taken_out_at", { mode: "timestamp_ms" }),
    /** Set with received_at when someone receives it. */
    receiverId: text("receiver_id").references(() => users.id),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }),
    /**
     * Who it waits for before anyone receives it: the person the giver picked in the app, or else
     * the first person to open its Gift Message's link. It shows on their board, where they can
     * receive it without the link. A stopgap until smart account permissions can authorize them on
     * chain.
     */
    forUserId: text("for_user_id").references(() => users.id),
    /** The expiry passed before a receive landed on chain, so the escrow returned it to the giver. */
    returnedAt: integer("returned_at", { mode: "timestamp_ms" }),
    /** Our relayer's claimGift, set with received_at once it lands. */
    claimTxHash: text("claim_tx_hash"),
    /**
     * The Official account's message telling the giver it was received went out, or was given up
     * on. Its retry key is made from the gift, so a retry can't send it twice; retries stop while
     * LINE still keeps the key, and set this anyway.
     */
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
    index("gifts_for_user").on(t.forUserId, t.status),
    index("gifts_transfer_trail").on(t.stickerId, t.receivedAt),
    index("gifts_received").on(t.receivedAt),
    // The giver's messages still to send, which the retry sweep reads.
    index("gifts_push_due")
      .on(t.receivedAt)
      .where(sql`${t.status} = 'received' and ${t.pushedToGiverAt} is null`),
    check("gifts_id", isBytes32(t.id)),
    check("gifts_claim_commitment", isBytes32(t.claimCommitment)),
    check("gifts_status", oneOf(t.status, giftStatuses)),
    check("gifts_escrow_status", oneOf(t.escrowStatus, escrowStatuses)),
    // Each status has its dates, and no others. A received gift may lack sent_at: the message can go
    // out while the picker never reports back.
    check(
      "gifts_status_dates",
      sql`(${t.status} = 'packed' and ${t.sentAt} is null and ${t.receivedAt} is null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'sent' and ${t.sentAt} is not null and ${t.receivedAt} is null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'received' and ${t.receivedAt} is not null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'taken_out' and ${t.takenOutAt} is not null and ${t.receivedAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'returned' and ${t.returnedAt} is not null and ${t.receivedAt} is null and ${t.takenOutAt} is null)`,
    ),
    // What the escrow can hold at each status. Nothing is sent before the deposit, or received before
    // the claim.
    check(
      "gifts_status_escrow",
      sql`(${t.status} = 'packed' and ${t.escrowStatus} in ('missing', 'pending'))
        or (${t.status} = 'sent' and ${t.escrowStatus} = 'pending')
        or (${t.status} = 'received' and ${t.escrowStatus} = 'claimed')
        or (${t.status} = 'taken_out' and ${t.escrowStatus} in ('missing', 'pending', 'rejected'))
        or (${t.status} = 'returned' and ${t.escrowStatus} in ('pending', 'expired_returned'))`,
    ),
    check("gifts_receiver", sql`(${t.receiverId} is null) = (${t.receivedAt} is null)`),
    check("gifts_not_to_self", sql`${t.receiverId} is null or ${t.receiverId} <> ${t.giverId}`),
    check("gifts_not_for_self", sql`${t.forUserId} is null or ${t.forUserId} <> ${t.giverId}`),
    check("gifts_expiry", sql`${t.expiresAt} > ${t.createdAt}`),
    check("gifts_claim_tx_hash", sql`${t.claimTxHash} is null or ${t.receivedAt} is not null`),
    check("gifts_pushed", sql`${t.pushedToGiverAt} is null or ${t.receivedAt} is not null`),
  ],
);
