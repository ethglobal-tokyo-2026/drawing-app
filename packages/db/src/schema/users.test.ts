import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser, refusal, type TestDb } from "../testDb.ts";
import { users } from "./index.ts";

let db: TestDb;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

describe("users", () => {
  it("keeps handles unique, ignoring letter case", () => {
    insertUser(db, { handle: "Alice" });
    expect(refusal(() => insertUser(db, { handle: "alice" }))).toMatch(/users_handle/);
  });

  it("lets people still at the handle prompt share a LINE name", () => {
    insertUser(db, { lineDisplayName: "Alice" });
    expect(() => insertUser(db, { lineDisplayName: "Alice" })).not.toThrow();
  });

  it("keeps no LINE data once an account is deleted", () => {
    const id = insertUser(db);
    const deleteAccount = (values: Partial<typeof users.$inferInsert>) =>
      db
        .update(users)
        .set({ deletedAt: new Date(), ...values })
        .where(eq(users.id, id))
        .run();
    expect(refusal(() => deleteAccount({}))).toMatch(/users_line/);
    expect(() =>
      deleteAccount({ lineUserId: null, lineDisplayName: null, linePictureUrl: null }),
    ).not.toThrow();
  });
});
