import { users } from "@drawing-app/db";
import { createTestDb, insertUser, type TestDb } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { meSchema, personSchema, toMe, toPerson } from "./shapes.ts";

let db: TestDb;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

/** Inserts a person and reads back their whole row. */
const userRow = (values: Parameters<typeof insertUser>[1] = {}) => {
  const id = insertUser(db, values);
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) throw new Error(`User ${id} wasn't inserted`);
  return row;
};

describe("shapes", () => {
  it("show other people only a person's public columns", () => {
    const row = userRow({ smartAccountAddress: `0x${"a".repeat(40)}` });
    expect(Object.keys(toPerson(row)).sort()).toEqual(Object.keys(personSchema.shape).sort());
  });

  it("send you as Me, needing a handle until you have one", () => {
    const counts = { newStickerCount: 2, unseenGratitudeCount: 1 };
    expect(meSchema.parse(toMe(userRow(), counts)).needsHandle).toBe(true);
    expect(meSchema.parse(toMe(userRow({ handle: "alice" }), counts)).needsHandle).toBe(false);
  });
});
