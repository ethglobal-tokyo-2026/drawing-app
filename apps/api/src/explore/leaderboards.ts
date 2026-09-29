import { gifts, gratitude, stickers, users, type Db } from "@drawing-app/db";
import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { gratitudeParts } from "../gratitudeParts.ts";
import { isoTimeSchema, personSchema, toIsoTime, toPerson, type Person } from "../shapes.ts";
import { streakOf } from "../streak.ts";
import { addDays, tokyoTicketDay, tokyoTicketDayStart } from "../ticketDays.ts";

/** The most people each leaderboard lists. */
export const LEADERBOARD_SIZE = 10;

const DAYS_IN_WEEK = 7;
/** Monday, as Date's getUTCDay counts. */
const MONDAY = 1;

const leaderboardRowSchema = z.object({ person: personSchema, value: z.number().int().positive() });
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const leaderboardsSchema = z.object({
  /** When this week's Monday ticket day began. */
  weekStart: isoTimeSchema,
  /** The giver's part plus Original Artist Gratitude Shares received this week. */
  mostGratitude: z.array(leaderboardRowSchema),
  /** The most hits in one combo this week. */
  bestCombo: z.array(leaderboardRowSchema),
  /** Current streaks, as each person's User Stats count them. */
  longestStreak: z.array(leaderboardRowSchema),
});
type Leaderboards = z.infer<typeof leaderboardsSchema>;

/** When the week `at` falls in began: the start of the Monday ticket day on or before it. */
function weekStart(at: Date): Date {
  const today = tokyoTicketDay(at);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const monday = addDays(today, -((weekday - MONDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  return tokyoTicketDayStart(monday);
}

const addTo = (values: Map<string, number>, personId: string, value: number) =>
  values.set(personId, (values.get(personId) ?? 0) + value);

/** Since `since`: each person's part of the gratitude, and each receiver's most hits in one combo. */
function gratitudeSince(db: Db, since: Date) {
  const receivers = alias(users, "receiver");
  const combos = db
    .select({
      giverId: gifts.giverId,
      artistId: stickers.artistId,
      receiverId: receivers.id,
      hits: gratitude.hits,
      total: gratitude.total,
      share: gratitude.originalArtistGratitudeShare,
    })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .innerJoin(receivers, eq(receivers.id, gifts.receiverId))
    .where(gte(gratitude.createdAt, since))
    .all();
  const gratitudeByPerson = new Map<string, number>();
  const bestCombo = new Map<string, number>();
  for (const combo of combos) {
    for (const { personId, value } of gratitudeParts(combo)) {
      addTo(gratitudeByPerson, personId, value);
    }
    bestCombo.set(combo.receiverId, Math.max(bestCombo.get(combo.receiverId) ?? 0, combo.hits));
  }
  return { gratitudeByPerson, bestCombo };
}

/** Each recent artist's current streak, over the ticket days of all their seals, as User Stats count it. */
function currentStreaks(db: Db, now: Date): Map<string, number> {
  const today = tokyoTicketDay(now);
  // A current streak has a seal today or yesterday, so only those artists can have one.
  const recentArtists = db
    .selectDistinct({ artistId: stickers.artistId })
    .from(stickers)
    .where(gte(stickers.createdAt, tokyoTicketDayStart(addDays(today, -1))));
  const seals = db
    .select({ artistId: stickers.artistId, sealedAt: stickers.createdAt })
    .from(stickers)
    .where(inArray(stickers.artistId, recentArtists))
    .all();
  const sealDays = new Map<string, string[]>();
  for (const { artistId, sealedAt } of seals) {
    const days = sealDays.get(artistId) ?? [];
    days.push(tokyoTicketDay(sealedAt));
    sealDays.set(artistId, days);
  }
  return new Map(
    [...sealDays].map(([artistId, days]) => [artistId, streakOf(days, today).current]),
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

/** This week's leaderboards, the week starting with Monday's ticket day. */
export function loadLeaderboards(db: Db, now: Date): Leaderboards {
  const since = weekStart(now);
  const { gratitudeByPerson, bestCombo } = gratitudeSince(db, since);
  const streaks = currentStreaks(db, now);
  const people = livePeopleAToZ(
    db,
    new Set([...gratitudeByPerson.keys(), ...bestCombo.keys(), ...streaks.keys()]),
  );
  return {
    weekStart: toIsoTime(since),
    mostGratitude: leaderboard(gratitudeByPerson, people),
    bestCombo: leaderboard(bestCombo, people),
    longestStreak: leaderboard(streaks, people),
  };
}
