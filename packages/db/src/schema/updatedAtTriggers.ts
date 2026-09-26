import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { NOW_SQL } from "./columns.ts";

/**
 * A trigger per table with an updated_at column. It moves updated_at on any update that left it
 * unchanged, which is every update made outside Drizzle.
 */
export function updatedAtTriggerStatements(tables: readonly SQLiteTable[]): string[] {
  return tables
    .map((table) => getTableConfig(table))
    .filter((config) => config.columns.some((column) => column.name === "updated_at"))
    .map(({ name }) =>
      [
        `CREATE TRIGGER \`${name}_updated_at\` AFTER UPDATE ON \`${name}\` FOR EACH ROW`,
        "WHEN NEW.`updated_at` IS OLD.`updated_at`",
        "BEGIN",
        `  UPDATE \`${name}\` SET \`updated_at\` = ${NOW_SQL} WHERE rowid = NEW.rowid;`,
        "END;",
      ].join("\n"),
    );
}
