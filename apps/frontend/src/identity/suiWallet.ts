import { useSyncExternalStore } from "react";

// Why the Sui wallet couldn't be made or can't sign, for the developer slip: LINE's browser has no console.
let failure: string | undefined;
const listeners = new Set<() => void>();

export function setSuiWalletFailure(reason: string) {
  failure = reason;
  listeners.forEach((l) => l());
}

export const suiWalletFailure = () => failure;

/** Calls `l` whenever the failure changes; returns the unsubscribe. */
export const onSuiWalletFailure = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useSuiWalletFailure(): string | undefined {
  return useSyncExternalStore(onSuiWalletFailure, suiWalletFailure);
}
