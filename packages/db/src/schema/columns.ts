import { sql, type SQL } from "drizzle-orm";
import { integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/** The database's clock, in milliseconds. */
export const NOW_SQL = "(cast(unixepoch('subsec') * 1000 as integer))";
const now = sql.raw(NOW_SQL);

/**
 * created_at is set once, by the database, on insert. updated_at starts equal and moves on every
 * update: Drizzle sets it in the statement, and each table's trigger (updatedAtTriggers.ts) catches
 * updates made outside Drizzle.
 */
export const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now)
    .$onUpdate(() => now),
});

/** A CHECK that a column holds one of a closed set of values. */
export const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in ${sql.raw(`(${values.map((v) => `'${v}'`).join(", ")})`)}`;

/** A CHECK that a column holds a 0x-prefixed 32-byte hex string. */
export const isBytes32 = (column: AnySQLiteColumn): SQL =>
  sql`length(${column}) = 66 and ${column} like '0x%'`;

/** A number in a CHECK, which can't take parameters. */
export const literal = (value: number): SQL => sql.raw(String(value));
