import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase, migrationsFolder } from "./migrate.ts";
import { bytes32, createTestDb, databaseBefore, journalEntries, refusal } from "./testDb.ts";

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

  // The migrator applies a migration only when its `when` is later than the last one applied, so a
  // migration generated on a branch before one merged ahead of it would never run on the box.
  it("lists each migration once, in order, each generated after the one before, with its SQL file", () => {
    const entries = journalEntries();
    expect(entries.map((entry) => entry.idx)).toEqual(entries.map((_, at) => at));
    for (const [at, entry] of entries.entries()) {
      expect(existsSync(join(migrationsFolder, `${entry.tag}.sql`)), entry.tag).toBe(true);
      const before = entries[at - 1];
      if (before) expect(entry.when, entry.tag).toBeGreaterThan(before.when);
    }
  });

  it("checks foreign keys on a start that applies a migration, and skips the check on one that applies none", () => {
    const last = journalEntries().at(-1);
    if (!last) throw new Error("The journal lists no migrations");
    const { path, sqlite } = databaseBefore(last.tag);
    // A placement whose person and sticker are gone, as a hand edit with foreign keys off leaves it.
    sqlite.pragma("foreign_keys = OFF");
    sqlite.exec("insert into sticker_placements (user_id, sticker_id) values ('gone', 'gone')");
    sqlite.close();

    expect(() => migrateDatabase(path)).toThrow(/break foreign keys/);
    expect(() => migrateDatabase(path)).not.toThrow();
  });
});

/** One layout's values, in this order. */
const PHONE = ["on_board", "x", "y", "scale", "rotation", "z"];
const LARGE = PHONE.map((column) => `large_${column}`);
type Layout = (number | null)[];
const PLACED: Layout = [1, 0.5, 0.25, 0.3, 12, 2];
const UNPLACED: Layout = PHONE.map(() => null);
/** Placed without a scale, or without a spot, as only a hand edit writes one. */
const NO_SCALE: Layout = [1, 0.5, 0.25, null, 12, 2];
const NO_SPOT: Layout = [1, null, null, null, 0, 1];

/** Seals a sticker by 'u' and gives them a placement of it, with each layout as given. */
function insertPlacement(
  sqlite: Database.Database,
  stickerId: string,
  phone: Layout,
  large: Layout,
) {
  sqlite
    .prepare(
      "insert into stickers (id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash, drawn_width, drawn_height) values (?, (select count(*) + 1 from stickers), 'u', 'u', 1, 1, 1, 'M0 0Z', 0, ?, 1, 1)",
    )
    .run(stickerId, bytes32(stickerId));
  const columns = [...PHONE, ...LARGE];
  sqlite
    .prepare(
      `insert into sticker_placements (user_id, sticker_id, ${columns.join(", ")}) values ('u', ?, ${columns.map(() => "?").join(", ")})`,
    )
    .run(stickerId, ...phone, ...large);
}

/** Every placement's row, by its sticker. */
function placements(sqlite: Database.Database) {
  const rows = sqlite.prepare<[], { sticker_id: string }>("select * from sticker_placements").all();
  const byId = new Map(rows.map((row) => [row.sticker_id, row]));
  return (stickerId: string) => {
    const row = byId.get(stickerId);
    if (!row) throw new Error(`No placement of ${stickerId}`);
    return row;
  };
}

const inTheTray = (layout: string[]) => Object.fromEntries(layout.map((column) => [column, null]));

describe("the whole placements migration", () => {
  it("puts each half-placed layout back in the sticker tray, copies every other as it was, and refuses one after", () => {
    const { path, sqlite } = databaseBefore("0010_whole_placements");
    sqlite.exec(
      "insert into users (id, line_user_id, line_display_name, language) values ('u', 'line-u', 'U', 'en')",
    );
    insertPlacement(sqlite, "placed", PLACED, PLACED);
    insertPlacement(sqlite, "unplaced", UNPLACED, UNPLACED);
    insertPlacement(sqlite, "phone without a scale", NO_SCALE, PLACED);
    insertPlacement(sqlite, "large without a spot", PLACED, NO_SPOT);
    const before = placements(sqlite);
    sqlite.close();

    migrateDatabase(path);

    const migrated = new Database(path);
    const after = placements(migrated);
    expect(after("placed")).toEqual(before("placed"));
    expect(after("unplaced")).toEqual(before("unplaced"));
    const moved: { updated_at: unknown } = { updated_at: expect.any(Number) };
    expect(after("phone without a scale")).toEqual({
      ...before("phone without a scale"),
      ...inTheTray(PHONE),
      ...moved,
    });
    expect(after("large without a spot")).toEqual({
      ...before("large without a spot"),
      ...inTheTray(LARGE),
      ...moved,
    });
    expect(refusal(() => insertPlacement(migrated, "no scale", NO_SCALE, UNPLACED))).toMatch(
      /sticker_placements_placement/,
    );
    expect(refusal(() => insertPlacement(migrated, "no spot", UNPLACED, NO_SPOT))).toMatch(
      /sticker_placements_large_placement/,
    );
  });
});
