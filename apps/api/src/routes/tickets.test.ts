import { ticketPurchases, ticketUses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorBodySchema } from "../errors.ts";
import { ticketsSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiPayments } from "../testing/fakes.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { nextTicketDayStart, ticketDay } from "../ticketDays.ts";
import { FREE_TICKETS_PER_DAY, TICKET_PACKS, ticketUseSchema } from "../tickets/tickets.ts";

const ticketsBodySchema = z.object({ tickets: ticketsSchema });
const spendBodySchema = z.object({ ticketUse: ticketUseSchema, tickets: ticketsSchema });

const TOKYO = "Asia/Tokyo";
/** Its 4:00 comes at another moment than Tokyo's, so a test can tell the person's zone is used. */
const NEW_YORK = "America/New_York";
/** A sealed sticker's cut, for the ticket stubs. */
const SEALED_CUT = { outline: "M0 0H4V2Z", width: 4, height: 2 };

/** The pack after the single ticket: it has tickets to spare once one is spent. */
const [, PACK] = TICKET_PACKS;
/** More tickets than any pack holds. */
const NOT_A_PACK = Math.max(...TICKET_PACKS.map((pack) => pack.tickets)) + 1;
/** 1 SUI in MIST. The mock payment's amount isn't checked. */
const PAID_MIST = "1000000000";

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

/** A fresh app, and a person in Tokyo signed in to it. */
async function start(overrides: Parameters<typeof createTestApp>[0] = {}) {
  test = await createTestApp(overrides);
  userId = insertUser(test.db, { timeZone: TOKYO });
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

const spend = (as: Headers = headers) =>
  test.app.request("/api/tickets/spend", { method: "POST", headers: as });

/** Spends a ticket, which must be granted. */
async function spendTicket(as: Headers = headers) {
  const response = await spend(as);
  expect(response.status).toBe(201);
  return spendBodySchema.parse(await response.json());
}

/** Spends `times` tickets, each of which must be granted, and returns the answers in order. */
async function spendTickets(times: number, as: Headers = headers) {
  const answers = [];
  for (let spent = 0; spent < times; spent++) answers.push(await spendTicket(as));
  return answers;
}

const buy = (body: object, as: Headers = headers) =>
  test.app.request("/api/ticket-purchases", {
    method: "POST",
    headers: { ...as, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

/** Buys `pack`, which must be granted, and returns the tickets after. */
async function buyPack(pack: { tickets: number }, txDigest = newTxDigest(), as = headers) {
  const response = await buy({ tickets: pack.tickets, txDigest, paidMist: PAID_MIST }, as);
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
  it("give a new person the day's free tickets, the packs, and a refill at 4:00 in their zone", async () => {
    const now = test.clock.now();
    expect(await getTickets()).toEqual({
      ticketDay: ticketDay(now, TOKYO),
      freePerDay: FREE_TICKETS_PER_DAY,
      freeLeft: FREE_TICKETS_PER_DAY,
      paidLeft: 0,
      nextRefillAt: nextTicketDayStart(now, TOKYO).toISOString(),
      usedToday: [],
      packs: TICKET_PACKS,
    });
  });

  it("spend the day's free tickets in order, then refuse with no_tickets_left", async () => {
    const answers = await spendTickets(FREE_TICKETS_PER_DAY);
    answers.forEach(({ ticketUse, tickets }, dayIndex) => {
      expect(ticketUse).toMatchObject({ dayIndex, ticketDay: tickets.ticketDay });
      expect(tickets.freeLeft).toBe(FREE_TICKETS_PER_DAY - (dayIndex + 1));
      expect(tickets.usedToday.map((use) => use.id)).toEqual(
        answers.slice(0, dayIndex + 1).map((answer) => answer.ticketUse.id),
      );
    });
    expect(await refusal(await spend())).toMatchObject({ status: 409, error: "no_tickets_left" });
    expect(ticketUseCount()).toBe(FREE_TICKETS_PER_DAY);
  });

  it("turn the day over at 4:00 in the person's own zone", async () => {
    const newYorker = await test.signInAs(insertUser(test.db, { timeZone: NEW_YORK }));
    const answers = await spendTickets(FREE_TICKETS_PER_DAY, newYorker);
    const { nextRefillAt, ticketDay: spentDay } = answers[answers.length - 1].tickets;
    expect(nextRefillAt).toBe(nextTicketDayStart(test.clock.now(), NEW_YORK).toISOString());

    test.clock.set(new Date(Date.parse(nextRefillAt) - 1));
    expect(await getTickets(newYorker)).toMatchObject({ ticketDay: spentDay, freeLeft: 0 });

    test.clock.set(new Date(nextRefillAt));
    const refilled = await getTickets(newYorker);
    expect(refilled).toMatchObject({ freeLeft: FREE_TICKETS_PER_DAY, usedToday: [] });
    expect(refilled.ticketDay).not.toBe(spentDay);
  });

  it("show the sticker each of today's tickets became, and null for one not sealed", async () => {
    const [sealed, abandoned] = await spendTickets(FREE_TICKETS_PER_DAY);
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

  it("take paid tickets once the free ones are spent, and carry the rest into the next day", async () => {
    await buyPack(PACK);
    await spendTickets(FREE_TICKETS_PER_DAY);
    const firstPaid = await spendTicket();
    const carried = PACK.tickets - 1;
    expect(firstPaid.ticketUse.dayIndex).toBe(FREE_TICKETS_PER_DAY);
    expect(firstPaid.tickets).toMatchObject({ freeLeft: 0, paidLeft: carried });

    test.clock.set(new Date(firstPaid.tickets.nextRefillAt));
    expect(await getTickets()).toMatchObject({ freeLeft: FREE_TICKETS_PER_DAY, paidLeft: carried });
    const nextDay = await spendTickets(FREE_TICKETS_PER_DAY + carried);
    expect(nextDay[nextDay.length - 1].tickets).toMatchObject({ freeLeft: 0, paidLeft: 0 });
    expect(await refusal(await spend())).toMatchObject({ status: 409, error: "no_tickets_left" });
  });

  it("add each pack's tickets, recording the pack's price and the verified payment", async () => {
    let paidLeft = 0;
    for (const pack of TICKET_PACKS) {
      const txDigest = newTxDigest();
      paidLeft += pack.tickets;
      expect((await buyPack(pack, txDigest)).paidLeft).toBe(paidLeft);
      expect(purchaseOf(txDigest)).toMatchObject({
        userId,
        priceYen: pack.priceYen,
        paidMist: PAID_MIST,
        verifiedAt: test.clock.now(),
      });
    }
  });

  it("count a payment once, whoever sends it again", async () => {
    const txDigest = newTxDigest();
    await buyPack(PACK, txDigest);
    const someoneElse = await test.signInAs(insertUser(test.db));
    for (const as of [headers, someoneElse]) {
      const again = await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST }, as);
      expect(await refusal(again)).toMatchObject({ status: 409, error: "payment_already_counted" });
    }
    expect((await getTickets()).paidLeft).toBe(PACK.tickets);
    expect((await getTickets(someoneElse)).paidLeft).toBe(0);
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
    expect((await getTickets()).paidLeft).toBe(0);
  });

  it("count no tickets for a payment Sui doesn't verify, and log it", async () => {
    await start({ sui: fakeSuiPayments(false) });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const txDigest = newTxDigest();
    const response = await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST });
    expect(await refusal(response)).toMatchObject({ status: 500, error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(txDigest));
    expect(purchaseOf(txDigest)).toBeUndefined();
    expect((await getTickets()).paidLeft).toBe(0);
  });

  it("refuse every route without a session", async () => {
    const txDigest = newTxDigest();
    for (const response of [
      await test.app.request("/api/tickets"),
      await spend({}),
      await buy({ tickets: PACK.tickets, txDigest, paidMist: PAID_MIST }, {}),
    ]) {
      expect(await refusal(response)).toMatchObject({ status: 401, error: "signed_out" });
    }
    expect(ticketUseCount()).toBe(0);
    expect(purchaseOf(txDigest)).toBeUndefined();
  });
});
