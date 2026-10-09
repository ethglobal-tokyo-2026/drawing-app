import { sql } from "drizzle-orm";
import { check, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/**
 * A sticker's placement on a person's Sticker Board, in each of its two layouts, the phone's and the
 * large layout a large screen shows: on the board, or waiting in its sticker tray. Inserted when the
 * sticker first reaches them (at seal, or when they receive it), so created_at orders the tray. It
 * stays after they give the sticker away: the sticker leaves their board, and its spot on the sticker
 * sheet stays empty.
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
    // The phone's layout: null until the owner's board first places the sticker, then moved by every
    // drag, resize, turn and Remove on a phone. The app's `placement`: { on, x, y, s, r, z }.
    /** False while it waits in the sticker tray; its last spot is kept. */
    onBoard: integer("on_board", { mode: "boolean" }),
    /** Center, as fractions of the board's field. */
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
    // The large layout, the same six values: null until it's derived from the phone's or the sticker
    // lands in it, then moved only on a large screen. Its scale is a fraction of the phone board's width.
    largeOnBoard: integer("large_on_board", { mode: "boolean" }),
    largeX: real("large_x"),
    largeY: real("large_y"),
    largeScale: real("large_scale"),
    largeRotation: real("large_rotation"),
    largeZ: integer("large_z"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "sticker_placements_placement",
      sql`(${t.onBoard} is null and ${t.x} is null and ${t.y} is null and ${t.scale} is null and ${t.rotation} is null and ${t.z} is null)
        or (${t.onBoard} is not null and ${t.x} between 0 and 1 and ${t.y} between 0 and 1
          and ${t.scale} > 0 and ${t.scale} <= 1 and ${t.rotation} is not null and ${t.z} is not null)`,
    ),
    check(
      "sticker_placements_large_placement",
      sql`(${t.largeOnBoard} is null and ${t.largeX} is null and ${t.largeY} is null and ${t.largeScale} is null and ${t.largeRotation} is null and ${t.largeZ} is null)
        or (${t.largeOnBoard} is not null and ${t.largeX} between 0 and 1 and ${t.largeY} between 0 and 1
          and ${t.largeScale} > 0 and ${t.largeScale} <= 1 and ${t.largeRotation} is not null and ${t.largeZ} is not null)`,
    ),
  ],
);
