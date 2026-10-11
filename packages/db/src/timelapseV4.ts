import { gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { normalizeTimelapse, uploadedTimelapseSchema } from "./timelapseFormat.ts";
import {
  needsTimelapsesVersion,
  stageTimelapsesVersion,
  type TimelapseConversion,
} from "./timelapseMigration.ts";

/** Whether the ordered v4 migration has yet to commit. */
export function needsTimelapsesV4(sqlite: Database.Database, folder: string): boolean {
  return needsTimelapsesVersion(sqlite, folder, 4);
}

/** Prepares historical v1/v2/v3 recordings for migration 0017. */
export function stageTimelapsesV4(
  sqlite: Database.Database,
  { write }: { write: boolean },
  log: (line: string) => void = console.log,
): TimelapseConversion[] {
  return stageTimelapsesVersion(
    sqlite,
    4,
    { write },
    (json, original) => {
      const parsed = uploadedTimelapseSchema.parse(json);
      return {
        converted: parsed.v === 4 ? original : gzipSync(JSON.stringify(normalizeTimelapse(parsed))),
        originalVersion: parsed.v,
      };
    },
    log,
  );
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("Usage: node packages/db/src/timelapseV4.ts <database path>");
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    stageTimelapsesV4(sqlite, { write: false });
  } finally {
    sqlite.close();
  }
}
