import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
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
  ({
    status: "received",
    receiverId: by,
    receivedAt: new Date(),
    escrowStatus: "claimed",
  }) as const;
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
    expect(() => update(id, { ...takenOut(), escrowStatus: "taken_out" })).not.toThrow();
  });

  it("gives a sticker one gift at a time, until its take-out lets it go", () => {
    const first = packGift(db, sticker, giver, deposited);
    expect(refusal(() => packGift(db, sticker, giver))).toMatch(/gifts.sticker_id/);
    expect(refusal(() => update(first, takenOut()))).toMatch(/gifts_status_escrow/);
    update(first, { ...takenOut(), escrowStatus: "taken_out" });
    expect(() => packGift(db, sticker, giver)).not.toThrow();
  });

  it("is received only once its claim has landed, and never returned after", () => {
    const id = packGift(db, sticker, giver, deposited);
    expect(refusal(() => update(id, { ...received(receiver), ...deposited }))).toMatch(
      /gifts_status_escrow/,
    );
    update(id, received(receiver));
    const returned = { status: "returned", returnedAt: new Date() } as const;
    expect(refusal(() => update(id, { ...returned, escrowStatus: "expired_returned" }))).toMatch(
      /gifts_status_dates/,
    );
  });

  it("waits only for someone else, who has an account", () => {
    expect(refusal(() => packGift(db, sticker, giver, { forUserId: giver }))).toMatch(
      /gifts_not_for_self/,
    );
    expect(refusal(() => packGift(db, sticker, giver, { forUserId: "no such person" }))).toMatch(
      /FOREIGN KEY/,
    );
    expect(() => packGift(db, sticker, giver, { forUserId: receiver })).not.toThrow();
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
