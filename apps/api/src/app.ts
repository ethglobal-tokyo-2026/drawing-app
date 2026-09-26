import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { except } from "hono/combine";
import type { AppDeps } from "./deps.ts";
import { apiError, notFound, onError } from "./errors.ts";
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

const isSignIn = (c: Context) => c.req.method === "POST" && c.req.path === "/api/session";
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
      .use(except([isSignIn, isEnsGateway], requireSession(deps)))
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
/** A year: an image's name is its content's hash, so the file never changes. */
const IMAGE_MAX_AGE_S = 365 * 24 * 60 * 60;

/**
 * The REST API as the server runs it, with the sticker images in `imageDir` served in front of it,
 * public like a CDN's. A name with no image is a 404 there, never the API's session check. The
 * server log is in front of it too, public, since the agents troubleshooting the box have no session.
 */
export function createServer(deps: AppDeps, imageDir: string) {
  const images = `${STICKER_IMAGES_PATH}/*`;
  return new Hono()
    .use(images, async (c, next) => {
      await next();
      // serveStatic's onFound runs after it has made the response, too late to add a header.
      if (c.res.ok) c.header("Cache-Control", `public, max-age=${IMAGE_MAX_AGE_S}, immutable`);
    })
    .use(
      images,
      serveStatic({
        root: imageDir,
        rewriteRequestPath: (path) => path.slice(STICKER_IMAGES_PATH.length),
      }),
    )
    .get(images, (c) => apiError(c, 404, "image_not_found", `No sticker image at ${c.req.path}`))
    .get("/api/logs", async (c) =>
      c.body(await deps.serverLog(), 200, { "Content-Type": "text/plain; charset=utf-8" }),
    )
    .route("/", createApp(deps))
    .onError(onError)
    .notFound(notFound);
}
