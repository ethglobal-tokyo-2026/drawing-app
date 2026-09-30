import { useSyncExternalStore } from "react";

/**
 * What started Privy's SDK: the board settling, a screen other than the board, a gift link, or
 * something that needs a wallet now (sealing, giving, receiving, paying).
 */
export type PrivyStart = "board-settled" | "elsewhere" | "gift-link" | "wallet-needed";

let started: PrivyStart | null = null;
const listeners = new Set<() => void>();

/**
 * Starts Privy's SDK, once per page load. It's large, and its wallet frame ties up the page as it
 * starts, so it waits for the board to settle unless something needs it sooner. Once started it stays
 * mounted: remounting it would sign in all over again.
 */
export function startPrivy(why: PrivyStart): void {
  if (started) return;
  started = why;
  // For the performance recording and the boot measurements.
  performance.mark(`privy-start:${why}`);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePrivyStarted(): boolean {
  return useSyncExternalStore(subscribe, () => started !== null);
}
