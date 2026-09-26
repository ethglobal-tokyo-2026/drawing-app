import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { sealSticker } from "../stickers/seal.ts";
import { MAX_SEAL_BYTES, sealForm } from "../stickers/sealForm.ts";
import { stickerDetail, stickerIdParam } from "../stickers/stickerDetail.ts";

/** Stickers: sealing, and a sticker's detail with its Transfer Trail. */
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
    });
