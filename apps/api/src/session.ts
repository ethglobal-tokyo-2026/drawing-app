import { users } from "@drawing-app/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { CookieOptions } from "hono/utils/cookie";
import type { AppDeps } from "./deps.ts";
import { apiError } from "./errors.ts";

/**
 * What every route's context carries. requireSession sets userId on every route but signing in and
 * out (POST and DELETE /api/session).
 */
export type AppEnv = {
  Variables: { userId: string };
};

export const SESSION_COOKIE = "session";

/**
 * 30 days: the app opens on the cookie it already has instead of signing in again. It checks that
 * LINE's user is the session's, through Me's `lineUserId`, before it shows anything.
 */
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

const cookieOptions = {
  path: "/api",
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  maxAge: SESSION_MAX_AGE_S,
} as const satisfies CookieOptions;

/** A session cookie's signed value: the user id, then when the session ends, in ms since 1970. */
const SESSION_VALUE = /^(.+)\.(\d+)$/;

/**
 * The value a session cookie signs, ending SESSION_MAX_AGE_S after `now`. The expiry is inside the
 * signature, so a copied cookie ends then too, whatever the browser's Max-Age.
 */
export const sessionValue = (userId: string, now: Date) =>
  `${userId}.${now.getTime() + SESSION_MAX_AGE_S * 1000}`;

/** Signs the person in: the cookie holds their user id and the session's end, signed so neither can be forged. */
export const setSessionCookie = (
  c: Context,
  { sessionSecret, clock }: Pick<AppDeps, "sessionSecret" | "clock">,
  userId: string,
) =>
  setSignedCookie(
    c,
    SESSION_COOKIE,
    sessionValue(userId, clock.now()),
    sessionSecret,
    cookieOptions,
  );

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, SESSION_COOKIE, cookieOptions);
};

/**
 * The live account a request's valid session cookie names, if there's one. A cookie past its end, or
 * signed before cookies carried one, is signed out.
 */
export async function sessionUser(
  c: Context,
  { db, sessionSecret, clock }: Pick<AppDeps, "db" | "sessionSecret" | "clock">,
) {
  const signed = await getSignedCookie(c, sessionSecret, SESSION_COOKIE);
  const session = signed ? SESSION_VALUE.exec(signed) : null;
  if (!session || Number(session[2]) <= clock.now().getTime()) return undefined;
  return db
    .select({ id: users.id, nsfwOptedInAt: users.nsfwOptedInAt })
    .from(users)
    .where(and(eq(users.id, session[1]), isNull(users.deletedAt)))
    .get();
}

/** Lets a request through with a valid session cookie for a live account; otherwise 401 signed_out. */
export const requireSession = (deps: Pick<AppDeps, "db" | "sessionSecret" | "clock">) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = await sessionUser(c, deps);
    if (!user) return apiError(c, 401, "signed_out");
    c.set("userId", user.id);
    await next();
  });
