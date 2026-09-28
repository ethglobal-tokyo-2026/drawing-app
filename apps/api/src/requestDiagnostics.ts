import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { matchedRoutes } from "hono/route";
import { logInfo, withRequestDiagnostics } from "./diagnostics.ts";

/** Sealing, Giving and Receiving: their requests log when they start and when they finish. */
const LOGGED_ROUTES = new Set([
  "/api/stickers",
  "/api/gifts",
  "/api/gifts/pending",
  "/api/gifts/preview",
  "/api/gifts/receive",
  "/api/gifts/:giftId/receive",
  "/api/gifts/:giftId/deposit",
  "/api/gifts/:giftId/shared",
  "/api/gifts/:giftId/take-out",
]);

/** The template of the logged route a request asks for, so no URL parameter reaches the log. */
const loggedRouteTemplate = (c: Context) =>
  matchedRoutes(c).find(({ path }) => LOGGED_ROUTES.has(path))?.path;

/** Server-generated IDs correlate browser failures without accepting user-controlled log text. */
export const requestDiagnostics = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const route = loggedRouteTemplate(c);
  const started = performance.now();
  c.header("X-Request-ID", requestId);
  await withRequestDiagnostics(
    { requestId, method: c.req.method, route: route ?? "/api/*" },
    async () => {
      if (route) logInfo("request.started");
      await next();
      if (route) {
        logInfo("request.completed", {
          status: c.res.status,
          elapsedMs: Math.round(performance.now() - started),
        });
      }
    },
  );
});
