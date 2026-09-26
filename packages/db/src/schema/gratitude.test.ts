import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestDb,
  insertSticker,
  insertUser,
  newId,
  packGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { gifts, gratitude } from "./index.ts";
import { MAX_HITS } from "./limits.ts";

let db: TestDb;
let giftId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  const giver = insertUser(db);
  const receiver = insertUser(db);
  giftId = packGift(db, insertSticker(db, giver), giver, { escrowStatus: "pending" });
  db.update(gifts)
    .set({ status: "received", receiverId: receiver, receivedAt: new Date() })
    .where(eq(gifts.id, giftId))
    .run();
});

/** A combo of one tap that sends, at the first tier and no multiplier. */
const oneTap = { method: "tap", hits: 1, total: 10, peakMult: 1, peakTier: 0 } as const;

/** Records a combo for the received gift: one tap, with `values` over it. */
const record = (values: Partial<typeof gratitude.$inferInsert> = {}) =>
  db
    .insert(gratitude)
    .values({
      giftId,
      idempotencyKey: newId("combo"),
      ...oneTap,
      originalArtistGratitudeShare: 0,
      gameConfigVersion: "1",
      replay: Buffer.from("{}"),
      ...values,
    })
    .run();

describe("gratitude", () => {
  it("records one combo per received gift", () => {
    record();
    expect(refusal(() => record())).toMatch(/gratitude.gift_id/);
  });

  it("keeps a combo's hits within MAX_HITS", () => {
    expect(refusal(() => record({ hits: MAX_HITS + 1 }))).toMatch(/gratitude_hits/);
    expect(() => record({ hits: MAX_HITS })).not.toThrow();
  });

  it("keeps the Original Artist Gratitude Share within the total", () => {
    expect(refusal(() => record({ originalArtistGratitudeShare: oneTap.total + 1 }))).toMatch(
      /gratitude_original_artist_share/,
    );
  });
});
