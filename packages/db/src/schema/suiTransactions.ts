import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { oneOf, timestamps } from "./columns.ts";
import { gifts } from "./gifts.ts";
import { stickers } from "./stickers.ts";
import { ticketPurchases } from "./tickets.ts";
import { users } from "./users.ts";

export const suiTransactionKinds = [
  "mint",
  "deposit",
  "take_out",
  "claim",
  "return",
  "payment",
] as const;
export const suiTransactionOutcomes = ["succeeded", "failed", "dead"] as const;

/**
 * One Sui transaction, from Shinami's sponsorship to its outcome. The server builds every
 * transaction and alone submits it, so this row is all there is to know: a sweep resubmits its
 * bytes and signatures, and an open row bars a second transaction over the same sticker, gift,
 * purchase or JPYC coins.
 */
export const suiTransactions = sqliteTable(
  "sui_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: suiTransactionKinds }).notNull(),
    /** Who signs it as sender: the server, or the person's Privy Sui wallet. */
    sender: text("sender").notNull(),
    /** The person, for the kinds they sign. */
    userId: text("user_id").references(() => users.id),
    stickerId: text("sticker_id").references(() => stickers.id),
    giftId: text("gift_id").references(() => gifts.id),
    purchaseId: integer("purchase_id").references(() => ticketPurchases.id),
    /** Base58, known from the sponsorship, before anyone signs. */
    digest: text("digest").notNull().unique(),
    /** Base64 BCS TransactionData, Shinami's gas included. */
    txBytes: text("tx_bytes").notNull(),
    /** Shinami's signature. It never leaves the server, so nothing else can submit the transaction. */
    sponsorSignature: text("sponsor_signature").notNull(),
    /** The sender's: the server's at once, the person's once the app posts it. */
    senderSignature: text("sender_signature"),
    /** When Shinami's sponsorship lapses. Never submitted after. */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    /**
     * Null while open. `dead`: it never ran and never can, because its sponsorship lapsed, the
     * server dropped it unsubmitted, or Sui refused it outright.
     */
    outcome: text("outcome", { enum: suiTransactionOutcomes }),
    /** Sui's words for a failed transaction, such as a Move abort, or for one it refused outright. */
    failure: text("failure"),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    // One open transaction per owned object it moves, and per record it settles.
    uniqueIndex("sui_transactions_open_sticker")
      .on(t.stickerId)
      .where(sql`${t.outcome} is null and ${t.kind} in ('mint', 'deposit')`),
    uniqueIndex("sui_transactions_open_gift")
      .on(t.giftId)
      .where(sql`${t.outcome} is null`),
    uniqueIndex("sui_transactions_open_purchase")
      .on(t.purchaseId)
      .where(sql`${t.outcome} is null`),
    // A payment spends the payer's JPYC coins.
    uniqueIndex("sui_transactions_open_payment")
      .on(t.sender)
      .where(sql`${t.outcome} is null and ${t.kind} = 'payment'`),
    index("sui_transactions_open")
      .on(t.createdAt)
      .where(sql`${t.outcome} is null`),
    // The giving limit counts a person's sponsored gift transactions over a recent window.
    index("sui_transactions_user").on(t.userId, t.createdAt),
    index("sui_transactions_gift").on(t.giftId),
    index("sui_transactions_sticker").on(t.stickerId),
    check("sui_transactions_kind", oneOf(t.kind, suiTransactionKinds)),
    check(
      "sui_transactions_outcome",
      sql`${t.outcome} is null or ${oneOf(t.outcome, suiTransactionOutcomes)}`,
    ),
    check(
      "sui_transactions_subject",
      sql`(${t.kind} = 'mint' and ${t.stickerId} is not null and ${t.userId} is null and ${t.giftId} is null and ${t.purchaseId} is null)
        or (${t.kind} = 'deposit' and ${t.userId} is not null and ${t.stickerId} is not null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} = 'take_out' and ${t.userId} is not null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} in ('claim', 'return') and ${t.userId} is null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} = 'payment' and ${t.userId} is not null and ${t.purchaseId} is not null and ${t.stickerId} is null and ${t.giftId} is null)`,
    ),
    check("sui_transactions_settled", sql`(${t.outcome} is null) = (${t.settledAt} is null)`),
    check(
      "sui_transactions_failure",
      sql`case ${t.outcome} when 'failed' then ${t.failure} is not null when 'dead' then 1 else ${t.failure} is null end`,
    ),
    check(
      "sui_transactions_submitted",
      sql`${t.submittedAt} is null or ${t.senderSignature} is not null`,
    ),
  ],
);
