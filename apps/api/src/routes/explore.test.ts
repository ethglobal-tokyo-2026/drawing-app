import { MAX_HITS } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { errorBodySchema } from "../errors.ts";
import {
  EXPLORE_LIST_SIZE,
  EXPLORE_TIME_ZONE,
  exploreSchema,
  type Explore,
} from "../explore/explore.ts";
import { LEADERBOARD_SIZE, type LeaderboardRow } from "../explore/leaderboards.ts";
import { USER_SEARCH_SIZE } from "../explore/userSearch.ts";
import { personSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "../testing/rows.ts";
import { addDays, TICKET_DAY_START_HOUR, ticketDay, ticketDayStart } from "../ticketDays.ts";

const MINUTE_MS = 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * MINUTE_MS;
/** A zone whose ticket days start at another moment than Tokyo's. */
const NEW_YORK = "America/New_York";
/** A combo on a gift its Original Artist didn't give: their share comes out of the giver's part. */
const SHARED_TAP = { method: "tap", total: 100, originalArtistGratitudeShare: 20 } as const;
/** More than SHARED_TAP's share, less than its giver's part. */
const OWN_TAP = { method: "tap", total: 90 } as const;
/** With SHARED_TAP's giver's part, more than OWN_TAP and SHARED_TAP's share together. */
const SMALL_TAP = { method: "tap", total: 45 } as const;
const FEW_HITS = 12;
const SOME_HITS = 30;
const MORE_HITS = 64;
/** Consecutive seal days, reaching back further than the last few days. */
const LONG_STREAK = 5;

const userSearchSchema = z.object({ users: z.array(personSchema) });

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});

const request = async (userId: string, path: string, method = "GET") =>
  test.app.request(path, { method, headers: await test.signInAs(userId) });

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

/** Deletes the account the way its owner does. */
async function deleteAccount(userId: string) {
  expect((await request(userId, "/api/me", "DELETE")).status).toBe(204);
}

const exploreAs = async (viewerId: string) =>
  okBody(await request(viewerId, "/api/explore"), exploreSchema);

const weekStartFor = async (viewerId: string) =>
  new Date((await exploreAs(viewerId)).leaderboards.weekStart);

const msAfter = (at: Date, ms: number) => new Date(at.getTime() + ms);

/** When today began on Explore's clock. */
const todayStart = () =>
  ticketDayStart(ticketDay(test.clock.now(), EXPLORE_TIME_ZONE), EXPLORE_TIME_ZONE);

/** Moments a minute apart from `start`: each call answers the next. */
function minuteByMinute(start: Date) {
  let minutes = 0;
  return () => msAfter(start, minutes++ * MINUTE_MS);
}

/** Seals a sticker by `artistId` at `sealedAt`, by default now on the test's clock. */
const seal = (artistId: string, sealedAt = test.clock.now()) =>
  insertSealedSticker(test.db, artistId, { createdAt: sealedAt });

/** `giverId` gives `stickerId` to `receiverId`: packed, then received. */
const give = (stickerId: string, giverId: string, receiverId: string, receivedAt?: Date) =>
  receiveGift(test.db, packGift(test.db, stickerId, giverId), receiverId, receivedAt);

/** `giverId` gives `stickerId` to `receiverId`, who sends gratitude as `combo`, by default now. */
const giveAndSendGratitude = (
  stickerId: string,
  giverId: string,
  receiverId: string,
  combo: Parameters<typeof insertGratitude>[2] = {},
) =>
  insertGratitude(test.db, give(stickerId, giverId, receiverId).id, {
    createdAt: test.clock.now(),
    ...combo,
  });

const stickerIds = (stickers: { id: string }[]) => stickers.map(({ id }) => id);

const idsAndValues = (board: LeaderboardRow[]) =>
  board.map(({ person, value }) => [person.id, value]);

/** An activity entry by its ids. A seal's time is its sticker's, which the sticker carries. */
function summary(entry: Explore["activity"][number]) {
  if (entry.type === "sealed") {
    expect(entry.at).toBe(entry.sticker.sealedAt);
    return { type: entry.type, stickerId: entry.sticker.id };
  }
  return {
    type: entry.type,
    at: entry.at,
    stickerId: entry.sticker.id,
    giverId: entry.giver.id,
    receiverId: entry.receiver.id,
  };
}

/** Weekday, hour and minute on Tokyo's clock. */
function tokyoClock(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EXPLORE_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((found) => found.type === type)?.value;
  return { weekday: part("weekday"), hour: Number(part("hour")), minute: Number(part("minute")) };
}

describe("GET /api/explore", () => {
  it("lists stickers sealed since today began in Tokyo, newest first, up to EXPLORE_LIST_SIZE", async () => {
    const me = insertUser(test.db);
    const start = todayStart();
    seal(me, msAfter(start, -1));
    const atStart = seal(me, start);
    expect(stickerIds((await exploreAs(me)).todaysStickers)).toEqual([atStart]);

    const next = minuteByMinute(msAfter(start, MINUTE_MS));
    const later = Array.from({ length: EXPLORE_LIST_SIZE }, () => seal(me, next()));
    expect(stickerIds((await exploreAs(me)).todaysStickers)).toEqual([...later].reverse());
  });

  it("interleaves seals and receives newest first, each receive with its giver and receiver, up to EXPLORE_LIST_SIZE", async () => {
    const artist = insertUser(test.db);
    const friend = insertUser(test.db);
    const next = minuteByMinute(todayStart());
    const first = seal(artist, next());
    const second = seal(artist, next());
    const firstGift = give(first, artist, friend, next());
    const third = seal(friend, next());
    const secondGift = give(second, artist, friend, next());
    const received = (gift: typeof firstGift) => ({
      type: "received",
      at: gift.receivedAt?.toISOString(),
      stickerId: gift.stickerId,
      giverId: artist,
      receiverId: friend,
    });

    expect((await exploreAs(artist)).activity.map(summary)).toEqual([
      received(secondGift),
      { type: "sealed", stickerId: third },
      received(firstGift),
      { type: "sealed", stickerId: second },
      { type: "sealed", stickerId: first },
    ]);

    const newer = Array.from({ length: EXPLORE_LIST_SIZE }, () => seal(friend, next()));
    const { activity } = await exploreAs(artist);
    expect(activity.map(({ sticker }) => sticker.id)).toEqual([...newer].reverse());
  });

  it("starts the week at the start of Monday's ticket day in Tokyo, the last one before now", async () => {
    const me = insertUser(test.db);
    const weekStart = await weekStartFor(me);
    expect(tokyoClock(weekStart)).toEqual({
      weekday: "Monday",
      hour: TICKET_DAY_START_HOUR,
      minute: 0,
    });
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
    give(drawn, artist, giver);
    giveAndSendGratitude(drawn, giver, receiver, SHARED_TAP);
    giveAndSendGratitude(seal(artist), artist, receiver, OWN_TAP);
    giveAndSendGratitude(seal(giver), giver, receiver, { ...SMALL_TAP, createdAt: weekStart });
    giveAndSendGratitude(seal(lastWeeks), lastWeeks, receiver, {
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
    giveAndSendGratitude(seal(giver), giver, steady, { hits: FEW_HITS });
    giveAndSendGratitude(seal(giver), giver, steady, { hits: MORE_HITS });
    giveAndSendGratitude(seal(giver), giver, lastWeeksBest, {
      hits: MAX_HITS,
      createdAt: msAfter(weekStart, -1),
    });
    giveAndSendGratitude(seal(giver), giver, lastWeeksBest, { hits: SOME_HITS });

    const { bestCombo } = (await exploreAs(giver)).leaderboards;
    expect(idsAndValues(bestCombo)).toEqual([
      [steady, MORE_HITS],
      [lastWeeksBest, SOME_HITS],
    ]);
  });

  it("ranks longestStreak by current streaks, each in its person's own zone, leaving out people at 0", async () => {
    const tokyo = insertUser(test.db);
    const newYork = insertUser(test.db, { timeZone: NEW_YORK });
    const lapsed = insertUser(test.db);
    const today = ticketDay(test.clock.now(), EXPLORE_TIME_ZONE);
    for (let daysAgo = 0; daysAgo < LONG_STREAK; daysAgo++) {
      seal(tokyo, ticketDayStart(addDays(today, -daysAgo), EXPLORE_TIME_ZONE));
    }
    // New York's yesterday and today, both within one of Tokyo's ticket days.
    const newYorkToday = ticketDayStart(ticketDay(test.clock.now(), NEW_YORK), NEW_YORK);
    const newYorkSeals = [msAfter(newYorkToday, -1), newYorkToday];
    for (const sealedAt of newYorkSeals) seal(newYork, sealedAt);
    const dayBeforeYesterday = addDays(addDays(today, -1), -1);
    seal(lapsed, ticketDayStart(dayBeforeYesterday, EXPLORE_TIME_ZONE));

    const { longestStreak } = (await exploreAs(lapsed)).leaderboards;
    expect(idsAndValues(longestStreak)).toEqual([
      [tokyo, LONG_STREAK],
      [newYork, newYorkSeals.length],
    ]);
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
      giveAndSendGratitude(seal(userId), userId, everyone[(index + 1) % everyone.length]);
    });
    await deleteAccount(deleted);

    const { mostGratitude, bestCombo, longestStreak } = (await exploreAs(live[0])).leaderboards;
    const firstAToZ = live.slice(0, LEADERBOARD_SIZE);
    for (const board of [mostGratitude, bestCombo, longestStreak]) {
      expect(board.map(({ person }) => person.id)).toEqual(firstAToZ);
    }
  });
});

const searchPath = (handle: string) => `/api/users?${new URLSearchParams({ handle }).toString()}`;

/** The handles `viewerId` finds searching for `handle`, in the order answered. */
const handlesFound = async (viewerId: string, handle: string) => {
  const { users } = await okBody(await request(viewerId, searchPath(handle)), userSearchSchema);
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
      expect(await refusal(await request(me, path))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("explore routes", () => {
  it("refuse a request without the session cookie", async () => {
    for (const path of ["/api/explore", searchPath("ali")]) {
      expect(await refusal(await test.app.request(path))).toMatchObject({
        status: 401,
        error: "signed_out",
      });
    }
  });
});
