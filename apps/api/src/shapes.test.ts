import { stickerPlacements, users } from "@drawing-app/db";
import { createTestDb, insertGratitude, insertUser, type TestDb } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  giftSchema,
  gratitudeSchema,
  largeColumns,
  loadStickers,
  meSchema,
  personSchema,
  stickerPlacementSchema,
  stickerSchema,
  stickerViewer,
  toGift,
  toGratitude,
  toMe,
  toPerson,
  toStickerPlacement,
} from "./shapes.ts";
import { fakeImageStore } from "./testing/fakes.ts";
import { giveSticker, insertSealedSticker, LARGE_SPOT, SPOT } from "./testing/rows.ts";

/** The tests' CDN. */
const images = fakeImageStore();

let db: TestDb;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

/** Inserts a person and reads back their whole row. */
const userRow = (values: Parameters<typeof insertUser>[1] = {}) => {
  const id = insertUser(db, values);
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) throw new Error(`User ${id} wasn't inserted`);
  return row;
};

const placementOf = (userId: string, stickerId: string) =>
  and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId));

describe("shapes", () => {
  it("show other people only a person's public columns", () => {
    const row = userRow({ suiAddress: `0x${"a".repeat(64)}` });
    expect(Object.keys(toPerson(row)).sort()).toEqual(Object.keys(personSchema.shape).sort());
  });

  it("send you as Me, needing a handle until you have one", () => {
    const counts = { newStickerCount: 2, unseenGratitudeCount: 1 };
    expect(meSchema.parse(toMe(userRow(), counts)).needsHandle).toBe(true);
    expect(meSchema.parse(toMe(userRow({ handle: "alice" }), counts)).needsHandle).toBe(false);
  });

  it("show a sticker with its Original Artist, and its images named by its content hash", () => {
    const artistId = insertUser(db, { handle: "alice" });
    const stickerId = insertSealedSticker(db, artistId);
    const viewer = stickerViewer({ db, images }, artistId);
    const sticker = stickerSchema.parse(loadStickers(db, [stickerId], viewer).get(stickerId));
    expect(sticker.artist).toMatchObject({ id: artistId, handle: "alice" });
    expect(sticker.images).toEqual(images.urls(sticker.contentHash));
    expect(sticker.images.png).toContain(`${sticker.contentHash}.png`);
  });

  it("load only the stickers asked for", () => {
    const artistId = insertUser(db);
    const asked = [insertSealedSticker(db, artistId), insertSealedSticker(db, artistId)];
    insertSealedSticker(db, artistId);
    const viewer = stickerViewer({ db, images }, artistId);
    expect([...loadStickers(db, asked, viewer).keys()].sort()).toEqual([...asked].sort());
  });

  it("show each layout's placement as null until it's placed there, then whole", () => {
    const userId = insertUser(db);
    const stickerId = insertSealedSticker(db, userId);
    const read = () => {
      const row = db.select().from(stickerPlacements).where(placementOf(userId, stickerId)).get();
      if (!row) throw new Error("Sealing left no sticker placement");
      return stickerPlacementSchema.parse(toStickerPlacement(row));
    };
    expect(read()).toMatchObject({ placement: null, largePlacement: null });
    db.update(stickerPlacements).set(SPOT).where(placementOf(userId, stickerId)).run();
    expect(read()).toMatchObject({ placement: SPOT, largePlacement: null });
    db.update(stickerPlacements)
      .set(largeColumns(LARGE_SPOT))
      .where(placementOf(userId, stickerId))
      .run();
    expect(read()).toMatchObject({ placement: SPOT, largePlacement: LARGE_SPOT });
  });

  it("show gifts and gratitude with the contract's names for their times", () => {
    const giverId = insertUser(db);
    const receiverId = insertUser(db);
    const gift = giveSticker(db, insertSealedSticker(db, giverId), giverId, receiverId);
    expect(giftSchema.parse(toGift(gift))).toMatchObject({
      status: "received",
      receiverId,
      packedAt: gift.createdAt.toISOString(),
      receivedAt: gift.receivedAt?.toISOString(),
    });
    const combo = insertGratitude(db, gift.id);
    expect(gratitudeSchema.parse(toGratitude(combo))).toMatchObject({
      giftId: gift.id,
      recordedAt: combo.createdAt.toISOString(),
      seenByGiverAt: null,
    });
  });
});
