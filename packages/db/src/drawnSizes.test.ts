import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate.ts";

const DRAWN_SIZE_MIGRATION = /_drawn_size$/;

/** A database migrated up to just before the drawn size migration, as the box's is before it ships. */
function databaseBeforeDrawnSize() {
  const dir = mkdtempSync(join(tmpdir(), "drawing-app-drawn-size-"));
  const folder = join(dir, "drizzle");
  cpSync(fileURLToPath(new URL("../drizzle", import.meta.url)), folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal: unknown = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries =
    journal !== null && typeof journal === "object" && "entries" in journal ? journal.entries : [];
  if (!Array.isArray(entries)) throw new Error("The drizzle journal lists no entries");
  const at = entries.findIndex(
    (entry: unknown) =>
      entry !== null &&
      typeof entry === "object" &&
      "tag" in entry &&
      typeof entry.tag === "string" &&
      DRAWN_SIZE_MIGRATION.test(entry.tag),
  );
  writeFileSync(journalPath, JSON.stringify({ ...Object(journal), entries: entries.slice(0, at) }));
  const path = join(dir, "test.db");
  const sqlite = new Database(path);
  migrate(drizzle({ client: sqlite }), { migrationsFolder: folder });
  sqlite.exec(
    "insert into users (id, line_user_id, line_display_name, language) values ('u', 'line-u', 'U', 'ja')",
  );
  return { path, sqlite };
}

const hash = (n: number) => `0x${String(n).padStart(64, "0")}`;

/** A sticker sealed before its drawn size was recorded, its timelapse's place as given, on its board at `scale`. */
function insertOldSticker(
  sqlite: Database.Database,
  n: number,
  place: [number, number, number, number] | null,
  scale: number,
) {
  const id = `sticker-${n}`;
  sqlite
    .prepare(
      "insert into stickers (id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash) values (?, ?, 'u', 'u', 1, 100, 100, 'M0 0Z', 0, ?)",
    )
    .run(id, n, hash(n));
  if (place) {
    const timelapse = { v: 1, ink: [374, 689], place, density: 3, ops: [] };
    sqlite
      .prepare("insert into sticker_timelapses (sticker_id, ops) values (?, ?)")
      .run(id, gzipSync(JSON.stringify(timelapse)));
  }
  sqlite
    .prepare(
      "insert into sticker_placements (user_id, sticker_id, on_board, x, y, scale, rotation, z) values ('u', ?, 1, 0.5, 0.5, ?, 0, ?)",
    )
    .run(id, scale, n);
  return id;
}

describe("the drawn size migration", () => {
  it("records each sticker's drawn size from its timelapse's place, and brings its saved spot into its range", () => {
    const { path, sqlite } = databaseBeforeDrawnSize();
    const small = insertOldSticker(sqlite, 1, [95.1, 272.8, 186.5, 143.5], 0.34);
    const big = insertOldSticker(sqlite, 2, [-38.1, -61.3, 523.5, 837.6], 0.34);
    sqlite.close();

    migrateDatabase(path);

    const migrated = new Database(path, { readonly: true });
    const rows = migrated
      .prepare<[], { id: string; drawn_width: number; drawn_height: number; scale: number }>(
        "select s.id, s.drawn_width, s.drawn_height, p.scale from stickers s join sticker_placements p on p.sticker_id = s.id",
      )
      .all();
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(small)).toMatchObject({ drawn_width: 186.5, drawn_height: 143.5 });
    expect(byId.get(big)).toMatchObject({ drawn_width: 523.5, drawn_height: 837.6 });
    // The small one was stretched past twice its natural size, so it comes down; the big one was in range.
    expect(byId.get(small)?.scale).toBeLessThan(0.34);
    expect(byId.get(big)?.scale).toBe(0.34);
  });

  it("refuses to migrate, naming the sticker, when a sticker has no timelapse to read it from", () => {
    const { path, sqlite } = databaseBeforeDrawnSize();
    insertOldSticker(sqlite, 7, null, 0.3);
    sqlite.close();

    expect(() => migrateDatabase(path)).toThrow(/No\.7 sticker-7 \(it has no timelapse\)/);
  });
});
