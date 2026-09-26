/** The drawing clock's length, in seconds. Matches the app's SESSION_MS. */
export const MAX_TIME_USED_S = 3 * 60;
/** How long a gift waits in the escrow before it returns to its giver. */
export const GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
/** Counted hits in one gratitude combo, at most. */
export const MAX_HITS = 120;
/** The highest gratitude tier, 昇天. */
export const MAX_PEAK_TIER = 4;
/** The gratitude multiplier's ceiling. */
export const MAX_PEAK_MULT = 8;
/** Daily tickets per ticket day: each day's first uses spend them. */
export const DAILY_TICKETS_PER_DAY = 3;
