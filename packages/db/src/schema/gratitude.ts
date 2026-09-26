import { sql } from "drizzle-orm";
import { blob, check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { literal, oneOf, timestamps } from "./columns.ts";
import { gifts } from "./gifts.ts";
import { MAX_HITS, MAX_PEAK_MULT, MAX_PEAK_TIER } from "./limits.ts";

export const gratitudeMethods = ["tap", "stroke", "shake"] as const;

/**
 * One gratitude Mini-game combo: the receiver thanking the giver for one received gift, at most once.
 * The Mini-game's GratitudeResult, recorded; created_at is when. Columns hold what's queried; the
 * replay holds everything else.
 */
export const gratitude = sqliteTable(
  "gratitude",
  {
    /** The received gift it thanks; the giver, receiver and sticker come from it. */
    giftId: text("gift_id")
      .primaryKey()
      .references(() => gifts.id),
    /** Made on the device at the first hit. The same key again gets the stored record. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    /** The method the combo ended in. */
    method: text("method", { enum: gratitudeMethods }).notNull(),
    /** Counted taps, stroke passes or shake reversals. One tap that sends is 1. */
    hits: integer("hits").notNull(),
    /** The server's replayed gratitude, multiplier included. */
    total: integer("total").notNull(),
    peakMult: real("peak_mult").notNull(),
    /** 0 to MAX_PEAK_TIER: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
    peakTier: integer("peak_tier").notNull(),
    /**
     * The Original Artist's 20%, out of the giver's part, when the Original Artist is neither the
     * giver nor the receiver; otherwise 0. Stored, so changing the share never rewrites history.
     */
    originalArtistGratitudeShare: integer("original_artist_gratitude_share").notNull(),
    /** GAME_CONFIG's version, which the server replayed with. Every version stays in code. */
    gameConfigVersion: text("game_config_version").notNull(),
    /**
     * Gzipped JSON with a format version: every touch with its time, position and whether it counted,
     * stroke paths, shake reversals, where the method switched, the duration and end reason, the
     * random seed for pop-ins and particles, and the thanker's intensity.
     */
    replay: blob("replay", { mode: "buffer" }).notNull(),
    /** The giver watched the replay: the pink tag's unseen feed. */
    seenByGiverAt: integer("seen_by_giver_at", { mode: "timestamp_ms" }),
    /** Its push, or the digest that included it, went out or was given up on. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("gratitude_created").on(t.createdAt),
    index("gratitude_push_due")
      .on(t.createdAt)
      .where(sql`${t.pushedToGiverAt} is null`),
    check("gratitude_method", oneOf(t.method, gratitudeMethods)),
    check("gratitude_hits", sql`${t.hits} between 1 and ${literal(MAX_HITS)}`),
    check(
      "gratitude_original_artist_share",
      sql`${t.originalArtistGratitudeShare} between 0 and ${t.total}`,
    ),
    check("gratitude_tier", sql`${t.peakTier} between 0 and ${literal(MAX_PEAK_TIER)}`),
    check("gratitude_mult", sql`${t.peakMult} between 1 and ${literal(MAX_PEAK_MULT)}`),
  ],
);
