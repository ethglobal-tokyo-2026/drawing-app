import { sql } from "drizzle-orm";
import { blob, check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { isBytes32, literal, timestamps } from "./columns.ts";
import { MAX_TIME_USED_S } from "./limits.ts";
import { users } from "./users.ts";

/** A sealed sticker. Everything but owner_id and the mint is fixed at seal; created_at is the seal. */
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
    /** Seconds on the drawing clock, which pauses. 0 if sealed within the first second. */
    timeUsed: integer("time_used").notNull(),
    /** The sticker image's size; the mask and resin masks share it. */
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** The cut line as an SVG path in image pixels. */
    outline: text("outline").notNull(),
    /** An NSFW sticker: its Original Artist, with the NSFW opt-in on, marked it 18+ at seal. */
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
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    // The image server finds an image's sticker by it, for every image that shows the drawing.
    index("stickers_content_hash").on(t.contentHash),
    index("stickers_artist").on(t.artistId, t.createdAt),
    index("stickers_created").on(t.createdAt),
    check("stickers_time_used", sql`${t.timeUsed} between 0 and ${literal(MAX_TIME_USED_S)}`),
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
