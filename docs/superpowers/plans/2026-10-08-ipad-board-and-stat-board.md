# iPad Board, Tray and Stat Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** written 2026-10-08; waiting on ad0ll's answers to the decisions marked **Open**. Replaces `2026-10-07-ipad-board.md`.

**Goal:** On a large screen, stickers keep their phone size on a large layout of the board's own, stored beside the phone's; Draw stands in the tab row, the header is one row, the sticker tray grows into its pouch, and the stat board is one centered cluster. Phones are unchanged.

**Architecture:** `sticker_placements` gains the large layout's six columns. The API saves either layout or both on a sticker, and a derived large layout in one request that writes only where nothing is saved. The app holds each sticker's spots by layout (`placements`), shows the layout its screen's size class picks (`shownIn`), derives the large layout from the phone's the first time a large screen shows your board (`largeLayout.ts`), and saves each move to the layout on screen. `useBoardGestures` stays layout-blind: it moves the placement shown, at the board's unit. The rest ports the draft on `spike/ipad-board`.

**Tech Stack:** Drizzle on SQLite, Hono + zod, React 19 + TypeScript, vitest + happy-dom, CSS, Playwright (WebKit and Chromium).

**Sources:** `docs/superpowers/specs/2026-10-08-ipad-design-brief.md`, section "Board, tray and stat board". Draft: branch `spike/ipad-board`, never merged; `git show <sha> -- <paths>` works from any worktree of this repo while that branch exists.

---

## Decisions

**Open** marks one the brief leaves open, for ad0ll.

1. **Storage.** Six columns on `sticker_placements`, after `updated_at`: `large_on_board`, `large_x`, `large_y`, `large_scale`, `large_rotation`, `large_z`, with the CHECK `sticker_placements_large_placement` (whole or none, the phone's ranges). One row per sticker keeps `seen_at` and the tray's order (`created_at`) in one place. The API sends `largePlacement` beside `placement`.
2. **A layout is a whole arrangement:** spot, size, turn, stacking, and on the board or in the tray. Remove on an iPad leaves the sticker on the phone's board. **Open:** on/off per layout (the alternative: one on/off for both, only the geometry separate).
3. **Derived once.** The first time a large screen shows your board from a load of its own, every sticker you hold gets a large spot: the phone's arrangement at the stickers' own size, centered on the large board's field, fitted to a side too short for it. The phone's layout is read against the 390×651 board of DESIGN.md's iPhone in LINE (844 less its 47px status bar, LINE's 56px header and the 90px tab strip: derived, not measured on a device). `POST /api/sticker-boards/me/large-layout` writes a spot only where none is saved, so a large layout another device saved first stays; the board on screen keeps its own derivation until its next load. **Open:** centered both ways (the alternative: top-aligned under the header, as on a phone).
4. **A new sticker lands on both.** A sticker with no phone spot lands on top in the phone's layout and, once the board has a large layout, in the large one, saved in one request. A sticker you hold that the large layout is missing (received back, a failed save) gets a free large spot, on the board or in the tray as on the phone. A sticker you gave gets none.
5. **Visitors** get every sticker on the owner's board in either layout, with both spots, and see the layout for their own size class. With no large layout saved, a large screen derives it as in 3, without saving.
6. **The unit.** In the large layout a sticker's size is a share of the phone board's width, 390px, on every large screen either way up. **Open:** the draft used 0.56 × the board's short side, kept to 360–460px, which grows stickers a quarter as an 11-inch iPad in Safari turns upright (371 → 459px, computed for 1180×734 and 820×1094 less a 72px tab strip).
7. **Turning** keeps each sticker's share of the field and its size; nothing is derived again.
8. **The stat papers zoom; controls don't.** The draft zoomed the whole cork up to 1.3×, Settings and Flip back included; the brief keeps controls at phone sizes, so only the stat papers and your address paper zoom. **Open.**
9. **The gratitude events card** centers on a large screen in `2026-10-08-ipad-shop-and-cards.md` (its Task 5, the draft's 8ba750b3), as the brief's plan table has it; Task 11 here checks it once that plan has landed.
10. **A kept board** (the last one this device showed) is drawn at once on a large screen only if it has a large layout; otherwise the board waits for the server's.
11. **Words.** Code says "large layout", the brief's words: `BoardLayout = "phone" | "large"`. **Open:** add "Large layout" to AGENTS.md's vocabulary.

## Base

- Branch from `origin/main` once `2026-10-08-small-fixes.md` (Phase 0) and `2026-10-08-ipad-foundations.md` have merged.
- Names this plan takes from them, as the draft named them. Task 0 checks each; where a landed name differs, use it wherever this plan writes the draft's.

| From        | Names                                                                                                                      | For                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Foundations | `ui/largeScreen.ts`: `LARGE_SCREEN`, `useLargeScreen()`                                                                    | the 600×600 touch-screen query                       |
| Foundations | `ui/tabsLead.ts`: `registerTabsLead`, `useTabsLead()`; `.tabs-lead`; `--gutter-large`, `--tabs-lead-w`                     | the tab row's lead slot                              |
| Foundations | TabBar's `visiting` and the lit Explore tab's caret                                                                        | the way back from someone's board                    |
| Phase 0     | StatCork's `.stat-board__head` holding Flip back, first in the cork; someone else's address paper in `.stat-board__col--b` | Flip back at the top left, their Sui address         |
| Phase 0     | tray: `stopShort`, `openWindow(short)` answering `slider`, `pouchFoot`, `trayFitFor`, `TrayFit`, `trayTop()`, `--scale`    | the zipper to the foot, opening as far as its sheets |
| Phase 0     | no first-selection hint (`hintSpot`, `hintRoom`, `selectionHint.ts` gone)                                                  |                                                      |

- Large-screen CSS uses the literal query `(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`, as the draft does, unless foundations named it another way (Task 0).

## Files

Under `apps/frontend/src/sticker-board/` unless shown.

- **DB:** `packages/db/src/schema/stickerPlacements.ts` and its test; a generated migration in `packages/db/drizzle/`.
- **API:** create `apps/api/src/stickerBoards/largeLayoutLimit.ts`; modify `apps/api/src/shapes.ts`, `stickerBoards/board.ts`, `routes/stickerBoards.ts`, `gifts/receiving.ts`, `client.ts`, `testing/rows.ts`; tests `routes/stickerBoards.test.ts`, `routes/receiving.test.ts`, `shapes.test.ts`.
- **App client:** `apps/frontend/src/api/apiClient.ts`, `httpApi.ts`, `views.ts`, `testing.tsx`, `testFixtures.ts`; the StickerPlacement literals in `api/suiWalletApi.test.ts`, `receiving/receiveFlow.test.ts`, `receiving/ReceiveGiftDialog.test.tsx`.
- **Board:** create `largeLayout.ts` and `largeLayout.test.ts`; modify `placement.ts`, `useBoardSize.ts`, `boardSticker.ts`, `lastBoard.ts`, `PlacedSticker.tsx`, `useBoardGestures.ts`, `StickerBoard.tsx`/`.css`, `ArtistBoard.tsx`, `apps/frontend/src/ui/testing.ts`; tests `boardSticker.test.ts`, `lastBoard.test.ts`, `useBoardGestures.test.tsx`, `StickerBoard.test.tsx`, `ArtistBoard.test.tsx`.
- **Tray:** `tray/trayModel.ts`, `trayEngine.ts`, `zipper.ts`, `traySheets.ts`, `trayPresses.ts`, `trayPeel.ts`, `traySpread.ts`, `trayPaging.ts`, `sticker-tray.css`, `StickerTray.test.tsx`.
- **Stat board:** `stat-board/stat-board.css`, `settings-note.css`, `StatCork.tsx`.
- **Docs:** `DESIGN.md`, `PRODUCT.md`.

## Setup

- [ ] `git -C <main checkout> fetch`, then `git -C <main checkout> worktree add -b feat/ipad-board-and-stat-board .claude/worktrees/ipad-board-and-stat-board origin/main`, and `pnpm install` in it. Every command below runs from that worktree's root.
- Scratch goes in the worktree's gitignored `data/scratch/board-and-stat-board/`. This plan's dev server takes ports 5194 (Vite) and 8794 (API).
- Frontend tests run with `TZ=Asia/Tokyo`.
- Order: 0–6 in order. 7 and 8 after 6 (they edit `StickerBoard.tsx` and `ArtistBoard.tsx`). 9 and 10 touch only their own files and can run beside 4–8, but 9 waits for 4 when its item 10 reaches `useBoardGestures.ts`. A lane in its own worktree starts with `git switch -c <branch> <commit>` and restores any tracked file the fresh worktree lacks. Then 11, 12, 13.

### Task 0: The base, the dev server and the phone's baseline

- [ ] **Step 1:** Confirm Phase 0 and foundations are on `origin/main`: `git log --oneline origin/main -- docs/superpowers/plans/2026-10-08-small-fixes.md docs/superpowers/plans/2026-10-08-ipad-foundations.md` shows each plan's last commit, and neither has an open box. If either hasn't merged, stop and say so.
- [ ] **Step 2:** Find the names in the Base table:

```bash
rg -n "export (const|function) (LARGE_SCREEN|useLargeScreen|isLargeScreen|registerTabsLead|useTabsLead|onLargeScreen)" apps/frontend/src/ui
rg -n "gutter-large|tabs-lead-w" apps/frontend/src/styles/tokens.css
rg -n "stat-board__head|stat-board--own|side\?: ReactNode" apps/frontend/src/sticker-board/stat-board
rg -n "stopShort|openWindow|pouchFoot|trayFitFor|TrayFit|trayTop|reshape" apps/frontend/src/sticker-board/tray apps/frontend/src/sticker-board/useBoardGestures.ts
rg -n "hintSpot|hintRoom" apps/frontend/src/sticker-board
```

Expected: each name in the Base table is found (`onLargeScreen` may not be: Task 4 adds it), and the last search finds nothing. Note every difference in this plan's file, beside the task that uses the name, before starting Task 1. If foundations' CSS names the large screen some other way (a custom media, a class or data attribute on `.phone`), this plan's CSS uses that.

- [ ] **Step 3: Data.** If the research database still exists, copy it; the API migrates it as it starts.

```bash
mkdir -p data/scratch/board-and-stat-board
RESEARCH="<main checkout>/.claude/worktrees/ipad-research/data/scratch/ipad/data"
sqlite3 "$RESEARCH/ipad-research.db" ".backup data/scratch/board-and-stat-board/board.db"
/bin/cp -Rf "$RESEARCH/ipad-research-images" data/scratch/board-and-stat-board/images
```

Its people sign in as `?as=ipad-alice` (ten stickers on her board, some drawn by others, so foil), `ipad-bob` and `ipad-carol`. If it's gone, seed through the app under LIFF Mock: `board-alice` and `board-bob` each seal three stickers (Draw, a stroke, the seal check twice about 700ms apart), and bob gives alice one (Explore → her board → Give → Send in a LINE chat; LIFF Mock's picker answers success; she accepts from her board's gifts badge). Below, alice and bob are whichever pair exists.

- [ ] **Step 4: Servers**, in the background:
  - API: `(cd apps/api && PORT=8794 DATABASE_URL=data/scratch/board-and-stat-board/board.db IMAGE_DIR=../../data/scratch/board-and-stat-board/images IMAGE_BASE_URL=http://localhost:5194/api/images pnpm dev)`. `DATABASE_URL` resolves from the repo root.
  - Vite: `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm --filter frontend exec vite --config vite.board.config.ts`, with this untracked `apps/frontend/vite.board.config.ts`, never committed:

```ts
// Untracked, never committed: this plan's dev server on 5194, its API on 8794.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config.ts";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5194,
      strictPort: true,
      proxy: { "/api": { target: "http://127.0.0.1:8794" } },
    },
  }),
);
```

- [ ] **Step 5: Scripts.** Copy `<main checkout>/.claude/worktrees/ipad-research/data/scratch/ipad/scripts/captures/lib.js` into the scratch folder, with `BASE` at `http://localhost:5194`, `OUT` in the scratch folder, and the playwright-core of the `~/.npm/_npx/*/node_modules/` copy whose `browsers.json` WebKit revision has a `~/Library/Caches/ms-playwright/webkit-<rev>` folder. It signs in from Node and adds the session cookie back without `Secure`, which WebKit drops on localhost. Contexts: `isMobile: true, hasTouch: true`, an iPad user agent for large sizes, `reducedMotion: "reduce"` (WebKit's screenshots draw no 3D), `locale: "en-US"`, `timezoneId: "Asia/Tokyo"`.
- [ ] **Step 6: `record.js`**, in the scratch folder: given a label, an engine and a viewport, signed in as alice, it writes `<label>-<engine>-<w>x<h>.json` and a screenshot per state, after `waitForLoadState("networkidle")`:
  - the board: every `.placed-sticker`'s `data-sticker-id`, `style.transform`, `style.width` and `style.height`, and the rounded `getBoundingClientRect()` of `.board-who`, `.board-gifts`, `.board-draw`, `.zip__tab--front`;
  - the tray open (`page.touchscreen.tap` on `.zip__tab--front`'s center): `.tray__col`, the stack's `style.transform`, `.tray__new`;
  - the stat board (tap `.board-who`): `.stat-board__head`, `.stat-board__stats`, `.settings-note`, `.address-papers`, `.stat-board__flip-back`, and the cork's `scrollHeight` and `clientHeight`;
  - bob's view of alice's board (Explore, search "alice", her row): the same board record.
- [ ] **Step 7: The phone's baseline.** `node data/scratch/board-and-stat-board/record.js baseline` at 390×844, in WebKit and Chromium. Stop both servers until Task 11.

### Task 1: The large layout's columns

**Files:** Modify `packages/db/src/schema/stickerPlacements.ts`, `stickerPlacements.test.ts`. Create a migration in `packages/db/drizzle/` (generated).

- [ ] **Step 1: Write the failing test.** In `stickerPlacements.test.ts`, inside `describe("sticker placements")`:

```ts
it("stores the large layout's placement whole or not at all, beside the phone's", () => {
  expect(refusal(() => place({ largeOnBoard: true }))).toMatch(
    /sticker_placements_large_placement/,
  );
  expect(() =>
    place({
      largeOnBoard: false,
      largeX: 0.5,
      largeY: 0.5,
      largeScale: 0.5,
      largeRotation: 0,
      largeZ: 0,
    }),
  ).not.toThrow();
});
```

- [ ] **Step 2:** `pnpm --filter @drawing-app/db exec vitest run src/schema/stickerPlacements.test.ts` → FAIL: Drizzle has no `largeOnBoard` column to set.
- [ ] **Step 3: The schema.** In `stickerPlacements.ts`, the table's comment and columns become:

```ts
/**
 * A sticker's placement on a person's Sticker Board, in each of its two layouts, the phone's and the
 * large layout a large screen shows: on the board, or waiting in its sticker tray. Inserted when the
 * sticker first reaches them (at seal, or when they receive it), so created_at orders the tray. It
 * stays after they give the sticker away: the sticker leaves their board, and its spot on the sticker
 * sheet stays empty.
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
    // The phone's layout: null until the owner's board first places the sticker, then moved by every
    // drag, resize, turn and Remove on a phone. The app's `placement`: { on, x, y, s, r, z }.
    /** False while it waits in the sticker tray; its last spot is kept. */
    onBoard: integer("on_board", { mode: "boolean" }),
    /** Center, as fractions of the board's field. */
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
    // The large layout, the same six values: null until it's derived from the phone's or the sticker
    // lands in it, then moved only on a large screen. Its scale is a fraction of the phone board's width.
    largeOnBoard: integer("large_on_board", { mode: "boolean" }),
    largeX: real("large_x"),
    largeY: real("large_y"),
    largeScale: real("large_scale"),
    largeRotation: real("large_rotation"),
    largeZ: integer("large_z"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stickerId] }),
    check(
      "sticker_placements_placement",
      sql`(${t.onBoard} is null and ${t.x} is null and ${t.y} is null and ${t.scale} is null and ${t.rotation} is null and ${t.z} is null)
        or (${t.onBoard} is not null and ${t.x} between 0 and 1 and ${t.y} between 0 and 1
          and ${t.scale} > 0 and ${t.scale} <= 1 and ${t.rotation} is not null and ${t.z} is not null)`,
    ),
    check(
      "sticker_placements_large_placement",
      sql`(${t.largeOnBoard} is null and ${t.largeX} is null and ${t.largeY} is null and ${t.largeScale} is null and ${t.largeRotation} is null and ${t.largeZ} is null)
        or (${t.largeOnBoard} is not null and ${t.largeX} between 0 and 1 and ${t.largeY} between 0 and 1
          and ${t.largeScale} > 0 and ${t.largeScale} <= 1 and ${t.largeRotation} is not null and ${t.largeZ} is not null)`,
    ),
  ],
);
```

- [ ] **Step 4: The migration.** `pnpm --filter @drawing-app/db db:generate --name large_layout` writes `packages/db/drizzle/<next>_large_layout.sql`, a rebuild of `sticker_placements` (a new CHECK can't be added in place), its snapshot and journal entry. If `origin/main` gained a migration since the branch, rebase first and generate again. In the SQL:
  - above the line that starts `INSERT INTO`, add:

```sql
-- The large layout is new: every sticker starts without one, derived from the phone's the first time a large screen shows its board.
```

- the rebuild dropped the table's trigger, so append `--> statement-breakpoint` to the last statement's line, then:

```sql
CREATE TRIGGER `sticker_placements_updated_at` AFTER UPDATE ON `sticker_placements` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_placements` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
```

That's `updatedAtTriggerStatements([stickerPlacements])` (`schema/updatedAtTriggers.ts`), as `0001_kyoto_seika_practice.sql` appends its own.

- [ ] **Step 5:** `pnpm --filter @drawing-app/db exec vitest run src/schema src/migrate.test.ts` → PASS: the new test, "has a trigger on every table", and "builds the same database the schema describes". `pnpm --filter @drawing-app/db typecheck` → passes.
- [ ] **Step 6: Commit.** `git add packages/db/src/schema/stickerPlacements.ts packages/db/src/schema/stickerPlacements.test.ts packages/db/drizzle && git commit -m "feat(db): the large layout's placement beside the phone's in sticker_placements"`

### Task 2: The API saves either layout, and a derived large layout

**Files:** Create `apps/api/src/stickerBoards/largeLayoutLimit.ts`. Modify `apps/api/src/shapes.ts`, `stickerBoards/board.ts`, `routes/stickerBoards.ts`, `gifts/receiving.ts`, `client.ts`, `testing/rows.ts`. Tests: `routes/stickerBoards.test.ts`, `routes/receiving.test.ts`, `shapes.test.ts`.

Phase 0 adds `GET /:userId/sui-address` to `routes/stickerBoards.ts` and its test; this task appends after it, so the two don't touch.

- [ ] **Step 1: Test fixtures.** In `testing/rows.ts`, after `SPOT`:

```ts
/** A spot in the large layout, as the API sends it; `largeColumns` writes it to a row. */
export const LARGE_SPOT = { onBoard: true, x: 0.6, y: 0.4, scale: 0.32, rotation: 3, z: 4 };
```

- [ ] **Step 2: Write the failing tests.** In `routes/stickerBoards.test.ts`:
  - Imports: `largeColumns` from `"../shapes.ts"`; `MAX_LARGE_LAYOUT_BATCH` from `"../stickerBoards/largeLayoutLimit.ts"`; `LARGE_SPOT` from `"../testing/rows.ts"`.
  - Beside `placementResponseSchema`: `const largeLayoutResponseSchema = z.object({ stickerPlacements: z.array(stickerPlacementSchema) });`
  - Beside `postSeen`:

```ts
const postLargeLayout = (userId: string, stickerPlacements: unknown) =>
  test.send("POST", "/api/sticker-boards/me/large-layout", {
    as: userId,
    body: { stickerPlacements },
  });
```

In `describe("GET /api/sticker-boards/:userId")`, add:

```ts
it("shows someone else the stickers on their board in either layout, with both spots", async () => {
  const me = insertUser(test.db);
  const friend = insertUser(test.db);
  const [phoneOnly, largeOnly, inBothTrays] = [seal(friend), seal(friend), seal(friend)];
  for (const [stickerId, phone, large] of [
    [phoneOnly, SPOT, IN_TRAY],
    [largeOnly, IN_TRAY, LARGE_SPOT],
    [inBothTrays, IN_TRAY, IN_TRAY],
  ] as const) {
    test.db
      .update(stickerPlacements)
      .set({ ...phone, ...largeColumns(large) })
      .where(placementOf(friend, stickerId))
      .run();
  }
  const shown = byStickerId((await boardOf(me, friend)).boardStickers);
  expect([...shown.keys()].sort()).toEqual([phoneOnly, largeOnly].sort());
  expect(shown.get(largeOnly)).toMatchObject({ placement: IN_TRAY, largePlacement: LARGE_SPOT });
});
```

Replace `describe("PATCH /api/sticker-boards/me/sticker-placements/:stickerId")` with:

```ts
describe("PATCH /api/sticker-boards/me/sticker-placements/:stickerId", () => {
  it("saves a placement whole on any sticker that reached you, in either layout or both", async () => {
    const me = insertUser(test.db);
    const kept = seal(me);
    const given = seal(me);
    giveSticker(test.db, given, me, insertUser(test.db));
    for (const stickerId of [kept, given]) {
      for (const body of [
        { placement: SPOT },
        { largePlacement: LARGE_SPOT },
        { placement: IN_TRAY, largePlacement: IN_TRAY },
      ]) {
        const saved = await bodyOf(
          await patchPlacement(me, stickerId, body),
          placementResponseSchema,
        );
        expect(saved.stickerPlacement).toMatchObject({ stickerId, ...body });
      }
    }
    const board = await boardOf(me, "me");
    expect(board.boardStickers.map((s) => [s.placement, s.largePlacement])).toEqual([
      [IN_TRAY, IN_TRAY],
      [IN_TRAY, IN_TRAY],
    ]);
  });

  it("leaves the phone's spot as it was when a large screen moves the sticker", async () => {
    const me = insertUser(test.db);
    const stickerId = seal(me);
    await patchPlacement(me, stickerId, { placement: SPOT, largePlacement: LARGE_SPOT });
    const moved = { ...LARGE_SPOT, x: 0.9, scale: 0.5, rotation: 20 };
    await patchPlacement(me, stickerId, { largePlacement: moved });
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard).toMatchObject({ placement: SPOT, largePlacement: moved });
  });

  it("refuses a sticker that never reached you, a body naming no layout, and a spot outside the board", async () => {
    const me = insertUser(test.db);
    const theirs = seal(insertUser(test.db));
    expect(await refusalOf(await patchPlacement(me, theirs, { placement: SPOT }))).toMatchObject({
      status: 404,
      error: "sticker_placement_not_found",
    });
    const mine = seal(me);
    for (const body of [{}, { placement: OFF_THE_FIELD }, { largePlacement: NO_SIZE }]) {
      expect(await refusalOf(await patchPlacement(me, mine, body))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});

describe("POST /api/sticker-boards/me/large-layout", () => {
  it("saves each spot only where the sticker has no large spot yet, and answers every listed sticker", async () => {
    const me = insertUser(test.db);
    const [first, second] = [seal(me), seal(me)];
    await patchPlacement(me, first, { largePlacement: LARGE_SPOT });
    const derived = { ...SPOT, x: 0.45 };
    const answer = await bodyOf(
      await postLargeLayout(
        me,
        [first, second].map((stickerId) => ({ stickerId, largePlacement: derived })),
      ),
      largeLayoutResponseSchema,
    );
    expect(new Map(answer.stickerPlacements.map((p) => [p.stickerId, p.largePlacement]))).toEqual(
      new Map([
        [first, LARGE_SPOT],
        [second, derived],
      ]),
    );
  });

  it("refuses stickers that never reached you, naming them, and saves none of the batch", async () => {
    const me = insertUser(test.db);
    const mine = seal(me);
    const theirs = seal(insertUser(test.db));
    const refused = await refusalOf(
      await postLargeLayout(
        me,
        [mine, theirs].map((stickerId) => ({ stickerId, largePlacement: SPOT })),
      ),
    );
    expect(refused).toMatchObject({ status: 404, error: "sticker_placement_not_found" });
    expect(refused.detail).toContain(theirs);
    const [onBoard] = (await boardOf(me, "me")).boardStickers;
    expect(onBoard?.largePlacement).toBeNull();
  });

  it("takes from 1 to MAX_LARGE_LAYOUT_BATCH stickers at once", async () => {
    const me = insertUser(test.db);
    const entries = (length: number) =>
      Array.from({ length }, (_, index) => ({
        stickerId: `not-a-sticker-${index}`,
        largePlacement: SPOT,
      }));
    for (const stickerPlacements of [entries(0), entries(MAX_LARGE_LAYOUT_BATCH + 1)]) {
      expect(await refusalOf(await postLargeLayout(me, stickerPlacements))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
  });
});
```

In `shapes.test.ts`, "show a placement as null until the board places it, then whole" becomes (import `largeColumns`, and `LARGE_SPOT` from `./testing/rows.ts`):

```ts
it("show each layout's placement as null until it's placed there, then whole", () => {
  const userId = insertUser(db);
  const stickerId = insertSealedSticker(db, userId);
  const read = () => {
    const row = db.select().from(stickerPlacements).where(placementOf(userId, stickerId)).get();
    if (!row) throw new Error("Sealing left no sticker placement");
    return stickerPlacementSchema.parse(toStickerPlacement(row));
  };
  expect(read()).toMatchObject({ placement: null, largePlacement: null });
  db.update(stickerPlacements).set(SPOT).where(placementOf(userId, stickerId)).run();
  expect(read()).toMatchObject({ placement: SPOT, largePlacement: null });
  db.update(stickerPlacements)
    .set(largeColumns(LARGE_SPOT))
    .where(placementOf(userId, stickerId))
    .run();
  expect(read()).toMatchObject({ placement: SPOT, largePlacement: LARGE_SPOT });
});
```

In `routes/receiving.test.ts` (import `largeColumns` from `../shapes.ts` and `LARGE_SPOT` beside `SPOT`), "returns a sticker coming back to its old spot in the tray, NEW again" becomes "returns a sticker coming back to its old spots in the tray, in both layouts, NEW again": its `.set({ ...SPOT, seenAt: … })` becomes `.set({ ...SPOT, ...largeColumns(LARGE_SPOT), seenAt: test.clock.now() })`, and its `toEqual` gains `largePlacement: { ...LARGE_SPOT, onBoard: false },` after `placement`.

- [ ] **Step 3:** `pnpm --filter @drawing-app/api exec vitest run src/routes/stickerBoards.test.ts src/routes/receiving.test.ts src/shapes.test.ts` → FAIL: no `largeColumns`, no `largeLayoutLimit.ts`, and the new route answers 404.
- [ ] **Step 4: `stickerBoards/largeLayoutLimit.ts`:**

```ts
/** The most stickers one save of a derived large layout names; the app sends a bigger board in parts. */
export const MAX_LARGE_LAYOUT_BATCH = 500;
```

- [ ] **Step 5: `shapes.ts`.** `placementSchema`'s comment becomes:

```ts
/**
 * A placement's six values, all set, with the table's CHECK ranges: StickerPlacement's `placement`
 * and `largePlacement`, and the bodies that save them.
 */
```

`stickerPlacementSchema` becomes:

```ts
export const stickerPlacementSchema = z.object({
  stickerId: createSelectSchema(stickerPlacements).shape.stickerId,
  /** Its spot in the phone's layout; null until the board first places it. */
  placement: placementSchema.nullable(),
  /** Its spot in the large layout a large screen shows; null until that layout first places it. */
  largePlacement: placementSchema.nullable(),
  /** Null shows NEW. */
  seenAt: isoTimeSchema.nullable(),
  /** The sticker tray's order. */
  arrivedAt: isoTimeSchema,
});
```

Replace `toStickerPlacement` with:

```ts
/** A placement as the large layout's columns hold it. */
export const largeColumns = (p: Placement) => ({
  largeOnBoard: p.onBoard,
  largeX: p.x,
  largeY: p.y,
  largeScale: p.scale,
  largeRotation: p.rotation,
  largeZ: p.z,
});

/** A placement's six values, or null unless every one is set. */
function wholePlacement(values: { [K in keyof Placement]: Placement[K] | null }): Placement | null {
  const { onBoard, x, y, scale, rotation, z } = values;
  return onBoard === null ||
    x === null ||
    y === null ||
    scale === null ||
    rotation === null ||
    z === null
    ? null
    : { onBoard, x, y, scale, rotation, z };
}

export function toStickerPlacement(row: typeof stickerPlacements.$inferSelect): StickerPlacement {
  return {
    stickerId: row.stickerId,
    placement: wholePlacement(row),
    largePlacement: wholePlacement({
      onBoard: row.largeOnBoard,
      x: row.largeX,
      y: row.largeY,
      scale: row.largeScale,
      rotation: row.largeRotation,
      z: row.largeZ,
    }),
    seenAt: toIsoTime(row.seenAt),
    arrivedAt: toIsoTime(row.createdAt),
  };
}
```

- [ ] **Step 6: `stickerBoards/board.ts`.** Imports: `or` from `drizzle-orm`; `largeColumns` from `../shapes.ts`; `MAX_LARGE_LAYOUT_BATCH` from `./largeLayoutLimit.ts`. After `seenRequestSchema`:

```ts
/** The body that saves a sticker's spot: in the phone's layout, the large layout, or both at once. */
export const placementsRequestSchema = z
  .object({ placement: placementSchema.optional(), largePlacement: placementSchema.optional() })
  .refine(
    (body) => body.placement !== undefined || body.largePlacement !== undefined,
    "placement or largePlacement: say at least one",
  );
export type PlacementsRequest = z.infer<typeof placementsRequestSchema>;

/** A large layout derived from the phone's: each sticker's spot in it. */
export const largeLayoutRequestSchema = z.object({
  stickerPlacements: z
    .array(
      z.object({
        stickerId: stickerPlacementSchema.shape.stickerId.min(1),
        largePlacement: placementSchema,
      }),
    )
    .min(1)
    .max(MAX_LARGE_LAYOUT_BATCH),
});
export type LargeLayoutEntry = z.infer<
  typeof largeLayoutRequestSchema
>["stickerPlacements"][number];
```

In `loadStickerBoard`, the visitor's `eq(stickerPlacements.onBoard, true),` becomes:

```ts
              // On the board in either layout: the visitor's screen shows the one for its size.
              or(eq(stickerPlacements.onBoard, true), eq(stickerPlacements.largeOnBoard, true)),
```

Replace `savePlacement` with:

```ts
/**
 * Saves the person's placement of a sticker in either layout or both, all six values of each.
 * Undefined when it never reached them.
 */
export const savePlacements = (
  db: Db,
  userId: string,
  stickerId: string,
  { placement, largePlacement }: PlacementsRequest,
) =>
  db
    .update(stickerPlacements)
    .set({ ...placement, ...(largePlacement && largeColumns(largePlacement)) })
    .where(and(eq(stickerPlacements.userId, userId), eq(stickerPlacements.stickerId, stickerId)))
    .returning()
    .get();

/** Which of `stickerIds` never reached the person: they hold no placement of it. */
export function neverReached(db: Db, userId: string, stickerIds: readonly string[]) {
  const found = new Set(
    db
      .select({ stickerId: stickerPlacements.stickerId })
      .from(stickerPlacements)
      .where(
        and(
          eq(stickerPlacements.userId, userId),
          inArray(stickerPlacements.stickerId, [...stickerIds]),
        ),
      )
      .all()
      .map(({ stickerId }) => stickerId),
  );
  return stickerIds.filter((id) => !found.has(id));
}

/**
 * Saves a large layout derived from the phone's, each spot only where the sticker has none in the
 * large layout yet: a large layout saved first from another device stays. Answers the listed
 * stickers' placements as saved.
 */
export function saveDerivedLargeLayout(
  db: Db,
  userId: string,
  entries: readonly LargeLayoutEntry[],
) {
  const ids = entries.map(({ stickerId }) => stickerId);
  return db.transaction((tx) => {
    for (const { stickerId, largePlacement } of entries) {
      tx.update(stickerPlacements)
        .set(largeColumns(largePlacement))
        .where(
          and(
            eq(stickerPlacements.userId, userId),
            eq(stickerPlacements.stickerId, stickerId),
            isNull(stickerPlacements.largeOnBoard),
          ),
        )
        .run();
    }
    return tx
      .select()
      .from(stickerPlacements)
      .where(and(eq(stickerPlacements.userId, userId), inArray(stickerPlacements.stickerId, ids)))
      .all();
  });
}
```

- [ ] **Step 7: `routes/stickerBoards.ts`.** Import `largeLayoutRequestSchema`, `neverReached`, `placementsRequestSchema`, `saveDerivedLargeLayout` and `savePlacements` (for `savePlacement`) from `../stickerBoards/board.ts`; drop `placementSchema` from the `../shapes.ts` import. The PATCH validates `validate("json", placementsRequestSchema)` and calls `savePlacements(db, c.var.userId, stickerId, c.req.valid("json"))`. After the seen route:

```ts
    .post("/me/large-layout", validate("json", largeLayoutRequestSchema), (c) => {
      const entries = c.req.valid("json").stickerPlacements;
      const missing = neverReached(
        db,
        c.var.userId,
        entries.map(({ stickerId }) => stickerId),
      );
      if (missing.length > 0) {
        return apiError(
          c,
          404,
          "sticker_placement_not_found",
          `Stickers ${missing.join(", ")} never reached you`,
        );
      }
      const saved = saveDerivedLargeLayout(db, c.var.userId, entries);
      return c.json({ stickerPlacements: saved.map(toStickerPlacement) }, 200);
    });
```

- [ ] **Step 8: `gifts/receiving.ts`.** In the receive's `onConflictDoUpdate`, the comment and `set` become:

```ts
        // A sticker coming back returns to the tray at its old spots, in both layouts, and is NEW
        // again. created_at is kept, so its place in the tray doesn't move.
        set: {
          onBoard: sql`case when ${stickerPlacements.onBoard} is null then null else 0 end`,
          largeOnBoard: sql`case when ${stickerPlacements.largeOnBoard} is null then null else 0 end`,
          seenAt: null,
        },
```

- [ ] **Step 9: `client.ts`.** After the `HANDLE_MAX_LENGTH` export: `export { MAX_LARGE_LAYOUT_BATCH } from "./stickerBoards/largeLayoutLimit.ts";`. The board's type export becomes `export type { BoardSticker, LargeLayoutEntry, PlacementsRequest, StickerBoard } from "./stickerBoards/board.ts";`.
- [ ] **Step 10:** Step 3's command → PASS. `pnpm --filter @drawing-app/api typecheck` → errors only in tests that build a `StickerPlacement` by hand; give each `largePlacement: null`. Then `pnpm --filter @drawing-app/api test` → PASS.
- [ ] **Step 11: Commit.** `git add apps/api/src && git commit -m "feat(api): save a sticker's spot in either layout, and a derived large layout where none is saved"`

### Task 3: The app's client speaks both layouts

**Files:** Modify `apps/frontend/src/api/apiClient.ts`, `httpApi.ts`, `testing.tsx`, `testFixtures.ts`, `sticker-board/StickerBoard.tsx`, and the tests named below.

- [ ] **Step 1: Types first.** `pnpm --filter frontend typecheck` → fails: `ApiBoardSticker` and `StickerPlacement` now need `largePlacement`.
- [ ] **Step 2: `apiClient.ts`.** In the `@drawing-app/api/client` import, `Placement` gives way to `LargeLayoutEntry` and `PlacementsRequest`. The board methods become:

```ts
/** PATCH /api/sticker-boards/me/sticker-placements/:stickerId: its spot in either layout, or both */
saveStickerPlacement: (stickerId: string, spots: PlacementsRequest) => Promise<StickerPlacement>;
/** POST /api/sticker-boards/me/large-layout: a large layout derived from the phone's, saved where none is */
saveLargeLayout: (stickerPlacements: readonly LargeLayoutEntry[]) => Promise<StickerPlacement[]>;
```

- [ ] **Step 3: `httpApi.ts`.** `saveStickerPlacement: async (stickerId, spots) =>` sends `json: spots`. After it:

```ts
    saveLargeLayout: async (stickerPlacements) => {
      const response = await boards.me["large-layout"].$post({
        json: { stickerPlacements: [...stickerPlacements] },
      });
      if (!response.ok) throw await refusal(response, "POST /api/sticker-boards/me/large-layout");
      return (await response.json()).stickerPlacements;
    },
```

- [ ] **Step 4: Test helpers.** `testFixtures.ts`'s `boardSticker` gains `largePlacement: null,` after `placement: null,`. `testing.tsx`'s `emptyApi`:

```ts
    saveStickerPlacement: (stickerId, spots) =>
      Promise.resolve({
        stickerId,
        placement: spots.placement ?? null,
        largePlacement: spots.largePlacement ?? null,
        seenAt: null,
        arrivedAt: new Date(0).toISOString(),
      }),
    saveLargeLayout: (stickerPlacements) =>
      Promise.resolve(
        stickerPlacements.map(({ stickerId, largePlacement }) => ({
          stickerId,
          placement: null,
          largePlacement,
          seenAt: null,
          arrivedAt: new Date(0).toISOString(),
        })),
      ),
```

The hand-built `stickerPlacement` in `api/suiWalletApi.test.ts`, `receiving/receiveFlow.test.ts` and `receiving/ReceiveGiftDialog.test.tsx` gains `largePlacement: null`.

- [ ] **Step 5: The board's one call.** In `StickerBoard.tsx`'s `save`, `api.saveStickerPlacement(sticker.id, toApiPlacement(spot))` becomes `api.saveStickerPlacement(sticker.id, { placement: toApiPlacement(spot) })`; Task 5 replaces it. In `StickerBoard.test.tsx`:
  - "keeps one save of a sticker in flight…": the first mock becomes `(stickerId, spots) => new Promise((resolve) => { land = () => resolve({ stickerId, placement: spots.placement ?? null, largePlacement: null, seenAt: null, arrivedAt: a.arrivedAt }); })`, and the last expectation `toEqual(shown && { placement: toApiPlacement(shown) })`.
  - `visitAfterAMove`'s `saveStickerPlacement: (stickerId, spots) => { onServer = spots.placement ?? onServer; return Promise.resolve({ stickerId, placement: onServer, largePlacement: null, seenAt: null, arrivedAt: sticker.arrivedAt }); }`.
- [ ] **Step 6:** `pnpm --filter frontend typecheck` → passes. `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board src/api src/receiving` → PASS.
- [ ] **Step 7: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): the client saves a sticker's spot by layout and a derived large layout"`

### Task 4: The sticker unit: stickers keep their phone size

Draft, for reference; the `U` plumbing is ported as it is, the formula is decision 6's:

```bash
git show 09cfc89e -- apps/frontend/src/sticker-board/placement.ts apps/frontend/src/sticker-board/useBoardSize.ts apps/frontend/src/sticker-board/PlacedSticker.tsx apps/frontend/src/sticker-board/useBoardGestures.ts apps/frontend/src/sticker-board/useBoardGestures.test.tsx
git show 212615f7 -- apps/frontend/src/sticker-board/placement.ts
git show 5cfbbe97 -- apps/frontend/src/sticker-board/placement.ts
```

Conflicts to expect: Phase 0 removed the first-selection hint's helpers from `placement.ts`; if Phase 0 brought `pouchFoot` into `useBoardGestures.ts`'s `stow`, keep its line. Every other hunk applies by hand at the call sites below.

**Files:** Modify `placement.ts`, `useBoardSize.ts`, `PlacedSticker.tsx`, `useBoardGestures.ts`, `StickerBoard.tsx`, `ArtistBoard.tsx`, `apps/frontend/src/ui/testing.ts`. Test: `useBoardGestures.test.tsx`.

- [ ] **Step 1: A large screen for tests**, unless foundations brought one (Task 0). In `apps/frontend/src/ui/testing.ts`, add `import { vi } from "vitest";` and `import { LARGE_SCREEN } from "./largeScreen";`, then:

```ts
/** A large screen for a test: LARGE_SCREEN matches, and every other query answers as before. */
export function onLargeScreen() {
  const matchMedia = window.matchMedia.bind(window);
  const large = matchMedia("all");
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === LARGE_SCREEN ? large : matchMedia(query),
  );
}
```

- [ ] **Step 2: Write the failing test.** `unitOf` alone answers a constant in the large layout, so it gets no test of its own: the gesture test below and Task 11's checks cover what it does. In `useBoardGestures.test.tsx`, each `size={{ W: 390, H: 657 }}` becomes `size={{ W: 390, H: 657, U: 390 }}`, and import `PHONE_BOARD` from `./placement`. Add, in `describe("useBoardGestures")`:

```tsx
it("draws a sticker in hand at the board's unit, which on a large board isn't its width", async () => {
  const large = { W: 1180, H: 662, U: PHONE_BOARD.W };
  act(() =>
    root.render(
      <Board
        stickers={[sticker]}
        field={fieldOf(large.W, large.H)}
        size={large}
        selected="a"
        reduced
        tray={noTray}
        onSelect={() => {}}
        onOpen={() => {}}
        onCommit={() => {}}
        onRemove={() => {}}
      />,
    ),
  );
  const stage = host.querySelector(".board-stage");
  const el = host.querySelector<HTMLElement>(".placed-sticker");
  if (!(stage instanceof HTMLElement) || !el) throw new Error("the board didn't render");
  // happy-dom lays nothing out: the stage is given the board's size.
  stage.getBoundingClientRect = () => new DOMRect(0, 0, large.W, large.H);
  await act(async () => dragAcross(el, 1, 100, 160));
  expect(parseFloat(el.style.width)).toBeCloseTo(sizeOf(large.U, sticker.placement.s, sticker).w);
});
```

- [ ] **Step 3:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/useBoardGestures.test.tsx` → FAIL: no `PHONE_BOARD`, and the sticker in hand is drawn at the board's width.
- [ ] **Step 4: `placement.ts`.** `Placement.s`'s comment becomes:

```ts
/** Long side, as a fraction of the board's unit (see `unitOf`). */
```

After `Box`:

```ts
/** Which of a board's two arrangements: the phone's, or the large layout a large screen shows. */
export type BoardLayout = "phone" | "large";

/**
 * The phone's board: DESIGN.md's 390 × 844 iPhone inside LINE, less the status bar, LINE's header
 * and the tab strip. The large layout sizes stickers by its width, and is first derived from it.
 */
export const PHONE_BOARD = { W: 390, H: 651 } as const;

/** A board's size in px, and its unit, which a sticker's long side is a share of. */
export interface BoardSize {
  W: number;
  H: number;
  U: number;
}

/**
 * What a sticker's size is a share of: the board's width on a phone; in the large layout the phone
 * board's, so a sticker keeps its phone size either way up and the room goes to the board.
 */
export const unitOf = (layout: BoardLayout, boardWidth: number) =>
  layout === "large" ? PHONE_BOARD.W : boardWidth;
```

`sizeOf` and `stickerBox` rename their `boardWidth` parameter `unit`, and `sizeOf`'s comment becomes:

```ts
/** A sticker's size at this unit: `s` sets its long side, and the art sets its shape. */
```

- [ ] **Step 5: `useBoardSize.ts`:**

```ts
import { useLayoutEffect, useState, type RefObject } from "react";
import { LARGE_SCREEN, useLargeScreen } from "../ui/largeScreen";
import { unitOf, type BoardLayout, type BoardSize } from "./placement";

/** The layout a board shows on this screen: the large layout on a large screen, else the phone's. */
export const useBoardLayout = (): BoardLayout => (useLargeScreen() ? "large" : "phone");

/** The layout a board shows on this screen now, for code outside React. */
export const boardLayoutNow = (): BoardLayout =>
  window.matchMedia(LARGE_SCREEN).matches ? "large" : "phone";

/**
 * A board's size in px and its unit, which lay out its stickers: measured before it first paints and
 * again as it resizes or turns. The same object is kept while they hold, so a resize that changes
 * none of them doesn't re-render the board.
 */
export function useBoardSize(ref: RefObject<HTMLElement | null>, layout: BoardLayout) {
  const [size, setSize] = useState<BoardSize | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize((was) => {
        const [W, H] = [el.clientWidth, el.clientHeight];
        const U = unitOf(layout, W);
        return was?.W === W && was.H === H && was.U === U ? was : { W, H, U };
      });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [ref, layout]);
  return size;
}
```

- [ ] **Step 6: The unit at every size.** `rg -n "sizeOf\(|stickerBox\(|boardWidth" apps/frontend/src/sticker-board --glob '!*.test.*'` lists the sites:
  - `PlacedSticker.tsx`: the prop `boardWidth: number;` becomes the one below, destructured and passed as `stickerBox(field, unit, …)`:

```ts
/** What its size is a share of (see `unitOf`). */
unit: number;
```

- `useBoardGestures.ts`: `size` in `Options` becomes `BoardSize | null` (import the type from `./placement`). `draw` and `peelMark` call `sizeOf(latest.current.size?.U ?? 0, …)`; `stow` and the tray snap in `onMove` call `sizeOf(size.U, …)`. `dragBounds(field, size.W, size.H)` and the stow's `x`/`y` keep `W` and `H`.
- `StickerBoard.tsx`: import `useBoardLayout` from `./useBoardSize`; at the component's top, `const layout = useBoardLayout();`; `useBoardSize(stage)` becomes `useBoardSize(stage, layout)`. Every `stickerBox(field, size.W, …)` and `sizeOf(size.W, …)` takes `size.U`, and `boardWidth={size.W}` becomes `unit={size.U}`. `fieldOf(size.W, size.H)` stays.
- `ArtistBoard.tsx`: the same, with `useBoardSize(face, layout)`; `visitField(size.W, size.H)` stays.
- [ ] **Step 7:** Step 3's command → PASS. `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 8: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): stickers keep their phone size on a large screen, by the phone board's width"`

### Task 5: Spots by layout

**Files:** Modify `placement.ts`, `boardSticker.ts`, `lastBoard.ts`, `api/views.ts`, `StickerBoard.tsx`, `ArtistBoard.tsx`. Tests: `boardSticker.test.ts`, `lastBoard.test.ts`, `StickerBoard.test.tsx`, `ArtistBoard.test.tsx`.

- [ ] **Step 1: Write the failing tests.**

`boardSticker.test.ts`: import `shownIn`. A helper above the tests:

```ts
/** A spot on the board, as the API sends it. */
const onBoardAt = (x: number) => ({ onBoard: true, x, y: 0.5, scale: 0.3, rotation: 0, z: 1 });
```

The existing tests read the phone's layout:

- "draws the API's board sticker…": `view.placement` → `view.placements.phone`, twice; add `expect(view.placements.large).toBeNull();`.
- "gives each unplaced sticker its own free spot…": `stickers[0].placement` → `stickers[0].placements.phone`; `placed.map((s) => s.id)` → `placed.map((p) => p.sticker.id)`; and `const [a, b] = placed.map((s) => s.placement);` becomes:

```ts
const [a, b] = placed.map(({ spots }) => {
  if (!spots.phone) throw new Error("no phone spot given");
  return spots.phone;
});
```

- "spreads stickers that arrive together…": `placed.map((s) => s.id)` → `placed.map((p) => p.sticker.id)`; the loop takes `for (const { sticker: s } of placed)` and compares `s.placements.phone` with `other.placements.phone` (both set there).
- "keeps the spots the board already gave…": `const nudged = { ...moved, placements: { ...moved.placements, phone: { ...moved.placements.phone, x: 0.2, r: 12 } } };`, `placeUnplaced([{ ...moved, placements: { phone: null, large: null } }], [nudged])`, and `expect(stickers[0].placements).toEqual(nudged.placements);`.

Add:

```ts
  it("lands a new sticker in the large layout too once the board has one, and in the tray there as on the phone", () => {
    const both = boardSticker({ placement: onBoardAt(0.5), largePlacement: onBoardAt(0.4) });
    const fresh = boardSticker();
    // Received back: in the tray on the phone, never in the large layout.
    const back = boardSticker({ placement: { ...onBoardAt(0.6), onBoard: false } });
    const given = boardSticker({ placement: onBoardAt(0.7), held: false });
    const { placed } = placeUnplaced([both, fresh, back, given].map(toBoardSticker));
    const spotsGiven = new Map(placed.map((p) => [p.sticker.id, p.spots]));
    expect([...spotsGiven.keys()]).toEqual([fresh.stickerId, back.stickerId]);
    expect(spotsGiven.get(fresh.stickerId)).toMatchObject({
      phone: { on: true },
      large: { on: true },
    });
    expect(spotsGiven.get(back.stickerId)).toEqual({
      large: expect.objectContaining({ on: false }),
    });
  });

  it("leaves the large layout to be derived while the board has none", () => {
    const { stickers, placed } = placeUnplaced(
      [boardSticker({ placement: onBoardAt(0.5) }), boardSticker()].map(toBoardSticker),
    );
    expect(placed.map((p) => Object.keys(p.spots))).toEqual([["phone"]]);
    expect(stickers.map((s) => s.placements.large)).toEqual([null, null]);
  });
});

describe("shownIn", () => {
  it("shows the layout asked for, a sticker that layout hasn't placed at its phone spot, and keeps a view while it hasn't moved", () => {
    const [s] = placeUnplaced([
      toBoardSticker(boardSticker({ placement: onBoardAt(0.2), largePlacement: onBoardAt(0.8) })),
    ]).stickers;
    const [given] = placeUnplaced([
      toBoardSticker(boardSticker({ placement: onBoardAt(0.3), held: false })),
    ]).stickers;
    expect(shownIn("phone", [s])[0].placement.x).toBe(0.2);
    expect(shownIn("large", [s, given]).map((v) => v.placement.x)).toEqual([0.8, 0.3]);
    expect(shownIn("large", [s])[0]).toBe(shownIn("large", [s])[0]);
  });
});
```

The first two go inside `describe("placeUnplaced")`, replacing its closing `});`.

`lastBoard.test.ts`: the fixture's `placement: { on: true, x: 0.5, y: 0.5, s: 1, r: 0, z: 1 },` becomes `placements: { phone: { on: true, x: 0.5, y: 0.5, s: 1, r: 0, z: 1 }, large: null },`, typed `PlacedBoardSticker`; its `kept?.stickers[0].placement` expectation compares `placements`.

`StickerBoard.test.tsx`: imports `onLargeScreen` from `../ui/testing` and the `StickerPlacement` type from `@drawing-app/api/client`. `keptBoardFor(TEST_ME.id)?.stickers[0].placement` becomes `…stickers[0].placements.phone` (three places). After `onAPhone`:

```tsx
/** An 11-inch iPad's board in Safari, upright: a large screen. */
const onAnIpad = () => {
  onLargeScreen();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(820);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1022);
};

/** A server holding these stickers, which keeps every spot saved in either layout, and a client over it. */
function boardServer(...stickers: ApiBoardSticker[]) {
  const onServer = new Map(stickers.map((s) => [s.stickerId, s]));
  const keepSpots = (
    stickerId: string,
    spots: Partial<Pick<ApiBoardSticker, "placement" | "largePlacement">>,
  ): StickerPlacement => {
    const before = onServer.get(stickerId);
    if (!before) throw new Error(`${stickerId} never reached you`);
    const s = { ...before, ...spots };
    onServer.set(stickerId, s);
    const { placement, largePlacement, seenAt, arrivedAt } = s;
    return { stickerId, placement, largePlacement, seenAt, arrivedAt };
  };
  const saveStickerPlacement = vi.fn<ApiClient["saveStickerPlacement"]>((stickerId, spots) =>
    Promise.resolve(keepSpots(stickerId, spots)),
  );
  // As the server does: a derived spot only where none is saved.
  const saveLargeLayout = vi.fn<ApiClient["saveLargeLayout"]>((entries) =>
    Promise.resolve(
      entries.map(({ stickerId, largePlacement }) =>
        keepSpots(stickerId, {
          largePlacement: onServer.get(stickerId)?.largePlacement ?? largePlacement,
        }),
      ),
    ),
  );
  const api = emptyApi({
    stickerBoard: () =>
      Promise.resolve({ owner: TEST_OWNER, boardStickers: [...onServer.values()] }),
    saveStickerPlacement,
    saveLargeLayout,
  });
  return { api, onServer, saveStickerPlacement, saveLargeLayout };
}

/** Opens your board on `api`, and lets it load and save the spots it gives. */
async function show(api: ApiClient) {
  const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
  unmount = view.unmount;
  await act(async () => {});
  await act(async () => {});
  return view;
}
```

Add:

```tsx
describe("StickerBoard's two layouts", () => {
  afterEach(() => vi.useRealTimers());

  it("saves a move on a large screen to the large layout alone, leaving the phone's arrangement", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    onAnIpad();
    const a = boardSticker({ placement: at(0.5), largePlacement: at(0.3) });
    const server = boardServer(a);
    const { host } = await show(server.api);
    selectByKeys(host, a.stickerId)("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    await act(async () => {});
    const spots = server.saveStickerPlacement.mock.lastCall?.[1];
    expect(spots?.largePlacement?.x).toBeLessThan(0.3);
    expect(spots).not.toHaveProperty("placement");
    expect(server.onServer.get(a.stickerId)?.placement).toEqual(at(0.5));
  });

  it("lands a new sticker on both layouts once your board has a large layout, from a phone too", async () => {
    onAPhone();
    const fresh = boardSticker();
    const server = boardServer(
      boardSticker({ placement: at(0.5), largePlacement: at(0.4) }),
      fresh,
    );
    await show(server.api);
    expect(server.onServer.get(fresh.stickerId)).toMatchObject({
      placement: { onBoard: true },
      largePlacement: { onBoard: true },
    });
  });

  it("draws a board kept on this device on a large screen only once it has a large layout", () => {
    keep(TEST_ME.id, boardSticker({ placement: at(0.3) }));
    onAnIpad();
    const api = emptyApi({ stickerBoard: () => new Promise(() => {}) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
  });
});
```

`ArtistBoard.test.tsx`: import `onLargeScreen` from `../ui/testing`, and add:

```tsx
describe("ArtistBoard's layouts", () => {
  const shown = (host: HTMLElement) => stickersIn(host).map((el) => el.dataset.stickerId);

  it("shows a visitor the layout for their own size class", async () => {
    // On the phone's board and in the tray in the large layout, and the other way round.
    const phone = boardSticker({
      placement: placedAt(0.3, 0.3),
      largePlacement: { ...placedAt(0.3, 0.3), onBoard: false },
    });
    const large = boardSticker({
      placement: { ...placedAt(0.7, 0.7), onBoard: false },
      largePlacement: placedAt(0.7, 0.7),
    });
    expect(shown(await visit([phone, large]))).toEqual([phone.stickerId]);
    unmount();
    onLargeScreen();
    expect(shown(await visit([phone, large]))).toEqual([large.stickerId]);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/boardSticker.test.ts src/sticker-board/lastBoard.test.ts src/sticker-board/StickerBoard.test.tsx src/sticker-board/ArtistBoard.test.tsx` → FAIL: no `placements`, no `shownIn`, a move saves `placement`, and a visitor on a large screen sees the phone's layout.
- [ ] **Step 3: `placement.ts`.** After `unitOf`:

```ts
/** Every layout, in the order a body that saves spots names them. */
export const BOARD_LAYOUTS = ["phone", "large"] as const satisfies readonly BoardLayout[];

/** A sticker's spots to save, by layout. */
export type Spots = Partial<Record<BoardLayout, Placement>>;

/** `placement` as the one spot to save, in `layout`. */
export const spotsIn = (layout: BoardLayout, placement: Placement): Spots =>
  layout === "large" ? { large: placement } : { phone: placement };

/** The layouts a save's spots are in. */
export const layoutsIn = (spots: Spots) => BOARD_LAYOUTS.filter((layout) => spots[layout]);
```

- [ ] **Step 4: `api/views.ts`.** Import `type Spots` from `../sticker-board/placement` and `type PlacementsRequest` from `@drawing-app/api/client`. After `toApiPlacement`:

```ts
/** A sticker's spots by layout, as the API saves them. */
export const toApiSpots = (spots: Spots): PlacementsRequest => ({
  ...(spots.phone && { placement: toApiPlacement(spots.phone) }),
  ...(spots.large && { largePlacement: toApiPlacement(spots.large) }),
});
```

- [ ] **Step 5: `boardSticker.ts`.** Imports: `type BoardLayout, type Spots` from `./placement` beside `freeSpot, nextZ, type Placement`. `BoardStickerView` gains, after `arrivedAt`:

```ts
/** Its spot in each layout: always the phone's, and the large layout's once the board has one. */
placements: {
  phone: Placement;
  large: Placement | null;
}
```

Its comment becomes:

```ts
/**
 * One of your Sticker Board's stickers as the board shows it: `placement` is its spot in the layout
 * on screen.
 */
```

Replace `UnplacedBoardSticker` and `placeUnplaced` with:

```ts
/** A sticker's spot in each layout; null until that layout first places it. */
export interface Placements {
  phone: Placement | null;
  large: Placement | null;
}

/** A board sticker the board has placed, before it's shown in a layout. */
export type PlacedBoardSticker = Omit<BoardStickerView, "placement">;

/** A board sticker as the API sends it: each spot null until the board first places it there. */
export type UnplacedBoardSticker = Omit<PlacedBoardSticker, "placements"> & {
  placements: Placements;
};

/** Whether the board has a large layout yet: any of its stickers placed in it. */
export const hasLargeLayout = (stickers: readonly { placements: Placements }[]) =>
  stickers.some((s) => s.placements.large !== null);

/** A placed sticker's spots, with `layout`'s moved to `placement`. */
export const movedIn = (
  placements: PlacedBoardSticker["placements"],
  layout: BoardLayout,
  placement: Placement,
): PlacedBoardSticker["placements"] =>
  layout === "large" ? { ...placements, large: placement } : { ...placements, phone: placement };

/** The spots the board gave a sticker, by layout, for saving. */
export interface GivenSpots {
  sticker: PlacedBoardSticker;
  spots: Spots;
}

/** A free spot on top of `taken`, which it joins: on the board, or at that spot in the tray. */
function landIn(taken: Placement[], on: boolean): Placement {
  const placement = { on, ...freeSpot(taken.filter((p) => p.on)), z: nextZ(taken) };
  taken.push(placement);
  return placement;
}

/**
 * Every sticker at a spot in the phone's layout, and in the large layout once the board has one. One
 * the board already holds keeps its spots, since the board's moves are newer than any load. One never
 * placed lands on top in each layout; one you hold that the large layout is missing goes there on the
 * board or in the tray, as on the phone. Each spot given is listed for saving.
 */
export function placeUnplaced(
  loaded: readonly UnplacedBoardSticker[],
  held: readonly PlacedBoardSticker[] = [],
): { stickers: PlacedBoardSticker[]; placed: GivenSpots[] } {
  const heldSpots = new Map(held.map((s) => [s.id, s.placements]));
  const list = loaded.map((s) => ({ ...s, placements: heldSpots.get(s.id) ?? s.placements }));
  const large = hasLargeLayout(list);
  const taken = {
    phone: list.flatMap((s) => s.placements.phone ?? []),
    large: list.flatMap((s) => s.placements.large ?? []),
  };
  const placed: GivenSpots[] = [];
  const stickers = list.map((s): PlacedBoardSticker => {
    const spots: Spots = {};
    const phone = s.placements.phone ?? (spots.phone = landIn(taken.phone, true));
    const inLarge =
      s.placements.large ??
      (large && s.held ? (spots.large = landIn(taken.large, phone.on)) : null);
    const sticker = { ...s, placements: { phone, large: inLarge } };
    if (spots.phone || spots.large) placed.push({ sticker, spots });
    return sticker;
  });
  return { stickers, placed };
}

const views = new WeakMap<PlacedBoardSticker, Partial<Record<BoardLayout, BoardStickerView>>>();

/**
 * Each sticker as the board shows it in `layout`; one that layout hasn't placed (a sticker you gave)
 * shows its phone spot. A sticker that hasn't changed keeps its view, so only moved stickers redraw.
 */
export function shownIn(
  layout: BoardLayout,
  stickers: readonly PlacedBoardSticker[],
): BoardStickerView[] {
  return stickers.map((s) => {
    let byLayout = views.get(s);
    if (!byLayout) views.set(s, (byLayout = {}));
    return (byLayout[layout] ??= { ...s, placement: s.placements[layout] ?? s.placements.phone });
  });
}
```

`toBoardSticker` returns an `UnplacedBoardSticker`, its `placement: …` line becoming:

```ts
    placements: {
      phone: b.placement && toRecordPlacement(b.placement),
      large: b.largePlacement && toRecordPlacement(b.largePlacement),
    },
```

- [ ] **Step 6: `lastBoard.ts`.** `KeptBoard.stickers` becomes `PlacedBoardSticker[]` (import the type and `shownIn` from `./boardSticker`, and `boardLayoutNow` from `./useBoardSize`). `isKept` ends with `&& value.board.stickers.every(hasSpots)`, above it:

```ts
/** A kept sticker holds its spot in each layout. The dev server keeps one build across edits. */
const hasSpots = (s: unknown) => typeof s === "object" && s !== null && "placements" in s;
```

The early decode becomes `for (const sticker of assemblyOf(shownIn(boardLayoutNow(), kept.board.stickers))) {`.

- [ ] **Step 7: `StickerBoard.tsx`.** Imports: from `./boardSticker` add `hasLargeLayout, movedIn, shownIn, type PlacedBoardSticker`; from `./placement` add `layoutsIn, spotsIn, type BoardLayout, type Spots`; from `../api/views` take `toApiSpots` for `toApiPlacement`.

`LoadedBoard.stickers` becomes `PlacedBoardSticker[]`. `heldOver`, `viewOf` and `receivedGiftsOf` take `PlacedBoardSticker`s; `heldOver` compares `placements`:

```ts
function heldOver(list: readonly PlacedBoardSticker[] | null, over: LoadedBoard | null) {
  if (!list || !over?.fromPhone) return list ?? [];
  const keptSpots = new Map(over.stickers.map((s) => [s.id, s.placements]));
  return list.filter((s) => keptSpots.get(s.id) !== s.placements);
}
```

After `stackOf`:

```ts
/** A sticker's spots that didn't save, the layouts they're in, and why. */
interface Unsaved {
  error: ApiError;
  layouts: ReadonlySet<BoardLayout>;
}

/** `was` after a save of `layouts` for `ids`: failed with `error`, or saved when there's none. */
function unsavedAfter(
  was: ReadonlyMap<string, Unsaved>,
  ids: readonly string[],
  layouts: readonly BoardLayout[],
  error: ApiError | null,
): ReadonlyMap<string, Unsaved> {
  if (!error && !ids.some((id) => was.has(id))) return was;
  const next = new Map(was);
  for (const id of ids) {
    const before = next.get(id);
    const left = new Set(before?.layouts);
    for (const layout of layouts) {
      if (error) left.add(layout);
      else left.delete(layout);
    }
    const reason = error ?? before?.error;
    if (left.size > 0 && reason) next.set(id, { error: reason, layouts: left });
    else next.delete(id);
  }
  return next;
}

/** A sticker's spots now, in `layouts`, to save again. */
function spotsOf(s: PlacedBoardSticker, layouts: Iterable<BoardLayout>): Spots {
  const spots: Spots = {};
  for (const layout of layouts) {
    const placement = s.placements[layout];
    if (placement) spots[layout] = placement;
  }
  return spots;
}
```

In the component, the kept board and the stickers:

```tsx
/**
 * The last board this device showed you, drawn at once while the fresh one loads, when it has
 * spots in this screen's layout.
 */
const [fromPhone] = useState(() => {
  const stored = keptBoardFor(account.id);
  return stored && (layout === "phone" || hasLargeLayout(stored.stickers)) ? stored : null;
});
/** The board's stickers as loaded and moved, with their spots in both layouts; `stickers` shows them. */
const [loaded, setStickers] = useState<PlacedBoardSticker[] | null>(
  () => fromPhone?.stickers ?? null,
);
```

`stickers` becomes `useMemo(() => loaded && shownIn(layout, imagesCurrent ? loaded : withoutNsfwDrawings(loaded)), [loaded, imagesCurrent, layout])`. `unsaved` becomes `useState<ReadonlyMap<string, Unsaved>>(() => new Map())`.

Replace `saving` and `save`:

```tsx
/**
 * Stickers whose spots are saving, each with the spots waiting to go once that save settles. One
 * save of a sticker at a time, so an older spot can't land on the server last; spots that wait
 * merge, the latest in each layout winning.
 */
const saving = useRef(new Map<string, Spots | null>());
const save = useCallback(
  (sticker: Pick<BoardSticker, "id" | "no">, spots: Spots) => {
    const inFlight = saving.current;
    if (inFlight.has(sticker.id)) {
      inFlight.set(sticker.id, { ...inFlight.get(sticker.id), ...spots });
      return;
    }
    const send = (body: Spots) => {
      inFlight.set(sticker.id, null);
      const after = (failure: ApiError | null) => {
        const next = inFlight.get(sticker.id);
        if (next) {
          // A failed save's spots go again with the ones that waited, the waiting ones winning.
          send(failure ? { ...body, ...next } : next);
          if (failure) return;
        } else inFlight.delete(sticker.id);
        setUnsaved((was) => unsavedAfter(was, [sticker.id], layoutsIn(body), failure));
      };
      api.saveStickerPlacement(sticker.id, toApiSpots(body)).then(
        () => after(null),
        (error: unknown) => {
          const failure = apiError(error);
          console.error(`Saving where ${formatNo(sticker.no)} sits failed`, failure);
          after(failure);
        },
      );
    };
    send(spots);
  },
  [api],
);
```

The adoption block's `placeUnplaced(…, heldOver(stickers, adopted))` takes `heldOver(loaded, adopted)`, and its landing check reads the layout on screen: `const landing = shownIn(layout, next).find((s) => s.id === landingId);`. `newlyPlaced` is `useState<readonly GivenSpots[]>([])` (import `type GivenSpots`), saved by `for (const { sticker, spots } of newlyPlaced) save(sticker, spots);`. The assembly effect follows the layout on screen, `followBoardAssembly(assemblyOf(shownIn(layout, adopted.stickers)), { fresh: !adopted.fromPhone });` with `[adopted, layout]`.

Moves go to the layout on screen:

```tsx
/** Moves a sticker in the layout on screen; its spot in the other layout stays. */
const setPlacement = (id: string, placement: Placement) =>
  setStickers(
    (list) =>
      list?.map((s) =>
        s.id === id ? { ...s, placements: movedIn(s.placements, layout, placement) } : s,
      ) ?? null,
  );
```

- `removeFromBoard`: `save(sticker, spotsIn(layout, placement));`
- `onCommit`: `save(sticker, spotsIn(layout, moved));`
- `trayBoard.place`: `save(sticker, spotsIn(layout, placement));`
- The alert: `const unsavedErrors = unsavedStickers.flatMap((s) => unsaved.get(s.id)?.error ?? []);`, and its retry `onRetry={() => unsavedStickers.forEach((s) => save(s, spotsOf(s, unsaved.get(s.id)?.layouts ?? [])))}`.

- [ ] **Step 8: `ArtistBoard.tsx`.** Import `placeUnplaced, shownIn` from `./boardSticker`. `stickers` becomes:

```tsx
// What's on their board in the layout this screen shows, bottom of the stack first.
const stickers = useMemo(
  () =>
    shownIn(
      layout,
      placeUnplaced((board.state === "ready" ? board.data.boardStickers : []).map(toBoardSticker))
        .stickers,
    )
      .filter(onTheBoard)
      .sort((a, b) => a.placement.z - b.placement.z),
  [board, layout],
);
```

- [ ] **Step 9:** Step 2's command → PASS. `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board src/api` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 10: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): a board holds each sticker's spot by layout, and saves a move to the layout on screen"`

### Task 6: The large layout derived from the phone's

**Files:** Create `largeLayout.ts`, `largeLayout.test.ts`. Modify `StickerBoard.tsx`, `ArtistBoard.tsx`. Tests: `StickerBoard.test.tsx`, `ArtistBoard.test.tsx`.

- [ ] **Step 1: Write the failing tests.** `largeLayout.test.ts`:

```ts
import { MAX_LARGE_LAYOUT_BATCH } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import { boardSticker } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { deriveLargeLayout, largeSpotFrom, saveDerivedLayout, type LargeSpot } from "./largeLayout";
import { fieldOf, PHONE_BOARD, toPx, unitOf, type BoardSize, type Placement } from "./placement";

const largeBoard = (W: number, H: number): BoardSize => ({ W, H, U: unitOf("large", W) });
const PHONE: BoardSize = { ...PHONE_BOARD, U: unitOf("phone", PHONE_BOARD.W) };
/** iPads' boards in Safari, upright and turned: their viewports less a 72px tab strip. */
const IPADS = [largeBoard(744, 975), largeBoard(820, 1022), largeBoard(1180, 662)];
const spot = (x: number, y: number): Placement => ({ on: true, x, y, s: 0.3, r: 4, z: 2 });
/** How many units apart two spots' centers are drawn on a board. */
const apart = (board: BoardSize, a: Placement, b: Placement) => {
  const field = fieldOf(board.W, board.H);
  const [p, q] = [toPx(field, a), toPx(field, b)];
  return Math.hypot(q.x - p.x, q.y - p.y) / board.U;
};

describe("the large layout derived from the phone's", () => {
  it("keeps the phone's arrangement at the stickers' own size, centered on the board", () => {
    const [a, b] = [spot(0.2, 0.3), spot(0.7, 0.85)];
    for (const ipad of IPADS) {
      expect(apart(ipad, largeSpotFrom(a, ipad), largeSpotFrom(b, ipad))).toBeCloseTo(
        apart(PHONE, a, b),
        2,
      );
      expect(largeSpotFrom(spot(0.5, 0.5), ipad)).toMatchObject({ x: 0.5, y: 0.5 });
      expect(largeSpotFrom(a, ipad)).toMatchObject({ on: a.on, s: a.s, r: a.r, z: a.z });
    }
  });

  it("fits the arrangement to a field shorter than the phone's, edge to edge", () => {
    // An iPad mini turned, in Safari.
    const short = largeBoard(1133, 586);
    expect(fieldOf(short.W, short.H).h).toBeLessThan(fieldOf(PHONE.W, PHONE.H).h);
    expect([largeSpotFrom(spot(0.4, 0), short).y, largeSpotFrom(spot(0.4, 1), short).y]).toEqual([
      0, 1,
    ]);
  });

  it("gives every sticker you hold a spot and lists it for saving, and none to one you gave", () => {
    const placement = { onBoard: true, x: 0.3, y: 0.4, scale: 0.3, rotation: 0, z: 1 };
    const [held, gave] = placeUnplaced(
      [boardSticker({ placement }), boardSticker({ placement, held: false })].map(toBoardSticker),
    ).stickers;
    const { stickers, derived } = deriveLargeLayout([held, gave], IPADS[0]);
    expect(derived.map((d) => d.id)).toEqual([held.id]);
    expect(stickers.map((s) => s.placements.large)).toEqual([derived[0].placement, null]);
  });
});

describe("saving a derived large layout", () => {
  it("sends a layout bigger than one request takes in parts, each sticker once", async () => {
    const derived: LargeSpot[] = Array.from({ length: MAX_LARGE_LAYOUT_BATCH + 1 }, (_, i) => ({
      id: `s${i}`,
      placement: spot(0.5, 0.5),
    }));
    const api = emptyApi();
    const sent = vi.spyOn(api, "saveLargeLayout");
    await saveDerivedLayout(api, derived);
    expect(sent.mock.calls.map(([batch]) => batch.length)).toEqual([MAX_LARGE_LAYOUT_BATCH, 1]);
    expect(new Set(sent.mock.calls.flatMap(([batch]) => batch.map((e) => e.stickerId))).size).toBe(
      derived.length,
    );
  });
});
```

In `StickerBoard.test.tsx`'s `describe("StickerBoard's two layouts")`:

```tsx
it("derives the large layout from the phone's the first time a large screen shows your board, and saves it once", async () => {
  onAnIpad();
  const [left, right] = [
    boardSticker({ placement: at(0.2) }),
    boardSticker({ placement: at(0.8) }),
  ];
  const server = boardServer(left, right);
  await show(server.api);
  expect(server.saveLargeLayout).toHaveBeenCalledOnce();
  expect(server.saveStickerPlacement).not.toHaveBeenCalled();
  const large = (s: ApiBoardSticker) => server.onServer.get(s.stickerId)?.largePlacement?.x ?? NaN;
  // The phone's arrangement at its own size on a wider board: nearer the middle, in the same order.
  expect([large(left) > 0.2, large(right) < 0.8, large(left) < large(right)]).toEqual([
    true,
    true,
    true,
  ]);
  expect([left, right].map((s) => server.onServer.get(s.stickerId)?.placement)).toEqual([
    at(0.2),
    at(0.8),
  ]);
  await act(() => vi.dynamicImportSettled());
  unmount();
  await show(server.api);
  expect(server.saveLargeLayout).toHaveBeenCalledOnce();
});
```

In `ArtistBoard.test.tsx`'s `describe("ArtistBoard's layouts")` (import `fieldOf, PHONE_BOARD` from `./placement`):

```tsx
it("shows a large screen a board with no large layout yet as its phone's arrangement, at its size", async () => {
  onLargeScreen();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1180);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(662);
  const centerX = (el: HTMLElement) =>
    Number(/translate\((-?[\d.]+)px/.exec(el.style.transform)?.[1]) +
    parseFloat(el.style.width) / 2;
  const [left, right] = stickersIn(
    await visit([
      boardSticker({ placement: placedAt(0.1, 0.5) }),
      boardSticker({ placement: placedAt(0.9, 0.5) }),
    ]),
  );
  // As far apart as on the phone's field; spread over this board they'd be most of its width apart.
  expect(centerX(right) - centerX(left)).toBeLessThan(fieldOf(PHONE_BOARD.W, PHONE_BOARD.H).w);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/largeLayout.test.ts src/sticker-board/StickerBoard.test.tsx src/sticker-board/ArtistBoard.test.tsx` → FAIL: no `./largeLayout`, no derivation saved, and the visitor's stickers spread over the board.
- [ ] **Step 3: `largeLayout.ts`:**

```ts
import { MAX_LARGE_LAYOUT_BATCH } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";
import { toApiPlacement } from "../api/views";
import {
  hasLargeLayout,
  placeUnplaced,
  type PlacedBoardSticker,
  type UnplacedBoardSticker,
} from "./boardSticker";
import {
  fieldOf,
  PHONE_BOARD,
  type BoardLayout,
  type BoardSize,
  type Placement,
} from "./placement";

const round4 = (v: number) => Number(v.toFixed(4));

/**
 * Where a sticker's phone spot lands in a large layout derived from the phone's: the phone's whole
 * arrangement at the stickers' own size, centered on the large board's field, fitted to a side too
 * short for it.
 */
export function largeSpotFrom(phone: Placement, board: BoardSize): Placement {
  const from = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
  const to = fieldOf(board.W, board.H);
  // Distances keep their share of a sticker's size: they grow by the unit over the phone board's.
  const k = board.U / PHONE_BOARD.W;
  const spanX = Math.min(1, (from.w * k) / to.w);
  const spanY = Math.min(1, (from.h * k) / to.h);
  return {
    ...phone,
    x: round4(0.5 + (phone.x - 0.5) * spanX),
    y: round4(0.5 + (phone.y - 0.5) * spanY),
  };
}

/** A sticker's spot in a derived large layout. */
export interface LargeSpot {
  id: string;
  placement: Placement;
}

/** The large layout derived from the phone's for a board this big: a spot for each sticker you hold. */
export function deriveLargeLayout(stickers: readonly PlacedBoardSticker[], board: BoardSize) {
  const derived: LargeSpot[] = [];
  const next = stickers.map((s) => {
    if (!s.held || s.placements.large) return s;
    const placement = largeSpotFrom(s.placements.phone, board);
    derived.push({ id: s.id, placement });
    return { ...s, placements: { ...s.placements, large: placement } };
  });
  return { stickers: next, derived };
}

/**
 * Someone else's board in the layout the visitor's screen shows: as its owner laid it out, or, on a
 * large screen whose owner has no large layout yet, derived as their own board will derive it.
 */
export function laidOutForVisitor(
  loaded: readonly UnplacedBoardSticker[],
  layout: BoardLayout,
  board: BoardSize | null,
): PlacedBoardSticker[] {
  const { stickers } = placeUnplaced(loaded);
  if (layout === "phone" || !board || hasLargeLayout(stickers)) return stickers;
  return deriveLargeLayout(stickers, board).stickers;
}

/** Saves a derived large layout where none is saved, in requests the API takes. */
export async function saveDerivedLayout(
  api: Pick<ApiClient, "saveLargeLayout">,
  derived: readonly LargeSpot[],
) {
  const batches: LargeSpot[][] = [];
  for (let i = 0; i < derived.length; i += MAX_LARGE_LAYOUT_BATCH)
    batches.push(derived.slice(i, i + MAX_LARGE_LAYOUT_BATCH));
  const saved = await Promise.all(
    batches.map((batch) =>
      api.saveLargeLayout(
        batch.map(({ id, placement }) => ({
          stickerId: id,
          largePlacement: toApiPlacement(placement),
        })),
      ),
    ),
  );
  return saved.flat();
}
```

- [ ] **Step 4: `StickerBoard.tsx`.** Import `deriveLargeLayout, saveDerivedLayout, type LargeSpot` from `./largeLayout`. Beside `newlyPlaced`: `const [derivedLayout, setDerivedLayout] = useState<readonly LargeSpot[]>([]);`. Right after the adoption block:

```tsx
// The first time a large screen shows your board, the large layout is derived from the phone's, from
// a load of its own: a kept board can be older than a large layout another device saved.
if (
  layout === "large" &&
  size &&
  loaded &&
  adopted &&
  !adopted.fromPhone &&
  !hasLargeLayout(loaded)
) {
  const { stickers: next, derived } = deriveLargeLayout(loaded, size);
  if (derived.length > 0) {
    setStickers(next);
    setAdopted({ ...adopted, stickers: next });
    setDerivedLayout(derived);
  }
}
```

After the effect that saves `newlyPlaced`:

```tsx
// A large layout derived here is saved once, where the server has none; a failure says so, and its
// retry saves each sticker's large spot.
useEffect(() => {
  if (derivedLayout.length === 0) return;
  saveDerivedLayout(api, derivedLayout).catch((error: unknown) => {
    const failure = apiError(error);
    console.error(
      `Saving the large layout derived from your phone's failed for ${derivedLayout.length} stickers`,
      failure,
    );
    setUnsaved((was) =>
      unsavedAfter(
        was,
        derivedLayout.map((d) => d.id),
        ["large"],
        failure,
      ),
    );
  });
}, [api, derivedLayout]);
```

- [ ] **Step 5: `ArtistBoard.tsx`.** Import `laidOutForVisitor` from `./largeLayout`; `stickers` becomes:

```tsx
// What's on their board in the layout this screen shows, bottom of the stack first.
const stickers = useMemo(
  () =>
    shownIn(
      layout,
      laidOutForVisitor(
        (board.state === "ready" ? board.data.boardStickers : []).map(toBoardSticker),
        layout,
        size,
      ),
    )
      .filter(onTheBoard)
      .sort((a, b) => a.placement.z - b.placement.z),
  [board, layout, size],
);
```

`placeUnplaced` leaves the import.

- [ ] **Step 6:** Step 2's command → PASS. `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 7: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): the large layout is derived from the phone's the first time a large screen shows the board"`

### Task 7: Draw, or Give, in the tab row

Port, board side; the slot and its CSS in TabBar are foundations':

```bash
git show 09cfc89e -- apps/frontend/src/sticker-board/StickerBoard.tsx apps/frontend/src/sticker-board/ArtistBoard.tsx apps/frontend/src/sticker-board/StickerBoard.css
git show 810cc081 -- apps/frontend/src/sticker-board/StickerBoard.css
```

Take only the lead-slot hunks: `useTabsLead`, `createPortal`, `drawKeyGroup` and `giveKeyGroup`, `setDraw`/`setGive` to null in the slot with `lead` in the effect's deps, `is-away` with `inert` while turned, and the CSS below. Leave `size.U` (Task 4), 09cfc89e's `visit-head` (5cfbbe97 removed it) and its `.board-gifts` CSS (Task 8 takes 5cfbbe97's). If foundations didn't bring the draft's `.phone:has(.out-of-tickets--over-board) .tabs-lead::after` dim or `.phone.has-tucked-tabs .tabs-lead { display: none; }` (`git show 696123ba:apps/frontend/src/app/TabBar.css`), add them to `TabBar.css` here.

Conflicts to expect: Phase 0 removed the first-selection hint's lines near Draw in `StickerBoard.tsx`; Phase 0's Sui address query sits among `ArtistBoard.tsx`'s state.

**Files:** Modify `StickerBoard.tsx`, `ArtistBoard.tsx`, `StickerBoard.css`. Test: `StickerBoard.test.tsx`.

- [ ] **Step 1: Write the failing test** (import `registerTabsLead` from `../ui/tabsLead`, `onTestFinished` from `vitest`):

```tsx
describe("StickerBoard's Draw on a large screen", () => {
  it("stands at the tab row's left end, in the slot the tab strip keeps, and leaves the board", async () => {
    const slot = document.createElement("div");
    document.body.append(slot);
    registerTabsLead(slot);
    onTestFinished(() => {
      registerTabsLead(null);
      slot.remove();
    });
    onLargeScreen();
    const { host } = await show(emptyApi());
    expect(slot.querySelector(".board-draw")).not.toBeNull();
    expect(host.querySelector(".board-draw")).toBeNull();
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/StickerBoard.test.tsx -t "Draw on a large screen"` → FAIL: Draw is on the board.
- [ ] **Step 3: `StickerBoard.tsx`.** `import { createPortal, flushSync } from "react-dom";` and `import { useTabsLead } from "../ui/tabsLead";`. After `size`: `/** The tab strip's left end, where Draw stands on a large screen. */ const lead = useTabsLead();`. In the effect that measures the name and Draw, `setDraw((was) => (lead ? null : kept(was, boxOf(key))));`, its comment ending `In the tabs' row it's off the board.`, deps `[size, lead]`. Before `front`:

```tsx
// The slot carries the first-sticker hop and ring, so the key keeps its own lip and press. The tickets
// tuck behind the key's right end, in the slot beside it, so they hop along but never press. On a
// large screen it stands in the tabs' row, where it can't turn away with the board, so it hides.
const drawKeyGroup = (
  <>
    <span
      ref={drawSlot}
      className={`board-draw ${firstVisit ? "is-fresh" : ""} ${lead && turned ? "is-away" : ""}`}
      inert={Boolean(lead) && turned}
    >
      <Key
        size="compact"
        icon={<DrawIcon />}
        onClick={drawKey.draw}
        aria-label={
          tickets
            ? t(($) => $.stickerBoard.board.drawLabelWithTickets, {
                tickets: describeTickets(tickets),
              })
            : t(($) => $.stickerBoard.board.drawLabel)
        }
      >
        {t(($) => $.stickerBoard.board.draw)}
      </Key>
      {drawKey.shown && <DrawKeyTickets tickets={drawKey.shown} peel={drawKey.peeling} />}
    </span>
    {firstVisit && (
      <span className="board-nudge" aria-hidden>
        {t(($) => $.stickerBoard.board.firstSticker)}
      </span>
    )}
  </>
);
```

The Key and its tickets are main's as they stand (if Phase 0 changed them, keep Phase 0's). In `front`, the Draw span, its comment and the nudge give way to `{lead ? createPortal(drawKeyGroup, lead) : drawKeyGroup}`, before `{drawKey.overBoard}`.

- [ ] **Step 4: `ArtistBoard.tsx`,** the same for Give: `createPortal`, `useTabsLead`, `setGive((was) => (lead ? null : kept(was, boxOf(key))))` with `[size, lead]`, and:

```tsx
// Give takes Draw's slot as the board's one key; on a large screen it stands in the tabs' row, where
// it can't turn away with the board, so it hides.
const giveKeyGroup = (
  <span
    ref={giveSlot}
    className={`board-draw ${lead && turned ? "is-away" : ""}`}
    inert={Boolean(lead) && turned}
  >
    <Key
      size="compact"
      tone="aqua"
      icon={<GiveIcon />}
      onClick={(e) => {
        giveKey.current = e.currentTarget;
        setSelected(null);
        setGiving(true);
      }}
    >
      {t(($) => $.stickerBoard.artistBoard.give)}
    </Key>
  </span>
);
```

In `front`, `{lead ? createPortal(giveKeyGroup, lead) : giveKeyGroup}` replaces the Give span and its comment.

- [ ] **Step 5: `StickerBoard.css`,** at its end:

```css
/* ---------- Large screens ---------- */

@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  /* Draw has joined the tabs' row, so the board's alerts take the foot it left. */
  .board-alerts {
    left: var(--gutter-large);
    bottom: 14px;
  }

  /* In the tabs' row the key stands in line with the tabs, not over the board; it hides while the
     board is turned over, since it can't turn with it. */
  .tabs-lead .board-draw {
    position: relative;
    left: auto;
    bottom: auto;
    z-index: auto;
    transition: opacity 180ms linear;
  }

  .tabs-lead .board-draw.is-away {
    opacity: 0;
  }

  /* The first-sticker nudge points down at Draw from above the row. */
  .tabs-lead .board-nudge {
    left: 0;
    bottom: calc(100% + 12px);
  }
}

@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) and (prefers-reduced-motion: reduce) {
  .tabs-lead .board-draw {
    transition-duration: 1ms;
  }
}
```

- [ ] **Step 6:** Step 2's command → PASS; `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board src/app` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 7: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): on a large screen Draw, or Give, stands at the tab row's left end"`

### Task 8: One header row

Port:

```bash
git show 5cfbbe97 -- apps/frontend/src/sticker-board/StickerBoard.tsx apps/frontend/src/sticker-board/StickerBoard.css apps/frontend/src/sticker-board/ArtistBoard.tsx
git show 810cc081 -- apps/frontend/src/sticker-board/StickerBoard.css
```

Take: the `head` fragment in `.board-head`, its CSS, the gifts side by side, `.board-who`'s gutter, the 600–699px stacking, and `ArtistBoard`'s chip on phones only. Leave 5cfbbe97's `App.tsx`, `TabBar.*` and `ui/testing.ts` (foundations), `placement.ts` (decision 6) and `stat-board.css` (Task 10). New here: `boxOf` measures through `.board-head`, which the name now sits in (the knob's check reads the name's box on the board).

Conflicts to expect: Phase 0's gifts chip ("Gifts for you" beside its count) may change the badges' heights, which `.board-gifts .pending-gifts-badge`'s 56px matches; check it in Task 11.

**Files:** Modify `StickerBoard.tsx`, `StickerBoard.css`, `ArtistBoard.tsx`, `placement.ts`. Test: `ArtistBoard.test.tsx`.

- [ ] **Step 1: Write the failing test,** in `describe("ArtistBoard's layouts")`:

```tsx
it("leads back to Explore with its chip on a phone, and on a large screen leaves that to the lit Explore tab", async () => {
  expect((await visit(three())).querySelector(".explore-chip")).not.toBeNull();
  unmount();
  onLargeScreen();
  expect((await visit(three())).querySelector(".explore-chip")).toBeNull();
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/ArtistBoard.test.tsx` → FAIL.
- [ ] **Step 3: `ArtistBoard.tsx`.** Before `front`, the Explore chip as main has it:

```tsx
const backToExplore = (
  <button
    type="button"
    className="explore-chip"
    data-press
    onClick={onBack}
    aria-label={t(($) => $.stickerBoard.artistBoard.backToExplore)}
  >
    <CaretLeft size={14} />
    {t(($) => $.stickerBoard.artistBoard.explore)}
  </button>
);
```

In `front`, the chip gives way to `{layout === "phone" && backToExplore}`, after the name, and the comment over the name becomes:

```tsx
{
  /* Their name, the Explore chip and Give come before the stickers, so Tab reaches them first. A
          large screen has no chip: the Explore tab, lit while you visit, is the way back there. */
}
```

- [ ] **Step 4: `StickerBoard.tsx`.** Before `front`, the name button and the gifts as main has them (if Phase 0 changed the badges' props, keep Phase 0's):

```tsx
const head = (
  <>
    <button
      ref={nameButton}
      // Its width is its own until a gifts badge needs the room opposite.
      className={`board-who ${waiting.length > 0 || onTheirWay.length > 0 ? "" : "is-roomy"}`}
      onClick={() => turn(!turned)}
      onPointerDown={() => void StatBoard.preload()}
      onFocus={() => void StatBoard.preload()}
      aria-expanded={turned}
      aria-haspopup="dialog"
      aria-label={t(($) => $.stickerBoard.board.yourStats, { name: me.displayName })}
    >
      <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />
      <span className="board-who-name">{me.displayName}</span>
      <CaretRight className="board-who-cue" size={14} weight="bold" aria-hidden />
    </button>

    {(waiting.length > 0 || onTheirWay.length > 0) && (
      <div className="board-gifts">
        {/* Gifts for you first: they ask to be opened, where gifts on their way only report. */}
        <GiftsForYouBadge gifts={waiting} onOpen={onOpenGift} nudging={idle} />
        <PendingGiftsNotificationBadge gifts={onTheirWay} onOpen={openYours} />
      </div>
    )}
  </>
);
```

In `front`, they give way to:

```tsx
{
  /* Your name and Draw come before the stickers, so Tab reaches them first. On a large screen the
          name and the gifts share one row, so a long name gives way to the gifts rather than under them. */
}
{
  layout === "large" ? <div className="board-head">{head}</div> : head;
}
```

- [ ] **Step 5: `placement.ts`'s `boxOf`:**

```ts
/** An element's box on the board, through any positioned box it sits in, such as the header row. */
export function boxOf(el: HTMLElement): Box {
  let [left, top] = [el.offsetLeft, el.offsetTop];
  for (
    let parent = el.offsetParent;
    parent instanceof HTMLElement && !parent.classList.contains("board");
    parent = parent.offsetParent
  ) {
    left += parent.offsetLeft;
    top += parent.offsetTop;
  }
  return { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight };
}
```

- [ ] **Step 6: `StickerBoard.css`,** inside the large-screen block from Task 7:

```css
/* An iPad's edge margin, wider than the phone's. */
.board-who {
  left: calc(var(--gutter-large) - 2px);
}

/* Your name and the gifts share one row, clear of the zipper's rail: the gifts keep their whole
     length and the name gives way, down to where it would say too little, when the gifts stack. */
.board-head {
  position: absolute;
  z-index: 800;
  left: calc(var(--gutter-large) - 2px);
  right: 40px;
  top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.board-head > .board-who {
  position: relative;
  left: auto;
  top: auto;
  flex: 1 1 auto;
  min-width: 160px;
  max-width: max-content;
}

.board-head > .board-gifts {
  position: relative;
  right: auto;
  top: auto;
  flex: none;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

/* Each as long as what it says rather than cut to a phone's width, and side by side at one height. */
.board-gifts :is(.gifts-for-you-badge, .pending-gifts-badge) {
  width: auto;
  max-width: 300px;
}

.board-gifts .pending-gifts-badge {
  height: 56px;
  padding-block: 5px;
}
```

and after that block:

```css
/* A window too narrow for a long name beside both gifts stacks them, as a phone does. */
@media (min-width: 600px) and (max-width: 699px) and (min-height: 600px) and (any-pointer: coarse) {
  .board-head > .board-gifts {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
}
```

- [ ] **Step 7:** Step 2's command → PASS; `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 8: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): on a large screen the board's header is one row, the name then the gift badges"`

### Task 9: The tray on a large screen

Port:

```bash
git show 09cfc89e -- apps/frontend/src/sticker-board/tray apps/frontend/src/sticker-board/useBoardGestures.ts
git show 212615f7 -- apps/frontend/src/sticker-board/tray
git show 44e77a72 -- apps/frontend/src/sticker-board/tray
git show 810cc081 -- apps/frontend/src/sticker-board/tray
git diff HEAD spike/ipad-board -- apps/frontend/src/sticker-board/tray
```

The last shows what's left between this branch and the draft's tray. Apply every hunk in the list below and leave the rest: hunks Phase 0 wrote its own way for phones keep Phase 0's, and 911d56e4's folder-tab radius isn't this plan's.

1. `trayModel.ts`: `MAX_SCALE` exported as `MAX_STACK_SCALE` (1.5), with its comment; `TrayFit.grow`; `trayFitFor(large, windowFoot)`'s `large` branch (`large && fills > 1 ? Math.min(fills, MAX_STACK_SCALE) : …`, `grow: large ? Math.max(1, scale) : 1`); `trayTop()` answering 80 on a large screen.
2. `trayEngine.ts`: `const large = win.matchMedia(LARGE_SCREEN)` passed to `trayFitFor`, its `change` listener and its removal in `destroy`; `colLeft = () => Wb() - COL * ui.fit.grow`; in `fitTray`, the `grow` branch (a pulled-out sheet goes home at once, `--tray-col`) and `zip.reshape({ chainAt: COL * fit.grow - 15, maxGap: GMAX * fit.grow, stopShort })`; in `onFrame`, `open` over `GMAX * grow` and `bx = lerp(-58 * grow, …)`.
3. `zipper.ts`: `reshape` takes `chainAt` and `maxGap` too, and `o` is the zipper's own copy.
4. `traySheets.ts`: `stackInset()` with `grow` (`SHEET.w * (grow - scale) / 2`), and `stackHome()`.
5. `trayPresses.ts`: `liftOf`; the pulled-out sheet at `grow` (its `--scale`, `pulledAt` × grow, `pulledSize()` in `releasePull` and `settlePulled`, `full = ui.fit.grow` in `movePull`).
6. `trayPeel.ts`: `rectOfFit`'s `k` (the stack's scale on the stack, `grow` pulled out); `slotHome` through `stackHome()`.
7. `traySpread.ts`: `spreadCells(n, W, H, grow)`; `closeSpread` home at `stackHome()`.
8. `trayPaging.ts`: the page drop by `ui.fit.scale`.
9. `sticker-tray.css`: the large-screen block below.
10. Whatever of 44e77a72's every-screen parts Phase 0 didn't bring (Task 0's list): `stopShort`, `openWindow(short)`'s `slider`, `pouchFoot` in the engine, `StickerTray.tsx`'s handle and `useBoardGestures.ts`'s `stow` (09cfc89e's `foot` line).

**Files:** the tray files above, `StickerTray.test.tsx`.

- [ ] **Step 1: Write the failing tests.** In `StickerTray.test.tsx` import `LARGE_SCREEN` from `../../ui/largeScreen` and `MAX_STACK_SCALE` beside `SHEET`. After `peelFrom`:

```ts
/** The screen's media queries: reduced motion as `motion` answers, and a phone's screen unless `large`. */
const media = (motion: MediaQueryList, large = false) => {
  const screen = window.matchMedia(large ? "all" : "(max-width: 1px)");
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === LARGE_SCREEN ? screen : motion,
  );
};
```

`holdAnimations`' `vi.spyOn(window, "matchMedia").mockReturnValue(motion);` becomes `media(motion);`, and `beforeEach`'s becomes `media(window.matchMedia("all"));`. In `describe("on a board of this height")`, `openOn` measures the column from `trayTop()`, and if Phase 0 didn't bring the draft's `openStack`, add it after `numbersIn`:

```ts
/**
 * The open stack's scale, where its foot (with the edges and the +N button) ends, and where the
 * open mouth ends, in the column's px.
 */
const openStack = (height: number) => {
  const [, stackTop = NaN, scale = NaN] = numbersIn(stackEl());
  const [, mouthFootShift = NaN] = numbersIn(board.querySelector(".tray__w2"));
  const stackFoot = stackTop + scale * SHEET.h + STACK_FOOT;
  return { scale, stackFoot, mouthFoot: height - trayTop() + mouthFootShift };
};
```

Then add:

```ts
it("grows the stack on a large screen, and opens the mouth only a little past it", async () => {
  media(window.matchMedia("all"), true);
  await openOn(1200, 60);
  const { scale, stackFoot, mouthFoot } = openStack(1200);
  expect(scale).toBeGreaterThan(1);
  expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
  expect(mouthFoot - stackFoot).toBeLessThan(STACK_FOOT);
});

it("never grows the stack past its most, however tall the board", async () => {
  media(window.matchMedia("all"), true);
  await openOn(3000, 60);
  expect(openStack(3000).scale).toBe(MAX_STACK_SCALE);
});

it("keeps a short large screen's stack about the phone's size", async () => {
  media(window.matchMedia("all"), true);
  await openOn(666, 60);
  const { scale, stackFoot, mouthFoot } = openStack(666);
  expect(scale).toBeCloseTo(1, 0);
  expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/tray` → the three new tests FAIL (no growth on a large screen); the rest pass.
- [ ] **Step 3:** Apply the list. `sticker-tray.css`, at its end:

```css
/* On a large screen the sheets grow; the NEW dots stuck on them and a pulled-out sheet's X keep their
   size, stuck on by the same hand as every other. The header row is taller, so the tray starts lower
   (trayTop() in trayModel.ts reads the same query). */
@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse) {
  .tray {
    --tray-top: 80px;
  }

  .tray__new,
  .tray__x {
    scale: calc(1 / var(--scale, 1));
  }
}
```

- [ ] **Step 4:** Step 2's command → PASS. `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 5: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): on a large screen the tray's sheets grow up to 1.5x to fill its pouch, and it starts under the header row"`

### Task 10: The stat board on a large screen

Port:

```bash
git show 09cfc89e -- apps/frontend/src/sticker-board/stat-board/StatCork.tsx apps/frontend/src/sticker-board/stat-board/settings-note.css
git show 15ad67ed -- apps/frontend/src/sticker-board/stat-board
git show 0b313803 -- apps/frontend/src/sticker-board/stat-board/stat-board.css
git show a4d507b0 -- apps/frontend/src/sticker-board/stat-board/stat-board.css
git show 696123ba -- apps/frontend/src/sticker-board/stat-board/stat-board.css
```

Each rewrote the last; port the final state, `git show spike/ipad-board:apps/frontend/src/sticker-board/stat-board/stat-board.css`, from its "Large screens" section to the end, with decision 8's change. Leave the receipt, Bests, Settings' rows and Flip back's place on phones: Phase 0's.

Conflicts to expect: none in the appended CSS; `StatCork.tsx`'s root class line if Phase 0 touched it.

**Files:** Modify `stat-board/stat-board.css`, `settings-note.css`, `StatCork.tsx`.

- [ ] **Step 1: Your own stat board's class.** If Task 0 didn't find `stat-board--own`, StatCork's root takes `className={f.own ? "stat-board stat-board--own" : "stat-board"}`.
- [ ] **Step 2: The draft's large-screen CSS:**

```bash
git show spike/ipad-board:apps/frontend/src/sticker-board/stat-board/stat-board.css \
  | sed -n '/---------- Large screens: the stat board/,$p' >> apps/frontend/src/sticker-board/stat-board/stat-board.css
git show spike/ipad-board:apps/frontend/src/sticker-board/stat-board/settings-note.css \
  | sed -n '/A large screen keeps the card at a readable width/,$p' >> apps/frontend/src/sticker-board/stat-board/settings-note.css
```

- [ ] **Step 3: Zoom the papers only (decision 8).** In the appended `stat-board.css`, each `.stat-board__cork { zoom: N; }` becomes `.stat-board__cork { --papers-zoom: N; }`, and each `.stat-board--own .stat-board__cork { zoom: N; }` becomes `.stat-board--own .stat-board__cork { --papers-zoom: N; }` (the short landscape's `zoom: 1` too). The comment over the first zoom block becomes `/* A large cork pins its stat papers a size up as far as the cluster fits, so they fill it as they fill a phone's rather than floating small in the middle. Settings, Flip back and the slip are controls, which keep their phone size. */`. In the "Your own, upright or turned" block, the grid's `var(--side-w)` column becomes `calc(var(--side-w) * var(--papers-zoom, 1))`. Then, in the first large-screen block:

```css
.stat-board__stats,
.stat-board--own .stat-board__cork > .address-papers {
  zoom: var(--papers-zoom, 1);
}
```

`rg -n "zoom:" apps/frontend/src/sticker-board/stat-board/stat-board.css` → only that rule.

- [ ] **Step 4: A first look,** before Task 11's checks: start Task 0's servers on this branch, and capture the stat board, yours and bob's, at 820×1094 and 1180×734 in Chromium. Nothing scrolls on your own at 1180×734 (cork `scrollHeight` ≤ `clientHeight`); if it does, lower that size's `--papers-zoom` and note the value.
- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm --filter frontend exec vitest run src/sticker-board/stat-board` and `pnpm --filter frontend typecheck` → pass.
- [ ] **Step 6: Commit.** `git add apps/frontend/src && git commit -m "feat(frontend): on a large screen the stat board is one centered cluster in the phone's order, Settings under your own"`

### Task 11: Check it in WebKit and Chromium

Judge the captures through `/impeccable adapt`, after reading DESIGN.md. Restart Task 0's servers on this branch: the API applies the new migration as it starts.

- [ ] **Step 1: Phones unchanged.** `record.js branch` at 390×844, both engines, and compare with the baseline: every sticker's transform, width and height, and every recorded box, are equal; `compare -metric AE` of each pair of screenshots is 0, or the difference is explained and fixed.
- [ ] **Step 2: The large layout, derived.** In Chromium, alice's first large screen, 820×1094:
  - one `POST /api/sticker-boards/me/large-layout` and no `PATCH` (`page.on("request")`);
  - `GET /api/sticker-boards/me` from the page: every sticker she holds has a `largePlacement`, every `placement` equals the baseline's;
  - each pair of her stickers' centers is as many sticker lengths apart as at 390×844, within 1%, and the arrangement's middle is the field's;
  - each sticker's long side equals its long side at 390×844, within 0.5px.
- [ ] **Step 3: Kept on the phone after an edit on an iPad**, the one check the brief turns on, in both engines (WebKit after Chromium, on the layout saved there):
  1. At 390×844, save `GET /api/sticker-boards/me`'s `placement`s and `record.js` the board.
  2. At 820×1094, drag one sticker 120px right, tap another and press Arrange's Bigger twice, and Remove a third; wait for the saves.
  3. `GET /api/sticker-boards/me`: every `placement` equals step 1's; those three stickers' `largePlacement`s changed, and the removed one's `onBoard` is false there only.
  4. Back at 390×844: the board's record equals step 1's.
- [ ] **Step 4: Each large size,** 744×1047, 820×1094, 1133×658 and 1180×734, both engines, as alice and as bob visiting her:
  - **The board:** bob sees her large layout at large sizes and her phone's at 390×844, sticker for sticker. No `.placed-sticker` box leaves the board.
  - **Turning:** 820×1094 to 1180×734 (`setViewportSize`): each sticker's center keeps its share of the field within 0.5%, and its size within 0.5px.
  - **A new sticker:** alice seals one at 390×844 (Draw, a stroke, the seal check twice about 700ms apart); `GET` shows it on the board in both layouts, and at 820×1094 it's on her board.
  - **The tab row:** `.tabs-lead .board-draw` holds Draw (Give on bob's view), its center level with the tabs' within 4px; Draw's first-sticker nudge shows above it for a new person (`?as=board-fresh`). On bob's view there's no `.explore-chip`, and the lit Explore tab leads back to Explore.
  - **The header:** with a gift waiting for alice and one of hers on its way, her name and both badges share one row: their tops within 4px, the badges side by side at one height, clear of the zipper's rail. At 744×1047 with a long name (`?as=board-a-very-long-line-name`), the name gives way and the badges stay whole.
  - **The knob:** select the sticker nearest her name; where its knob would sit under the name, it hangs below the sticker.
  - **The tray:** open it (`page.touchscreen.tap` on `.zip__tab--front`). The rail runs from 80px to the board's foot; the stack's scale is above 1 where the board is tall and at most 1.5; the open mouth ends under the stack's foot with less lining than `STACK_FOOT`; `.tray__new` is its 390×844 size. Peel a sticker onto the board, pull a sheet out (its X at its phone size), and drag a board sticker to the Zipper: each works as on a phone.
  - **The stat board:** tap her name. In the order receipt over Bests over the SINCE tape, the leaf over the stamps, then the address paper; the cluster's center within 2px of the cork's; Settings centered under it on hers; Flip back within 24px of the top left. Flip back and Settings' rows are their 390×844 heights. Nothing scrolls at 1133×658 and 1180×734. Bob's view: the same order, his address paper a column of its own.
  - **Gratitude events,** once `2026-10-08-ipad-shop-and-cards.md` has landed: "See where it came from" opens a card centered within 1px, at most 480px wide, with no tear strip; Escape and the scrim close it.
  - **Japanese:** at 1180×734 with `locale: "ja-JP"`, the header row, the tab row and the stat board hold together.
  - No `pageerror` or console error in any run.
- [ ] **Step 5:** Fix what the checks find in one batch, run them once more, and report each tuned value (`--papers-zoom` per size, any px). Stop both servers.
- [ ] **Step 6: Commit** any fixes: `git add apps/frontend/src && git commit -m "fix(frontend): the iPad board and stat board, from the browser checks"`

### Task 12: DESIGN.md and PRODUCT.md

- [ ] **Step 1: DESIGN.md, Layout.** After the paragraph that begins "The sticker board is free-form, not a grid.", add: "On a large screen the board has a layout of its own, the large layout, kept beside the phone's. Stickers keep their phone size, a share of the phone board's 390px width, and the extra room is board. The first time a large screen shows your board, its large layout is your phone's arrangement at that size, centered; from then on each layout is arranged on its own, a new sticker lands on both, and visitors see the layout for their own screen. Turning the screen keeps each sticker's share of the board and its size. The header is one row: your name, then the gift badges side by side, clear of the zipper's rail. Draw, or Give on someone else's board, stands at the tab strip's left end."
- [ ] **Step 2: DESIGN.md, components.**
  - **Someone else's board:** after the sentence on the Explore back chip, "On a large screen there's no chip: the lit Explore tab leads back."
  - **Sticker tray,** after **The sheets:**'s sentence on a short phone: "On a large screen the rail runs the board's height from under the header row, 80px down, and the stack grows up to 1.5× to fill the pouch, its column and the mouth's travel growing with it; its NEW dots and a pulled-out sheet's X keep their size."
  - **The stat board,** a bullet after **Controls:**: "**On a large screen:** the papers in the phone's order as one centered cluster: the receipt over Bests over the SINCE tape, the leaf over the stamps, then the address paper. Your own puts Settings under the cluster, centered, no wider than 460px. Flip back stays at the top left; turned, it rides over the cork's corner. The stat papers are pinned a size up as far as the cluster fits; controls keep their phone size."
- [ ] **Step 3: PRODUCT.md,** in **The sticker board** bullet, after its first sentence: "On an iPad the board has a layout of its own: the first time, your phone's arrangement at the same size; from then on, arranging one leaves the other as it was. Visitors see the layout for their own screen."
- [ ] **Step 4:** If ad0ll has approved decision 11, add "Large layout" to AGENTS.md's vocabulary in their words.
- [ ] **Step 5: Commit.** `git add DESIGN.md PRODUCT.md AGENTS.md && git commit -m "docs: the large layout, the iPad board's header and tray, and the stat board's cluster"`

### Task 13: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check:full` → lint, typecheck, tests, the format check, the Move tests, the build and knip's report pass. `pnpm --filter frontend test:e2e` (the phone's core loop) passes.
- [ ] **Step 2:** Squash the branch into `feat: the iPad board keeps a large layout of its own beside the phone's, with its tray and stat board` and the docs commit, with no AI attribution lines.
- [ ] **Step 3:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push. A conflicting migration number means rebasing, deleting this branch's migration and generating it again (Task 1, Step 4).
- [ ] **Step 4:** Delete the worktree, the branch, `data/scratch/board-and-stat-board/` and `apps/frontend/vite.board.config.ts`, and this plan in a `docs:` commit; the brief stays for the plans still open. Report the decisions still **Open** to ad0ll, and the tuned values.

## Self-review

- **Brief coverage:**
  - Stickers keep their phone size; the extra room is board: Task 4, checked in Task 11 Step 2.
  - A separate large layout per board, stored beside the phone's: Tasks 1–3, 5.
  - Derived from the phone's the first time it's shown: Task 6.
  - Then edited on its own: Task 5's saves to the layout on screen; Task 11 Step 3 is the check the brief turns on.
  - A new sticker lands on both: Task 5's `placeUnplaced`, its test, and Task 11.
  - Visitors see the layout for their own size class: Task 2's visitor list, Tasks 5 and 6, Task 11.
  - The board follows the screen when it turns: decision 7, Task 4, Task 11.
  - Draw (Give) at the tab row's left end: Task 7; the slot and the quieter tabs are foundations'.
  - One header row; the lit Explore tab leads back: Task 8; the tab's caret is foundations'.
  - The zipper runs the board's height; sheets grow up to 1.5×: Task 9 (the phone's run to the foot is Phase 0's).
  - The stat board in the phone's order, one centered cluster, Settings under it, Flip back at the top left: Task 10 (Flip back's phone place is Phase 0's). Gratitude events as a centered card: `2026-10-08-ipad-shop-and-cards.md`'s Task 5, checked in Task 11.
  - Phones unchanged: Task 0's baseline against Task 11 Step 1, and the e2e core loop.
- **Placeholders:** none. Code for main's own parts that move (Draw's and Give's keys, the name and gifts, the Explore chip) is main's as it stands today; where Phase 0 changed one, its version moves instead. Ports name their commits, the hunks to take and the hunks to leave.
- **Names, as defined and used:** db `largeOnBoard`…`largeZ`; API `placementsRequestSchema`/`PlacementsRequest`, `largeLayoutRequestSchema`/`LargeLayoutEntry`, `MAX_LARGE_LAYOUT_BATCH`, `largeColumns`, `savePlacements`, `neverReached`, `saveDerivedLargeLayout`, `LARGE_SPOT`; client `saveStickerPlacement(stickerId, spots)`, `saveLargeLayout(entries)`, `toApiSpots`; board `BoardLayout`, `BOARD_LAYOUTS`, `Spots`, `spotsIn`, `layoutsIn`, `PHONE_BOARD`, `BoardSize`, `unitOf`, `useBoardLayout`, `boardLayoutNow`, `useBoardSize(ref, layout)`, `Placements`, `PlacedBoardSticker`, `UnplacedBoardSticker`, `GivenSpots`, `hasLargeLayout`, `movedIn`, `placeUnplaced`, `shownIn`, `largeSpotFrom`, `LargeSpot`, `deriveLargeLayout`, `laidOutForVisitor`, `saveDerivedLayout`; tray `MAX_STACK_SCALE`; tests `onLargeScreen`, `onAnIpad`, `boardServer`, `show`.
- **Risks:** Phase 0's and foundations' names (Task 0 checks them first); Phase 0's tray port, which decides how much of Task 9's list is left; a migration number taken on main meanwhile (Task 13, Step 3).
- **Not in this plan:** a sticker held mid-drag while the iPad turns keeps the draft's behavior (it moves by the finger's travel in px from where it started) and settles on the turned board when let go.
