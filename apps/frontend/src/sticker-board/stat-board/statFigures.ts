import type { UserStats } from "@drawing-app/api/client";
import { formatRefillTime } from "../../tickets/refill";
import { nextRefill } from "../../tickets/tickets";
import type { CorkFigures } from "./StatCork";

type StatFigures = Pick<
  CorkFigures,
  "gratitude" | "streak" | "streakRule" | "stamps" | "bestCombo" | "mostGratitudeInADay"
>;

/** Someone's User Stats as the cork pins them; null stats, when they didn't load, show as unknown. */
export function statFigures(stats: UserStats | null, own: boolean, now: Date): StatFigures {
  const turnover = formatRefillTime(nextRefill(now));
  if (!stats) {
    return {
      gratitude: null,
      streak: null,
      streakRule: own ? "Your stats didn’t load." : "Their stats didn’t load.",
      stamps: { made: null, received: null, given: null },
      bestCombo: null,
      mostGratitudeInADay: null,
    };
  }
  return {
    gratitude: stats.gratitude,
    streak: { current: stats.streak, best: stats.bests.longestStreak },
    streakRule:
      stats.streak > 0
        ? `Miss a day and it goes back to zero. Days turn over at ${turnover}.`
        : own
          ? "Draw a sticker today to start one."
          : "It starts the first day they draw.",
    stamps: { made: stats.made, received: stats.received, given: stats.given },
    bestCombo: stats.bests.bestCombo,
    mostGratitudeInADay: stats.bests.mostGratitudeInADay,
  };
}
