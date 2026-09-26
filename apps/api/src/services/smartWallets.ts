import type { SmartWallets } from "../deps.ts";

/** Explicit local mock mode does not query Privy. */
export const noSmartWallets: SmartWallets = { addressFor: () => Promise.resolve(null) };
