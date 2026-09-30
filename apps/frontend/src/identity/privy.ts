import liff from "@line/liff";
import { useSyncExternalStore } from "react";
import { ApiError } from "../api/apiClient";
import { liffMockActive } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";

// The Privy app. It isn't secret: Privy's SDK sends it with every request.
export const PRIVY_APP_ID = "cmuh4s0lz01fn0cl143lomlzj";

export type PrivyStatus =
  | { state: "signing-in" }
  | {
      state: "signed-in";
      userId: string;
      /** The Ethereum address Privy made at sign-in; it signs for the smart account. */
      wallet?: string;
      /** Once smart wallets are on: the account that holds the person's stickers. */
      smartAccount?: string;
      /** The Sui address, which MakeSuiWallet asks Privy for once the Ethereum one exists. */
      suiWallet?: string;
    }
  | { state: "failed"; reason: string; reconnectLine?: boolean }
  /** On the dev server under LIFF Mock, whose sign-in isn't LINE's, so the auth server would refuse it. */
  | { state: "off" };

let status: PrivyStatus = liffMockActive ? { state: "off" } : { state: "signing-in" };
const listeners = new Set<() => void>();

export function setPrivyStatus(next: PrivyStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const privyStatus = () => status;

/** Calls `l` whenever the status changes; returns the unsubscribe. */
export const onPrivyStatus = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function usePrivyStatus(): PrivyStatus {
  return useSyncExternalStore(onPrivyStatus, privyStatus);
}

// LINE's ID token lasts an hour, and the auth server checks it with LINE again, so one about to lapse fails there.
const EXPIRY_MARGIN_S = 60;
const EXCHANGE_TIMEOUT_MS = 10_000;

// Privy re-authenticates whenever it's handed a JWT unlike the last, so one is kept while it's good.
let kept: { jwt: string; expiresAt: number } | undefined;
let reconnecting = false;

/**
 * The person's retry reconnects LINE when its credentials need replacing, coming back to `returnTo`
 * (this page, unless a screen says where it picks up). A failed reconnect goes to the status, and to
 * `onFailed`, so the screen that asked can say so where the person tapped.
 */
export function retryPrivySignIn(returnTo?: string, onFailed?: (failure: ApiError) => void): void {
  if (reconnecting) return;
  if (status.state === "failed" && status.reconnectLine) {
    reconnecting = true;
    // Keep the exchange disabled while LINE navigates, so Privy cannot resend the stale token.
    void reconnectLine(returnTo)
      .catch(() => {
        fail("LINE could not reconnect; try again", true);
        // LINE's SDK errors can carry credentials, so none of it goes on screen.
        onFailed?.(new ApiError(0, { error: "line_reconnect_failed" }));
      })
      .finally(() => {
        reconnecting = false;
      });
    return;
  }
  resetPrivySignIn();
}

/** Signs in to Privy again, without ever leaving the page: a failure that needs LINE stays failed. */
export function resetPrivySignIn() {
  // A delayed wallet-frame retry must preserve a newer LINE authentication failure.
  if (status.state === "failed" && status.reconnectLine) return;
  kept = undefined;
  setPrivyStatus({ state: "signing-in" });
}

// Privy makes a new user's wallet right after sign-in, and signs out if its wallet frame is still starting.
// Waiting for useWallets().ready makes that rarer, not impossible; by a second try the frame is up.
const WALLET_FRAME_RACE = "User must be authenticated before creating a Privy wallet";
const RACE_RETRY_MS = 1000;
// Spent once per page load, so a race that keeps happening ends on the failure instead of a loop.
let retriedRace = false;

/** Privy's error after it took the JWT: one retry for the wallet-frame race, otherwise the failure. */
export function onPrivyError(error: Error) {
  if (status.state === "failed" && status.reconnectLine) return;
  if (error.message.includes(WALLET_FRAME_RACE) && !retriedRace) {
    retriedRace = true;
    console.warn("Privy signed out while making the wallet; signing in again");
    setTimeout(resetPrivySignIn, RACE_RETRY_MS);
    return;
  }
  setPrivyStatus({ state: "failed", reason: `Privy refused the sign-in: ${error.message}` });
}

function fail(reason: string, requiresLineReconnect = false): undefined {
  console.error(`Privy sign-in failed: ${reason}`);
  setPrivyStatus({ state: "failed", reason, reconnectLine: requiresLineReconnect });
  return undefined;
}

/** A field of a JSON answer whose shape isn't checked yet. */
export const jsonField = (body: unknown, key: string): unknown =>
  body && typeof body === "object" ? Reflect.get(body, key) : undefined;

/**
 * Trades LINE's ID token for the auth server's five-minute Privy JWT. Privy logs the person out when
 * this throws, so a failure resolves to undefined and its reason goes to the status instead.
 */
export async function fetchPrivyJwt(): Promise<string | undefined> {
  // The SDK re-syncs on its own after a failure; asking again would only repeat it at every server.
  if (status.state === "failed") return undefined;
  if (kept && kept.expiresAt - EXPIRY_MARGIN_S > Date.now() / 1000) return kept.jwt;
  const idToken = liff.getIDToken();
  const expiresAt = liff.getDecodedIDToken()?.exp;
  if (!idToken || !expiresAt) return fail("LINE gave no ID token", true);
  if (expiresAt - EXPIRY_MARGIN_S <= Date.now() / 1000) {
    return fail("LINE’s ID token has expired; try again to reconnect LINE", true);
  }
  // Privy renews a lapsed JWT in the background, and the person stays signed in unless that fails.
  if (status.state !== "signed-in") setPrivyStatus({ state: "signing-in" });
  try {
    const response = await fetch("/v1/auth/privy-jwt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = jsonField(body, "error");
      return fail(
        `the auth server could not complete sign-in: HTTP ${response.status}${typeof error === "string" ? ` ${error}` : ""}`,
        response.status === 401 && error === "line_auth_failed",
      );
    }
    const jwt = jsonField(body, "jwt");
    const expiresAt = jsonField(body, "expiresAt");
    if (typeof jwt !== "string" || !jwt || typeof expiresAt !== "number") {
      return fail("the auth server answered without a JWT");
    }
    kept = { jwt, expiresAt };
    return jwt;
  } catch (error) {
    return fail(
      `couldn’t reach the auth server: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
