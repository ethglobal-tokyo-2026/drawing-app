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
  statusMessage?: string;
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

const MOCK_PERSON_KEY = "draw.liffMockAs";
/** LIFF Mock's own stand-in user. */
const MOCK_DEFAULT_NAME = "brown";

/**
 * Who LIFF Mock signs in as: `?as=<name>`, kept for the tab so in-app navigation keeps them, or LIFF
 * Mock's own Brown. A name in any letter case is one person, with one LINE user ID.
 */
export function mockPerson(search: string, tab: Pick<Storage, "getItem" | "setItem">) {
  const asked = new URLSearchParams(search).get("as")?.trim().toLowerCase();
  if (asked) tab.setItem(MOCK_PERSON_KEY, asked);
  const name = asked || tab.getItem(MOCK_PERSON_KEY) || MOCK_DEFAULT_NAME;
  return { sub: `dev-${name}`, name: name.charAt(0).toUpperCase() + name.slice(1) };
}

/** On localhost LIFF Mock answers for LINE, logged in as mockPerson as if inside LINE. */
async function initMock() {
  // Only this path loads dev sign-in, so the build, which drops it, never ships a dev ID token.
  const [{ LiffMockPlugin }, { devIdToken }] = await Promise.all([
    import("@line/liff-mock"),
    import("@drawing-app/api/dev-sign-in"),
  ]);
  const person = mockPerson(location.search, sessionStorage);
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
    // LIFF Mock reports a group chat; a gift link opens as it would from a 1:1 chat.
    getContext: data.getContext && { ...data.getContext, type: "utou", utouId: "mock-utou" },
    // The REST API trusts a dev ID token only with DEV_SIGN_IN=on.
    getIDToken: devIdToken(person),
    getProfile: { userId: person.sub, displayName: person.name },
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

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The ID token that signs you in to the app's server, or null before LINE is ready. */
export function lineIdToken(): string | null {
  return state.status === "ready" ? liff.getIDToken() : null;
}

/** Used only to match an existing server session, never as a sign-in credential. */
export function lineUserId(): string | null {
  return state.status === "ready" ? state.profile.userId : null;
}

export function useLine(): LineState {
  return useSyncExternalStore(subscribe, () => state);
}
