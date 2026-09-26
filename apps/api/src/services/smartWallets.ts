import type { SmartWallets } from "../deps.ts";

/** Privy smart wallets aren't set up yet, so no one has one. */
export const noSmartWallets: SmartWallets = { addressFor: () => Promise.resolve(null) };
