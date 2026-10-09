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

/** Why LIFF didn't start: it never answered, or it answered with an error. */
type LineFailure = { kind: "no-answer" } | { kind: "refused"; message: string };

export type LineState =
  | { status: "loading" }
  /**
   * Opened in a browser outside LINE, and not logged in yet. `strayAnswer`: LINE's answer to a login
   * landed here, in a browser that didn't start it, so it couldn't finish.
   */
  | { status: "logged-out"; strayAnswer: boolean }
  | { status: "ready"; profile: LineProfile; inClient: boolean }
  | { status: "error"; failure: LineFailure };

let state: LineState = { status: "loading" };
const listeners = new Set<() => void>();
const set = (next: LineState) => {
  state = next;
  listeners.forEach((l) => l());
};

let started = false;

// A start that hasn't settled by then ends on the error screen, with Try again, rather than a blank page.
export const START_TIMEOUT_MS = 15_000;

/** LIFF's start hadn't settled when its time ran out. */
class StartTimedOut extends Error {}

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
    set({
      status: "error",
      failure:
        error instanceof StartTimedOut
          ? { kind: "no-answer" }
          : { kind: "refused", message: describeLiffError(error) },
    });
  }
}

/**
 * This browser's LINE logins: `started` until one comes back logged in, and `off` for good once one
 * didn't. Auto login hands the login to the LINE app, which returns to the default browser, maybe not this one.
 */
const AUTO_LOGIN_KEY = "draw.lineAutoLogin";

async function startLine(): Promise<LineState> {
  // LINE Login's answer, which liff.init takes off the address.
  const query = new URLSearchParams(location.search);
  const answered = query.has("code") && query.has("liffClientId");
  // False in the build, which drops this branch and LIFF Mock with it.
  if (liffMockActive) await initMock();
  else await liff.init({ liffId: LIFF_ID });
  // An answer LIFF couldn't finish: the login's PKCE verifier is in the browser that started it.
  if (!liff.isLoggedIn()) return { status: "logged-out", strayAnswer: answered };
  if (localStorage.getItem(AUTO_LOGIN_KEY) === "started") localStorage.removeItem(AUTO_LOGIN_KEY);
  const inClient = liff.isInClient();
  // The ID token already names the person, so the app opens without waiting on another call to LINE;
  // the profile follows, for a name or picture changed since the token was issued.
  const claims = lineClaims();
  if (claims?.name !== undefined) {
    void followProfile();
    return {
      status: "ready",
      profile: {
        userId: claims.sub,
        displayName: claims.name,
        ...(claims.picture && { pictureUrl: claims.picture }),
      },
      inClient,
    };
  }
  return { status: "ready", profile: await liff.getProfile(), inClient };
}

/** Who LIFF's ID token names: LINE's user ID (`sub`), and the name and picture it was issued with. */
export interface LineClaims {
  sub: string;
  name?: string;
  picture?: string;
}

/** The logged-in person as LIFF's ID token names them, or null before LIFF has one. */
export function lineClaims(): LineClaims | null {
  let token: ReturnType<typeof liff.getDecodedIDToken>;
  try {
    token = liff.getDecodedIDToken();
  } catch {
    // Before liff.init LIFF throws rather than answering null; either way there's no token yet.
    return null;
  }
  if (!token?.sub) return null;
  return {
    sub: token.sub,
    ...(token.name !== undefined && { name: token.name }),
    ...(token.picture && { picture: token.picture }),
  };
}

/** LINE's profile, once it answers, where it differs from what the app opened with. */
async function followProfile() {
  try {
    const profile = await liff.getProfile();
    if (state.status !== "ready") return;
    const was = state.profile;
    if (
      profile.displayName !== was.displayName ||
      profile.pictureUrl !== was.pictureUrl ||
      profile.statusMessage !== was.statusMessage
    ) {
      set({ ...state, profile: { ...profile, userId: was.userId } });
    }
  } catch (error) {
    // The ID token's name and picture stay, which is what the app opened with.
    console.warn("LINE's profile didn't load", error);
  }
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new StartTimedOut(`LINE didn't answer within ${ms / 1000} s`)),
      ms,
    );
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
  // Only this path loads dev sign-in, so the build, which drops it, never ships a dev access token.
  const [{ LiffMockPlugin }, { devAccessToken }] = await Promise.all([
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
    // The REST API trusts a dev access token only with DEV_SIGN_IN=on.
    getAccessToken: devAccessToken(person),
    // The claims LINE's token would carry, which the app opens with before LINE's profile answers.
    getDecodedIDToken: { sub: person.sub, name: person.name },
    getProfile: { userId: person.sub, displayName: person.name },
  }));
  Object.assign(window, { liffMock: mocked.$mock });
  // The mock's profile calls need a login call first, as a real browser would.
  liff.login();
}

/**
 * LINE Login, for a browser outside LINE. It comes back to `to`, this page unless told otherwise. Once a
 * login from this browser never came back, the next stays on LINE's page here, without auto login.
 */
export function lineLogin(to = location.href) {
  const retry = localStorage.getItem(AUTO_LOGIN_KEY) !== null;
  localStorage.setItem(AUTO_LOGIN_KEY, retry ? "off" : "started");
  liff.login({ redirectUri: to, ...(retry && { disableAutoLogin: true }) });
}

/**
 * Logs out of LINE. `endSession` first ends the app's session; LINE's logout goes ahead whether it
 * finishes or not. What this device keeps for the person stays, kept for them alone.
 */
export async function lineLogout(endSession: () => Promise<void>) {
  try {
    await endSession();
  } catch (error) {
    console.error("The app's session didn't end with LINE's logout", error);
  }
  liff.logout();
  location.reload();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * The access token that signs you in to the app's server and to Privy, or null before LINE is ready.
 * LIFF counts you logged in exactly while it holds one; its ID token lapses far sooner.
 */
export function lineAccessToken(): string | null {
  return state.status === "ready" ? liff.getAccessToken() : null;
}

/** Used only to match an existing server session, never as a sign-in credential. */
export function lineUserId(): string | null {
  return state.status === "ready" ? state.profile.userId : null;
}

export function useLine(): LineState {
  return useSyncExternalStore(subscribe, () => state);
}
