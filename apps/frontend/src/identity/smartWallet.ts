import type { Address, Hash, Hex } from "viem";
import { ApiError } from "../api/apiClient";

export interface SmartWalletClient {
  address: Address;
  sendTransaction: (transaction: { to: Address; data?: Hex; value?: bigint }) => Promise<Hash>;
}

let active: SmartWalletClient | null = null;
const READY_TIMEOUT_MS = 15_000;
const listeners = new Set<() => void>();

/** Privy loads after the board. Chain actions wait for its Sepolia client to be ready. */
export function setSmartWallet(wallet: SmartWalletClient | null) {
  active = wallet;
  listeners.forEach((listener) => listener());
}

export function waitForSmartWallet(): Promise<SmartWalletClient> {
  if (active) return Promise.resolve(active);
  return new Promise((resolve, reject) => {
    const ready = () => {
      if (!active) return;
      clearTimeout(timer);
      listeners.delete(ready);
      resolve(active);
    };
    const timer = setTimeout(() => {
      listeners.delete(ready);
      // The app's own code for this, so the person reads its catalog message.
      reject(new ApiError(0, { error: "smart_account_not_ready" }));
    }, READY_TIMEOUT_MS);
    listeners.add(ready);
  });
}
