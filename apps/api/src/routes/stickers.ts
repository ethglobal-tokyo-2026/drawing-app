import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { sealSticker } from "../stickers/seal.ts";
import { MAX_SEAL_BYTES, sealForm } from "../stickers/sealForm.ts";
import { stickerDetail, stickerIdParam } from "../stickers/stickerDetail.ts";
import { readTimelapse } from "../stickers/timelapse.ts";

/** A sticker's timelapse never changes once it's sealed. */
const TIMELAPSE_MAX_AGE_S = 365 * 24 * 60 * 60;

/** Stickers: sealing, a sticker's detail with its Transfer Trail, and how it was drawn. */
export const stickerRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post(
      "/",
      // The contract has no 413: an oversized body is invalid_request, in ErrorBody JSON.
      bodyLimit({
        maxSize: MAX_SEAL_BYTES,
        onError: (c) => apiError(c, 400, "invalid_request", `body: over ${MAX_SEAL_BYTES} bytes`),
      }),
      validate("form", sealForm),
      async (c) => {
        const outcome = await sealSticker(deps, c.var.userId, c.req.valid("form"));
        if ("refused" in outcome) {
          const { status, error, detail } = outcome.refused;
          return apiError(c, status, error, detail);
        }
        return c.json(outcome.sealed, outcome.created ? 201 : 200);
      },
    )
    .get("/:stickerId", validate("param", stickerIdParam), (c) => {
      const { stickerId } = c.req.valid("param");
      const detail = stickerDetail(deps.db, stickerId, deps.images.urls);
      if (!detail) return apiError(c, 404, "sticker_not_found", `No sticker ${stickerId}`);
      return c.json(detail, 200);
    })
    .get("/:stickerId/timelapse", validate("param", stickerIdParam), (c) => {
      const { stickerId } = c.req.valid("param");
      const timelapse = readTimelapse(deps.db, stickerId);
      if (timelapse === "sticker_not_found") {
        return apiError(c, 404, "sticker_not_found", `No sticker ${stickerId}`);
      }
      if (timelapse === "timelapse_not_found") {
        return apiError(
          c,
          404,
          "timelapse_not_found",
          `Sticker ${stickerId} was sealed without one`,
        );
      }
      c.header("Cache-Control", `private, max-age=${TIMELAPSE_MAX_AGE_S}, immutable`);
      return c.json(timelapse, 200);
    });
