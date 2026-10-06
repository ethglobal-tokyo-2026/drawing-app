import { randomUUID } from "node:crypto";
import {
  DAILY_TICKETS_PER_DAY,
  suiTransactions,
  ticketPurchases,
  ticketUses,
} from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ticketShopSchema, ticketsSchema, type SponsoredTransaction } from "../shapes.ts";
import { SponsorshipError } from "../sui/types.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import { ticketPaymentReference } from "../tickets/paymentReference.ts";
import {
  payPurchase,
  purchasesApp,
  signedBy,
  startedPurchase,
  startPurchase,
  type PurchasesApp,
} from "../tickets/testPurchases.ts";
import { spendBody } from "../tickets/testSpends.ts";
import {
  TICKET_PACKS,
  TICKET_PRICE_YEN,
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

let shop: PurchasesApp;
let test: TestApp;
let userId: string;

/** A fresh app on the fake Sui chain, and a buyer signed in to it. */
async function start() {
  shop = await purchasesApp();
  test = shop.test;
  userId = shop.buyer();
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

const getShop = async (as = userId) =>
  (await bodyOf(await test.send("GET", "/api/ticket-shop", { as }), shopBodySchema)).shop;

/** Starts a purchase of `pack` as `as`, which must be granted. */
const started = (pack: { tickets: number }, as = userId) => startedPurchase(test, as, pack.tickets);

/** Pays `purchaseId` with `as`'s signature over `payment`. */
const pay = async (purchaseId: number, payment: SponsoredTransaction, as = userId) =>
  payPurchase(test, as, purchaseId, await signedBy(shop.walletOf(as), payment));

/** Starts a purchase of `pack`, signs and pays it, and returns the tickets after. */
async function buyPack(pack: (typeof TICKET_PACKS)[number]) {
  const { purchase, payment } = await started(pack);
  return (await bodyOf(await pay(purchase.id, payment), ticketsBodySchema, 201)).tickets;
}

const ticketUseCount = () =>
  test.db.select().from(ticketUses).where(eq(ticketUses.userId, userId)).all().length;

const purchaseRow = (id: number) =>
  test.db.select().from(ticketPurchases).where(eq(ticketPurchases.id, id)).get();

/** The payment row the server stored for `digest`. */
const paymentRow = (digest: string) =>
  test.db.select().from(suiTransactions).where(eq(suiTransactions.digest, digest)).get();

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

  it("start a purchase of a pack, unpaid, with a payment the server built for the buyer's wallet", async () => {
    const { purchase, payment } = await started(PACK);
    expect(purchase).toEqual({ id: purchase.id, tickets: PACK.tickets, priceYen: PACK.priceYen });
    expect(purchaseRow(purchase.id)).toMatchObject({ userId, paidJpyc: null, verifiedAt: null });
    expect(shop.chain.built.at(-1)).toEqual({
      kind: "payment",
      payment: {
        sender: shop.walletOf(userId).toSuiAddress(),
        amount: jpycOf(PACK),
        reference: ticketPaymentReference(userId, purchase.id),
      },
    });
    expect(paymentRow(payment.digest)).toMatchObject({ kind: "payment", purchaseId: purchase.id });
  });

  it("add each pack's tickets once its signed payment lands, recording what it paid", async () => {
    let reserveLeft = 0;
    for (const pack of TICKET_PACKS) {
      const { purchase, payment } = await started(pack);
      reserveLeft += pack.tickets;
      const paid = await bodyOf(await pay(purchase.id, payment), ticketsBodySchema, 201);
      expect(paid.tickets.reserveLeft).toBe(reserveLeft);
      expect(purchaseRow(purchase.id)).toMatchObject({
        paidJpyc: jpycOf(pack).toString(),
        verifiedAt: test.clock.now(),
      });
      expect(paymentRow(payment.digest)?.outcome).toBe("succeeded");
    }
  });

  it("send a payment once when its answer was lost, and add its tickets when the same signature comes again", async () => {
    const { purchase, payment } = await started(PACK);
    shop.chain.answerNext("lost");
    expect(await refusalOf(await pay(purchase.id, payment))).toMatchObject({
      status: 503,
      error: "payment_not_landed",
    });
    expect((await getTickets()).reserveLeft).toBe(0);
    // Sui ran it after all.
    shop.chain.show(payment.digest, { ok: true, events: shop.chain.eventsFor(payment.digest) });
    expect(
      (await bodyOf(await pay(purchase.id, payment), ticketsBodySchema, 201)).tickets.reserveLeft,
    ).toBe(PACK.tickets);
    expect(shop.chain.submissions.map(({ digest }) => digest)).toEqual([payment.digest]);
  });

  it("give a purchase up when Sui ran its payment and it failed, adding no tickets", async () => {
    const { purchase, payment } = await started(PACK);
    shop.chain.answerNext({ ok: false, failure: "MoveAbort(…, 0) in command 1" });
    expect(await refusalOf(await pay(purchase.id, payment))).toMatchObject({
      status: 409,
      error: "transaction_failed",
    });
    expect(purchaseRow(purchase.id)).toMatchObject({
      verifiedAt: null,
      givenUpAt: test.clock.now(),
    });
    expect((await getTickets()).reserveLeft).toBe(0);
  });

  it("refuse a payment signed after its sponsorship lapsed, so the app starts the purchase again", async () => {
    const { purchase, payment } = await started(PACK);
    test.clock.set(new Date(payment.expiresAt));
    expect(await refusalOf(await pay(purchase.id, payment))).toMatchObject({
      status: 409,
      error: "sponsorship_expired",
    });
    expect(shop.chain.submissions).toEqual([]);
    expect(purchaseRow(purchase.id)?.givenUpAt).toEqual(test.clock.now());
  });

  it("refuse a signature that isn't the buyer's wallet's, submitting nothing", async () => {
    const { purchase, payment } = await started(PACK);
    const forger = shop.buyer();
    const forged = await signedBy(shop.walletOf(forger), payment);
    expect(await refusalOf(await payPurchase(test, userId, purchase.id, forged))).toMatchObject({
      status: 400,
      error: "signature_invalid",
    });
    expect(shop.chain.submissions).toEqual([]);
    expect(purchaseRow(purchase.id)?.verifiedAt).toBeNull();
  });

  it("refuse someone else's purchase, one that doesn't exist, and a digest that isn't the purchase's payment", async () => {
    const { purchase, payment } = await started(PACK);
    const someoneElse = shop.buyer();
    const signed = await signedBy(shop.walletOf(someoneElse), payment);
    expect(
      await refusalOf(await payPurchase(test, someoneElse, purchase.id, signed)),
    ).toMatchObject({
      status: 403,
      error: "payment_not_yours",
    });
    expect(await refusalOf(await payPurchase(test, userId, purchase.id + 1, signed))).toMatchObject(
      {
        status: 404,
        error: "purchase_not_found",
      },
    );
    const theirs = await started(PACK, someoneElse);
    const wrong = await signedBy(shop.walletOf(userId), theirs.payment);
    expect(await refusalOf(await payPurchase(test, userId, purchase.id, wrong))).toMatchObject({
      status: 409,
      error: "sponsorship_expired",
    });
    expect(shop.chain.submissions).toEqual([]);
  });

  it("drop an earlier payment never signed when the buyer starts another, giving its purchase up", async () => {
    const first = await started(PACK);
    const second = await started(PACK);
    expect(paymentRow(first.payment.digest)?.outcome).toBe("dead");
    expect(purchaseRow(first.purchase.id)?.givenUpAt).toEqual(test.clock.now());
    expect(
      (await bodyOf(await pay(second.purchase.id, second.payment), ticketsBodySchema, 201)).tickets
        .reserveLeft,
    ).toBe(PACK.tickets);
  });

  it("refuse a buyer without a Sui wallet, and give up a purchase Shinami won't sponsor", async () => {
    const walletless = insertUser(test.db);
    shop.without.add(walletless);
    expect(await refusalOf(await startPurchase(test, walletless, PACK.tickets))).toMatchObject({
      status: 409,
      error: "no_sui_wallet",
    });
    shop.chain.refuseNext(new SponsorshipError("refused", "The payer holds too little JPYC"));
    expect(await refusalOf(await startPurchase(test, userId, PACK.tickets))).toMatchObject({
      status: 422,
      error: "sponsorship_refused",
    });
    const [refused] = test.db.select().from(ticketPurchases).all();
    expect(refused).toMatchObject({ userId, givenUpAt: test.clock.now(), verifiedAt: null });
  });

  it("refuse a count that isn't a pack, and a payment whose digest or signature isn't Sui's", async () => {
    expect(await refusalOf(await startPurchase(test, userId, NOT_A_PACK))).toMatchObject({
      status: 400,
      error: "pack_unknown",
    });
    expect(test.db.select().from(ticketPurchases).all()).toEqual([]);
    const { purchase, payment } = await started(PACK);
    for (const body of [
      { digest: "0".repeat(44), signature: "c2lnbmVk" },
      { digest: payment.digest, signature: "not base64!" },
    ]) {
      expect(await refusalOf(await payPurchase(test, userId, purchase.id, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });

  it("start and pay nothing in mock chain mode", async () => {
    const mock = await createTestApp();
    const someone = insertUser(mock.db);
    expect(await refusalOf(await startPurchase(mock, someone, PACK.tickets))).toMatchObject({
      status: 503,
      error: "chain_unavailable",
    });
  });
});
