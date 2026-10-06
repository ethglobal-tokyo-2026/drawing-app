import type { AppDeps } from "../deps.ts";

/**
 * Mock chain mode, for local runs and tests: stickers stay unminted, a gift lands in the escrow at
 * once, ticket packs can't be bought, and Privy isn't asked for Sui wallets.
 */
export const mockChain: Pick<AppDeps, "sui" | "gasStation" | "suiWallets"> = {
  sui: null,
  gasStation: null,
  suiWallets: { addressFor: () => Promise.resolve(null) },
};
