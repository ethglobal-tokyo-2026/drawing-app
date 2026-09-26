import { stickers, ticketPurchases, ticketUses, users, type Db } from "@drawing-app/db";
import { and, asc, count, eq, gte, isNotNull, sum } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { isoTimeSchema, toIsoTime, type Tickets } from "../shapes.ts";
import { nextTicketDayStart, ticketDay } from "../ticketDays.ts";

/** Free tickets each ticket day. A day's first uses take them, so `day_index` tells free from paid. */
export const FREE_TICKETS_PER_DAY = 3;

/** The packs of paid tickets on sale, paid in SUI. Paid tickets carry over from day to day. */
export const TICKET_PACKS = [
  { tickets: 1, priceYen: 100 },
  { tickets: 3, priceYen: 270 },
  { tickets: 5, priceYen: 350 },
  { tickets: 10, priceYen: 500 },
] as const satisfies ReadonlyArray<Tickets["packs"][number]>;

/** The database, or a transaction on it. */
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

type TicketHolder = Pick<typeof users.$inferSelect, "id" | "timeZone">;

/** The signed-in person's id and zone; undefined if they have no account. */
export const ticketHolder = (db: DbOrTx, userId: string): TicketHolder | undefined =>
  db
    .select({ id: users.id, timeZone: users.timeZone })
    .from(users)
    .where(eq(users.id, userId))
    .get();

/** The person's tickets at `now`: today's free ones in their zone, and every paid one left. */
export function ticketsOf(db: DbOrTx, holder: TicketHolder, now: Date): Tickets {
  const day = ticketDay(now, holder.timeZone);
  const usedToday = db
    .select({
      id: ticketUses.id,
      dayIndex: ticketUses.dayIndex,
      sticker: {
        id: stickers.id,
        outline: stickers.outline,
        width: stickers.width,
        height: stickers.height,
      },
    })
    .from(ticketUses)
    .leftJoin(stickers, eq(stickers.id, ticketUses.stickerId))
    .where(and(eq(ticketUses.userId, holder.id), eq(ticketUses.ticketDay, day)))
    .orderBy(asc(ticketUses.dayIndex))
    .all();
  const bought = db
    .select({ tickets: sum(ticketPurchases.tickets) })
    .from(ticketPurchases)
    .where(and(eq(ticketPurchases.userId, holder.id), isNotNull(ticketPurchases.verifiedAt)))
    .get();
  const paidUses = db
    .select({ n: count() })
    .from(ticketUses)
    .where(and(eq(ticketUses.userId, holder.id), gte(ticketUses.dayIndex, FREE_TICKETS_PER_DAY)))
    .get();
  return {
    ticketDay: day,
    freePerDay: FREE_TICKETS_PER_DAY,
    freeLeft: Math.max(0, FREE_TICKETS_PER_DAY - usedToday.length),
    paidLeft: Math.max(0, Number(bought?.tickets ?? 0) - (paidUses?.n ?? 0)),
    nextRefillAt: toIsoTime(nextTicketDayStart(now, holder.timeZone)),
    usedToday,
    packs: [...TICKET_PACKS],
  };
}

/** A spent ticket, as spending answers it. */
export const ticketUseSchema = createSelectSchema(ticketUses, {
  ticketDay: z.iso.date(),
  dayIndex: (schema) => schema.nonnegative(),
})
  .pick({ id: true, ticketDay: true, dayIndex: true })
  .extend({ spentAt: isoTimeSchema });
export type TicketUse = z.infer<typeof ticketUseSchema>;

export const toTicketUse = (use: typeof ticketUses.$inferSelect): TicketUse => ({
  id: use.id,
  ticketDay: use.ticketDay,
  dayIndex: use.dayIndex,
  spentAt: toIsoTime(use.createdAt),
});

/** A Sui transaction digest: 32 bytes in base58. */
const SUI_TX_DIGEST = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

/**
 * Buying a pack. Any positive count passes here, so the route can answer one that isn't a pack with
 * pack_unknown.
 */
export const ticketPurchaseRequestSchema = createInsertSchema(ticketPurchases, {
  tickets: (schema) => schema.positive(),
  paidMist: (schema) => schema.regex(/^[0-9]+$/, "Expected MIST as decimal digits"),
  txDigest: (schema) => schema.regex(SUI_TX_DIGEST, "Expected a base58 Sui transaction digest"),
}).pick({ tickets: true, txDigest: true, paidMist: true });

/** Whether a Sui payment has already bought tickets: one payment counts once. */
export const paymentCounted = (db: DbOrTx, txDigest: string) =>
  db
    .select({ id: ticketPurchases.id })
    .from(ticketPurchases)
    .where(eq(ticketPurchases.txDigest, txDigest))
    .get() !== undefined;
