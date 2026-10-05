import { ticketPurchases, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { timer, type Schedule } from "../midnightJob.ts";
import { purchaseNamedBy } from "./paymentReference.ts";
import { creditPurchase, jpycFor } from "./tickets.ts";

/** Between the sweeps that look on Sui for payments the app never reported. */
export const PURCHASE_SWEEP_EVERY_MS = 3 * 60_000;
/**
 * How long after a purchase starts the sweep looks for its payment. The app signs and sends it
 * within minutes of starting the purchase, so one Sui doesn't show by then was never made.
 */
export const PURCHASE_PAYMENT_WINDOW_MS = 60 * 60_000;
/** How far before the oldest open purchase the sweep reads, for a server clock ahead of Sui's. */
const CLOCK_MARGIN_MS = 60_000;

type SweepDeps = Pick<AppDeps, "db" | "clock" | "ticketPayments" | "lineChatMenu">;

/** Purchases neither paid nor given up, oldest first. */
const openPurchases = (db: Db) =>
  db
    .select({
      id: ticketPurchases.id,
      userId: ticketPurchases.userId,
      priceYen: ticketPurchases.priceYen,
      createdAt: ticketPurchases.createdAt,
    })
    .from(ticketPurchases)
    .where(and(isNull(ticketPurchases.verifiedAt), isNull(ticketPurchases.givenUpAt)))
    .orderBy(asc(ticketPurchases.createdAt))
    .all();

/**
 * The ticket purchase sweep, for payments the app never reported: reads the payment contract's
 * PaymentReceived events back to the oldest open purchase, and credits each open purchase that an
 * event pays in full into the ticket vault, as the app's report would. Once a read has reached back
 * that far, it gives up on purchases older than PURCHASE_PAYMENT_WINDOW_MS. One purchase's failure is
 * logged, and the sweep goes on to the next. Rejects when Sui can't be read.
 */
export async function sweepTicketPurchases({
  db,
  clock,
  ticketPayments,
  lineChatMenu,
}: SweepDeps): Promise<void> {
  const open = openPurchases(db);
  const oldest = open[0];
  if (!oldest) return;
  const read = await ticketPayments.paymentsSince(
    new Date(oldest.createdAt.getTime() - CLOCK_MARGIN_MS),
  );
  const waiting = new Map(open.map((purchase) => [purchase.id, purchase]));
  const tally = { events: read.payments.length, credited: 0, short: 0, givenUp: 0, failed: 0 };
  const { vault, decimals } = ticketPayments.target;

  for (const payment of read.payments) {
    const named = payment.vault === vault ? purchaseNamedBy(payment.reference) : null;
    const purchase = named && waiting.get(named.purchaseId);
    if (!purchase || purchase.userId !== named.userId) continue;
    const fields = { userId: purchase.userId, purchaseId: purchase.id, txDigest: payment.txDigest };
    // Short payments leave the purchase open: the payment that covers it may still come.
    if (payment.amount < jpycFor(purchase.priceYen, decimals)) {
      tally.short += 1;
      logInfo("ticket_purchase.sweep.short", fields);
      continue;
    }
    try {
      // Anything but credited means a report counted it first.
      if (creditPurchase(db, purchase.id, payment, clock.now()) !== "credited") continue;
      waiting.delete(purchase.id);
      tally.credited += 1;
      logInfo("ticket_purchase.sweep.credited", fields);
      void lineChatMenu.relink(purchase.userId);
    } catch (error) {
      tally.failed += 1;
      logFailure("ticket_purchase.sweep.failed", error, fields);
    }
  }

  if (read.complete) {
    const cutoff = clock.now().getTime() - PURCHASE_PAYMENT_WINDOW_MS;
    for (const purchase of waiting.values()) {
      if (purchase.createdAt.getTime() > cutoff) continue;
      const fields = { userId: purchase.userId, purchaseId: purchase.id };
      try {
        const { changes } = db
          .update(ticketPurchases)
          .set({ givenUpAt: clock.now() })
          .where(
            and(
              eq(ticketPurchases.id, purchase.id),
              isNull(ticketPurchases.verifiedAt),
              isNull(ticketPurchases.givenUpAt),
            ),
          )
          .run();
        if (changes === 0) continue;
        tally.givenUp += 1;
        logInfo("ticket_purchase.sweep.given_up", { ...fields, status: "payment_window_passed" });
      } catch (error) {
        tally.failed += 1;
        logFailure("ticket_purchase.sweep.failed", error, fields);
      }
    }
  }
  logInfo("ticket_purchase.swept", {
    count: open.length,
    ...tally,
    ...(!read.complete && {
      reason: `the read stopped at its page limit, short of purchase ${oldest.id}'s start, so none was given up`,
    }),
  });
}

/**
 * Sweeps at once, for payments made while the server was down, then PURCHASE_SWEEP_EVERY_MS after
 * each sweep ends; a sweep with no purchase open reads nothing from Sui. Sweeps run one at a time,
 * and a failure is logged, never thrown. `stop` cancels the next sweep; `idle` settles when the one
 * running has.
 */
export function startTicketPurchaseSweeps({
  schedule = timer,
  ...deps
}: SweepDeps & { schedule?: Schedule }) {
  let cancel = () => {};
  let stopped = false;
  let running = Promise.resolve();

  function runNext() {
    running = running
      .then(() => sweepTicketPurchases(deps))
      .catch((error: unknown) => logFailure("ticket_purchase.sweep_failed", error))
      .then(() => {
        if (!stopped) cancel = schedule(runNext, PURCHASE_SWEEP_EVERY_MS);
      });
  }

  runNext();
  return {
    stop() {
      stopped = true;
      cancel();
    },
    idle: () => running,
  };
}
