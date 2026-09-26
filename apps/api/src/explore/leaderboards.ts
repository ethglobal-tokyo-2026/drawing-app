import { gifts, gratitude, stickers, users, type Db } from "@drawing-app/db";
import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { isoTimeSchema, personSchema, toIsoTime, toPerson, type Person } from "../shapes.ts";
import { streakOf } from "../streak.ts";
import { addDays, ticketDay, ticketDayStart } from "../ticketDays.ts";

/** The most people each leaderboard lists. */
export const LEADERBOARD_SIZE = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * A current streak has a seal on its person's today or yesterday, which in any zone began less than
 * this long ago; only people who sealed within it can have one.
 */
const STREAK_LOOKBACK_MS = 3 * DAY_MS;
const DAYS_IN_WEEK = 7;
/** Monday, as Date's getUTCDay counts. */
const MONDAY = 1;

const leaderboardRowSchema = z.object({ person: personSchema, value: z.number().int().positive() });
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const leaderboardsSchema = z.object({
  /** When this week's Monday ticket day began, on Explore's clock. */
  weekStart: isoTimeSchema,
  /** The giver's part plus Original Artist Gratitude Shares received this week. */
  mostThanked: z.array(leaderboardRowSchema),
  /** The most hits in one combo this week. */
  bestCombo: z.array(leaderboardRowSchema),
  /** Current streaks, each counted in its person's own zone. */
  longestStreak: z.array(leaderboardRowSchema),
});
type Leaderboards = z.infer<typeof leaderboardsSchema>;

/** When the week `at` falls in began: the start of the Monday ticket day on or before it. */
function weekStart(at: Date, timeZone: string): Date {
  const today = ticketDay(at, timeZone);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const monday = addDays(today, -((weekday - MONDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  return ticketDayStart(monday, timeZone);
}

const addTo = (values: Map<string, number>, personId: string, value: number) =>
  values.set(personId, (values.get(personId) ?? 0) + value);

/** Since `since`: each person's part of the gratitude, and each thanker's most hits in one combo. */
function gratitudeSince(db: Db, since: Date) {
  const thankers = alias(users, "thanker");
  const combos = db
    .select({
      giverId: gifts.giverId,
      artistId: stickers.artistId,
      thankerId: thankers.id,
      hits: gratitude.hits,
      total: gratitude.total,
      share: gratitude.originalArtistGratitudeShare,
    })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .innerJoin(thankers, eq(thankers.id, gifts.receiverId))
    .where(gte(gratitude.createdAt, since))
    .all();
  const thanked = new Map<string, number>();
  const bestCombo = new Map<string, number>();
  for (const combo of combos) {
    addTo(thanked, combo.giverId, combo.total - combo.share);
    addTo(thanked, combo.artistId, combo.share);
    bestCombo.set(combo.thankerId, Math.max(bestCombo.get(combo.thankerId) ?? 0, combo.hits));
  }
  return { thanked, bestCombo };
}

/** Each recent artist's current streak, over the ticket days of all their seals in their own zone. */
function currentStreaks(db: Db, now: Date): Map<string, number> {
  const recentArtists = db
    .selectDistinct({ artistId: stickers.artistId })
    .from(stickers)
    .where(gte(stickers.createdAt, new Date(now.getTime() - STREAK_LOOKBACK_MS)));
  const seals = db
    .select({ artistId: stickers.artistId, sealedAt: stickers.createdAt, timeZone: users.timeZone })
    .from(stickers)
    .innerJoin(users, eq(users.id, stickers.artistId))
    .where(inArray(stickers.artistId, recentArtists))
    .all();
  const artists = new Map<string, { timeZone: string; sealDays: string[] }>();
  for (const { artistId, sealedAt, timeZone } of seals) {
    const artist = artists.get(artistId) ?? { timeZone, sealDays: [] };
    artist.sealDays.push(ticketDay(sealedAt, timeZone));
    artists.set(artistId, artist);
  }
  return new Map(
    [...artists].map(([artistId, { timeZone, sealDays }]) => [
      artistId,
      streakOf(sealDays, ticketDay(now, timeZone)).current,
    ]),
  );
}

/** Live people among `ids`, A to Z by handle with letter case folded as SQLite's `lower` does, then by id. */
function livePeopleAToZ(db: Db, ids: Set<string>): Person[] {
  if (ids.size === 0) return [];
  return db
    .select()
    .from(users)
    .where(and(inArray(users.id, [...ids]), isNull(users.deletedAt)))
    .orderBy(asc(sql`lower(${users.handle})`), asc(users.id))
    .all()
    .map((user) => toPerson(user));
}

/**
 * The people with a value above 0, highest first. The sort is stable, so ties keep `peopleAToZ`'s
 * order; deleted accounts aren't in it, having no name to show.
 */
const leaderboard = (values: Map<string, number>, peopleAToZ: Person[]): LeaderboardRow[] =>
  peopleAToZ
    .flatMap((person) => {
      const value = values.get(person.id) ?? 0;
      return value > 0 ? [{ person, value }] : [];
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, LEADERBOARD_SIZE);

/** This week's leaderboards, the week starting on Monday in `timeZone`. */
export function loadLeaderboards(db: Db, now: Date, timeZone: string): Leaderboards {
  const since = weekStart(now, timeZone);
  const { thanked, bestCombo } = gratitudeSince(db, since);
  const streaks = currentStreaks(db, now);
  const people = livePeopleAToZ(
    db,
    new Set([...thanked.keys(), ...bestCombo.keys(), ...streaks.keys()]),
  );
  return {
    weekStart: toIsoTime(since),
    mostThanked: leaderboard(thanked, people),
    bestCombo: leaderboard(bestCombo, people),
    longestStreak: leaderboard(streaks, people),
  };
}
