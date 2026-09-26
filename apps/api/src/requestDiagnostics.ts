import { randomUUID } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { logInfo, withRequestDiagnostics } from "./diagnostics.ts";

function nftRoute(path: string) {
  if (path === "/api/stickers") return path;
  if (/^\/api\/gifts\/(preview|receive|pending)$/.test(path)) return path;
  if (path === "/api/gifts" || path === "/api/gifts/") return "/api/gifts";
  const action = /^\/api\/gifts\/0x[a-f0-9]{64}\/(deposit|shared|take-out)$/i.exec(path)?.[1];
  return action ? `/api/gifts/:giftId/${action}` : undefined;
}

/** Server-generated IDs correlate browser failures without accepting user-controlled log text. */
export const requestDiagnostics = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const route = nftRoute(c.req.path);
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
