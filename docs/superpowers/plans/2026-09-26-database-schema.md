# Database Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `packages/db`'s stand-in `stickers` table with the decided schema: 8 tables with their rules as CHECKs and indexes, `updated_at` triggers, generated migrations and a migrator, all under test.

**Architecture:** One file per table group under `packages/db/src/schema/`, with the limits the rules use in `limits.ts`. Tests build a fresh in-memory database from the schema through drizzle-kit's API, so each table is test-driven before any migration exists. Task 8 generates the migrations and checks they build the same database. The migrator runs on its own connection with foreign keys off, then checks them.

**Tech Stack:** Drizzle ORM 0.45, drizzle-kit 0.31, better-sqlite3 13 (SQLite 3.53), vitest 5, TypeScript 7, Node 24.

**Decisions:** `docs/database-schema-and-rest-api.md`. The step-by-step flows are in the proposal on branch `worktree-schema-proposal` (`docs/superpowers/specs/2026-09-25-database-schema.md`); it predates some decisions, and the doc wins where they differ.

**Next plans, not this one:**

- the REST API: Hono routes and drizzle-zod types;
- the worker: mint, deposit check, claim, reject, return, LINE pushes;
- app changes: the start screen, the mint stub, the streak reset, the WorldScan link, taking back a sent gift, expiry, ticket packs.

**Ground rules:**

- Work in a worktree branched from `main` (superpowers:using-git-worktrees). One conventional commit per task; squash and drop AI attribution before merging (AGENTS.MD).
- Tests take limits from `limits.ts`; no hard-coded limits or durations.
- One test file: `pnpm --filter @drawing-app/db test -- src/schema/<name>.test.ts`. Before each commit: `pnpm --filter @drawing-app/db typecheck` and `pnpm --filter @drawing-app/db lint`.

## File structure

All paths are under `packages/db/`.

| File                              | Responsibility                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `src/schema/columns.ts`           | The database clock, `created_at` and `updated_at`, CHECK helpers               |
| `src/schema/limits.ts`            | Every limit the rules use                                                      |
| `src/schema/users.ts`             | `users`                                                                        |
| `src/schema/stickers.ts`          | `stickers`, `sticker_timelapses`                                               |
| `src/schema/tickets.ts`           | `ticket_uses`, `ticket_purchases`                                              |
| `src/schema/stickerPlacements.ts` | `sticker_placements`                                                           |
| `src/schema/gifts.ts`             | `gifts` and its statuses                                                       |
| `src/schema/gratitude.ts`         | `gratitude`                                                                    |
| `src/schema/updatedAtTriggers.ts` | The `updated_at` trigger for each table                                        |
| `src/schema/index.ts`             | Exports every table, and `allTables`                                           |
| `src/testDb.ts`                   | Tests only: a fresh database from the schema, row helpers, `refusal()`         |
| `src/migrate.ts`                  | `migrateDatabase()`: its own connection, foreign keys off, `foreign_key_check` |
| `drizzle/`                        | Generated migrations, and the custom trigger migration                         |
| `src/schema.ts`                   | Deleted: the stand-in table                                                    |

Tests sit beside what they test: `src/schema/<name>.test.ts`, `src/migrate.test.ts`.

---

### Task 1: Describe the schema and REST API for UI work

- [x] **Done:** `docs/database-schema-and-rest-api.md`, the AGENTS.MD pointer to it, and the Original Artist vocabulary row, in 59487df on branch `docs/schema-and-rest-api`. Pushing it to `main` waits for ad0ll.

### Task 2: Test harness, shared columns and `users`

**Files:**

- Modify: `packages/db/package.json`, `packages/db/src/client.ts`, `packages/db/src/index.ts`, `packages/db/drizzle.config.ts`
- Create: `src/schema/columns.ts`, `src/schema/limits.ts`, `src/schema/users.ts`, `src/schema/updatedAtTriggers.ts`, `src/schema/index.ts`, `src/testDb.ts`
- Test: `src/schema/users.test.ts`, `src/schema/updatedAtTriggers.test.ts`
- Delete: `src/schema.ts`

- [ ] **Step 1: Add vitest**

Run: `pnpm --filter @drawing-app/db add -D vitest@^5.0.1`

In `packages/db/package.json`, add to `scripts`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the test harness**

`packages/db/src/testDb.ts`:

```ts
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.ts";
import { updatedAtTriggerStatements } from "./schema/updatedAtTriggers.ts";

/** A fresh in-memory database built from the schema, with foreign keys on: one per test. */
export async function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson({ ...schema });
  for (const statement of await generateSQLiteMigration(empty, current)) sqlite.exec(statement);
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
```

- [ ] **Step 3: Write the failing tests**

`packages/db/src/schema/users.test.ts`:

```ts
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
```

`packages/db/src/schema/updatedAtTriggers.test.ts`:

```ts
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
```

- [ ] **Step 4: Run them to see them fail**

Run: `pnpm --filter @drawing-app/db test`
Expected: FAIL, with `src/schema/index.ts` not found.

- [ ] **Step 5: Write the shared columns and limits**

`packages/db/src/schema/columns.ts`:

```ts
import { sql, type SQL } from "drizzle-orm";
import { integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/** The database's clock, in milliseconds. */
export const NOW_SQL = "(cast(unixepoch('subsec') * 1000 as integer))";
const now = sql.raw(NOW_SQL);

/**
 * created_at is set once, by the database, on insert. updated_at starts equal and moves on every
 * update: Drizzle sets it in the statement, and each table's trigger (updatedAtTriggers.ts) catches
 * updates made outside Drizzle.
 */
export const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now)
    .$onUpdate(() => now),
});

/** A CHECK that a column holds one of a closed set of values. */
export const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL =>
  sql`${column} in ${sql.raw(`(${values.map((v) => `'${v}'`).join(", ")})`)}`;

/** A CHECK that a column holds a 0x-prefixed 32-byte hex string. */
export const isBytes32 = (column: AnySQLiteColumn): SQL =>
  sql`length(${column}) = 66 and ${column} like '0x%'`;

/** A number in a CHECK, which can't take parameters. */
export const literal = (value: number): SQL => sql.raw(String(value));
```

`packages/db/src/schema/limits.ts`:

```ts
/** The drawing clock's length, in seconds. Matches the app's SESSION_MS. */
export const MAX_TIME_USED_S = 3 * 60;
/** How long a gift waits in the escrow before it returns to its giver. */
export const GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
/** Counted hits in one gratitude combo, at most. */
export const MAX_HITS = 120;
/** The highest gratitude tier, 昇天. */
export const MAX_PEAK_TIER = 4;
/** The gratitude multiplier's ceiling. */
export const MAX_PEAK_MULT = 8;
```

- [ ] **Step 6: Write `users`, the triggers and the schema index**

`packages/db/src/schema/users.ts`:

```ts
import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /**
     * The verified ID token's `sub`, set at the first sign-in. Finds a returning person, and is the
     * Official account's push target. Cleared on account deletion.
     */
    lineUserId: text("line_user_id").unique(),
    /**
     * From the verified ID token, refreshed at every sign-in. LINE gives each person only their own
     * profile, so this is how other people see them. Cleared on account deletion.
     */
    lineDisplayName: text("line_display_name"),
    linePictureUrl: text("line_picture_url"),
    /**
     * Unique ignoring letter case. Set at the first sign-in to the LINE name when no one has it,
     * otherwise from the handle prompt; null only until the prompt is answered.
     */
    handle: text("handle"),
    /** IANA zone from the device at the first sign-in. Ticket days turn over at 4:00 here. */
    timeZone: text("time_zone").notNull().default("Asia/Tokyo"),
    /**
     * The Privy smart wallet on World Chain, lowercase. Stickers are minted and claimed to it, and it
     * maps chain events back to a person. Set from Privy the first time the server needs it.
     */
    smartAccountAddress: text("smart_account_address").unique(),
    /** Set on the first action, which carries the terms line. */
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    /** Set on account deletion. The row stays, as the Original Artist of their stickers. */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_handle").on(sql`lower(${t.handle})`),
    check(
      "users_line",
      sql`(${t.deletedAt} is null and ${t.lineUserId} is not null and ${t.lineDisplayName} is not null)
        or (${t.deletedAt} is not null and ${t.lineUserId} is null and ${t.lineDisplayName} is null and ${t.linePictureUrl} is null)`,
    ),
    check(
      "users_smart_account_address",
      sql`${t.smartAccountAddress} is null
        or (length(${t.smartAccountAddress}) = 42 and ${t.smartAccountAddress} = lower(${t.smartAccountAddress}))`,
    ),
  ],
);
```

`packages/db/src/schema/updatedAtTriggers.ts`:

```ts
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
```

`packages/db/src/schema/index.ts`:

```ts
import { users } from "./users.ts";

export { users };

/** Every table: the updated_at triggers cover each one. */
export const allTables = [users] as const;
```

- [ ] **Step 7: Point the package at the new schema**

Delete `packages/db/src/schema.ts`.

In `packages/db/src/client.ts`, change the schema import to:

```ts
import * as schema from "./schema/index.ts";
```

Replace `packages/db/src/index.ts` with:

```ts
export { databasePath, openDb, type Db } from "./client.ts";
export * from "./schema/index.ts";
export * from "./schema/limits.ts";
```

In `packages/db/drizzle.config.ts`, set `schema: "./src/schema/index.ts"`.

- [ ] **Step 8: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS.

Run: `pnpm --filter @drawing-app/db typecheck && pnpm --filter @drawing-app/db lint`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): add the users table, updated_at triggers and a test harness" -- packages/db pnpm-lock.yaml
```

### Task 3: `stickers` and `sticker_timelapses`

**Files:**

- Create: `packages/db/src/schema/stickers.ts`
- Modify: `packages/db/src/schema/index.ts`, `packages/db/src/testDb.ts`
- Test: `packages/db/src/schema/stickers.test.ts`

- [ ] **Step 1: Add the sticker helper to the harness**

Append to `packages/db/src/testDb.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing test**

`packages/db/src/schema/stickers.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  bytes32,
  createTestDb,
  insertSticker,
  insertUser,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { MAX_TIME_USED_S } from "./limits.ts";

let db: TestDb;
let artist: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  artist = insertUser(db);
});

describe("stickers", () => {
  it("keeps time used within the drawing clock", () => {
    expect(() => insertSticker(db, artist, { timeUsed: MAX_TIME_USED_S })).not.toThrow();
    expect(refusal(() => insertSticker(db, artist, { timeUsed: MAX_TIME_USED_S + 1 }))).toMatch(
      /stickers_time_used/,
    );
  });

  it("sets a token ID only with the mint transaction that made it", () => {
    expect(refusal(() => insertSticker(db, artist, { tokenId: "1" }))).toMatch(/stickers_minted/);
    expect(() =>
      insertSticker(db, artist, { tokenId: "1", mintTxHash: bytes32("mint") }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/schema/stickers.test.ts`
Expected: FAIL: `schema.stickers` is undefined in `insertSticker`.

- [ ] **Step 4: Write the tables**

`packages/db/src/schema/stickers.ts`:

```ts
import { sql } from "drizzle-orm";
import { blob, check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { isBytes32, literal, timestamps } from "./columns.ts";
import { MAX_TIME_USED_S } from "./limits.ts";
import { users } from "./users.ts";

/** A sealed sticker. Everything but owner_id and the mint is fixed at seal; created_at is the seal. */
export const stickers = sqliteTable(
  "stickers",
  {
    /** Made by the server at seal. The NFT's sticker key is keccak256 of this string. */
    id: text("id").primaryKey(),
    /** The running number shown as No.0147, counted across everyone at seal. */
    number: integer("number").notNull().unique(),
    /** The Original Artist. */
    artistId: text("artist_id")
      .notNull()
      .references(() => users.id),
    /**
     * Who holds it: the Original Artist at seal, then each receiver when they receive it. Indexes the
     * NFT's owner as a person, a few seconds ahead of the chain while a claim lands.
     */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    /** Seconds on the drawing clock, which pauses. 0 if sealed within the first second. */
    timeUsed: integer("time_used").notNull(),
    /** The sticker image's size; the mask and resin masks share it. */
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** The cut line as an SVG path in image pixels. */
    outline: text("outline").notNull(),
    /** keccak256 of the sticker PNG. Names its five image files on the CDN, and goes to the mint. */
    contentHash: text("content_hash").notNull(),
    /** The metadata JSON's CDN URL, known at seal. Goes to the mint as the NFT's tokenURI. */
    metadataUri: text("metadata_uri").notNull(),
    /** uint256 as decimal text. Set with mint_tx_hash when the mint lands. */
    tokenId: text("token_id").unique(),
    mintTxHash: text("mint_tx_hash"),
    ...timestamps(),
  },
  (t) => [
    index("stickers_owner").on(t.ownerId),
    index("stickers_artist").on(t.artistId, t.createdAt),
    index("stickers_created").on(t.createdAt),
    check("stickers_time_used", sql`${t.timeUsed} between 0 and ${literal(MAX_TIME_USED_S)}`),
    check("stickers_size", sql`${t.width} > 0 and ${t.height} > 0`),
    check("stickers_content_hash", isBytes32(t.contentHash)),
    check("stickers_minted", sql`(${t.tokenId} is null) = (${t.mintTxHash} is null)`),
  ],
);

/** How a sticker was drawn, inserted with it at seal. Its own table, so board reads never load it. */
export const stickerTimelapses = sqliteTable("sticker_timelapses", {
  stickerId: text("sticker_id")
    .primaryKey()
    .references(() => stickers.id),
  /**
   * Gzipped JSON with a format version: the ink canvas's size, where the sticker sits on it, and
   * every op in the order drawn (the app's strokes and fills, with their times).
   */
  ops: blob("ops", { mode: "buffer" }).notNull(),
  ...timestamps(),
});
```

Replace `packages/db/src/schema/index.ts` with:

```ts
import { stickers, stickerTimelapses } from "./stickers.ts";
import { users } from "./users.ts";

export { stickers, stickerTimelapses, users };

/** Every table: the updated_at triggers cover each one. */
export const allTables = [users, stickers, stickerTimelapses] as const;
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add stickers and their timelapses" -- packages/db
```

### Task 4: `ticket_uses` and `ticket_purchases`

**Files:**

- Create: `packages/db/src/schema/tickets.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema/tickets.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/db/src/schema/tickets.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertUser, refusal, type TestDb } from "../testDb.ts";
import { ticketPurchases, ticketUses } from "./index.ts";

let db: TestDb;
let userId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
});

describe("tickets", () => {
  it("spends each ticket slot of a day once, so a double tap can't spend two", () => {
    const spend = () =>
      db.insert(ticketUses).values({ userId, ticketDay: "2026-09-26", dayIndex: 0 }).run();
    spend();
    expect(refusal(spend)).toMatch(/UNIQUE constraint failed: ticket_uses/);
  });

  it("counts one Sui payment once", () => {
    const record = () =>
      db
        .insert(ticketPurchases)
        .values({ userId, tickets: 1, priceYen: 100, paidMist: "1", txDigest: "digest" })
        .run();
    record();
    expect(refusal(record)).toMatch(/ticket_purchases.tx_digest/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/schema/tickets.test.ts`
Expected: FAIL: `ticketUses` isn't exported from `./index.ts`.

- [ ] **Step 3: Write the tables**

`packages/db/src/schema/tickets.ts`:

```ts
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/**
 * A spent ticket: inserted when the start screen's button spends it, linked to its sticker at seal.
 * An abandoned drawing keeps its ticket spent with no sticker.
 */
export const ticketUses = sqliteTable(
  "ticket_uses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** YYYY-MM-DD in the person's zone, turning over at 4:00. */
    ticketDay: text("ticket_day").notNull(),
    /** Order within the day, from 0. The day's free tickets go first. */
    dayIndex: integer("day_index").notNull(),
    stickerId: text("sticker_id")
      .unique()
      .references(() => stickers.id),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ticket_uses_day").on(t.userId, t.ticketDay, t.dayIndex),
    check("ticket_uses_day_index", sql`${t.dayIndex} >= 0`),
  ],
);

/** A pack of tickets bought with Sui. Its tickets count once verified_at is set. */
export const ticketPurchases = sqliteTable(
  "ticket_purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tickets: integer("tickets").notNull(),
    /** The pack's price in yen. */
    priceYen: integer("price_yen").notNull(),
    /** What the Sui payment carried, in MIST, as decimal text. */
    paidMist: text("paid_mist").notNull(),
    /** The Sui transaction digest; one payment counts once. */
    txDigest: text("tx_digest").notNull().unique(),
    /** Set once the server has checked the payment on Sui (at once for the mock payment). */
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("ticket_purchases_user").on(t.userId),
    check("ticket_purchases_pack", sql`${t.tickets} > 0 and ${t.priceYen} > 0`),
  ],
);
```

Replace `packages/db/src/schema/index.ts` with:

```ts
import { stickers, stickerTimelapses } from "./stickers.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";

export { stickers, stickerTimelapses, ticketPurchases, ticketUses, users };

/** Every table: the updated_at triggers cover each one. */
export const allTables = [users, stickers, stickerTimelapses, ticketUses, ticketPurchases] as const;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add ticket uses and ticket purchases" -- packages/db
```

### Task 5: `sticker_placements`

**Files:**

- Create: `packages/db/src/schema/stickerPlacements.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema/stickerPlacements.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/db/src/schema/stickerPlacements.test.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, insertSticker, insertUser, refusal, type TestDb } from "../testDb.ts";
import { stickerPlacements } from "./index.ts";

let db: TestDb;
let userId: string;
let stickerId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  userId = insertUser(db);
  stickerId = insertSticker(db, userId);
  db.insert(stickerPlacements).values({ userId, stickerId }).run();
});

const place = (values: Partial<typeof stickerPlacements.$inferInsert>) =>
  db
    .update(stickerPlacements)
    .set(values)
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .run();

describe("sticker placements", () => {
  it("stores a placement whole or not at all", () => {
    expect(refusal(() => place({ onBoard: true }))).toMatch(/sticker_placements_placement/);
    expect(() =>
      place({ onBoard: true, x: 0.5, y: 0.5, scale: 0.5, rotation: 0, z: 0 }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/schema/stickerPlacements.test.ts`
Expected: FAIL: `stickerPlacements` isn't exported from `./index.ts`.

- [ ] **Step 3: Write the table**

`packages/db/src/schema/stickerPlacements.ts`:

```ts
import { sql } from "drizzle-orm";
import { check, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/**
 * A sticker's placement on a person's Sticker Board: on the board, or waiting in its sticker tray.
 * Inserted when the sticker first reaches them (at seal, or when they receive it), so created_at
 * orders the tray. It stays after they give the sticker away: the board keeps its given sticker
 * silhouette, and its spot on the sticker sheet stays empty.
 */
export const stickerPlacements = sqliteTable(
  "sticker_placements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    // Null until the owner's board first places the sticker, then moved by every drag, resize, turn
    // and Remove. The app's `placement`: { on, x, y, s, r, z }.
    /** False while it waits in the sticker tray; its last spot is kept. */
    onBoard: integer("on_board", { mode: "boolean" }),
    /** Centre, as fractions of the board's field. */
    x: real("x"),
    y: real("y"),
    /** The long side, as a fraction of the board's width. */
    scale: real("scale"),
    /** Clockwise, in degrees. */
    rotation: real("rotation"),
    /** Stacking order; higher is on top. */
    z: integer("z"),
    /** The tray zipped shut with its sticker sheet open. Null shows NEW. */
    seenAt: integer("seen_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "sticker_placements_placement",
      sql`(${t.onBoard} is null and ${t.x} is null and ${t.y} is null and ${t.scale} is null and ${t.rotation} is null and ${t.z} is null)
        or (${t.onBoard} is not null and ${t.x} between 0 and 1 and ${t.y} between 0 and 1
          and ${t.scale} > 0 and ${t.scale} <= 1 and ${t.rotation} is not null and ${t.z} is not null)`,
    ),
  ],
);
```

Replace `packages/db/src/schema/index.ts` with:

```ts
import { stickerPlacements } from "./stickerPlacements.ts";
import { stickers, stickerTimelapses } from "./stickers.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";

export { stickerPlacements, stickers, stickerTimelapses, ticketPurchases, ticketUses, users };

/** Every table: the updated_at triggers cover each one. */
export const allTables = [
  users,
  stickers,
  stickerTimelapses,
  ticketUses,
  ticketPurchases,
  stickerPlacements,
] as const;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add sticker placements" -- packages/db
```

### Task 6: `gifts`

**Files:**

- Create: `packages/db/src/schema/gifts.ts`
- Modify: `packages/db/src/schema/index.ts`, `packages/db/src/testDb.ts`
- Test: `packages/db/src/schema/gifts.test.ts`

- [ ] **Step 1: Add the gift helper to the harness**

Append to `packages/db/src/testDb.ts` (add `GIFT_EXPIRY_MS` to the imports: `import { GIFT_EXPIRY_MS } from "./schema/limits.ts";`):

```ts
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
```

- [ ] **Step 2: Write the failing test**

`packages/db/src/schema/gifts.test.ts`:

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bytes32,
  createTestDb,
  insertSticker,
  insertUser,
  packGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { gifts } from "./index.ts";
import { GIFT_EXPIRY_MS } from "./limits.ts";

let db: TestDb;
let giver: string;
let receiver: string;
let sticker: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  giver = insertUser(db);
  receiver = insertUser(db);
  sticker = insertSticker(db, giver);
});

const update = (id: string, values: Partial<typeof gifts.$inferInsert>) =>
  db.update(gifts).set(values).where(eq(gifts.id, id)).run();
const deposited = { escrowStatus: "pending" } as const;
const sent = () => ({ status: "sent", sentAt: new Date() }) as const;
const received = (by: string) =>
  ({ status: "received", receiverId: by, receivedAt: new Date() }) as const;
const takenOut = () => ({ status: "taken_out", takenOutAt: new Date() }) as const;

describe("gifts", () => {
  it("is sent only once its deposit has landed", () => {
    const id = packGift(db, sticker, giver);
    expect(refusal(() => update(id, sent()))).toMatch(/gifts_status_escrow/);
    update(id, deposited);
    expect(() => update(id, sent())).not.toThrow();
  });

  it("keeps each status's dates with it", () => {
    const id = packGift(db, sticker, giver, deposited);
    expect(refusal(() => update(id, { status: "sent" }))).toMatch(/gifts_status_dates/);
    update(id, received(receiver));
    expect(refusal(() => update(id, takenOut()))).toMatch(/gifts_status_dates/);
  });

  it("can be taken back after it's sent", () => {
    const id = packGift(db, sticker, giver, { ...deposited, ...sent() });
    expect(() => update(id, takenOut())).not.toThrow();
  });

  it("gives a sticker one gift at a time, until the escrow lets it go", () => {
    const first = packGift(db, sticker, giver, deposited);
    expect(refusal(() => packGift(db, sticker, giver))).toMatch(/gifts.sticker_id/);
    update(first, takenOut());
    expect(refusal(() => packGift(db, sticker, giver))).toMatch(/gifts.sticker_id/);
    update(first, { escrowStatus: "rejected", rejectTxHash: bytes32("reject") });
    expect(() => packGift(db, sticker, giver)).not.toThrow();
  });

  it("keeps the receive when a claim misses the expiry and the gift returns", () => {
    const id = packGift(db, sticker, giver, deposited);
    update(id, received(receiver));
    expect(() =>
      update(id, {
        status: "returned",
        returnedAt: new Date(),
        returnTxHash: bytes32("return"),
        escrowStatus: "expired_returned",
      }),
    ).not.toThrow();
  });

  it("refuses an expiry before packaging, and a gift received by its giver", () => {
    const expired = new Date(Date.now() - GIFT_EXPIRY_MS);
    expect(refusal(() => packGift(db, sticker, giver, { expiresAt: expired }))).toMatch(
      /gifts_expiry/,
    );
    const id = packGift(db, sticker, giver, deposited);
    expect(refusal(() => update(id, received(giver)))).toMatch(/gifts_not_to_self/);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/schema/gifts.test.ts`
Expected: FAIL: `gifts` isn't exported from `./index.ts`.

- [ ] **Step 4: Write the table**

`packages/db/src/schema/gifts.ts`:

```ts
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { isBytes32, oneOf, timestamps } from "./columns.ts";
import { stickers } from "./stickers.ts";
import { users } from "./users.ts";

/** The app's gift states, Receiving's, and the escrow's return after GIFT_EXPIRY_MS. */
export const giftStatuses = ["packed", "sent", "received", "taken_out", "returned"] as const;
/** StickerGiftEscrow's GiftStatus, verbatim. */
export const escrowStatuses = [
  "missing",
  "pending",
  "claimed",
  "rejected",
  "expired_returned",
] as const;

/**
 * One Giving of one sticker. Inserted at Packaging; the giver's smart wallet then sends the sticker
 * to the escrow. status says where it stands, and each step keeps its own date. The giver can take
 * it back until it's received; after GIFT_EXPIRY_MS the escrow returns it.
 */
export const gifts = sqliteTable(
  "gifts",
  {
    /** The escrow's giftId: random bytes32 from createGiftClaim. */
    id: text("id").primaryKey(),
    stickerId: text("sticker_id")
      .notNull()
      .references(() => stickers.id),
    giverId: text("giver_id")
      .notNull()
      .references(() => users.id),
    /**
     * keccak256 of the Gift Claim Token, which only the gift link carries. Receiving finds the gift
     * by it; the escrow holds the same value but can't be searched by it.
     */
    claimCommitment: text("claim_commitment").notNull().unique(),
    status: text("status", { enum: giftStatuses }).notNull().default("packed"),
    /**
     * StickerGiftEscrow.gifts(id).status: `pending` once the deposit is read and checked; `claimed`,
     * `rejected` or `expired_returned` when our claim, reject or return lands.
     */
    escrowStatus: text("escrow_status", { enum: escrowStatuses }).notNull().default("missing"),
    /**
     * The escrow's expiry, GIFT_EXPIRY_MS after Packaging; the deposit carries it. Receiving is
     * refused after it, and the worker has the escrow return the sticker.
     */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    /** LINE's picker reported the Gift Message sent. */
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    /**
     * Taken back before anyone received it, from the bag or after sending; or by the server, for a
     * deposit that didn't match.
     */
    takenOutAt: integer("taken_out_at", { mode: "timestamp_ms" }),
    /** Set with received_at when someone receives it. */
    receiverId: text("receiver_id").references(() => users.id),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }),
    /** The expiry passed before a receive landed on chain, so the escrow returned it to the giver. */
    returnedAt: integer("returned_at", { mode: "timestamp_ms" }),
    /** Our relayer's claimGift, set when sent. */
    claimTxHash: text("claim_tx_hash"),
    /** Our relayer's rejectGift, set when sent. */
    rejectTxHash: text("reject_tx_hash"),
    /** Our relayer's returnExpiredGift, set when sent. */
    returnTxHash: text("return_tx_hash"),
    /** The Official account's "Bob accepted your sticker ♡" push went out, or was given up on. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    // One gift per sticker at a time: while it's in the bag or sent, and while the escrow still holds
    // the NFT, since the escrow refuses a second deposit of the same token.
    uniqueIndex("gifts_one_per_sticker")
      .on(t.stickerId)
      .where(sql`${t.status} in ('packed', 'sent') or ${t.escrowStatus} = 'pending'`),
    index("gifts_giver").on(t.giverId, t.status),
    index("gifts_receiver").on(t.receiverId),
    index("gifts_transfer_trail").on(t.stickerId, t.receivedAt),
    index("gifts_received").on(t.receivedAt),
    index("gifts_escrow_open")
      .on(t.escrowStatus)
      .where(sql`${t.escrowStatus} in ('missing', 'pending')`),
    index("gifts_expiring")
      .on(t.expiresAt)
      .where(sql`${t.status} in ('packed', 'sent')`),
    index("gifts_push_due")
      .on(t.receivedAt)
      .where(sql`${t.status} = 'received' and ${t.pushedToGiverAt} is null`),
    check("gifts_id", isBytes32(t.id)),
    check("gifts_claim_commitment", isBytes32(t.claimCommitment)),
    check("gifts_status", oneOf(t.status, giftStatuses)),
    check("gifts_escrow_status", oneOf(t.escrowStatus, escrowStatuses)),
    // Each status has its dates, and no others. A received gift may lack sent_at: the message can go
    // out while the picker never reports back. A returned gift may have been received, if its claim
    // didn't land before the expiry.
    check(
      "gifts_status_dates",
      sql`(${t.status} = 'packed' and ${t.sentAt} is null and ${t.receivedAt} is null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'sent' and ${t.sentAt} is not null and ${t.receivedAt} is null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'received' and ${t.receivedAt} is not null and ${t.takenOutAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'taken_out' and ${t.takenOutAt} is not null and ${t.receivedAt} is null and ${t.returnedAt} is null)
        or (${t.status} = 'returned' and ${t.returnedAt} is not null and ${t.takenOutAt} is null)`,
    ),
    // What the escrow can hold at each status. Nothing is sent or received before the deposit.
    check(
      "gifts_status_escrow",
      sql`(${t.status} = 'packed' and ${t.escrowStatus} in ('missing', 'pending'))
        or (${t.status} = 'sent' and ${t.escrowStatus} = 'pending')
        or (${t.status} = 'received' and ${t.escrowStatus} in ('pending', 'claimed'))
        or (${t.status} = 'taken_out' and ${t.escrowStatus} in ('missing', 'pending', 'rejected'))
        or (${t.status} = 'returned' and ${t.escrowStatus} in ('pending', 'expired_returned'))`,
    ),
    check("gifts_receiver", sql`(${t.receiverId} is null) = (${t.receivedAt} is null)`),
    check("gifts_not_to_self", sql`${t.receiverId} is null or ${t.receiverId} <> ${t.giverId}`),
    check("gifts_expiry", sql`${t.expiresAt} > ${t.createdAt}`),
    check(
      "gifts_transactions",
      sql`(${t.claimTxHash} is null or ${t.receivedAt} is not null)
        and (${t.rejectTxHash} is null or ${t.status} = 'taken_out')
        and (${t.returnTxHash} is null or ${t.status} = 'returned')`,
    ),
    check("gifts_pushed", sql`${t.pushedToGiverAt} is null or ${t.receivedAt} is not null`),
  ],
);
```

Replace `packages/db/src/schema/index.ts` with:

```ts
import { gifts } from "./gifts.ts";
import { stickerPlacements } from "./stickerPlacements.ts";
import { stickers, stickerTimelapses } from "./stickers.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";

export { escrowStatuses, giftStatuses } from "./gifts.ts";
export {
  gifts,
  stickerPlacements,
  stickers,
  stickerTimelapses,
  ticketPurchases,
  ticketUses,
  users,
};

/** Every table: the updated_at triggers cover each one. */
export const allTables = [
  users,
  stickers,
  stickerTimelapses,
  ticketUses,
  ticketPurchases,
  stickerPlacements,
  gifts,
] as const;
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add gifts, with their statuses and the escrow's" -- packages/db
```

### Task 7: `gratitude`

**Files:**

- Create: `packages/db/src/schema/gratitude.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema/gratitude.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/db/src/schema/gratitude.test.ts`:

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createTestDb,
  insertSticker,
  insertUser,
  newId,
  packGift,
  refusal,
  type TestDb,
} from "../testDb.ts";
import { gifts, gratitude } from "./index.ts";
import { MAX_HITS } from "./limits.ts";

let db: TestDb;
let giftId: string;
beforeEach(async () => {
  ({ db } = await createTestDb());
  const giver = insertUser(db);
  const receiver = insertUser(db);
  giftId = packGift(db, insertSticker(db, giver), giver, { escrowStatus: "pending" });
  db.update(gifts)
    .set({ status: "received", receiverId: receiver, receivedAt: new Date() })
    .where(eq(gifts.id, giftId))
    .run();
});

/** A combo of one tap that sends, at the first tier and no multiplier. */
const oneTap = { method: "tap", hits: 1, total: 10, peakMult: 1, peakTier: 0 } as const;

/** Records a combo for the received gift: one tap, with `values` over it. */
const record = (values: Partial<typeof gratitude.$inferInsert> = {}) =>
  db
    .insert(gratitude)
    .values({
      giftId,
      idempotencyKey: newId("combo"),
      ...oneTap,
      originalArtistGratitudeShare: 0,
      gameConfigVersion: "1",
      replay: Buffer.from("{}"),
      ...values,
    })
    .run();

describe("gratitude", () => {
  it("records one combo per received gift", () => {
    record();
    expect(refusal(() => record())).toMatch(/gratitude.gift_id/);
  });

  it("keeps a combo's hits within MAX_HITS", () => {
    expect(refusal(() => record({ hits: MAX_HITS + 1 }))).toMatch(/gratitude_hits/);
    expect(() => record({ hits: MAX_HITS })).not.toThrow();
  });

  it("keeps the Original Artist Gratitude Share within the total", () => {
    expect(refusal(() => record({ originalArtistGratitudeShare: oneTap.total + 1 }))).toMatch(
      /gratitude_original_artist_share/,
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/schema/gratitude.test.ts`
Expected: FAIL: `gratitude` isn't exported from `./index.ts`.

- [ ] **Step 3: Write the table**

`packages/db/src/schema/gratitude.ts`:

```ts
import { sql } from "drizzle-orm";
import { blob, check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { literal, oneOf, timestamps } from "./columns.ts";
import { gifts } from "./gifts.ts";
import { MAX_HITS, MAX_PEAK_MULT, MAX_PEAK_TIER } from "./limits.ts";

export const gratitudeMethods = ["tap", "stroke", "shake"] as const;

/**
 * One gratitude Mini-game combo: the receiver thanking the giver for one received gift, at most once.
 * The Mini-game's GratitudeResult, recorded; created_at is when. Columns hold what's queried; the
 * replay holds everything else.
 */
export const gratitude = sqliteTable(
  "gratitude",
  {
    /** The received gift it thanks; the giver, receiver and sticker come from it. */
    giftId: text("gift_id")
      .primaryKey()
      .references(() => gifts.id),
    /** Made on the device at the first hit. The same key again gets the stored record. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    /** The method the combo ended in. */
    method: text("method", { enum: gratitudeMethods }).notNull(),
    /** Counted taps, stroke passes or shake reversals. One tap that sends is 1. */
    hits: integer("hits").notNull(),
    /** The server's replayed gratitude, multiplier included. */
    total: integer("total").notNull(),
    peakMult: real("peak_mult").notNull(),
    /** 0 to MAX_PEAK_TIER: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
    peakTier: integer("peak_tier").notNull(),
    /**
     * The Original Artist's 20%, out of the giver's part, when the Original Artist is neither the
     * giver nor the receiver; otherwise 0. Stored, so changing the share never rewrites history.
     */
    originalArtistGratitudeShare: integer("original_artist_gratitude_share").notNull(),
    /** GAME_CONFIG's version, which the server replayed with. Every version stays in code. */
    gameConfigVersion: text("game_config_version").notNull(),
    /**
     * Gzipped JSON with a format version: every touch with its time, position and whether it counted,
     * stroke paths, shake reversals, where the method switched, the duration and end reason, the
     * random seed for pop-ins and particles, and the thanker's intensity.
     */
    replay: blob("replay", { mode: "buffer" }).notNull(),
    /** The giver watched the replay: the pink tag's unseen feed. */
    seenByGiverAt: integer("seen_by_giver_at", { mode: "timestamp_ms" }),
    /** Its push, or the digest that included it, went out or was given up on. */
    pushedToGiverAt: integer("pushed_to_giver_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    index("gratitude_created").on(t.createdAt),
    index("gratitude_push_due")
      .on(t.createdAt)
      .where(sql`${t.pushedToGiverAt} is null`),
    check("gratitude_method", oneOf(t.method, gratitudeMethods)),
    check("gratitude_hits", sql`${t.hits} between 1 and ${literal(MAX_HITS)}`),
    check(
      "gratitude_original_artist_share",
      sql`${t.originalArtistGratitudeShare} between 0 and ${t.total}`,
    ),
    check("gratitude_tier", sql`${t.peakTier} between 0 and ${literal(MAX_PEAK_TIER)}`),
    check("gratitude_mult", sql`${t.peakMult} between 1 and ${literal(MAX_PEAK_MULT)}`),
  ],
);
```

Replace `packages/db/src/schema/index.ts` with:

```ts
import { gifts } from "./gifts.ts";
import { gratitude } from "./gratitude.ts";
import { stickerPlacements } from "./stickerPlacements.ts";
import { stickers, stickerTimelapses } from "./stickers.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";

export { escrowStatuses, giftStatuses } from "./gifts.ts";
export { gratitudeMethods } from "./gratitude.ts";
export {
  gifts,
  gratitude,
  stickerPlacements,
  stickers,
  stickerTimelapses,
  ticketPurchases,
  ticketUses,
  users,
};

/** Every table: the updated_at triggers cover each one. */
export const allTables = [
  users,
  stickers,
  stickerTimelapses,
  ticketUses,
  ticketPurchases,
  stickerPlacements,
  gifts,
  gratitude,
] as const;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add gratitude" -- packages/db
```

### Task 8: Migrations, triggers and the migrator

**Files:**

- Modify: `packages/db/drizzle.config.ts`, `packages/db/package.json`
- Create: `packages/db/src/migrate.ts`, `packages/db/drizzle/` (generated)
- Test: `packages/db/src/migrate.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/db/src/migrate.test.ts`:

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrateDatabase } from "./migrate.ts";
import { createTestDb } from "./testDb.ts";

/** Every table, index and trigger, with its SQL. */
const objects = (sqlite: Database.Database) =>
  sqlite
    .prepare(
      "select type, name, sql from sqlite_master where name != '__drizzle_migrations' order by type, name",
    )
    .all();

describe("migrateDatabase", () => {
  it("builds the same database the schema describes", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "drawing-app-db-")), "test.db");
    migrateDatabase(path);
    const migrated = new Database(path, { readonly: true });
    const { sqlite: fromSchema } = await createTestDb();
    expect(objects(migrated)).toEqual(objects(fromSchema));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @drawing-app/db test -- src/migrate.test.ts`
Expected: FAIL: `./migrate.ts` not found.

- [ ] **Step 3: Write the migrator**

`packages/db/src/migrate.ts`:

```ts
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
```

- [ ] **Step 4: Point drizzle-kit at the migrations folder, and add the scripts**

In `packages/db/drizzle.config.ts`, add `out: "./drizzle",` beside `schema`.

In `packages/db/package.json` `scripts`, replace `"db:push": "drizzle-kit push"` with:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "node src/migrate.ts"
```

- [ ] **Step 5: Generate the migrations**

Run: `pnpm --filter @drawing-app/db db:generate --name=init`
Expected: `packages/db/drizzle/0000_init.sql` with every table; read its output, since drizzle-kit exits 0 even when it fails.

Run: `pnpm --filter @drawing-app/db exec drizzle-kit generate --custom --name=updated_at_triggers`
Expected: an empty `packages/db/drizzle/0001_updated_at_triggers.sql`.

Fill it with the triggers (drizzle-kit can't declare them):

```bash
cd packages/db && node --input-type=module -e "
import { writeFileSync } from 'node:fs';
import { allTables } from './src/schema/index.ts';
import { updatedAtTriggerStatements } from './src/schema/updatedAtTriggers.ts';
writeFileSync('drizzle/0001_updated_at_triggers.sql', updatedAtTriggerStatements(allTables).join('\n--> statement-breakpoint\n') + '\n');
"
```

Expected: one `CREATE TRIGGER` per table, separated by `--> statement-breakpoint`, with none after the last.

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm --filter @drawing-app/db test`
Expected: PASS, all files.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): generate the first migrations, with updated_at triggers, and a migrator" -- packages/db
```

### Task 9: Retire `db:push` and the old database

**Files:**

- Modify: `package.json` (root), `AGENTS.MD`
- Delete: `data/drawing-app.db` (gitignored, local only)

- [ ] **Step 1: Replace the root script**

In the root `package.json`, replace `"db:push": "pnpm --filter @drawing-app/db db:push",` with:

```json
"db:migrate": "pnpm --filter @drawing-app/db db:migrate",
```

- [ ] **Step 2: Update AGENTS.MD**

Under Architecture, replace the `packages/db` line with:

```markdown
- `packages/db` — Drizzle schema (`src/schema/`), migrations (`drizzle/`) and typed database client (`@drawing-app/db`)
```

Under Toolchain, replace the `pnpm db:push` line with:

```markdown
- `pnpm db:migrate` applies `packages/db/drizzle/` to the local database (`data/drawing-app.db`). After a schema change, `pnpm --filter @drawing-app/db db:generate` writes the migration; a new table's `updated_at` trigger goes in a custom migration (`drizzle-kit generate --custom`), from `updatedAtTriggerStatements`
```

Leave the `docs/database-schema-and-rest-api.md` line: that doc goes when the REST API exists too.

- [ ] **Step 3: Replace the old database**

Run: `rm -f data/drawing-app.db data/drawing-app.db-wal data/drawing-app.db-shm && pnpm db:migrate`
Expected: a new `data/drawing-app.db` with every table and its trigger.

- [ ] **Step 4: Check everything**

Run: `pnpm check`
Expected: lint, typecheck, tests and the format check all pass.

- [ ] **Step 5: Commit**

```bash
git add package.json AGENTS.MD
git commit -m "chore(db): replace db:push with migrations" -- package.json AGENTS.MD
```
