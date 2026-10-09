import { insertUser } from "@drawing-app/db/testing";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { z } from "zod";
import { sponsoredTransactionSchema, type SponsoredTransaction } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiWallets } from "../testing/fakes.ts";
import { fakeSui, type FakeSui } from "../testing/fakeSui.ts";
import { bodyOf } from "../testing/responses.ts";
import { startedTicketPurchaseSchema } from "./tickets.ts";

const startedBodySchema = z.object({
  purchase: startedTicketPurchaseSchema,
  payment: sponsoredTransactionSchema,
});

/**
 * The app on the fake Sui chain, on a fresh database or the one at `databaseFile`. `buyer` makes a
 * person whose Privy Sui wallet the test holds the key to, so it signs their payments as the app's
 * wallet would.
 */
export async function purchasesApp(databaseFile?: string) {
  let chain: FakeSui | undefined;
  let wallets: ReturnType<typeof fakeSuiWallets> | undefined;
  const test = await createTestApp(({ db, clock }) => {
    chain = fakeSui(clock);
    wallets = fakeSuiWallets(db);
    return { sui: chain.sui, gasStation: chain.gasStation, suiWallets: wallets };
  }, databaseFile);
  if (!chain || !wallets) throw new Error("createTestApp built no overrides");
  const { keyOf, without } = wallets;
  return { test, chain, buyer: () => insertUser(test.db), walletOf: keyOf, without };
}
export type PurchasesApp = Awaited<ReturnType<typeof purchasesApp>>;

/** POST /api/ticket-purchases/start for a pack of `tickets`, as `as`. */
export const startPurchase = (test: TestApp, as: string, tickets: number) =>
  test.send("POST", "/api/ticket-purchases/start", { as, body: { tickets } });

/** Starts a purchase of a pack of `tickets` as `as`, which must be granted: the purchase and its payment. */
export const startedPurchase = async (test: TestApp, as: string, tickets: number) =>
  bodyOf(await startPurchase(test, as, tickets), startedBodySchema, 201);

/** `wallet`'s signature over a payment the server built, as the app posts it. */
export const signedBy = async (wallet: Ed25519Keypair, payment: SponsoredTransaction) => ({
  digest: payment.digest,
  signature: (await wallet.signTransaction(fromBase64(payment.txBytes))).signature,
});

/** POST /api/ticket-purchases: the signed payment of `purchaseId`, as `as`. */
export const payPurchase = (
  test: TestApp,
  as: string,
  purchaseId: number,
  signed: { digest: string; signature: string },
) => test.send("POST", "/api/ticket-purchases", { as, body: { purchaseId, ...signed } });
