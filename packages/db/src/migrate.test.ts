import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate.ts";
import { createTestDb } from "./testDb.ts";

/**
 * Every table, index and trigger, with its SQL. Whitespace is collapsed, since ALTER TABLE writes an
 * added column onto the line of the column before it, and a table's name is unquoted, since a
 * rebuild's RENAME writes it in double quotes where the schema writes backticks.
 */
const objects = (sqlite: Database.Database) =>
  sqlite
    .prepare<[], { type: string; name: string; sql: string | null }>(
      "select type, name, sql from sqlite_master where tbl_name != '__drizzle_migrations' order by type, name",
    )
    .all()
    .map((object) => ({
      ...object,
      sql: object.sql
        ?.replace(/\s+/g, " ")
        .replace(/^CREATE TABLE ["`](\w+)["`]/, "CREATE TABLE $1"),
    }));

describe("migrateDatabase", () => {
  it("builds the same database the schema describes", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "drawing-app-db-")), "test.db");
    migrateDatabase(path);
    const migrated = new Database(path, { readonly: true });
    const { sqlite: fromSchema } = await createTestDb();
    expect(objects(migrated)).toEqual(objects(fromSchema));
  });
});
