import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate.ts";
import { bytes32, databaseBefore } from "./testDb.ts";
import { stageTimelapsesV2, timelapseV1ToV2 } from "./timelapseV2.ts";

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
    .filter((name) => name.startsWith("timelapses-v1-"))
    .map((name) =>
      readFileSync(join(dirname(path), name), "utf8")
        .trim()
        .split("\n")
        .map((line): unknown => JSON.parse(line)),
    );

describe("the timelapse v2 staging", () => {
  it("converts every v1 timelapse once it's backed up as stored, and leaves v2 ones as they were", () => {
    const v1 = gzipped(V1);
    const v2 = gzipped(V2);
    const { path, ids } = databaseBeforeTimelapseV2(v1, v2);

    migrateDatabase(path);

    const stored = storedTimelapses(path);
    expect(unzipped(stored.get(ids[0]))).toEqual(timelapseV1ToV2(V1));
    expect(stored.get(ids[1])).toEqual(v2);
    expect(backupsBeside(path)).toEqual([
      [{ stickerId: ids[0], gzipBase64: v1.toString("base64") }],
    ]);
  });

  it("only lists what it would convert in a dry run", () => {
    const v1 = gzipped(V1);
    const { path, ids } = databaseBeforeTimelapseV2(v1, gzipped(V2));
    const sqlite = new Database(path);
    const lines: string[] = [];
    const listed = stageTimelapsesV2(sqlite, { write: false }, (line) => lines.push(line));
    sqlite.close();

    expect(listed.map(({ stickerId }) => stickerId)).toEqual([ids[0]]);
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

    expect(() => migrateDatabase(path)).toThrow(
      /No\.2 sticker-2 \(its v is 3, not 1\); No\.3 sticker-3 \(ops\[0\] isn't a v1/,
    );
    expect(storedTimelapses(path).get(ids[0])).toEqual(v1);
    expect(backupsBeside(path)).toEqual([]);
  });
});
