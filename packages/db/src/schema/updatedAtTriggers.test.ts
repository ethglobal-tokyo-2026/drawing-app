import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser } from "../testDb.ts";
import { users } from "./index.ts";

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

  // The tables come from the database, which has every table the schema exports, so a table left
  // out of allTables fails here.
  it("has a trigger on every table", () => {
    const names = (query: string) => test.sqlite.prepare(query).pluck().all().map(String).sort();
    expect(names("select tbl_name from sqlite_master where type = 'trigger'")).toEqual(
      names("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"),
    );
  });
});
