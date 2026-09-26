import { gratitude } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { refusalOf } from "../gifts/testGifts.ts";
import { seenGratitudeSchema, unseenGratitudeSchema } from "../gratitude/feed.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "../testing/rows.ts";

const HOUR_MS = 60 * 60 * 1000;
/** When the older and newer combos were recorded. */
const OLDER = new Date("2026-09-25T01:00:00.000Z");
const NEWER = new Date("2026-09-25T02:00:00.000Z");

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

/** A gift of a new sticker `giverId` drew, received by `receiverId`. */
function receivedGift(giverId: string, receiverId: string) {
  const stickerId = insertSealedSticker(test.db, giverId);
  return receiveGift(test.db, packGift(test.db, stickerId, giverId), receiverId);
}

/** A received gift its receiver thanked, with `values` over the recorded combo. */
function thankedGift(
  giverId: string,
  receiverId: string,
  values: Partial<typeof gratitude.$inferInsert> = {},
) {
  const gift = receivedGift(giverId, receiverId);
  insertGratitude(test.db, gift.id, values);
  return { giftId: gift.id, stickerId: gift.stickerId };
}

const request = async (userId: string, method: "GET" | "POST", path: string) =>
  test.app.request(`/api/gratitude${path}`, { method, headers: await test.signInAs(userId) });

const markWatched = (userId: string, giftId: string) => request(userId, "POST", `/${giftId}/seen`);

const storedSeenAt = (giftId: string) =>
  test.db
    .select({ seenByGiverAt: gratitude.seenByGiverAt })
    .from(gratitude)
    .where(eq(gratitude.giftId, giftId))
    .get()?.seenByGiverAt;

describe("GET /api/gratitude/unseen", () => {
  it("lists gratitude on gifts you gave that you haven't watched, oldest first, with each sticker and receiver", async () => {
    const giverId = insertUser(test.db);
    const firstReceiverId = insertUser(test.db);
    const secondReceiverId = insertUser(test.db);
    // Recorded newest first, so only the ordering puts the older combo first.
    const newer = thankedGift(giverId, secondReceiverId, { createdAt: NEWER });
    const older = thankedGift(giverId, firstReceiverId, { createdAt: OLDER });
    thankedGift(giverId, insertUser(test.db), { seenByGiverAt: NEWER });
    // Gratitude the giver sent is for someone else to watch.
    thankedGift(insertUser(test.db), giverId);

    const response = await request(giverId, "GET", "/unseen");
    expect(response.status).toBe(200);
    const { unseen } = unseenGratitudeSchema.parse(await response.json());
    expect(unseen).toMatchObject([
      {
        gratitude: { giftId: older.giftId, recordedAt: OLDER.toISOString(), seenByGiverAt: null },
        sticker: { id: older.stickerId, artist: { id: giverId } },
        receiver: { id: firstReceiverId },
      },
      {
        gratitude: { giftId: newer.giftId, recordedAt: NEWER.toISOString(), seenByGiverAt: null },
        sticker: { id: newer.stickerId, artist: { id: giverId } },
        receiver: { id: secondReceiverId },
      },
    ]);
  });
});

describe("POST /api/gratitude/:giftId/seen", () => {
  it("marks the gratitude watched at the clock's time, and keeps that first time when it's watched again", async () => {
    const giverId = insertUser(test.db);
    const { giftId } = thankedGift(giverId, insertUser(test.db));
    const firstWatch = test.clock.now();
    const watched = async () => {
      const response = await markWatched(giverId, giftId);
      expect(response.status).toBe(200);
      return seenGratitudeSchema.parse(await response.json()).gratitude;
    };

    expect(await watched()).toMatchObject({ giftId, seenByGiverAt: firstWatch.toISOString() });
    test.clock.advance(HOUR_MS);
    expect((await watched()).seenByGiverAt).toBe(firstWatch.toISOString());
    expect(storedSeenAt(giftId)).toEqual(firstWatch);
  });

  it("refuses anyone but the giver with not_giver, and leaves the gratitude unwatched", async () => {
    const receiverId = insertUser(test.db);
    const { giftId } = thankedGift(insertUser(test.db), receiverId);
    for (const userId of [receiverId, insertUser(test.db)]) {
      expect(await refusalOf(await markWatched(userId, giftId))).toMatchObject({
        status: 403,
        error: "not_giver",
      });
    }
    expect(storedSeenAt(giftId)).toBeNull();
  });
});

/** The routes that name one gift's gratitude, as `userId` sends them. */
const oneGratitudeRoutes = [{ route: "POST /api/gratitude/:giftId/seen", send: markWatched }];

describe.each(oneGratitudeRoutes)("$route", ({ send }) => {
  it("refuses a received gift nobody thanked with gratitude_not_found", async () => {
    const giverId = insertUser(test.db);
    const gift = receivedGift(giverId, insertUser(test.db));
    expect(await refusalOf(await send(giverId, gift.id))).toMatchObject({
      status: 404,
      error: "gratitude_not_found",
    });
  });

  it("refuses a gift id in capital hex with invalid_request, naming giftId", async () => {
    const giverId = insertUser(test.db);
    const { giftId } = thankedGift(giverId, insertUser(test.db));
    const answer = await refusalOf(await send(giverId, giftId.toUpperCase().replace("0X", "0x")));
    expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
    expect(answer.detail).toContain("giftId");
  });
});

describe("the giver's gratitude routes", () => {
  it("need a session", async () => {
    const { giftId } = thankedGift(insertUser(test.db), insertUser(test.db));
    const responses = [
      await test.app.request("/api/gratitude/unseen"),
      await test.app.request(`/api/gratitude/${giftId}/seen`, { method: "POST" }),
    ];
    for (const response of responses) {
      expect(await refusalOf(response)).toEqual({ status: 401, error: "signed_out" });
    }
  });
});
