import { useSyncExternalStore } from "react";

// Why Privy couldn't make the Sui wallet, for the developer slip: LINE's browser has no console.
let failure: string | undefined;
const listeners = new Set<() => void>();

export function setSuiWalletFailure(reason: string) {
  failure = reason;
  listeners.forEach((l) => l());
}

export const suiWalletFailure = () => failure;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSuiWalletFailure(): string | undefined {
  return useSyncExternalStore(subscribe, suiWalletFailure);
}
