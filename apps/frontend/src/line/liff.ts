import liff from "@line/liff";
import { useSyncExternalStore } from "react";

const LIFF_ID = import.meta.env.VITE_LIFF_ID;

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export type LineState =
  | { status: "loading" }
  /** No LIFF ID configured. */
  | { status: "disabled" }
  /** Opened in a normal browser and not logged in to LINE. */
  | { status: "logged-out" }
  | { status: "ready"; profile: LineProfile; inClient: boolean; email?: string }
  | { status: "error"; message: string };

let state: LineState = { status: "loading" };
const listeners = new Set<() => void>();
const set = (next: LineState) => {
  state = next;
  listeners.forEach((l) => l());
};

let started = false;

/**
 * Starts LIFF once, as early as possible (it also handles the redirect back
 * from LINE Login). Inside the LINE app the user is logged in automatically;
 * in an ordinary browser they stay logged out until `lineLogin()`.
 */
export async function initLine(): Promise<void> {
  if (started) return;
  started = true;
  if (!LIFF_ID) {
    set({ status: "disabled" });
    return;
  }
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      set({ status: "logged-out" });
      return;
    }
    const profile = await liff.getProfile();
    set({
      status: "ready",
      profile,
      inClient: liff.isInClient(),
      // Present only when the LIFF app has the `openid` and `email` scopes.
      email: liff.getDecodedIDToken()?.email,
    });
  } catch (e) {
    console.error("LIFF init failed", e);
    set({
      status: "error",
      message: e instanceof Error && e.message ? e.message : "LIFF init failed",
    });
  }
}

/** LINE Login, for when the app is opened outside the LINE app. */
export function lineLogin() {
  liff.login({ redirectUri: location.href });
}

export function lineLogout() {
  liff.logout();
  location.reload();
}

/**
 * Shares through LINE's friend/group picker when available (inside LINE,
 * with Share Target Picker enabled in the console). Returns false when the
 * caller should fall back to another share method.
 */
export async function shareOnLine(text: string): Promise<boolean> {
  if (state.status !== "ready" || !liff.isApiAvailable("shareTargetPicker")) return false;
  try {
    await liff.shareTargetPicker([{ type: "text", text }]);
    return true;
  } catch {
    return false;
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLine(): LineState {
  return useSyncExternalStore(subscribe, () => state);
}
