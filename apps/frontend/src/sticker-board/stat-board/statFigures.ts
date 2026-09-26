import type { UserStats } from "@drawing-app/api/client";
import type { CorkFigures } from "./StatCork";

type StatFigures = Pick<
  CorkFigures,
  "gratitude" | "streak" | "stamps" | "bestCombo" | "mostGratitudeInADay"
>;

/** Someone's User Stats as the cork pins them; null stats, when they didn't load, show as unknown. */
export function statFigures(stats: UserStats | null): StatFigures {
  if (!stats) {
    return {
      gratitude: null,
      streak: null,
      stamps: { made: null, received: null, given: null },
      bestCombo: null,
      mostGratitudeInADay: null,
    };
  }
  return {
    gratitude: stats.gratitude,
    streak: { current: stats.streak, best: stats.bests.longestStreak },
    stamps: { made: stats.made, received: stats.received, given: stats.given },
    bestCombo: stats.bests.bestCombo,
    mostGratitudeInADay: stats.bests.mostGratitudeInADay,
  };
}
