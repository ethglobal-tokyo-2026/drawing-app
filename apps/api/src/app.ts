import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { except } from "hono/combine";
import { z } from "zod";
import { IMMUTABLE_MAX_AGE_S } from "./cacheControl.ts";
import type { AppDeps } from "./deps.ts";
import { apiError, limitBody, notFound, onError, validate } from "./errors.ts";
import { ageVerificationRoutes } from "./routes/ageVerification.ts";
import { ensRoutes } from "./routes/ens.ts";
import { exploreRoutes } from "./routes/explore.ts";
import { giftRoutes } from "./routes/gifts.ts";
import { gratitudeRoutes } from "./routes/gratitude.ts";
import { lineMenuRoutes } from "./routes/lineMenu.ts";
import { sessionRoutes } from "./routes/session.ts";
import { stickerBoardRoutes } from "./routes/stickerBoards.ts";
import { stickerRoutes } from "./routes/stickers.ts";
import { ticketRoutes } from "./routes/tickets.ts";
import { requireSession, type AppEnv } from "./session.ts";
import { requestDiagnostics } from "./requestDiagnostics.ts";

/**
 * The largest request body a route takes unless it sets its own: room for every JSON body the app
 * sends, the largest being a Mini-game combo, which rides a keepalive request that carries no more.
 */
export const MAX_BODY_BYTES = 64 * 1024;

/** Sealing sends a sticker's images, over MAX_BODY_BYTES, and sets its own limit. */
const isSealing = (c: Context) => c.req.method === "POST" && c.req.path === "/api/stickers";
/** Signing in, and signing out, which clears whatever cookie is there, live or not. */
const isSignInOrOut = (c: Context) =>
  (c.req.method === "POST" || c.req.method === "DELETE") && c.req.path === "/api/session";
/** ENS clients call the gateway with no session. */
const isEnsGateway = (c: Context) =>
  c.req.method === "GET" && c.req.path.startsWith("/api/ens/gateway/");

/**
 * The REST API. Every call chains, here and inside each route group, so each route's request and
 * response types reach AppType and Hono's typed client.
 */
export function createApp(deps: AppDeps) {
  return (
    new Hono<AppEnv>()
      .basePath("/api")
      .use(requestDiagnostics)
      .use(except(isSealing, limitBody(MAX_BODY_BYTES)))
      .use(except([isSignInOrOut, isEnsGateway], requireSession(deps)))
      // /session and /me
      .route("/", sessionRoutes(deps))
      // /me/age-verification
      .route("/", ageVerificationRoutes(deps))
      // /line-menu
      .route("/", lineMenuRoutes(deps))
      // /tickets and /ticket-purchases
      .route("/", ticketRoutes(deps))
      .route("/stickers", stickerRoutes(deps))
      .route("/sticker-boards", stickerBoardRoutes(deps))
      .route("/gifts", giftRoutes(deps))
      .route("/gratitude", gratitudeRoutes(deps))
      .route("/ens", ensRoutes(deps))
      // /explore and /users
      .route("/", exploreRoutes(deps))
      .onError(onError)
      .notFound(notFound)
  );
}

export type AppType = ReturnType<typeof createApp>;

/** Where the server serves the sticker images; on the box, CDN_BASE_URL is the site's origin plus this. */
export const STICKER_IMAGES_PATH = "/api/images";

/** The server log's newest lines a request gets, and the most it can ask for with ?lines=. */
export const SERVER_LOG_LINES = 1000;
export const MAX_SERVER_LOG_LINES = 10_000;
const serverLogQuerySchema = z.object({
  lines: z.coerce.number().int().positive().max(MAX_SERVER_LOG_LINES).default(SERVER_LOG_LINES),
});

/**
 * The REST API as the server runs it, with the sticker images in `imageDir` served in front of it,
 * public like a CDN's. A name with no image is a 404 there, never the API's session check. The
 * server log is in front of it too, public, since the agents troubleshooting the box have no session:
 * its newest SERVER_LOG_LINES lines, or ?lines= up to MAX_SERVER_LOG_LINES, and 503 while another
 * request reads it.
 */
export function createServer(deps: AppDeps, imageDir: string) {
  const images = `${STICKER_IMAGES_PATH}/*`;
  return new Hono()
    .use(images, async (c, next) => {
      await next();
      // serveStatic's onFound runs after it has made the response, too late to add a header. An
      // image's name is its content's hash, so the file never changes.
      if (c.res.ok) c.header("Cache-Control", `public, max-age=${IMMUTABLE_MAX_AGE_S}, immutable`);
    })
    .use(
      images,
      serveStatic({
        root: imageDir,
        rewriteRequestPath: (path) => path.slice(STICKER_IMAGES_PATH.length),
      }),
    )
    .get(images, (c) => apiError(c, 404, "image_not_found", `No sticker image at ${c.req.path}`))
    .get("/api/logs", validate("query", serverLogQuerySchema), async (c) => {
      const log = await deps.serverLog(c.req.valid("query").lines);
      if (!log) {
        return apiError(
          c,
          503,
          "server_log_busy",
          "Another request is reading the server log; ask again once it has",
        );
      }
      return c.body(log, 200, { "Content-Type": "text/plain; charset=utf-8" });
    })
    .route("/", createApp(deps))
    .onError(onError)
    .notFound(notFound);
}
