const MINUTE = 60_000;

/**
 * The countdown half of the refill line: "in 6h 56m", "in 42m" under an hour,
 * "in 6h" on the hour and "in under a minute" at the end, in whole minutes rounded down.
 */
export function formatRefillIn(msLeft: number): string {
  if (msLeft < MINUTE) return "in under a minute";
  const minutes = Math.floor(msLeft / MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `in ${h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`}`;
}

/** How long until formatRefillIn reads differently; in the last minute, that's the refill itself. */
export function msUntilRefillLineChanges(msLeft: number): number {
  return msLeft < MINUTE ? msLeft : (msLeft % MINUTE) + 1;
}

const timeOfDay = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** "12:00 AM", in the person’s own time zone. */
export const formatRefillTime = (at: Date) => timeOfDay.format(at);
