import { formatTimeOfDay } from "../i18n/format";
import { i18next } from "../i18n/i18n";

const MINUTE = 60_000;

/**
 * The countdown half of the refill line: "in 6h 56m", "in 42m" under an hour,
 * "in 6h" on the hour and "in under a minute" at the end, in whole minutes rounded down.
 */
export function formatRefillIn(msLeft: number): string {
  if (msLeft < MINUTE) return i18next.t(($) => $.tickets.refillIn.underAMinute);
  const whole = Math.floor(msLeft / MINUTE);
  const hours = Math.floor(whole / 60);
  const minutes = whole % 60;
  if (hours && minutes) {
    return i18next.t(($) => $.tickets.refillIn.hoursAndMinutes, { hours, minutes });
  }
  return hours
    ? i18next.t(($) => $.tickets.refillIn.hours, { hours })
    : i18next.t(($) => $.tickets.refillIn.minutes, { minutes });
}

/** How long until formatRefillIn reads differently; in the last minute, that's the refill itself. */
export function msUntilRefillLineChanges(msLeft: number): number {
  return msLeft < MINUTE ? msLeft : (msLeft % MINUTE) + 1;
}

/** "12:00 AM", or "0:00" in Japanese, in the person’s own time zone. */
export const formatRefillTime = (at: Date) => formatTimeOfDay(at);
