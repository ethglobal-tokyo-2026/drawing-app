/**
 * MOCK Sui wallet. Nothing leaves the browser: the balance is a stand-in that payments draw down,
 * and a payment waits like a wallet round-trip and returns a fake transaction digest.
 *
 * To make it real, keep these signatures and swap the bodies for @mysten/dapp-kit: read the
 * connected wallet's SUI balance, and for a payment build a Transaction that splits `priceMist`
 * from gas and transfers it to the treasury address, sign and execute it, and return the digest
 * once it's confirmed. The server verifies it before granting tickets.
 */

export interface PaymentResult {
  digest: string;
}

export const MIST_PER_SUI = 1_000_000_000n;

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const WALLET_DELAY_MS = 1400;

export const IS_MOCK_PAYMENT = true;

let mockBalanceMist = 25n * MIST_PER_SUI;

/** The wallet's SUI balance, in MIST. */
export async function getSuiBalance(): Promise<bigint> {
  await new Promise((r) => setTimeout(r, 300));
  return mockBalanceMist;
}

export async function payForTickets(priceMist: bigint): Promise<PaymentResult> {
  if (priceMist <= 0n) throw new Error(`Invalid price: ${priceMist} MIST`);
  await new Promise((r) => setTimeout(r, WALLET_DELAY_MS));
  if (priceMist > mockBalanceMist) throw new Error("Your wallet doesn’t have enough SUI.");
  mockBalanceMist -= priceMist;
  const digest = Array.from(
    { length: 44 },
    () => BASE58[Math.floor(Math.random() * BASE58.length)],
  ).join("");
  return { digest };
}
