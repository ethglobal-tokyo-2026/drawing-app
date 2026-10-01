import { ticketPurchases } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "../midnightJob.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeTicketPayments } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  PURCHASE_PAYMENT_WINDOW_MS,
  PURCHASE_SWEEP_EVERY_MS,
  startTicketPurchaseSweeps,
  sweepTicketPurchases,
} from "./purchaseSweep.ts";
import { payOnSui, reportPayment, startedPurchase } from "./testPurchases.ts";
import { TICKET_PACKS, ticketPaymentReference, ticketsLeftOf } from "./tickets.ts";

const [, PACK] = TICKET_PACKS;

let test: TestApp;
let sui: ReturnType<typeof fakeTicketPayments>;
let userId: string;
let log: LogLines;

beforeEach(async () => {
  log = captureLogLines();
  sui = fakeTicketPayments();
  test = await createTestApp({ ticketPayments: sui.ticketPayments });
  userId = insertUser(test.db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const start = () => startedPurchase(test, userId, PACK.tickets);
const sweep = () => sweepTicketPurchases(test.deps);
const purchaseRow = (id: number) =>
  test.db.select().from(ticketPurchases).where(eq(ticketPurchases.id, id)).get();
const reserveLeft = () => ticketsLeftOf(test.db, userId, test.clock.now()).reserveLeft;

describe("the ticket purchase sweep", () => {
  it("credits a purchase whose payment the app never reported, from the payment's event, once", async () => {
    const purchase = await start();
    const txDigest = payOnSui(sui.transactions, purchase);
    await sweep();
    expect(purchaseRow(purchase.id)).toMatchObject({
      txDigest,
      paidJpyc: purchase.priceJpyc,
      verifiedAt: test.clock.now(),
    });
    log.expectLogged("ticket_purchase.sweep.credited", {
      userId,
      purchaseId: purchase.id,
      txDigest,
    });
    await sweep();
    expect(reserveLeft()).toBe(PACK.tickets);
    // The app's own report, coming late, finds it counted.
    expect((await reportPayment(test, userId, purchase.id, txDigest)).status).toBe(409);
  });

  it("leaves a purchase open past payments into another vault, short of its price, or naming no purchase of its person", async () => {
    const purchase = await start();
    const someoneElse = insertUser(test.db);
    for (const change of [
      { vault: `0x${"e".repeat(64)}` },
      { amount: BigInt(purchase.priceJpyc) - 1n },
      { reference: "order-42" },
      { reference: ticketPaymentReference(someoneElse, purchase.id) },
      { reference: ticketPaymentReference(userId, purchase.id + 1) },
    ]) {
      payOnSui(sui.transactions, purchase, change);
    }
    await sweep();
    expect(purchaseRow(purchase.id)).toMatchObject({
      txDigest: null,
      verifiedAt: null,
      givenUpAt: null,
    });
    expect(reserveLeft()).toBe(0);
    log.expectLogged("ticket_purchase.sweep.short", { userId, purchaseId: purchase.id });
  });

  it("gives up a purchase no payment came for within the window, once a read reached back to it, and still counts one the app reports later", async () => {
    const purchase = await start();
    // The database stamps when it started.
    const startedAt = purchaseRow(purchase.id)?.createdAt.getTime() ?? NaN;
    test.clock.set(new Date(startedAt + PURCHASE_PAYMENT_WINDOW_MS - 1));
    await sweep();
    expect(purchaseRow(purchase.id)?.givenUpAt).toBeNull();

    test.clock.advance(1);
    sui.events.read = "stopped_short";
    await sweep();
    expect(purchaseRow(purchase.id)?.givenUpAt).toBeNull();

    sui.events.read = "whole";
    await sweep();
    expect(purchaseRow(purchase.id)?.givenUpAt).toEqual(test.clock.now());
    log.expectLogged("ticket_purchase.sweep.given_up", { userId, purchaseId: purchase.id });

    const txDigest = payOnSui(sui.transactions, purchase);
    await sweep();
    expect(purchaseRow(purchase.id)?.verifiedAt).toBeNull();
    expect((await reportPayment(test, userId, purchase.id, txDigest)).status).toBe(201);
    expect(reserveLeft()).toBe(PACK.tickets);
  });

  it("runs at boot and every PURCHASE_SWEEP_EVERY_MS after, logging a failed read or credit and going on", async () => {
    const purchase = await start();
    const failing = await start();
    // Newest first, so the failing purchase comes up before the other.
    payOnSui(sui.transactions, purchase);
    payOnSui(sui.transactions, failing);
    test.sqlite.exec(
      `CREATE TRIGGER fail_credit BEFORE UPDATE ON ticket_purchases WHEN OLD.id = ${failing.id}
       BEGIN SELECT RAISE(ABORT, 'disk I/O error'); END`,
    );
    sui.events.read = new Error("fullnode unreachable");
    const due: { run: () => void; ms: number }[] = [];
    const schedule: Schedule = (run, ms) => {
      due.push({ run, ms });
      return () => {};
    };
    const sweeps = startTicketPurchaseSweeps({ ...test.deps, schedule });
    await sweeps.idle();
    log.expectLogged("ticket_purchase.sweep_failed");
    expect(due.map(({ ms }) => ms)).toEqual([PURCHASE_SWEEP_EVERY_MS]);
    expect(purchaseRow(purchase.id)?.verifiedAt).toBeNull();

    sui.events.read = "whole";
    due[0]?.run();
    await sweeps.idle();
    log.expectLogged("ticket_purchase.sweep.failed", { userId, purchaseId: failing.id });
    expect(purchaseRow(failing.id)?.verifiedAt).toBeNull();
    expect(purchaseRow(purchase.id)?.verifiedAt).toEqual(test.clock.now());
    expect(due).toHaveLength(2);
    sweeps.stop();
  });
});
