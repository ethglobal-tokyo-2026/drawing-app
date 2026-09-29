import { gratitude } from "@drawing-app/db";
import { insertGratitude, insertUser, ONE_TAP } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  gratitudeWithReplaySchema,
  seenGratitudeSchema,
  unseenGratitudeSchema,
} from "../gratitude/feed.ts";
import { gzipReplay } from "../gratitude/replay.ts";
import { tapReplay } from "../gratitude/testReplays.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { giveSticker, insertSealedSticker } from "../testing/rows.ts";

const HOUR_MS = 60 * 60 * 1000;
/** When the older and newer combos were recorded. */
const OLDER = new Date("2026-09-25T01:00:00.000Z");
const NEWER = new Date("2026-09-25T02:00:00.000Z");

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

/** A received gift its receiver sent gratitude for, with `values` over the recorded combo. */
function giftWithGratitude(
  giverId: string,
  receiverId: string,
  values: Partial<typeof gratitude.$inferInsert> = {},
) {
  const gift = giveSticker(test.db, insertSealedSticker(test.db, giverId), giverId, receiverId);
  insertGratitude(test.db, gift.id, values);
  return { giftId: gift.id, stickerId: gift.stickerId };
}

const markWatched = (userId: string, giftId: string) =>
  test.send("POST", `/api/gratitude/${giftId}/seen`, { as: userId });
const readGratitude = (userId: string, giftId: string) =>
  test.send("GET", `/api/gratitude/${giftId}`, { as: userId });

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
    const newer = giftWithGratitude(giverId, secondReceiverId, { createdAt: NEWER });
    const older = giftWithGratitude(giverId, firstReceiverId, { createdAt: OLDER });
    giftWithGratitude(giverId, insertUser(test.db), { seenByGiverAt: NEWER });
    // Gratitude the giver sent is for someone else to watch.
    giftWithGratitude(insertUser(test.db), giverId);

    const response = await test.send("GET", "/api/gratitude/unseen", { as: giverId });
    const { unseen } = await bodyOf(response, unseenGratitudeSchema);
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

describe("GET /api/gratitude/:giftId", () => {
  it("shows anyone signed in the gratitude, its replay, and who gave and received the gift", async () => {
    const giverId = insertUser(test.db);
    const receiverId = insertUser(test.db);
    const replay = tapReplay(ONE_TAP.hits);
    const { giftId } = giftWithGratitude(giverId, receiverId, { replay: gzipReplay(replay) });

    const response = await readGratitude(insertUser(test.db), giftId);
    const answer = await bodyOf(response, gratitudeWithReplaySchema);
    expect(answer).toMatchObject({
      gratitude: { giftId },
      giver: { id: giverId },
      receiver: { id: receiverId },
    });
    expect(answer.replay).toEqual(replay);
  });
});

describe("POST /api/gratitude/:giftId/seen", () => {
  it("marks the gratitude watched at the clock's time, and keeps that first time when it's watched again", async () => {
    const giverId = insertUser(test.db);
    const { giftId } = giftWithGratitude(giverId, insertUser(test.db));
    const firstWatch = test.clock.now();
    const watched = async () =>
      (await bodyOf(await markWatched(giverId, giftId), seenGratitudeSchema)).gratitude;

    expect(await watched()).toMatchObject({ giftId, seenByGiverAt: firstWatch.toISOString() });
    test.clock.advance(HOUR_MS);
    expect((await watched()).seenByGiverAt).toBe(firstWatch.toISOString());
    expect(storedSeenAt(giftId)).toEqual(firstWatch);
  });

  it("refuses anyone but the giver with not_giver, and leaves the gratitude unwatched", async () => {
    const receiverId = insertUser(test.db);
    const { giftId } = giftWithGratitude(insertUser(test.db), receiverId);
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
const oneGratitudeRoutes = [
  { route: "GET /api/gratitude/:giftId", send: readGratitude },
  { route: "POST /api/gratitude/:giftId/seen", send: markWatched },
];

describe.each(oneGratitudeRoutes)("$route", ({ send }) => {
  it("refuses a received gift that has no gratitude with gratitude_not_found", async () => {
    const giverId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, giverId);
    const gift = giveSticker(test.db, stickerId, giverId, insertUser(test.db));
    expect(await refusalOf(await send(giverId, gift.id))).toMatchObject({
      status: 404,
      error: "gratitude_not_found",
    });
  });

  it("refuses a gift id in capital hex with invalid_request, naming giftId", async () => {
    const giverId = insertUser(test.db);
    const { giftId } = giftWithGratitude(giverId, insertUser(test.db));
    const answer = await refusalOf(await send(giverId, giftId.toUpperCase().replace("0X", "0x")));
    expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
    expect(answer.detail).toContain("giftId");
  });
});
