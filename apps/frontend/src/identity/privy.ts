import liff from "@line/liff";
import { useSyncExternalStore } from "react";
import { liffMockActive } from "../line/liff";

// The Privy app. It isn't secret: Privy's SDK sends it with every request.
export const PRIVY_APP_ID = "cmuh4s0lz01fn0cl143lomlzj";

export type PrivyStatus =
  | { state: "off"; reason: string }
  | { state: "signing-in" }
  | {
      state: "signed-in";
      userId: string;
      /** The Ethereum address Privy made at sign-in; it signs for the smart account. */
      wallet?: string;
      /** Once smart wallets are on: the account that holds the person's stickers. */
      smartAccount?: string;
    }
  | { state: "failed"; reason: string };

let status: PrivyStatus = liffMockActive
  ? { state: "off", reason: "LIFF Mock’s test user has no real LINE ID token" }
  : { state: "signing-in" };
const listeners = new Set<() => void>();

export function setPrivyStatus(next: PrivyStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const privyStatus = () => status;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePrivyStatus(): PrivyStatus {
  return useSyncExternalStore(subscribe, privyStatus);
}

// LINE's ID token lasts an hour, and the auth server checks it with LINE again, so one about to lapse fails there.
const EXPIRY_MARGIN_S = 60;
const EXCHANGE_TIMEOUT_MS = 10_000;

// Privy re-authenticates whenever it's handed a JWT unlike the last, so one is kept while it's good.
let kept: { jwt: string; expiresAt: number } | undefined;

/** Clears a failure, so the next sync signs in afresh. */
export function retryPrivySignIn() {
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
  if (error.message.includes(WALLET_FRAME_RACE) && !retriedRace) {
    retriedRace = true;
    console.warn("Privy signed out while making the wallet; signing in again", error);
    setTimeout(retryPrivySignIn, RACE_RETRY_MS);
    return;
  }
  setPrivyStatus({ state: "failed", reason: `Privy refused the sign-in: ${error.message}` });
}

function fail(reason: string): undefined {
  console.error(`Privy sign-in failed: ${reason}`);
  setPrivyStatus({ state: "failed", reason });
  return undefined;
}

const field = (body: unknown, key: string): unknown =>
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
  if (!idToken || !expiresAt) return fail("LINE gave no ID token");
  if (expiresAt - EXPIRY_MARGIN_S <= Date.now() / 1000) {
    return fail("LINE’s ID token has expired; reopen the app from LINE");
  }
  setPrivyStatus({ state: "signing-in" });
  try {
    const response = await fetch("/v1/auth/privy-jwt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = field(body, "error");
      return fail(
        `the auth server refused LINE’s token: HTTP ${response.status}${typeof error === "string" ? ` ${error}` : ""}`,
      );
    }
    const jwt = field(body, "jwt");
    const expiresAt = field(body, "expiresAt");
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
