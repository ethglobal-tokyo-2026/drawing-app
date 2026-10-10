import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertSticker, insertUser, refusal, type TestDb } from "../testDb.ts";
import { stickerPlacements } from "./index.ts";
import { MAX_LARGE_SCALE, MAX_SCALE } from "./limits.ts";

let db: TestDb;
let userId: string;
let stickerId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
  stickerId = insertSticker(db, userId);
  db.insert(stickerPlacements).values({ userId, stickerId }).run();
});

const place = (values: Partial<typeof stickerPlacements.$inferInsert>) =>
  db
    .update(stickerPlacements)
    .set(values)
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .run();

describe("sticker placements", () => {
  it("stores a placement whole or not at all", () => {
    expect(refusal(() => place({ onBoard: true, rotation: 0, z: 0 }))).toMatch(
      /sticker_placements_placement/,
    );
    expect(() =>
      place({ onBoard: true, x: 0.5, y: 0.5, scale: 0.5, rotation: 0, z: 0 }),
    ).not.toThrow();
  });

  it("stores the large layout's placement whole or not at all, beside the phone's", () => {
    expect(refusal(() => place({ largeOnBoard: true, largeRotation: 0, largeZ: 0 }))).toMatch(
      /sticker_placements_large_placement/,
    );
    expect(() =>
      place({
        largeOnBoard: false,
        largeX: 0.5,
        largeY: 0.5,
        largeScale: 0.5,
        largeRotation: 0,
        largeZ: 0,
      }),
    ).not.toThrow();
  });

  it("holds each layout's sticker size to its largest", () => {
    const phone = { onBoard: true, x: 0.5, y: 0.5, rotation: 0, z: 0 };
    expect(() => place({ ...phone, scale: MAX_SCALE })).not.toThrow();
    expect(refusal(() => place({ ...phone, scale: MAX_SCALE + 0.01 }))).toMatch(
      /sticker_placements_placement/,
    );
    const large = { largeOnBoard: true, largeX: 0.5, largeY: 0.5, largeRotation: 0, largeZ: 0 };
    expect(() => place({ ...large, largeScale: MAX_LARGE_SCALE })).not.toThrow();
    expect(refusal(() => place({ ...large, largeScale: MAX_LARGE_SCALE + 0.01 }))).toMatch(
      /sticker_placements_large_placement/,
    );
  });
});
