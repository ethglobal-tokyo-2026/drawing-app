import { useSyncExternalStore } from "react";
import type { Address, Hash, Hex } from "viem";
import { ApiError } from "../api/apiClient";
import { onPrivyStatus, privyStatus, resetPrivySignIn } from "./privy";
import { startPrivy } from "./privyStart";

export interface SmartWalletClient {
  address: Address;
  sendTransaction: (transaction: { to: Address; data?: Hex; value?: bigint }) => Promise<Hash>;
}

let active: SmartWalletClient | null = null;
/** Why Privy's Sepolia client last failed to start, until SmartWalletBridge starts it again. */
let failure: string | null = null;
/** Each change has SmartWalletBridge ask Privy for the client again. */
let attempt = 0;
// A cold start downloads Privy's SDK, starts its wallet frame and signs in before the client exists.
const READY_TIMEOUT_MS = 30_000;
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

const notReady = (detail?: string) =>
  // The app's own code for this, so the person reads its catalog message.
  new ApiError(0, { error: "smart_account_not_ready", ...(detail && { detail }) });

/**
 * Sealing, giving and receiving wait here, and start Privy if the board hasn't yet. A Privy sign-in
 * or client that failed gets one fresh try per wait; a second failure ends the wait at once, and so
 * does a LINE sign-in that has expired, since only reconnecting LINE renews it.
 */
export function waitForSmartWallet(): Promise<SmartWalletClient> {
  startPrivy("wallet-needed");
  if (active) return Promise.resolve(active);
  return new Promise((resolve, reject) => {
    let retried = false;
    let stopWatchingPrivy = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const end = () => {
      clearTimeout(timer);
      listeners.delete(check);
      stopWatchingPrivy();
    };
    function check() {
      const wallet = active;
      if (wallet) {
        end();
        resolve(wallet);
        return;
      }
      const privy = privyStatus();
      if (privy.state === "off") {
        // LIFF Mock on the dev server: Privy never loads there, so no client is coming.
        end();
        reject(notReady("Privy is off under LIFF Mock"));
        return;
      }
      if (privy.state === "failed" && privy.reconnectLine) {
        end();
        reject(new ApiError(0, { error: "line_token_expired" }));
        return;
      }
      const failed = privy.state === "failed" ? privy.reason : failure;
      if (failed === null) return;
      if (retried) {
        end();
        reject(notReady(failed));
        return;
      }
      retried = true;
      console.warn(`Starting the board address again after: ${failed}`);
      if (privy.state === "failed") {
        resetPrivySignIn();
      } else {
        attempt += 1;
        failure = null;
        notify();
      }
    }
    timer = setTimeout(() => {
      end();
      reject(notReady());
    }, READY_TIMEOUT_MS);
    listeners.add(check);
    stopWatchingPrivy = onPrivyStatus(check);
    check();
  });
}
