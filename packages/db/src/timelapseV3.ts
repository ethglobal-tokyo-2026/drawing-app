import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";
import {
  MAX_TIMELAPSE_JSON_BYTES,
  normalizeTimelapse,
  uploadedTimelapseSchema,
} from "./timelapseFormat.ts";

/** Whether the ordered v3 migration has yet to commit. */
export function needsTimelapsesV3(sqlite: Database.Database, folder: string): boolean {
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  const v3 = migrations.find((migration) =>
    migration.sql.some((sql) => sql.includes("timelapse_v3_stage")),
  );
  if (!v3) throw new Error("The migration journal has no timelapse v3 migration");
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
  return !last || last.created_at < v3.folderMillis;
}
interface Conversion {
  stickerId: string;
  original: Buffer;
  converted: Buffer;
  originalVersion: number;
}

/** Validates all recordings before backing up originals and staging bytes on this connection only. */
export function stageTimelapsesV3(
  sqlite: Database.Database,
  { write }: { write: boolean },
  log: (line: string) => void = console.log,
): Conversion[] {
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
  const staged: Conversion[] = [];
  const invalid: string[] = [];
  for (const { stickerId, number, ops } of rows) {
    try {
      const json: unknown = JSON.parse(
        gunzipSync(ops, { maxOutputLength: MAX_TIMELAPSE_JSON_BYTES }).toString(),
      );
      const parsed = uploadedTimelapseSchema.parse(json);
      const converted = parsed.v === 3 ? ops : gzipSync(JSON.stringify(normalizeTimelapse(parsed)));
      staged.push({ stickerId, original: ops, converted, originalVersion: parsed.v });
      log(`Sticker No.${number} ${stickerId}: v${parsed.v} to v3`);
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
  const changed = staged.filter((row) => row.originalVersion !== 3);
  if (!write) {
    log(`Dry run: ${changed.length} conversions; nothing written`);
    return changed;
  }
  if (changed.length) {
    const directory = dirname(sqlite.name);
    const backup = join(
      directory,
      `timelapses-v3-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.jsonl`,
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
  sqlite.exec(
    "create temp table timelapse_v3_stage (sticker_id text primary key, ops blob not null)",
  );
  const insert = sqlite.prepare("insert into temp.timelapse_v3_stage values (?, ?)");
  sqlite.transaction(() => {
    for (const row of staged) insert.run(row.stickerId, row.converted);
  })();
  log(`Staged ${staged.length} recordings without changing stored rows`);
  return changed;
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("Usage: node packages/db/src/timelapseV3.ts <database path>");
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    stageTimelapsesV3(sqlite, { write: false });
  } finally {
    sqlite.close();
  }
}
