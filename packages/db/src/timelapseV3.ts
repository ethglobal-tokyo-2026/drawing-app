import { gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import {
  normalizeTimelapse,
  timelapseV3Schema,
  uploadedTimelapseSchema,
} from "./timelapseFormat.ts";
import {
  needsTimelapsesVersion,
  stageTimelapsesVersion,
  type TimelapseConversion,
} from "./timelapseMigration.ts";

/** Whether the ordered v3 migration has yet to commit. */
export function needsTimelapsesV3(sqlite: Database.Database, folder: string): boolean {
  return needsTimelapsesVersion(sqlite, folder, 3);
}

/** Prepares historical v1/v2 recordings for migration 0016. */
export function stageTimelapsesV3(
  sqlite: Database.Database,
  { write }: { write: boolean },
  log: (line: string) => void = console.log,
): TimelapseConversion[] {
  return stageTimelapsesVersion(
    sqlite,
    3,
    { write },
    (json, original) => {
      const parsed = uploadedTimelapseSchema.parse(json);
      if (parsed.v === 4) throw new Error("v4 recording predates the v3 migration");
      return {
        converted:
          parsed.v === 3
            ? original
            : gzipSync(
                JSON.stringify(timelapseV3Schema.parse({ ...normalizeTimelapse(parsed), v: 3 })),
              ),
        originalVersion: parsed.v,
      };
    },
    log,
  );
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
