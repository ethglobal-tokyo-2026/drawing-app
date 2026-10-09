import { MAX_HITS, MAX_LARGE_SCALE, MAX_SCALE, stickerPlacements } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  largeColumns,
  stickerPlacementSchema,
  userStatsSchema,
  type StickerPlacement,
} from "../shapes.ts";
import { MAX_SEEN_BATCH, newStickerCount, stickerBoardSchema } from "../stickerBoards/board.ts";
import { MAX_LARGE_LAYOUT_BATCH } from "../stickerBoards/largeLayoutLimit.ts";
import { simplifiedOutline } from "../stickers/outline.ts";
import { stickerDetailSchema } from "../stickers/stickerDetail.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeSuiWallets } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import {
  FEW_HITS,
  giveSticker,
  insertSealedSticker,
  LARGE_SPOT,
  MORE_HITS,
  OWN_TAP,
  sendGratitude,
  SHARED_TAP,
  SPOT,
} from "../testing/rows.ts";
import { addDays, tokyoTicketDay, tokyoTicketDayStart } from "../ticketDays.ts";
import { suiAddressResponseSchema } from "./stickerBoards.ts";

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
const STROKE = { method: "stroke", total: 60 } as const;
const SHAKE = { method: "shake", total: 45 } as const;
/** Consecutive seal days before the missed one. */
const LONGEST_RUN = 3;

const placementResponseSchema = z.object({ stickerPlacement: stickerPlacementSchema });
const largeLayoutResponseSchema = z.object({ stickerPlacements: z.array(stickerPlacementSchema) });
const seenResponseSchema = z.object({ newStickerCount: z.number().int().nonnegative() });
const statsResponseSchema = z.object({ userStats: userStatsSchema });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

const boardOf = async (viewerId: string, userId: string) =>
  bodyOf(
    await test.send("GET", `/api/sticker-boards/${userId}`, { as: viewerId }),
    stickerBoardSchema,
  );

const patchPlacement = (userId: string, stickerId: string, placement: unknown) =>
  test.send("PATCH", `/api/sticker-boards/me/sticker-placements/${stickerId}`, {
    as: userId,
    body: placement,
  });

const postSeen = (userId: string, stickerIds: string[]) =>
  test.send("POST", "/api/sticker-boards/me/sticker-tray/seen", {
    as: userId,
    body: { stickerIds },
  });

const postLargeLayout = (userId: string, stickerPlacements: unknown) =>
  test.send("POST", "/api/sticker-boards/me/large-layout", {
    as: userId,
    body: { stickerPlacements },
  });

const statsOf = async (viewerId: string, userId: string) => {
  const response = await test.send("GET", `/api/sticker-boards/${userId}/user-stats`, {
    as: viewerId,
  });
  return (await bodyOf(response, statsResponseSchema)).userStats;
};

const placementOf = (userId: string, stickerId: string) =>
  and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId));

const seal = (artistId: string) => insertSealedSticker(test.db, artistId);

/** `giverId` packs `stickerId` and sends it: in the escrow, on its way until someone receives it. */
const sendGift = (stickerId: string, giverId: string) =>
  packGift(test.db, stickerId, giverId, {
    status: "sent",
    sentAt: new Date(),
    escrowStatus: "pending",
  });

const minuteAfter = (at: Date) => new Date(at.getTime() + MINUTE_MS);

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
    const sentGiftId = sendGift(sent, me);
    const given = seal(me);
    giveSticker(test.db, given, me, friend);
    const received = seal(friend);
    giveSticker(test.db, received, friend, me);
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
    expect(stickers.get(packed)?.openGift).toEqual({
      id: packedGiftId,
      status: "packed",
      for: null,
    });
    expect(stickers.get(sent)?.openGift).toEqual({ id: sentGiftId, status: "sent", for: null });
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
    const detail = await test.send("GET", `/api/stickers/${stickerId}`, { as: me });
    expect((await bodyOf(detail, stickerDetailSchema)).sticker.outline).toBe(outline);
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard?.sticker.outline).toBe(simplifiedOutline(outline, 600, 600));
  });

  it("shows someone else only the stickers on the board its owner holds, without their bag or NEW", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const onBoard = seal(friend);
    packGift(test.db, onBoard, friend);
    const givenAway = seal(friend);
    const onItsWay = seal(friend);
    const inTray = seal(friend);
    seal(friend);
    for (const [stickerId, spot] of [
      [onBoard, SPOT],
      [givenAway, SPOT],
      [onItsWay, SPOT],
      [inTray, IN_TRAY],
    ] as const) {
      test.db
        .update(stickerPlacements)
        .set({ ...spot, seenAt: new Date() })
        .where(placementOf(friend, stickerId))
        .run();
    }
    // Given away from its spot on the board, which the giver's placement keeps.
    giveSticker(test.db, givenAway, friend, insertUser(test.db));
    // Sent from its spot: still the giver's until it's received, but no longer on their board.
    sendGift(onItsWay, friend);

    const board = await boardOf(me, friend);
    expect(board.owner.id).toBe(friend);
    expect(board.boardStickers.map(({ stickerId }) => stickerId)).toEqual([onBoard]);
    expect(board.boardStickers[0]).toMatchObject({
      held: true,
      givenTo: null,
      openGift: null,
      seenAt: null,
    });
  });

  it("shows someone else the stickers on their board in either layout, with both spots", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const [phoneOnly, largeOnly, inBothTrays] = [seal(friend), seal(friend), seal(friend)];
    for (const [stickerId, phone, large] of [
      [phoneOnly, SPOT, IN_TRAY],
      [largeOnly, IN_TRAY, LARGE_SPOT],
      [inBothTrays, IN_TRAY, IN_TRAY],
    ] as const) {
      test.db
        .update(stickerPlacements)
        .set({ ...phone, ...largeColumns(large) })
        .where(placementOf(friend, stickerId))
        .run();
    }
    const shown = byStickerId((await boardOf(me, friend)).boardStickers);
    expect([...shown.keys()].sort()).toEqual([phoneOnly, largeOnly].sort());
    expect(shown.get(largeOnly)).toMatchObject({ placement: IN_TRAY, largePlacement: LARGE_SPOT });
  });

  it("names who received a sticker given away, the last time it left the board's owner", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const other = insertUser(test.db);
    const cameBack = seal(me);
    giveSticker(test.db, cameBack, me, friend);
    giveSticker(test.db, cameBack, friend, me);
    const givenAgain = seal(me);
    const firstGivenAt = FIRST_ARRIVAL;
    const backAt = minuteAfter(firstGivenAt);
    const givenAgainAt = minuteAfter(backAt);
    giveSticker(test.db, givenAgain, me, friend, firstGivenAt);
    giveSticker(test.db, givenAgain, friend, me, backAt);
    giveSticker(test.db, givenAgain, me, other, givenAgainAt);

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
    for (const path of [
      "/api/sticker-boards/nobody",
      "/api/sticker-boards/nobody/user-stats",
      "/api/sticker-boards/nobody/sui-address",
    ]) {
      expect(await refusalOf(await test.send("GET", path, { as: me }))).toMatchObject({
        status: 404,
        error: "user_not_found",
      });
    }
  });
});

describe("PATCH /api/sticker-boards/me/sticker-placements/:stickerId", () => {
  it("saves a placement whole on any sticker that reached you, in either layout or both", async () => {
    const me = insertUser(test.db);
    const kept = seal(me);
    const given = seal(me);
    giveSticker(test.db, given, me, insertUser(test.db));
    for (const stickerId of [kept, given]) {
      for (const body of [
        { placement: SPOT },
        { largePlacement: LARGE_SPOT },
        { placement: IN_TRAY, largePlacement: IN_TRAY },
      ]) {
        const saved = await bodyOf(
          await patchPlacement(me, stickerId, body),
          placementResponseSchema,
        );
        expect(saved.stickerPlacement).toMatchObject({ stickerId, ...body });
      }
    }
    const board = await boardOf(me, "me");
    expect(board.boardStickers.map((s) => [s.placement, s.largePlacement])).toEqual([
      [IN_TRAY, IN_TRAY],
      [IN_TRAY, IN_TRAY],
    ]);
  });

  it("leaves the phone's spot as it was when a large screen moves the sticker", async () => {
    const me = insertUser(test.db);
    const stickerId = seal(me);
    await patchPlacement(me, stickerId, { placement: SPOT, largePlacement: LARGE_SPOT });
    const moved = { ...LARGE_SPOT, x: 0.9, scale: 0.5, rotation: 20 };
    await patchPlacement(me, stickerId, { largePlacement: moved });
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard).toMatchObject({ placement: SPOT, largePlacement: moved });
  });

  it("takes a sticker as large as each layout allows, and refuses one larger", async () => {
    const me = insertUser(test.db);
    const stickerId = seal(me);
    const largest = {
      placement: { ...SPOT, scale: MAX_SCALE },
      largePlacement: { ...LARGE_SPOT, scale: MAX_LARGE_SCALE },
    };
    const saved = await bodyOf(
      await patchPlacement(me, stickerId, largest),
      placementResponseSchema,
    );
    expect(saved.stickerPlacement).toMatchObject(largest);
    for (const body of [
      { placement: { ...SPOT, scale: MAX_SCALE + 0.01 } },
      { largePlacement: { ...LARGE_SPOT, scale: MAX_LARGE_SCALE + 0.01 } },
    ]) {
      expect(await refusalOf(await patchPlacement(me, stickerId, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });

  it("refuses a sticker that never reached you, a body naming no layout, and a spot outside the board", async () => {
    const me = insertUser(test.db);
    const theirs = seal(insertUser(test.db));
    expect(await refusalOf(await patchPlacement(me, theirs, { placement: SPOT }))).toMatchObject({
      status: 404,
      error: "sticker_placement_not_found",
    });
    const mine = seal(me);
    for (const body of [{}, { placement: OFF_THE_FIELD }, { largePlacement: NO_SIZE }]) {
      expect(await refusalOf(await patchPlacement(me, mine, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("POST /api/sticker-boards/me/large-layout", () => {
  it("saves each spot only where the sticker has no large spot yet, and answers every listed sticker", async () => {
    const me = insertUser(test.db);
    const [first, second] = [seal(me), seal(me)];
    await patchPlacement(me, first, { largePlacement: LARGE_SPOT });
    const derived = { ...SPOT, x: 0.45 };
    const answer = await bodyOf(
      await postLargeLayout(
        me,
        [first, second].map((stickerId) => ({ stickerId, largePlacement: derived })),
      ),
      largeLayoutResponseSchema,
    );
    expect(new Map(answer.stickerPlacements.map((p) => [p.stickerId, p.largePlacement]))).toEqual(
      new Map([
        [first, LARGE_SPOT],
        [second, derived],
      ]),
    );
  });

  it("refuses stickers that never reached you, naming them, and saves none of the batch", async () => {
    const me = insertUser(test.db);
    const mine = seal(me);
    const theirs = seal(insertUser(test.db));
    const refused = await refusalOf(
      await postLargeLayout(
        me,
        [mine, theirs].map((stickerId) => ({ stickerId, largePlacement: SPOT })),
      ),
    );
    expect(refused).toMatchObject({ status: 404, error: "sticker_placement_not_found" });
    expect(refused.detail).toContain(theirs);
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard?.largePlacement).toBeNull();
  });

  it("refuses an empty batch and one over MAX_LARGE_LAYOUT_BATCH", async () => {
    const me = insertUser(test.db);
    const entries = (length: number) =>
      Array.from({ length }, (_, index) => ({
        stickerId: `not-a-sticker-${index}`,
        largePlacement: SPOT,
      }));
    for (const stickerPlacements of [entries(0), entries(MAX_LARGE_LAYOUT_BATCH + 1)]) {
      expect(await refusalOf(await postLargeLayout(me, stickerPlacements))).toMatchObject({
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

    const answer = await bodyOf(await postSeen(me, [first, second, theirs]), seenResponseSchema);
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
      expect(await refusalOf(await postSeen(me, stickerIds))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });

  it("count NEW as the stickers you hold that you haven't seen in the open tray", () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    const unseen = [insertSealedSticker(test.db, me), insertSealedSticker(test.db, me)];
    const seen = insertSealedSticker(test.db, me);
    test.db
      .update(stickerPlacements)
      .set({ seenAt: new Date() })
      .where(placementOf(me, seen))
      .run();
    const given = giveSticker(test.db, insertSealedSticker(test.db, me), me, friend);
    expect(newStickerCount(test.db, me)).toBe(unseen.length);
    expect(newStickerCount(test.db, friend)).toBe([given].length);
  });
});

describe("GET /api/sticker-boards/:userId/sui-address", () => {
  /** The test app, looking wallets up through `addressFor`, which counts its lookups. */
  const withWallets = async (
    addressFor: (
      wallets: ReturnType<typeof fakeSuiWallets>,
      userId: string,
    ) => Promise<string | null>,
  ) => {
    const lookups: string[] = [];
    test = await createTestApp((base) => {
      const wallets = fakeSuiWallets(base.db);
      return {
        suiWallets: {
          addressFor: (userId) => {
            lookups.push(userId);
            return addressFor(wallets, userId);
          },
        },
      };
    });
    return lookups;
  };
  const addressOf = (viewerId: string, userId: string) =>
    test.send("GET", `/api/sticker-boards/${userId}/sui-address`, { as: viewerId });
  /** The Sui address `viewerId` is shown on `userId`'s stat board. */
  const shownAddress = async (viewerId: string, userId: string) =>
    (await bodyOf(await addressOf(viewerId, userId), suiAddressResponseSchema)).suiAddress;

  it("answers someone's wallet, asking Privy only until it's kept", async () => {
    const lookups = await withWallets((wallets, userId) => wallets.addressFor(userId));
    const [me, them] = [insertUser(test.db), insertUser(test.db)];
    const first = await shownAddress(me, them);
    expect(first).not.toBeNull();
    expect(await shownAddress(me, them)).toBe(first);
    expect(lookups).toEqual([them]);
  });

  it("answers null while they have no wallet, and says when Privy can't be asked", async () => {
    const stalls = new Set<string>();
    await withWallets((_, userId) =>
      stalls.has(userId) ? Promise.reject(new Error("Privy timed out")) : Promise.resolve(null),
    );
    const [me, them, stalled] = [insertUser(test.db), insertUser(test.db), insertUser(test.db)];
    stalls.add(stalled);
    expect(await shownAddress(me, them)).toBeNull();
    expect(await refusalOf(await addressOf(me, stalled))).toMatchObject({
      status: 502,
      error: "wallet_lookup_failed",
    });
  });

  it("answers null once they delete their account, though their row keeps the wallet", async () => {
    const lookups = await withWallets((wallets, userId) => wallets.addressFor(userId));
    const [me, them] = [insertUser(test.db), insertUser(test.db)];
    expect(await shownAddress(me, them)).not.toBeNull();
    expect((await test.send("DELETE", "/api/me", { as: them })).status).toBe(204);
    expect(await shownAddress(me, them)).toBeNull();
    expect(lookups).toEqual([them]);
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
      gratitude: { direct: 0, residual: 0, total: 0 },
      bests: { bestCombo: 0, mostGratitudeInADay: 0, longestStreak: 0 },
      streak: 0,
    });
  });

  it("count stickers made, and gifts only once received", async () => {
    const artist = insertUser(test.db);
    const friend = insertUser(test.db);
    const made = [seal(artist), seal(artist), seal(artist)];
    const [given, packed, returned] = made;
    giveSticker(test.db, given, artist, friend);
    packGift(test.db, packed, artist);
    packGift(test.db, returned, artist, {
      status: "returned",
      escrowStatus: "expired_returned",
      returnedAt: new Date(),
    });

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

  it("split gratitude into the giver's direct part and the Original Artist's residual", async () => {
    const artist = insertUser(test.db);
    const giver = insertUser(test.db);
    const receiver = insertUser(test.db);
    const drawn = seal(artist);
    giveSticker(test.db, drawn, artist, giver);
    sendGratitude(test.db, drawn, giver, receiver, SHARED_TAP);
    // The giver drew these two: each combo is theirs as giver and as Original Artist, and counts once.
    sendGratitude(test.db, seal(giver), giver, receiver, STROKE);
    sendGratitude(test.db, seal(giver), giver, receiver, SHAKE);

    const share = SHARED_TAP.originalArtistGratitudeShare;
    const direct = SHARED_TAP.total - share + STROKE.total + SHAKE.total;
    expect((await statsOf(giver, "me")).gratitude).toEqual({
      direct,
      residual: 0,
      total: direct,
    });
    expect((await statsOf(giver, artist)).gratitude).toEqual({
      direct: 0,
      residual: share,
      total: share,
    });
    expect((await statsOf(giver, receiver)).gratitude.total).toBe(0);
  });

  it("take bestCombo from the combos the person sent", async () => {
    const me = insertUser(test.db);
    const friend = insertUser(test.db);
    sendGratitude(test.db, seal(friend), friend, me, { hits: FEW_HITS });
    sendGratitude(test.db, seal(friend), friend, me, { hits: MORE_HITS });
    sendGratitude(test.db, seal(me), me, friend, { hits: MAX_HITS });
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
    giveSticker(test.db, mine, me, friend);
    sendGratitude(test.db, mine, friend, artist, {
      ...SHARED_TAP,
      createdAt: tokyoTicketDayStart(day),
    });
    // Its last hour, a UTC date later than its first moment: my part of a sticker I passed on.
    const theirs = seal(artist);
    giveSticker(test.db, theirs, artist, me);
    const lastHour = new Date(nextDayStart.getTime() - HOUR_MS);
    sendGratitude(test.db, theirs, me, friend, { ...SHARED_TAP, createdAt: lastHour });
    sendGratitude(test.db, seal(me), me, friend, { ...OWN_TAP, createdAt: nextDayStart });

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
