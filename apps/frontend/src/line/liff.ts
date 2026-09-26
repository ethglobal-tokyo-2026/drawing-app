import liff from "@line/liff";
import type { LiffMockApi, LiffMockConfig } from "@line/liff-mock";
import { useSyncExternalStore } from "react";

// The LIFF app on the Login channel. It isn't secret: every LIFF link carries it. `.env` can point the dev
// server at another LIFF app, one whose endpoint is that server; builds ignore it, so a local .env never ships.
export const LIFF_ID =
  (import.meta.env.DEV && import.meta.env.VITE_LIFF_ID) || "2011732197-P98cxGpu";

/** LIFF Mock answers for LINE on the dev server unless `.env` switches it off; builds always use LINE. */
export const liffMockActive = import.meta.env.DEV && import.meta.env.VITE_LIFF_MOCK !== "off";

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export type LineState =
  | { status: "loading" }
  /** Opened in a browser outside LINE, and not logged in yet. */
  | { status: "logged-out" }
  | { status: "ready"; profile: LineProfile; inClient: boolean }
  | { status: "error"; message: string };

let state: LineState = { status: "loading" };
const listeners = new Set<() => void>();
const set = (next: LineState) => {
  state = next;
  listeners.forEach((l) => l());
};

let started = false;

// A start that hasn't settled by then ends on the error screen, with Try again, rather than a blank page.
const START_TIMEOUT_MS = 15_000;

/**
 * Starts LIFF once, before anything reads or changes the address bar: LIFF reads it to finish a
 * LINE Login redirect. Inside LINE the person is already logged in; in a browser they stay
 * logged out until `lineLogin()`.
 */
export async function initLine(): Promise<void> {
  if (started) return;
  started = true;
  try {
    set(await withTimeout(startLine(), START_TIMEOUT_MS));
  } catch (error) {
    console.error("LINE didn't start", error);
    set({ status: "error", message: describeLiffError(error) });
  }
}

async function startLine(): Promise<LineState> {
  // False in the build, which drops this branch and LIFF Mock with it.
  if (liffMockActive) await initMock();
  else await liff.init({ liffId: LIFF_ID });
  if (!liff.isLoggedIn()) return { status: "logged-out" };
  const profile = await liff.getProfile();
  return { status: "ready", profile, inClient: liff.isInClient() };
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`LINE didn't answer within ${ms / 1000} s`)), ms);
  });
  try {
    return await Promise.race([work, expired]);
  } finally {
    clearTimeout(timer);
  }
}

/** "INIT_FAILED: channel not found": LIFF's error code names what failed where the message may not. */
export function describeLiffError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = error.message || error.name;
  return code ? `${code}: ${message}` : message;
}

const hasMock = (l: object): l is { $mock: LiffMockApi } => "$mock" in l;

/** On localhost LIFF Mock answers for LINE, logged in as its stand-in user as if inside LINE. */
async function initMock() {
  const { LiffMockPlugin } = await import("@line/liff-mock");
  liff.use(new LiffMockPlugin());
  // liff.init's type doesn't declare the plugin's `mock` option.
  const config: Parameters<typeof liff.init>[0] & LiffMockConfig = { liffId: LIFF_ID, mock: true };
  await liff.init(config);
  const mocked = liff;
  if (!hasMock(mocked)) throw new Error("LIFF Mock didn't install");
  // As inside LINE, the friend picker opens and sends. The console can change LINE's answers, e.g.
  // `liffMock.set((d) => ({ ...d, shareTargetPicker: undefined }))` makes the next picker cancel.
  mocked.$mock.set((data) => ({
    ...data,
    isLoggedIn: true,
    isInClient: true,
    isApiAvailable: true,
    shareTargetPicker: { status: "success" },
  }));
  Object.assign(window, { liffMock: mocked.$mock });
  // The mock's profile calls need a login call first, as a real browser would.
  liff.login();
}

/** LINE Login, for a browser outside LINE. It comes back to this page. */
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
  } catch (error) {
    // The caller falls back to the system share sheet or a copied link; the failure is kept here.
    console.error("LINE's share picker failed:", describeLiffError(error), error);
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
