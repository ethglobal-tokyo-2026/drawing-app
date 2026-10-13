import { MAX_ACCESS_TOKEN_LENGTH, MIN_ACCESS_TOKEN_LENGTH } from "@drawing-app/line-auth/line";
import { PRIVY_JWT_LIFETIME_S } from "@drawing-app/line-auth/line-privy-jwt";
import { Hono } from "hono";
import { z } from "zod";
import { LineTokenInvalidError, type AppDeps } from "../deps.ts";
import { apiError, PersonSessionError, validate } from "../errors.ts";
import { logInfo } from "../diagnostics.ts";
import type { AppEnv } from "../session.ts";
import { assertCurrentPerson, withPersonOwnership } from "../session/personOwnership.ts";
import { liveSessionUser } from "../session/personSwitch.ts";

const body = z
  .object({ accessToken: z.string().min(MIN_ACCESS_TOKEN_LENGTH).max(MAX_ACCESS_TOKEN_LENGTH) })
  .strict();

/** Respond at the deadline even while ownership is queued; keep the queued operation observed. */
async function withinDeadline<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  let expired: (() => void) | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      expired = () => reject(new DOMException("Privy exchange deadline expired", "TimeoutError"));
      signal.addEventListener("abort", expired, { once: true });
      void Promise.resolve().then(run).then(resolve, reject);
    });
  } finally {
    if (expired) signal.removeEventListener("abort", expired);
  }
}

/** One deadline covers LINE verification and the protected issuer, under selected-person ownership. */
export const privyJwtRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>().post("/session/privy-jwt", validate("json", body), async (c) => {
    c.header("Cache-Control", "no-store");
    const session = c.var.session;
    const signal = AbortSignal.timeout(10_000);
    const outcome = (label: string) =>
      logInfo("privy.authorization", {
        authenticatedUserId: session.authenticatedUserId,
        selectedUserId: session.selectedUserId,
        selectionVersion: session.selectionVersion,
        outcome: label,
      });
    try {
      return await withinDeadline(signal, () =>
        withPersonOwnership(deps, session, async () => {
          signal.throwIfAborted();
          if (!deps.privyJwt) {
            outcome("provider_unavailable");
            return apiError(c, 503, "auth_unavailable");
          }
          const profile = await deps.line.verifyAccessToken(
            c.req.valid("json").accessToken,
            signal,
          );
          signal.throwIfAborted();
          assertCurrentPerson(deps, session);
          const principal = liveSessionUser(deps.db, session.authenticatedUserId);
          const selected = liveSessionUser(deps.db, session.selectedUserId);
          if (profile.sub !== principal?.lineUserId) {
            outcome("line_principal_mismatch");
            return apiError(c, 403, "line_principal_mismatch");
          }
          if (!selected?.lineUserId) throw new PersonSessionError("session_account_changed");
          const issuedAt = Math.floor(deps.clock.now().getTime() / 1000);
          const result = await deps.privyJwt.issue(
            {
              authenticatedUserId: session.authenticatedUserId,
              authenticatedLineUserId: profile.sub,
              selectedUserId: session.selectedUserId,
              selectedLineUserId: selected.lineUserId,
              sessionId: session.sessionId,
              selectionVersion: session.selectionVersion,
              scope: "croquis-privy-jwt",
              issuedAt,
              expiresAt: Math.min(
                issuedAt + PRIVY_JWT_LIFETIME_S,
                Math.floor(session.expiresAt.getTime() / 1000),
              ),
            },
            signal,
          );
          signal.throwIfAborted();
          assertCurrentPerson(deps, session);
          outcome("authorized");
          return c.json(result, 200);
        }),
      );
    } catch (error) {
      if (error instanceof PersonSessionError) {
        outcome(error.code);
        throw error;
      }
      if (error instanceof LineTokenInvalidError) {
        outcome(error.reason === "expired" ? "line_token_expired" : "line_token_invalid");
        return apiError(
          c,
          401,
          error.reason === "expired" ? "line_token_expired" : "line_token_invalid",
        );
      }
      // Provider messages can contain credentials, so only fixed labels reach diagnostics.
      outcome(signal.aborted ? "timeout" : "provider_unavailable");
      return apiError(c, 503, "auth_unavailable");
    }
  });
