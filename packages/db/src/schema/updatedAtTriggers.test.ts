import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser } from "../testDb.ts";
import { allTables, users } from "./index.ts";

let test: Awaited<ReturnType<typeof createTestDb>>;
let id: string;
beforeEach(async () => {
  test = await createTestDb();
  id = insertUser(test.db);
  // Put updated_at before created_at, so any move is visible.
  test.sqlite.prepare("update users set updated_at = created_at - 1 where id = ?").run(id);
});

describe("updated_at", () => {
  it("moves when Drizzle updates a row, and the update returns the new time", () => {
    const row = test.db
      .update(users)
      .set({ lineDisplayName: "Renamed" })
      .where(eq(users.id, id))
      .returning()
      .get();
    expect(row?.updatedAt.getTime()).toBeGreaterThanOrEqual(row?.createdAt.getTime() ?? Infinity);
  });

  it("moves when a row is edited outside Drizzle", () => {
    test.sqlite.prepare("update users set line_display_name = 'Renamed' where id = ?").run(id);
    const row = test.db.select().from(users).where(eq(users.id, id)).get();
    expect(row?.updatedAt.getTime()).toBeGreaterThanOrEqual(row?.createdAt.getTime() ?? Infinity);
  });

  it("has a trigger on every table", () => {
    const triggerTables = test.sqlite
      .prepare("select tbl_name from sqlite_master where type = 'trigger'")
      .pluck()
      .all()
      .map(String)
      .sort();
    expect(triggerTables).toEqual(allTables.map((table) => getTableConfig(table).name).sort());
  });
});
