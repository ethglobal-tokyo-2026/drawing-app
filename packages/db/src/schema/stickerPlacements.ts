import { sql } from "drizzle-orm";
import { check, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/**
 * A sticker's placement on a person's Sticker Board: on the board, or waiting in its sticker tray.
 * Inserted when the sticker first reaches them (at seal, or when they receive it), so created_at
 * orders the tray. It stays after they give the sticker away: the board keeps its given sticker
 * silhouette, and its spot on the sticker sheet stays empty.
 */
export const stickerPlacements = sqliteTable(
  "sticker_placements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    // Null until the owner's board first places the sticker, then moved by every drag, resize, turn
    // and Remove. The app's `placement`: { on, x, y, s, r, z }.
    /** False while it waits in the sticker tray; its last spot is kept. */
    onBoard: integer("on_board", { mode: "boolean" }),
    /** Centre, as fractions of the board's field. */
    x: real("x"),
    y: real("y"),
    /** The long side, as a fraction of the board's width. */
    scale: real("scale"),
    /** Clockwise, in degrees. */
    rotation: real("rotation"),
    /** Stacking order; higher is on top. */
    z: integer("z"),
    /** The tray zipped shut with its sticker sheet open. Null shows NEW. */
    seenAt: integer("seen_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "sticker_placements_placement",
      sql`(${t.onBoard} is null and ${t.x} is null and ${t.y} is null and ${t.scale} is null and ${t.rotation} is null and ${t.z} is null)
        or (${t.onBoard} is not null and ${t.x} between 0 and 1 and ${t.y} between 0 and 1
          and ${t.scale} > 0 and ${t.scale} <= 1 and ${t.rotation} is not null and ${t.z} is not null)`,
    ),
  ],
);
