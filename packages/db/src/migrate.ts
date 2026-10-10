import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databasePath } from "./client.ts";
import { needsDrawnSizes, stageDrawnSizes } from "./drawnSizes.ts";

export const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/** How many migrations the database has applied: none before the migrator first makes its table. */
function appliedMigrations(sqlite: Database.Database): number {
  const table = sqlite
    .prepare("select 1 from sqlite_master where type = 'table' and name = '__drizzle_migrations'")
    .get();
  if (!table) return 0;
  const row = sqlite
    .prepare<[], { n: number }>("select count(*) as n from __drizzle_migrations")
    .get();
  return row?.n ?? 0;
}

/**
 * Applies pending migrations on a connection of its own, with foreign keys off: rebuilding a table
 * needs them off, and SQLite ignores the pragma inside the migrator's transaction. When it applied
 * any, it then checks every foreign key and fails on any row that breaks one. A start that applied
 * none skips the check, so a row broken by hand can't stop every start after it.
 */
export function migrateDatabase(path = databasePath): void {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  try {
    sqlite.pragma("foreign_keys = OFF");
    if (needsDrawnSizes(sqlite)) stageDrawnSizes(sqlite, { write: true });
    const applied = appliedMigrations(sqlite);
    migrate(drizzle({ client: sqlite }), { migrationsFolder });
    if (appliedMigrations(sqlite) === applied) return;
    const broken = sqlite.pragma("foreign_key_check");
    if (Array.isArray(broken) && broken.length > 0) {
      throw new Error(`Migrations left rows that break foreign keys: ${JSON.stringify(broken)}`);
    }
  } finally {
    sqlite.close();
  }
}

if (import.meta.main) migrateDatabase();
