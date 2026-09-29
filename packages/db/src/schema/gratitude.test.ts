import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestDb,
  insertGratitude,
  insertSticker,
  insertUser,
  ONE_TAP,
  packGift,
  receiveGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { MAX_HITS } from "./limits.ts";

let db: TestDb;
let giftId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  const giver = insertUser(db);
  const packed = packGift(db, insertSticker(db, giver), giver);
  giftId = receiveGift(db, packed, insertUser(db)).id;
});

describe("gratitude", () => {
  it("records one combo per received gift", () => {
    insertGratitude(db, giftId);
    expect(refusal(() => insertGratitude(db, giftId))).toMatch(/gratitude.gift_id/);
  });

  it("keeps a combo's hits within MAX_HITS", () => {
    expect(refusal(() => insertGratitude(db, giftId, { hits: MAX_HITS + 1 }))).toMatch(
      /gratitude_hits/,
    );
    expect(() => insertGratitude(db, giftId, { hits: MAX_HITS })).not.toThrow();
  });

  it("keeps the Original Artist Gratitude Share within the total", () => {
    const share = { originalArtistGratitudeShare: ONE_TAP.total + 1 };
    expect(refusal(() => insertGratitude(db, giftId, share))).toMatch(
      /gratitude_original_artist_share/,
    );
  });
});
