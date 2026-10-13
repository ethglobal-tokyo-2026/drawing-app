import { personSwitchSessions } from "@drawing-app/db";
import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { CookieOptions } from "hono/utils/cookie";
import type { AppDeps } from "./deps.ts";
import { apiError } from "./errors.ts";
import { canSelectPerson, liveSessionUser } from "./session/personSwitch.ts";
import type { AuthenticatedSession, ResolvedSession } from "./session/sessionShapes.ts";

/**
 * What every route's context carries. requireSession sets userId except on anonymous sign-in.
 */
export type AppEnv = {
  Variables: { userId: string; session: ResolvedSession };
};

export const SESSION_COOKIE = "session";

/**
 * 30 days: the app opens on the cookie it already has instead of signing in again. It checks that
 * LINE's user is the authenticated profile's before it shows anything.
 */
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

const cookieOptions = {
  path: "/api",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  maxAge: SESSION_MAX_AGE_S,
} as const satisfies CookieOptions;

/** A versioned signed principal, UUID session ID, and millisecond expiration. */
const SESSION_VALUE =
  /^2\.([^.]+)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d+)$/;

/**
 * The value a session cookie signs, ending SESSION_MAX_AGE_S after `now`. The expiry is inside the
 * signature, so a copied cookie ends then too, whatever the browser's Max-Age.
 */
export const sessionValue = (userId: string, sessionId: string, now: Date): string =>
  `2.${userId}.${sessionId}.${now.getTime() + SESSION_MAX_AGE_S * 1000}`;

/** Signs the person in: the cookie holds their user id and the session's end, signed so neither can be forged. */
export const setSessionCookie = async (
  c: Context,
  { sessionSecret, clock, ids }: Pick<AppDeps, "sessionSecret" | "clock" | "ids">,
  userId: string,
): Promise<AuthenticatedSession> => {
  const now = clock.now();
  const sessionId = ids.uuid();
  await setSignedCookie(
    c,
    SESSION_COOKIE,
    sessionValue(userId, sessionId, now),
    sessionSecret,
    cookieOptions,
  );
  return {
    authenticatedUserId: userId,
    sessionId,
    expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_S * 1000),
  };
};

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, SESSION_COOKIE, cookieOptions);
};

/**
 * Resolve a signed authenticated principal and its current selection. Retired formats, expired
 * cookies and deleted accounts are signed out. Images and middleware share this resolver.
 */
export async function resolveSession(
  c: Context,
  {
    db,
    sessionSecret,
    clock,
    personSwitch,
  }: Pick<AppDeps, "db" | "sessionSecret" | "clock" | "personSwitch">,
): Promise<ResolvedSession | undefined> {
  const signed = await getSignedCookie(c, sessionSecret, SESSION_COOKIE);
  const session = signed ? SESSION_VALUE.exec(signed) : null;
  if (!session) return undefined;
  const authenticatedUserId = session[1];
  const sessionId = session[2];
  const end = Number(session[3]);
  if (
    !Number.isSafeInteger(end) ||
    end <= clock.now().getTime() ||
    !liveSessionUser(db, authenticatedUserId)
  )
    return undefined;
  const enabled = canSelectPerson(personSwitch, authenticatedUserId);
  const row = enabled
    ? db
        .select()
        .from(personSwitchSessions)
        .where(
          and(
            eq(personSwitchSessions.sessionId, sessionId),
            eq(personSwitchSessions.authenticatedUserId, authenticatedUserId),
            gt(personSwitchSessions.expiresAt, clock.now()),
          ),
        )
        .get()
    : undefined;
  const selectedUserId = row?.selectedUserId ?? authenticatedUserId;
  if (selectedUserId !== authenticatedUserId && selectedUserId !== personSwitch.hanaUserId)
    return undefined;
  if (!liveSessionUser(db, selectedUserId)) return undefined;
  return {
    authenticatedUserId,
    sessionId,
    expiresAt: new Date(end),
    selectedUserId,
    selectionVersion: enabled ? (row?.selectionVersion ?? sessionId) : null,
  };
}

/** Lets a request through with a valid session cookie for a live account; otherwise 401 signed_out. */
export const requireSession = (
  deps: Pick<AppDeps, "db" | "sessionSecret" | "clock" | "personSwitch">,
) =>
  createMiddleware<AppEnv>(async (c, next) => {
    // Bootstrap refusals must not be cached before the profile handler can run.
    if (c.req.path === "/api/me") c.header("Cache-Control", "no-store");
    const session = await resolveSession(c, deps);
    if (!session) return apiError(c, 401, "signed_out");
    const expected = c.req.header("x-croquis-user-id");
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(c.req.method);
    const version = c.req.header("x-croquis-selection-version");
    const bootstrap =
      c.req.method === "GET" &&
      c.req.path === "/api/me" &&
      expected === undefined &&
      version === undefined;
    const selectedRequest = session.selectionVersion !== null && !bootstrap;
    if (
      ((expected !== undefined || mutation || selectedRequest) &&
        expected !== session.selectedUserId) ||
      ((version !== undefined || selectedRequest) && version !== session.selectionVersion)
    ) {
      return apiError(c, 409, "session_account_changed");
    }
    c.set("userId", session.selectedUserId);
    c.set("session", session);
    await next();
  });
