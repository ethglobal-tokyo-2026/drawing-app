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
 * out (POST and DELETE /api/session) and the ENS gateway (GET /api/ens/gateway/*).
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

/** Signs the person in: the cookie holds their user id, signed so it can't be forged. */
export const setSessionCookie = (c: Context, sessionSecret: string, userId: string) =>
  setSignedCookie(c, SESSION_COOKIE, userId, sessionSecret, cookieOptions);

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, SESSION_COOKIE, cookieOptions);
};

/** The live account a request's valid session cookie names, if there's one. */
export async function sessionUser(
  c: Context,
  { db, sessionSecret }: Pick<AppDeps, "db" | "sessionSecret">,
) {
  const userId = await getSignedCookie(c, sessionSecret, SESSION_COOKIE);
  if (!userId) return undefined;
  return db
    .select({ id: users.id, nsfwOptedInAt: users.nsfwOptedInAt })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();
}

/** Lets a request through with a valid session cookie for a live account; otherwise 401 signed_out. */
export const requireSession = (deps: Pick<AppDeps, "db" | "sessionSecret">) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = await sessionUser(c, deps);
    if (!user) return apiError(c, 401, "signed_out");
    c.set("userId", user.id);
    await next();
  });
