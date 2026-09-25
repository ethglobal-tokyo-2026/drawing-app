import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Where a sticker sits on its sticker board. */
export interface Placement {
  /** Center, as fractions of board width and height. */
  x: number
  y: number
  /** Width as a fraction of board width. */
  scale: number
  /** Stacking order; higher is on top. */
  z: number
}

export const stickers = sqliteTable('stickers', {
  id: text('id').primaryKey(),
  /** Running number shown as NO.0001. */
  no: integer('no').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  /** Seconds spent drawing. */
  timeUsed: integer('time_used').notNull(),
  /** The sealed sticker, PNG-encoded. */
  png: blob('png', { mode: 'buffer' }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  /** Degrees, so each sticker sits on the board a little crooked. */
  rotation: integer('rotation').notNull(),
  /** Null until the sticker is first placed on the board. */
  placement: text('placement', { mode: 'json' }).$type<Placement>(),
})

export type Sticker = typeof stickers.$inferSelect
export type NewSticker = typeof stickers.$inferInsert
