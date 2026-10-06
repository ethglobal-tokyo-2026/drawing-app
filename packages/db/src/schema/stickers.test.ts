import { beforeEach, describe, expect, it } from "vitest";
import {
  bytes32,
  createTestDb,
  insertSticker,
  insertUser,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { MAX_TIME_USED_S } from "./limits.ts";

let db: TestDb;
let artist: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  artist = insertUser(db);
});

describe("stickers", () => {
  it("keeps time used within the drawing clock", () => {
    expect(() => insertSticker(db, artist, { timeUsed: MAX_TIME_USED_S })).not.toThrow();
    expect(refusal(() => insertSticker(db, artist, { timeUsed: MAX_TIME_USED_S + 1 }))).toMatch(
      /stickers_time_used/,
    );
  });

  it("has a veiled image exactly when it's NSFW", () => {
    expect(() => insertSticker(db, artist, { nsfw: true })).not.toThrow();
    expect(refusal(() => insertSticker(db, artist, { nsfw: true, veiledHash: null }))).toMatch(
      /stickers_veiled/,
    );
    expect(refusal(() => insertSticker(db, artist, { veiledHash: bytes32("veil") }))).toMatch(
      /stickers_veiled/,
    );
  });

  it("holds a minted sticker's Sui object ID as 0x and 64 hex digits", () => {
    expect(refusal(() => insertSticker(db, artist, { objectId: "0x1" }))).toMatch(
      /stickers_object_id/,
    );
    expect(() => insertSticker(db, artist, { objectId: bytes32("sticker") })).not.toThrow();
  });
});
