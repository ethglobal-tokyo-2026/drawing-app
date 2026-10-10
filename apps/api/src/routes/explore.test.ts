import { MAX_HITS } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  exploreSchema,
  PILE_PAGE_SIZE,
  pilePageSchema,
  type PilePage,
} from "../explore/explore.ts";
import { LEADERBOARD_SIZE, type LeaderboardRow } from "../explore/leaderboards.ts";
import { USER_SEARCH_SIZE } from "../explore/userSearch.ts";
import { personSchema, userStatsSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import {
  FEW_HITS,
  giveSticker,
  insertSealedSticker,
  MORE_HITS,
  OWN_TAP,
  sendGratitude,
  SHARED_TAP,
} from "../testing/rows.ts";
import { addDays, tokyoTicketDay, tokyoTicketDayStart } from "../ticketDays.ts";

const MINUTE_MS = 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;
/** With SHARED_TAP's giver's part, more than OWN_TAP and SHARED_TAP's share together. */
const SMALL_TAP = { method: "tap", total: 45 } as const;
/** Fewer than MORE_HITS. */
const SOME_HITS = 30;
/** Consecutive seal days, reaching back further than the last few days. */
const LONG_STREAK = 5;

const userSearchSchema = z.object({ users: z.array(personSchema) });
const userStatsResponseSchema = z.object({ userStats: userStatsSchema });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

/** Deletes the account the way its owner does. */
async function deleteAccount(userId: string) {
  expect((await test.send("DELETE", "/api/me", { as: userId })).status).toBe(204);
}

const exploreAs = async (viewerId: string) =>
  bodyOf(await test.send("GET", "/api/explore", { as: viewerId }), exploreSchema);

const pilePath = (before: string) =>
  `/api/explore/pile?${new URLSearchParams({ before }).toString()}`;

const olderPileAs = async (viewerId: string, before: string) =>
  bodyOf(await test.send("GET", pilePath(before), { as: viewerId }), pilePageSchema);

/** Every page of the pile `viewerId` gets: Explore's first, then each page's `before` in turn. */
async function wholePile(viewerId: string) {
  const pages: PilePage[] = [(await exploreAs(viewerId)).pile];
  for (let before = pages[0].before; before !== null; before = pages[pages.length - 1].before) {
    if (pages.length > 10) throw new Error("The pile never ends");
    pages.push(await olderPileAs(viewerId, before));
  }
  return pages;
}

const pileIds = (page: PilePage) => page.stickers.map(({ sticker }) => sticker.id);

const weekStartFor = async (viewerId: string) =>
  new Date((await exploreAs(viewerId)).leaderboards.weekStart);

/** `userId`'s current streak, as their stat board shows it. */
const statBoardStreak = async (viewerId: string, userId: string) => {
  const response = await test.send("GET", `/api/sticker-boards/${userId}/user-stats`, {
    as: viewerId,
  });
  return (await bodyOf(response, userStatsResponseSchema)).userStats.streak;
};

const msAfter = (at: Date, ms: number) => new Date(at.getTime() + ms);

/** When the ticket day `daysAgo` days before today's began. */
const dayStart = (daysAgo = 0) =>
  tokyoTicketDayStart(addDays(tokyoTicketDay(test.clock.now()), -daysAgo));

/** Moments a minute apart from `start`: each call answers the next. */
function minuteByMinute(start: Date) {
  let minutes = 0;
  return () => msAfter(start, minutes++ * MINUTE_MS);
}

/** Seals a sticker by `artistId` at `sealedAt`, by default now on the test's clock. */
const seal = (artistId: string, sealedAt = test.clock.now()) =>
  insertSealedSticker(test.db, artistId, { createdAt: sealedAt });

/** sendGratitude, recorded now on the test's clock unless `combo` says when. */
const sendGratitudeNow = (
  stickerId: string,
  giverId: string,
  receiverId: string,
  combo: Parameters<typeof sendGratitude>[4] = {},
) =>
  sendGratitude(test.db, stickerId, giverId, receiverId, {
    createdAt: test.clock.now(),
    ...combo,
  });

const idsAndValues = (board: LeaderboardRow[]) =>
  board.map(({ person, value }) => [person.id, value]);

/** The weekday of the ticket day `at` falls in. */
const weekdayOf = (at: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(tokyoTicketDay(at)),
  );

describe("GET /api/explore", () => {
  it("pages back through every sticker newest first, none twice and none missed, ties on the seal included", async () => {
    const me = insertUser(test.db);
    const start = dayStart(1);
    // Numbers that disagree with the seals: the newest go in first, and a tie runs across a page's edge.
    const newest = Array.from({ length: 2 }, () => seal(me, msAfter(start, 2 * MINUTE_MS)));
    const oldest = seal(me, start);
    const tied = Array.from({ length: PILE_PAGE_SIZE }, () => seal(me, msAfter(start, MINUTE_MS)));

    const pages = await wholePile(me);
    expect(pages.map(({ stickers }) => stickers.length)).toEqual([PILE_PAGE_SIZE, 3]);
    expect(pages.flatMap(pileIds)).toEqual([...newest.toReversed(), ...tied.toReversed(), oldest]);
  });

  it("tags each sticker with who it was last given to, on the day it was sealed", async () => {
    const artist = insertUser(test.db);
    const friend = insertUser(test.db);
    const third = insertUser(test.db);
    const next = minuteByMinute(dayStart(2));
    const given = seal(artist, next());
    const kept = seal(artist, next());
    giveSticker(test.db, given, artist, friend, next());
    giveSticker(test.db, given, friend, third, next());

    const { pile } = await exploreAs(artist);
    expect(pile.stickers.map(({ sticker, givenTo }) => [sticker.id, givenTo?.id ?? null])).toEqual([
      [kept, null],
      [given, third],
    ]);
  });

  it("veils an NSFW sticker on an older page to anyone without the NSFW opt-in", async () => {
    const optedIn = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    const optedOut = insertUser(test.db);
    const contentHash = bytes32("drawing");
    const veiledHash = bytes32("veiled image");
    const nsfw = insertSealedSticker(test.db, optedIn, {
      nsfw: true,
      contentHash,
      veiledHash,
      createdAt: dayStart(3),
    });
    for (let i = 0; i < PILE_PAGE_SIZE; i++) seal(optedIn);

    const imagesOnPageTwo = async (viewerId: string) => {
      const { before } = (await exploreAs(viewerId)).pile;
      if (before === null) throw new Error("The pile has no second page");
      const { stickers } = await olderPileAs(viewerId, before);
      return stickers.find(({ sticker }) => sticker.id === nsfw)?.sticker.images;
    };
    expect(await imagesOnPageTwo(optedOut)).toEqual(
      test.images.veiledUrls(contentHash, veiledHash),
    );
    // Sealed without a sharp copy.
    expect(await imagesOnPageTwo(optedIn)).toEqual({
      ...test.images.urls(contentHash),
      sharp: null,
    });
  });

  it("starts the week as Monday's ticket day starts, the last one before now", async () => {
    const me = insertUser(test.db);
    const weekStart = await weekStartFor(me);
    expect(weekdayOf(weekStart)).toBe("Monday");
    expect(weekStart).toEqual(tokyoTicketDayStart(tokyoTicketDay(weekStart)));
    expect(weekStart.getTime()).toBeLessThanOrEqual(test.clock.now().getTime());
    expect(test.clock.now().getTime() - weekStart.getTime()).toBeLessThan(WEEK_MS);

    test.clock.set(msAfter(weekStart, WEEK_MS - 1));
    expect(await weekStartFor(me)).toEqual(weekStart);
    test.clock.set(msAfter(weekStart, WEEK_MS));
    expect(await weekStartFor(me)).toEqual(msAfter(weekStart, WEEK_MS));
  });

  it("ranks mostGratitude by this week's giver's parts and Original Artist Gratitude Shares", async () => {
    const artist = insertUser(test.db);
    const giver = insertUser(test.db);
    const receiver = insertUser(test.db);
    const lastWeeks = insertUser(test.db);
    const weekStart = await weekStartFor(receiver);
    const drawn = seal(artist);
    giveSticker(test.db, drawn, artist, giver);
    sendGratitudeNow(drawn, giver, receiver, SHARED_TAP);
    sendGratitudeNow(seal(artist), artist, receiver, OWN_TAP);
    sendGratitudeNow(seal(giver), giver, receiver, { ...SMALL_TAP, createdAt: weekStart });
    sendGratitudeNow(seal(lastWeeks), lastWeeks, receiver, {
      ...OWN_TAP,
      createdAt: msAfter(weekStart, -1),
    });

    const share = SHARED_TAP.originalArtistGratitudeShare;
    const { mostGratitude } = (await exploreAs(receiver)).leaderboards;
    expect(idsAndValues(mostGratitude)).toEqual([
      [giver, SHARED_TAP.total - share + SMALL_TAP.total],
      [artist, share + OWN_TAP.total],
    ]);
  });

  it("ranks bestCombo by each receiver's most hits in one combo this week", async () => {
    const giver = insertUser(test.db);
    const steady = insertUser(test.db);
    const lastWeeksBest = insertUser(test.db);
    const weekStart = await weekStartFor(giver);
    sendGratitudeNow(seal(giver), giver, steady, { hits: FEW_HITS });
    sendGratitudeNow(seal(giver), giver, steady, { hits: MORE_HITS });
    sendGratitudeNow(seal(giver), giver, lastWeeksBest, {
      hits: MAX_HITS,
      createdAt: msAfter(weekStart, -1),
    });
    sendGratitudeNow(seal(giver), giver, lastWeeksBest, { hits: SOME_HITS });

    const { bestCombo } = (await exploreAs(giver)).leaderboards;
    expect(idsAndValues(bestCombo)).toEqual([
      [steady, MORE_HITS],
      [lastWeeksBest, SOME_HITS],
    ]);
  });

  it("ranks longestStreak by current streaks over ticket days, as stat boards count them, leaving out people at 0", async () => {
    const steady = insertUser(test.db);
    const nightOwl = insertUser(test.db);
    const lapsed = insertUser(test.db);
    for (let daysAgo = 0; daysAgo < LONG_STREAK; daysAgo++) seal(steady, dayStart(daysAgo));
    // Just before and just after midnight in Tokyo: two ticket days.
    const aroundMidnight = [msAfter(dayStart(), -1), dayStart()];
    for (const sealedAt of aroundMidnight) seal(nightOwl, sealedAt);
    // The last moment of the day before yesterday, so yesterday was missed.
    seal(lapsed, msAfter(dayStart(1), -1));

    const { longestStreak } = (await exploreAs(lapsed)).leaderboards;
    expect(idsAndValues(longestStreak)).toEqual([
      [steady, LONG_STREAK],
      [nightOwl, aroundMidnight.length],
    ]);
    for (const { person, value } of longestStreak) {
      expect(await statBoardStreak(lapsed, person.id)).toBe(value);
    }
  });

  it("lists at most LEADERBOARD_SIZE people per board, ties A to Z by handle, and no deleted account", async () => {
    const count = LEADERBOARD_SIZE + 1;
    const handleOf = (index: number) =>
      `${index % 2 === 0 ? "artist" : "ARTIST"}${String(index).padStart(String(count).length, "0")}`;
    // Inserted Z to A, so neither insertion nor id order gives the handles' order.
    const live = Array.from({ length: count }, (_, index) => handleOf(count - 1 - index))
      .map((handle) => insertUser(test.db, { handle }))
      .reverse();
    const deleted = insertUser(test.db, { handle: "aardvark" });
    // A ring: everyone seals once today, gives it to the next, and gets the same gratitude combo.
    const everyone = [deleted, ...live];
    everyone.forEach((userId, index) => {
      sendGratitudeNow(seal(userId), userId, everyone[(index + 1) % everyone.length]);
    });
    await deleteAccount(deleted);

    const { mostGratitude, bestCombo, longestStreak } = (await exploreAs(live[0])).leaderboards;
    const firstAToZ = live.slice(0, LEADERBOARD_SIZE);
    for (const board of [mostGratitude, bestCombo, longestStreak]) {
      expect(board.map(({ person }) => person.id)).toEqual(firstAToZ);
    }
  });
});

describe("GET /api/explore/pile", () => {
  it("refuses a missing cursor, or one no page gave", async () => {
    const me = insertUser(test.db);
    const bad = ["", "soon", "1727740800000", "1727740800000-", "-147", "1.5-147", "1-2-3"];
    for (const path of [
      "/api/explore/pile",
      ...bad.map(pilePath),
      pilePath(`${"9".repeat(16)}-1`),
    ]) {
      expect(await refusalOf(await test.send("GET", path, { as: me }))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

const searchPath = (handle: string) => `/api/users?${new URLSearchParams({ handle }).toString()}`;

/** The handles `viewerId` finds searching for `handle`, in the order answered. */
const handlesFound = async (viewerId: string, handle: string) => {
  const response = await test.send("GET", searchPath(handle), { as: viewerId });
  const { users } = await bodyOf(response, userSearchSchema);
  return users.map((user) => user.handle);
};

describe("GET /api/users", () => {
  it("finds handles starting with the query first, then containing it, A to Z, ignoring letter case", async () => {
    const me = insertUser(test.db);
    for (const handle of ["malice", "bob", "alice", "Kali", "ALIBI"]) {
      insertUser(test.db, { handle });
    }
    await deleteAccount(insertUser(test.db, { handle: "alien" }));

    const found = ["ALIBI", "alice", "Kali", "malice"];
    expect(await handlesFound(me, "ali")).toEqual(found);
    expect(await handlesFound(me, " @ALI ")).toEqual(found);
    // Full-width, as a Japanese keyboard can type it, with a full-width @.
    expect(await handlesFound(me, "＠ＡＬＩ")).toEqual(found);
    expect(await handlesFound(me, "alie")).toEqual([]);
  });

  it("answers at most USER_SEARCH_SIZE people", async () => {
    const me = insertUser(test.db);
    for (let index = 0; index <= USER_SEARCH_SIZE; index++) {
      insertUser(test.db, { handle: `artist${index}` });
    }
    expect(await handlesFound(me, "artist")).toHaveLength(USER_SEARCH_SIZE);
  });

  it("refuses a missing or blank handle", async () => {
    const me = insertUser(test.db);
    for (const path of ["/api/users", searchPath(""), searchPath(" "), searchPath("@")]) {
      expect(await refusalOf(await test.send("GET", path, { as: me }))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});
