import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import {
  personSchema,
  placementSchema,
  stickerPlacementSchema,
  stickerViewer,
  toStickerPlacement,
} from "../shapes.ts";
import {
  findBoardOwner,
  loadStickerBoard,
  markStickersSeen,
  newStickerCount,
  savePlacement,
  seenRequestSchema,
} from "../stickerBoards/board.ts";
import { loadUserStats } from "../stickerBoards/userStats.ts";

const ownerParamSchema = z.object({ userId: personSchema.shape.id });
const placementParamSchema = z.object({ stickerId: stickerPlacementSchema.shape.stickerId });

/** Sticker Boards, your sticker tray and the stat board's User Stats. */
export const stickerBoardRoutes = ({ db, clock, images }: AppDeps) =>
  new Hono<AppEnv>()
    .get("/:userId", validate("param", ownerParamSchema), (c) => {
      const { userId } = c.req.valid("param");
      const owner = findBoardOwner(db, userId, c.var.userId);
      if (!owner) return apiError(c, 404, "user_not_found", `There's no person ${userId}`);
      const viewer = stickerViewer({ db, images }, c.var.userId);
      return c.json(loadStickerBoard(db, owner, c.var.userId, viewer), 200);
    })
    .get("/:userId/user-stats", validate("param", ownerParamSchema), (c) => {
      const { userId } = c.req.valid("param");
      const owner = findBoardOwner(db, userId, c.var.userId);
      if (!owner) return apiError(c, 404, "user_not_found", `There's no person ${userId}`);
      return c.json({ userStats: loadUserStats(db, owner, clock.now()) }, 200);
    })
    .patch(
      "/me/sticker-placements/:stickerId",
      validate("param", placementParamSchema),
      validate("json", placementSchema),
      (c) => {
        const { stickerId } = c.req.valid("param");
        const row = savePlacement(db, c.var.userId, stickerId, c.req.valid("json"));
        if (!row) {
          return apiError(
            c,
            404,
            "sticker_placement_not_found",
            `Sticker ${stickerId} never reached you`,
          );
        }
        return c.json({ stickerPlacement: toStickerPlacement(row) }, 200);
      },
    )
    .post("/me/sticker-tray/seen", validate("json", seenRequestSchema), (c) => {
      markStickersSeen(db, c.var.userId, c.req.valid("json").stickerIds, clock.now());
      return c.json({ newStickerCount: newStickerCount(db, c.var.userId) }, 200);
    });
