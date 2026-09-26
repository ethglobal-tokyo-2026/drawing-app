import { gifts, gratitude, users, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { bytes32Schema, personSchema, toPerson, type StickerImages } from "../shapes.ts";
import {
  gratitudeSchema,
  loadStickers,
  stickerSchema,
  toGratitude,
  type Gratitude,
} from "../views.ts";

// The giver's side of gratitude: the pink tag's unseen feed, and marking a combo watched.

/** A gift ID that isn't 0x and 64 lowercase hex digits is invalid_request. */
export const giftIdParam = z.object({ giftId: bytes32Schema });

/** GET /api/gratitude/unseen's answer. */
export const unseenGratitudeSchema = z.object({
  /** Oldest first. */
  unseen: z.array(
    z.object({ gratitude: gratitudeSchema, sticker: stickerSchema, receiver: personSchema }),
  ),
});
export type UnseenGratitude = z.infer<typeof unseenGratitudeSchema>;

/** POST /api/gratitude/:giftId/seen's answer. */
export const seenGratitudeSchema = z.object({ gratitude: gratitudeSchema });

/** The pink tag's feed: gratitude on gifts the giver gave that they haven't watched, oldest first. */
export function unseenGratitude(
  db: Db,
  giverId: string,
  urls: (contentHash: string) => StickerImages,
): UnseenGratitude {
  const rows = db
    .select({ thanks: gratitude, stickerId: gifts.stickerId, receiver: users })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .innerJoin(users, eq(users.id, gifts.receiverId))
    .where(and(eq(gifts.giverId, giverId), isNull(gratitude.seenByGiverAt)))
    // The gift id breaks ties, so combos recorded in the same millisecond keep one order.
    .orderBy(asc(gratitude.createdAt), asc(gratitude.giftId))
    .all();
  const stickersById = loadStickers(
    db,
    rows.map(({ stickerId }) => stickerId),
    urls,
  );
  return {
    unseen: rows.map(({ thanks, stickerId, receiver }) => {
      const sticker = stickersById.get(stickerId);
      if (!sticker) {
        throw new Error(`Gift ${thanks.giftId}'s sticker ${stickerId} has no stickers row`);
      }
      return { gratitude: toGratitude(thanks), sticker, receiver: toPerson(receiver) };
    }),
  };
}

/** A gift's gratitude and who gave the gift; undefined when nobody has thanked it. */
export const gratitudeWithGiver = (db: Db, giftId: string) =>
  db
    .select({ thanks: gratitude, giverId: gifts.giverId })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .where(eq(gratitude.giftId, giftId))
    .get();

/** Marks gratitude watched by its giver at `now`. Watching it again keeps the first time. */
export function markSeen(db: Db, thanks: typeof gratitude.$inferSelect, now: Date): Gratitude {
  if (thanks.seenByGiverAt !== null) return toGratitude(thanks);
  db.update(gratitude).set({ seenByGiverAt: now }).where(eq(gratitude.giftId, thanks.giftId)).run();
  return toGratitude({ ...thanks, seenByGiverAt: now });
}
