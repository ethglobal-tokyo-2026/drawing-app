import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { literal, timestamps } from "./columns.ts";
import { DAILY_TICKETS_PER_DAY } from "./limits.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

export const ticketKinds = ["daily", "reserve"] as const;

/**
 * A spent ticket: inserted when the start screen's button spends it, linked to its sticker at seal.
 * An abandoned drawing keeps its ticket spent with no sticker.
 */
export const ticketUses = sqliteTable(
  "ticket_uses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /**
     * Made on the device when a spend is first tried, and sent with each retry of it. The same key
     * again gets this use, not another.
     */
    idempotencyKey: text("idempotency_key").notNull(),
    /** YYYY-MM-DD, Tokyo time: ticket days run midnight to midnight there, for everyone. */
    ticketDay: text("ticket_day").notNull(),
    /** Order within the day, from 0. */
    dayIndex: integer("day_index").notNull(),
    /** Daily tickets are always spent first, so a day's first uses are daily and the rest reserve. */
    kind: text("kind", { enum: ticketKinds }).notNull(),
    stickerId: text("sticker_id")
      .unique()
      .references(() => stickers.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ticket_uses_day").on(t.userId, t.ticketDay, t.dayIndex),
    uniqueIndex("ticket_uses_idempotency_key").on(t.userId, t.idempotencyKey),
    check("ticket_uses_day_index", sql`${t.dayIndex} >= 0`),
    // Holds every row, past days' too, to the current DAILY_TICKETS_PER_DAY: changing it needs a
    // migration that rewrites old rows to pass.
    check(
      "ticket_uses_kind",
      sql`${t.kind} = case when ${t.dayIndex} < ${literal(DAILY_TICKETS_PER_DAY)} then 'daily' else 'reserve' end`,
    ),
  ],
);

/**
 * A pack of reserve tickets bought with JPYC on Sui. The reserve ticket checkout starts it, and the
 * server builds its payment for the person's wallet to sign; its tickets count once verified_at is
 * set. Its payment transaction is in sui_transactions.
 */
export const ticketPurchases = sqliteTable(
  "ticket_purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tickets: integer("tickets").notNull(),
    /** The pack's price in yen. */
    priceYen: integer("price_yen").notNull(),
    /** What the payment carried, in JPYC base units, as decimal text; null until it's paid. */
    paidJpyc: text("paid_jpyc"),
    /** Set once the server has checked the payment on Sui. */
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    /**
     * Set when its payment never ran: the sponsorship lapsed unsigned, the person started another, or
     * Sui failed it.
     */
    givenUpAt: integer("given_up_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("ticket_purchases_user").on(t.userId),
    index("ticket_purchases_open")
      .on(t.createdAt)
      .where(sql`${t.verifiedAt} is null and ${t.givenUpAt} is null`),
    check("ticket_purchases_pack", sql`${t.tickets} > 0 and ${t.priceYen} > 0`),
    check("ticket_purchases_payment", sql`(${t.paidJpyc} is null) = (${t.verifiedAt} is null)`),
  ],
);
