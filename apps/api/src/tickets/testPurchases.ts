import { z } from "zod";
import type { JpycPayment } from "../deps.ts";
import type { TestApp } from "../testing/createTestApp.ts";
import { TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { bodyOf } from "../testing/responses.ts";
import { startedTicketPurchaseSchema, type StartedTicketPurchase } from "./tickets.ts";

const BASE58_DIGITS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Sui prints a transaction's 32-byte digest in base58. */
export const TX_DIGEST_LENGTH = 44;

let digests = 0;
/** A well-formed Sui transaction digest, new each time. */
export function newTxDigest() {
  digests += 1;
  let digest = "";
  for (let n = digests; n > 0; n = Math.floor(n / BASE58_DIGITS.length)) {
    digest = BASE58_DIGITS.charAt(n % BASE58_DIGITS.length) + digest;
  }
  return digest.padStart(TX_DIGEST_LENGTH, "z");
}

const startedBodySchema = z.object({ purchase: startedTicketPurchaseSchema });

/** POST /api/ticket-purchases/start for a pack of `tickets`, as `as`. */
export const startPurchase = (test: TestApp, as: string, tickets: number) =>
  test.send("POST", "/api/ticket-purchases/start", { as, body: { tickets } });

/** Starts a purchase of a pack of `tickets` as `as`, which must be granted. */
export const startedPurchase = async (test: TestApp, as: string, tickets: number) =>
  (await bodyOf(await startPurchase(test, as, tickets), startedBodySchema, 201)).purchase;

/** POST /api/ticket-purchases: reports the payment `txDigest` made for `purchaseId`, as `as`. */
export const reportPayment = (test: TestApp, as: string, purchaseId: number, txDigest: string) =>
  test.send("POST", "/api/ticket-purchases", { as, body: { purchaseId, txDigest } });

/**
 * Records on the fake Sui a transaction, new unless named, that pays what `purchase` costs into the
 * ticket vault, naming its reference, but for `change`; returns its digest.
 */
export function payOnSui(
  transactions: Map<string, JpycPayment[] | Error>,
  purchase: StartedTicketPurchase,
  change: Partial<JpycPayment> = {},
  txDigest = newTxDigest(),
) {
  transactions.set(txDigest, [
    {
      vault: TEST_PAYMENT_TARGET.vault,
      payer: `0x${"d".repeat(64)}`,
      amount: BigInt(purchase.priceJpyc),
      reference: purchase.reference,
      ...change,
    },
  ]);
  return txDigest;
}
