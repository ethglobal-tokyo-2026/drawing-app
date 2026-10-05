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
import {
  newTxDigest,
  payOnSui,
  reportPayment,
  startedPurchase,
  startPurchase,
  TX_DIGEST_LENGTH,
} from "../tickets/testPurchases.ts";
import { purchaseNamedBy, ticketPaymentReference } from "../tickets/paymentReference.ts";
import { spendBody } from "../tickets/testSpends.ts";
import {
  TICKET_PACKS,
  TICKET_PRICE_YEN,
  ticketUseSchema,
  type StartedTicketPurchase,
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

/** Starts a purchase of `pack` as `as`, which must be granted. */
const started = (pack: { tickets: number }, as = userId) => startedPurchase(test, as, pack.tickets);

/** A Sui transaction, new unless named, that pays `purchase` in full, but for `change`. */
const paid = (
  purchase: StartedTicketPurchase,
  change: Partial<JpycPayment> = {},
  txDigest?: string,
) => payOnSui(transactions, purchase, change, txDigest);

/** Reports `txDigest` as `purchase`'s payment, as `as`. */
const report = (purchase: { id: number }, txDigest: string, as = userId) =>
  reportPayment(test, as, purchase.id, txDigest);

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

const getShop = async (as = userId) =>
  (await bodyOf(await test.send("GET", "/api/ticket-shop", { as }), shopBodySchema)).shop;

/** Reports `txDigest` as `purchase`'s payment, which must be granted, and returns the tickets after. */
const reportPaid = async (purchase: { id: number }, txDigest: string) =>
  (await bodyOf(await report(purchase, txDigest), ticketsBodySchema, 201)).tickets;

/** Starts a purchase of `pack`, pays it and reports the payment, and returns the tickets after. */
async function buyPack(pack: (typeof TICKET_PACKS)[number]) {
  const purchase = await started(pack);
  return reportPaid(purchase, paid(purchase));
}

const ticketUseCount = () =>
  test.db.select().from(ticketUses).where(eq(ticketUses.userId, userId)).all().length;

const purchaseRow = (id: number) =>
  test.db.select().from(ticketPurchases).where(eq(ticketPurchases.id, id)).get();

/** Every purchase recorded for anyone. */
const allPurchases = () => test.db.select().from(ticketPurchases).all();

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

  it("price each pack in JPYC at one yen each, and say where to pay", async () => {
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
    expect(shop.payment).toMatchObject(TEST_PAYMENT_TARGET);
  });

  it("start a purchase of a pack, unpaid, with a payment reference that names it and the person", async () => {
    const purchase = await started(PACK);
    expect(purchase).toEqual({
      id: purchase.id,
      tickets: PACK.tickets,
      priceYen: PACK.priceYen,
      priceJpyc: jpycOf(PACK).toString(),
      reference: ticketPaymentReference(userId, purchase.id),
    });
    expect(purchaseNamedBy(purchase.reference)).toEqual({ userId, purchaseId: purchase.id });
    expect(purchaseRow(purchase.id)).toMatchObject({
      userId,
      tickets: PACK.tickets,
      priceYen: PACK.priceYen,
      paidJpyc: null,
      txDigest: null,
      verifiedAt: null,
    });
    // Each purchase is paid with a reference of its own.
    expect((await started(PACK)).reference).not.toBe(purchase.reference);
  });

  it("count a purchase's tickets only once its payment is checked", async () => {
    const purchase = await started(PACK);
    // A payment recorded on a purchase but never checked counts no more than none.
    const unchecked = await started(PACK);
    test.db
      .update(ticketPurchases)
      .set({ txDigest: newTxDigest(), paidJpyc: jpycOf(PACK).toString() })
      .where(eq(ticketPurchases.id, unchecked.id))
      .run();
    expect((await getTickets()).reserveLeft).toBe(0);
    expect((await reportPaid(purchase, paid(purchase))).reserveLeft).toBe(PACK.tickets);
  });

  it("add each pack's tickets, recording the payment on its purchase", async () => {
    let reserveLeft = 0;
    for (const pack of TICKET_PACKS) {
      const purchase = await started(pack);
      const txDigest = paid(purchase);
      reserveLeft += pack.tickets;
      expect((await reportPaid(purchase, txDigest)).reserveLeft).toBe(reserveLeft);
      expect(purchaseRow(purchase.id)).toMatchObject({
        userId,
        priceYen: pack.priceYen,
        paidJpyc: jpycOf(pack).toString(),
        txDigest,
        verifiedAt: test.clock.now(),
      });
    }
  });

  it("refuse a payment short of its pack, into another vault, for another purchase or for someone else", async () => {
    const purchase = await started(PACK);
    const another = await started(PACK);
    const theirs = await started(PACK, insertUser(test.db));
    const cases = [
      {
        txDigest: paid(purchase, { amount: jpycOf(PACK) - 1n }),
        status: 402,
        error: "payment_short",
      },
      {
        txDigest: paid(purchase, { vault: `0x${"e".repeat(64)}` }),
        status: 422,
        error: "payment_not_found",
      },
      { txDigest: paid(another), status: 422, error: "payment_not_found" },
      { txDigest: paid(theirs), status: 403, error: "payment_not_yours" },
    ];
    for (const { txDigest, status, error } of cases) {
      expect(await refusalOf(await report(purchase, txDigest))).toMatchObject({ status, error });
    }
    expect(allPurchases().filter((row) => row.verifiedAt !== null)).toEqual([]);
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("refuse a payment reported for someone else's purchase, or for one that doesn't exist", async () => {
    const theirs = await started(PACK, insertUser(test.db));
    // Paid naming the person reporting it, so only the purchase's owner tells it apart.
    const txDigest = paid(theirs, { reference: ticketPaymentReference(userId, theirs.id) });
    expect(await refusalOf(await report(theirs, txDigest))).toMatchObject({
      status: 403,
      error: "payment_not_yours",
    });
    expect(await refusalOf(await report({ id: theirs.id + 1 }, txDigest))).toMatchObject({
      status: 404,
      error: "purchase_not_found",
    });
    expect(purchaseRow(theirs.id)?.verifiedAt).toBeNull();
  });

  it("count nothing for a payment Sui doesn't show yet, and add its tickets once Sui does", async () => {
    const purchase = await started(PACK);
    const txDigest = newTxDigest();
    expect(await refusalOf(await report(purchase, txDigest))).toMatchObject({
      status: 409,
      error: "payment_not_landed",
    });
    expect(purchaseRow(purchase.id)?.verifiedAt).toBeNull();

    paid(purchase, {}, txDigest);
    expect((await reportPaid(purchase, txDigest)).reserveLeft).toBe(PACK.tickets);
  });

  it("count a payment once, and a purchase once, whoever reports it again", async () => {
    const purchase = await started(PACK);
    const txDigest = paid(purchase);
    await reportPaid(purchase, txDigest);
    const someoneElse = insertUser(test.db);
    const theirs = await started(PACK, someoneElse);
    const counted = { status: 409, error: "payment_already_counted" };
    expect(await refusalOf(await report(purchase, txDigest))).toMatchObject(counted);
    expect(await refusalOf(await report(theirs, txDigest, someoneElse))).toMatchObject(counted);
    // A second payment for a purchase already paid buys nothing more.
    expect(await refusalOf(await report(purchase, paid(purchase)))).toMatchObject({
      status: 409,
      error: "purchase_already_paid",
    });
    expect((await getTickets()).reserveLeft).toBe(PACK.tickets);
    expect((await getTickets(someoneElse)).reserveLeft).toBe(0);
  });

  it("refuse a count that isn't a pack, and a digest that isn't Sui's", async () => {
    expect(await refusalOf(await startPurchase(test, userId, NOT_A_PACK))).toMatchObject({
      status: 400,
      error: "pack_unknown",
    });
    expect(allPurchases()).toEqual([]);
    const purchase = await started(PACK);
    for (const txDigest of [bytes32("an EVM transaction"), "0".repeat(TX_DIGEST_LENGTH)]) {
      expect(await refusalOf(await report(purchase, txDigest))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("count no tickets while Sui can't be asked, and log it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const purchase = await started(PACK);
    const txDigest = newTxDigest();
    const outage = new Error("fullnode unreachable");
    transactions.set(txDigest, outage);
    expect(await refusalOf(await report(purchase, txDigest))).toMatchObject({
      status: 502,
      error: "sui_unavailable",
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(txDigest));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(outage.message));
    expect(purchaseRow(purchase.id)?.verifiedAt).toBeNull();
    expect((await getTickets()).reserveLeft).toBe(0);
  });
});
