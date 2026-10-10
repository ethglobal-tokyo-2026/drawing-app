import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { isBytes32, timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";

/**
 * Every veiled PNG an 18+ mark has made, at seal or after, kept for good: a sticker minted while
 * NSFW names its veil on Sui forever, so the image server keeps each one public, even once the mark
 * that made it comes off. Written in the transaction that writes the mark.
 */
export const veiledImages = sqliteTable(
  "veiled_images",
  {
    /** sha256 of the veiled PNG, which names it and its WebP copy on the CDN. */
    veiledHash: text("veiled_hash").primaryKey(),
    /** The sticker whose 18+ mark first made it. */
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    ...timestamps(),
  },
  (t) => [check("veiled_images_veiled_hash", isBytes32(t.veiledHash))],
);
