import type { AppDeps } from "../deps.ts";

/**
 * Mock chain mode, for local runs and tests: stickers stay unminted, Giving skips the escrow, and
 * Privy isn't asked for smart wallets.
 */
export const mockChain: Pick<AppDeps, "mint" | "giftChain" | "smartWallets"> = {
  mint: () => Promise.resolve(null),
  giftChain: null,
  smartWallets: { addressFor: () => Promise.resolve(null) },
};
