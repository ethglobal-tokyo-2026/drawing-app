import { sql } from "drizzle-orm";
import { blob, check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { isBytes32, literal, timestamps } from "./columns.ts";
import { KYOTO_SEIKA_TIME_USED_S } from "./limits.ts";
import { users } from "./users.ts";

/**
 * One of the two Kyoto Seika Subjects a sticker drawn in Kyoto Seika Manga Expression Practice Mode
 * keeps: the word as the test prints it, its reading (empty when it has no kanji), and its English.
 */
export interface KyotoSeikaSubject {
  ja: string;
  reading: string;
  en: string;
}

/**
 * A sealed sticker. Everything but owner_id, the mint and a later 18+ mark is fixed at seal;
 * created_at is the seal.
 */
export const stickers = sqliteTable(
  "stickers",
  {
    /** Made by the server at seal. The sticker's Sui object ID derives from it. */
    id: text("id").primaryKey(),
    /** The running number shown as No.0147, counted across everyone at seal. */
    number: integer("number").notNull().unique(),
    /** The Original Artist. */
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id),
    /**
     * Who holds it: the Original Artist at seal, then each receiver once their claim lands. Indexes
     * the sticker object's owner as a person, and stays the giver while the escrow holds it.
     */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    /**
     * Seconds on the drawing clock, which pauses: at most its ticket's clock. 0 if sealed within
     * the first second.
     */
    timeUsed: integer("time_used").notNull(),
    /** The sticker image's size; the mask and resin masks share it. */
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** The cut line as an SVG path in image pixels. */
    outline: text("outline").notNull(),
    /**
     * An NSFW sticker: its Original Artist marked it 18+, at seal or after. A mark is for good, and
     * the Sui object keeps the one it was minted with, so this is the current one.
     */
    nsfw: integer("nsfw", { mode: "boolean" }).notNull(),
    /** sha256 of the sticker PNG. Names its image files on the CDN, and goes to the mint. */
    contentHash: text("content_hash").notNull(),
    /**
     * sha256 of an NSFW sticker's veiled PNG, which names it and its WebP copy on the CDN: what
     * anyone without the NSFW opt-in sees. Made before the row, so every NSFW sticker has it and no
     * other does.
     */
    veiledHash: text("veiled_hash"),
    /** The sticker's Sui object, once its mint lands; the mint's digest is in sui_transactions. */
    objectId: text("object_id").unique(),
    ...timestamps(),
    /**
     * The subject pair of a sticker drawn in Kyoto Seika Manga Expression Practice Mode, fixed at
     * seal; null on any other. Not on Sui.
     */
    kyotoSeikaSubjects: text("kyoto_seika_subjects", { mode: "json" }).$type<
      [KyotoSeikaSubject, KyotoSeikaSubject]
    >(),
    /**
     * Set by the 18+ mark that made its drawing private: the CDN's copies of the files that show it
     * are due for a purge. Cleared on every sticker that shows the drawing once a purge that began
     * after it has cleared them.
     */
    cdnPurgeDueAt: integer("cdn_purge_due_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    // The image server finds every sticker that shows a drawing by it, for each file that shows one.
    index("stickers_content_hash").on(t.contentHash),
    index("stickers_artist").on(t.artistId, t.createdAt),
    index("stickers_created").on(t.createdAt),
    // The CDN purges still due, which the purge sweep reads.
    index("stickers_cdn_purge_due")
      .on(t.cdnPurgeDueAt)
      .where(sql`${t.cdnPurgeDueAt} is not null`),
    // The longest clock; the seal route holds each sticker to its own ticket's.
    check(
      "stickers_time_used",
      sql`${t.timeUsed} between 0 and ${literal(KYOTO_SEIKA_TIME_USED_S)}`,
    ),
    check(
      "stickers_kyoto_seika_subjects",
      sql`${t.kyotoSeikaSubjects} is null or (json_valid(${t.kyotoSeikaSubjects}) and json_array_length(${t.kyotoSeikaSubjects}) = 2)`,
    ),
    check("stickers_size", sql`${t.width} > 0 and ${t.height} > 0`),
    check("stickers_content_hash", isBytes32(t.contentHash)),
    check("stickers_veiled", sql`${t.nsfw} = (${t.veiledHash} is not null)`),
    check("stickers_object_id", sql`${t.objectId} is null or (${isBytes32(t.objectId)})`),
  ],
);

/** How a sticker was drawn, inserted with it at seal. Its own table, so board reads never load it. */
export const stickerTimelapses = sqliteTable("sticker_timelapses", {
  stickerId: text("sticker_id")
    .primaryKey()
    .references(() => stickers.id),
  /** Gzipped TimelapseV1 JSON, as sent. */
  ops: blob("ops", { mode: "buffer" }).notNull(),
  ...timestamps(),
});
