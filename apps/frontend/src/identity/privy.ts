import { i18next } from "../i18n/i18n";
import liff from "@line/liff";
import type { User, WalletWithMetadata } from "@privy-io/react-auth";
import { useSyncExternalStore } from "react";
import { ApiError } from "../api/apiClient";
import { createSessionApi } from "../api/httpApi";
import {
  currentSelection,
  isAccountSelectionCurrent,
  onSessionSuspended,
  selectionKey,
} from "../api/sessionContext";
import { requestAccountRelease } from "../api/sessionLoss";
import type { PrivyAccount } from "./privyAccount";
import { liffMockActive } from "../line/liff";
import { reconnectLine } from "../line/reconnectLine";

// The Privy app. It isn't secret: Privy's SDK sends it with every request.
export const PRIVY_APP_ID = "cmuh4s0lz01fn0cl143lomlzj";

/** The Sui wallet Privy itself made for the person, as opposed to one they connected. */
export const privySuiWallet = (user: User | null) =>
  user?.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === "wallet" &&
      (a.walletClientType === "privy" || a.walletClientType === "privy-v2") &&
      a.chainType === "sui",
  );

export type PrivyStatus =
  | { state: "signing-in" }
  | {
      state: "signed-in";
      userId: string;
      /** The Sui address, which MakeSuiWallet asks Privy for once the person is signed in. */
      suiWallet?: string;
    }
  | { state: "failed"; reason: string; reconnectLine?: boolean; reloadRequired?: boolean }
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

// A kept JWT this close to lapsing is renewed, so Privy is never handed one that lapses on the way.
const EXPIRY_MARGIN_S = 60;
const EXCHANGE_TIMEOUT_MS = 10_000;

// Privy re-authenticates whenever it's handed a JWT unlike the last, so one is kept while it's good.
let kept: { key: string; jwt: string; expiresAt: number } | undefined;
let reconnecting: ReturnType<typeof currentSelection> = null;
let suspension = 0;

/**
 * The person's retry reconnects LINE when its credentials need replacing, coming back to `returnTo`
 * (this page, unless a screen says where it picks up). A failed reconnect goes to the status, and to
 * `onFailed`, so the screen that asked can say so where the person tapped.
 */
export function retryPrivySignIn(returnTo?: string, onFailed?: (failure: ApiError) => void): void {
  const lifetime = currentSelection();
  if (!lifetime) return;
  const recoveryReason = status.state === "failed" ? status.reason : "";
  const reloadRequired = status.state === "failed" && status.reloadRequired;
  const requiresLineReconnect = status.state === "failed" && status.reconnectLine;
  if (reloadRequired || requiresLineReconnect) {
    if (!reloadRequired && reconnecting === lifetime) return;
    // The preservation pause suspends readiness; retain this explicit selection and its recovery.
    let expectedSuspension = suspension;
    const isRecoveryCurrent = () =>
      expectedSuspension === suspension &&
      (currentSelection() === null || currentSelection() === lifetime);
    const released = requestAccountRelease(lifetime.userId, () => {
      if (!isRecoveryCurrent()) return;
      if (reloadRequired) {
        location.reload();
        return;
      }
      reconnecting = lifetime;
      // Keep the exchange disabled while LINE navigates, including after a preservation pause.
      setPrivyStatus({ state: "failed", reason: recoveryReason, reconnectLine: true });
      void reconnectLine(returnTo)
        .catch(() => {
          if (!isRecoveryCurrent() || reconnecting !== lifetime) return;
          if (status.state === "failed" && status.reloadRequired) return;
          fail("LINE could not reconnect; try again", true);
          // LINE's SDK errors can carry credentials, so none of it goes on screen.
          onFailed?.(new ApiError(0, { error: "line_reconnect_failed" }));
        })
        .finally(() => {
          if (isRecoveryCurrent() && reconnecting === lifetime) reconnecting = null;
        });
    });
    if (!released) expectedSuspension = suspension;
    return;
  }
  resetPrivySignIn();
}

/** Signs in to Privy again, unless recovery needs LINE or a fresh page. */
export function resetPrivySignIn() {
  // A delayed wallet-frame retry must preserve a newer failure that needs navigation.
  if (status.state === "failed" && (status.reconnectLine || status.reloadRequired)) return;
  kept = undefined;
  setPrivyStatus({ state: "signing-in" });
}

// A new user's wallet is made right after sign-in, and Privy signs out if its wallet frame is still
// starting. Waiting for useWallets().ready makes that rarer, not impossible; by a second try it's up.
const WALLET_FRAME_RACE = "User must be authenticated before creating a Privy wallet";
const RACE_RETRY_MS = 1000;
// Spent once per page load, so a race that keeps happening ends on the failure instead of a loop.
let retriedRace = false;

/** Privy's error after it took the JWT: one retry for the wallet-frame race, otherwise the failure. */
export function onPrivyError(error: Error) {
  if (status.state === "failed" && (status.reconnectLine || status.reloadRequired)) return;
  if (error.message.includes(WALLET_FRAME_RACE) && !retriedRace) {
    retriedRace = true;
    console.warn("Privy signed out while making the wallet; signing in again");
    const selected = currentSelection();
    setTimeout(() => {
      if (selected === currentSelection()) resetPrivySignIn();
    }, RACE_RETRY_MS);
    return;
  }
  setPrivyStatus({ state: "failed", reason: i18next.t(($) => $.identity.selection.authFailed) });
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
 * Trades LIFF's access token for the auth server's five-minute Privy JWT. Privy logs the person out
 * when this returns nothing, which it does on every page load, so the token is the access token: LIFF
 * counts the person logged in exactly while it holds one, and its ID token lapses far sooner. A
 * failure resolves to undefined, since a throw logs out too, and its reason goes to the status.
 */
export async function fetchPrivyJwt(account: PrivyAccount): Promise<string | undefined> {
  // The SDK re-syncs on its own after a failure; asking again would only repeat it at every server.
  if (!isAccountSelectionCurrent(account) || status.state === "failed") return undefined;
  if (
    kept &&
    kept.key === selectionKey(account) &&
    kept.expiresAt - EXPIRY_MARGIN_S > Date.now() / 1000
  )
    return kept.jwt;
  const lifetime = currentSelection();
  let accessToken: string | null;
  try {
    accessToken = liff.getAccessToken();
  } catch {
    return fail("LINE could not supply an access token", true);
  }
  if (!accessToken) return fail("LINE gave no access token", true);
  // Privy renews a lapsed JWT in the background, and the person stays signed in unless that fails.
  if (status.state !== "signed-in") setPrivyStatus({ state: "signing-in" });
  try {
    const body: unknown = await createSessionApi().privyJwt(
      accessToken,
      account,
      AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
    );
    if (lifetime !== currentSelection() || !isAccountSelectionCurrent(account)) return undefined;
    const jwt = jsonField(body, "jwt");
    const expiresAt = jsonField(body, "expiresAt");
    if (jsonField(body, "subject") !== account.expectedSubject)
      return fail(i18next.t(($) => $.identity.selection.subjectMismatch));
    if (typeof jwt !== "string" || !jwt || typeof expiresAt !== "number") {
      return fail("the auth server answered without a JWT");
    }
    kept = { key: selectionKey(account), jwt, expiresAt };
    return jwt;
  } catch (error) {
    if (lifetime !== currentSelection() || !isAccountSelectionCurrent(account)) return undefined;
    return fail(
      `The authenticated API could not complete Privy sign-in: ${error instanceof ApiError ? `${error.status} ${error.code}` : "network failure"}`,
      error instanceof ApiError &&
        error.status === 401 &&
        (error.code === "line_token_expired" || error.code === "line_token_invalid"),
    );
  }
}

onSessionSuspended(() => {
  suspension += 1;
  reconnecting = null;
  kept = undefined;
  retriedRace = false;
  setPrivyStatus(liffMockActive ? { state: "off" } : { state: "signing-in" });
});
