import { stickerPlacements } from "@drawing-app/db";
import {
  insertGratitude,
  insertSticker,
  packGift,
  receiveGift,
  type TestDb,
} from "@drawing-app/db/testing";

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

/** `giverId` gives `stickerId` to `receiverId`: packed, then received. Answers the received gift. */
export const giveSticker = (
  db: TestDb,
  stickerId: string,
  giverId: string,
  receiverId: string,
  receivedAt?: Date,
) => receiveGift(db, packGift(db, stickerId, giverId), receiverId, receivedAt);

/** `giverId` gives `stickerId` to `receiverId`, who sends gratitude as `combo`. Answers the gratitude. */
export const sendGratitude = (
  db: TestDb,
  stickerId: string,
  giverId: string,
  receiverId: string,
  combo: Parameters<typeof insertGratitude>[2] = {},
) => insertGratitude(db, giveSticker(db, stickerId, giverId, receiverId).id, combo);

/** A spot on the board, as a drag leaves it. */
export const SPOT = { onBoard: true, x: 0.25, y: 0.75, scale: 0.3, rotation: -4, z: 2 };

/** A combo on a gift its Original Artist didn't give: their share comes out of the giver's part. */
export const SHARED_TAP = { method: "tap", total: 100, originalArtistGratitudeShare: 20 } as const;
/** More than either part of SHARED_TAP, less than both together. */
export const OWN_TAP = { method: "tap", total: 90 } as const;
/** Two combos' hits, the second more than the first. */
export const FEW_HITS = 12;
export const MORE_HITS = 64;
