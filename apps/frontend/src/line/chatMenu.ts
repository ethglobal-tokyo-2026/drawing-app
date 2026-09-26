import liff from "@line/liff";
import { useSyncExternalStore } from "react";
import { jsonField } from "../identity/privy";

/** The menu under the official account's chat: one "Open Sticker Board" button for someone new, three tiles after. */
export type ChatMenuStatus =
  | { state: "waiting" }
  | { state: "switching" }
  | { state: "returning" }
  | { state: "new"; reason: "not_signed_up" | "not_a_friend" }
  | { state: "failed"; reason: string };

let status: ChatMenuStatus = { state: "waiting" };
const listeners = new Set<() => void>();

function set(next: ChatMenuStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const chatMenuStatus = () => status;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useChatMenuStatus(): ChatMenuStatus {
  return useSyncExternalStore(subscribe, chatMenuStatus);
}

// Longer than the server's worst case, five upstream calls of up to 5 s each, so a slow switch isn't called a failure.
const SWITCH_TIMEOUT_MS = 30_000;
let asked = false;

function fail(reason: string) {
  console.error(`The chat menu didn't switch: ${reason}`);
  set({ state: "failed", reason });
}

/**
 * Asks the auth server to give this person the returning-user chat menu, once per page load. The server
 * checks with LINE and Privy itself; the outcome goes to the status, and this never throws.
 */
export async function requestReturningMenu(): Promise<void> {
  if (asked) return;
  const idToken = liff.getIDToken();
  // Without a token nothing was asked, so a later sign-in can still try.
  if (!idToken) return fail("LINE gave no ID token");
  asked = true;
  set({ state: "switching" });
  try {
    const response = await fetch("/v1/auth/line-menu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(SWITCH_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    const menu = jsonField(body, "menu");
    const reason = jsonField(body, "reason");
    if (response.ok && menu === "returning") return set({ state: "returning" });
    if (
      response.ok &&
      menu === "new" &&
      (reason === "not_signed_up" || reason === "not_a_friend")
    ) {
      return set({ state: "new", reason });
    }
    const error = jsonField(body, "error");
    fail(`HTTP ${response.status}${typeof error === "string" ? ` ${error}` : ""}`);
  } catch (error) {
    fail(
      `couldn’t reach the auth server: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
