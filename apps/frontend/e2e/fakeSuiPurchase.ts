import {
  payPurchase,
  purchasesApp,
  signedBy,
  startedPurchase,
} from "@drawing-app/api/testing/purchases";
import type { TicketPack } from "@drawing-app/api/tickets";
import type { Page } from "@playwright/test";
import { E2E_DATABASE } from "./dataDir.ts";
import { signedInUserId } from "./helpers.ts";

/**
 * Buys a pack of reserve tickets for the person signed in on `page` as the API's own tests buy one:
 * its purchase code on the fake Sui chain, on the database the suite's API serves. That API runs in
 * mock chain mode, where packs can't be bought. Kept out of helpers.ts, as it loads the whole API.
 */
export async function buyPackOnFakeSui(page: Page, pack: TicketPack) {
  const userId = await signedInUserId(page);
  const { test, walletOf } = await purchasesApp(E2E_DATABASE);
  try {
    const { purchase, payment } = await startedPurchase(test, userId, pack);
    const signed = await signedBy(walletOf(userId), payment);
    const paid = await payPurchase(test, userId, purchase.id, signed);
    if (paid.status !== 201) {
      throw new Error(
        `Paying purchase ${purchase.id} answered ${paid.status}: ${await paid.text()}`,
      );
    }
  } finally {
    test.sqlite.close();
  }
}
