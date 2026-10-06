import { useSyncExternalStore } from "react";
import { privyStatus } from "./privy";
import { waitForPrivy } from "./waitForPrivy";

// Why the Sui wallet couldn't be made or can't sign, for the developer slip: LINE's browser has no console.
let failure: string | undefined;
/** Each change has MakeSuiWallet ask Privy for the wallet again. */
let attempt = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function setSuiWalletFailure(reason: string) {
  failure = reason;
  notify();
}

export const suiWalletFailure = () => failure;

/** Calls `l` whenever the failure or the attempt changes; returns the unsubscribe. */
export const onSuiWalletFailure = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useSuiWalletFailure(): string | undefined {
  return useSyncExternalStore(onSuiWalletFailure, suiWalletFailure);
}

/** MakeSuiWallet's cue to ask Privy for the wallet again. */
export function useSuiWalletAttempt(): number {
  return useSyncExternalStore(onSuiWalletFailure, () => attempt);
}

/**
 * Has MakeSuiWallet ask Privy for a wallet it couldn't make. The failure goes too, or it would end
 * the fresh try before it starts.
 */
export function askForSuiWalletAgain() {
  attempt += 1;
  failure = undefined;
  notify();
}

const suiAddress = () => {
  const privy = privyStatus();
  return privy.state === "signed-in" ? (privy.suiWallet ?? null) : null;
};

/**
 * Sealing, giving, receiving and paying wait here until Privy has made the person's Sui wallet: the
 * server reads it from Privy, so asking sooner would find none.
 */
export const waitForSuiAddress = (): Promise<string> =>
  waitForPrivy({
    current: suiAddress,
    failure: () => failure ?? null,
    askAgain: askForSuiWalletAgain,
    subscribe: onSuiWalletFailure,
  });
