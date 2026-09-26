import { sql } from "drizzle-orm";
import { blob, check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { isBytes32, literal, timestamps } from "./columns.ts";
import { MAX_TIME_USED_S } from "./limits.ts";
import { users } from "./users.ts";

/** A sealed sticker. Everything but owner_id and the mint is fixed at seal; created_at is the seal. */
export const stickers = sqliteTable(
  "stickers",
  {
    /** Made by the server at seal. The NFT's sticker key is keccak256 of this string. */
    id: text("id").primaryKey(),
    /** The running number shown as No.0147, counted across everyone at seal. */
    number: integer("number").notNull().unique(),
    /** The Original Artist. */
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id),
    /**
     * Who holds it: the Original Artist at seal, then each receiver when they receive it. Indexes the
     * NFT's owner as a person, a few seconds ahead of the chain while a claim lands.
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
    /** keccak256 of the sticker PNG. Names its five image files on the CDN, and goes to the mint. */
    contentHash: text("content_hash").notNull(),
    /** The metadata JSON's CDN URL, known at seal. Goes to the mint as the NFT's tokenURI. */
    metadataUri: text("metadata_uri").notNull(),
    /** uint256 as decimal text. Set with mint_tx_hash when the mint lands. */
    tokenId: text("token_id").unique(),
    mintTxHash: text("mint_tx_hash"),
    ...timestamps(),
    /** When CroquisNames confirmed the sticker's name, <number>.<artist's ens_label>.croquis.eth. */
    ensNamedAt: integer("ens_named_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    index("stickers_artist").on(t.artistId, t.createdAt),
    index("stickers_created").on(t.createdAt),
    check("stickers_time_used", sql`${t.timeUsed} between 0 and ${literal(MAX_TIME_USED_S)}`),
    check("stickers_size", sql`${t.width} > 0 and ${t.height} > 0`),
    check("stickers_content_hash", isBytes32(t.contentHash)),
    check("stickers_minted", sql`(${t.tokenId} is null) = (${t.mintTxHash} is null)`),
  ],
);

/** How a sticker was drawn, inserted with it at seal. Its own table, so board reads never load it. */
export const stickerTimelapses = sqliteTable("sticker_timelapses", {
  stickerId: text("sticker_id")
    .primaryKey()
    .references(() => stickers.id),
  /**
   * Gzipped JSON with a format version: the ink canvas's size, where the sticker sits on it, and
   * every op in the order drawn (the app's strokes and fills, with their times).
   */
  ops: blob("ops", { mode: "buffer" }).notNull(),
  ...timestamps(),
});
