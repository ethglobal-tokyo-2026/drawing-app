import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bytes32,
  createTestDb,
  insertSticker,
  insertUser,
  packGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { gifts } from "./index.ts";
import { GIFT_EXPIRY_MS } from "./limits.ts";

let db: TestDb;
let giver: string;
let receiver: string;
let sticker: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  giver = insertUser(db);
  receiver = insertUser(db);
  sticker = insertSticker(db, giver);
});

const update = (id: string, values: Partial<typeof gifts.$inferInsert>) =>
  db.update(gifts).set(values).where(eq(gifts.id, id)).run();
const deposited = { escrowStatus: "pending" } as const;
const sent = () => ({ status: "sent", sentAt: new Date() }) as const;
const received = (by: string) =>
  ({ status: "received", receiverId: by, receivedAt: new Date() }) as const;
const takenOut = () => ({ status: "taken_out", takenOutAt: new Date() }) as const;

describe("gifts", () => {
  it("is sent only once its deposit has landed", () => {
    const id = packGift(db, sticker, giver);
    expect(refusal(() => update(id, sent()))).toMatch(/gifts_status_escrow/);
    update(id, deposited);
    expect(() => update(id, sent())).not.toThrow();
  });

  it("keeps each status's dates with it", () => {
    const id = packGift(db, sticker, giver, deposited);
    expect(refusal(() => update(id, { status: "sent" }))).toMatch(/gifts_status_dates/);
    update(id, received(receiver));
    expect(refusal(() => update(id, takenOut()))).toMatch(/gifts_status_dates/);
  });

  it("can be taken back after it's sent", () => {
    const id = packGift(db, sticker, giver, { ...deposited, ...sent() });
    expect(() => update(id, takenOut())).not.toThrow();
  });

  it("gives a sticker one gift at a time, until the escrow lets it go", () => {
    const first = packGift(db, sticker, giver, deposited);
    expect(refusal(() => packGift(db, sticker, giver))).toMatch(/gifts.sticker_id/);
    update(first, takenOut());
    expect(refusal(() => packGift(db, sticker, giver))).toMatch(/gifts.sticker_id/);
    update(first, { escrowStatus: "rejected", rejectTxHash: bytes32("reject") });
    expect(() => packGift(db, sticker, giver)).not.toThrow();
  });

  it("keeps the receive when a claim misses the expiry and the gift returns", () => {
    const id = packGift(db, sticker, giver, deposited);
    update(id, received(receiver));
    expect(() =>
      update(id, {
        status: "returned",
        returnedAt: new Date(),
        returnTxHash: bytes32("return"),
        escrowStatus: "expired_returned",
      }),
    ).not.toThrow();
  });

  it("refuses an expiry before packaging, and a gift received by its giver", () => {
    const expired = new Date(Date.now() - GIFT_EXPIRY_MS);
    expect(refusal(() => packGift(db, sticker, giver, { expiresAt: expired }))).toMatch(
      /gifts_expiry/,
    );
    const id = packGift(db, sticker, giver, deposited);
    expect(refusal(() => update(id, received(giver)))).toMatch(/gifts_not_to_self/);
  });
});
