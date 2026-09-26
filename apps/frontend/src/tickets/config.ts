/** Daily tickets per ticket day. */
export const DAILY_TICKETS_PER_DAY = 3;
/** Ticket days run midnight to midnight in Tokyo for everyone. Japan keeps no daylight saving time. */
export const TICKET_DAY_UTC_OFFSET_MS = 9 * 60 * 60_000;
/** A single reserve ticket's price; packs show their discount off this. */
export const TICKET_PRICE_YEN = 100;
/** The ticket shop's packs of reserve tickets. */
export const TICKET_PACKS = [
  { tickets: 1, priceYen: 100 },
  { tickets: 3, priceYen: 270 },
  { tickets: 5, priceYen: 375 },
  { tickets: 10, priceYen: 600 },
] as const;
/** How long a SUI price quote holds. */
export const QUOTE_TTL_MS = 60_000;
