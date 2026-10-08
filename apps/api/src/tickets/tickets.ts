import {
  DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
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
import {
  isoTimeSchema,
  kyotoSeikaPracticeOn,
  signedTransactionSchema,
  toIsoTime,
  type Tickets,
  type TicketShop,
} from "../shapes.ts";
import { simplifiedOutlineOf } from "../stickers/outline.ts";
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

/** The ticket shop: its packs, and where they're paid. */
export const ticketShop = (target: TicketPaymentTarget): TicketShop => ({
  packs: TICKET_PACKS.map(({ tickets, priceYen }) => ({
    tickets,
    priceYen,
    discountPercent: Math.round(PERCENT - (PERCENT * priceYen) / (tickets * TICKET_PRICE_YEN)),
    priceJpyc: jpycFor(priceYen, target.decimals).toString(),
  })),
  payment: target,
});

/** The database, or a transaction on it. */
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type TicketKind = (typeof ticketUses.$inferSelect)["kind"];

/** Whether `userId` has Kyoto Seika Manga Expression Practice Mode on now. */
export function kyotoSeikaPracticeOf(db: DbOrTx, userId: string): boolean {
  const user = db
    .select({ kyotoSeikaPracticeOnAt: users.kyotoSeikaPracticeOnAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return user !== undefined && kyotoSeikaPracticeOn(user);
}

/**
 * The day's daily tickets with Kyoto Seika Manga Expression Practice Mode on or off. Each spend
 * reads the mode in force, so turning it off and on again never refills.
 */
export const dailyTicketsPerDay = (kyotoSeikaPractice: boolean): number =>
  kyotoSeikaPractice ? KYOTO_SEIKA_DAILY_TICKETS_PER_DAY : DAILY_TICKETS_PER_DAY;

/** The kind the next spend takes: daily tickets always go first. */
export const nextTicketKind = ({ dailyLeft }: Pick<Tickets, "dailyLeft">): TicketKind =>
  dailyLeft > 0 ? "daily" : "reserve";

/**
 * How many tickets the person has left at `now`: today's daily ones, Tokyo time, under the
 * allowance of the mode they're in, and reserve ones.
 */
export function ticketsLeftOf(
  db: DbOrTx,
  userId: string,
  now: Date,
): Pick<Tickets, "dailyPerDay" | "dailyLeft" | "reserveLeft"> {
  const dailyPerDay = dailyTicketsPerDay(kyotoSeikaPracticeOf(db, userId));
  const dailyUsed = db
    .select({ n: count() })
    .from(ticketUses)
    .where(
      and(
        eq(ticketUses.userId, userId),
        eq(ticketUses.ticketDay, tokyoTicketDay(now)),
        eq(ticketUses.kind, "daily"),
      ),
    )
    .get();
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
  return {
    dailyPerDay,
    dailyLeft: Math.max(0, dailyPerDay - (dailyUsed?.n ?? 0)),
    reserveLeft: Math.max(0, Number(bought?.tickets ?? 0) - (reserveUses?.n ?? 0)),
  };
}

/** The person's tickets at `now`: what's left, and today's uses with their stickers. */
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
  return {
    ticketDay: day,
    ...ticketsLeftOf(db, userId, now),
    nextRefillAt: toIsoTime(nextTokyoTicketDayStart(now)),
    usedToday: usedToday.map(({ sticker, ...use }) => ({
      ...use,
      sticker: sticker && {
        ...sticker,
        outline: simplifiedOutlineOf(sticker),
      },
    })),
  };
}

/** Spending a ticket: the kind the start screen offered, and the key each retry sends again. */
export const spendRequestSchema = createInsertSchema(ticketUses, {
  idempotencyKey: z.uuid(),
}).pick({ kind: true, idempotencyKey: true });
export type SpendTicket = z.infer<typeof spendRequestSchema>;

/** A spent ticket, as spending answers it. */
export const ticketUseSchema = createSelectSchema(ticketUses, {
  ticketDay: z.iso.date(),
  dayIndex: (schema) => schema.nonnegative(),
})
  .pick({ id: true, ticketDay: true, dayIndex: true, kind: true, kyotoSeikaPractice: true })
  .extend({ spentAt: isoTimeSchema });
export type TicketUse = z.infer<typeof ticketUseSchema>;

export const toTicketUse = (use: typeof ticketUses.$inferSelect): TicketUse => ({
  id: use.id,
  ticketDay: use.ticketDay,
  dayIndex: use.dayIndex,
  kind: use.kind,
  kyotoSeikaPractice: use.kyotoSeikaPractice,
  spentAt: toIsoTime(use.createdAt),
});

/** The ticket use `userId` already spent with `idempotencyKey`, if any. */
export const ticketUseSpentWith = (db: DbOrTx, userId: string, idempotencyKey: string) =>
  db
    .select()
    .from(ticketUses)
    .where(and(eq(ticketUses.userId, userId), eq(ticketUses.idempotencyKey, idempotencyKey)))
    .get();

/**
 * Starting a purchase of a pack. Any positive count passes here, so the route can answer one that
 * isn't a pack with pack_unknown.
 */
export const startPurchaseRequestSchema = createInsertSchema(ticketPurchases, {
  tickets: (schema) => schema.positive(),
}).pick({ tickets: true });

const purchaseRow = createSelectSchema(ticketPurchases, { id: (schema) => schema.positive() });

/** A purchase as starting it answers: the pack it buys. The server builds its payment. */
export const startedTicketPurchaseSchema = purchaseRow.pick({
  id: true,
  tickets: true,
  priceYen: true,
});
export type StartedTicketPurchase = z.infer<typeof startedTicketPurchaseSchema>;

export const toStartedTicketPurchase = ({
  id,
  tickets,
  priceYen,
}: typeof ticketPurchases.$inferSelect): StartedTicketPurchase => ({ id, tickets, priceYen });

/** Paying a started purchase: the purchase, and the buyer's signature over its payment. */
export const ticketPurchaseRequestSchema = signedTransactionSchema.extend({
  purchaseId: purchaseRow.shape.id,
});
export type TicketPurchasePayment = z.infer<typeof ticketPurchaseRequestSchema>;
