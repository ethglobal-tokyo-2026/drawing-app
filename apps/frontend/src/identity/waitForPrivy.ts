import { ApiError, type ErrorCode } from "../api/apiClient";
import { onPrivyStatus, privyStatus, resetPrivySignIn } from "./privy";
import { startPrivy } from "./privyStart";

// A cold start downloads Privy's SDK, starts its wallet frame and signs in before a wallet exists.
const READY_TIMEOUT_MS = 30_000;

/** Something Privy makes once the person is signed in: the Sepolia client, or the Sui signer. */
export interface PrivyMade<T> {
  current: () => T | null;
  /** Why it didn't start, apart from Privy's sign-in. */
  failure: () => string | null;
  /** Asks for it again after a failure; without one, its failure ends the wait. */
  askAgain?: () => void;
  /** Calls the listener whenever `current` or `failure` changes; returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  /** The app's own code for it not being ready, so the person reads its catalog message. */
  notReady: Extract<ErrorCode, "smart_account_not_ready" | "sui_wallet_not_ready">;
}

/**
 * Chain actions and payments wait here, and start Privy if the board hasn't yet. A Privy sign-in, or
 * what it makes, that failed gets one fresh try per wait; a second failure ends the wait at once, and
 * so does a LINE sign-in that has expired, since only reconnecting LINE renews it.
 */
export function waitForPrivy<T>(made: PrivyMade<T>): Promise<T> {
  startPrivy("wallet-needed");
  const ready = made.current();
  if (ready) return Promise.resolve(ready);
  const notReady = (detail?: string) =>
    new ApiError(0, { error: made.notReady, ...(detail && { detail }) });
  return new Promise((resolve, reject) => {
    let retried = false;
    // The fresh try's own changes aren't its outcome: those come after it has started.
    let restarting = false;
    let stops: (() => void)[] = [];
    const end = () => {
      clearTimeout(timer);
      stops.forEach((stop) => stop());
    };
    const fail = (error: ApiError) => {
      end();
      reject(error);
    };
    function check() {
      if (restarting) return;
      const value = made.current();
      if (value) {
        end();
        resolve(value);
        return;
      }
      const privy = privyStatus();
      if (privy.state === "off") {
        // LIFF Mock on the dev server: Privy never loads there, so nothing is coming.
        fail(notReady("Privy is off under LIFF Mock"));
        return;
      }
      if (privy.state === "failed" && privy.reconnectLine) {
        fail(new ApiError(0, { error: "line_token_expired" }));
        return;
      }
      const failed = privy.state === "failed" ? privy.reason : made.failure();
      if (failed === null) return;
      if (retried || (privy.state !== "failed" && !made.askAgain)) {
        fail(notReady(failed));
        return;
      }
      retried = true;
      console.warn(`Asking Privy again after: ${failed}`);
      restarting = true;
      made.askAgain?.();
      if (privy.state === "failed") resetPrivySignIn();
      restarting = false;
      check();
    }
    const timer = setTimeout(() => fail(notReady()), READY_TIMEOUT_MS);
    stops = [made.subscribe(check), onPrivyStatus(check)];
    check();
  });
}
