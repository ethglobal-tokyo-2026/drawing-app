import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * The SQLite file, overridable with `DATABASE_URL`. Relative paths resolve
 * against the repo root so every package opens the same file.
 */
export const databasePath = resolve(repoRoot, process.env.DATABASE_URL ?? "data/drawing-app.db");

/** Opens the database as a Drizzle client typed by the schema. */
export function openDb(path = databasePath) {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  // WAL keeps reads going during a write; SQLite only enforces foreign keys when asked.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle({ client: sqlite, schema });
}

export type Db = ReturnType<typeof openDb>;
