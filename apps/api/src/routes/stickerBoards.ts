import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { failureCause } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import {
  personSchema,
  placementSchema,
  stickerPlacementSchema,
  stickerViewer,
  suiIdSchema,
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

/**
 * GET /api/sticker-boards/:userId/sui-address's answer: null while the person has no wallet, and
 * once their account is deleted.
 */
export const suiAddressResponseSchema = z.object({ suiAddress: suiIdSchema.nullable() });

/** Sticker Boards, your sticker tray, and the stat board's User Stats and Sui address. */
export const stickerBoardRoutes = ({ db, clock, images, suiWallets }: AppDeps) =>
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
    // Apart from the stats, so they never wait on Privy. Null while the person has no wallet.
    .get("/:userId/sui-address", validate("param", ownerParamSchema), async (c) => {
      const { userId } = c.req.valid("param");
      const owner = findBoardOwner(db, userId, c.var.userId);
      if (!owner) return apiError(c, 404, "user_not_found", `There's no person ${userId}`);
      // A deleted account's row keeps its wallet, for its stickers, but its board no longer shows it.
      if (owner.deletedAt) return c.json({ suiAddress: null }, 200);
      if (owner.suiAddress) return c.json({ suiAddress: owner.suiAddress }, 200);
      try {
        return c.json({ suiAddress: await suiWallets.addressFor(owner.id) }, 200);
      } catch (error) {
        return apiError(c, 502, "wallet_lookup_failed", `Privy: ${failureCause(error)}`);
      }
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
