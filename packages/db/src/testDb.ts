import { createHash, randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.ts";
import type { KyotoSeikaSubject } from "./schema/index.ts";
import { DAILY_TICKETS_PER_DAY, GIFT_EXPIRY_MS } from "./schema/limits.ts";
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
    .values({ id, lineUserId: `line-${id}`, lineDisplayName: id, language: "en", ...values })
    .run();
  return id;
}

let nextNumber = 0;

/**
 * Inserts a sealed, unminted sticker that `artistId` drew and holds, and returns its id. An NSFW
 * one comes with its veil, as sealing makes it before the row.
 */
export function insertSticker(
  db: TestDb,
  artistId: string,
  values: Partial<typeof schema.stickers.$inferInsert> = {},
) {
  const id = values.id ?? newId("sticker");
  const nsfw = values.nsfw ?? false;
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
      nsfw,
      contentHash: bytes32(id),
      veiledHash: nsfw ? bytes32(`veiled-${id}`) : null,
      ...values,
    })
    .run();
  return id;
}

/**
 * A Kyoto Seika Subject pair from the test's first sitting, as a sticker drawn in Kyoto Seika Manga
 * Expression Practice Mode keeps it.
 */
export const TEST_KYOTO_SEIKA_SUBJECTS: [KyotoSeikaSubject, KyotoSeikaSubject] = [
  { ja: "風", reading: "かぜ", en: "wind" },
  { ja: "再会", reading: "さいかい", en: "reunion" },
];

/** The ticket day of a use a test doesn't place. */
const TICKET_DAY = "2026-09-26";

/**
 * Spends one of `userId`'s tickets straight into ticket_uses, as spending leaves it: the day's next
 * slot, daily for its first DAILY_TICKETS_PER_DAY unless `kind` says otherwise, under a new spend
 * key. Returns the use's id.
 */
export function insertTicketUse(
  db: TestDb,
  userId: string,
  values: Partial<typeof schema.ticketUses.$inferInsert> = {},
) {
  const ticketDay = values.ticketDay ?? TICKET_DAY;
  const spentToday = db
    .select({ n: count() })
    .from(schema.ticketUses)
    .where(and(eq(schema.ticketUses.userId, userId), eq(schema.ticketUses.ticketDay, ticketDay)))
    .get();
  const dayIndex = values.dayIndex ?? spentToday?.n ?? 0;
  const use = db
    .insert(schema.ticketUses)
    .values({
      userId,
      idempotencyKey: randomUUID(),
      ticketDay,
      dayIndex,
      kind: dayIndex < DAILY_TICKETS_PER_DAY ? "daily" : "reserve",
      ...values,
    })
    .returning({ id: schema.ticketUses.id })
    .get();
  return use.id;
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

/** Marks a gift received by `receiverId` with its claim landed, and hands them the sticker. */
export function receiveGift(
  db: TestDb,
  giftId: string,
  receiverId: string,
  receivedAt = new Date(),
) {
  const gift = db
    .update(schema.gifts)
    .set({ status: "received", receiverId, receivedAt, escrowStatus: "claimed" })
    .where(eq(schema.gifts.id, giftId))
    .returning()
    .get();
  if (!gift) throw new Error(`There's no gift ${giftId} to receive`);
  db.update(schema.stickers)
    .set({ ownerId: receiverId })
    .where(eq(schema.stickers.id, gift.stickerId))
    .run();
  db.insert(schema.stickerPlacements)
    .values({ userId: receiverId, stickerId: gift.stickerId })
    .onConflictDoNothing()
    .run();
  return gift;
}

/** The smallest combo: one tap that sends. */
export const ONE_TAP = { method: "tap", hits: 1, total: 10, peakMult: 1, peakTier: 0 } as const;

/** Records gratitude for a received gift: ONE_TAP, with `values` over it. Its replay is a placeholder. */
export function insertGratitude(
  db: TestDb,
  giftId: string,
  values: Partial<typeof schema.gratitude.$inferInsert> = {},
) {
  const row = db
    .insert(schema.gratitude)
    .values({
      giftId,
      idempotencyKey: newId("combo"),
      ...ONE_TAP,
      originalArtistGratitudeShare: 0,
      gameConfigVersion: "test",
      replay: gzipSync(JSON.stringify({ v: 1 })),
      ...values,
    })
    .returning()
    .get();
  if (!row) throw new Error(`Gratitude for gift ${giftId} wasn't recorded`);
  return row;
}
