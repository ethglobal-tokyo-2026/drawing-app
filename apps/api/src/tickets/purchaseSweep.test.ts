import { ticketPurchases } from "@drawing-app/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "../midnightJob.ts";
import { SETTLE_GRACE_MS } from "../sui/transactions.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { refusalOf } from "../testing/responses.ts";
import {
  PURCHASE_PAYMENT_WINDOW_MS,
  PURCHASE_SWEEP_EVERY_MS,
  startTicketPurchaseSweeps,
  sweepTicketPurchases,
} from "./purchaseSweep.ts";
import {
  payPurchase,
  purchasesApp,
  signedBy,
  startedPurchase,
  type PurchasesApp,
} from "./testPurchases.ts";
import { TICKET_PACKS, ticketsLeftOf } from "./tickets.ts";

const [, PACK] = TICKET_PACKS;

let shop: PurchasesApp;
let userId: string;
let log: LogLines;

beforeEach(async () => {
  log = captureLogLines();
  shop = await purchasesApp();
  userId = shop.buyer();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const sweep = () => sweepTicketPurchases(shop.test.deps);
const purchaseRow = (id: number) =>
  shop.test.db.select().from(ticketPurchases).where(eq(ticketPurchases.id, id)).get();
const reserveLeft = () => ticketsLeftOf(shop.test.db, userId, shop.test.clock.now()).reserveLeft;

/** Starts a purchase, and sends its signed payment with Sui's answer lost on the way back. */
async function paidWithAnswerLost() {
  const started = await startedPurchase(shop.test, userId, PACK.tickets);
  shop.chain.answerNext("lost");
  const signed = await signedBy(shop.walletOf(userId), started.payment);
  expect(
    await refusalOf(await payPurchase(shop.test, userId, started.purchase.id, signed)),
  ).toMatchObject({ status: 503, error: "payment_not_landed" });
  return started;
}

describe("the ticket purchase sweep", () => {
  it("credits a payment whose answer the app never got, once Sui shows it ran, and only once", async () => {
    const { purchase, payment } = await paidWithAnswerLost();
    shop.chain.show(payment.digest, { ok: true, events: shop.chain.eventsFor(payment.digest) });
    await sweep();
    expect(purchaseRow(purchase.id)).toMatchObject({ verifiedAt: shop.test.clock.now() });
    expect(reserveLeft()).toBe(PACK.tickets);
    log.expectLogged("ticket_purchase.credited", { userId, purchaseId: purchase.id });
    await sweep();
    expect(reserveLeft()).toBe(PACK.tickets);
  });

  it("gives a purchase up once Sui shows its payment failed", async () => {
    const { purchase, payment } = await paidWithAnswerLost();
    shop.chain.show(payment.digest, { ok: false, failure: "MoveAbort(…, 0) in command 1" });
    await sweep();
    expect(purchaseRow(purchase.id)).toMatchObject({
      verifiedAt: null,
      givenUpAt: shop.test.clock.now(),
    });
    log.expectLogged("ticket_purchase.given_up", { userId, purchaseId: purchase.id });
  });

  it("gives up a purchase whose payment was never signed once its sponsorship lapses, and one Sui never showed after the grace", async () => {
    const unsigned = await startedPurchase(shop.test, userId, PACK.tickets);
    const other = shop.buyer();
    const lost = await startedPurchase(shop.test, other, PACK.tickets);
    shop.chain.answerNext("lost");
    await payPurchase(
      shop.test,
      other,
      lost.purchase.id,
      await signedBy(shop.walletOf(other), lost.payment),
    );

    shop.test.clock.set(new Date(unsigned.payment.expiresAt));
    await sweep();
    expect(purchaseRow(unsigned.purchase.id)?.givenUpAt).toEqual(shop.test.clock.now());
    // Sent, so it's followed through the grace before it counts as never run.
    expect(purchaseRow(lost.purchase.id)?.givenUpAt).toBeNull();

    shop.test.clock.advance(SETTLE_GRACE_MS);
    // Sui still doesn't show it, and won't take it again past its lapse.
    shop.chain.answerNext("lost");
    await sweep();
    expect(purchaseRow(lost.purchase.id)?.givenUpAt).toEqual(shop.test.clock.now());
  });

  it("gives up a purchase left with no payment once the window has passed", async () => {
    // The start stopped before its payment was sponsored.
    const [purchase] = shop.test.db
      .insert(ticketPurchases)
      .values({ userId, tickets: PACK.tickets, priceYen: PACK.priceYen })
      .returning()
      .all();
    if (!purchase) throw new Error("no purchase inserted");
    shop.test.clock.set(new Date(purchase.createdAt.getTime() + PURCHASE_PAYMENT_WINDOW_MS - 1));
    await sweep();
    expect(purchaseRow(purchase.id)?.givenUpAt).toBeNull();
    shop.test.clock.advance(2);
    await sweep();
    expect(purchaseRow(purchase.id)?.givenUpAt).toEqual(shop.test.clock.now());
  });

  it("runs at boot and every PURCHASE_SWEEP_EVERY_MS after, logging a payment it can't follow and going on", async () => {
    const failing = await paidWithAnswerLost();
    const other = shop.buyer();
    const fine = await startedPurchase(shop.test, other, PACK.tickets);
    shop.chain.answerNext("lost");
    await payPurchase(
      shop.test,
      other,
      fine.purchase.id,
      await signedBy(shop.walletOf(other), fine.payment),
    );
    shop.chain.show(fine.payment.digest, {
      ok: true,
      events: shop.chain.eventsFor(fine.payment.digest),
    });
    // Sui answers the first payment with an outcome that names no purchase's event: a credit that can't hold.
    shop.chain.show(failing.payment.digest, { ok: true, events: [] });

    const due: { run: () => void; ms: number }[] = [];
    const schedule: Schedule = (run, ms) => {
      due.push({ run, ms });
      return () => {};
    };
    const sweeps = startTicketPurchaseSweeps({ ...shop.test.deps, schedule });
    await sweeps.idle();
    log.expectLogged("ticket_purchase.sweep.failed", { purchaseId: failing.purchase.id });
    expect(purchaseRow(failing.purchase.id)?.verifiedAt).toBeNull();
    expect(purchaseRow(fine.purchase.id)?.verifiedAt).toEqual(shop.test.clock.now());
    expect(due.map(({ ms }) => ms)).toEqual([PURCHASE_SWEEP_EVERY_MS]);
    due[0]?.run();
    await sweeps.idle();
    expect(due).toHaveLength(2);
    sweeps.stop();
  });
});
