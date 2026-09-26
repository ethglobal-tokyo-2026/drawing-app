import { Hono, type Context } from "hono";
import { except } from "hono/combine";
import type { AppDeps } from "./deps.ts";
import { notFound, onError } from "./errors.ts";
import { exploreRoutes } from "./routes/explore.ts";
import { giftRoutes } from "./routes/gifts.ts";
import { gratitudeRoutes } from "./routes/gratitude.ts";
import { gratitudeFeedRoutes } from "./routes/gratitudeFeed.ts";
import { sessionRoutes } from "./routes/session.ts";
import { stickerBoardRoutes } from "./routes/stickerBoards.ts";
import { stickerRoutes } from "./routes/stickers.ts";
import { ticketRoutes } from "./routes/tickets.ts";
import { requireSession, type AppEnv } from "./session.ts";

const isSignIn = (c: Context) => c.req.method === "POST" && c.req.path === "/api/session";

/**
 * The REST API. Every call chains, here and inside each route group, so each route's request and
 * response types reach AppType and Hono's typed client.
 */
export function createApp(deps: AppDeps) {
  return (
    new Hono<AppEnv>()
      .basePath("/api")
      .use(except(isSignIn, requireSession(deps)))
      // /session and /me
      .route("/", sessionRoutes(deps))
      // /tickets and /ticket-purchases
      .route("/", ticketRoutes(deps))
      .route("/stickers", stickerRoutes(deps))
      .route("/sticker-boards", stickerBoardRoutes(deps))
      .route("/gifts", giftRoutes(deps))
      .route("/gratitude", gratitudeRoutes(deps))
      .route("/gratitude", gratitudeFeedRoutes(deps))
      // /explore and /users
      .route("/", exploreRoutes(deps))
      .onError(onError)
      .notFound(notFound)
  );
}

export type AppType = ReturnType<typeof createApp>;
