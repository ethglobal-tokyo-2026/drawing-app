import { gifts, MAX_HITS, stickerPlacements } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { errorBodySchema } from "../errors.ts";
import { userStatsSchema } from "../shapes.ts";
import { MAX_SEEN_BATCH, stickerBoardSchema } from "../stickerBoards/board.ts";
import { simplifiedOutline } from "../stickers/outline.ts";
import { stickerDetailSchema } from "../stickers/stickerDetail.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "../testing/rows.ts";
import { addDays, tokyoTicketDay, tokyoTicketDayStart } from "../ticketDays.ts";
import { newStickerCount, stickerPlacementSchema, type StickerPlacement } from "../views.ts";

/** A spot on the board, as a drag leaves it. */
const SPOT = { onBoard: true, x: 0.25, y: 0.75, scale: 0.3, rotation: -4, z: 2 };
/** Back in the sticker tray, with every value moved from SPOT. */
const IN_TRAY = { onBoard: false, x: 0.6, y: 0.1, scale: 0.8, rotation: 12, z: 5 };
/** Past the board field's far edge. */
const OFF_THE_FIELD = { ...SPOT, x: 1.5 };
/** A sticker with no size. */
const NO_SIZE = { ...SPOT, scale: 0 };
const MINUTE_MS = 60 * 1000;
/** When the first sticker in a test's sticker tray arrived. */
const FIRST_ARRIVAL = new Date("2026-09-01T00:00:00.000Z");

const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** When the stats' person made their account. */
const SINCE = new Date("2026-01-15T00:00:00.000Z");
/** A combo on a gift its Original Artist didn't give: their share comes out of the giver's part. */
const SHARED_TAP = { method: "tap", total: 100, originalArtistGratitudeShare: 20 } as const;
const STROKE = { method: "stroke", total: 60 } as const;
const SHAKE = { method: "shake", total: 45 } as const;
/** More than either part of SHARED_TAP, less than both together. */
const OWN_TAP = { method: "tap", total: 90 } as const;
const FEW_HITS = 12;
const MORE_HITS = 64;
/** Consecutive seal days before the missed one. */
const LONGEST_RUN = 3;

const placementResponseSchema = z.object({ stickerPlacement: stickerPlacementSchema });
const seenResponseSchema = z.object({ newStickerCount: z.number().int().nonnegative() });
const statsResponseSchema = z.object({ userStats: userStatsSchema });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

const request = async (userId: string, method: string, path: string, body?: unknown) =>
  test.app.request(path, {
    method,
    headers: { ...(await test.signInAs(userId)), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** A 200's body, parsed by its schema. */
async function okBody<Schema extends z.ZodType>(response: Response, schema: Schema) {
  const body: unknown = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(200);
  return schema.parse(body);
}

/** The status and ErrorBody a request was refused with. */
const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

const boardOf = async (viewerId: string, userId: string) =>
  okBody(await request(viewerId, "GET", `/api/sticker-boards/${userId}`), stickerBoardSchema);

const patchPlacement = (userId: string, stickerId: string, placement: unknown) =>
  request(userId, "PATCH", `/api/sticker-boards/me/sticker-placements/${stickerId}`, placement);

const postSeen = (userId: string, stickerIds: string[]) =>
  request(userId, "POST", "/api/sticker-boards/me/sticker-tray/seen", { stickerIds });

const statsOf = async (viewerId: string, userId: string) => {
  const path = `/api/sticker-boards/${userId}/user-stats`;
  return (await okBody(await request(viewerId, "GET", path), statsResponseSchema)).userStats;
};

const placementOf = (userId: string, stickerId: string) =>
  and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId));

const seal = (artistId: string) => insertSealedSticker(test.db, artistId);

/** `giverId` gives `stickerId` to `receiverId`: packed, then received. */
const give = (stickerId: string, giverId: string, receiverId: string, receivedAt?: Date) =>
  receiveGift(test.db, packGift(test.db, stickerId, giverId), receiverId, receivedAt);

const minuteAfter = (at: Date) => new Date(at.getTime() + MINUTE_MS);

/** `giverId` gives `stickerId` to `receiverId`, who sends gratitude as `combo`. */
const giveAndSendGratitude = (
  stickerId: string,
  giverId: string,
  receiverId: string,
  combo: Parameters<typeof insertGratitude>[2],
) => insertGratitude(test.db, give(stickerId, giverId, receiverId).id, combo);

/** Sets when each sticker reached `userId`, a minute apart in the order given. */
function arriveInOrder(userId: string, stickerIds: string[]) {
  stickerIds.forEach((stickerId, index) => {
    const createdAt = new Date(FIRST_ARRIVAL.getTime() + index * MINUTE_MS);
    test.db
      .update(stickerPlacements)
      .set({ createdAt })
      .where(placementOf(userId, stickerId))
      .run();
  });
}

const byStickerId = <Row extends StickerPlacement>(rows: Row[]) =>
  new Map(rows.map((row) => [row.stickerId, row]));

describe("GET /api/sticker-boards/:userId", () => {
  it("lists every sticker that reached you, by me and by your id, in arrival order", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const kept = seal(me);
    const packed = seal(me);
    const packedGiftId = packGift(test.db, packed, me);
    const sent = seal(me);
    const sentGiftId = packGift(test.db, sent, me);
    test.db
      .update(gifts)
      .set({ status: "sent", sentAt: new Date(), escrowStatus: "pending" })
      .where(eq(gifts.id, sentGiftId))
      .run();
    const given = seal(me);
    give(given, me, friend);
    const received = seal(friend);
    give(received, friend, me);
    // Arrival runs against id order, so only ordering by arrival passes.
    const arrival = [kept, packed, sent, given, received].sort().reverse();
    arriveInOrder(me, arrival);

    const board = await boardOf(me, "me");
    expect(await boardOf(me, me)).toEqual(board);
    expect(board.owner.id).toBe(me);
    expect(board.boardStickers.map(({ stickerId }) => stickerId)).toEqual(arrival);
    for (const boardSticker of board.boardStickers) {
      expect(boardSticker.sticker.id).toBe(boardSticker.stickerId);
    }
    const stickers = byStickerId(board.boardStickers);
    expect(stickers.get(kept)).toMatchObject({
      placement: null,
      seenAt: null,
      held: true,
      openGift: null,
    });
    expect(stickers.get(packed)?.openGift).toEqual({ id: packedGiftId, status: "packed" });
    expect(stickers.get(sent)?.openGift).toEqual({ id: sentGiftId, status: "sent" });
    expect(stickers.get(given)).toMatchObject({ held: false, openGift: null });
    expect(stickers.get(received)).toMatchObject({ held: true, openGift: null });
  });

  it("sends each cut line simplified, where the sticker's detail sends it whole", async () => {
    const me = insertUser(test.db);
    // A circle as the seal stores a cut line: a point every 2 px.
    const points = Array.from({ length: 800 }, (_, i) => {
      const t = (i / 800) * Math.PI * 2;
      return `${(300 + 250 * Math.cos(t)).toFixed(1)} ${(300 + 250 * Math.sin(t)).toFixed(1)}`;
    });
    const outline = `M${points.join("L")}Z`;
    const stickerId = insertSealedSticker(test.db, me, { outline, width: 600, height: 600 });
    const detail = await request(me, "GET", `/api/stickers/${stickerId}`);
    expect((await okBody(detail, stickerDetailSchema)).sticker.outline).toBe(outline);
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard?.sticker.outline).toBe(simplifiedOutline(outline, 600, 600));
    expect(onBoard?.sticker.outline.length).toBeLessThan(outline.length / 4);
  });

  it("shows someone else only their on-board stickers, without their bag or NEW", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const onBoard = seal(friend);
    packGift(test.db, onBoard, friend);
    const givenAway = seal(friend);
    const inTray = seal(friend);
    const unplaced = seal(friend);
    for (const [stickerId, spot] of [
      [onBoard, SPOT],
      [givenAway, SPOT],
      [inTray, IN_TRAY],
    ] as const) {
      test.db
        .update(stickerPlacements)
        .set({ ...spot, seenAt: new Date() })
        .where(placementOf(friend, stickerId))
        .run();
    }
    const receiver = insertUser(test.db);
    give(givenAway, friend, receiver);

    const board = await boardOf(me, friend);
    expect(board.owner.id).toBe(friend);
    expect(board.boardStickers.map(({ stickerId }) => stickerId).sort()).toEqual(
      [onBoard, givenAway].sort(),
    );
    expect(board.boardStickers.map(({ stickerId }) => stickerId)).not.toContain(unplaced);
    const stickers = byStickerId(board.boardStickers);
    expect(stickers.get(onBoard)).toMatchObject({ held: true, openGift: null, seenAt: null });
    expect(stickers.get(givenAway)).toMatchObject({ held: false, openGift: null, seenAt: null });
    expect(stickers.get(givenAway)?.givenTo?.receiver.id).toBe(receiver);
  });

  it("names who received a sticker given away, the last time it left the board's owner", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const other = insertUser(test.db);
    const cameBack = seal(me);
    give(cameBack, me, friend);
    give(cameBack, friend, me);
    const givenAgain = seal(me);
    const firstGivenAt = FIRST_ARRIVAL;
    const backAt = minuteAfter(firstGivenAt);
    const givenAgainAt = minuteAfter(backAt);
    give(givenAgain, me, friend, firstGivenAt);
    give(givenAgain, friend, me, backAt);
    give(givenAgain, me, other, givenAgainAt);

    const mine = byStickerId((await boardOf(me, "me")).boardStickers);
    expect(mine.get(cameBack)).toMatchObject({ held: true, givenTo: null });
    expect(mine.get(givenAgain)?.givenTo).toMatchObject({
      receiver: { id: other },
      receivedAt: givenAgainAt.toISOString(),
    });
    const friends = byStickerId((await boardOf(friend, "me")).boardStickers);
    expect(friends.get(givenAgain)?.givenTo).toMatchObject({
      receiver: { id: me },
      receivedAt: backAt.toISOString(),
    });
  });

  it("refuses a person who doesn't exist, for their board and their stats", async () => {
    const me = insertUser(test.db);
    for (const path of ["/api/sticker-boards/nobody", "/api/sticker-boards/nobody/user-stats"]) {
      expect(await refusal(await request(me, "GET", path))).toMatchObject({
        status: 404,
        error: "user_not_found",
      });
    }
  });
});

describe("PATCH /api/sticker-boards/me/sticker-placements/:stickerId", () => {
  it("saves a placement whole on any sticker that reached you, and returns it", async () => {
    const me = insertUser(test.db);
    const kept = seal(me);
    const given = seal(me);
    give(given, me, insertUser(test.db));
    for (const stickerId of [kept, given]) {
      for (const placement of [SPOT, IN_TRAY]) {
        const saved = await okBody(
          await patchPlacement(me, stickerId, placement),
          placementResponseSchema,
        );
        expect(saved.stickerPlacement).toMatchObject({ stickerId, placement });
      }
    }
    const board = await boardOf(me, "me");
    expect(board.boardStickers.map(({ placement }) => placement)).toEqual([IN_TRAY, IN_TRAY]);
  });

  it("refuses a sticker that never reached you, and a placement outside the board", async () => {
    const me = insertUser(test.db);
    const theirs = seal(insertUser(test.db));
    expect(await refusal(await patchPlacement(me, theirs, SPOT))).toMatchObject({
      status: 404,
      error: "sticker_placement_not_found",
    });
    const mine = seal(me);
    for (const outside of [OFF_THE_FIELD, NO_SIZE]) {
      expect(await refusal(await patchPlacement(me, mine, outside))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("POST /api/sticker-boards/me/sticker-tray/seen", () => {
  it("marks the listed stickers seen once, leaves the rest NEW, and answers the NEW count", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const first = seal(me);
    const second = seal(me);
    const left = seal(me);
    const theirs = seal(friend);
    const firstSeenAt = test.clock.now().toISOString();

    const answer = await okBody(await postSeen(me, [first, second, theirs]), seenResponseSchema);
    expect(answer.newStickerCount).toBe([left].length);
    test.clock.advance(MINUTE_MS);
    await postSeen(me, [first]);

    const stickers = byStickerId((await boardOf(me, "me")).boardStickers);
    expect(stickers.get(first)?.seenAt).toBe(firstSeenAt);
    expect(stickers.get(second)?.seenAt).toBe(firstSeenAt);
    expect(stickers.get(left)?.seenAt).toBeNull();
    expect(newStickerCount(test.db, friend)).toBe([theirs].length);
  });

  it("takes from 1 to MAX_SEEN_BATCH sticker ids at once", async () => {
    const me = insertUser(test.db);
    const ids = (length: number) => Array.from({ length }, (_, index) => `not-a-sticker-${index}`);
    expect((await postSeen(me, ids(MAX_SEEN_BATCH))).status).toBe(200);
    for (const stickerIds of [[], ids(MAX_SEEN_BATCH + 1), [""]]) {
      expect(await refusal(await postSeen(me, stickerIds))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("GET /api/sticker-boards/:userId/user-stats", () => {
  it("start at 0 when the account is made", async () => {
    const me = insertUser(test.db, { createdAt: SINCE });
    expect(await statsOf(me, "me")).toEqual({
      since: SINCE.toISOString(),
      made: 0,
      received: 0,
      given: 0,
      gratitude: { inspired: 0, magic: 0, asOriginalArtist: 0, total: 0 },
      bests: { bestCombo: 0, mostGratitudeInADay: 0, longestStreak: 0 },
      streak: 0,
    });
  });

  it("count stickers made, and gifts only once received", async () => {
    const artist = insertUser(test.db);
    const friend = insertUser(test.db);
    const made = [seal(artist), seal(artist), seal(artist)];
    const [given, packed, returned] = made;
    give(given, artist, friend);
    packGift(test.db, packed, artist);
    const returnedGift = give(returned, artist, friend);
    test.db
      .update(gifts)
      .set({ status: "returned", returnedAt: new Date(), escrowStatus: "expired_returned" })
      .where(eq(gifts.id, returnedGift.id))
      .run();

    expect(await statsOf(artist, "me")).toMatchObject({
      made: made.length,
      received: 0,
      given: [given].length,
    });
    expect(await statsOf(artist, friend)).toMatchObject({
      made: 0,
      received: [given].length,
      given: 0,
    });
  });

  it("split gratitude into the giver's part by method and the Original Artist's share", async () => {
    const artist = insertUser(test.db);
    const giver = insertUser(test.db);
    const receiver = insertUser(test.db);
    const drawn = seal(artist);
    give(drawn, artist, giver);
    giveAndSendGratitude(drawn, giver, receiver, SHARED_TAP);
    giveAndSendGratitude(seal(giver), giver, receiver, STROKE);
    giveAndSendGratitude(seal(giver), giver, receiver, SHAKE);

    const inspired = SHARED_TAP.total - SHARED_TAP.originalArtistGratitudeShare;
    const magic = STROKE.total + SHAKE.total;
    expect((await statsOf(giver, "me")).gratitude).toEqual({
      inspired,
      magic,
      asOriginalArtist: 0,
      total: inspired + magic,
    });
    const share = SHARED_TAP.originalArtistGratitudeShare;
    expect((await statsOf(giver, artist)).gratitude).toEqual({
      inspired: 0,
      magic: 0,
      asOriginalArtist: share,
      total: share,
    });
    expect((await statsOf(giver, receiver)).gratitude.total).toBe(0);
  });

  it("take bestCombo from the combos the person sent", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    giveAndSendGratitude(seal(friend), friend, me, { hits: FEW_HITS });
    giveAndSendGratitude(seal(friend), friend, me, { hits: MORE_HITS });
    giveAndSendGratitude(seal(me), me, friend, { hits: MAX_HITS });
    expect((await statsOf(me, "me")).bests.bestCombo).toBe(MORE_HITS);
    expect((await statsOf(me, friend)).bests.bestCombo).toBe(MAX_HITS);
  });

  it("add up the person's part of a ticket day's gratitude, Tokyo time", async () => {
    const me = insertUser(test.db);
    const artist = insertUser(test.db);
    const friend = insertUser(test.db);
    const nextDay = addDays(tokyoTicketDay(test.clock.now()), -1);
    const day = addDays(nextDay, -1);
    const nextDayStart = tokyoTicketDayStart(nextDay);
    // The day's first moment: my share, as the Original Artist of a sticker a friend passed on.
    const mine = seal(me);
    give(mine, me, friend);
    giveAndSendGratitude(mine, friend, artist, {
      ...SHARED_TAP,
      createdAt: tokyoTicketDayStart(day),
    });
    // Its last hour, a UTC date later than its first moment: my part of a sticker I passed on.
    const theirs = seal(artist);
    give(theirs, artist, me);
    const lastHour = new Date(nextDayStart.getTime() - HOUR_MS);
    giveAndSendGratitude(theirs, me, friend, { ...SHARED_TAP, createdAt: lastHour });
    giveAndSendGratitude(seal(me), me, friend, { ...OWN_TAP, createdAt: nextDayStart });

    const share = SHARED_TAP.originalArtistGratitudeShare;
    const giversPart = SHARED_TAP.total - share;
    expect((await statsOf(me, "me")).bests.mostGratitudeInADay).toBe(share + giversPart);
  });

  it("count the streak over seal days, and keep the longest after a missed day", async () => {
    const me = insertUser(test.db);
    const yesterday = addDays(tokyoTicketDay(test.clock.now()), -1);
    const missed = addDays(yesterday, -1);
    const longest = Array.from({ length: LONGEST_RUN }, (_, index) =>
      addDays(missed, index - LONGEST_RUN),
    );
    for (const day of [...longest, yesterday]) {
      insertSealedSticker(test.db, me, { createdAt: tokyoTicketDayStart(day) });
    }

    expect(await statsOf(me, "me")).toMatchObject({
      streak: [yesterday].length,
      bests: { longestStreak: longest.length },
    });
    test.clock.advance(DAY_MS);
    expect(await statsOf(me, "me")).toMatchObject({
      streak: 0,
      bests: { longestStreak: longest.length },
    });
  });
});

describe("sticker board routes", () => {
  it("refuse a request without the session cookie", async () => {
    const routes = [
      ["GET", "/api/sticker-boards/me"],
      ["GET", "/api/sticker-boards/me/user-stats"],
      ["PATCH", "/api/sticker-boards/me/sticker-placements/any-sticker"],
      ["POST", "/api/sticker-boards/me/sticker-tray/seen"],
    ];
    for (const [method, path] of routes) {
      expect(await refusal(await test.app.request(path, { method }))).toMatchObject({
        status: 401,
        error: "signed_out",
      });
    }
  });
});
