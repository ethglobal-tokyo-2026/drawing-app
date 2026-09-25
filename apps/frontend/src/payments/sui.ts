/**
 * MOCK Sui payment. Nothing leaves the browser: it waits like a wallet
 * round-trip and returns a fake transaction digest.
 *
 * To make it real, keep this signature and swap the body for
 * @mysten/dapp-kit: connect a wallet, build a Transaction that splits
 * `priceSui` from gas and transfers it to the treasury address, sign and
 * execute it, and return the digest once it's confirmed (ideally verified
 * by a server before granting tickets).
 */

export interface PaymentResult {
  digest: string;
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const IS_MOCK_PAYMENT = true;

export async function payForTickets(priceSui: number): Promise<PaymentResult> {
  if (!(priceSui > 0)) throw new Error("Invalid price");
  await new Promise((r) => setTimeout(r, 1400));
  const digest = Array.from(
    { length: 44 },
    () => BASE58[Math.floor(Math.random() * BASE58.length)],
  ).join("");
  return { digest };
}
