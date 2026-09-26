import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertSticker, insertUser, refusal, type TestDb } from "../testDb.ts";
import { stickerPlacements } from "./index.ts";

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
    expect(refusal(() => place({ onBoard: true }))).toMatch(/sticker_placements_placement/);
    expect(() =>
      place({ onBoard: true, x: 0.5, y: 0.5, scale: 0.5, rotation: 0, z: 0 }),
    ).not.toThrow();
  });
});
