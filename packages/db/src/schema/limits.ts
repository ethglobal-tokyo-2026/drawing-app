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
/**
 * Gratitude a hit earns at ×1, before its method's weight. The Mini-game scores with it, so changing
 * it needs a new GAME_CONFIG version.
 */
export const GRATITUDE_PER_HIT = 10;
/**
 * A stroke pass or a shake reversal counts as this many hits, except as a combo's first hit. The
 * Mini-game scores with it, so changing it needs a new GAME_CONFIG version.
 */
export const METHOD_WEIGHT = 1.5;
/**
 * Daily tickets per ticket day outside Kyoto Seika Manga Expression Practice Mode, the smaller
 * allowance: no reserve ticket is spent among a day's first this many uses. The ticket_uses_kind
 * CHECK holds every row to it, so changing it breaks that CHECK for past rows.
 */
export const DAILY_TICKETS_PER_DAY = 3;
/** Daily tickets per ticket day while Kyoto Seika Manga Expression Practice Mode is on. */
export const KYOTO_SEIKA_DAILY_TICKETS_PER_DAY = 10;
/** The drawing clock on a ticket spent in Kyoto Seika Manga Expression Practice Mode, in seconds. */
export const KYOTO_SEIKA_TIME_USED_S = 30 * 60;
/**
 * The longest a sticker's long side gets in the phone's layout, whatever its shape, as a share of
 * the board's unit: about the phone board's field's height, so a tall sticker can fill it. The app
 * keeps each sticker to the board's field, and the sticker_placements CHECK holds every row to it,
 * so changing it needs a migration.
 */
export const MAX_SCALE = 1.4;
/** The same in the large layout, as a share of the phone board's width. Held by the same CHECK. */
export const MAX_LARGE_SCALE = 2;
