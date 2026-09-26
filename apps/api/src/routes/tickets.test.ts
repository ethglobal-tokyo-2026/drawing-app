import { DAILY_TICKETS_PER_DAY, ticketPurchases, ticketUses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorBodySchema } from "../errors.ts";
import { ticketQuoteSchema, ticketsSchema, type TicketQuote } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiPayments, fakeSuiPrice } from "../testing/fakes.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import {
  QUOTE_HOLDS_MS,
  TICKET_PACKS,
  TICKET_PRICE_YEN,
  ticketUseSchema,
  type TicketKind,
} from "../tickets/tickets.ts";

const ticketsBodySchema = z.object({ tickets: ticketsSchema });
const spendBodySchema = z.object({ ticketUse: ticketUseSchema, tickets: ticketsSchema });
const quoteBodySchema = z.object({ quote: ticketQuoteSchema });

/** A sealed sticker's cut, for the ticket stubs. */
const SEALED_CUT = { outline: "M0 0H4V2Z", width: 4, height: 2 };

/** The pack after the single ticket: it has tickets to spare once one is spent. */
const [, PACK] = TICKET_PACKS;
/** More tickets than any pack holds. */
const NOT_A_PACK = Math.max(...TICKET_PACKS.map((pack) => pack.tickets)) + 1;
/** 1 SUI in MIST. */
const PAID_MIST = "1000000000";
/** A SUI/JPY price with a fraction, and the same price in hundredths of a yen. */
const SUI_YEN = "312.45";
const SUI_YEN_HUNDREDTHS = 31245n;
const HUNDREDTHS_PER_YEN = 100n;
const MIST_PER_SUI = 1_000_000_000n;
const ONE_MIST = 1n;
const ONE_MS = 1;
const PERCENT = 100;
const PAYMENT_SHORT = { status: 402, error: "payment_short" };

const BASE58_DIGITS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Sui prints a transaction's 32-byte digest in base58. */
const TX_DIGEST_LENGTH = 44;
let payments = 0;
/** A well-formed Sui transaction digest, new each time. */
const newTxDigest = () => {
  payments += 1;
  return BASE58_DIGITS.charAt(payments % BASE58_DIGITS.length).repeat(TX_DIGEST_LENGTH);
};

type Headers = Record<string, string>;

let test: TestApp;
let headers: Headers;
let userId: string;

/** A fresh app, and a person signed in to it. */
async function start(overrides: Parameters<typeof createTestApp>[0] = {}) {
  test = await createTestApp(overrides);
  userId = insertUser(test.db);
  headers = await test.signInAs(userId);
}

beforeEach(() => start());
afterEach(() => {
  vi.restoreAllMocks();
});

const getTickets = async (as: Headers = headers) => {
  const response = await test.app.request("/api/tickets", { headers: as });
  expect(response.status).toBe(200);
  return ticketsBodySchema.parse(await response.json()).tickets;
};

const spend = (kind: TicketKind, as: Headers = headers) =>
  test.app.request("/api/tickets/spend", {
    method: "POST",
    headers: { ...as, "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  });

/** Spends a ticket of `kind`, which must be granted. */
async function spendTicket(kind: TicketKind, as: Headers = headers) {
  const response = await spend(kind, as);
  expect(response.status).toBe(201);
  return spendBodySchema.parse(await response.json());
}

/** Spends `times` tickets of `kind`, each of which must be granted, and returns the answers in order. */
async function spendTickets(kind: TicketKind, times: number, as: Headers = headers) {
  const answers = [];
  for (let spent = 0; spent < times; spent++) answers.push(await spendTicket(kind, as));
  return answers;
}

const buy = (body: object, as: Headers = headers) =>
  test.app.request("/api/ticket-purchases", {
    method: "POST",
    headers: { ...as, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const getQuote = async (as: Headers = headers) => {
  const response = await test.app.request("/api/ticket-quote", { headers: as });
  expect(response.status).toBe(200);
  return quoteBodySchema.parse(await response.json()).quote;
};

/** What `quote` asks for the pack of `tickets`, in MIST. */
function priceMistAt(quote: TicketQuote, tickets: number) {
  const offer = quote.packs.find((pack) => pack.tickets === tickets);
  if (!offer) throw new Error(`The quote has no pack of ${tickets}`);
  return offer.priceMist;
}

/** Pays for `pack` what a fresh quote asks. */
async function buyAtQuote(pack: { tickets: number }, txDigest = newTxDigest(), as = headers) {
  const quote = await getQuote(as);
  const paidMist = priceMistAt(quote, pack.tickets);
  const response = await buy({ tickets: pack.tickets, txDigest, paidMist }, as);
  return { quote, paidMist, response };
}

/** Buys `pack` at a fresh quote, which must be granted, and returns the tickets after. */
async function buyPack(pack: { tickets: number }, txDigest = newTxDigest(), as = headers) {
  const { response } = await buyAtQuote(pack, txDigest, as);
  expect(response.status).toBe(201);
  return ticketsBodySchema.parse(await response.json()).tickets;
}

/** The status and ErrorBody a request was refused with. */
const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

const ticketUseCount = () =>
  test.db.select().from(ticketUses).where(eq(ticketUses.userId, userId)).all().length;

const purchaseOf = (txDigest: string) =>
  test.db.select().from(ticketPurchases).where(eq(ticketPurchases.txDigest, txDigest)).get();

describe("tickets", () => {
  it("give a new person the day's daily tickets, and a refill at the next midnight, Tokyo time", async () => {
    const now = test.clock.now();
    expect(await getTickets()).toEqual({
      ticketDay: tokyoTicketDay(now),
      dailyPerDay: DAILY_TICKETS_PER_DAY,
      dailyLeft: DAILY_TICKETS_PER_DAY,
      reserveLeft: 0,
      nextRefillAt: nextTokyoTicketDayStart(now).toISOString(),
      usedToday: [],
    });
  });

  it("spend the day's daily tickets in order, then refuse with no_tickets_left", async () => {
    const answers = await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    answers.forEach(({ ticketUse, tickets }, dayIndex) => {
      expect(ticketUse).toMatchObject({ dayIndex, kind: "daily", ticketDay: tickets.ticketDay });
      expect(tickets.dailyLeft).toBe(DAILY_TICKETS_PER_DAY - (dayIndex + 1));
      expect(tickets.usedToday.map((use) => use.id)).toEqual(
        answers.slice(0, dayIndex + 1).map((answer) => answer.ticketUse.id),
      );
    });
    for (const kind of ["daily", "reserve"] as const) {
      expect(await refusal(await spend(kind))).toMatchObject({
        status: 409,
        error: "no_tickets_left",
      });
    }
    expect(ticketUseCount()).toBe(DAILY_TICKETS_PER_DAY);
  });

  it("turn the day over at midnight, Tokyo time", async () => {
    const answers = await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    const { nextRefillAt, ticketDay: spentDay } = answers[answers.length - 1].tickets;
    expect(nextRefillAt).toBe(nextTokyoTicketDayStart(test.clock.now()).toISOString());

    test.clock.set(new Date(Date.parse(nextRefillAt) - 1));
    expect(await getTickets()).toMatchObject({ ticketDay: spentDay, dailyLeft: 0 });

    test.clock.set(new Date(nextRefillAt));
    const refilled = await getTickets();
    expect(refilled).toMatchObject({ dailyLeft: DAILY_TICKETS_PER_DAY, usedToday: [] });
    expect(refilled.ticketDay).not.toBe(spentDay);
  });

  it("show the sticker each of today's tickets became, and null for one not sealed", async () => {
    const [sealed, abandoned] = await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    const stickerId = insertSealedSticker(test.db, userId, SEALED_CUT);
    test.db
      .update(ticketUses)
      .set({ stickerId })
      .where(eq(ticketUses.id, sealed.ticketUse.id))
      .run();
    const { usedToday } = await getTickets();
    expect(usedToday.find((use) => use.id === sealed.ticketUse.id)?.sticker).toEqual({
      id: stickerId,
      ...SEALED_CUT,
    });
    expect(usedToday.find((use) => use.id === abandoned.ticketUse.id)?.sticker).toBeNull();
  });

  it("spend reserve tickets once the daily ones are gone, and carry the rest into the next day", async () => {
    await buyPack(PACK);
    await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    const firstReserve = await spendTicket("reserve");
    const carried = PACK.tickets - 1;
    expect(firstReserve.ticketUse).toMatchObject({
      dayIndex: DAILY_TICKETS_PER_DAY,
      kind: "reserve",
    });
    expect(firstReserve.tickets).toMatchObject({ dailyLeft: 0, reserveLeft: carried });

    test.clock.set(new Date(firstReserve.tickets.nextRefillAt));
    expect(await getTickets()).toMatchObject({
      dailyLeft: DAILY_TICKETS_PER_DAY,
      reserveLeft: carried,
    });
    await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    const nextDay = await spendTickets("reserve", carried);
    expect(nextDay[nextDay.length - 1].tickets).toMatchObject({ dailyLeft: 0, reserveLeft: 0 });
    expect(await refusal(await spend("reserve"))).toMatchObject({
      status: 409,
      error: "no_tickets_left",
    });
  });

  it("refuse the other kind than the next ticket with ticket_kind_changed, spending nothing", async () => {
    await buyPack(PACK);
    const kindChanged = { status: 409, error: "ticket_kind_changed" };
    expect(await refusal(await spend("reserve"))).toMatchObject(kindChanged);
    await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    expect(await refusal(await spend("daily"))).toMatchObject(kindChanged);
    expect(ticketUseCount()).toBe(DAILY_TICKETS_PER_DAY);
    expect((await getTickets()).reserveLeft).toBe(PACK.tickets);
  });

  it("quote each pack's MIST at the SUI/JPY price, rounded up, and hold the quote for QUOTE_HOLDS_MS", async () => {
    await start({ suiPrice: fakeSuiPrice(SUI_YEN) });
    const quote = await getQuote();
    expect(quote).toMatchObject({ suiYen: SUI_YEN, quotedAt: test.clock.now().toISOString() });
    expect(Date.parse(quote.expiresAt) - Date.parse(quote.quotedAt)).toBe(QUOTE_HOLDS_MS);
    expect(quote.packs.map(({ tickets, priceYen }) => ({ tickets, priceYen }))).toEqual(
      TICKET_PACKS,
    );
    for (const { tickets, priceYen, discountPercent, priceMist } of quote.packs) {
      expect(priceYen * PERCENT).toBe(tickets * TICKET_PRICE_YEN * (PERCENT - discountPercent));
      const price = BigInt(priceYen) * HUNDREDTHS_PER_YEN * MIST_PER_SUI;
      expect(BigInt(priceMist) * SUI_YEN_HUNDREDTHS).toBeGreaterThanOrEqual(price);
      expect((BigInt(priceMist) - ONE_MIST) * SUI_YEN_HUNDREDTHS).toBeLessThan(price);
    }
  });

  it("refuse a quote with sui_price_unavailable while there's no SUI/JPY price", async () => {
    await start({ suiPrice: fakeSuiPrice(null) });
    const response = await test.app.request("/api/ticket-quote", { headers });
    expect(await refusal(response)).toMatchObject({ status: 503, error: "sui_price_unavailable" });
  });

  it("add each pack's tickets, recording its price, the quote's SUI/JPY price and the payment", async () => {
    let reserveLeft = 0;
    for (const pack of TICKET_PACKS) {
      const txDigest = newTxDigest();
      const { quote, paidMist, response } = await buyAtQuote(pack, txDigest);
      reserveLeft += pack.tickets;
      expect(response.status).toBe(201);
      expect(ticketsBodySchema.parse(await response.json()).tickets.reserveLeft).toBe(reserveLeft);
      expect(purchaseOf(txDigest)).toMatchObject({
        userId,
        priceYen: pack.priceYen,
        suiYen: quote.suiYen,
        paidMist,
        verifiedAt: test.clock.now(),
      });
    }
  });

  it("refuse with payment_short a payment short of its pack at every quote still holding", async () => {
    const buyFor = (paidMist: bigint) =>
      buy({ tickets: PACK.tickets, txDigest: newTxDigest(), paidMist: paidMist.toString() });
    expect(await refusal(await buyFor(BigInt(PAID_MIST)))).toMatchObject(PAYMENT_SHORT);

    const priceMist = BigInt(priceMistAt(await getQuote(), PACK.tickets));
    expect(await refusal(await buyFor(priceMist - ONE_MIST))).toMatchObject(PAYMENT_SHORT);
    test.clock.advance(QUOTE_HOLDS_MS + ONE_MS);
    expect(await refusal(await buyFor(priceMist))).toMatchObject(PAYMENT_SHORT);

    expect(test.db.select().from(ticketPurchases).all()).toEqual([]);
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("count a payment once, whoever sends it again", async () => {
    const txDigest = newTxDigest();
    await buyPack(PACK, txDigest);
    const someoneElse = await test.signInAs(insertUser(test.db));
    for (const as of [headers, someoneElse]) {
      const again = await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST }, as);
      expect(await refusal(again)).toMatchObject({ status: 409, error: "payment_already_counted" });
    }
    expect((await getTickets()).reserveLeft).toBe(PACK.tickets);
    expect((await getTickets(someoneElse)).reserveLeft).toBe(0);
  });

  it("refuse a count that isn't a pack, and a digest that isn't Sui's", async () => {
    const notAPack = await buy({
      tickets: NOT_A_PACK,
      txDigest: newTxDigest(),
      paidMist: PAID_MIST,
    });
    expect(await refusal(notAPack)).toMatchObject({ status: 400, error: "pack_unknown" });
    for (const txDigest of [bytes32("an EVM transaction"), "0".repeat(TX_DIGEST_LENGTH)]) {
      const malformed = await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST });
      expect(await refusal(malformed)).toMatchObject({ status: 400, error: "invalid_request" });
    }
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("count no tickets for a payment Sui doesn't verify, and log it", async () => {
    await start({ sui: fakeSuiPayments(false) });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const txDigest = newTxDigest();
    const { response } = await buyAtQuote(PACK, txDigest);
    expect(await refusal(response)).toMatchObject({ status: 500, error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(txDigest));
    expect(purchaseOf(txDigest)).toBeUndefined();
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("refuse every route without a session", async () => {
    const txDigest = newTxDigest();
    for (const response of [
      await test.app.request("/api/tickets"),
      await spend("daily", {}),
      await test.app.request("/api/ticket-quote"),
      await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST }, {}),
    ]) {
      expect(await refusal(response)).toMatchObject({ status: 401, error: "signed_out" });
    }
    expect(ticketUseCount()).toBe(0);
    expect(purchaseOf(txDigest)).toBeUndefined();
  });
});
