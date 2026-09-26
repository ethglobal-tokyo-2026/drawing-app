import { gifts, gratitude, users, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { bytes32Schema, personSchema, toPerson, type StickerImages } from "../shapes.ts";
import {
  gratitudeSchema,
  loadStickers,
  stickerSchema,
  toGratitude,
  type Gratitude,
} from "../views.ts";
import { gunzipReplay, replayV1Schema } from "./replay.ts";

// The giver's side of gratitude: the pink tag's unseen feed, one combo with its replay, and marking a
// combo watched.

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

/** GET /api/gratitude/:giftId's answer. */
export const gratitudeWithReplaySchema = z.object({
  gratitude: gratitudeSchema,
  replay: replayV1Schema,
  giver: personSchema,
  receiver: personSchema,
});
export type GratitudeWithReplay = z.infer<typeof gratitudeWithReplaySchema>;

/** The pink tag's feed: gratitude on gifts the giver gave that they haven't watched, oldest first. */
export function unseenGratitude(
  db: Db,
  giverId: string,
  urls: (contentHash: string) => StickerImages,
): UnseenGratitude {
  const rows = db
    .select({ combo: gratitude, stickerId: gifts.stickerId, receiver: users })
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
    unseen: rows.map(({ combo, stickerId, receiver }) => {
      const sticker = stickersById.get(stickerId);
      if (!sticker) {
        throw new Error(`Gift ${combo.giftId}'s sticker ${stickerId} has no stickers row`);
      }
      return { gratitude: toGratitude(combo), sticker, receiver: toPerson(receiver) };
    }),
  };
}

/** A gift's gratitude and who gave the gift; undefined when nobody has sent gratitude for it. */
export const gratitudeWithGiver = (db: Db, giftId: string) =>
  db
    .select({ combo: gratitude, giverId: gifts.giverId })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .where(eq(gratitude.giftId, giftId))
    .get();

/** Marks gratitude watched by its giver at `now`. Watching it again keeps the first time. */
export function markSeen(db: Db, combo: typeof gratitude.$inferSelect, now: Date): Gratitude {
  if (combo.seenByGiverAt !== null) return toGratitude(combo);
  db.update(gratitude).set({ seenByGiverAt: now }).where(eq(gratitude.giftId, combo.giftId)).run();
  return toGratitude({ ...combo, seenByGiverAt: now });
}

/**
 * A gift's gratitude with its replay, and who gave and received the gift; null when nobody has
 * sent gratitude for it. Any signed-in person may read it.
 */
export function gratitudeWithReplay(db: Db, giftId: string): GratitudeWithReplay | null {
  const giverUsers = alias(users, "giver");
  const receiverUsers = alias(users, "receiver");
  const row = db
    .select({ combo: gratitude, giver: giverUsers, receiver: receiverUsers })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .innerJoin(giverUsers, eq(giverUsers.id, gifts.giverId))
    .innerJoin(receiverUsers, eq(receiverUsers.id, gifts.receiverId))
    .where(eq(gratitude.giftId, giftId))
    .get();
  if (!row) return null;
  return {
    gratitude: toGratitude(row.combo),
    replay: gunzipReplay(row.combo.replay),
    giver: toPerson(row.giver),
    receiver: toPerson(row.receiver),
  };
}
