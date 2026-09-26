/**
 * When you joined, as far as this browser can tell: the earlier of its first visit and your oldest
 * sticker, since the visit's record can be newer than stickers already on the board.
 */
export function joinedAt(firstVisit: number, stickers: readonly { createdAt: number }[]): number {
  return stickers.reduce((earliest, sticker) => Math.min(earliest, sticker.createdAt), firstVisit);
}

export interface Streak {
  current: number;
  /** The highest the streak has been. */
  best: number;
}

const DAY_MS = 86_400_000;

// UTC days all last DAY_MS, so stepping through them can't skip or repeat a day at a clock change.
function utcDay(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * The streak over ticket days (`ticketDay` keys) with a sealed sticker. A day with a seal adds one;
 * a missed day takes one away but never below one, and today isn't missed until it's over.
 */
export function streakOf(sealDays: readonly string[], today: string): Streak {
  const sealed = new Set(sealDays.map(utcDay));
  const end = utcDay(today);
  let current = 0;
  let best = 0;
  for (let day = Math.min(...sealed); day <= end; day += DAY_MS) {
    if (sealed.has(day)) current += 1;
    else if (day < end) current = Math.max(1, current - 1);
    best = Math.max(best, current);
  }
  return { current, best };
}
