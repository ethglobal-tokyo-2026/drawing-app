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

  it("gives an NSFW sticker its veiled image, and no other sticker one", () => {
    expect(() => insertSticker(db, artist, { nsfw: true })).not.toThrow();
    expect(refusal(() => insertSticker(db, artist, { nsfw: true, veiledHash: null }))).toMatch(
      /stickers_veiled/,
    );
    expect(refusal(() => insertSticker(db, artist, { veiledHash: bytes32("veil") }))).toMatch(
      /stickers_veiled/,
    );
  });

  it("sets a token ID only with the mint transaction that made it", () => {
    expect(refusal(() => insertSticker(db, artist, { tokenId: "1" }))).toMatch(/stickers_minted/);
    expect(() =>
      insertSticker(db, artist, { tokenId: "1", mintTxHash: bytes32("mint") }),
    ).not.toThrow();
  });
});
