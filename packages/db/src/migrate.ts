import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databasePath } from "./client.ts";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/**
 * Applies pending migrations on a connection of its own, with foreign keys off: rebuilding a table
 * needs them off, and SQLite ignores the pragma inside the migrator's transaction. Then checks every
 * foreign key and fails on any row that breaks one.
 */
export function migrateDatabase(path = databasePath): void {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  try {
    sqlite.pragma("foreign_keys = OFF");
    migrate(drizzle({ client: sqlite }), { migrationsFolder });
    const broken = sqlite.pragma("foreign_key_check");
    if (Array.isArray(broken) && broken.length > 0) {
      throw new Error(`Migrations left rows that break foreign keys: ${JSON.stringify(broken)}`);
    }
  } finally {
    sqlite.close();
  }
}

if (import.meta.main) migrateDatabase();
