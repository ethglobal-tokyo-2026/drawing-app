import { gifts, gratitude, stickerPlacements, stickers } from "@drawing-app/db";
import { insertSticker, newId, type TestDb } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { gzipSync } from "node:zlib";

/** Inserts a sticker the way sealing leaves it: held by its Original Artist, in their sticker tray. */
export function insertSealedSticker(
  db: TestDb,
  artistId: string,
  values: Parameters<typeof insertSticker>[2] = {},
): string {
  const stickerId = insertSticker(db, artistId, values);
  db.insert(stickerPlacements).values({ userId: artistId, stickerId }).run();
  return stickerId;
}

/** Marks a gift received by `receiverId` with its claim landed, and hands them the sticker. */
export function receiveGift(
  db: TestDb,
  giftId: string,
  receiverId: string,
  receivedAt = new Date(),
) {
  const gift = db
    .update(gifts)
    .set({ status: "received", receiverId, receivedAt, escrowStatus: "claimed" })
    .where(eq(gifts.id, giftId))
    .returning()
    .get();
  if (!gift) throw new Error(`There's no gift ${giftId} to receive`);
  db.update(stickers).set({ ownerId: receiverId }).where(eq(stickers.id, gift.stickerId)).run();
  db.insert(stickerPlacements)
    .values({ userId: receiverId, stickerId: gift.stickerId })
    .onConflictDoNothing()
    .run();
  return gift;
}

/** The smallest combo: one tap that sends. */
export const ONE_TAP = { method: "tap", hits: 1, total: 10, peakMult: 1, peakTier: 0 } as const;

/**
 * Records gratitude for a received gift: ONE_TAP, with `values` over it. Its replay is a placeholder,
 * so a test that reads the replay back records through POST /api/gratitude instead.
 */
export function insertGratitude(
  db: TestDb,
  giftId: string,
  values: Partial<typeof gratitude.$inferInsert> = {},
) {
  const row = db
    .insert(gratitude)
    .values({
      giftId,
      idempotencyKey: newId("combo"),
      ...ONE_TAP,
      originalArtistGratitudeShare: 0,
      gameConfigVersion: "test",
      replay: gzipSync(JSON.stringify({ v: 1 })),
      ...values,
    })
    .returning()
    .get();
  if (!row) throw new Error(`Gratitude for gift ${giftId} wasn't recorded`);
  return row;
}
