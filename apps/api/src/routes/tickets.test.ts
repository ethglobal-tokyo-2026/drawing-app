import { randomUUID } from "node:crypto";
import { DAILY_TICKETS_PER_DAY, ticketPurchases, ticketUses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { JpycPayment } from "../deps.ts";
import { ticketShopSchema, ticketsSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeTicketPayments, TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import { spendBody } from "../tickets/testSpends.ts";
import {
  TICKET_PACKS,
  TICKET_PRICE_YEN,
  ticketPaymentReference,
  ticketUseSchema,
  type TicketKind,
} from "../tickets/tickets.ts";

const ticketsBodySchema = z.object({ tickets: ticketsSchema });
const spendBodySchema = z.object({ ticketUse: ticketUseSchema, tickets: ticketsSchema });
const shopBodySchema = z.object({ shop: ticketShopSchema });

/** A sealed sticker's cut, for the ticket stubs. */
const SEALED_CUT = { outline: "M0 0L4 0L4 2Z", width: 4, height: 2 };

/** The pack after the single ticket: it has tickets to spare once one is spent. */
const [, PACK] = TICKET_PACKS;
/** More tickets than any pack holds. */
const NOT_A_PACK = Math.max(...TICKET_PACKS.map((pack) => pack.tickets)) + 1;
const PERCENT = 100;
const JPYC_PER_YEN = 10n ** BigInt(TEST_PAYMENT_TARGET.decimals);
/** A pack's price in JPYC base units. */
const jpycOf = (pack: { priceYen: number }) => BigInt(pack.priceYen) * JPYC_PER_YEN;

const BASE58_DIGITS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Sui prints a transaction's 32-byte digest in base58. */
const TX_DIGEST_LENGTH = 44;
let payments = 0;
/** A well-formed Sui transaction digest, new each time. */
const newTxDigest = () => {
  payments += 1;
  return BASE58_DIGITS.charAt(payments % BASE58_DIGITS.length).repeat(TX_DIGEST_LENGTH);
};

let test: TestApp;
let userId: string;
/** Sui's transactions, by digest. */
let transactions: Map<string, JpycPayment[] | Error>;

/** A fresh app, and a person signed in to it. */
async function start() {
  const sui = fakeTicketPayments();
  transactions = sui.transactions;
  test = await createTestApp({ ticketPayments: sui.ticketPayments });
  userId = insertUser(test.db);
}

/** A Sui transaction, new unless named, that paid `amount` JPYC into the ticket vault, by default for the signed-in person. */
function paid(amount: bigint, payment: Partial<JpycPayment> = {}, txDigest = newTxDigest()) {
  transactions.set(txDigest, [
    {
      vault: TEST_PAYMENT_TARGET.vault,
      payer: `0x${"d".repeat(64)}`,
      amount,
      reference: ticketPaymentReference(userId),
      ...payment,
    },
  ]);
  return txDigest;
}

beforeEach(() => start());
afterEach(() => {
  vi.restoreAllMocks();
});

const getTickets = async (as = userId) =>
  (await bodyOf(await test.send("GET", "/api/tickets", { as }), ticketsBodySchema)).tickets;

/** Asks to spend a ticket of `kind`: a new spend, unless `idempotencyKey` repeats one. */
const spend = (kind: TicketKind, idempotencyKey?: string, as = userId) =>
  test.send("POST", "/api/tickets/spend", { as, body: spendBody(kind, idempotencyKey) });

/** Spends a ticket of `kind`, which must be granted. */
const spendTicket = async (kind: TicketKind, idempotencyKey?: string) =>
  bodyOf(await spend(kind, idempotencyKey), spendBodySchema, 201);

/** Spends `times` tickets of `kind`, each of which must be granted, and returns the answers in order. */
async function spendTickets(kind: TicketKind, times: number) {
  const answers = [];
  for (let spent = 0; spent < times; spent++) answers.push(await spendTicket(kind));
  return answers;
}

const buy = (body: object, as = userId) => test.send("POST", "/api/ticket-purchases", { as, body });

const getShop = async (as = userId) =>
  (await bodyOf(await test.send("GET", "/api/ticket-shop", { as }), shopBodySchema)).shop;

/** Pays `pack`'s price and buys it, which must be granted, and returns the tickets after. */
async function buyPack(pack: (typeof TICKET_PACKS)[number], txDigest = paid(jpycOf(pack))) {
  const response = await buy({ tickets: pack.tickets, txDigest });
  return (await bodyOf(response, ticketsBodySchema, 201)).tickets;
}

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
      expect(await refusalOf(await spend(kind))).toMatchObject({
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
    expect(await refusalOf(await spend("reserve"))).toMatchObject({
      status: 409,
      error: "no_tickets_left",
    });
  });

  it("refuse the other kind than the next ticket with ticket_kind_changed, spending nothing", async () => {
    await buyPack(PACK);
    const kindChanged = { status: 409, error: "ticket_kind_changed" };
    expect(await refusalOf(await spend("reserve"))).toMatchObject(kindChanged);
    await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    expect(await refusalOf(await spend("daily"))).toMatchObject(kindChanged);
    expect(ticketUseCount()).toBe(DAILY_TICKETS_PER_DAY);
    expect((await getTickets()).reserveLeft).toBe(PACK.tickets);
  });

  it("answer a key already spent with its ticket use and the tickets now, whatever kind it asks, spending nothing more", async () => {
    const key = randomUUID();
    const first = await spendTicket("daily", key);
    const next = await spendTicket("daily");
    expect(next.ticketUse.dayIndex).toBe(first.ticketUse.dayIndex + 1);
    // No reserve ticket is left, so a new spend of one would be refused: only the key grants it.
    const again = await bodyOf(await spend("reserve", key), spendBodySchema, 200);
    expect(again).toEqual({ ticketUse: first.ticketUse, tickets: next.tickets });
    expect(ticketUseCount()).toBe(2);
  });

  it("spend the same key once for each person, and answer each their own ticket use again", async () => {
    const key = randomUUID();
    const someoneElse = insertUser(test.db);
    const mine = await spendTicket("daily", key);
    const theirs = await bodyOf(await spend("daily", key, someoneElse), spendBodySchema, 201);
    for (const [as, spent] of [
      [userId, mine],
      [someoneElse, theirs],
    ] as const) {
      const again = await bodyOf(await spend("daily", key, as), spendBodySchema, 200);
      expect(again.ticketUse).toEqual(spent.ticketUse);
    }
    expect(test.db.select().from(ticketUses).all()).toHaveLength(2);
  });

  it("refuse a spend without a UUID key, spending nothing", async () => {
    for (const body of [{ kind: "daily" }, { kind: "daily", idempotencyKey: "spend-1" }]) {
      const response = await test.send("POST", "/api/tickets/spend", { as: userId, body });
      expect(await refusalOf(response)).toMatchObject({ status: 400, error: "invalid_request" });
    }
    expect(ticketUseCount()).toBe(0);
  });

  it("price each pack in JPYC at one yen each, and name the signed-in person as the payment's reference", async () => {
    const shop = await getShop();
    expect(shop.packs.map(({ tickets, priceYen }) => ({ tickets, priceYen }))).toEqual(
      TICKET_PACKS,
    );
    for (const pack of shop.packs) {
      expect(pack.priceYen * PERCENT).toBe(
        pack.tickets * TICKET_PRICE_YEN * (PERCENT - pack.discountPercent),
      );
      expect(BigInt(pack.priceJpyc)).toBe(jpycOf(pack));
    }
    const someoneElse = await getShop(insertUser(test.db));
    expect(shop.payment).toMatchObject(TEST_PAYMENT_TARGET);
    expect(shop.payment.reference).not.toBe(someoneElse.payment.reference);
  });

  it("add each pack's tickets, recording its price and the JPYC paid", async () => {
    let reserveLeft = 0;
    for (const pack of TICKET_PACKS) {
      const txDigest = paid(jpycOf(pack));
      reserveLeft += pack.tickets;
      expect((await buyPack(pack, txDigest)).reserveLeft).toBe(reserveLeft);
      expect(purchaseOf(txDigest)).toMatchObject({
        userId,
        priceYen: pack.priceYen,
        paidJpyc: jpycOf(pack).toString(),
        verifiedAt: test.clock.now(),
      });
    }
  });

  it("refuse a payment short of its pack, into another vault, or for someone else", async () => {
    const price = jpycOf(PACK);
    const cases = [
      { txDigest: paid(price - 1n), status: 402, error: "payment_short" },
      {
        txDigest: paid(price, { vault: `0x${"e".repeat(64)}` }),
        status: 422,
        error: "payment_not_found",
      },
      {
        txDigest: paid(price, { reference: ticketPaymentReference("someone-else") }),
        status: 403,
        error: "payment_not_yours",
      },
    ];
    for (const { txDigest, status, error } of cases) {
      const response = await buy({ tickets: PACK.tickets, txDigest });
      expect(await refusalOf(response)).toMatchObject({ status, error });
    }
    expect(test.db.select().from(ticketPurchases).all()).toEqual([]);
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("count nothing for a payment Sui doesn't show yet, and add its tickets once Sui does", async () => {
    const txDigest = newTxDigest();
    const early = await buy({ tickets: PACK.tickets, txDigest });
    expect(await refusalOf(early)).toMatchObject({ status: 409, error: "payment_not_landed" });
    expect(purchaseOf(txDigest)).toBeUndefined();

    paid(jpycOf(PACK), {}, txDigest);
    expect((await buyPack(PACK, txDigest)).reserveLeft).toBe(PACK.tickets);
  });

  it("count a payment once, whoever sends it again", async () => {
    const txDigest = paid(jpycOf(PACK));
    await buyPack(PACK, txDigest);
    const someoneElse = insertUser(test.db);
    for (const as of [userId, someoneElse]) {
      const again = await buy({ tickets: PACK.tickets, txDigest }, as);
      expect(await refusalOf(again)).toMatchObject({
        status: 409,
        error: "payment_already_counted",
      });
    }
    expect((await getTickets()).reserveLeft).toBe(PACK.tickets);
    expect((await getTickets(someoneElse)).reserveLeft).toBe(0);
  });

  it("refuse a count that isn't a pack, and a digest that isn't Sui's", async () => {
    const notAPack = await buy({ tickets: NOT_A_PACK, txDigest: paid(jpycOf(PACK)) });
    expect(await refusalOf(notAPack)).toMatchObject({ status: 400, error: "pack_unknown" });
    for (const txDigest of [bytes32("an EVM transaction"), "0".repeat(TX_DIGEST_LENGTH)]) {
      const malformed = await buy({ tickets: PACK.tickets, txDigest });
      expect(await refusalOf(malformed)).toMatchObject({ status: 400, error: "invalid_request" });
    }
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("count no tickets while Sui can't be asked, and log it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const txDigest = newTxDigest();
    const outage = new Error("fullnode unreachable");
    transactions.set(txDigest, outage);
    const response = await buy({ tickets: PACK.tickets, txDigest });
    expect(await refusalOf(response)).toMatchObject({ status: 502, error: "sui_unavailable" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(txDigest));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(outage.message));
    expect(purchaseOf(txDigest)).toBeUndefined();
    expect((await getTickets()).reserveLeft).toBe(0);
  });
});
