import { Hono } from "hono";
import { IMMUTABLE_MAX_AGE_S } from "../cacheControl.ts";
import type { AppDeps } from "../deps.ts";
import { apiError, limitBody, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { stickerViewer } from "../shapes.ts";
import { sealSticker } from "../stickers/seal.ts";
import { MAX_SEAL_BYTES, sealForm } from "../stickers/sealForm.ts";
import { stickerDetail, stickerIdParam } from "../stickers/stickerDetail.ts";
import { readTimelapse } from "../stickers/timelapse.ts";

/** Stickers: sealing, a sticker's detail with its Transfer Trail, and how it was drawn. */
export const stickerRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post("/", limitBody(MAX_SEAL_BYTES), validate("form", sealForm), async (c) => {
      const outcome = await sealSticker(deps, c.var.userId, c.req.valid("form"));
      if ("refused" in outcome) {
        const { status, error, detail } = outcome.refused;
        return apiError(c, status, error, detail);
      }
      return c.json(outcome.sealed, outcome.created ? 201 : 200);
    })
    .get("/:stickerId", validate("param", stickerIdParam), (c) => {
      const { stickerId } = c.req.valid("param");
      const detail = stickerDetail(deps.db, stickerId, stickerViewer(deps, c.var.userId));
      if (!detail) return apiError(c, 404, "sticker_not_found", `No sticker ${stickerId}`);
      return c.json(detail, 200);
    })
    .get("/:stickerId/timelapse", validate("param", stickerIdParam), (c) => {
      const { stickerId } = c.req.valid("param");
      const timelapse = readTimelapse(deps.db, stickerId, stickerViewer(deps, c.var.userId));
      if (timelapse === "sticker_not_found") {
        return apiError(c, 404, "sticker_not_found", `No sticker ${stickerId}`);
      }
      if (timelapse === "nsfw_not_opted_in") {
        return apiError(
          c,
          403,
          "nsfw_not_opted_in",
          `Sticker ${stickerId} is an NSFW sticker: its timelapse is only for the NSFW opt-in`,
        );
      }
      if (timelapse === "timelapse_not_found") {
        return apiError(
          c,
          404,
          "timelapse_not_found",
          `Sticker ${stickerId} was sealed without one`,
        );
      }
      // A sticker's timelapse never changes once it's sealed.
      c.header("Cache-Control", `private, max-age=${IMMUTABLE_MAX_AGE_S}, immutable`);
      return c.json(timelapse, 200);
    });
