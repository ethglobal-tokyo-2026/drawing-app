# Kyoto Seika Manga Expression Practice Mode: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-10-07-kyoto-seika-practice-mode-design.md`; decisions are cited by its numbers.

**Order:**

1. Part A first: B and C build on its contract and its updated test fixtures.
2. Then B and C as parallel lanes, each in its own worktree. B merges as a whole, once B13 is in (B's decision 9).
3. C6 waits for the Settings-without-restart plan (`docs/superpowers/plans/2026-10-07-settings-without-restart.md`), which brings the Settings note's `save`.
4. A7's LINE calls and the deploy are run by the coordinator, not a lane.

**Pending sign-off; don't build until approved:** B16, the evocative tier (decision 22). C7's AGENTS.MD vocabulary (decision 19). C6's censor-bar name (decision 20).

**Not in this plan:** Settings without a restart (its own plan). Marking a sticker 18+ after sealing (`docs/superpowers/specs/2026-10-07-mark-18-plus-anytime-design.md`).

**The subject list:** built in gitignored scratch (`data/scratch/wordlist/` in the `seika-exam` worktree; decision 17). B1 copies it into the repo as JSON. Copy `subjects-next.tsv` and `to_subjects_json.mjs` somewhere safe before that worktree goes.

---

## Part A: server and data

**Goal:** The mode's server side: two switches on `me`, 10 daily tickets while it's on, each ticket use keeping its mode, the seal holding a sticker to its ticket's clock and subject pair, the pair on every sticker response, and the Kyoto Seika Practice Mode chat menus.

**Architecture:** `users`, `ticket_uses` and `stickers` gain last columns; two CHECKs change, so one generated migration rebuilds `ticket_uses` and `stickers`. Each spend reads the person's mode inside its transaction; the seal reads the mode from the ticket use, never the person. The chat menu picks a family by mode, and the one midnight batch moves each family to its own full count.

**Tech Stack:** Drizzle + drizzle-kit on SQLite (better-sqlite3), Hono, zod 4, drizzle-zod, Vitest, LINE Messaging API rich menus, bash + jq.

**Every task:** work in your own worktree off main. Tests: `pnpm --filter @drawing-app/db test <file>` / `pnpm --filter @drawing-app/api test <file>`, paths relative to the package. Before each commit, typecheck each package touched, `frontend` too when a contract type changes (`pnpm --filter frontend typecheck`); the pre-commit hook lints and formats. After the last task: `pnpm check`. Tests import every limit (`DAILY_TICKETS_PER_DAY`, `KYOTO_SEIKA_*`, `MAX_TIME_USED_S`) and never restate one as a number.

### Contract (other parts use these names)

| Where         | Name                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `users`       | `kyoto_seika_practice_on_at`, `kyoto_seika_dark_subjects_on_at`: integer timestamp_ms, nullable, last                        |
| `ticket_uses` | `kyoto_seika_practice`: boolean, not null, default false, last                                                               |
| `stickers`    | `kyoto_seika_subjects`: text JSON `[{ ja, reading, en }, { ja, reading, en }]`, nullable, last                               |
| `limits.ts`   | `KYOTO_SEIKA_TIME_USED_S = 30 * 60`, `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY = 10`, both re-exported by `@drawing-app/api/client` |
| `Me`          | `kyotoSeikaPractice: boolean`, `kyotoSeikaDarkSubjects: boolean`                                                             |
| route         | `POST /api/me/kyoto-seika-practice` `{ kyotoSeikaPractice?, kyotoSeikaDarkSubjects? }`, at least one → `{ me }`              |
| `TicketUse`   | `kyotoSeikaPractice: boolean`                                                                                                |
| `Tickets`     | `dailyPerDay` follows the person's mode                                                                                      |
| `Sticker`     | `kyotoSeikaSubjects: [KyotoSeikaSubject, KyotoSeikaSubject] \| null`; `KyotoSeikaSubject` from `@drawing-app/api/client`     |
| seal form     | optional `kyotoSeikaSubjects`, the pair as a JSON string                                                                     |
| `ChatMenu`    | adds `kyoto-seika-1` … `kyoto-seika-10`, `kyoto-seika-reserve`, `kyoto-seika-none`, also keys in `deploy/line/menus.json`    |

---

### Task A1: The schema, its limits and the migration

**Files:**

- Modify: `packages/db/src/schema/{limits,users,tickets,stickers,index}.ts`, `packages/db/src/testDb.ts`, `apps/api/src/client.ts`
- Create (generated): `packages/db/drizzle/0001_kyoto_seika_practice.sql`, `packages/db/drizzle/meta/0001_snapshot.json`; modify `meta/_journal.json`
- Test: `packages/db/src/schema/tickets.test.ts`, `stickers.test.ts`; `packages/db/src/migrate.test.ts` must pass unchanged

- [ ] **Step 1: Write the failing tests**

`testDb.ts`, after `insertSticker`, a pair the API's tests share:

```ts
/** A sticker's Kyoto Seika Subject pair, from the test's first sitting. */
export const TEST_KYOTO_SEIKA_SUBJECTS: [KyotoSeikaSubject, KyotoSeikaSubject] = [
  { ja: "風", reading: "かぜ", en: "wind" },
  { ja: "再会", reading: "さいかい", en: "reunion" },
];
```

`tickets.test.ts`, replacing "makes a day's first uses daily tickets and the rest reserve ones":

```ts
it("never spends a reserve ticket among a day's first DAILY_TICKETS_PER_DAY uses, and takes daily ones after one", () => {
  const spend = (dayIndex: number, kind: (typeof ticketKinds)[number]) => () =>
    insertTicketUse(db, userId, { dayIndex, kind });
  expect(refusal(spend(DAILY_TICKETS_PER_DAY - 1, "reserve"))).toMatch(
    /CHECK constraint failed: ticket_uses_kind/,
  );
  // A mixed day: the standard allowance, a reserve ticket, then Kyoto Seika Practice Mode's daily ones.
  for (let dayIndex = 0; dayIndex < DAILY_TICKETS_PER_DAY; dayIndex++) spend(dayIndex, "daily")();
  spend(DAILY_TICKETS_PER_DAY, "reserve")();
  expect(spend(DAILY_TICKETS_PER_DAY + 1, "daily")).not.toThrow();
});
```

`stickers.test.ts`: keep `sqlite` (`({ db, sqlite } = await createTestDb())`), and replace the time test:

```ts
it("keeps time used within the longest drawing clock", () => {
  expect(() => insertSticker(db, artist, { timeUsed: KYOTO_SEIKA_TIME_USED_S })).not.toThrow();
  expect(
    refusal(() => insertSticker(db, artist, { timeUsed: KYOTO_SEIKA_TIME_USED_S + 1 })),
  ).toMatch(/stickers_time_used/);
});

it("holds a sticker's Kyoto Seika Subjects as a pair", () => {
  const id = insertSticker(db, artist, { kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS });
  const one = JSON.stringify(TEST_KYOTO_SEIKA_SUBJECTS.slice(0, 1));
  const setOne = () =>
    sqlite.prepare("update stickers set kyoto_seika_subjects = ? where id = ?").run(one, id);
  expect(refusal(setOne)).toMatch(/stickers_kyoto_seika_subjects/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @drawing-app/db test src/schema/tickets.test.ts src/schema/stickers.test.ts`
Expected: FAIL: `ticket_uses_kind` refuses the daily use at `DAILY_TICKETS_PER_DAY + 1`; `KYOTO_SEIKA_TIME_USED_S` is undefined; `kyoto_seika_subjects` is "no such column".

- [ ] **Step 3: The limits, columns and CHECKs**

`limits.ts` (the `DAILY_TICKETS_PER_DAY` comment rewritten, two constants added):

```ts
/**
 * Daily tickets per ticket day outside Kyoto Seika Manga Expression Practice Mode, the smaller
 * allowance: no reserve ticket is spent among a day's first this many uses. The ticket_uses_kind
 * CHECK holds every row to it, so changing it breaks that CHECK for past rows.
 */
export const DAILY_TICKETS_PER_DAY = 3;
/** Daily tickets per ticket day while Kyoto Seika Manga Expression Practice Mode is on. */
export const KYOTO_SEIKA_DAILY_TICKETS_PER_DAY = 10;
/** The drawing clock on a ticket spent in Kyoto Seika Manga Expression Practice Mode, in seconds. */
export const KYOTO_SEIKA_TIME_USED_S = 30 * 60;
```

Every new column goes after `...timestamps()`: ALTER TABLE adds `users`' after `updated_at`, and `migrate.test.ts` compares the order.

```ts
// users.ts
    /**
     * When the person turned on Kyoto Seika Manga Expression Practice Mode in Settings; null while
     * it's off. A ticket spent while it's on is spent in that mode.
     */
    kyotoSeikaPracticeOnAt: integer("kyoto_seika_practice_on_at", { mode: "timestamp_ms" }),
    /** When they turned on "Dark subjects too", under it; null while it's off. */
    kyotoSeikaDarkSubjectsOnAt: integer("kyoto_seika_dark_subjects_on_at", { mode: "timestamp_ms" }),

// tickets.ts: `kind`'s comment becomes "Daily tickets go first, under the allowance of the mode in force at each spend."
    /** Spent with the mode on: its sheet runs the mode's clock and its sticker keeps a subject pair. */
    kyotoSeikaPractice: integer("kyoto_seika_practice", { mode: "boolean" }).notNull().default(false),
  // the CHECK, replacing the old one and its comment:
    // Kyoto Seika Practice Mode's daily tickets can follow a reserve one, so only the smaller allowance holds.
    check("ticket_uses_kind", sql`${t.kind} = 'daily' or ${t.dayIndex} >= ${literal(DAILY_TICKETS_PER_DAY)}`),

// stickers.ts: imports KYOTO_SEIKA_TIME_USED_S in place of MAX_TIME_USED_S
/** One of a sticker's two Kyoto Seika Subjects: the word as the test prints it, its
 * reading (empty when it has no kanji), and its English. */
export interface KyotoSeikaSubject {
  ja: string;
  reading: string;
  en: string;
}
    // timeUsed's comment: "Seconds on the drawing clock, which pauses: at most its ticket's clock. …"
    /** A sticker's Kyoto Seika Subject pair, fixed at seal; null unless drawn in Kyoto Seika Practice Mode. Not on Sui. */
    kyotoSeikaSubjects: text("kyoto_seika_subjects", { mode: "json" }).$type<[KyotoSeikaSubject, KyotoSeikaSubject]>(),
  // CHECKs:
    // The longest clock; the seal route holds each sticker to its own ticket's.
    check("stickers_time_used", sql`${t.timeUsed} between 0 and ${literal(KYOTO_SEIKA_TIME_USED_S)}`),
    check(
      "stickers_kyoto_seika_subjects",
      sql`${t.kyotoSeikaSubjects} is null or (json_valid(${t.kyotoSeikaSubjects}) and json_array_length(${t.kyotoSeikaSubjects}) = 2)`,
    ),
```

`KyotoSeikaSubject` is declared once, here: the database package has no zod, and the API's schema is checked against it (Task A4). `schema/index.ts`: `export type { KyotoSeikaSubject } from "./stickers.ts";`. `testDb.ts` imports it; `insertTicketUse`'s doc becomes "the day's next slot, daily for its first DAILY_TICKETS_PER_DAY unless `kind` says otherwise". `apps/api/src/client.ts` adds both new limits to its `@drawing-app/db/limits` re-export.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @drawing-app/db test src/schema/tickets.test.ts src/schema/stickers.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate the migration**

Run: `pnpm --filter @drawing-app/db db:generate --name kyoto_seika_practice`, then read the SQL:

- `users`: two `ALTER TABLE \`users\` ADD`, no rebuild.
- `ticket_uses`, `stickers`: each `CREATE TABLE \`__new_…\``, `INSERT INTO … SELECT`, `DROP`, `RENAME`, its indexes.
- Each `INSERT INTO \`__new_…\`(…) SELECT …` must list only columns the old table has; drizzle-kit has listed a new one there before (`0014_ticket_purchases_started.sql`was fixed by hand). If`kyoto_seika_practice`or`kyoto_seika_subjects`is in a list, take it out of both, with a comment above the INSERT as 0014 has:`-- kyoto_seika_practice is new, so every use starts false.`/`-- kyoto_seika_subjects is new, so every sticker starts with none.`
- Dropping a table drops its trigger: append `0000_baseline.sql`'s `stickers_updated_at` and `ticket_uses_updated_at` triggers verbatim (`updatedAtTriggerStatements`' output), each after a `--> statement-breakpoint` line.

- [ ] **Step 6: Check it against the schema, then on real rows**

Run: `pnpm --filter @drawing-app/db test src/migrate.test.ts src/schema/updatedAtTriggers.test.ts`
Expected: PASS. A missing trigger, a column out of order or an INSERT naming a missing column fails it.

The box has no backups, so rehearse on a copy of a database with rows: the main checkout's, copied into
the worktree's gitignored `data/scratch/`.

```bash
S=data/scratch; mkdir -p "$S"
sqlite3 "$(git rev-parse --path-format=absolute --git-common-dir)/../data/drawing-app.db" ".backup $S/migrate-check.db"
q() { sqlite3 "$S/migrate-check.db" "select (select count(*) from stickers), (select count(*) from ticket_uses), (select count(*) from sticker_timelapses)"; }
q; DATABASE_URL="$S/migrate-check.db" pnpm db:migrate; q
sqlite3 "$S/migrate-check.db" "pragma foreign_key_check; select count(*) from ticket_uses where kyoto_seika_practice"
```

Expected: the same counts before and after, no foreign key rows, `0`.

- [ ] **Step 7: Commit**

```bash
git add packages/db apps/api/src/client.ts
git commit -m "feat(db): Kyoto Seika Practice Mode's columns and limits, a ticket CHECK that lets a daily ticket follow a reserve one, and the longer clock"
```

---

### Task A2: The switches on `me`

**Files:**

- Modify: `apps/api/src/shapes.ts`, `apps/api/src/routes/session.ts`; typecheck only: `apps/frontend/src/api/testing.tsx` (`TEST_ME`), `apps/frontend/src/api/SessionGate.test.tsx` (`me`)
- Test: `apps/api/src/routes/session.test.ts`

- [ ] **Step 1: Write the failing tests**

After "your NSFW opt-in":

```ts
describe("your Kyoto Seika Practice Mode switches", () => {
  const setSwitches = (headers: Record<string, string>, body: unknown) =>
    test.send("POST", "/api/me/kyoto-seika-practice", { headers, body });
  const switchesIn = async (response: Response) => {
    const { kyotoSeikaPractice, kyotoSeikaDarkSubjects } = await meIn(response);
    return { kyotoSeikaPractice, kyotoSeikaDarkSubjects };
  };
  const practiceOnAt = (userId: string) =>
    test.db.select().from(users).where(eq(users.id, userId)).get()?.kyotoSeikaPracticeOnAt;

  it("are off until turned on, and each turns on and off without moving the other", async () => {
    const userId = insertUser(test.db);
    const headers = await test.signInAs(userId);
    expect(await switchesIn(await getMe(headers))).toEqual({
      kyotoSeikaPractice: false,
      kyotoSeikaDarkSubjects: false,
    });
    await setSwitches(headers, { kyotoSeikaPractice: true });
    expect(practiceOnAt(userId)).toEqual(test.clock.now());
    expect(await switchesIn(await setSwitches(headers, { kyotoSeikaDarkSubjects: true }))).toEqual({
      kyotoSeikaPractice: true,
      kyotoSeikaDarkSubjects: true,
    });
    expect(await switchesIn(await setSwitches(headers, { kyotoSeikaPractice: false }))).toEqual({
      kyotoSeikaPractice: false,
      kyotoSeikaDarkSubjects: true,
    });
    expect(practiceOnAt(userId)).toBeNull();
  });

  it("refuses a body that turns nothing on or off", async () => {
    const headers = await test.signInAs(insertUser(test.db));
    for (const body of [{}, { kyotoSeikaPractice: "on" }]) {
      expect(await refusalOf(await setSwitches(headers, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @drawing-app/api test src/routes/session.test.ts`
Expected: FAIL: `me` has no `kyotoSeikaPractice`; the route answers 404 `route_not_found`.

- [ ] **Step 3: Implement**

`shapes.ts`, beside `optedIntoNsfw`, and `meSchema`/`toMe`:

```ts
/** Whether the person has Kyoto Seika Manga Expression Practice Mode on. */
export const kyotoSeikaPracticeOn = (user: Pick<UserRow, "kyotoSeikaPracticeOnAt">): boolean =>
  user.kyotoSeikaPracticeOnAt !== null;
// meSchema.extend:
  /** Kyoto Seika Manga Expression Practice Mode, in Settings: the next ticket is spent in it. */
  kyotoSeikaPractice: z.boolean(),
  /** "Dark subjects too", under it: the deal may bring the dark Kyoto Seika Subjects. */
  kyotoSeikaDarkSubjects: z.boolean(),
// toMe:
  kyotoSeikaPractice: kyotoSeikaPracticeOn(user),
  kyotoSeikaDarkSubjects: user.kyotoSeikaDarkSubjectsOnAt !== null,
```

`routes/session.ts`, beside `nsfwOptInBody`, and the route after `/me/nsfw-opt-in`:

```ts
/** Settings' Kyoto Seika switches: either or both, each on or off. */
const kyotoSeikaPracticeBody = z
  .object({ kyotoSeikaPractice: z.boolean().optional(), kyotoSeikaDarkSubjects: z.boolean().optional() })
  .refine(
    (body) => body.kyotoSeikaPractice !== undefined || body.kyotoSeikaDarkSubjects !== undefined,
    "kyotoSeikaPractice or kyotoSeikaDarkSubjects: say at least one",
  );

    .post("/me/kyoto-seika-practice", validate("json", kyotoSeikaPracticeBody), (c) => {
      const { kyotoSeikaPractice, kyotoSeikaDarkSubjects } = c.req.valid("json");
      const now = deps.clock.now();
      // A switch the body leaves out stays as it is: Drizzle's set skips an undefined column.
      const onAt = (on: boolean | undefined) => (on === undefined ? undefined : on ? now : null);
      const user = deps.db
        .update(users)
        .set({ kyotoSeikaPracticeOnAt: onAt(kyotoSeikaPractice), kyotoSeikaDarkSubjectsOnAt: onAt(kyotoSeikaDarkSubjects) })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .returning()
        .get();
      if (!user) return apiError(c, 401, "signed_out");
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
```

The switches stay independent: turning Kyoto Seika Practice Mode off keeps "Dark subjects too" for the next time. Frontend: `TEST_ME` and `SessionGate.test.tsx`'s `me` gain `kyotoSeikaPractice: false, kyotoSeikaDarkSubjects: false`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @drawing-app/api test src/routes/session.test.ts && pnpm --filter @drawing-app/api typecheck && pnpm --filter frontend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shapes.ts apps/api/src/routes/session.ts apps/api/src/routes/session.test.ts apps/frontend/src/api
git commit -m "feat(api): the Kyoto Seika Practice Mode switches on me, and the route that sets them"
```

---

### Task A3: Spending under the mode

`ticketKindAt(dayIndex)` assumed the day's first 3 uses are daily, which a mixed day breaks (3 daily, 1 reserve, then daily again under the mode). The next kind now comes from what's left.

**Files:**

- Modify: `apps/api/src/tickets/tickets.ts`, `apps/api/src/routes/tickets.ts`; typecheck only: `apps/frontend/src/tickets/TicketsProvider.test.tsx` (its `TicketUse` literal)
- Test: `apps/api/src/routes/tickets.test.ts`

- [ ] **Step 1: Write the failing tests**

Import `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY`, then:

```ts
/** Turns Kyoto Seika Manga Expression Practice Mode on or off, as Settings does. */
async function setPractice(kyotoSeikaPractice: boolean) {
  const body = { kyotoSeikaPractice };
  expect(
    (await test.send("POST", "/api/me/kyoto-seika-practice", { as: userId, body })).status,
  ).toBe(200);
}

describe("tickets in Kyoto Seika Manga Expression Practice Mode", () => {
  it("give the mode's allowance while it's on, and mark each spend with the mode", async () => {
    await setPractice(true);
    expect(await getTickets()).toMatchObject({
      dailyPerDay: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
      dailyLeft: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
    });
    const answers = await spendTickets("daily", KYOTO_SEIKA_DAILY_TICKETS_PER_DAY);
    answers.forEach(({ ticketUse }, dayIndex) =>
      expect(ticketUse).toMatchObject({ dayIndex, kind: "daily", kyotoSeikaPractice: true }),
    );
    expect(await refusalOf(await spend("daily"))).toMatchObject({
      status: 409,
      error: "no_tickets_left",
    });
  });

  it("follow the switch at each spend, and never refill", async () => {
    const [standard] = await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    expect(standard.ticketUse.kyotoSeikaPractice).toBe(false);
    await setPractice(true);
    expect((await getTickets()).dailyLeft).toBe(
      KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - DAILY_TICKETS_PER_DAY,
    );
    await spendTicket("daily");
    await setPractice(false);
    expect(await getTickets()).toMatchObject({ dailyPerDay: DAILY_TICKETS_PER_DAY, dailyLeft: 0 });
    await setPractice(true);
    expect((await getTickets()).dailyLeft).toBe(
      KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - DAILY_TICKETS_PER_DAY - 1,
    );
  });

  it("go back to daily tickets after a reserve one when the mode turns on mid-day", async () => {
    await buyPack(PACK);
    await spendTickets("daily", DAILY_TICKETS_PER_DAY);
    expect((await spendTicket("reserve")).ticketUse).toMatchObject({
      dayIndex: DAILY_TICKETS_PER_DAY,
      kind: "reserve",
    });
    await setPractice(true);
    expect(await refusalOf(await spend("reserve"))).toMatchObject({
      status: 409,
      error: "ticket_kind_changed",
    });
    const daily = await spendTicket("daily");
    expect(daily.ticketUse).toMatchObject({
      dayIndex: DAILY_TICKETS_PER_DAY + 1,
      kind: "daily",
      kyotoSeikaPractice: true,
    });
    expect(daily.tickets.reserveLeft).toBe(PACK.tickets - 1);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @drawing-app/api test src/routes/tickets.test.ts`
Expected: FAIL: `dailyPerDay` stays `DAILY_TICKETS_PER_DAY`; `ticketUse` has no `kyotoSeikaPractice`.

- [ ] **Step 3: Implement**

`tickets/tickets.ts`: delete `ticketKindAt`; add (imports `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY`, `users`, and `kyotoSeikaPracticeOn` from `../shapes.ts`):

```ts
/** Whether `userId` has Kyoto Seika Manga Expression Practice Mode on now. */
export function kyotoSeikaPracticeOf(db: DbOrTx, userId: string): boolean {
  const user = db
    .select({ kyotoSeikaPracticeOnAt: users.kyotoSeikaPracticeOnAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return user !== undefined && kyotoSeikaPracticeOn(user);
}

/** The day's daily tickets in either mode. Each spend reads the mode in force, so a flip never refills. */
export const dailyTicketsPerDay = (kyotoSeikaPractice: boolean): number =>
  kyotoSeikaPractice ? KYOTO_SEIKA_DAILY_TICKETS_PER_DAY : DAILY_TICKETS_PER_DAY;

/** The kind the next spend takes: daily tickets always go first. */
export const nextTicketKind = ({ dailyLeft }: Pick<Tickets, "dailyLeft">): TicketKind =>
  dailyLeft > 0 ? "daily" : "reserve";
```

`ticketsLeftOf` answers `Pick<Tickets, "dailyPerDay" | "dailyLeft" | "reserveLeft">`: `const dailyPerDay = dailyTicketsPerDay(kyotoSeikaPracticeOf(db, userId));`, then `dailyLeft: Math.max(0, dailyPerDay - (dailyUsed?.n ?? 0))`, the counts as today. `ticketsOf` drops its `dailyPerDay: DAILY_TICKETS_PER_DAY` line (the spread brings it). `ticketUseSchema` also picks `kyotoSeikaPractice: true`; `toTicketUse` adds `kyotoSeikaPractice: use.kyotoSeikaPractice`.

`routes/tickets.ts`: drop the `DAILY_TICKETS_PER_DAY` and `ticketKindAt` imports; in the transaction:

```ts
          const kyotoSeikaPractice = kyotoSeikaPracticeOf(tx, userId);
          const { ticketDay, dailyPerDay, dailyLeft, reserveLeft, usedToday } = ticketsOf(tx, userId, now);
          // no_tickets_left's detail: `All ${dailyPerDay} daily tickets for ${ticketDay} are spent, …`
          // Daily tickets go first, under the allowance of the mode in force now. The start screen
          // asks before spending a reserve ticket, so it must never get the other kind than it offered.
          const next = nextTicketKind({ dailyLeft });
          // … ticket_kind_changed as today …
            .values({ userId, ticketDay, dayIndex: usedToday.length, kind, idempotencyKey, kyotoSeikaPractice })
```

Frontend: `TicketsProvider.test.tsx`'s `TicketUse` literal gains `kyotoSeikaPractice: false`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @drawing-app/api test src/routes/tickets.test.ts src/routes/lineMenu.test.ts src/tickets && pnpm --filter @drawing-app/api typecheck && pnpm --filter frontend typecheck`
Expected: PASS: the chat menu still follows spends, and the purchase sweep still counts reserve tickets.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/tickets/tickets.ts apps/api/src/routes/tickets.ts apps/api/src/routes/tickets.test.ts apps/frontend/src/tickets/TicketsProvider.test.tsx
git commit -m "feat(api): spending follows Kyoto Seika Practice Mode's allowance, and each ticket use keeps its mode"
```

---

### Task A4: Every sticker carries its subjects

Every sticker the API answers is built by `toSticker`, on the board directly and elsewhere through `loadStickers`/`stickerLookup`, so the field goes there once.

**Files:**

- Create: `apps/api/src/stickers/kyotoSeikaSubjects.ts`
- Modify: `apps/api/src/shapes.ts`, `apps/api/src/client.ts`; typecheck only: `apps/frontend/src/api/testFixtures.ts` (`sticker()`), and any other `Sticker` literal `pnpm --filter frontend typecheck` names
- Test: `apps/api/src/routes/stickers.test.ts`

- [ ] **Step 1: Write the failing test**

In "GET /api/stickers/:stickerId" (import `TEST_KYOTO_SEIKA_SUBJECTS` from `@drawing-app/db/testing`):

```ts
it("shows a sticker's Kyoto Seika Subjects, and none on any other", async () => {
  const artistId = insertUser(test.db);
  const practiced = insertSealedSticker(test.db, artistId, {
    kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS,
  });
  const subjectsOf = async (stickerId: string) =>
    (await bodyOf(await getSticker(insertUser(test.db), stickerId), stickerDetailSchema)).sticker
      .kyotoSeikaSubjects;
  expect(await subjectsOf(practiced)).toEqual(TEST_KYOTO_SEIKA_SUBJECTS);
  expect(await subjectsOf(insertSealedSticker(test.db, artistId))).toBeNull();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @drawing-app/api test src/routes/stickers.test.ts -t "subjects"`
Expected: FAIL: `kyotoSeikaSubjects` is undefined.

- [ ] **Step 3: Implement**

`stickers/kyotoSeikaSubjects.ts`:

```ts
import type { KyotoSeikaSubject } from "@drawing-app/db";
import { z } from "zod";

/** Each field's longest: a bound against abuse, not the subject list's rule, which the app keeps. */
export const KYOTO_SEIKA_SUBJECT_MAX_LENGTH = 64;
const text = z.string().max(KYOTO_SEIKA_SUBJECT_MAX_LENGTH);

/** One Kyoto Seika Subject as stickers.kyoto_seika_subjects holds it; `reading` is empty without kanji. */
const kyotoSeikaSubjectSchema = z.object({
  ja: text.min(1),
  reading: text,
  en: text.min(1),
}) satisfies z.ZodType<KyotoSeikaSubject>;

/** The pair dealt for a sticker drawn in Kyoto Seika Practice Mode and fixed at seal. */
export const kyotoSeikaSubjectsSchema = z.tuple([kyotoSeikaSubjectSchema, kyotoSeikaSubjectSchema]);
```

`shapes.ts`: `stickerSchema` gains `/** A sticker's Kyoto Seika Subject pair, fixed at seal; null unless drawn in Kyoto Seika Practice Mode, which it marks. */ kyotoSeikaSubjects: kyotoSeikaSubjectsSchema.nullable(),` and `toSticker` sets `kyotoSeikaSubjects: sticker.kyotoSeikaSubjects`. `client.ts`: `export type { KyotoSeikaSubject } from "@drawing-app/db";` (type-only, so the app bundles nothing of the database package). Frontend: `sticker()` gains `kyotoSeikaSubjects: null`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @drawing-app/api test src/routes/stickers.test.ts src/routes/stickerBoards.test.ts src/routes/explore.test.ts && pnpm --filter @drawing-app/api typecheck && pnpm --filter frontend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/stickers/kyotoSeikaSubjects.ts apps/api/src/shapes.ts apps/api/src/client.ts apps/api/src/routes/stickers.test.ts apps/frontend/src
git commit -m "feat(api): every sticker the API answers carries its Kyoto Seika Subjects"
```

---

### Task A5: Sealing on a ticket spent in Kyoto Seika Practice Mode

`stickers_time_used` holds only the longest clock and can't see the ticket, so the seal route holds each sticker to its own ticket's clock, and requires or refuses the pair by the ticket's mode.

**Files:**

- Modify: `apps/api/src/stickers/{sealForm,seal,testPngs}.ts`, `apps/api/src/shapes.ts` (`stickerRow.timeUsed`)
- Test: `apps/api/src/routes/stickers.test.ts`

- [ ] **Step 1: Write the failing tests**

`testPngs.ts` first, so an optional part needn't be listed: `export type SealParts = Partial<Record<keyof z.input<typeof sealForm>, string | File>>;`. Then in `stickers.test.ts` (import `KYOTO_SEIKA_TIME_USED_S`, `TEST_KYOTO_SEIKA_SUBJECTS`):

```ts
/** The pair as the seal form sends it. */
const SUBJECTS_PART = JSON.stringify(TEST_KYOTO_SEIKA_SUBJECTS);

describe("POST /api/stickers on a ticket spent in Kyoto Seika Practice Mode", () => {
  /** Seals with `overrides` on a new ticket of the person's, spent in Kyoto Seika Practice Mode or not. */
  const sealOn = (artistId: string, kyotoSeikaPractice: boolean, overrides: Partial<SealParts>) =>
    postSeal(
      artistId,
      sealFormData(
        sealParts(insertTicketUse(test.db, artistId, { kyotoSeikaPractice }), overrides),
      ),
    );

  it("keeps the subject pair and the mode's clock", async () => {
    const overrides = {
      timeUsed: String(KYOTO_SEIKA_TIME_USED_S),
      kyotoSeikaSubjects: SUBJECTS_PART,
    };
    const { sticker } = await bodyOf(
      await sealOn(insertUser(test.db), true, overrides),
      sealResponseSchema,
      201,
    );
    expect(sticker).toMatchObject({
      timeUsed: KYOTO_SEIKA_TIME_USED_S,
      kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS,
    });
  });

  const one = JSON.stringify(TEST_KYOTO_SEIKA_SUBJECTS.slice(0, 1));
  const refused: Array<{ why: string; practice: boolean; overrides: Partial<SealParts> }> = [
    {
      why: "a sticker drawn in Kyoto Seika Practice Mode without its subjects",
      practice: true,
      overrides: {},
    },
    {
      why: "subjects on a standard ticket's sticker",
      practice: false,
      overrides: { kyotoSeikaSubjects: SUBJECTS_PART },
    },
    {
      why: "time past Kyoto Seika Practice Mode's clock",
      practice: true,
      overrides: {
        timeUsed: String(KYOTO_SEIKA_TIME_USED_S + 1),
        kyotoSeikaSubjects: SUBJECTS_PART,
      },
    },
    { why: "subjects that aren't a pair", practice: true, overrides: { kyotoSeikaSubjects: one } },
    {
      why: "subjects that aren't JSON",
      practice: true,
      overrides: { kyotoSeikaSubjects: "風 × 再会" },
    },
  ];

  it.each(refused)(
    "refuses $why with invalid_request, naming the part and storing nothing",
    async ({ practice, overrides }) => {
      const answer = await refusalOf(await sealOn(insertUser(test.db), practice, overrides));
      expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
      expect(answer.detail).toMatch(/timeUsed|kyotoSeikaSubjects/);
      expect(allStickers()).toEqual([]);
      expect(test.images.saved.size).toBe(0);
    },
  );
});
```

The existing malformed case "timeUsed past the drawing clock" (`MAX_TIME_USED_S + 1`, standard ticket) stays: the form now lets it through and `seal.ts` refuses it, still naming `timeUsed`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @drawing-app/api test src/routes/stickers.test.ts`
Expected: FAIL: the form refuses `KYOTO_SEIKA_TIME_USED_S` and has no `kyotoSeikaSubjects`.

- [ ] **Step 3: Implement**

`sealForm.ts`:

```ts
  // In stickerColumns: the longest clock; the seal holds each sticker to its own ticket's.
  timeUsed: (schema) => schema.min(0).max(KYOTO_SEIKA_TIME_USED_S),

/** A form field holding JSON, checked against `schema`. */
const jsonField = <Schema extends z.ZodType>(schema: Schema) =>
  z
    .string()
    .transform((text, ctx) => {
      try {
        const value: unknown = JSON.parse(text);
        return value;
      } catch {
        ctx.addIssue({ code: "custom", message: "expected JSON" });
        return z.NEVER;
      }
    })
    .pipe(schema);

  // In sealForm:
  /** The sticker's Kyoto Seika Subject pair, as JSON: required on a ticket spent in Kyoto Seika Practice Mode, refused on any other. */
  kyotoSeikaSubjects: jsonField(kyotoSeikaSubjectsSchema).optional(),
```

`seal.ts`: `checkTicket` also selects `kyotoSeikaPractice: ticketUses.kyotoSeikaPractice` and returns `{ stickerId, kyotoSeikaPractice }`. Add:

```ts
/** A sticker keeps to its ticket's clock, and has a subject pair exactly when its ticket was spent in Kyoto Seika Practice Mode. */
function checkTicketMode(form: SealForm, kyotoSeikaPractice: boolean): SealRefusal | null {
  const ticket = `ticket use ${form.ticketUseId}`;
  const clock = kyotoSeikaPractice ? KYOTO_SEIKA_TIME_USED_S : MAX_TIME_USED_S;
  if (form.timeUsed > clock)
    return invalid(`timeUsed: ${form.timeUsed} s is past ${ticket}'s ${clock} s clock`);
  if (kyotoSeikaPractice && !form.kyotoSeikaSubjects) {
    return invalid(
      `kyotoSeikaSubjects: ${ticket} was spent in Kyoto Seika Practice Mode, so its sticker needs its pair`,
    );
  }
  if (!kyotoSeikaPractice && form.kyotoSeikaSubjects) {
    return invalid(
      `kyotoSeikaSubjects: ${ticket} wasn't spent in Kyoto Seika Practice Mode, so its sticker has none`,
    );
  }
  return null;
}
```

In `sealSticker`, after the retry branch (a retry answers the sticker already sealed) and before the NSFW check: `const modeRefusal = checkTicketMode(form, ticket.kyotoSeikaPractice); if (modeRefusal) return { refused: modeRefusal };`. The insert gains `kyotoSeikaSubjects: form.kyotoSeikaSubjects ?? null`. A ticket's mode is fixed at its spend, so the transaction's second `checkTicket` needn't check it again. `shapes.ts`: `stickerRow`'s `timeUsed` bound becomes `KYOTO_SEIKA_TIME_USED_S`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @drawing-app/api test src/routes/stickers.test.ts src/app.flow.test.ts && pnpm --filter @drawing-app/api typecheck && pnpm --filter frontend typecheck`
Expected: PASS: the flow test uploads through the typed client, where the new part is optional.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/stickers apps/api/src/shapes.ts apps/api/src/routes/stickers.test.ts
git commit -m "feat(api): the seal holds a sticker to its ticket's clock, and one drawn in Kyoto Seika Practice Mode to its subject pair"
```

---

### Task A6: The Kyoto Seika Practice Mode chat menus

LINE's midnight batch moves people by the menu they're on, so the mode needs menus of its own, with their own IDs, even where one shows a standard menu's image (counts 1–3, reserve, none).

**Files:**

- Modify: `apps/api/src/chatMenu/{menus,lineChatMenu}.ts`, `apps/api/src/routes/session.ts`, `apps/api/src/testing/fakeLine.ts`; typecheck only: `apps/frontend/src/i18n/strings/line.ts` (the developer slip's menu names)
- Test: `apps/api/src/chatMenu/menus.test.ts`, `apps/api/src/chatMenu/midnight.test.ts`, `apps/api/src/routes/lineMenu.test.ts`

- [ ] **Step 1: The test menus**

`fakeLine.ts` (imports `createHash` from `node:crypto`, `type ChatMenu`): the longer names don't fit 32 hex digits, so the made-up ID hashes the name.

```ts
/** A made-up rich menu ID for `name`, as LINE writes them: `richmenu-` and 32 lowercase hex digits. */
const richMenuId = (name: string) => `richmenu-${createHash("md5").update(name).digest("hex")}`;

/** Every chat menu in `language`, named for what it is, as deploy/line/menus.json maps them. */
function languageMenus(language: "en" | "ja") {
  const id = (menu: ChatMenu) => richMenuId(`${language}-${menu}`);
  return {
    plain: id("plain"),
    "3": id("3"),
    "2": id("2"),
    "1": id("1"),
    reserve: id("reserve"),
    none: id("none"),
    "kyoto-seika-10": id("kyoto-seika-10"),
    "kyoto-seika-9": id("kyoto-seika-9"),
    "kyoto-seika-8": id("kyoto-seika-8"),
    "kyoto-seika-7": id("kyoto-seika-7"),
    "kyoto-seika-6": id("kyoto-seika-6"),
    "kyoto-seika-5": id("kyoto-seika-5"),
    "kyoto-seika-4": id("kyoto-seika-4"),
    "kyoto-seika-3": id("kyoto-seika-3"),
    "kyoto-seika-2": id("kyoto-seika-2"),
    "kyoto-seika-1": id("kyoto-seika-1"),
    "kyoto-seika-reserve": id("kyoto-seika-reserve"),
    "kyoto-seika-none": id("kyoto-seika-none"),
  } satisfies Record<ChatMenu, string>;
}

export const TEST_CHAT_MENU_IDS = {
  en: languageMenus("en"),
  ja: languageMenus("ja"),
  default: richMenuId("default"),
} satisfies ChatMenuIds;
```

- [ ] **Step 2: Write the failing tests**

`menus.test.ts` (import both daily limits, `type ChatMenuIds`); the existing "picks the menu…" test passes `false` as `chatMenuFor`'s second argument, and the old midnight test's exact list gives way to the second test below, keeping its line that a language without a full-count menu has nothing to move to:

```ts
/** A family's menus as chatMenuFor names them: each count from the full day's down, then reserve and none. */
function familyOf(kyotoSeikaPractice: boolean) {
  const perDay = kyotoSeikaPractice ? KYOTO_SEIKA_DAILY_TICKETS_PER_DAY : DAILY_TICKETS_PER_DAY;
  const counts = Array.from({ length: perDay }, (_, used) => perDay - used);
  return [
    ...counts.map((dailyLeft) => chatMenuFor({ dailyLeft, reserveLeft: 0 }, kyotoSeikaPractice)),
    chatMenuFor({ dailyLeft: 0, reserveLeft: 1 }, kyotoSeikaPractice),
    chatMenuFor({ dailyLeft: 0, reserveLeft: 0 }, kyotoSeikaPractice),
  ];
}

/** Where the midnight batch leaves someone on `menu`. */
const afterMidnight = (ids: ChatMenuIds, menu: string) =>
  midnightMoves(ids).find(({ from }) => from === menu)?.to ?? menu;

it("gives Kyoto Seika Practice Mode a menu of its own for each count of its allowance, then reserve and none", () => {
  const practice = familyOf(true);
  expect(new Set(practice).size).toBe(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY + 2);
  expect(practice.filter((menu) => familyOf(false).includes(menu))).toEqual([]);
});

it("moves each family back to its full count at midnight, in each language", () => {
  for (const menus of [TEST_CHAT_MENU_IDS.en, TEST_CHAT_MENU_IDS.ja]) {
    for (const practice of [false, true]) {
      const [full, ...rest] = familyOf(practice);
      for (const menu of practice ? rest : [...rest, "plain" as const]) {
        expect(afterMidnight(TEST_CHAT_MENU_IDS, menus[menu])).toBe(menus[full]);
      }
    }
  }
});

it("refuses a map where a Kyoto Seika Practice Mode menu shares its rich menu with a standard one", () => {
  const { en } = TEST_CHAT_MENU_IDS;
  const path = menusFile({ en: { "3": en["3"], "kyoto-seika-3": en["3"] } });
  expect(() => readChatMenuIds(path)).toThrow(/kyoto-seika-3/);
});
```

`midnight.test.ts` (import `chatMenuFor`, `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY`):

```ts
it("moves the Kyoto Seika Practice Mode menus to their full count and the rest to 3, in one batch", async () => {
  const practiceMenu = (dailyLeft: number) => chatMenuFor({ dailyLeft, reserveLeft: 0 }, true);
  const full = practiceMenu(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY);
  person(ANN, en[practiceMenu(1)]);
  person(BEN, ja[practiceMenu(0)], "ja");
  person(CHO, en["2"]);
  await runChatMenuBatch(jobDeps(), today());
  expect(line.batches).toHaveLength(1);
  expect(Object.fromEntries(line.links)).toEqual({
    [ANN]: en[full],
    [BEN]: ja[full],
    [CHO]: en["3"],
  });
});
```

`lineMenu.test.ts` (import `chatMenuFor`, `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY`):

```ts
describe("the chat menu in Kyoto Seika Manga Expression Practice Mode", () => {
  const setPractice = async (kyotoSeikaPractice: boolean) =>
    expect((await post("/api/me/kyoto-seika-practice", { kyotoSeikaPractice })).status).toBe(200);
  const menuFor = (dailyLeft: number, practice: boolean) =>
    TEST_CHAT_MENU_IDS.en[chatMenuFor({ dailyLeft, reserveLeft: 0 }, practice)];

  it("moves to the Kyoto Seika Practice Mode menus as the mode turns on, follows its spends, and moves back as it turns off", async () => {
    await spendTicket("daily");
    await setPractice(true);
    expect(await menuAfterLinks()).toBe(menuFor(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - 1, true));
    await spendTicket("daily");
    expect(await menuAfterLinks()).toBe(menuFor(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY - 2, true));
    await setPractice(false);
    expect(await menuAfterLinks()).toBe(menuFor(DAILY_TICKETS_PER_DAY - 2, false));
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm --filter @drawing-app/api test src/chatMenu src/routes/lineMenu.test.ts`
Expected: FAIL: `chatMenuFor` ignores the mode, and nothing relinks on the switch.

- [ ] **Step 4: Implement**

`menus.ts` (imports `dailyTicketsPerDay` from `../tickets/tickets.ts`):

```ts
/**
 * Each language's standard chat menus: the plain one, whose Draw key shows no count, then one for
 * each thing it can show: 3, 2 or 1 daily tickets left, reserve tickets only, or none.
 */
const STANDARD_MENUS = ["plain", "3", "2", "1", "reserve", "none"] as const;
/** Kyoto Seika Manga Expression Practice Mode's count menus, from 1 daily ticket left: index n − 1 shows n. */
const KYOTO_SEIKA_COUNT_MENUS = [
  "kyoto-seika-1", "kyoto-seika-2", "kyoto-seika-3", "kyoto-seika-4", "kyoto-seika-5",
  "kyoto-seika-6", "kyoto-seika-7", "kyoto-seika-8", "kyoto-seika-9", "kyoto-seika-10",
] as const;
/** The mode's family; the midnight batch moves people by the menu they're on, so it can't share a standard one. */
const KYOTO_SEIKA_MENUS = [...KYOTO_SEIKA_COUNT_MENUS, "kyoto-seika-reserve", "kyoto-seika-none"] as const;
const CHAT_MENUS = [...STANDARD_MENUS, ...KYOTO_SEIKA_MENUS] as const;

// languageMenusSchema lists every ChatMenu key (`satisfies Record<ChatMenu, typeof menuIdSchema>`
// catches a missing one), then:
  .superRefine((menus, ctx) => {
    for (const practice of KYOTO_SEIKA_MENUS) {
      const shared = STANDARD_MENUS.find((menu) => menus[practice] && menus[menu] === menus[practice]);
      if (shared) {
        const message = `shares its rich menu with ${shared}: the midnight batch moves people by the menu they're on`;
        ctx.addIssue({ code: "custom", path: [practice], message });
      }
    }
  });

/** The menu whose Draw key shows what someone with these tickets has left, in their mode's family. */
export function chatMenuFor(
  { dailyLeft, reserveLeft }: Pick<Tickets, "dailyLeft" | "reserveLeft">,
  kyotoSeikaPractice: boolean,
): Exclude<ChatMenu, "plain"> {
  if (kyotoSeikaPractice) {
    const counted = KYOTO_SEIKA_COUNT_MENUS[Math.min(dailyLeft, KYOTO_SEIKA_COUNT_MENUS.length) - 1];
    if (counted) return counted;
    return reserveLeft > 0 ? "kyoto-seika-reserve" : "kyoto-seika-none";
  }
  // … the standard family as today …
}

/**
 * The midnight batch's moves: in each language, everyone on a family's menus moves to its full
 * count, since everyone has a full day's daily tickets again. The plain menu moves with the
 * standard family: it stands in for a count menu missing from menus.json.
 */
export function midnightMoves(ids: ChatMenuIds) {
  const moves: { from: string; to: string }[] = [];
  const families = [[STANDARD_MENUS, false], [KYOTO_SEIKA_MENUS, true]] as const;
  for (const menus of [ids.en, ids.ja]) {
    if (!menus) continue;
    for (const [family, kyotoSeikaPractice] of families) {
      const full = chatMenuFor({ dailyLeft: dailyTicketsPerDay(kyotoSeikaPractice), reserveLeft: 0 }, kyotoSeikaPractice);
      const to = menus[full];
      if (!to) continue;
      for (const menu of family) {
        const from = menus[menu];
        if (from && from !== to && !moves.some((move) => move.from === from)) moves.push({ from, to });
      }
    }
  }
  return moves;
}
```

`lineChatMenu.ts`: `menuNow` also selects `kyotoSeikaPracticeOnAt` and calls `chatMenuFor(ticketsLeftOf(db, userId, clock.now()), kyotoSeikaPracticeOn(user))`. `routes/session.ts`, in the switches route before answering: `// The Draw key's family changes at once, as its count does after a spend.` then `if (kyotoSeikaPractice !== undefined) void deps.lineChatMenu.relink(user.id);`.

Frontend `line.ts`, `developer.chatMenu.menus`, after `none` (developer strings: English only, no comment):

```ts
        "kyoto-seika-10": { en: "Kyoto Seika practice: draw with 10 daily tickets left" },
        "kyoto-seika-9": { en: "Kyoto Seika practice: draw with 9 daily tickets left" },
        "kyoto-seika-8": { en: "Kyoto Seika practice: draw with 8 daily tickets left" },
        "kyoto-seika-7": { en: "Kyoto Seika practice: draw with 7 daily tickets left" },
        "kyoto-seika-6": { en: "Kyoto Seika practice: draw with 6 daily tickets left" },
        "kyoto-seika-5": { en: "Kyoto Seika practice: draw with 5 daily tickets left" },
        "kyoto-seika-4": { en: "Kyoto Seika practice: draw with 4 daily tickets left" },
        "kyoto-seika-3": { en: "Kyoto Seika practice: draw with 3 daily tickets left" },
        "kyoto-seika-2": { en: "Kyoto Seika practice: draw with 2 daily tickets left" },
        "kyoto-seika-1": { en: "Kyoto Seika practice: draw with 1 daily ticket left" },
        "kyoto-seika-reserve": { en: "Kyoto Seika practice: draw with reserve tickets" },
        "kyoto-seika-none": { en: "Kyoto Seika practice: draw with no tickets left" },
```

Until Task A7's IDs are in `menus.json`, someone in Kyoto Seika Practice Mode gets their language's plain menu (`menuToLink`'s fallback), which the midnight batch moves to 3.

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter @drawing-app/api test src/chatMenu src/routes/lineMenu.test.ts src/routes/session.test.ts && pnpm --filter @drawing-app/api typecheck && pnpm --filter frontend typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/chatMenu apps/api/src/routes/session.ts apps/api/src/routes/lineMenu.test.ts apps/api/src/testing/fakeLine.ts apps/frontend/src/i18n/strings/line.ts
git commit -m "feat(api): the Kyoto Seika Practice Mode chat menus, linked by mode and moved to their full count at midnight"
```

---

### Task A7: The Kyoto Seika Practice Mode menus' images, and the menus in LINE (deploy step)

Steps 1–4 are code a subagent can do. Steps 5–7 call LINE's production Messaging API with `deploy/.env`: the operator runs them, from main once A1–A6 are merged.

**Files:**

- Modify: `deploy/line/returning-menu.html`, `apps/frontend/scripts/renderChatMenus.tsx`, `deploy/line/create-returning-menu.sh`, `deploy/README.md`, `deploy/line/menus.json` (by the script)
- Create: `deploy/line/images/returning-{en,ja}-{4,5,6,7,8,9,10}.png` (rendered)

- [ ] **Step 1: The page draws counts up to 10**

`returning-menu.html`: `const COUNTS = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"];` replaces the count list in the state check (`["plain", ...COUNTS, "reserve", "none"]`) and in the daily ticket's condition (`COUNTS.includes(state)`), whose shape becomes `state.length > 1 ? dailyTwoDigits : daily`; the header comment lists `?state=plain|10…1|reserve|none`. `renderChatMenus.tsx`: `STATES = ["plain", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "reserve", "none"] as const` ("4–10 show only on the Kyoto Seika Practice Mode menus"), and `content.tickets` gains `dailyTwoDigits: ticket(76)` (76 is an unverified guess, set by eye in Step 2).

- [ ] **Step 2: Look at ×10 before rendering**

Run: `pnpm --filter frontend chat-menus --serve`; open `…/returning-menu.html?lang=en&state=10&areas` and `?lang=ja&state=10`.
Expected: "×10" sits in its ticket with the margins "×3" has in its own; adjust `dailyTwoDigits` until it does.

- [ ] **Step 3: The script makes the Kyoto Seika Practice Mode menus**

`create-returning-menu.sh`:

```bash
  echo "usage: $0 en|ja plain|3|2|1|reserve|none|kyoto-seika-<1-10>|kyoto-seika-reserve|kyoto-seika-none [--print]" >&2
# the state check:
      plain | 3 | 2 | 1 | reserve | none) ;;
      kyoto-seika-[1-9] | kyoto-seika-10 | kyoto-seika-reserve | kyoto-seika-none) ;;
# after it:
# A Kyoto Seika Practice Mode menu shows the standard image for its count; 4–10 are drawn for that mode alone.
SHOWS="${STATE#kyoto-seika-}"
```

The label cases switch on `$SHOWS`: English `1) DRAW="Draw, 1 ticket left"`, `2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) DRAW="Draw, $SHOWS tickets left"`, `10) DRAW="Draw, 10 left"` (the long form is 21 characters, over LINE's 20, which the script refuses); Japanese `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) DRAW="かく（のこり${SHOWS}枚）"`. `IMAGE="$ROOT/deploy/line/images/returning-$MENU-$SHOWS.png"`. The header comment names the Kyoto Seika Practice Mode menus; `deploy/README.md`'s line for the script lists their states, 12 menus per language.

- [ ] **Step 4: Render, check and commit**

Run: `pnpm --filter frontend chat-menus`, then `./deploy/line/create-returning-menu.sh en kyoto-seika-10 --print` and `ja kyoto-seika-10 --print`.
Expected: every menu renders under 1 MB (the render script checks); the printed menus carry the labels above and pass the length check.

```bash
git add deploy/line/returning-menu.html deploy/line/create-returning-menu.sh deploy/line/images apps/frontend/scripts/renderChatMenus.tsx deploy/README.md
git commit -m "chore(line): chat menu images for counts up to 10, and the script makes the Kyoto Seika Practice Mode menus"
```

- [ ] **Step 5 (operator): Create the 24 menus**

LINE allows 100 menu creations an hour and 1,000 menus per account; `menus.json` goes from 13 menus to 37.

```bash
for lang in en ja; do
  for state in 10 9 8 7 6 5 4 3 2 1 reserve none; do
    ./deploy/line/create-returning-menu.sh "$lang" "kyoto-seika-$state" || break 2
  done
done
jq '(.en | keys | length), (.ja | keys | length)' deploy/line/menus.json
```

Expected: 24 "✓ created" lines, then `18` and `18`.

- [ ] **Step 6 (operator): Commit the IDs and deploy**

```bash
git add deploy/line/menus.json
git commit -m "chore(line): the Kyoto Seika Practice Mode chat menus in LINE"
./deploy/deploy.sh
```

The API reads `menus.json` at boot and refuses one where a Kyoto Seika Practice Mode menu shares a standard menu's ID (Task A6).

- [ ] **Step 7 (operator): Check it live**

Turn the mode on from the dev slip's account and reopen the app: the dev slip's Chat menu row reads "Kyoto Seika practice: draw with N daily tickets left", and `/api/logs` shows `chat_menu.relinked` with `menu: "kyoto-seika-N"`; after the next midnight, `chat_menu.batch_done`.

---

## Part B: the subject list, the deal, Begin, the corner print and the clock

Depends on Part A's shared names: `KyotoSeikaSubject`, `me.kyotoSeikaPractice`, `me.kyotoSeikaDarkSubjects`,
`TicketUse.kyotoSeikaPractice`, the seal form's optional `kyotoSeikaSubjects` (a JSON string),
`Sticker.kyotoSeikaSubjects`, and `KYOTO_SEIKA_TIME_USED_S` / `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY` through
`@drawing-app/api/client`, with `api/testFixtures.ts` updated for them. Paths are under `apps/frontend/src/`
unless they start with `apps/` or `data/`. Run tests with `pnpm --filter frontend exec vitest run <files>`;
run `pnpm check` before the part's last commit.

**Decisions this part takes**

1. The phase before `primed` is `dealt`. `start` carries `kyotoSeika: boolean` (the spent ticket's mode); a
   ticket spent in Kyoto Seika Practice Mode goes to `dealt`, Begin (`{ type: "begin" }`) goes straight to
   `drawing` with `start-clock`.
2. `SESSION_MS` goes. `sessionMs(kyotoSeika)` in `session.ts` is the one place a sheet's length comes from;
   the clock holds its own `length`, and the drawing screen reads `clock.length` where it read `SESSION_MS`.
3. The dealt sheet is the paused sheet's path in the ink engine (`paused: true`, not `locked`), so a touch
   fires `onBlocked`, which nudges Begin instead of the timer.
4. The kept record gains `kyotoSeika` (present = the ticket was spent in Kyoto Seika Practice Mode): the pair
   as full list entries (so a list change in a later build can't lose it), each die's rolls, and `begun`. A
   die with `CHARRED_AT_ROLL` rolls is charred; nothing else marks it.
5. Kyoto Seika Practice Mode's state lives in `kyoto-seika/useKyotoSeikaSheet.ts`, so `DrawingScreen.tsx`
   (1,091 lines) grows only by the calls into it.
6. Motion uses the Web Animations API with the prototype's values as named constants in
   `kyoto-seika/dealMotion.ts`, like `TimerDot`'s `NUDGE`. Bumps use `ui/seededRandom` (the app's one
   seeded source), so they jitter differently from the prototype's Park–Miller source: check the look.
7. **Pure and tested:** the list's parse, dealing, the die's mood, balloon geometry, the pair's layout and
   tightening, word sizes, `hasKanji`, a line's placement. **Browser-checked only:** keyframes, the burst's
   jagged points, puffs and chips (random by design).
8. `strings/kyotoSeika.ts` is created here; Part C adds `mark` and `censor` to it. `SubjectWord` (group
   ruby) is created here for Part C's detail mark.
9. The part merges as a whole: from B7 to B13 the sheet of a ticket spent in Kyoto Seika Practice Mode waits
   for a Begin that isn't built yet. Every commit's tests pass.

---

### Task B1: The subject list ships as data, with its notices

**Files:** Create `kyoto-seika/subjects/subjects.json` (generated), `kyoto-seika/subjects/NOTICES.txt`,
`kyoto-seika/subjects/subjectsModule.ts`, `kyoto-seika/subjectList.ts`. Test: `kyoto-seika/subjectList.test.ts`.
One-shot script (never committed, decision 17): `data/scratch/wordlist/to_subjects_json.mjs`.

- [ ] **Step 1: The one-shot script.** It reads `subjects-next.tsv`'s columns by name (word, reading,
      gloss_en, short_en, short_en_source, short_ja, short_ja_source, kind, tier, dark, jlpt, difficulty, flags)
      and writes `subjects.json`, sorted by `ja`. An empty `short_en` (where it would only repeat the English
      word) or `short_ja` (no source fits) stays `""`: that balloon shows no meaning line in that language.
      Sources, JLPT, difficulty and flags aren't shipped.

```js
// One-shot: turns the reviewed word list into apps/frontend/src/kyoto-seika/subjects/subjects.json.
// Lives in gitignored scratch with the list's build (decision 17); delete it with the build.
import { readFileSync, writeFileSync } from "node:fs";
const [header, ...rows] = readFileSync(process.argv[2], "utf8").trimEnd().split("\n");
const col = Object.fromEntries(header.split("\t").map((name, i) => [name, i]));
const KINDS = new Set(["phenomenon", "moment", "thing", "loanword", "people"]);
const subjects = rows.map((line, n) => {
  const c = line.split("\t");
  const kind = c[col.kind];
  if (!KINDS.has(kind)) throw new Error(`Row ${n + 2} (${c[col.word]}): unknown kind "${kind}"`);
  return {
    ja: c[col.word],
    reading: c[col.reading],
    en: c[col.gloss_en],
    shortEn: c[col.short_en],
    shortJa: c[col.short_ja],
    kind,
    dark: c[col.dark] === "dark",
  };
});
subjects.sort((a, b) => a.ja.localeCompare(b.ja, "ja"));
writeFileSync(process.argv[3], `${JSON.stringify(subjects, null, 1)}\n`);
console.log(`Wrote ${subjects.length} subjects, ${subjects.filter((s) => s.dark).length} dark`);
```

Run: `node data/scratch/wordlist/to_subjects_json.mjs data/scratch/wordlist/subjects-next.tsv apps/frontend/src/kyoto-seika/subjects/subjects.json`
from the seika-exam worktree. Expected: the row and dark counts of the TSV.

- [ ] **Step 2: `NOTICES.txt`:** CC BY-SA 4.0 for the list (JMdict/EDRDG, Japanese Wiktionary through
      kaikki.org, the JLPT keyed set), the Princeton WordNet 3.0 licence text, and NICT's Japanese WordNet notice
      copied from
      https://bond-lab.github.io/wnja/license.txt. `subjectsModule.ts` is the lazy chunk, so the notices ship
      with the data:

```ts
import raw from "./subjects.json";
import notices from "./NOTICES.txt?raw";
import { parseSubjectList } from "../subjectList";

/** The Kyoto Seika Subjects and their licence and notices, in one chunk loaded for a sheet in Kyoto Seika Practice Mode. */
export const SUBJECTS = parseSubjectList(raw);
export const NOTICES = notices;
```

- [ ] **Step 3: Failing tests** (`subjectList.test.ts`):

```ts
import raw from "./subjects/subjects.json";
import { MAX_SUBJECT_CHARS, parseSubjectList, KINDS } from "./subjectList";

describe("the subject list", () => {
  const list = parseSubjectList(raw);
  it("holds every kind, each word once, nouns of at most MAX_SUBJECT_CHARS characters", () => {
    expect(new Set(list.map((s) => s.kind))).toEqual(new Set(KINDS));
    expect(new Set(list.map((s) => s.ja)).size).toBe(list.length);
    expect(list.every((s) => [...s.ja].length <= MAX_SUBJECT_CHARS)).toBe(true);
  });
  it("refuses an entry it can't read, naming it", () => {
    expect(() => parseSubjectList([{ ja: "風", kind: "weather" }])).toThrow(/風/);
  });
});
```

- [ ] **Step 4: Run; they fail** (no `subjectList.ts`).
- [ ] **Step 5: Implement `subjectList.ts`.** `KyotoSeikaSubjectEntry` is the contract's entry:
      `KyotoSeikaSubject & { kind: SubjectKind; dark: boolean; shortEn: string; shortJa: string }`, `KINDS` the
      five kinds, `MAX_SUBJECT_CHARS = 6` (decision 7). `parseSubjectList(raw: unknown)` checks each entry with a
      type guard (as `keptSession.ts` reads its records) and throws `Kyoto Seika Subject <n> (<ja>) is unreadable`
      on the first bad one. `loadSubjectList()` imports `./subjects/subjectsModule` once, forgetting a failed
      load so the next call tries again, as `lazyWithPreload` does, and logs `The Kyoto Seika Subjects didn't
load` with the error.
- [ ] **Step 6: Run; they pass.** Check `pnpm --filter frontend build` puts `subjects.json` in its own chunk.
- [ ] **Step 7: Commit:** `git commit -m "feat(frontend): the Kyoto Seika Subjects ship as data with their notices, loaded only for a sheet in Kyoto Seika Practice Mode" -- apps/frontend/src/kyoto-seika`

### Task B2: A die's mood: lines, marks, countdown, charred

**Files:** Create `kyoto-seika/dieMood.ts`. Test: `kyoto-seika/dieMood.test.ts`.

- [ ] **Step 1: Failing tests.**

```ts
const rollsUpTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("a die's mood", () => {
  it("says each line once, on the roll that earns it, in the table's order", () => {
    const said = rollsUpTo(CHARRED_AT_ROLL).flatMap((r) => dieMood(r).line ?? []);
    expect(said).toEqual([...TEASE_LINES.values()]);
    expect(dieMood(Math.min(...TEASE_LINES.keys()) - 1)).toMatchObject({
      line: null,
      sweat: false,
    });
  });
  it("sweats from SWEAT_FROM_ROLL, angers from ANGER_FROM_ROLL, shivers from SHIVER_FROM_ROLL", () => {
    for (const r of rollsUpTo(CHARRED_AT_ROLL))
      expect(dieMood(r)).toMatchObject({
        sweat: r >= SWEAT_FROM_ROLL,
        anger: r >= ANGER_FROM_ROLL,
        shiver: r >= SHIVER_FROM_ROLL,
      });
  });
  it("counts down by one from COUNTDOWN_FROM_ROLL to 1 as it's charred, smoking all the while", () => {
    const counts = rollsUpTo(CHARRED_AT_ROLL).flatMap((r) => dieMood(r).countdown ?? []);
    expect(counts.at(-1)).toBe(1);
    expect(counts).toEqual(counts.map((_, i) => counts[0] - i));
    expect(counts).toHaveLength(CHARRED_AT_ROLL - COUNTDOWN_FROM_ROLL + 1);
    expect(dieMood(CHARRED_AT_ROLL)).toMatchObject({ charred: true, smoking: true });
    expect(dieMood(CHARRED_AT_ROLL - 1).charred).toBe(false);
  });
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.**

```ts
/** A die's lines, by the roll that earns each: their keys under the catalog's kyotoSeika.tease. */
export const TEASE_LINES = new Map([
  [10, "again"],
  [13, "stillDeciding"],
  [16, "goodOne"],
  [19, "godTier"],
  [22, "breakTheButton"],
  [25, "warned"],
] as const);
export type TeaseLine = typeof TEASE_LINES extends Map<number, infer L> ? L : never;
export const SWEAT_FROM_ROLL = 10;
export const ANGER_FROM_ROLL = 19;
export const SHIVER_FROM_ROLL = 22;
export const COUNTDOWN_FROM_ROLL = 26;
/** The roll that blows the die up: it's charred, and takes no more. */
export const CHARRED_AT_ROLL = 30;

/** How a die and its balloon look after `rolls` rolls, and what this roll says as it lands. */
export function dieMood(rolls: number): DieMood {
  const counting = rolls >= COUNTDOWN_FROM_ROLL && rolls <= CHARRED_AT_ROLL;
  return {
    line: TEASE_LINES.get(rolls) ?? null,
    countdown: counting ? CHARRED_AT_ROLL + 1 - rolls : null,
    sweat: rolls >= SWEAT_FROM_ROLL,
    anger: rolls >= ANGER_FROM_ROLL,
    shiver: rolls >= SHIVER_FROM_ROLL,
    smoking: rolls >= COUNTDOWN_FROM_ROLL,
    charred: rolls >= CHARRED_AT_ROLL,
  };
}
```

- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): a Kyoto Seika die's mood by its rolls, from the first tease to the bang`

### Task B3: Dealing, as one rule

**Files:** Create `kyoto-seika/deal.ts`, `kyoto-seika/dealtRecently.ts`, `kyoto-seika/testSubjects.ts`.
Test: `kyoto-seika/deal.test.ts`, `kyoto-seika/dealtRecently.test.ts`.

- [ ] **Step 1: The fixture** (`testSubjects.ts`): a tiny list, two of each kind and one dark thing, built
      by `entry(ja, kind, { dark, en })`, exported as `TEST_SUBJECTS`. 泉 (phenomenon) and 春 (moment) share
      the English "spring".
- [ ] **Step 2: Failing tests** (`deal.test.ts`):

```ts
const options = (over: Partial<DealOptions> = {}): DealOptions => ({
  recent: [],
  dark: false,
  random: seededRandom(1),
  ...over,
});
/** `n` first deals, one per seed. */
const deals = (n: number, base: DealOptions) =>
  Array.from({ length: n }, (_, seed) =>
    firstDeal(TEST_SUBJECTS, { ...base, random: seededRandom(seed) }),
  );

it("deals two subjects of different kinds, never a dark one without Dark subjects too", () => {
  for (const deal of deals(200, options())) {
    const [upper, lower] = deal.subjects;
    expect(upper.kind).not.toBe(lower.kind);
    expect(deal.subjects.some((s) => s.dark)).toBe(false);
  }
  expect(deals(200, options({ dark: true })).some((d) => d.subjects.some((s) => s.dark))).toBe(
    true,
  );
});

it("rolls a balloon to a new word of another kind than the other balloon's, never either word on screen", () => {
  let deal = firstDeal(TEST_SUBJECTS, options());
  for (let i = 0; i < 20; i++) {
    const before = deal;
    deal = rollDie(TEST_SUBJECTS, deal, 0, options({ random: seededRandom(i) })) ?? deal;
    expect(before.subjects.map((s) => s.ja)).not.toContain(deal.subjects[0].ja);
    expect(deal.subjects[0].kind).not.toBe(deal.subjects[1].kind);
    expect(deal.subjects[1]).toBe(before.subjects[1]);
  }
  expect(deal.rolls).toEqual([20, 0]);
});

it("never pairs two words that share their English", () => {
  // The fixture's 泉 (phenomenon) and 春 (moment) are both "spring".
  for (const deal of deals(200, options()))
    expect(deal.subjects[0].en).not.toBe(deal.subjects[1].en);
});

it("skips the words dealt lately, unless nothing else is left", () => {
  const lately = TEST_SUBJECTS.filter((s) => s.kind !== "people").map((s) => s.ja);
  const deal = firstDeal(TEST_SUBJECTS, options({ recent: lately }));
  expect(deal.subjects.filter((s) => lately.includes(s.ja))).toHaveLength(1);
});

it("takes no roll once the die is charred", () => {
  const charred = { ...firstDeal(TEST_SUBJECTS, options()), rolls: [CHARRED_AT_ROLL, 0] as const };
  expect(rollDie(TEST_SUBJECTS, charred, 0, options())).toBeNull();
});
```

`dealtRecently.test.ts`: keeping more than `RECENT_DEALT` words reads back the newest `RECENT_DEALT`,
newest last; an unreadable entry reads as none and is logged.

- [ ] **Step 3: Run; they fail.**
- [ ] **Step 4: Implement.**

```ts
/** 0: the upper balloon, 1: the lower. */
export type Balloon = 0 | 1;
export interface Deal {
  subjects: readonly [KyotoSeikaSubjectEntry, KyotoSeikaSubjectEntry];
  rolls: readonly [number, number];
}
export interface DealOptions {
  /** Words dealt on this phone lately, newest last. */
  recent: readonly string[];
  /** Dark subjects too, dealt only while both switches are on (spec decision 11). */
  dark: boolean;
  random: () => number;
}

/**
 * The one dealing rule: what `balloon` can be dealt beside what's on screen. Never a kind the other
 * balloon holds, nor the other balloon's English, nor either balloon's word, nor a dark subject without
 * Dark subjects too; words dealt lately only when nothing else is left.
 */
export function poolFor(
  list: readonly KyotoSeikaSubjectEntry[],
  balloon: Balloon,
  shown: readonly (KyotoSeikaSubjectEntry | null)[],
  { recent, dark }: Pick<DealOptions, "recent" | "dark">,
): KyotoSeikaSubjectEntry[] {
  const other = shown[balloon === 0 ? 1 : 0];
  const onScreen = new Set(shown.flatMap((s) => (s ? [s.ja] : [])));
  const allowed = list.filter(
    (s) =>
      (dark || !s.dark) &&
      !onScreen.has(s.ja) &&
      s.kind !== other?.kind &&
      s.en.toLowerCase() !== other?.en.toLowerCase(),
  );
  const lately = new Set(recent);
  const fresh = allowed.filter((s) => !lately.has(s.ja));
  return fresh.length > 0 ? fresh : allowed;
}

export function dealSubject(list, balloon, shown, options): KyotoSeikaSubjectEntry {
  const pool = poolFor(list, balloon, shown, options);
  if (pool.length === 0)
    throw new Error(
      `No Kyoto Seika Subject is left to deal the ${balloon === 0 ? "upper" : "lower"} balloon`,
    );
  return pool[Math.floor(options.random() * pool.length)];
}

export function firstDeal(list, options): Deal {
  const upper = dealSubject(list, 0, [null, null], options);
  return { subjects: [upper, dealSubject(list, 1, [upper, null], options)], rolls: [0, 0] };
}

/** A roll of `balloon`'s die: a new subject there, and one more roll. Null once that die is charred. */
export function rollDie(list, deal: Deal, balloon: Balloon, options): Deal | null {
  if (dieMood(deal.rolls[balloon]).charred) return null;
  const next = dealSubject(list, balloon, deal.subjects, options);
  // Literals in each branch, so the return type makes them tuples with no cast.
  return balloon === 0
    ? { subjects: [next, deal.subjects[1]], rolls: [deal.rolls[0] + 1, deal.rolls[1]] }
    : { subjects: [deal.subjects[0], next], rolls: [deal.rolls[0], deal.rolls[1] + 1] };
}
```

`dealtRecently.ts`:
`RECENT_DEALT = 40`; `readDealtRecently(userId)` and `keepDealt(userId, words)` on
`personKey("kyotoSeika.dealt", userId)` through `ui/deviceStorage`, trimmed to the newest `RECENT_DEALT`.

- [ ] **Step 5: Run both; they pass.**
- [ ] **Step 6: Commit:** `feat(frontend): deal Kyoto Seika Subjects in pairs of two kinds, each die rolling its own balloon`

### Task B4: Balloon geometry, the pair's layout and word sizes

**Files:** Create `kyoto-seika/balloonGeometry.ts`, `kyoto-seika/SubjectWord.tsx`. Test:
`kyoto-seika/balloonGeometry.test.ts`.

- [ ] **Step 1: Failing tests.**

```ts
describe("a thought balloon", () => {
  it("trails its three beads toward the thinker, each smaller and farther than the last", () => {
    const { beads, rx } = balloonShapes(BALLOONS[0], [-150, 200]);
    const dist = beads.map((b) => Math.hypot(b.x, b.y));
    expect(dist).toEqual(dist.toSorted((a, b) => a - b));
    expect(dist[0]).toBeGreaterThan(rx);
    expect(beads.every((b) => b.x < 0 && b.y > 0)).toBe(true);
  });
  it("draws the same bumps for the same balloon", () => {
    expect(balloonShapes(BALLOONS[1], [-1, 1])).toEqual(balloonShapes(BALLOONS[1], [-1, 1]));
  });
});

describe("the pair's layout", () => {
  const natural = pairHeight(false);
  it("tightens rather than scaling when the space between the label and Begin is shorter than the pair", () => {
    expect(pairLayout({ width: 390, top: 0, bottom: natural }).tight).toBe(false);
    expect(pairLayout({ width: 390, top: 0, bottom: natural - 1 }).tight).toBe(true);
    expect(pairHeight(true)).toBeLessThan(natural);
  });
  it("centers the pair in the space, the upper left of the lower", () => {
    const {
      centers: [u, l],
    } = pairLayout({ width: 390, top: 100, bottom: 700 });
    expect((u[1] + l[1]) / 2).toBeCloseTo(400, -1);
    expect(u[0]).toBeLessThan(l[0]);
  });
});

describe("a subject's word", () => {
  it("sets a longer word smaller, never under FURIGANA_WORD_MIN_PX, and no bigger than TIGHT_WORD_PX when tight", () => {
    const sizes = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "てるてる坊主"].map((w) =>
      wordSizePx(w, false),
    );
    expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(FURIGANA_WORD_MIN_PX);
    expect(wordSizePx("風", true)).toBeLessThanOrEqual(TIGHT_WORD_PX);
  });
  it("finds kanji to put furigana over", () => {
    expect(["風", "落ち葉", "SNS", "スポーツ", "うちわ"].map(hasKanji)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement** from `deal-proto.js:15-35,126-145`:
  - `BALLOONS`: `{ w: 176, h: 124, tilt: -3, bumps: 11, seed: 7, die: [113, 50], bobMs: 3400 }` and
    `{ w: 176, h: 130, tilt: 2.5, bumps: 11, seed: 21, die: [110, 56], bobMs: 4100 }`; tight `h` 108 and
    114 (unverified guess: tune at 375 × 640).
  - `balloonShapes(spec, toward)`: the prototype's body (ellipse `rx = w/2·1.2`, `ry = h/2·1.28`, bumps
    13–19 px) and beads (`[edge+14, 9, 7]`, `[edge+36, 6.2, 5]`, `[edge+54, 4, 3.4]`); `shapesBox(shapes, pad)`.
  - `pairLayout({ width, top, bottom })` → `{ tight, centers }`: x at 182/390 and 236/390 of the width,
    y at the space's middle −108 and +106 (tight: scaled by the tight heights); `tight` when the space is
    under `pairHeight(false)`, computed from the shapes' boxes, not a constant.
  - `wordSizePx(ja, tight)`: 46 for one or two characters, 42, 36, 32, 28 for three to six, 40 for a Latin
    acronym (`/^[A-Z]+$/`); tight caps it at `TIGHT_WORD_PX = 36`. `FURIGANA_WORD_MIN_PX = 20`.
  - `hasKanji`: `/\p{Script=Han}/u`. `TYPE` and `TIGHT_TYPE`: reading 12, English 16, meaning 12.5 (11.5
    tight), padding (less when tight).
  - `SubjectWord({ subject })`: `<ruby>` with one `<rt>` (group ruby, the whole word's reading) when
    `hasKanji(subject.ja)`, the bare word otherwise; `lang="ja"`.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the Kyoto Seika balloons' shapes, their layout between the timer and Begin, and word sizes`

### Task B5: The catalog's strings and the glossary

**Files:** Create `i18n/strings/kyotoSeika.ts`; modify `i18n/strings/index.ts`, `i18n/strings/stickerCreation.ts`,
`i18n/glossary.md`.

- [ ] **Step 1: Add the strings**, each with its `/** where */` line (shown for the first only):

```ts
export const kyotoSeika = {
  balloons: {
    /** Drawing screen, in Kyoto Seika Practice Mode before Begin: the two thought balloons' group name for screen readers */
    label: { en: "Your subjects", ja: "題材" },
    roll: {
      en: "Roll another subject: {{word}}, {{english}}",
      ja: "別の題材にする：{{word}}、{{english}}",
    },
    subject: { en: "{{word}}, {{english}}", ja: "{{word}}、{{english}}" },
    charred: {
      en: "The die blew up. This subject stays.",
      ja: "サイコロが爆発しました。この題材で決まりです。",
    },
    loadFailed: { en: "Couldn’t load the subjects.", ja: "題材を読み込めませんでした。" },
    retry: { en: "Try again", ja: "もう一度" },
  },
  begin: {
    key: { en: "Begin", ja: "はじめ" },
    label: {
      en: "Begin: start the {{minutes}}-minute timer",
      ja: "はじめ：{{minutes}}分のタイマーをスタート",
    },
  },
  tease: {
    again: { en: "Eh? Again?", ja: "ええ、また？" },
    stillDeciding: { en: "Still deciding?", ja: "まだ決めてないの？" },
    goodOne: { en: "Isn’t that a good one?", ja: "いい題材じゃない？" },
    godTier: { en: "Holding out for god-tier?", ja: "次こそ神題材だとでも？" },
    breakTheButton: { en: "You’ll break the button!", ja: "ボタンが壊れちゃう！" },
    warned: { en: "Don’t say I didn’t warn you", ja: "もう知らないよ？" },
    boom: { en: "KA-BOOM!", ja: "ドカーン！" },
  },
  print: {
    /** Drawing screen, in Kyoto Seika Practice Mode: the boxed word heading the corner print, in both languages */
    heading: { en: "題材", ja: "題材" },
    /** Drawing screen, in Kyoto Seika Practice Mode once begun: the canvas's name for screen readers, with the pair */
    canvas: {
      en: "Canvas, subjects {{first}} and {{second}}",
      ja: "キャンバス、題材は{{first}}と{{second}}",
    },
  },
} as const satisfies Section;
```

In `stickerCreation.timer`: `status.dealt` ("{{time}} left, starts when you press Begin" /
「残り{{time}}、はじめを押すとスタート」), `note.startsWhenYouPressBegin` ("Starts when you press Begin" /
「はじめを押すとスタート」), `note.minutesLeft` ("{{minutes}} minutes left" / 「残り{{minutes}}分」, the
proctor's time call). `glossary.md` gains two rows: "subject (Kyoto Seika Subject) | 題材 | The guide's word;
'subject' in English" and "Begin (Kyoto Seika Practice Mode's key) | はじめ | The proctor's word".

- [ ] **Step 2: Typecheck:** `pnpm --filter frontend exec tsc --noEmit`; `pnpm --filter frontend i18n:export /tmp/strings.csv` lists them with their comments.
- [ ] **Step 3: Commit:** `feat(frontend): the deal, Begin, the teasing and the corner print in English and Japanese`

### Task B6: The clock's length comes from the sheet's ticket, with the proctor's time calls

**Files:** Modify `sticker-creation/session/session.ts:1-5`, `sticker-creation/session/useSessionClock.ts`,
`sticker-creation/DrawingScreen.tsx` (every `SESSION_MS`), `sticker-creation/DrawingScreen.test.tsx:13,132,210`.
Test: `sticker-creation/session/useSessionClock.test.ts`.

- [ ] **Step 1: Failing tests.** Replace `SESSION_MS` with `sessionMs(false)` in the file; `setup` takes
      `{ length }` and passes it to `new SessionClock(frames, length)`. Add:

```ts
it("runs as long as its sheet's ticket says, and sets a waiting clock to another length", () => {
  const { clock, counted, onTimeUp } = setup({ started: false, length: sessionMs(true) });
  expect(clock.getView().secondsLeft).toBe(KYOTO_SEIKA_TIME_USED_S);
  clock.setLength(sessionMs(false));
  expect(clock.getView().secondsLeft).toBe(MAX_TIME_USED_S);
  clock.setLength(sessionMs(true));
  clock.start();
  counted(sessionMs(true) - 1000);
  expect(onTimeUp).not.toHaveBeenCalled();
  clock.setLength(sessionMs(false));
  expect(clock.length).toBe(sessionMs(true));
});

it("calls the time at 10 and 5 minutes left on the clock of a sheet in Kyoto Seika Practice Mode, and never on a regular one", () => {
  const heard = (length: number) => {
    const { clock, advance } = setup({ length });
    const calls: number[] = [];
    clock.onWarning((s) => calls.push(s));
    advance(length, 250);
    return calls;
  };
  expect(heard(sessionMs(true))).toEqual(WARN_AT_SECONDS);
  expect(heard(sessionMs(false))).toEqual(
    WARN_AT_SECONDS.filter((s) => s * 1000 < sessionMs(false)),
  );
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `session.ts`:

```ts
/** How long a sheet gets on the drawing clock, by its ticket's mode; the server refuses a seal that used more. */
export const sessionMs = (kyotoSeika: boolean) =>
  (kyotoSeika ? KYOTO_SEIKA_TIME_USED_S : MAX_TIME_USED_S) * 1000;
```

`useSessionClock.ts`: `WARN_AT_SECONDS` becomes exported `[10 * 60, 5 * 60, 30, 10]` ("the proctor's time
calls, which only the clock of a sheet in Kyoto Seika Practice Mode is long enough to reach, then the last
30 and 10 seconds");
`private lengthMs`, `get length()`, the constructor's `lengthMs = sessionMs(false)`, `setLength(ms)` (only
while `idle`, then `changed()`), `reset(lengthMs = this.lengthMs)`; every `SESSION_MS` reads `this.lengthMs`.
`useSessionClock(onTimeUp, lengthMs)` builds it with the length the first sheet will take.
`DrawingScreen.tsx`: `useSessionClock(…, sessionMs(me.kyotoSeikaPractice))`; `clock.length` replaces
`SESSION_MS` in `seal()` (the `timeUsed` cap and both time-up checks); the reset effect calls
`clock.reset(sessionMs(me.kyotoSeikaPractice))`, since the next ticket is spent in the current mode; `start`'s
success calls `clock.setLength(sessionMs(use.kyotoSeikaPractice))` before `send`; `StartDrawing`'s
`minutes={sessionMs(me.kyotoSeikaPractice) / 60_000}`. An effect sets the length again when
`me.kyotoSeikaPractice` changes on a blank sheet (Settings apply in place).

- [ ] **Step 4: Run `useSessionClock.test.ts` and `DrawingScreen.test.tsx`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the drawing clock runs as long as its sheet's ticket says, with the proctor's time calls at 10 and 5 minutes`

### Task B7: The session's dealt phase, and Begin

**Files:** Modify `sticker-creation/session/session.ts:9-113`. Test: `sticker-creation/session/session.test.ts`.

- [ ] **Step 1: Failing tests.** `start` becomes `{ type: "start", kyotoSeika: false }`; add
      `practice = { type: "start", kyotoSeika: true }`, `begin = { type: "begin" }`, and `restored(drawn, sealSent,
dealt = false)`:

```ts
it("deals the pair of a ticket spent in Kyoto Seika Practice Mode and waits, sheet locked, for Begin, which starts the clock at once", () => {
  expect(run(practice)).toEqual({ phase: "dealt", effects: ["keep-session"] });
  expect(run(practice, ink)).toEqual({ phase: "dealt", effects: [] });
  expect(run(practice, begin)).toEqual({
    phase: "drawing",
    effects: ["start-clock", "lock-subjects"],
  });
  expect(run(start, begin)).toEqual({ phase: "primed", effects: [] });
  expect(run(practice, begin, ink)).toEqual({ phase: "drawing", effects: [] });
  expect(run(practice, tap(1000))).toEqual({ phase: "dealt", effects: [] });
});

it("brings a sheet in Kyoto Seika Practice Mode back dealt until Begin, and drawing after it", () => {
  expect(run(restored(false, false, true)).phase).toBe("dealt");
  expect(run(restored(true, false, false)).phase).toBe("drawing");
  expect(run(restored(false, true, true)).phase).toBe("retry");
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `Phase` gains `"dealt"`, documented: "dealt: a ticket was spent in
      Kyoto Seika Practice Mode; its two subjects wait in their balloons for Begin, the sheet takes no ink and
      the tools are hidden."
      `primed`'s line says "a regular ticket". Events: `start` gains `kyotoSeika: boolean`; `{ type: "begin" }`
      ("Begin locked the pair in: the clock starts at once, as a proctor's 始め does"); `restored` gains `dealt:
boolean` ("a sheet in Kyoto Seika Practice Mode still waiting for Begin"). Effect `"lock-subjects"`:
      "Keep the pair as begun; the balloons tuck into the corner print."

```ts
case "start":
  return phase === "blank" ? to(event.kyotoSeika ? "dealt" : "primed", ["keep-session"]) : unchanged;
case "begin":
  return phase === "dealt" ? to("drawing", ["start-clock", "lock-subjects"]) : unchanged;
case "restored":
  if (phase !== "blank" && phase !== "primed" && phase !== "dealt") return unchanged;
  return to(event.sealSent ? "retry" : event.drawn ? "drawing" : event.dealt ? "dealt" : "primed");
```

`DrawingScreen.tsx`'s `send({ type: "start" })` passes `kyotoSeika: use.kyotoSeikaPractice`, and its
`restored` sends pass `dealt: false`. Its `run` takes `"lock-subjects"` in Task B13, the first to send
`begin`.

- [ ] **Step 4: Run `session.test.ts` and `DrawingScreen.test.tsx`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): a sheet in Kyoto Seika Practice Mode waits dealt for Begin, which starts its clock at once`

### Task B8: The kept session keeps the mode, the pair, the rolls and Begin

**Files:** Modify `sticker-creation/session/keptSession.ts`. Test: `sticker-creation/session/keptSession.test.ts`.

- [ ] **Step 1: Failing tests** (beside the existing record tests, through `SessionKeeper` and `loadKeptSession`):

```ts
it("keeps the pair, rolls and Begin of a sheet in Kyoto Seika Practice Mode with its ticket, and reads them back", async () => {
  const keeper = new SessionKeeper(USER);
  keeper.start(7, { subjects: null, rolls: [0, 0], begun: false });
  keeper.keepKyotoSeika({ subjects: [WIND, REUNION], rolls: [CHARRED_AT_ROLL, 3], begun: true });
  await settled();
  expect(await loadKeptSession(USER)).toMatchObject({
    status: "found",
    ticket: 7,
    kyotoSeika: { subjects: [WIND, REUNION], rolls: [CHARRED_AT_ROLL, 3], begun: true },
  });
});

it("keeps no Kyoto Seika Practice Mode part for a regular sheet, and reads a record whose part is unreadable as a regular sheet's, logged", async () => {
  // a record written with kyotoSeika: { subjects: "x" } reads back with kyotoSeika null and one console.error
});

it("carries a ticket's Kyoto Seika Practice Mode part with it when the drawing isn't read", async () => {
  // readSteps fails: the unread result still has the record's kyotoSeika
});
```

`WIND`/`REUNION` come from `kyoto-seika/testSubjects.ts`.

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.**

```ts
/** The Kyoto Seika Practice Mode part of the record: present only when its ticket was spent in that mode. */
export interface KeptKyotoSeika {
  /** Null until the list loads and deals. */
  subjects: readonly [KyotoSeikaSubjectEntry, KyotoSeikaSubjectEntry] | null;
  rolls: readonly [number, number];
  /** Begin locked the pair in, and started the clock. */
  begun: boolean;
}
```

`SessionRecord.kyotoSeika: KeptKyotoSeika | null`; `start(ticket, kyotoSeika = null)`; `resume(…, kyotoSeika)`;
`carry(ticket, kyotoSeika)`; `keepKyotoSeika(part)` writes the record unless `carried` (as `keepNsfw`
does); `wipe` clears it. `readRecord` reads it with `readKyotoSeika(v)` (entries checked by
`subjectList.ts`'s guard, rolls as two counts); unreadable logs "The Kyoto Seika Practice Mode part of the
drawing in progress is unreadable, so it comes back as a regular sheet" and reads null. `KeptDrawing`'s
`unread` and `lost` (with a ticket) carry `kyotoSeika` too, so a carried ticket keeps its mode.

- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the kept session keeps the pair, rolls and Begin of a sheet in Kyoto Seika Practice Mode, so a reload can't fix a die`

### Task B9: The timer dot: 56 px from 10:00, Begin's notes, and the time calls

**Files:** Modify `sticker-creation/TimerDot.tsx`, `sticker-creation/TimerDot.css`. Test: create
`sticker-creation/TimerDot.test.tsx`.

- [ ] **Step 1: Failing tests** (render `TimerDot` with a `SessionClock` on hand-driven frames, as
      `useSessionClock.test.ts`'s `setup` builds it; move that helper to `session/testClock.ts` and use it in both):

```tsx
it("grows to the wide dot while the clock reads 10:00 or more", () => {
  const { clock, advance, host } = renderDot({ length: sessionMs(true) });
  expect(dot(host).classList).toContain("is-wide");
  advance(sessionMs(true) - TEN_MINUTES_MS + 1000);
  expect(dot(host).classList).not.toContain("is-wide");
});

it("shows the proctor's time call on its label, and reads it out", () => {
  const { advance, host } = renderDot({ length: sessionMs(true) });
  advance(sessionMs(true) - 10 * 60_000);
  expect(host.querySelector(".timer-hint.is-on")?.textContent).toBe("10 minutes left");
});

it("says a dealt clock starts at Begin", () => {
  const { host } = renderDot({ length: sessionMs(true), started: false, waitsFor: "begin" });
  expect(dot(host).getAttribute("aria-describedby") && described(host)).toMatch(/press Begin/);
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `wide = view.secondsLeft >= WIDE_FROM_SECONDS` (`10 * 60`, exported), class
      `is-wide`. A warning of a minute or more is a time call: it sets `call` (minutes) for `CALL_MS = 4000`
      (unverified guess, tunable) and shows as the label, after the paused hint and before `note`; under a
      minute it stays the screen-reader warning. Prop `waitsFor: "stroke" | "begin"` picks `status.waiting` or
      `status.dealt`. CSS: `--timer-dot: 48px` on `.timer-dot`, `56px` on `.is-wide`, width and height from it;
      `.timer-hint`'s `top: calc(var(--timer-dot) + 13px)`; the size eases on `--t-stick`. Check at 360 wide that
      the tool strip still fits beside the wide dot.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the timer dot widens for 30:00, says a dealt clock starts at Begin, and shows the proctor's time calls`

### Task B10: The balloons and their dice

**Files:** Create `kyoto-seika/SubjectBalloons.tsx`, `kyoto-seika/subject-balloons.css`,
`kyoto-seika/dealMotion.ts`. Modify `icons/index.tsx` (export `DiceFive`, `DiceFour`). Test:
`kyoto-seika/SubjectBalloons.test.tsx`.

- [ ] **Step 1: Failing tests** (render with `deal` from `testSubjects.ts`, `reduced` both ways):

```tsx
it("names the pair as a group, and each die by the subject it would replace", () => {
  const host = render(<SubjectBalloons deal={DEAL} onRoll={() => {}} layout={LAYOUT} />);
  expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Your subjects");
  expect(dice(host).map((d) => d.getAttribute("aria-label"))).toEqual([
    "Roll another subject: 風, wind",
    "Roll another subject: 再会, reunion",
  ]);
});

it("reads each new subject out politely", async () => {
  const host = render(<Harness />); // rolls through useKyotoSeika's deal with seededRandom
  await act(() => dice(host)[1].click());
  expect(status(host).textContent).toBe(subjectSaid(dealtNow(host)[1]));
});

it("puts furigana over kanji words only, and the meaning in the app's language", () => {
  // 風 has <ruby><rt>かぜ</rt>; スポーツ none; in ja a subject with shortJa "" shows no meaning line
});

it("charred, a die takes no roll and says the subject stays", () => {
  const onRoll = vi.fn();
  const host = render(
    <SubjectBalloons
      deal={{ ...DEAL, rolls: [CHARRED_AT_ROLL, 0] }}
      onRoll={onRoll}
      layout={LAYOUT}
    />,
  );
  dice(host)[0].click();
  expect(onRoll).not.toHaveBeenCalled();
  expect(dice(host)[0].getAttribute("aria-disabled")).toBe("true");
  expect(dice(host)[0].getAttribute("aria-label")).toBe("The die blew up. This subject stays.");
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `SubjectBalloons({ deal, layout, onRoll, reduced })` renders a
      `role="group"` named `balloons.label`; per balloon a wrapper at its center and tilt, a float layer, the
      beads' and the cloud's SVGs from `balloonShapes`/`shapesBox` (Ink edge 2.25 px under a Canvas fill, the
      Lift shadow), the words box (reading 12 px Graphite via `SubjectWord`, the word at `wordSizePx`,
      `--font-jp` 800, the English 16 px 750 `lang="en"`, the meaning 12.5 px Graphite, two lines, 150 px, in the
      app's language, none when empty), and the die: label stock, 32 px face over a 3 px lip, 44 px touch,
      Phosphor's die (bold; `DiceFive` upper, `DiceFour` lower), on the balloon's lower-right edge at
      `spec.die`. Dice come after the balloons in the DOM, in reading order. A visually hidden `role="status"`
      carries `balloons.subject` for each new subject. `dealMotion.ts` holds the prototype's values:

```ts
export const SPRING = EASE_SPRING; // ui/easing
export const ARRIVE = {
  firstMs: 120,
  staggerMs: 260,
  beadsMs: 220,
  cloudAfterMs: 140,
  cloudMs: 420,
  wordAfterMs: 380,
  wordMs: 260,
};
export const CLOUD_ARRIVE: Keyframe[] = [
  { opacity: 0, scale: "0.55 0.5" },
  { opacity: 1, scale: "1.06 0.96", offset: 0.55 },
  { scale: "0.98 1.03", offset: 0.8 },
  { opacity: 1, scale: "1 1" },
];
export const WORD_STAMP: Keyframe[] = [
  { opacity: 0, scale: 1.35, rotate: "-6deg" },
  { opacity: 1, scale: 1, rotate: "0deg" },
];
export const FLOAT = { px: 3, deg: 0.6 }; // periods: each balloon's bobMs
export const ROLL = {
  dieMs: 420,
  hopPx: 9,
  turns: 2,
  cloudMs: 300,
  wordOutMs: 120,
  wordInMs: 220,
  puffs: 5,
};
export const CLOUD_SQUASH: Keyframe[] = [
  { scale: "1 1" },
  { scale: "0.95 0.97" },
  { scale: "1.03 1.01" },
  { scale: "1 1" },
];
```

Arrive, float (CSS animation, paused while `document.hidden` via a class), and roll (die tumble with hop,
cloud squash, five puffs, the old word out to 0.7, the new popping to 1.12 and settling) run unless
reduced; reduced, the balloons are simply there and a roll swaps the word.

- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): Kyoto Seika Subjects dealt in thought balloons, each with its own die`

### Task B11: Rolling too much: lines, 漫符, the countdown and the bang

**Files:** Create `kyoto-seika/DieTeasing.tsx`, `kyoto-seika/die-teasing.css`, `kyoto-seika/teasePlacement.ts`.
Modify `kyoto-seika/SubjectBalloons.tsx`, `kyoto-seika/dealMotion.ts`. Test: `kyoto-seika/teasePlacement.test.ts`,
`kyoto-seika/SubjectBalloons.test.tsx`.

- [ ] **Step 1: Failing tests.**

```ts
// teasePlacement.test.ts
it("puts the upper balloon's line above it and the lower's below, inside the screen's edges", () => {
  const at = (balloon: Balloon, dieRight: number) =>
    teasePlacement({
      balloon,
      cloud: { top: 200, bottom: 330 },
      dieRight,
      size: { w: 160, h: 26 },
      screenWidth: 390,
    });
  expect(at(0, 300).top + 26).toBeLessThanOrEqual(200);
  expect(at(1, 300).top).toBeGreaterThanOrEqual(330);
  expect(at(0, 389).left + 160).toBeLessThanOrEqual(390 - TEASE_EDGE_PX);
  expect(at(0, 20).left).toBeGreaterThanOrEqual(TEASE_EDGE_PX);
});
```

In `SubjectBalloons.test.tsx`: at `TEASE_LINES`' first roll the line is the catalog's `tease.again` in
the app's language, also in the live region; at `CHARRED_AT_ROLL` the die is charred and the live region
says `balloons.charred` once `BOOM_DELAY_MS` passes (fake timers).

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `SubjectBalloons` keeps the last roll per balloon and renders `DieTeasing` for
      its `dieMood`. Values from `deal-proto.js:236-421`:
  - **Line (書き文字):** white Dela Gothic One, 5 px Ink stroke (`paint-order: stroke fill`), 22 px, tilted
    −6°, scale 0.3 → 1.15 → 1, peeling after `TEASE_MS = 1600`; one per balloon (a new one replaces it), at
    `teasePlacement`. Reduced: fades in and out in place over 1500 ms.
  - **漫符:** sweat drop at the balloon's (0.62 w, −0.42 h), anger vein at (0.3 w, −0.92 h), popping in
    (0.2 → 1, 300 ms) and dripping (1.8 s) / throbbing (0.7 s); shiver (`margin-left` ±1 px every 120 ms)
    from `SHIVER_FROM_ROLL`. Reduced: they hold still. The SVGs are copies of the prototype's; they're drawn
    marks, not icons, so the Phosphor rule doesn't cover them.
  - **Countdown:** a Seal Yellow 46 px number centered over the die, 6 px Ink stroke, untilted, 800 ms.
    The die smokes (a wisp, 1.6 s loop) from `COUNTDOWN_FROM_ROLL`.
  - **The bang:** `BOOM_DELAY_MS = 520` after the 30th roll: a 16-spike burst (white 78/44, Tomato 50/28,
    Seal Yellow 26/14 px radii, Ink outlined) scales 0.1 → 1.15 → 1 → 1.08 and fades over 1400 ms;
    `tease.boom` at 34 px over 1700 ms; nine label-stock chips fly 50–120 px; the balloon jolts (360 ms).
    The die turns charred: Ink face, white crack, smoking, `aria-disabled`. Reduced: the burst and words
    fade in and out instead.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): a die rolled too often teases in hand lettering, counts down from five and blows up`

### Task B12: The corner print, under the ink

**Files:** Create `kyoto-seika/CornerPrint.tsx`, `kyoto-seika/corner-print.css`. Modify
`sticker-creation/canvas/DrawingCanvas.tsx:36-41,124-131`, `styles/tokens.css`. Test: `kyoto-seika/CornerPrint.test.tsx`.

- [ ] **Step 1: Failing test.**

```tsx
it("prints the pair down the sheet's corner under the ink, taking no touches and hidden from screen readers", () => {
  const host = render(<CornerPrint subjects={[WIND, SPORTS]} />);
  const print = host.querySelector(".corner-print");
  expect(print?.getAttribute("aria-hidden")).toBe("true");
  expect([...print!.querySelectorAll("rt")].map((rt) => rt.textContent)).toEqual(["かぜ"]);
  expect(print?.textContent).toContain("sport");
});
```

- [ ] **Step 2: Run; it fails.**
- [ ] **Step 3: Implement.** `tokens.css`: `--non-repro-blue: #8cc8e8;` with the line "manga manuscript
      paper's blue that doesn't print: the corner print". `CornerPrint`: `writing-mode: vertical-rl`, a small
      boxed `print.heading`, then each subject top to bottom as `SubjectWord` (`ruby-position: over` sets the
      furigana on its right in vertical text) with its English sideways on its left; 24 px words, 20 px from
      four characters, 11 px furigana, 11.5 px English, all non-repro blue; `position: absolute; right: 16px;
bottom: 150px; pointer-events: none`. `DrawingCanvas` gains `under?: ReactNode` (rendered in `.ink-sheet`
      before the canvas, so ink covers it) and `label?: string` (the canvas's name, default the catalog's
      `canvas`).
- [ ] **Step 4: Run it and `DrawingScreen.test.tsx`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the sheet's Kyoto Seika Subjects as a vertical margin note in non-repro blue, under the ink`

### Task B13: Begin, and Kyoto Seika Practice Mode on the drawing screen

**Files:** Create `kyoto-seika/BeginKey.tsx`, `kyoto-seika/begin-key.css`, `kyoto-seika/KyotoSeikaDeal.tsx`,
`kyoto-seika/useKyotoSeikaSheet.ts`. Modify `sticker-creation/DrawingScreen.tsx`, `sticker-creation/DrawingScreen.css`,
`sticker-creation/DrawingScreen.test.tsx`.

- [ ] **Step 1: Failing tests** in `DrawingScreen.test.tsx`. Mock `../kyoto-seika/subjectList`'s
      `loadSubjectList` to resolve `TEST_SUBJECTS`; the spend answers `{ ...use, kyotoSeikaPractice: true }`;
      make the `DrawingCanvas` mock record its last `settings` and `label` in the hoisted `sheetCalls`.

```tsx
it("deals the pair of a ticket spent in Kyoto Seika Practice Mode, hides the tools and holds the sheet until Begin", async () => {
  const host = await openPracticeSheet();
  expect(dice(host)).toHaveLength(2);
  expect(host.querySelector(".drawing-screen")?.classList).toContain("is-dealt");
  expect(sheetCalls.settings?.paused).toBe(true);
  await press(beginKey(host));
  expect(sheetCalls.settings?.paused).toBe(false);
  expect(keptRecord()?.kyotoSeika).toMatchObject({ begun: true });
  expect(sheetCalls.label).toContain(keptRecord()?.kyotoSeika.subjects[0].ja);
});

it("brings a reload back to the same balloons, its charred die still charred", async () => {
  kept.session = foundPractice({ rolls: [CHARRED_AT_ROLL, 2], begun: false });
  const host = await renderScreen();
  expect(dice(host)[0].getAttribute("aria-disabled")).toBe("true");
});

it("shows why the subjects didn't load, and deals once they do", async () => {
  // loadSubjectList rejects once: the error line and Try again; Try again deals two
});

it("names Begin by what it does", async () => {
  const host = await openPracticeSheet();
  expect(beginKey(host).getAttribute("aria-label")).toBe("Begin: start the 30-minute timer");
});
```

(`30` here is `KYOTO_SEIKA_TIME_USED_S / 60` in the test, interpolated.)

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.**
  - `useKyotoSeikaSheet({ userId, dark, keeper })` → `{ list, deal, begun, open(part), roll(balloon), begin(),
close() }`. `open` (a ticket spent in Kyoto Seika Practice Mode landed, or a kept part came back) loads the
    list, deals with `firstDeal` unless the part holds a pair, keeps the dealt words with `keepDealt` and the
    part with `keeper.keepKyotoSeika`; `roll` runs `rollDie` and keeps both; `begin` keeps `begun: true`. A
    failed load is `list.status === "failed"` with its error and `retry`, logged once.
  - `BeginKey`: `Key` with `DrawIcon`, `begin.key`, `aria-label` `begin.label` with the clock's minutes,
    196 px wide, centered at the sheet's foot (46 px up); `nudge()` plays `TimerDot`'s `NUDGE`.
  - `KyotoSeikaDeal`: measures the timer's label (or dot) and Begin's top with a `ResizeObserver` on the
    screen, runs `pairLayout`, and renders `SubjectBalloons`, `BeginKey`, the load failure's `ErrorLine` with
    `balloons.retry`, or nothing while loading. On Begin (`leaving`): the key drops 56 px and fades (220 ms),
    the balloons shrink toward the corner print and fade (360 ms, `EASE_OUT`) while the print fades in
    (200 ms); then `onLeft`. Reduced: one frame.
  - `DrawingScreen.tsx`:

```tsx
const kyotoSeika = useKyotoSeikaSheet({
  userId: me.id,
  dark: me.kyotoSeikaPractice && me.kyotoSeikaDarkSubjects,
  keeper,
});
const dealt = session.phase === "dealt";
// start()'s success keeps the ticket's mode beside its id: ticketKyotoSeika.current = use.kyotoSeikaPractice.
// run(): "keep-session" → keeper.start(ticket.current, ticketKyotoSeika.current ? { subjects: null, rolls: [0, 0], begun: false } : null)
//        then kyotoSeika.open(null) for a ticket spent in Kyoto Seika Practice Mode; "lock-subjects" → kyotoSeika.begin();
//        "reset-sheet" → kyotoSeika.close().
// putBack/carryOver: clock.setLength(sessionMs(part !== null)); kyotoSeika.open(part);
//   send({ type: "restored", drawn: drawn || part?.begun === true, sealSent, dealt: part?.begun === false })
// canvas settings: paused: paused || dealt; shortcuts: enabled: !locked && !dealt
// onBlocked: dealt ? begin.current?.nudge() : timer.current?.showHint()
// TimerDot waitsFor={dealt ? "begin" : "stroke"}; startsLabel picks startsWhenYouPressBegin while dealt
```

    The screen's class gains `is-dealt`; `DrawingScreen.css` hides `.tool-strip, .size-rail,
    .history-buttons` while dealt as `.is-retrying` does (opacity, then visibility), and brings them back
    120 ms after Begin, as after Keep drawing. Once begun, `DrawingCanvas` gets `under={<CornerPrint …/>}`
    and `label` `print.canvas`. `onTimerTap` while dealt shows `startsWhenYouPressBegin`.

- [ ] **Step 4: Run `DrawingScreen.test.tsx` and `kyoto-seika/`; they pass.** Check in Chromium and WebKit at
      360, 390, 430 and 375 × 640, both languages, reduced motion: the pair tightens without text under 11 px,
      a touch on the sheet nudges Begin, Begin tucks and the clock reads 29:59 a second later.
- [ ] **Step 5: Commit:** `feat(frontend): Begin locks the Kyoto Seika Subjects into the sheet's corner and starts the clock`

### Task B14: Sealing sends the pair

**Files:** Modify `api/apiClient.ts:38-53`, `api/httpApi.ts:197-221`, `sticker-creation/DrawingScreen.tsx`
(`cutFromSheet`). Test: `api/httpApi.test.ts` ("sealing"), `sticker-creation/DrawingScreen.test.tsx`.

- [ ] **Step 1: Failing tests.**

```ts
it("sends a sticker's Kyoto Seika Subject pair as JSON, and no such part for a sticker without one", async () => {
  const pair = [
    { ja: "風", reading: "かぜ", en: "wind" },
    { ja: "再会", reading: "さいかい", en: "reunion" },
  ];
  const fetch = answering(201, SEALED);
  await createHttpApi(createServerClient(fetch)).seal({ ...sealRequest, kyotoSeikaSubjects: pair });
  expect(JSON.parse(String(formOf(fetch).get("kyotoSeikaSubjects")))).toEqual(pair);
  const plain = answering(201, SEALED);
  await createHttpApi(createServerClient(plain)).seal(sealRequest);
  expect(formOf(plain).has("kyotoSeikaSubjects")).toBe(false);
});
```

In `DrawingScreen.test.tsx`, turn the `makeSticker` mock into `vi.fn` rejecting by default; one test
resolves a cut sticker for a begun sheet in Kyoto Seika Practice Mode and expects `api.seal`'s request to
carry the pair's `{ ja, reading, en }` only.

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `SealRequest.kyotoSeikaSubjects?: readonly [KyotoSeikaSubject, KyotoSeikaSubject]`
      ("a sticker's pair, which the server requires for a ticket spent in Kyoto Seika Practice Mode and
      refuses for any other");
      `httpApi` adds `...(request.kyotoSeikaSubjects && { kyotoSeikaSubjects: JSON.stringify(request.kyotoSeikaSubjects) })`.
      `cutFromSheet` reads the pair with the ink's copy, as it reads the 18+ switch.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): a sticker drawn in Kyoto Seika Practice Mode seals with its pair`

### Task B15: The timelapse of a sticker drawn in Kyoto Seika Practice Mode plays up to 20 s

**Files:** Modify `sticker-board/timelapse/timelapseSchedule.ts:14-17,78-95`, `timelapsePlayer.ts:23-33,63`,
`useTimelapse.ts:36-45`, `sticker-board/StickerDetail.tsx:189-190`. Test: `timelapseSchedule.test.ts`.

- [ ] **Step 1: Failing tests.** `schedule(ops, reduced, kyotoSeika = false)`; steps of `MAX_POINT_STEP_MS`
      keep the 30-minute stroke's arrays small:

```ts
it.each([
  ["a regular sticker", false, MAX_LENGTH_MS],
  ["a sticker drawn in Kyoto Seika Practice Mode", true, KYOTO_SEIKA_MAX_LENGTH_MS],
])("plays the longest drawing of %s in at most its length", (_, kyotoSeika, length) => {
  const drawnMs = KYOTO_SEIKA_TIME_USED_S * 1000;
  expect(
    schedule([stroke(0, steady(drawnMs, MAX_POINT_STEP_MS))], false, kyotoSeika).length,
  ).toBeCloseTo(length, 6);
});

it("keeps fills' reveals within MAX_FILL_REVEAL_MS in the longer timelapse of a sticker drawn in Kyoto Seika Practice Mode", () => {
  const s = schedule(
    [stroke(0, steady(KYOTO_SEIKA_TIME_USED_S * 1000, MAX_POINT_STEP_MS)), fill(2e6)],
    false,
    true,
  );
  expect(fills(s)[0].end - fills(s)[0].start).toBeLessThanOrEqual(MAX_FILL_REVEAL_MS);
});
```

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** `export const KYOTO_SEIKA_MAX_LENGTH_MS = 20_000;` ("…or this long for a sticker
      drawn in Kyoto Seika Practice Mode, whose clock runs ten times longer");
      `scheduleTimelapse(ops, { reduced, kyotoSeika })` clamps to it; `fillRevealMs` clamps its pace to 1.
      `TimelapsePlayerOptions.kyotoSeika`, `useTimelapse`'s option, and `StickerDetail` passes
      `kyotoSeika: Boolean(loaded?.sticker.kyotoSeikaSubjects)`.
- [ ] **Step 4: Run the timelapse folder's tests; they pass.** Time the fills' preparation on a 30-minute
      drawing with many fills (it gives up after 30 s): spec, Checks during the build.
- [ ] **Step 5: Commit:** `feat(frontend): the timelapse of a sticker drawn in Kyoto Seika Practice Mode plays up to 20 seconds`

### Task B16 (pending sign-off): The upper balloon deals from the evocative tier

Only once the owner signs off (spec decision 22). `subjects-next.tsv`'s `tier` column reads `tier` for the
618 tier subjects and is empty otherwise.

**Files:** Modify `data/scratch/wordlist/to_subjects_json.mjs`, `kyoto-seika/subjects/subjects.json`,
`kyoto-seika/subjectList.ts`, `kyoto-seika/deal.ts`, `kyoto-seika/testSubjects.ts`. Test: `kyoto-seika/deal.test.ts`,
`kyoto-seika/subjectList.test.ts`.

- [ ] **Step 1: Failing tests.**

```ts
it("deals and rolls the upper balloon from the tier, and the lower from any kind but the upper's", () => {
  for (const deal of deals(200, options())) {
    expect(deal.subjects[0].tier).toBe(true);
    expect(deal.subjects[1].kind).not.toBe(deal.subjects[0].kind);
  }
  expect(deals(200, options()).some((d) => !d.subjects[1].tier)).toBe(true);
});
```

and in `subjectList.test.ts`: the tier holds every kind.

- [ ] **Step 2: Run; they fail.**
- [ ] **Step 3: Implement.** The script writes `tier: c[col.tier] === "tier"`; the entry type and guard gain
      `tier: boolean`; the fixture marks one of each kind; `poolFor`
      adds `(balloon === 1 || s.tier)` to its filter and its doc: "the upper balloon only from the evocative
      tier". Each die still re-rolls within its own balloon's pool. Run the script again and commit the JSON.
- [ ] **Step 4: Run; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the upper balloon deals from the subjects that most suggest a manga page`

### Task B17: Check the part

- [ ] `pnpm check` passes. Then the spec's checks for this part, in Chromium and WebKit: the balloons at 360,
      390, 430 and 375 × 640 in both languages with reduced motion on and off; Japanese in the English app
      falling back to Hiragino Sans; a 30-minute drawing's kept session size and undo history with the
      performance recorder; a real 30-minute timelapse's gzipped size against the 2 MB cap.

---

## Part C: the foil, the detail's mark, ten stubs, Settings, Sources and docs

Depends on Part A (the `kyotoSeikaSubjects` field on every sticker, the `me` switches and
`POST /api/me/kyoto-seika-practice`) and on the Settings-without-restart plan (the note's `save` path).
Paths are under `apps/frontend/src/` unless they start with `apps/`, `DESIGN.md`, `PRODUCT.md` or
`AGENTS.MD`. Run tests with `pnpm --filter frontend exec vitest run <files>`.

### Task C1: Stickers carry whether they were drawn in Kyoto Seika Practice Mode

**Files:** Modify `api/views.ts:20-67`, `sticker-board/boardSticker.ts:8-23,55-82`,
`sticker-board/StickerBoard.tsx:218-229`, `sticker-board/tray/trayModel.ts:14-31`,
`sticker-board/tray/StickerTray.tsx:42-61`, `api/testFixtures.ts`, `sticker-board/testBoardSticker.ts`.
Test: `api/views.test.ts` (create if absent).

- [ ] **Step 1: Failing test.**

```ts
import { toSticker } from "./views";
import { sticker } from "./testFixtures";

describe("toSticker", () => {
  it("carries a sticker's Kyoto Seika Subject pair, and none for a sticker without one", () => {
    const pair = [
      { ja: "風", reading: "かぜ", en: "wind" },
      { ja: "再会", reading: "さいかい", en: "reunion" },
    ] as const;
    expect(toSticker(sticker({ kyotoSeikaSubjects: [...pair] })).kyotoSeikaSubjects).toEqual(pair);
    expect(toSticker(sticker()).kyotoSeikaSubjects).toBeNull();
  });
});
```

- [ ] **Step 2: Run it; it fails** (`kyotoSeikaSubjects` is undefined).
- [ ] **Step 3: Implement.**
  - `StickerView` gains `/** A sticker's Kyoto Seika Subject pair, fixed at seal; null unless drawn in
Kyoto Seika Practice Mode. */
kyotoSeikaSubjects: Sticker["kyotoSeikaSubjects"];`, filled by `toSticker`.
  - `BoardSticker` gains the same field; `toBoardSticker` and `viewOf` copy it.
  - `TraySticker` gains `/** Drawn in Kyoto Seika Practice Mode: it wears that foil, whoever drew it. */
kyotoSeika: boolean;`, set in `trayStickers` as `s.kyotoSeikaSubjects !== null`.
  - The fixtures default it to `null`.
- [ ] **Step 4: Run `api/`, `sticker-board/` and `sticker-board/tray/`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): stickers carry their Kyoto Seika pair from the API`

### Task C2: The Kyoto Seika Practice Mode foil

**Files:** Modify `stickers/StickerFoil.tsx:6-9`, `stickers/StickerFigure.tsx:11-35,60,89`,
`stickers/sticker-foil.css`, `sticker-board/tray/traySheets.ts:156-175`, and the figure's call sites:
`sticker-board/PlacedSticker.tsx:131-143`, `sticker-board/StickerDetail.tsx:295-303`,
`sticker-board/ArtistBoard.tsx:92-99`, `explore/LiftedSticker.tsx:172-180`,
`receiving/ReceiveGiftDialog.tsx:343-350`. Test: `stickers/StickerFigure.test.tsx` (create),
`sticker-board/tray/StickerTray.test.tsx`.

- [ ] **Step 1: Failing tests.**

```tsx
import { render } from "../test/render"; // the project's DOM render helper, as ArtistChip.test.tsx uses
import { StickerFigure } from "./StickerFigure";

const urls = { png: "p.webp", mask: "m.webp", spec: "s.webp", rim: "r.webp", foil: "f.webp" };
const foilOf = (host: HTMLElement) => host.querySelector(".sticker-foil")?.className ?? "";

describe("StickerFigure's foil", () => {
  it("wears the Kyoto Seika Practice Mode foil on a sticker drawn in the mode, whoever drew it", () => {
    expect(
      foilOf(render(<StickerFigure urls={urls} width={10} height={10} kyotoSeika />)),
    ).toContain("sticker-foil--kyoto-seika");
  });
  it("wears pink on an 18+ sticker drawn in Kyoto Seika Practice Mode", () => {
    const host = render(<StickerFigure urls={urls} width={10} height={10} kyotoSeika nsfw />);
    expect(foilOf(host)).toContain("sticker-foil--pink");
  });
  it("wears holo on another artist's ordinary sticker, and nothing on your own", () => {
    expect(
      foilOf(render(<StickerFigure urls={urls} width={10} height={10} foil="board" />)),
    ).toContain("sticker-foil--holo");
    expect(foilOf(render(<StickerFigure urls={urls} width={10} height={10} />))).toBe("");
  });
});
```

In `StickerTray.test.tsx`, add a sticker of your own drawn in Kyoto Seika Practice Mode to the board and
expect its slot's `.sticker-foil` to carry `sticker-foil--sheet sticker-foil--kyoto-seika`.

- [ ] **Step 2: Run both; they fail.**
- [ ] **Step 3: Implement.**

```ts
// StickerFoil.tsx
/**
 * Holo, for a sticker someone other than the board's owner drew; pink, for an NSFW sticker; Kyoto
 * Seika, for a sticker drawn in Kyoto Seika Manga Expression Practice Mode.
 */
type FoilTone = "holo" | "pink" | "kyoto-seika";
```

```tsx
// StickerFigure.tsx: the prop, and the one choice of tone. Pink protects people, so it wins.
/** Drawn in Kyoto Seika Manga Expression Practice Mode: that foil, whoever drew it, at `foil`'s size or the board's. */
kyotoSeika?: boolean;
// …
const marked = nsfw || kyotoSeika;
const foilSize = foil ?? (marked ? "board" : undefined);
const tone = nsfw ? "pink" : kyotoSeika ? "kyoto-seika" : "holo";
```

Each call site passes `kyotoSeika={sticker.kyotoSeikaSubjects !== null}`. `traySheets.ts`:
`if (s.gift || s.nsfw || s.kyotoSeika)` and the class
`sticker-foil--${s.nsfw ? "pink" : s.kyotoSeika ? "kyoto-seika" : "holo"}`.

`sticker-foil.css`, after the pink tone (the sparkle tile is an inline SVG of five four-point crosses on a
60 px tile, white to pale blue, built in the prototype at
`.claude/worktrees/seika-exam/data/scratch/mockups/foil-tone.css`; copy its data URI):

```css
/* Kyoto Seika Practice Mode foil: manga tone. A dot screen over a gradient that darkens away from the
   app's one light; contrast() turns the blurred dots into crisp ones that grow toward the shadow.
   The shading turns with the light, and white sparkles scraped out of the tone slide with it. The
   tone itself doesn't move, so it's painted only when the light does. */
.sticker-foil--kyoto-seika {
  --band-6: #fbfbfd;
}

.sticker-foil--kyoto-seika .sticker-foil__sheen {
  inset: -30%;
  rotate: 45deg;
  animation: none;
  background:
    radial-gradient(closest-side, #000, #fff) 0 0 / 3.2px 3.2px,
    linear-gradient(
      calc(atan2(calc(-1 * var(--lx, -0.6)), var(--ly, -0.6)) - 45deg - var(--foil-turn, 0) * 1deg),
      #fff 18%,
      #4d4d4d 100%
    );
  background-blend-mode: multiply;
  filter: contrast(16);
}

/* The sparkles scraped out of the tone, in place of the holo's grating. */
.sticker-foil--kyoto-seika .sticker-foil__band::after {
  inset: -40px;
  background: var(--kyoto-seika-sparkles) 0 0 / 60px 60px;
  translate: calc(var(--lx, -0.6) * 18px) calc(var(--ly, -0.6) * 18px);
  transition: translate 280ms var(--ease-out);
  filter: drop-shadow(0 0 0.6px rgba(150, 200, 255, 0.9));
}

@media (prefers-reduced-motion: reduce) {
  .sticker-foil--kyoto-seika .sticker-foil__band::after {
    transition: none;
  }
}
```

`--kyoto-seika-sparkles` goes in `styles/tokens.css` beside the other foil tokens, with its one-line
comment.

- [ ] **Step 4: Run both test files; they pass.**
- [ ] **Step 5: Check it by eye** on the dev server: a sticker drawn in Kyoto Seika Practice Mode on your
      board, on someone else's and in the detail; tilt (Playwright's pointer moves the light): the open side
      of the tone faces the pointer, and the sparkles slide. Then the tray's 3 px band.
- [ ] **Step 6: Commit:** `feat(frontend): the Kyoto Seika Practice Mode foil, manga tone that turns with the light`

### Task C3: The mark beside Timelapse

**Files:** Create `kyoto-seika/KyotoSeikaMark.tsx`, `kyoto-seika/kyoto-seika-mark.css`. Modify
`sticker-board/StickerDetail.tsx:346-399`, `i18n/strings/kyotoSeika.ts` (created in Part B).
Test: `sticker-board/StickerDetail.test.tsx`.

- [ ] **Step 1: Failing test.**

```tsx
it("marks a sticker drawn in Kyoto Seika Practice Mode, with its pair and their readings, beside Timelapse", async () => {
  const pair = [
    { ja: "風", reading: "かぜ", en: "wind" },
    { ja: "再会", reading: "さいかい", en: "reunion" },
  ];
  const host = await openDetail(boardSticker({ sticker: sticker({ kyotoSeikaSubjects: pair }) }));
  const mark = host.querySelector(".kyoto-seika-mark");
  expect(mark?.textContent).toContain(kyotoSeika.mark.tag.en);
  expect([...(mark?.querySelectorAll("rt") ?? [])].map((rt) => rt.textContent)).toEqual([
    "かぜ",
    "さいかい",
  ]);
  expect(mark?.querySelector(".visually-hidden")?.textContent).toBe(
    i18next.t(($) => $.kyotoSeika.mark.spoken, { first: "風", second: "再会" }),
  );
});

it("shows no mark on an ordinary sticker", async () => {
  expect((await openDetail(boardSticker())).querySelector(".kyoto-seika-mark")).toBeNull();
});
```

(`openDetail` is the file's existing helper, or the render it uses.)

- [ ] **Step 2: Run; both fail.**
- [ ] **Step 3: Implement.**

```tsx
// KyotoSeikaMark.tsx
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useTranslation } from "../i18n/react";
import { SubjectWord } from "./SubjectWord"; // Part B's ruby word: group ruby over kanji, plain kana otherwise
import "./kyoto-seika-mark.css";

/**
 * The mark on the detail of a sticker drawn in Kyoto Seika Practice Mode, beside Timelapse: an ink
 * label-tape tag with a tone swatch like its foil, and the pair it was drawn from, with their readings.
 */
export function KyotoSeikaMark({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  const { t } = useTranslation();
  const [first, second] = subjects;
  return (
    <p className="kyoto-seika-mark">
      <span className="kyoto-seika-mark__tag" aria-hidden="true">
        {t(($) => $.kyotoSeika.mark.tag)}
      </span>
      <span className="kyoto-seika-mark__pair" lang="ja" aria-hidden="true">
        <SubjectWord subject={first} />
        <i>×</i>
        <SubjectWord subject={second} />
      </span>
      <span className="visually-hidden">
        {t(($) => $.kyotoSeika.mark.spoken, { first: first.ja, second: second.ja })}
      </span>
    </p>
  );
}
```

```css
/* kyoto-seika-mark.css: the tag is label tape at the house tilt, its swatch the foil's tone. */
.kyoto-seika-mark {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 12px 0 2px;
}
.kyoto-seika-mark__tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px 0 26px;
  background: var(--ink);
  color: var(--liner);
  font: 800 var(--fs-fine) / 1 var(--font-ui);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-stretch: var(--w-fine);
  rotate: -2deg;
  box-shadow: var(--shadow-label);
  clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%);
}
.kyoto-seika-mark__tag:lang(ja) {
  font-family: var(--font-jp);
  letter-spacing: 0.1em;
  text-transform: none;
}
.kyoto-seika-mark__tag::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 5px;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background:
    radial-gradient(closest-side, var(--ink) 46%, transparent 52%) 0 0 / 3.4px 3.4px,
    var(--canvas);
}
.kyoto-seika-mark__pair {
  font: 800 20px/1 var(--font-jp);
  color: var(--ink);
  font-feature-settings: "palt";
  white-space: nowrap;
}
.kyoto-seika-mark__pair rt {
  font: 700 var(--fs-fine) / 1 var(--font-jp);
  color: var(--graphite);
  letter-spacing: 0.06em;
}
.kyoto-seika-mark__pair i {
  font: 500 15px/1 var(--font-ui);
  font-style: normal;
  color: var(--graphite);
  margin: 0 6px;
}
```

In `StickerDetail.tsx`, after the first fine print: `{sticker.kyotoSeikaSubjects && <KyotoSeikaMark
subjects={sticker.kyotoSeikaSubjects} />}`. Strings in `kyotoSeika.ts` under `mark`:

```ts
/** The mark on the detail of a sticker drawn in Kyoto Seika Practice Mode. */
mark: {
  /** Sticker detail of a sticker drawn in Kyoto Seika Practice Mode: the ink tag beside Timelapse */
  tag: { en: "Entrance exam practice", ja: "入試練習" },
  /** Sticker detail of a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for the tag and the pair, such as "風 and 再会" */
  spoken: {
    en: "Entrance exam practice. Subjects: {{first}} and {{second}}.",
    ja: "入試練習。題材：{{first}}と{{second}}。",
  },
},
```

- [ ] **Step 4: Run `StickerDetail.test.tsx`; it passes.**
- [ ] **Step 5: Commit:** `feat(frontend): the detail of a sticker drawn in Kyoto Seika Practice Mode shows its mark and pair beside Timelapse`

### Task C4: Ten daily stubs, in rows of five

**Files:** Modify `tickets/TicketStubs.tsx:21,59-92,180-205`, `tickets/TicketStubs.css`,
`tickets/TicketArt.tsx:32-40`. Test: `tickets/ticketCards.test.tsx`.

- [ ] **Step 1: Failing test.**

```tsx
it("lays a ten-ticket day's stubs in rows of five, at a size the card holds", () => {
  const ten = ticketsWith({ dailyPerDay: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY, dailyLeft: 4 });
  const host = renderCard(<OutOfTickets tickets={ten} {...cardProps} />); // the file's existing render
  const art = host.querySelector(".out-of-tickets__art");
  expect(art?.classList.contains("ticket-stubs--rows")).toBe(true);
  expect(art?.classList.contains("ticket-stubs--medium")).toBe(true);
  expect(art?.querySelectorAll(".ticket-stub")).toHaveLength(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY);
});

it("keeps a three-ticket day's stubs large, in one row", () => {
  const host = renderCard(<OutOfTickets tickets={ticketsWith({ dailyLeft: 0 })} {...cardProps} />);
  expect(
    host.querySelector(".out-of-tickets__art.ticket-stubs--large:not(.ticket-stubs--rows)"),
  ).not.toBeNull();
});
```

- [ ] **Step 2: Run; both fail.**
- [ ] **Step 3: Implement.**
  - `Size` gains `"medium"`, with geometry scaled from `large` to fit five across a card on a 360 px
    phone: `{ w: 52, h: 33, corner: 3.5, notch: 5, perf: 15.5, outline: { x: 19, y: 4, w: 27, h: 25 },
glyph: 13, edge: 1.5, star: 12 }`.
  - `TicketStubs` adds `ticket-stubs--rows` when `stubs.length > 3`.
  - `TicketArt` uses `size={view.stubs.length > 3 ? "medium" : "large"}`.

```css
/* A ten-ticket day's stubs: rows of five, like a strip of 回数券. Tossed tilts stay with the large stubs. */
.ticket-stubs--rows {
  display: grid;
  grid-template-columns: repeat(5, auto);
  justify-content: center;
  gap: 6px;
}

.ticket-stubs--medium.ticket-stubs--rows {
  gap: 8px 6px;
}
```

- [ ] **Step 4: Run `tickets/`; it passes.**
- [ ] **Step 5: Commit:** `feat(frontend): a ten-ticket day's stubs sit in rows of five on every ticket card`

### Task C5: The sealed sticker lands in its slot when the card grows

The ceremony measures the slot once, as the card arrives (`SealCeremony.tsx:173-190`), and the card
grows upward from its foot. Ten stubs in two rows, or tickets that load late, move the slot after it was
measured, and the sticker lands over "Sealed".

**Files:** Create `sticker-creation/sealing/slotTracker.ts`. Modify
`sticker-creation/sealing/SealCeremony.tsx:173-190`. Test: `sticker-creation/sealing/slotTracker.test.ts`.

- [ ] **Step 1: Failing test.**

```ts
import { trackSlot } from "./slotTracker";

/** A card whose layout the test sets, and a resize the test fires, as a ResizeObserver would. */
function fakeCard() {
  let fire = () => {};
  const layout = { cardTop: 400, slotTop: 18 };
  const observe = (_el: Element, onResize: () => void) => {
    fire = onResize;
    return () => {};
  };
  const read = () => ({ x: 14, y: layout.cardTop + layout.slotTop, w: 362, h: 208 });
  return { layout, observe, read, resize: () => fire() };
}

describe("trackSlot", () => {
  it("measures the slot again once the card has changed size", () => {
    const card = fakeCard();
    const slot = trackSlot(card.read, (onResize) => card.observe(document.body, onResize));
    expect(slot.box().y).toBe(418);
    card.layout.cardTop = 369; // a second row of stubs grew the card upward
    expect(slot.box().y).toBe(418); // measured once while nothing changes
    card.resize();
    expect(slot.box().y).toBe(387);
  });
});
```

- [ ] **Step 2: Run it; it fails** (no module).
- [ ] **Step 3: Implement.**

```ts
// slotTracker.ts
import type { Box } from "./sealTimeline";

/**
 * Where the sealed card's slot is, measured once and again whenever the card changes size: the card
 * grows upward from its foot, so a late ticket row moves the slot after the flight has started.
 */
export function trackSlot(read: () => Box, observe: (onResize: () => void) => () => void) {
  let box: Box | null = null;
  const stop = observe(() => (box = null));
  return {
    box: (): Box => (box ??= read()),
    stop,
  };
}
```

In `SealCeremony.tsx`, `cardReady` builds the tracker once the card exists, with `read` returning
`{ x: c.offsetLeft + s.offsetLeft, y: c.offsetTop + s.offsetTop, w: s.offsetWidth, h: s.offsetHeight }`
and `observe` wrapping a `ResizeObserver` on the card. Each frame of the flight computes
`flight(box, body, tracker.box())` in place of the cached `path`, and the effect's cleanup calls
`tracker.stop()`.

- [ ] **Step 4: Run `sticker-creation/sealing/`; it passes.**
- [ ] **Step 5: Check it by eye:** a day with ten tickets, seal: the sticker lands in its slot above
      "Sealed", in Chromium and WebKit.
- [ ] **Step 6: Commit:** `fix(frontend): the sealed sticker lands in its slot when the card grows under it`

### Task C6: The Kyoto Seika Practice Mode switches on the Settings note, with a censor-bar name

Builds on the Settings-without-restart plan's `save(setting, to, request, apply)` in `SettingsNote.tsx`.

**Files:** Create `kyoto-seika/CensorBar.tsx`, `kyoto-seika/censor-bar.css`. Modify
`api/apiClient.ts`, `api/httpApi.ts`, `sticker-board/stat-board/SettingsNote.tsx`,
`sticker-board/stat-board/settings-note.css`, `i18n/strings/stickerBoard.ts` (settings),
`i18n/strings/pages.ts`. Create `apps/frontend/public/sources.html`, `apps/frontend/public/ja/sources.html`.
Test: `sticker-board/stat-board/SettingsNote.test.tsx`, `kyoto-seika/CensorBar.test.tsx`.

- [ ] **Step 1: Failing tests.**

```tsx
// SettingsNote.test.tsx
it("turns Kyoto Seika Practice Mode on in place: it saves, your tickets reload, and the dark subjects switch shows", async () => {
  const setKyotoSeikaPractice = vi.fn<ApiClient["setKyotoSeikaPractice"]>((change) =>
    Promise.resolve({ ...TEST_ME, kyotoSeikaPractice: true, ...change }),
  );
  const tickets = vi.fn<ApiClient["tickets"]>(() => Promise.resolve(TEST_TICKETS));
  const view = renderNote({ setKyotoSeikaPractice, tickets });
  expect(view.host.querySelector('[data-setting="kyoto-seika-dark"]')).toBeNull();
  await act(async () => practiceSwitch(view.host).click());
  expect(setKyotoSeikaPractice).toHaveBeenCalledExactlyOnceWith({ kyotoSeikaPractice: true });
  expect(practiceSwitch(view.host).checked).toBe(true);
  expect(tickets).toHaveBeenCalledTimes(2);
  expect(view.host.querySelector('[data-setting="kyoto-seika-dark"] input')).not.toBeNull();
});

it("names the mode for screen readers without its censor bar", () => {
  const view = renderNote({});
  expect(practiceSwitch(view.host).getAttribute("aria-label")).toBe(
    stickerBoard.settings.kyotoSeika.spokenName.en,
  );
});
```

```tsx
// CensorBar.test.tsx
it("shows why the name is blacked out when it's tapped, and doesn't let the tap through", async () => {
  const outer = vi.fn();
  const host = render(
    <label onClick={outer}>
      <CensorBar hidden="Seika" />
    </label>,
  );
  await act(async () => host.querySelector<HTMLElement>(".censor-bar")?.click());
  expect(host.querySelector(".censor-bar__why")?.textContent).toBe(kyotoSeika.censor.why.en);
  expect(outer).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run both; they fail.**
- [ ] **Step 3: Implement.**
  - `apiClient.ts`: `setKyotoSeikaPractice: (change: { kyotoSeikaPractice?: boolean;
kyotoSeikaDarkSubjects?: boolean }) => Promise<Me>`, documented as `POST /api/me/kyoto-seika-practice`;
    `httpApi.ts` posts it and throws a refusal on a non-2xx, as `setNsfwOptIn` does.
  - `SettingsNote.tsx`: `Setting` gains `"kyotoSeika" | "kyotoSeikaDark"`; `Shown` gains
    `kyotoSeikaPractice` and `kyotoSeikaDarkSubjects`. The new fieldset sits under 18+:

```tsx
const { refresh: refreshTickets } = useTickets();
const switchPractice = (kyotoSeikaPractice: boolean) =>
  save(
    "kyotoSeika",
    { kyotoSeikaPractice },
    () => api.setKyotoSeikaPractice({ kyotoSeikaPractice }),
    () => {
      // The day's allowance follows the mode at the next spend, so the Draw key's ticket shows it now.
      refreshTickets();
      return null;
    },
  );
const switchDark = (kyotoSeikaDarkSubjects: boolean) =>
  save(
    "kyotoSeikaDark",
    { kyotoSeikaDarkSubjects },
    () => api.setKyotoSeikaPractice({ kyotoSeikaDarkSubjects }),
    () => null,
  );
```

```tsx
<fieldset
  className="settings-note__setting"
  data-setting="kyoto-seika"
  aria-busy={saving("kyotoSeika")}
>
  <legend className="fine settings-note__legend">
    {t(($) => $.stickerBoard.settings.kyotoSeika.title)}
  </legend>
  <label className="settings-note__option settings-note__switch">
    <span>
      <Trans
        i18nKey={($) => $.stickerBoard.settings.kyotoSeika.name}
        components={{
          bar: <CensorBar hidden={t(($) => $.stickerBoard.settings.kyotoSeika.hidden)} />,
        }}
      />
    </span>
    <input
      type="checkbox"
      role="switch"
      checked={shown.kyotoSeikaPractice}
      aria-label={t(($) => $.stickerBoard.settings.kyotoSeika.spokenName)}
      aria-describedby={`${id}-practice-about`}
      onChange={() => void switchPractice(!shown.kyotoSeikaPractice)}
    />
  </label>
  <p className="fine settings-note__about" id={`${id}-practice-about`}>
    {t(($) => $.stickerBoard.settings.kyotoSeika.about, {
      minutes: KYOTO_SEIKA_TIME_USED_S / 60,
      tickets: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
    })}
  </p>
  <p className="fine settings-note__credit">
    <Trans
      i18nKey={($) => $.stickerBoard.settings.kyotoSeika.credit}
      components={{
        sources: <a href={t(($) => $.pages.sources)} target="_blank" rel="noreferrer" />,
      }}
    />
  </p>
  <p className="fine settings-note__status" role="status">
    {statusLine("kyotoSeika")}
  </p>
  {problem("kyotoSeika")}
  {shown.kyotoSeikaPractice && (
    <div
      className="settings-note__nested"
      data-setting="kyoto-seika-dark"
      aria-busy={saving("kyotoSeikaDark")}
    >
      <label className="settings-note__option settings-note__switch">
        <span>{t(($) => $.stickerBoard.settings.kyotoSeika.dark.label)}</span>
        <input
          type="checkbox"
          role="switch"
          checked={shown.kyotoSeikaDarkSubjects}
          aria-describedby={`${id}-dark-about`}
          onChange={() => void switchDark(!shown.kyotoSeikaDarkSubjects)}
        />
      </label>
      <p className="fine settings-note__about" id={`${id}-dark-about`}>
        {t(($) => $.stickerBoard.settings.kyotoSeika.dark.about)}
      </p>
      {problem("kyotoSeikaDark")}
    </div>
  )}
</fieldset>
```

`statusLine` gains: `kyotoSeika` → `shown.kyotoSeikaPractice ? settings.kyotoSeika.on : settings.kyotoSeika.off`.

```tsx
// CensorBar.tsx
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import "./censor-bar.css";

/** How long the label under a tapped bar stays before it peels off. */
const WHY_MS = 2400;

/**
 * A word blacked out with an ink bar, like a manga's censor bar (伏せ字). A tap lifts the bar's corner and
 * peels on a label saying why, without passing the tap to the switch whose name it's in. Decorative to
 * screen readers: the switch carries a spoken name of its own.
 */
export function CensorBar({ hidden }: { hidden: string }) {
  const { t } = useTranslation();
  const [why, setWhy] = useState(false);
  return (
    <span
      className={`censor-bar${why ? " is-lifted" : ""}`}
      aria-hidden="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setWhy(true);
        setTimeout(() => setWhy(false), WHY_MS);
      }}
    >
      <span className="censor-bar__word">{hidden}</span>
      {why && <span className="censor-bar__why">{t(($) => $.kyotoSeika.censor.why)}</span>}
    </span>
  );
}
```

```css
/* censor-bar.css: the hidden word keeps its width under a hand-inked bar; a tap lifts its corner and a
   white label peels on beneath it. */
.censor-bar {
  position: relative;
  display: inline-block;
  margin: 0 0.12em;
  cursor: pointer;
}
.censor-bar__word {
  color: transparent;
}
.censor-bar::before {
  content: "";
  position: absolute;
  inset: 0.08em -0.12em 0.02em;
  background: var(--ink);
  border-radius: 2px 5px 3px 6px / 6px 3px 5px 2px;
  rotate: -1.5deg;
  transition:
    rotate var(--t-stick) var(--ease-peel),
    translate var(--t-stick) var(--ease-peel);
}
.censor-bar.is-lifted::before {
  rotate: -7deg;
  translate: 0 -2px;
}
.censor-bar__why {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  z-index: 1;
  white-space: nowrap;
  padding: 3px 7px 3px 6px;
  background: var(--canvas);
  color: var(--ink);
  font: 700 var(--fs-fine) / 1.2 var(--font-ui);
  border-radius: 3px;
  box-shadow:
    0 0 0 1px var(--rule-strong),
    var(--shadow-label);
  rotate: -2deg;
  animation: censor-bar-peel var(--t-peel) var(--ease-peel);
}
@keyframes censor-bar-peel {
  from {
    opacity: 0;
    translate: 0 -4px;
    rotate: -8deg;
  }
}
@media (prefers-reduced-motion: reduce) {
  .censor-bar::before {
    transition: none;
  }
  .censor-bar__why {
    animation: none;
  }
}
```

`settings-note.css`: `.settings-note__nested { margin: 10px 0 0; padding-left: 14px; border-left: 2px solid var(--rule); }`
and `.settings-note__credit a { color: inherit; }`.

- **Strings,** `stickerBoard.ts` under `settings` (each with its `/** where */` comment, as below):

```ts
/** Kyoto Seika Manga Expression Practice Mode, on the Settings note. */
kyotoSeika: {
  /** Settings note: the legend over Kyoto Seika Practice Mode's switch */
  title: { en: "Entrance exam", ja: "入試" },
  /** Settings note: Kyoto Seika Practice Mode's switch, its university blacked out by <bar/> */
  name: { en: "Kyoto <bar/> University Entrance Exam Mode", ja: "京都<bar/>大学<wbr/>入試モード" },
  /** Settings note: the word under the censor bar in Kyoto Seika Practice Mode's name, never shown */
  hidden: { en: "Seika", ja: "精華" },
  /** Settings note: what screen readers hear as the name of Kyoto Seika Practice Mode's switch, with no censor bar */
  spokenName: {
    en: "A famous art university in Kyoto: entrance exam mode",
    ja: "京都の有名な美術大学 入試モード",
  },
  /** Settings note: the line under Kyoto Seika Practice Mode's switch */
  about: {
    en: "Practice for the manga expression test: a {{minutes}}‑minute timer, {{tickets}} daily tickets a day, and two subjects to combine.",
    ja: "マンガ表現の練習に。タイマー{{minutes}}分、無償チケット1日{{tickets}}枚、題材を2つ組み合わせてかきます。",
  },
  /** Settings note: the credit under Kyoto Seika Practice Mode's switch, linking the subject list's sources */
  credit: { en: "Subjects from JMdict, WordNet and Wiktionary. <sources>Sources</sources>", ja: "題材：JMdict、WordNet、ウィクショナリー　<sources>出典</sources>" },
  /** Settings note: the status line once Kyoto Seika Practice Mode is on */
  on: { en: "Practice mode is on: your next sheet deals two subjects.", ja: "練習モードをオンにしました。次のキャンバスから題材が出ます。" },
  /** Settings note: the status line once Kyoto Seika Practice Mode is off */
  off: { en: "Practice mode is off.", ja: "練習モードをオフにしました。" },
  /** Settings note, under Kyoto Seika Practice Mode's switch while it's on */
  dark: {
    /** Settings note: the switch that also deals dark subjects */
    label: { en: "Dark subjects too", ja: "重い題材も出す" },
    /** Settings note: the line under the dark subjects switch */
    about: { en: "Death, war, crime, alcohol and tobacco.", ja: "死、戦争、犯罪、お酒、たばこなど。" },
  },
  /** Settings note: when a Kyoto Seika Practice Mode switch didn't save, before the reason */
  notSaved: { en: "Couldn’t save it: {{reason}}", ja: "保存できませんでした：{{reason}}" },
},
```

`kyotoSeika.ts` under `censor`: `/** Settings note: the label that peels on under the censor bar in Kyoto Seika Practice Mode's name when it's tapped */
  why: { en: "Redacted for grown-up reasons", ja: "大人の事情により伏せています" }`.

`pages.ts`: `/** Settings note, Kyoto Seika Practice Mode: where the credit's Sources link goes, opened in LINE's in-app browser */
  sources: { en: "/sources.html", ja: "/ja/sources.html" }`.

- **`sources.html`** and its Japanese copy, styled like `terms.html`: the subject list's sources and
  licences, each with its link and the notice its licence asks for: JMdict and KANJIDIC2 (EDRDG,
  CC BY-SA 4.0, https://www.edrdg.org/edrdg/licence.html); Japanese WordNet 1.1 (NICT's copyright notice
  and disclaimer, verbatim from https://bond-lab.github.io/wnja/license.txt); Princeton WordNet 3.0 (its
  licence text, verbatim); the JLPT lists (Jonathan Waller, http://www.tanos.co.uk/jlpt/, and
  stephenmk's yomitan-jlpt-vocab); Japanese Wiktionary through kaikki.org (CC BY-SA 4.0); and that the
  list itself is shared under CC BY-SA 4.0.

- [ ] **Step 4: Run `stat-board/` and `kyoto-seika/CensorBar.test.tsx`; they pass. Run `pnpm --filter frontend i18n:export /tmp/strings.csv` to check the catalog's comments.**
- [ ] **Step 5: Check it by eye** in both languages: the bar, a tap on it (the label, and the switch
      unchanged), the switch on (the Draw key's ticket reads ×10), the dark switch.
- [ ] **Step 6: Commit:** `feat(frontend): Kyoto Seika Practice Mode's switches on the Settings note, its name behind a censor bar, and the subject list's sources`

### Task C7: Docs (vocabulary pending sign-off)

**Files:** `AGENTS.MD`, `PRODUCT.md`, `DESIGN.md`, `apps/frontend/src/i18n/glossary.md`.

- [ ] **AGENTS.MD vocabulary** (the owner approves entries): Kyoto Seika Manga Expression Practice Mode;
      Kyoto Seika Subject (題材); Kyoto Seika Practice Mode foil. Daily ticket: "Three a day, ten in
      Kyoto Seika Manga Expression Practice Mode". The NSFW sticker and Pink foil entries say pink wins
      over the Kyoto Seika Practice Mode foil.
- [ ] **PRODUCT.md:** Operating Context gains the mode (Settings, the deal, Begin, 30 minutes, ten
      tickets, the pair kept on the sticker); Capabilities gains the foil rule; Settings lists the switches.
- [ ] **DESIGN.md:**
  - Colors: Non-repro blue (#8CC8E8), a material color: manuscript paper's print, used only by the
    corner note.
  - Named Rules: the Other Hand Rule's two exceptions, pink foil and the Kyoto Seika Practice Mode foil,
    each worn whoever drew the sticker, pink first.
  - Draw screen: the deal (balloons, dice, Begin), the easter egg, the corner note, the 56 px dot.
  - Tickets: a ten-ticket day's rows of five.
  - Settings and the sticker detail: the censor-bar name, the mark beside Timelapse.
- [ ] **glossary.md:** 題材 (subject), はじめ (Begin), 伏せ字 (the censor bar), if Part B hasn't added
      them.
- [ ] **Commit:** `docs: Kyoto Seika Manga Expression Practice Mode in AGENTS.MD, PRODUCT.md and DESIGN.md`
