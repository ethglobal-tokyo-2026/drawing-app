import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, refused, validate } from "../errors.ts";
import { gratitudeEvents, gratitudeEventsQuerySchema } from "../gratitude/events.ts";
import {
  gratitudeWithGiver,
  gratitudeWithReplay,
  markGratitudeWatched,
  unseenGratitude,
} from "../gratitude/feed.ts";
import { recordGratitude, recordGratitudeSchema, replayInvalidHook } from "../gratitude/record.ts";
import type { AppEnv } from "../session.ts";
import { giftIdParam, stickerViewer } from "../shapes.ts";

/**
 * Gratitude: the receiver records a Mini-game combo; the giver sees the combos they haven't watched,
 * watches one with its replay, and marks it watched; and you list the gratitude you've received.
 */
export const gratitudeRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    // The app-wide body limit holds a combo, which the Mini-game sends with a keepalive request.
    .post("/", zValidator("json", recordGratitudeSchema, replayInvalidHook), (c) => {
      const recording = recordGratitude(deps, c.var.userId, c.req.valid("json"));
      if (recording.refusal !== null) return refused(c, recording);
      const body = { gratitude: recording.gratitude };
      return recording.created ? c.json(body, 201) : c.json(body, 200);
    })
    // Before /:giftId, which would take "unseen" or "events" for a gift id.
    .get("/unseen", (c) => {
      const viewer = stickerViewer(deps, c.var.userId);
      return c.json(unseenGratitude(deps.db, c.var.userId, viewer), 200);
    })
    .get("/events", validate("query", gratitudeEventsQuerySchema), (c) => {
      const viewer = stickerViewer(deps, c.var.userId);
      const { before } = c.req.valid("query");
      return c.json(gratitudeEvents(deps.db, c.var.userId, viewer, before), 200);
    })
    .get("/:giftId", validate("param", giftIdParam), (c) => {
      const { giftId } = c.req.valid("param");
      const found = gratitudeWithReplay(deps.db, giftId);
      if (!found) return apiError(c, 404, "gratitude_not_found", `No gratitude for gift ${giftId}`);
      return c.json(found, 200);
    })
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
      return c.json(
        { gratitude: markGratitudeWatched(deps.db, found.combo, deps.clock.now()) },
        200,
      );
    });
