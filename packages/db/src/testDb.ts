import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.ts";
import { GIFT_EXPIRY_MS } from "./schema/limits.ts";
import { updatedAtTriggerStatements } from "./schema/updatedAtTriggers.ts";

/** A fresh in-memory database built from the schema, with foreign keys on: one per test. */
export async function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const migration = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson({ ...schema }),
  );
  for (const statement of migration) sqlite.exec(statement);
  for (const statement of updatedAtTriggerStatements(schema.allTables)) sqlite.exec(statement);
  return { db: drizzle({ client: sqlite, schema }), sqlite };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

/** Why the database refused a write. Drizzle wraps SQLite's error as its cause. */
export function refusal(write: () => unknown): string {
  try {
    write();
  } catch (error) {
    const reason = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    return reason instanceof Error ? reason.message : String(reason);
  }
  throw new Error("The database accepted the write");
}

let nextId = 0;
/** A new id, unique within the test run. */
export const newId = (prefix: string) => `${prefix}-${++nextId}`;

/** A 0x-prefixed 32-byte hex string derived from `seed`. */
export const bytes32 = (seed: string) => `0x${createHash("sha256").update(seed).digest("hex")}`;

/** Inserts a signed-in person and returns their id. */
export function insertUser(db: TestDb, values: Partial<typeof schema.users.$inferInsert> = {}) {
  const id = values.id ?? newId("user");
  db.insert(schema.users)
    .values({ id, lineUserId: `line-${id}`, lineDisplayName: id, ...values })
    .run();
  return id;
}

let nextNumber = 0;

/** Inserts a sealed, unminted sticker that `artistId` drew and holds, and returns its id. */
export function insertSticker(
  db: TestDb,
  artistId: string,
  values: Partial<typeof schema.stickers.$inferInsert> = {},
) {
  const id = values.id ?? newId("sticker");
  db.insert(schema.stickers)
    .values({
      id,
      number: ++nextNumber,
      artistId,
      ownerId: artistId,
      timeUsed: 0,
      width: 1,
      height: 1,
      outline: "M0 0Z",
      contentHash: bytes32(id),
      metadataUri: `https://cdn.test/stickers/${id}.json`,
      ...values,
    })
    .run();
  return id;
}

/** Packages a gift of `stickerId` from `giverId`, expiring after GIFT_EXPIRY_MS, and returns its id. */
export function packGift(
  db: TestDb,
  stickerId: string,
  giverId: string,
  values: Partial<typeof schema.gifts.$inferInsert> = {},
) {
  const id = values.id ?? bytes32(newId("gift"));
  db.insert(schema.gifts)
    .values({
      id,
      stickerId,
      giverId,
      claimCommitment: bytes32(`commitment-${id}`),
      expiresAt: new Date(Date.now() + GIFT_EXPIRY_MS),
      ...values,
    })
    .run();
  return id;
}
