import { sql } from "drizzle-orm";
import { blob, check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { literal, oneOf, timestamps } from "./columns.ts";
import { gifts } from "./gifts.ts";
import { MAX_HITS, MAX_PEAK_MULT, MAX_PEAK_TIER } from "./limits.ts";

const gratitudeMethods = ["tap", "stroke", "shake"] as const;

/**
 * One gratitude Mini-game combo: the receiver's gratitude for one received gift, at most once.
 * The Mini-game's GratitudeResult, recorded; created_at is when. Columns hold what's queried; the
 * replay holds everything else.
 */
export const gratitude = sqliteTable(
  "gratitude",
  {
    /** The received gift it's for; the giver, receiver and sticker come from it. */
    giftId: text("gift_id")
      .primaryKey()
      .references(() => gifts.id),
    /** Made on the device at the first hit. The same key again gets the stored record. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    /** The method the combo ended in. */
    method: text("method", { enum: gratitudeMethods }).notNull(),
    /** Counted taps, stroke passes or shake reversals. One tap that sends is 1. */
    hits: integer("hits").notNull(),
    /** The gratitude the Mini-game reported, multiplier included; not recounted yet. */
    total: integer("total").notNull(),
    peakMult: real("peak_mult").notNull(),
    /** 0 to MAX_PEAK_TIER: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
    peakTier: integer("peak_tier").notNull(),
    /**
     * The Original Artist Gratitude Share: ORIGINAL_ARTIST_GRATITUDE_SHARE of the total, out of the
     * giver's part, or 0 when the Original Artist gave or received the gift. Stored, so changing the
     * share never rewrites history.
     */
    originalArtistGratitudeShare: integer("original_artist_gratitude_share").notNull(),
    /** The GAME_CONFIG version it was played under. */
    gameConfigVersion: text("game_config_version").notNull(),
    /** Gzipped ReplayV1 JSON. */
    replay: blob("replay", { mode: "buffer" }).notNull(),
    /** The giver watched the replay: the pink tag's unseen feed. */
    seenByGiverAt: integer("seen_by_giver_at", { mode: "timestamp_ms" }),
    /** Meant for a LINE push to the giver about it; no code writes it yet. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("gratitude_created").on(t.createdAt),
    // For the pushes to the giver, which no code sends yet.
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
