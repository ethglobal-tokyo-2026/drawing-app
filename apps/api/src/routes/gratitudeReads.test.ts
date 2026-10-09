import { gratitude } from "@drawing-app/db";
import { insertGratitude, insertUser, ONE_TAP } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  gratitudeWithReplaySchema,
  seenGratitudeSchema,
  unseenGratitudeCount,
  unseenGratitudeSchema,
} from "../gratitude/feed.ts";
import { GRATITUDE_EVENTS_PAGE, gratitudeEventsSchema } from "../gratitude/events.ts";
import { gzipReplay } from "../gratitude/replay.ts";
import { tapReplay } from "../gratitude/testReplays.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import {
  giveSticker,
  insertSealedSticker,
  OWN_TAP,
  sendGratitude,
  SHARED_TAP,
} from "../testing/rows.ts";

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

describe("GET /api/gratitude/events", () => {
  it("lists the combos that gave you gratitude, newest first: Direct as the giver, Residual as the Original Artist", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const other = insertUser(test.db);
    const direct = giftWithGratitude(me, friend, { ...OWN_TAP, createdAt: OLDER });
    // A sticker you drew that someone else gave on: your share of its combo is Residual.
    const drawn = insertSealedSticker(test.db, me);
    giveSticker(test.db, drawn, me, other);
    sendGratitude(test.db, drawn, other, friend, { ...SHARED_TAP, createdAt: NEWER });
    // Gratitude you sent, and gratitude on someone else's sticker, went to others.
    giftWithGratitude(friend, me);
    giftWithGratitude(other, friend);

    const response = await test.send("GET", "/api/gratitude/events", { as: me });
    const { events, next } = await bodyOf(response, gratitudeEventsSchema);
    expect(events).toMatchObject([
      {
        part: "residual",
        amount: SHARED_TAP.originalArtistGratitudeShare,
        sticker: { id: drawn },
        from: { id: friend },
        recordedAt: NEWER.toISOString(),
      },
      {
        part: "direct",
        amount: OWN_TAP.total,
        giftId: direct.giftId,
        from: { id: friend },
        recordedAt: OLDER.toISOString(),
      },
    ]);
    expect(next).toBeNull();
  });

  it("pages back through every combo once, newest first, Direct and Residual together", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const other = insertUser(test.db);
    // More than a page, half recorded at each time, so a page ends among combos recorded together.
    const count = GRATITUDE_EVENTS_PAGE + 2;
    const giftIds = Array.from({ length: count }, (_, i) => {
      const createdAt = i < count / 2 ? NEWER : OLDER;
      if (i % 2 === 0) return giftWithGratitude(me, friend, { ...OWN_TAP, createdAt }).giftId;
      const drawn = insertSealedSticker(test.db, me);
      return sendGratitude(test.db, drawn, other, friend, { ...SHARED_TAP, createdAt }).giftId;
    });

    const shown: { giftId: string; recordedAt: string }[] = [];
    let pages = 0;
    let before: string | null = null;
    do {
      const query: string = before === null ? "" : `?before=${before}`;
      const response = await test.send("GET", `/api/gratitude/events${query}`, { as: me });
      const page = await bodyOf(response, gratitudeEventsSchema);
      shown.push(...page.events);
      before = page.next;
      pages++;
    } while (before !== null);

    expect(pages).toBeGreaterThan(1);
    expect(shown.map((event) => event.giftId).sort()).toEqual(giftIds.sort());
    const times = shown.map((event) => Date.parse(event.recordedAt));
    expect(times).toEqual(times.toSorted((a, b) => b - a));
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

  it("count the pink tag as gratitude on gifts you gave that you haven't watched", () => {
    const giverId = insertUser(test.db);
    const receiverId = insertUser(test.db);
    const given = [insertSealedSticker(test.db, giverId), insertSealedSticker(test.db, giverId)];
    const withGratitude = given.map((stickerId) =>
      giveSticker(test.db, stickerId, giverId, receiverId),
    );
    for (const gift of withGratitude) insertGratitude(test.db, gift.id);
    expect(unseenGratitudeCount(test.db, giverId)).toBe(withGratitude.length);
    expect(unseenGratitudeCount(test.db, receiverId)).toBe(0);
    const [watched] = withGratitude;
    test.db
      .update(gratitude)
      .set({ seenByGiverAt: new Date() })
      .where(eq(gratitude.giftId, watched.id))
      .run();
    expect(unseenGratitudeCount(test.db, giverId)).toBe(withGratitude.length - 1);
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
