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
import { isoTimeSchema, toIsoTime, type TicketQuote, type Tickets } from "../shapes.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";

/** A single reserve ticket's price in yen; packs show their discount off it. */
export const TICKET_PRICE_YEN = 100;

/** The ticket shop's packs of reserve tickets, priced in yen and paid in SUI. */
export const TICKET_PACKS = [
  { tickets: 1, priceYen: 100 },
  { tickets: 3, priceYen: 270 },
  { tickets: 5, priceYen: 375 },
  { tickets: 10, priceYen: 600 },
] as const satisfies ReadonlyArray<Pick<TicketQuote["packs"][number], "tickets" | "priceYen">>;

/** How long a quote holds: a purchase counts only at a quote issued within it. */
export const QUOTE_HOLDS_MS = 60 * 1000;

const MIST_PER_SUI = 1_000_000_000n;
const PERCENT = 100;

/** The least MIST worth `priceYen` at `suiYen` yen per SUI, so paying it always covers the price. */
function mistFor(priceYen: number, suiYen: string): bigint {
  const [whole, fraction = ""] = suiYen.split(".");
  const yenPerSui = BigInt(whole + fraction);
  const price = BigInt(priceYen) * MIST_PER_SUI * 10n ** BigInt(fraction.length);
  return (price + yenPerSui - 1n) / yenPerSui;
}

/** The ticket shop's packs at `suiYen` yen per SUI, quoted at `now`. */
const quoteAt = (suiYen: string, now: Date): TicketQuote => ({
  suiYen,
  quotedAt: toIsoTime(now),
  expiresAt: toIsoTime(new Date(now.getTime() + QUOTE_HOLDS_MS)),
  packs: TICKET_PACKS.map(({ tickets, priceYen }) => ({
    tickets,
    priceYen,
    discountPercent: Math.round(PERCENT - (PERCENT * priceYen) / (tickets * TICKET_PRICE_YEN)),
    priceMist: mistFor(priceYen, suiYen).toString(),
  })),
});

/**
 * The quotes issued that still hold, for anyone: a purchase counts only at one of them. They live in
 * memory, since none outlasts a minute.
 */
export function createQuoteBook() {
  let holding: TicketQuote[] = [];
  const dropExpired = (now: Date) => {
    holding = holding.filter((quote) => Date.parse(quote.expiresAt) >= now.getTime());
  };
  return {
    issue: (suiYen: string, now: Date): TicketQuote => {
      dropExpired(now);
      const quote = quoteAt(suiYen, now);
      holding.push(quote);
      return quote;
    },
    /** The newest quote still holding at which `paidMist` covers the pack of `tickets`. */
    covering: (tickets: number, paidMist: bigint, now: Date): TicketQuote | undefined => {
      dropExpired(now);
      return [...holding]
        .reverse()
        .find((quote) =>
          quote.packs.some(
            (pack) => pack.tickets === tickets && BigInt(pack.priceMist) <= paidMist,
          ),
        );
    },
  };
}

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
    usedToday,
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
