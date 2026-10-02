import type { AppDeps } from "../deps.ts";

/**
 * Mock chain mode, for local runs and tests: stickers stay unminted, Giving skips the escrow,
 * Privy isn't asked for smart wallets, and no names resolve under croquis-app.eth.
 */
export const mockChain: Pick<AppDeps, "mint" | "giftChain" | "smartWallets" | "ens"> = {
  mint: () => Promise.resolve(null),
  giftChain: null,
  smartWallets: { addressFor: () => Promise.resolve(null) },
  ens: null,
};
