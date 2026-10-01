import {
  DAILY_TICKETS_PER_DAY,
  stickers,
  ticketPurchases,
  ticketUses,
  type Db,
} from "@drawing-app/db";
import { and, asc, count, eq, isNotNull, isNull, sum } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { TicketPaymentTarget } from "../deps.ts";
import { isoTimeSchema, toIsoTime, type Tickets, type TicketShop } from "../shapes.ts";
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

/**
 * What a person passes as `pay`'s reference for one purchase: their id first, so a payment for
 * someone else's purchase is told apart without a lookup, then the purchase's.
 */
export const ticketPaymentReference = (userId: string, purchaseId: number) =>
  `tickets:${userId}:${purchaseId}`;

const PURCHASE_REFERENCE = /^tickets:(.+):([1-9][0-9]*)$/;

/** The person and the purchase a payment's reference names; null for one that names none. */
export function purchaseNamedBy(reference: string): { userId: string; purchaseId: number } | null {
  const [, userId, id] = PURCHASE_REFERENCE.exec(reference) ?? [];
  const purchaseId = Number(id);
  return userId && Number.isSafeInteger(purchaseId) ? { userId, purchaseId } : null;
}

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

/** The kind the day's use at `dayIndex` spends: daily tickets always go first. */
export const ticketKindAt = (dayIndex: number): TicketKind =>
  dayIndex < DAILY_TICKETS_PER_DAY ? "daily" : "reserve";

/** How many tickets the person has left at `now`: today's daily ones, Tokyo time, and reserve ones. */
export function ticketsLeftOf(
  db: DbOrTx,
  userId: string,
  now: Date,
): Pick<Tickets, "dailyLeft" | "reserveLeft"> {
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
    dailyLeft: Math.max(0, DAILY_TICKETS_PER_DAY - (dailyUsed?.n ?? 0)),
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
    dailyPerDay: DAILY_TICKETS_PER_DAY,
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

/** The ticket use `userId` already spent with `idempotencyKey`, if any. */
export const ticketUseSpentWith = (db: DbOrTx, userId: string, idempotencyKey: string) =>
  db
    .select()
    .from(ticketUses)
    .where(and(eq(ticketUses.userId, userId), eq(ticketUses.idempotencyKey, idempotencyKey)))
    .get();

/** A Sui transaction digest: 32 bytes in base58. */
const SUI_TX_DIGEST = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

/**
 * Starting a purchase of a pack. Any positive count passes here, so the route can answer one that
 * isn't a pack with pack_unknown.
 */
export const startPurchaseRequestSchema = createInsertSchema(ticketPurchases, {
  tickets: (schema) => schema.positive(),
}).pick({ tickets: true });

const purchaseRow = createSelectSchema(ticketPurchases, { id: (schema) => schema.positive() });

/** A purchase as starting it answers: what to pay, and the reference to pay it with. */
export const startedTicketPurchaseSchema = purchaseRow
  .pick({ id: true, tickets: true, priceYen: true })
  .extend({
    /** The price in JPYC base units, as decimal text: one JPYC is one yen. */
    priceJpyc: z.string().regex(/^[0-9]+$/),
    /** Passed to `pay` as its reference: it names this purchase and its person. */
    reference: z.string().min(1),
  });
export type StartedTicketPurchase = z.infer<typeof startedTicketPurchaseSchema>;

export const toStartedTicketPurchase = (
  purchase: typeof ticketPurchases.$inferSelect,
  decimals: number,
): StartedTicketPurchase => ({
  id: purchase.id,
  tickets: purchase.tickets,
  priceYen: purchase.priceYen,
  priceJpyc: jpycFor(purchase.priceYen, decimals).toString(),
  reference: ticketPaymentReference(purchase.userId, purchase.id),
});

/** Reporting a started purchase's payment: the purchase, and the Sui transaction that paid it. */
export const ticketPurchaseRequestSchema = createInsertSchema(ticketPurchases, {
  txDigest: z.string().regex(SUI_TX_DIGEST, "Expected a base58 Sui transaction digest"),
})
  .pick({ txDigest: true })
  .extend({ purchaseId: purchaseRow.shape.id });

/** Whether a Sui payment has already bought tickets: one payment counts once. */
export const paymentCounted = (db: DbOrTx, txDigest: string) =>
  db
    .select({ id: ticketPurchases.id })
    .from(ticketPurchases)
    .where(eq(ticketPurchases.txDigest, txDigest))
    .get() !== undefined;

/**
 * Records `payment` on the purchase, which counts its tickets: unless the payment already bought
 * tickets, or the purchase was already paid. Immediate, so a report and the sweep can't both count.
 */
export const creditPurchase = (
  db: Db,
  purchaseId: number,
  payment: { txDigest: string; amount: bigint },
  now: Date,
): "credited" | "payment_already_counted" | "purchase_already_paid" =>
  db.transaction(
    (tx) => {
      if (paymentCounted(tx, payment.txDigest)) return "payment_already_counted";
      const { changes } = tx
        .update(ticketPurchases)
        .set({ txDigest: payment.txDigest, paidJpyc: payment.amount.toString(), verifiedAt: now })
        .where(and(eq(ticketPurchases.id, purchaseId), isNull(ticketPurchases.verifiedAt)))
        .run();
      return changes === 1 ? "credited" : "purchase_already_paid";
    },
    { behavior: "immediate" },
  );
