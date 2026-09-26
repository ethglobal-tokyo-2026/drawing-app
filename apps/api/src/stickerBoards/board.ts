import { gifts, stickerPlacements, stickers, users, type Db } from "@drawing-app/db";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import type { ImageStore } from "../deps.ts";
import { isoTimeSchema, personSchema, toIsoTime, toPerson } from "../shapes.ts";
import { simplifiedOutline } from "../stickers/outline.ts";
import {
  giftSchema,
  placementSchema,
  stickerPlacementSchema,
  stickerSchema,
  toSticker,
  toStickerPlacement,
} from "../views.ts";

/** `me` in a board's path: the signed-in person. */
export const ME = "me";

/** The most sticker ids one seen report marks. */
export const MAX_SEEN_BATCH = 500;

/** A gift is open while it's in the bag or on its way. */
const openGiftStatusSchema = giftSchema.shape.status.extract(["packed", "sent"]);

export const boardStickerSchema = stickerPlacementSchema.extend({
  /** Its outline simplified, which is all a sticker sheet packs by; the sticker's detail has it whole. */
  sticker: stickerSchema,
  /** False: given away; off the board, and an empty spot in the sticker tray. */
  held: z.boolean(),
  /** Set when `held` is false: who received it, for the giver's notice. */
  givenTo: z.object({ receiver: personSchema, receivedAt: isoTimeSchema }).nullable(),
  /** `for`: who the giver picked in the app, or who first opened its link; null through LINE alone. */
  openGift: z
    .object({ id: giftSchema.shape.id, status: openGiftStatusSchema, for: personSchema.nullable() })
    .nullable(),
});
export type BoardSticker = z.infer<typeof boardStickerSchema>;

export const stickerBoardSchema = z.object({
  owner: personSchema,
  boardStickers: z.array(boardStickerSchema),
});
export type StickerBoard = z.infer<typeof stickerBoardSchema>;

export const seenRequestSchema = z.object({
  stickerIds: z.array(stickerPlacementSchema.shape.stickerId.min(1)).min(1).max(MAX_SEEN_BATCH),
});

/** Whose board a path names: `me`, or a user id. Undefined when there's no such person. */
export const findBoardOwner = (db: Db, userId: string, viewerId: string) =>
  db
    .select()
    .from(users)
    .where(eq(users.id, userId === ME ? viewerId : userId))
    .get();

/** The owner's gifts in the bag or on their way, by sticker. */
function openGiftsOf(db: Db, ownerId: string) {
  const rows = db
    .select({ id: gifts.id, stickerId: gifts.stickerId, status: gifts.status, for: users })
    .from(gifts)
    .leftJoin(users, eq(users.id, gifts.forUserId))
    .where(and(eq(gifts.giverId, ownerId), inArray(gifts.status, openGiftStatusSchema.options)))
    .all();
  const open = new Map<string, BoardSticker["openGift"]>();
  for (const { id, stickerId, status, for: forUser } of rows) {
    const openStatus = openGiftStatusSchema.safeParse(status);
    if (openStatus.success) {
      open.set(stickerId, {
        id,
        status: openStatus.data,
        for: forUser ? toPerson(forUser) : null,
      });
    }
  }
  return open;
}

/** Who received each of `stickerIds` from the owner, the last time it left them. */
function givenToOf(db: Db, ownerId: string, stickerIds: string[]) {
  const givenTo = new Map<string, BoardSticker["givenTo"]>();
  if (stickerIds.length === 0) return givenTo;
  const rows = db
    .select({ stickerId: gifts.stickerId, receivedAt: gifts.receivedAt, receiver: users })
    .from(gifts)
    .innerJoin(users, eq(users.id, gifts.receiverId))
    .where(
      and(
        eq(gifts.giverId, ownerId),
        eq(gifts.status, "received"),
        inArray(gifts.stickerId, stickerIds),
      ),
    )
    .orderBy(asc(gifts.receivedAt))
    .all();
  // Oldest first, so a sticker given more than once keeps its latest receiver.
  for (const { stickerId, receivedAt, receiver } of rows) {
    if (receivedAt) {
      givenTo.set(stickerId, { receiver: toPerson(receiver), receivedAt: toIsoTime(receivedAt) });
    }
  }
  return givenTo;
}

/**
 * A Sticker Board in sticker tray order. Your own lists every sticker that reached you, with NEW and
 * your open gifts; anyone else's lists only the stickers on it, since the bag and NEW are the owner's.
 */
export function loadStickerBoard(
  db: Db,
  owner: typeof users.$inferSelect,
  viewerId: string,
  urls: ImageStore["urls"],
): StickerBoard {
  const own = owner.id === viewerId;
  const rows = db
    .select({ placement: stickerPlacements, sticker: stickers, artist: users })
    .from(stickerPlacements)
    .innerJoin(stickers, eq(stickers.id, stickerPlacements.stickerId))
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(
      and(
        eq(stickerPlacements.userId, owner.id),
        own ? undefined : eq(stickerPlacements.onBoard, true),
      ),
    )
    .orderBy(asc(stickerPlacements.createdAt), asc(stickerPlacements.stickerId))
    .all();
  const openGifts = own ? openGiftsOf(db, owner.id) : new Map<string, BoardSticker["openGift"]>();
  const givenAway = rows.filter(({ sticker }) => sticker.ownerId !== owner.id);
  const givenTo = givenToOf(
    db,
    owner.id,
    givenAway.map(({ sticker }) => sticker.id),
  );
  return {
    owner: toPerson(owner),
    boardStickers: rows.map(({ placement, sticker, artist }) => {
      const stickerPlacement = toStickerPlacement(placement);
      const held = sticker.ownerId === owner.id;
      return {
        ...stickerPlacement,
        seenAt: own ? stickerPlacement.seenAt : null,
        sticker: {
          ...toSticker(sticker, artist, urls),
          outline: simplifiedOutline(sticker.outline, sticker.width, sticker.height),
        },
        held,
        givenTo: held ? null : (givenTo.get(sticker.id) ?? null),
        openGift: openGifts.get(sticker.id) ?? null,
      };
    }),
  };
}

/** Saves all six values of the person's placement of a sticker. Undefined when it never reached them. */
export const savePlacement = (
  db: Db,
  userId: string,
  stickerId: string,
  placement: z.infer<typeof placementSchema>,
) =>
  db
    .update(stickerPlacements)
    .set(placement)
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .returning()
    .get();

/** Clears NEW on the person's stickers among `stickerIds`, keeping the time each was first seen. */
export function markSeen(db: Db, userId: string, stickerIds: string[], now: Date) {
  db.update(stickerPlacements)
    .set({ seenAt: now })
    .where(
      and(
        eq(stickerPlacements.userId, userId),
        inArray(stickerPlacements.stickerId, stickerIds),
        isNull(stickerPlacements.seenAt),
      ),
    )
    .run();
}
