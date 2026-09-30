import { useSyncExternalStore } from "react";
import type { Address, Hash, Hex } from "viem";
import { waitForPrivy } from "./waitForPrivy";

export interface SmartWalletClient {
  address: Address;
  sendTransaction: (transaction: { to: Address; data?: Hex; value?: bigint }) => Promise<Hash>;
}

let active: SmartWalletClient | null = null;
/** Why Privy's Sepolia client last failed to start, until SmartWalletBridge starts it again. */
let failure: string | null = null;
/** Each change has SmartWalletBridge ask Privy for the client again. */
let attempt = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Privy loads after the board. Chain actions wait for its Sepolia client to be ready. */
export function setSmartWallet(wallet: SmartWalletClient | null) {
  active = wallet;
  // Every call starts over: the client arrived, or SmartWalletBridge is asking for it again.
  failure = null;
  notify();
}

/** Privy signed in, but its Sepolia client didn't start. The next chain action asks for it again. */
export function smartWalletFailed(reason: string) {
  active = null;
  failure = reason;
  notify();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** SmartWalletBridge's cue to ask Privy for the client again. */
export function useSmartWalletAttempt(): number {
  return useSyncExternalStore(subscribe, () => attempt);
}

/** Sealing, giving and receiving wait here for the Sepolia client. */
export const waitForSmartWallet = (): Promise<SmartWalletClient> =>
  waitForPrivy({
    current: () => active,
    failure: () => failure,
    // A failure left over from before also goes, or it would end the fresh try before it starts.
    askAgain: () => {
      attempt += 1;
      failure = null;
      notify();
    },
    subscribe,
    notReady: "smart_account_not_ready",
  });
