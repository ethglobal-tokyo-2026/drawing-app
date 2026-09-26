import {
  DAILY_TICKETS_PER_DAY,
  stickers,
  ticketPurchases,
  ticketUses,
  users,
  type Db,
} from "@drawing-app/db";
import { and, asc, count, eq, isNotNull, sum } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { TicketPaymentTarget } from "../deps.ts";
import { isoTimeSchema, toIsoTime, type Tickets, type TicketShop } from "../shapes.ts";
import { simplifiedOutline } from "../stickers/outline.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";

/** A single reserve ticket's price in yen; packs show their discount off it. */
export const TICKET_PRICE_YEN = 100;

/** The ticket shop's packs of reserve tickets, priced in yen and paid in JPYC on Sui. */
export const TICKET_PACKS = [
  { tickets: 1, priceYen: 100 },
  { tickets: 3, priceYen: 270 },
  { tickets: 5, priceYen: 375 },
  { tickets: 10, priceYen: 600 },
] as const satisfies ReadonlyArray<Pick<TicketShop["packs"][number], "tickets" | "priceYen">>;

const PERCENT = 100;

/** `priceYen` in JPYC base units: one JPYC is one yen. */
export const jpycFor = (priceYen: number, decimals: number): bigint =>
  BigInt(priceYen) * 10n ** BigInt(decimals);

/** What a person passes as `pay`'s reference, so their payment can't buy someone else's tickets. */
export const ticketPaymentReference = (userId: string) => `tickets:${userId}`;

/** The ticket shop for `userId`: its packs, and where and how they pay. */
export const ticketShop = (target: TicketPaymentTarget, userId: string): TicketShop => ({
  packs: TICKET_PACKS.map(({ tickets, priceYen }) => ({
    tickets,
    priceYen,
    discountPercent: Math.round(PERCENT - (PERCENT * priceYen) / (tickets * TICKET_PRICE_YEN)),
    priceJpyc: jpycFor(priceYen, target.decimals).toString(),
  })),
  payment: { ...target, reference: ticketPaymentReference(userId) },
});

/** The database, or a transaction on it. */
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type TicketKind = (typeof ticketUses.$inferSelect)["kind"];

/** The kind the day's use at `dayIndex` spends: daily tickets always go first. */
export const ticketKindAt = (dayIndex: number): TicketKind =>
  dayIndex < DAILY_TICKETS_PER_DAY ? "daily" : "reserve";

/** The signed-in person's account; undefined if they have none. */
export const ticketHolder = (db: DbOrTx, userId: string) =>
  db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();

/** The person's tickets at `now`: today's daily ones, Tokyo time, and every reserve one left. */
export function ticketsOf(db: DbOrTx, userId: string, now: Date): Tickets {
  const day = tokyoTicketDay(now);
  const usedToday = db
    .select({
      id: ticketUses.id,
      dayIndex: ticketUses.dayIndex,
      kind: ticketUses.kind,
      sticker: {
        id: stickers.id,
        outline: stickers.outline,
        width: stickers.width,
        height: stickers.height,
      },
    })
    .from(ticketUses)
    .leftJoin(stickers, eq(stickers.id, ticketUses.stickerId))
    .where(and(eq(ticketUses.userId, userId), eq(ticketUses.ticketDay, day)))
    .orderBy(asc(ticketUses.dayIndex))
    .all();
  const bought = db
    .select({ tickets: sum(ticketPurchases.tickets) })
    .from(ticketPurchases)
    .where(and(eq(ticketPurchases.userId, userId), isNotNull(ticketPurchases.verifiedAt)))
    .get();
  const reserveUses = db
    .select({ n: count() })
    .from(ticketUses)
    .where(and(eq(ticketUses.userId, userId), eq(ticketUses.kind, "reserve")))
    .get();
  const dailyUsed = usedToday.filter((use) => use.kind === "daily").length;
  return {
    ticketDay: day,
    dailyPerDay: DAILY_TICKETS_PER_DAY,
    dailyLeft: Math.max(0, DAILY_TICKETS_PER_DAY - dailyUsed),
    reserveLeft: Math.max(0, Number(bought?.tickets ?? 0) - (reserveUses?.n ?? 0)),
    nextRefillAt: toIsoTime(nextTokyoTicketDayStart(now)),
    usedToday: usedToday.map(({ sticker, ...use }) => ({
      ...use,
      sticker: sticker && {
        ...sticker,
        outline: simplifiedOutline(sticker.outline, sticker.width, sticker.height),
      },
    })),
  };
}

/** Spending a ticket: the kind the start screen offered. */
export const spendRequestSchema = createInsertSchema(ticketUses).pick({ kind: true });

/** A spent ticket, as spending answers it. */
export const ticketUseSchema = createSelectSchema(ticketUses, {
  ticketDay: z.iso.date(),
  dayIndex: (schema) => schema.nonnegative(),
})
  .pick({ id: true, ticketDay: true, dayIndex: true, kind: true })
  .extend({ spentAt: isoTimeSchema });
export type TicketUse = z.infer<typeof ticketUseSchema>;

export const toTicketUse = (use: typeof ticketUses.$inferSelect): TicketUse => ({
  id: use.id,
  ticketDay: use.ticketDay,
  dayIndex: use.dayIndex,
  kind: use.kind,
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
  txDigest: (schema) => schema.regex(SUI_TX_DIGEST, "Expected a base58 Sui transaction digest"),
}).pick({ tickets: true, txDigest: true });

/** Whether a Sui payment has already bought tickets: one payment counts once. */
export const paymentCounted = (db: DbOrTx, txDigest: string) =>
  db
    .select({ id: ticketPurchases.id })
    .from(ticketPurchases)
    .where(eq(ticketPurchases.txDigest, txDigest))
    .get() !== undefined;
