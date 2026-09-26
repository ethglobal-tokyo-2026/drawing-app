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
    check("ticket_uses_day_index", sql`${t.dayIndex} >= 0`),
    check(
      "ticket_uses_kind",
      sql`${t.kind} = case when ${t.dayIndex} < ${literal(DAILY_TICKETS_PER_DAY)} then 'daily' else 'reserve' end`,
    ),
  ],
);

/** A pack of reserve tickets bought with JPYC on Sui. Its tickets count once verified_at is set. */
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
    /** What the payment carried, in JPYC base units, as decimal text. */
    paidJpyc: text("paid_jpyc").notNull(),
    /** The Sui transaction digest; one payment counts once. */
    txDigest: text("tx_digest").notNull().unique(),
    /** Set once the server has checked the payment on Sui. */
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("ticket_purchases_user").on(t.userId),
    check("ticket_purchases_pack", sql`${t.tickets} > 0 and ${t.priceYen} > 0`),
  ],
);
