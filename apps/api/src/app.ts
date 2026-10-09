import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { except } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { IMMUTABLE_MAX_AGE_S } from "./cacheControl.ts";
import type { AppDeps } from "./deps.ts";
import { apiError, limitBody, notFound, onError, validate } from "./errors.ts";
import { exploreRoutes } from "./routes/explore.ts";
import { giftRoutes } from "./routes/gifts.ts";
import { gratitudeRoutes } from "./routes/gratitude.ts";
import { lineMenuRoutes } from "./routes/lineMenu.ts";
import { sessionRoutes } from "./routes/session.ts";
import { stickerBoardRoutes } from "./routes/stickerBoards.ts";
import { stickerRoutes } from "./routes/stickers.ts";
import { ticketRoutes } from "./routes/tickets.ts";
import { requireSession, sessionUser, type AppEnv } from "./session.ts";
import { optedIntoNsfw } from "./shapes.ts";
import { isNsfwDrawing } from "./stickers/nsfwDrawing.ts";
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
      .use(except(isSignInOrOut, requireSession(deps)))
      // /session and /me
      .route("/", sessionRoutes(deps))
      // /line-menu
      .route("/", lineMenuRoutes(deps))
      // /tickets and /ticket-purchases
      .route("/", ticketRoutes(deps))
      .route("/stickers", stickerRoutes(deps))
      .route("/sticker-boards", stickerBoardRoutes(deps))
      .route("/gifts", giftRoutes(deps))
      .route("/gratitude", gratitudeRoutes(deps))
      // /explore and /users
      .route("/", exploreRoutes(deps))
      .onError(onError)
      .notFound(notFound)
  );
}

export type AppType = ReturnType<typeof createApp>;

/** Where the server serves the sticker images; on the box, IMAGE_BASE_URL is the site's origin plus this. */
export const STICKER_IMAGES_PATH = "/api/images";

/** The server log's newest lines a request gets, and the most it can ask for with ?lines=. */
export const SERVER_LOG_LINES = 1000;
export const MAX_SERVER_LOG_LINES = 10_000;
const serverLogQuerySchema = z.object({
  lines: z.coerce.number().int().positive().max(MAX_SERVER_LOG_LINES).default(SERVER_LOG_LINES),
});

/**
 * The files that show a sticker's drawing, by its content hash: its PNG and display WebP, the flat
 * sheet, its sharp copy's PNG and display WebP, and the WebPs that showed the resin dome.
 */
const DRAWING_FILE =
  /^\/(0x[0-9a-f]{64})(?:(?:\.sharp)?(?:\.png|\.display\.webp|\.webp)|\.flat\.png)$/;

/**
 * Serves the files that show a drawing only NSFW stickers show to an opted-in session alone, never
 * publicly cached; anyone else gets 403 nsfw_not_opted_in. Every other image is public, cached for
 * good.
 */
const imageAccess = (deps: AppDeps) =>
  createMiddleware(async (c, next) => {
    const drawing = DRAWING_FILE.exec(c.req.path.slice(STICKER_IMAGES_PATH.length));
    const optInOnly = drawing !== null && isNsfwDrawing(deps.db, drawing[1]);
    if (optInOnly) {
      const viewer = await sessionUser(c, deps);
      if (!viewer || !optedIntoNsfw(viewer)) {
        const detail = `${c.req.path} shows an NSFW sticker's drawing, only for the NSFW opt-in`;
        return apiError(c, 403, "nsfw_not_opted_in", detail);
      }
    }
    await next();
    // serveStatic's onFound runs after it has made the response, too late to add a header.
    if (!c.res.ok) return;
    const scope = optInOnly ? "private" : "public";
    c.header("Cache-Control", `${scope}, max-age=${IMMUTABLE_MAX_AGE_S}, immutable`);
  });

/**
 * The REST API as the server runs it, with the sticker images in `imageDir` served in front of it,
 * as imageAccess allows. A name with no image is a 404 there, never the API's session check. The
 * server log is in front of it too, public, since the agents troubleshooting the box have no session:
 * its newest SERVER_LOG_LINES lines, or ?lines= up to MAX_SERVER_LOG_LINES, and 503 while another
 * request reads it.
 */
export function createServer(deps: AppDeps, imageDir: string) {
  const images = `${STICKER_IMAGES_PATH}/*`;
  return new Hono()
    .use(images, imageAccess(deps))
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
