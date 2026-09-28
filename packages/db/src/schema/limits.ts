// The app reads some of these through the typed client, so this module imports nothing: what it
// imports would ship in the app.

/** The drawing clock's length, in seconds. */
export const MAX_TIME_USED_S = 3 * 60;
/** How long after Packaging a gift can be received: the escrow's expiry. */
export const GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
/** Counted hits in one gratitude combo, at most. */
export const MAX_HITS = 120;
/** The highest gratitude tier, 昇天. */
export const MAX_PEAK_TIER = 4;
/**
 * The gratitude multiplier's ceiling. The Mini-game plays to it, so changing it needs a new
 * GAME_CONFIG version.
 */
export const MAX_PEAK_MULT = 8;
/** Daily tickets per ticket day: each day's first uses spend them. */
export const DAILY_TICKETS_PER_DAY = 3;
