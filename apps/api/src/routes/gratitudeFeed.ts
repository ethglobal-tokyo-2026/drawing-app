import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import { giftIdParam, gratitudeWithGiver, markSeen, unseenGratitude } from "../gratitude/feed.ts";
import type { AppEnv } from "../session.ts";

/** The giver's side of gratitude: unseen combos, one combo with its replay, and marking one watched. */
export const gratitudeFeedRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .get("/unseen", (c) => c.json(unseenGratitude(deps.db, c.var.userId, deps.images.urls), 200))
    .post("/:giftId/seen", validate("param", giftIdParam), (c) => {
      const { giftId } = c.req.valid("param");
      const found = gratitudeWithGiver(deps.db, giftId);
      if (!found) return apiError(c, 404, "gratitude_not_found", `No gratitude for gift ${giftId}`);
      if (found.giverId !== c.var.userId) {
        return apiError(
          c,
          403,
          "not_giver",
          `Only gift ${giftId}'s giver marks its gratitude watched`,
        );
      }
      return c.json({ gratitude: markSeen(deps.db, found.thanks, deps.clock.now()) }, 200);
    });
