import { addDays } from "./ticketDays.ts";

/**
 * Consecutive ticket days with a sealed sticker, over the ticket day of each seal. A missed day
 * resets it to 0; `today` isn't missed until it's over. `best` is the highest it has been.
 */
export function streakOf(
  sealDays: Iterable<string>,
  today: string,
): { current: number; best: number } {
  const days = [...new Set(sealDays)].sort();
  let current = 0;
  let best = 0;
  if (days.length === 0) return { current, best };
  const sealed = new Set(days);
  for (let day = days[0]; day <= today; day = addDays(day, 1)) {
    if (sealed.has(day)) best = Math.max(best, ++current);
    else if (day < today) current = 0;
  }
  return { current, best };
}
