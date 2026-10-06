import { suiTransactions, ticketPurchases } from "@drawing-app/db";
import { and, eq, isNull, lt, notExists } from "drizzle-orm";
import type { AppDeps } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import { timer, type Schedule } from "../midnightJob.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";
import { followPayment, giveUp, openPayments } from "./purchases.ts";

/** Between the sweeps that follow open ticket payments on Sui. */
export const PURCHASE_SWEEP_EVERY_MS = 3 * 60_000;
/**
 * How long a purchase with no open payment stays open: a Shinami sponsorship lapses within it, so
 * by then nothing can pay the purchase. It covers one whose start stopped before its payment was
 * sponsored, or whose failed payment's give-up was lost.
 */
export const PURCHASE_PAYMENT_WINDOW_MS = 60 * 60_000;

/** Open purchases started before `before` with no open payment. */
const unpayablePurchases = ({ db }: Pick<AppDeps, "db">, before: Date) =>
  db
    .select()
    .from(ticketPurchases)
    .where(
      and(
        isNull(ticketPurchases.verifiedAt),
        isNull(ticketPurchases.givenUpAt),
        lt(ticketPurchases.createdAt, before),
        notExists(
          db
            .select({ id: suiTransactions.id })
            .from(suiTransactions)
            .where(
              and(
                eq(suiTransactions.purchaseId, ticketPurchases.id),
                isNull(suiTransactions.outcome),
              ),
            ),
        ),
      ),
    )
    .all();

/**
 * The ticket purchase sweep, for payments whose answer the app never got: follows each open
 * payment, one payer at a time, crediting its purchase once Sui shows it ran, and giving it up once
 * it failed or can never run. Then it gives up purchases past PURCHASE_PAYMENT_WINDOW_MS that no
 * payment can pay. One payment's failure is logged, and the sweep goes on to the next.
 */
export async function sweepTicketPurchases(deps: AppDeps): Promise<void> {
  if (!deps.sui) return;
  const open = openPayments(deps.db);
  const tally = { credited: 0, givenUp: 0, failed: 0 };
  for (const payment of open) {
    const fields = { purchaseId: payment.purchaseId ?? undefined, txDigest: payment.digest };
    try {
      const row = await oneAtATime(`payer:${payment.sender}`, () => followPayment(deps, payment));
      if (row.outcome === "succeeded") tally.credited += 1;
      if (row.outcome === "failed" || row.outcome === "dead") tally.givenUp += 1;
    } catch (error) {
      tally.failed += 1;
      logFailure("ticket_purchase.sweep.failed", error, fields);
    }
  }
  const before = new Date(deps.clock.now().getTime() - PURCHASE_PAYMENT_WINDOW_MS);
  for (const purchase of unpayablePurchases(deps, before)) {
    if (giveUp(deps, purchase, "no payment can pay it now")) tally.givenUp += 1;
  }
  logInfo("ticket_purchase.swept", { count: open.length, ...tally });
}

/**
 * Sweeps at once, then PURCHASE_SWEEP_EVERY_MS after each sweep ends. Sweeps run one at a time, and
 * a failure is logged, never thrown. `stop` cancels the next sweep; `idle` settles when the one
 * running has.
 */
export function startTicketPurchaseSweeps({
  schedule = timer,
  ...deps
}: AppDeps & { schedule?: Schedule }) {
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
