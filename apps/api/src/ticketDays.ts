/** `YYYY-MM-DD` of a UTC calendar date. */
const dayKey = (utcMs: number) => new Date(utcMs).toISOString().slice(0, 10);

/** `day`, moved by whole calendar days. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(Date.UTC(year, month - 1, date + days));
}

/**
 * Days run midnight to midnight, Tokyo time, for everyone: daily tickets, streaks, and Explore's
 * today and week. Japan keeps no daylight saving time.
 */
const TOKYO_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

/** The ticket day `at` falls in: its `YYYY-MM-DD` in Tokyo. */
export const tokyoTicketDay = (at: Date): string => dayKey(at.getTime() + TOKYO_UTC_OFFSET_MS);

/** When `day` begins: its midnight, Tokyo time. */
export const tokyoTicketDayStart = (day: string): Date =>
  new Date(Date.parse(day) - TOKYO_UTC_OFFSET_MS);

/** When the ticket day after `at`'s begins: the next midnight, Tokyo time, when daily tickets refill. */
export const nextTokyoTicketDayStart = (at: Date): Date =>
  tokyoTicketDayStart(addDays(tokyoTicketDay(at), 1));
