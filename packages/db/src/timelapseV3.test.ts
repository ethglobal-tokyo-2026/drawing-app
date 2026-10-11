import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase, migrationsFolder } from "./migrate.ts";
import { bytes32, databaseBefore } from "./testDb.ts";
import { stageTimelapsesV3 } from "./timelapseV3.ts";

/** A timelapse sealed before timelapses recorded layers: a stroke, then fills from before and after fills recorded their gap. */
const V1 = {
  v: 1,
  ink: [400, 600],
  place: [10, 20, 160, 120.5],
  density: 2,
  ops: [
    ["brush", "#ff3366", 0, [100, 200, 60, 0, 50, 25, 0, 16]],
    ["fill", "#33aaff", 1500, 40.5, 60],
    ["fill", "#ffcc00", 2100, 80.5, 30, 2],
  ],
};
/** One sealed since: it adds a second layer and draws on it. */
const V2 = {
  ...V1,
  v: 2,
  layers: [[1, 100, false, false]],
  ops: [
    ["add", 2, 0, 1],
    ["brush", 2, "#000000", 10, [0, 0, 10, 0]],
  ],
};

const gzipped = (json: unknown) => gzipSync(JSON.stringify(json));
const unzipped = (blob: Buffer | undefined): unknown =>
  blob && JSON.parse(gunzipSync(blob).toString());

/** A sticker for each gzipped timelapse, numbered from 1, by one person; returns their ids. */
function insertTimelapses(sqlite: Database.Database, timelapses: readonly Buffer[]): string[] {
  sqlite.exec(
    "insert into users (id, line_user_id, line_display_name, language) values ('u', 'line-u', 'U', 'ja')",
  );
  const sticker = sqlite.prepare(
    "insert into stickers (id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash, drawn_width, drawn_height) values (?, ?, 'u', 'u', 1, 1, 1, 'M0 0Z', 0, ?, 1, 1)",
  );
  const timelapse = sqlite.prepare(
    "insert into sticker_timelapses (sticker_id, ops) values (?, ?)",
  );
  return timelapses.map((ops, at) => {
    const id = `sticker-${at + 1}`;
    sticker.run(id, at + 1, bytes32(id));
    timelapse.run(id, ops);
    return id;
  });
}

/** A database from before layered timelapses, with a sticker for each recording, closed. */
function databaseBeforeTimelapseV2(...timelapses: Buffer[]) {
  const { path, sqlite } = databaseBefore("0014_timelapse_v2");
  const ids = insertTimelapses(sqlite, timelapses);
  sqlite.close();
  return { path, ids };
}

/** Every stored timelapse, by its sticker. */
function storedTimelapses(path: string) {
  const sqlite = new Database(path, { readonly: true });
  try {
    const rows = sqlite
      .prepare<[], { sticker_id: string; ops: Buffer }>(
        "select sticker_id, ops from sticker_timelapses",
      )
      .all();
    return new Map(rows.map((row) => [row.sticker_id, row.ops]));
  } finally {
    sqlite.close();
  }
}

/** The backups beside the database, each as its lines. */
const backupsBeside = (path: string) =>
  readdirSync(dirname(path))
    .filter((name) => name.startsWith("timelapses-v3-"))
    .map((name) =>
      readFileSync(join(dirname(path), name), "utf8")
        .trim()
        .split("\n")
        .map((line): unknown => JSON.parse(line)),
    );

describe("the timelapse v3 staging", () => {
  it("converts both historical formats after durable backups", () => {
    const v1 = gzipped(V1);
    const v2 = gzipped(V2);
    const { path, ids } = databaseBeforeTimelapseV2(v1, v2);

    migrateDatabase(path);

    const stored = storedTimelapses(path);
    expect(unzipped(stored.get(ids[0]))).toEqual({
      ...V1,
      v: 3,
      layers: [[1, 100, false, false]],
      ops: [
        ["brush", 1, "#ff3366", 0, [100, 200, 60, 0, 50, 25, 0, 16]],
        ["fill", 1, "#33aaff", 1500, 40.5, 60, 0, "visible"],
        ["fill", 1, "#ffcc00", 2100, 80.5, 30, 2, "visible"],
      ],
    });
    expect(unzipped(stored.get(ids[1]))).toEqual({ ...V2, v: 3 });
    expect(backupsBeside(path)).toEqual([
      [
        { stickerId: ids[0], gzipBase64: v1.toString("base64") },
        { stickerId: ids[1], gzipBase64: v2.toString("base64") },
      ],
    ]);
  });

  it("only lists what it would convert in a dry run", () => {
    const v1 = gzipped(V1);
    const { path, ids } = databaseBeforeTimelapseV2(v1, gzipped(V2));
    const sqlite = new Database(path);
    const lines: string[] = [];
    const listed = stageTimelapsesV3(sqlite, { write: false }, (line) => lines.push(line));
    sqlite.close();

    expect(listed.map(({ stickerId }) => stickerId)).toEqual(ids);
    expect(lines.some((line) => line.includes(ids[0]))).toBe(true);
    expect(storedTimelapses(path).get(ids[0])).toEqual(v1);
    expect(backupsBeside(path)).toEqual([]);
  });

  it("leaves a database that already records the timelapse format as it is", () => {
    const path = join(mkdtempSync(join(tmpdir(), "drawing-app-db-")), "test.db");
    migrateDatabase(path);
    const sqlite = new Database(path);
    // Only a hand edit stores v1 now.
    const [id] = insertTimelapses(sqlite, [gzipped(V1)]);
    sqlite.close();

    migrateDatabase(path);

    expect(unzipped(storedTimelapses(path).get(id))).toEqual(V1);
    expect(backupsBeside(path)).toEqual([]);
  });

  it("refuses, naming each sticker, timelapses that are neither v1 nor v2, and changes nothing", () => {
    const v1 = gzipped(V1);
    const unknownOp = gzipped({ ...V1, ops: [["smudge", "#000000", 0]] });
    const { path, ids } = databaseBeforeTimelapseV2(v1, gzipped({ v: 3 }), unknownOp);

    expect(() => migrateDatabase(path)).toThrow(/No\.2 sticker-2.*No\.3 sticker-3/s);
    expect(storedTimelapses(path).get(ids[0])).toEqual(v1);
    expect(backupsBeside(path)).toEqual([]);
  });
});

describe("atomic timelapse migration", () => {
  it("preserves ids and timestamps, enforces format 3, checks foreign keys, and performs no repeat conversion", () => {
    const { path, sqlite } = databaseBefore("0016_timelapse_v3");
    const [id] = insertTimelapses(sqlite, [
      gzipped({ ...V2, ops: [["fill", 1, "#ff0000", 42, 5, 6, 2]] }),
    ]);
    sqlite
      .prepare(
        "update sticker_timelapses set created_at = 100, updated_at = 200 where sticker_id = ?",
      )
      .run(id);
    sqlite.close();
    migrateDatabase(path);
    const after = new Database(path);
    expect(
      after
        .prepare("select sticker_id, created_at, updated_at, format from sticker_timelapses")
        .get(),
    ).toEqual({ sticker_id: id, created_at: 100, updated_at: 200, format: 3 });
    expect(unzipped(storedTimelapses(path).get(id))).toMatchObject({
      v: 3,
      ops: [["fill", 1, "#ff0000", 42, 5, 6, 2, "visible"]],
    });
    expect(() => after.prepare("update sticker_timelapses set format = 2").run()).toThrow(
      /sticker_timelapses_format/,
    );
    expect(after.pragma("foreign_key_check")).toEqual([]);
    after.pragma("foreign_keys = ON");
    expect(() =>
      after
        .prepare("insert into sticker_timelapses (sticker_id, ops) values ('absent', ?)")
        .run(gzipped(V2)),
    ).toThrow(/FOREIGN KEY/);
    after.close();
    const bytes = storedTimelapses(path).get(id);
    const backups = backupsBeside(path);
    migrateDatabase(path);
    expect(storedTimelapses(path).get(id)).toEqual(bytes);
    expect(backupsBeside(path)).toEqual(backups);
  });
  it("rolls back schema and recordings on SQL failure, with separate non-overwritten backups on retry", () => {
    const { path, sqlite } = databaseBefore("0016_timelapse_v3");
    const original = gzipped(V2);
    const [id] = insertTimelapses(sqlite, [original]);
    const applied = sqlite.prepare("select * from __drizzle_migrations").all();
    sqlite.exec("create table __new_sticker_timelapses (forced_failure text)");
    sqlite.close();
    expect(() => migrateDatabase(path)).toThrow();
    expect(storedTimelapses(path).get(id)).toEqual(original);
    const failed = new Database(path);
    expect(failed.prepare("select * from __drizzle_migrations").all()).toEqual(applied);
    expect(failed.prepare("select format from sticker_timelapses").get()).toEqual({ format: 2 });
    failed.exec("drop table __new_sticker_timelapses");
    failed.close();
    const backups = backupsBeside(path);
    expect(backups).toHaveLength(1);
    migrateDatabase(path);
    expect(backupsBeside(path)).toHaveLength(2);
    expect(backupsBeside(path)).toContainEqual(backups[0]);
  });
  it("aborts rather than omitting a recording when its staged row is missing", () => {
    const { path, sqlite } = databaseBefore("0016_timelapse_v3");
    const original = gzipped(V2);
    const [id] = insertTimelapses(sqlite, [original]);
    stageTimelapsesV3(sqlite, { write: true });
    expect(storedTimelapses(path).get(id)).toEqual(original);
    sqlite.exec("delete from temp.timelapse_v3_stage");
    const sql = readFileSync(join(migrationsFolder, "0016_timelapse_v3.sql"), "utf8");
    expect(() => sqlite.transaction(() => sqlite.exec(sql))()).toThrow(/NOT NULL/);
    expect(sqlite.prepare("select format from sticker_timelapses").get()).toEqual({ format: 2 });
    expect(storedTimelapses(path).get(id)).toEqual(original);
    sqlite.close();
  });
  it("refuses oversized decompression before any backup or mutation", () => {
    const { path, sqlite } = databaseBefore("0016_timelapse_v3");
    const original = gzipSync(" ".repeat(16 * 1024 * 1024 + 1));
    const [id] = insertTimelapses(sqlite, [original]);
    sqlite.close();
    expect(() => migrateDatabase(path)).toThrow(/sticker-1/);
    expect(storedTimelapses(path).get(id)).toEqual(original);
    expect(backupsBeside(path)).toEqual([]);
  });
});
