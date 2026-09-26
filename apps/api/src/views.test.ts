import { gratitude, stickerPlacements } from "@drawing-app/db";
import { createTestDb, insertUser, packGift, type TestDb } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeImageStore } from "./testing/fakes.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "./testing/rows.ts";
import {
  giftSchema,
  gratitudeSchema,
  loadStickers,
  newStickerCount,
  stickerPlacementSchema,
  stickerSchema,
  toGift,
  toGratitude,
  toStickerPlacement,
  unseenGratitudeCount,
} from "./views.ts";

/** The tests' CDN. */
const { urls } = fakeImageStore();
/** A spot on the board, as a drag leaves it. */
const SPOT = { onBoard: true, x: 0.25, y: 0.75, scale: 0.3, rotation: -4, z: 2 };

let db: TestDb;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

const placementOf = (userId: string, stickerId: string) =>
  and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId));

/** Packs a new sticker of `giverId`'s as a gift, and has `receiverId` receive it. */
function receivedGift(giverId: string, receiverId: string) {
  return receiveGift(db, packGift(db, insertSealedSticker(db, giverId), giverId), receiverId);
}

describe("views", () => {
  it("show a sticker with its Original Artist, and its images named by its content hash", () => {
    const artistId = insertUser(db, { handle: "alice" });
    const stickerId = insertSealedSticker(db, artistId);
    const sticker = stickerSchema.parse(loadStickers(db, [stickerId], urls).get(stickerId));
    expect(sticker.artist).toMatchObject({ id: artistId, handle: "alice" });
    expect(sticker.images).toEqual(urls(sticker.contentHash));
    expect(sticker.images.png).toContain(`${sticker.contentHash}.png`);
  });

  it("load only the stickers asked for", () => {
    const artistId = insertUser(db);
    const asked = [insertSealedSticker(db, artistId), insertSealedSticker(db, artistId)];
    insertSealedSticker(db, artistId);
    expect([...loadStickers(db, asked, urls).keys()].sort()).toEqual([...asked].sort());
  });

  it("show a placement as null until the board places it, then whole", () => {
    const userId = insertUser(db);
    const stickerId = insertSealedSticker(db, userId);
    const read = () => {
      const row = db.select().from(stickerPlacements).where(placementOf(userId, stickerId)).get();
      if (!row) throw new Error("Sealing left no sticker placement");
      return stickerPlacementSchema.parse(toStickerPlacement(row));
    };
    expect(read().placement).toBeNull();
    db.update(stickerPlacements).set(SPOT).where(placementOf(userId, stickerId)).run();
    expect(read().placement).toEqual(SPOT);
  });

  it("show gifts and gratitude with the contract's names for their times", () => {
    const giverId = insertUser(db);
    const receiverId = insertUser(db);
    const gift = receivedGift(giverId, receiverId);
    expect(giftSchema.parse(toGift(gift))).toMatchObject({
      status: "received",
      receiverId,
      packedAt: gift.createdAt.toISOString(),
      receivedAt: gift.receivedAt?.toISOString(),
    });
    const thanks = insertGratitude(db, gift.id);
    expect(gratitudeSchema.parse(toGratitude(thanks))).toMatchObject({
      giftId: gift.id,
      recordedAt: thanks.createdAt.toISOString(),
      seenByGiverAt: null,
    });
  });

  it("count NEW as the stickers you hold that you haven't seen in the open tray", () => {
    const me = insertUser(db);
    const friend = insertUser(db);
    const unseen = [insertSealedSticker(db, me), insertSealedSticker(db, me)];
    const seen = insertSealedSticker(db, me);
    db.update(stickerPlacements).set({ seenAt: new Date() }).where(placementOf(me, seen)).run();
    const given = receivedGift(me, friend);
    expect(newStickerCount(db, me)).toBe(unseen.length);
    expect(newStickerCount(db, friend)).toBe([given].length);
  });

  it("count the pink tag as gratitude on gifts you gave that you haven't watched", () => {
    const giverId = insertUser(db);
    const receiverId = insertUser(db);
    const thanked = [receivedGift(giverId, receiverId), receivedGift(giverId, receiverId)];
    for (const gift of thanked) insertGratitude(db, gift.id);
    expect(unseenGratitudeCount(db, giverId)).toBe(thanked.length);
    expect(unseenGratitudeCount(db, receiverId)).toBe(0);
    const [watched] = thanked;
    db.update(gratitude)
      .set({ seenByGiverAt: new Date() })
      .where(eq(gratitude.giftId, watched.id))
      .run();
    expect(unseenGratitudeCount(db, giverId)).toBe(thanked.length - 1);
  });
});
