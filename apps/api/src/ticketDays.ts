/**
 * The hour the zone-based days below turn over: Explore's day and week. Tickets use the Tokyo
 * ticket day at the bottom, which turns over at midnight.
 */
export const TICKET_DAY_START_HOUR = 4;

/** `timeZone`'s wall clock at `at`, to the second. */
function wallClock(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: field("year"),
    month: field("month"),
    day: field("day"),
    hour: field("hour"),
    minute: field("minute"),
    second: field("second"),
  };
}

/** `YYYY-MM-DD` of a UTC calendar date. */
const dayKey = (utcMs: number) => new Date(utcMs).toISOString().slice(0, 10);

/** `day`, moved by whole calendar days. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(Date.UTC(year, month - 1, date + days));
}

/** The ticket day `at` falls in: `YYYY-MM-DD` on `timeZone`'s calendar, from TICKET_DAY_START_HOUR. */
export function ticketDay(at: Date, timeZone: string): string {
  const { year, month, day, hour } = wallClock(at, timeZone);
  const date = dayKey(Date.UTC(year, month - 1, day));
  return hour < TICKET_DAY_START_HOUR ? addDays(date, -1) : date;
}

/** How far `timeZone`'s clock runs ahead of UTC at `atMs`, in ms. */
function zoneOffsetMs(atMs: number, timeZone: string): number {
  const w = wallClock(new Date(atMs), timeZone);
  const wallMs = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return wallMs - Math.floor(atMs / 1000) * 1000;
}

/** When `day` begins: TICKET_DAY_START_HOUR on that date, in `timeZone`. */
export function ticketDayStart(day: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const wallMs = Date.UTC(year, month - 1, date, TICKET_DAY_START_HOUR);
  // The offset at a first guess, then at the corrected guess, which settles days the clocks change.
  const guess = wallMs - zoneOffsetMs(wallMs, timeZone);
  return new Date(wallMs - zoneOffsetMs(guess, timeZone));
}

/** When the ticket day after `at`'s begins: the next refill of free tickets. */
export const nextTicketDayStart = (at: Date, timeZone: string): Date =>
  ticketDayStart(addDays(ticketDay(at, timeZone), 1), timeZone);

/** Ticket days run midnight to midnight, Tokyo time, for everyone. Japan keeps no daylight saving time. */
const TOKYO_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

/** The ticket day `at` falls in: its `YYYY-MM-DD` in Tokyo. */
export const tokyoTicketDay = (at: Date): string => dayKey(at.getTime() + TOKYO_UTC_OFFSET_MS);

/** When `day` begins: its midnight, Tokyo time. */
export const tokyoTicketDayStart = (day: string): Date =>
  new Date(Date.parse(day) - TOKYO_UTC_OFFSET_MS);

/** When the ticket day after `at`'s begins: the next midnight, Tokyo time, when daily tickets refill. */
export const nextTokyoTicketDayStart = (at: Date): Date =>
  tokyoTicketDayStart(addDays(tokyoTicketDay(at), 1));
