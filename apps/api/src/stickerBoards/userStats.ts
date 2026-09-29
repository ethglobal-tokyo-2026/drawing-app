import { gifts, gratitude, stickers, users, type Db } from "@drawing-app/db";
import { and, count, eq, max, type SQL } from "drizzle-orm";
import { gratitudeParts } from "../gratitudeParts.ts";
import { toIsoTime, type UserStats } from "../shapes.ts";
import { streakOf } from "../streak.ts";
import { tokyoTicketDay } from "../ticketDays.ts";

/** Gifts matching `where` that were received: only a received gift counts as given or received. */
const receivedGiftCount = (db: Db, where: SQL) =>
  db
    .select({ n: count() })
    .from(gifts)
    .where(and(eq(gifts.status, "received"), where))
    .get()?.n ?? 0;

/** Combos on gifts matching `where`, with each gift's giver and its sticker's Original Artist. */
const combosWhere = (db: Db, where: SQL) =>
  db
    .select({
      giftId: gratitude.giftId,
      total: gratitude.total,
      share: gratitude.originalArtistGratitudeShare,
      recordedAt: gratitude.createdAt,
      giverId: gifts.giverId,
      artistId: stickers.artistId,
    })
    .from(gratitude)
    .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
    .innerJoin(stickers, eq(stickers.id, gifts.stickerId))
    .where(where)
    .all();

/** A person's User Stats. The streak and a day's gratitude count Tokyo ticket days, as everyone's do. */
export function loadUserStats(db: Db, user: typeof users.$inferSelect, now: Date): UserStats {
  const sealDays = db
    .select({ sealedAt: stickers.createdAt })
    .from(stickers)
    .where(eq(stickers.artistId, user.id))
    .all()
    .map(({ sealedAt }) => tokyoTicketDay(sealedAt));
  const bestCombo =
    db
      .select({ hits: max(gratitude.hits) })
      .from(gratitude)
      .innerJoin(gifts, eq(gifts.id, gratitude.giftId))
      .where(eq(gifts.receiverId, user.id))
      .get()?.hits ?? 0;
  // Every combo that gave the person something: as its gift's giver, or as the Original Artist. A
  // select for each, since an OR across both can't use either index; a combo in both counts once.
  const combos = new Map(
    [
      ...combosWhere(db, eq(gifts.giverId, user.id)),
      ...combosWhere(db, eq(stickers.artistId, user.id)),
    ].map((combo) => [combo.giftId, combo]),
  );

  const gratitudeTotals = { direct: 0, residual: 0 };
  const gratitudeByDay = new Map<string, number>();
  for (const combo of combos.values()) {
    const day = tokyoTicketDay(combo.recordedAt);
    for (const { personId, part, value } of gratitudeParts(combo)) {
      if (personId !== user.id) continue;
      gratitudeTotals[part] += value;
      gratitudeByDay.set(day, (gratitudeByDay.get(day) ?? 0) + value);
    }
  }
  const streak = streakOf(sealDays, tokyoTicketDay(now));

  return {
    since: toIsoTime(user.createdAt),
    made: sealDays.length,
    received: receivedGiftCount(db, eq(gifts.receiverId, user.id)),
    given: receivedGiftCount(db, eq(gifts.giverId, user.id)),
    gratitude: { ...gratitudeTotals, total: gratitudeTotals.direct + gratitudeTotals.residual },
    bests: {
      bestCombo,
      mostGratitudeInADay: Math.max(0, ...gratitudeByDay.values()),
      longestStreak: streak.best,
    },
    streak: streak.current,
  };
}
