import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate.ts";
import { bytes32, databaseBefore } from "./testDb.ts";

const base = {
  ink: [400, 600],
  place: [10, 20, 160, 120.5],
  density: 2,
};
const v1 = { ...base, v: 1, ops: [["fill", "#ff3366", 10, 4, 5]] };
const v2 = {
  ...base,
  v: 2,
  layers: [[1, 100, false, false]],
  ops: [["fill", 1, "#ff3366", 10, 4, 5, 2]],
};
const v3 = {
  ...base,
  v: 3,
  layers: [[1, 80, true, true]],
  ops: [["fill", 1, "#ff3366", 10, 4, 5, 2, "layer"]],
};
const v4 = {
  ...v3,
  v: 4,
  ops: [
    ["add", 2, 1, 1],
    ["merge", 2, 2, 1],
  ],
};
const gzip = (value: unknown) => gzipSync(JSON.stringify(value));
const jsonOf = (blob: Buffer): unknown => JSON.parse(gunzipSync(blob).toString());

function insert(sqlite: Database.Database, recordings: readonly Buffer[]): string[] {
  sqlite.exec(
    "insert into users (id, line_user_id, line_display_name, language) values ('u', 'line-u', 'U', 'en')",
  );
  const sticker = sqlite.prepare(
    "insert into stickers (id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash, drawn_width, drawn_height) values (?, ?, 'u', 'u', 1, 1, 1, 'M0 0Z', 0, ?, 1, 1)",
  );
  const recording = sqlite.prepare(
    "insert into sticker_timelapses (sticker_id, ops, created_at, updated_at) values (?, ?, 100, 200)",
  );
  return recordings.map((blob, index) => {
    const id = `sticker-${index + 1}`;
    sticker.run(id, index + 1, bytes32(id));
    recording.run(id, blob);
    return id;
  });
}

function stored(path: string) {
  const sqlite = new Database(path, { readonly: true });
  try {
    return sqlite
      .prepare<
        [],
        { sticker_id: string; ops: Buffer; format: number; created_at: number; updated_at: number }
      >(
        "select sticker_id, ops, format, created_at, updated_at from sticker_timelapses order by sticker_id",
      )
      .all();
  } finally {
    sqlite.close();
  }
}

const backups = (path: string) =>
  readdirSync(dirname(path)).filter((name) => name.startsWith("timelapses-v4-"));

describe("timelapse v4 migration", () => {
  it("converts v1-v3, keeps v4 bytes, and preserves identifiers and timestamps", () => {
    const { path, sqlite } = databaseBefore("0017_timelapse_v4");
    const original = [gzip(v1), gzip(v2), gzip(v3), gzip(v4)];
    const ids = insert(sqlite, original);
    sqlite.close();

    migrateDatabase(path);

    const rows = stored(path);
    expect(
      rows.map(({ sticker_id, format, created_at, updated_at }) => ({
        sticker_id,
        format,
        created_at,
        updated_at,
      })),
    ).toEqual(
      ids.map((sticker_id) => ({ sticker_id, format: 4, created_at: 100, updated_at: 200 })),
    );
    expect(rows.map(({ ops }) => jsonOf(ops))).toEqual([
      {
        ...v1,
        v: 4,
        layers: [[1, 100, false, false]],
        ops: [["fill", 1, "#ff3366", 10, 4, 5, 0, "visible"]],
      },
      { ...v2, v: 4, ops: [["fill", 1, "#ff3366", 10, 4, 5, 2, "visible"]] },
      { ...v3, v: 4 },
      v4,
    ]);
    expect(rows[3].ops).toEqual(original[3]);
    expect(backups(path)).toHaveLength(1);
    const backupPath = join(dirname(path), backups(path)[0]);
    expect(statSync(backupPath).mode & 0o777).toBe(0o600);
    const lines = readFileSync(backupPath, "utf8").trim().split("\n");
    expect(lines.map((line): unknown => JSON.parse(line))).toEqual(
      ids.slice(0, 3).map((stickerId, index) => ({
        stickerId,
        gzipBase64: original[index].toString("base64"),
      })),
    );
    const after = new Database(path, { readonly: true });
    expect(after.pragma("integrity_check")).toEqual([{ integrity_check: "ok" }]);
    expect(after.pragma("foreign_key_check")).toEqual([]);
    after.close();
    migrateDatabase(path);
    expect(stored(path)).toEqual(rows);
    expect(backups(path)).toHaveLength(1);
  });

  it("rejects every invalid recording before backup or write", () => {
    const { path, sqlite } = databaseBefore("0017_timelapse_v4");
    const original = [gzip(v3), gzip({ ...v3, ops: [["merge", 2, 1, 1]] }), gzip({ v: 99 })];
    insert(sqlite, original);
    sqlite.close();
    expect(() => migrateDatabase(path)).toThrow(/sticker-2.*sticker-3/s);
    expect(stored(path).map(({ ops }) => ops)).toEqual(original);
    expect(backups(path)).toEqual([]);
  });

  it("rolls back the rebuild on SQL failure and retains distinct backups on retry", () => {
    const { path, sqlite } = databaseBefore("0017_timelapse_v4");
    const original = gzip(v3);
    insert(sqlite, [original]);
    const applied = sqlite.prepare("select * from __drizzle_migrations").all();
    sqlite.exec("create table __new_sticker_timelapses (forced_failure text)");
    sqlite.close();

    expect(() => migrateDatabase(path)).toThrow();
    expect(stored(path)[0].ops).toEqual(original);
    const failed = new Database(path);
    expect(failed.prepare("select * from __drizzle_migrations").all()).toEqual(applied);
    failed.exec("drop table __new_sticker_timelapses");
    failed.close();
    expect(backups(path)).toHaveLength(1);
    migrateDatabase(path);
    expect(backups(path)).toHaveLength(2);
    expect(stored(path)[0].format).toBe(4);
  });
});
