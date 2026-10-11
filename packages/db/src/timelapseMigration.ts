import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { MAX_TIMELAPSE_JSON_BYTES } from "./timelapseFormat.ts";

type RecordingVersion = 3 | 4;

export interface TimelapseConversion {
  stickerId: string;
  original: Buffer;
  converted: Buffer;
  originalVersion: number;
}

type ConvertRecording = (
  json: unknown,
  original: Buffer,
) => {
  converted: Buffer;
  originalVersion: number;
};

/** Whether the ordered migration for this recording version has yet to commit. */
export function needsTimelapsesVersion(
  sqlite: Database.Database,
  folder: string,
  version: RecordingVersion,
): boolean {
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  const current = migrations.find((migration) =>
    migration.sql.some((sql) => sql.includes(`timelapse_v${version}_stage`)),
  );
  if (!current) throw new Error(`The migration journal has no timelapse v${version} migration`);
  const exists = sqlite
    .prepare("select 1 from sqlite_master where name = '__drizzle_migrations'")
    .get();
  const last = exists
    ? sqlite
        .prepare<[], { created_at: number }>(
          "select created_at from __drizzle_migrations order by created_at desc limit 1",
        )
        .get()
    : undefined;
  return !last || last.created_at < current.folderMillis;
}

/** Validates all recordings before backing up changed originals and staging converted bytes. */
export function stageTimelapsesVersion(
  sqlite: Database.Database,
  version: RecordingVersion,
  { write }: { write: boolean },
  convert: ConvertRecording,
  log: (line: string) => void = console.log,
): TimelapseConversion[] {
  const exists = sqlite
    .prepare("select 1 from sqlite_master where name = 'sticker_timelapses'")
    .get();
  const rows = exists
    ? sqlite
        .prepare<[], { stickerId: string; number: number | null; ops: Buffer }>(
          "select t.sticker_id as stickerId, s.number, t.ops from sticker_timelapses t left join stickers s on s.id = t.sticker_id order by s.number, t.sticker_id",
        )
        .all()
    : [];
  const staged: TimelapseConversion[] = [];
  const invalid: string[] = [];
  for (const { stickerId, number, ops } of rows) {
    try {
      const json: unknown = JSON.parse(
        gunzipSync(ops, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString(),
      );
      const { converted, originalVersion } = convert(json, ops);
      staged.push({ stickerId, original: ops, converted, originalVersion });
      log(`Sticker No.${number} ${stickerId}: v${originalVersion} to v${version}`);
    } catch (error) {
      invalid.push(
        `No.${number} ${stickerId} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
  if (invalid.length)
    throw new Error(
      `Cannot migrate ${invalid.length} invalid timelapses; nothing changed: ${invalid.join("; ")}`,
    );
  const changed = staged.filter((row) => row.originalVersion !== version);
  if (!write) {
    log(`Dry run: ${changed.length} conversions; nothing written`);
    return changed;
  }
  if (changed.length) {
    const directory = dirname(sqlite.name);
    const backup = join(
      directory,
      `timelapses-v${version}-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.jsonl`,
    );
    const file = openSync(backup, "wx", 0o600);
    try {
      writeFileSync(
        file,
        changed
          .map(
            ({ stickerId, original }) =>
              JSON.stringify({ stickerId, gzipBase64: original.toString("base64") }) + "\n",
          )
          .join(""),
      );
      fsyncSync(file);
    } finally {
      closeSync(file);
    }
    const dir = openSync(directory, "r");
    try {
      fsyncSync(dir);
    } finally {
      closeSync(dir);
    }
    log(`Backed up ${changed.length} originals to ${backup}`);
  }
  const stage = `timelapse_v${version}_stage`;
  sqlite.exec(`create temp table ${stage} (sticker_id text primary key, ops blob not null)`);
  const insert = sqlite.prepare(`insert into temp.${stage} values (?, ?)`);
  sqlite.transaction(() => {
    for (const row of staged) insert.run(row.stickerId, row.converted);
  })();
  log(`Staged ${staged.length} recordings without changing stored rows`);
  return changed;
}
