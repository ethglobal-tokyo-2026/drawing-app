import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { apiError, limitBody, validate } from "../errors.ts";
import {
  gratitudeWithGiver,
  gratitudeWithReplay,
  markGratitudeWatched,
  unseenGratitude,
} from "../gratitude/feed.ts";
import {
  MAX_GRATITUDE_BODY_BYTES,
  RECORD_REFUSAL_STATUS,
  recordGratitude,
  recordGratitudeSchema,
  replayInvalidHook,
} from "../gratitude/record.ts";
import type { AppEnv } from "../session.ts";
import { giftIdParam } from "../shapes.ts";

/**
 * Gratitude: the receiver records a Mini-game combo; the giver sees the combos they haven't watched,
 * watches one with its replay, and marks it watched.
 */
export const gratitudeRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post(
      "/",
      limitBody(MAX_GRATITUDE_BODY_BYTES),
      zValidator("json", recordGratitudeSchema, replayInvalidHook),
      (c) => {
        const recording = recordGratitude(deps, c.var.userId, c.req.valid("json"));
        if (recording.refusal !== null) {
          const { refusal, detail } = recording;
          return apiError(c, RECORD_REFUSAL_STATUS[refusal], refusal, detail);
        }
        const body = { gratitude: recording.gratitude };
        return recording.created ? c.json(body, 201) : c.json(body, 200);
      },
    )
    // Before /:giftId, which would take "unseen" for a gift id.
    .get("/unseen", (c) => c.json(unseenGratitude(deps.db, c.var.userId, deps.images.urls), 200))
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
