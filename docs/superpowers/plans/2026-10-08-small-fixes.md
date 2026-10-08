# Phase 0: Small Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the design brief's "Phase 0" (`docs/superpowers/specs/2026-10-08-ipad-design-brief.md`) on main, at every size, before any iPad plan.

**Architecture:** One branch, `fix/small-fixes`, from current main; fourteen tasks in order. Draft items come from `spike/ipad-board` with `git show <sha> -- <paths> | git apply -3`; their conflicting hunks are ported by hand as each task says. New items, and ports that differ from the draft's code, come as checked diffs and scripts below. No large-screen rules.

**Tech Stack:** React + TypeScript (Vite), Hono API on Node 24, Drizzle/SQLite, vitest + happy-dom, Playwright, oxlint/oxfmt.

---

## Ground rules

- **Checked:** Tasks 1–6 and 8–14 ran in order in a scratch worktree on main at 056d3cfa (since: two docs-only commits). Unit tests, typecheck, lint, format, knip and `pnpm test:e2e` passed; Chromium captures at 390×844 (en, ja) and 820×1094 looked right. The scratch is deleted. Conflicts below are from that run. Task 7 (Language) is new and wasn't run.
- **Order:** tasks in order; each diff applies to the tree the task before it left. If main moved: `git -C "$W" rebase main`, then a 3-way apply that conflicts in a file main changed keeps main's change and redoes this task's part by hand.
- **W** is your worktree's root. Never a bare `cd`: `git -C "$W" …`, `(cd "$W" && …)`. Draft shas resolve from any worktree (shared objects).
- **Hand-port files:** every fenced block whose first line is `# phase0/<name>` (or `// phase0/<name>`) is a file; Task 0 extracts them to `/tmp/phase0/`. Apply a diff with `git -C "$W" apply --3way /tmp/phase0/<name>`; run a script with `(cd "$W" && python3 /tmp/phase0/<name>)`.
- **Tests:** frontend `(cd "$W" && pnpm --filter frontend exec vitest run <paths>)`, API `(cd "$W" && pnpm --filter @drawing-app/api exec vitest run <paths>)`, paths relative to the package. Each new test has a red check: make that edit, watch the test fail, undo it.
- **Every task ends** with `(cd "$W" && pnpm --filter frontend typecheck && pnpm --filter frontend lint)` (and the API's when it changed), then a conventional commit with explicit paths. Task 15's squash drops AI attribution lines (AGENTS.md).
- **Subagents:** one per task, each in its own worktree: `git switch -c fix/small-fixes-<n> <tip of fix/small-fixes>`, `pnpm install --frozen-lockfile --prefer-offline`, `git checkout -- .` if tracked files are missing. The coordinator fast-forwards `fix/small-fixes` to the lane's commit and removes its worktree.

## Other work

| Work                                                                  | On main                                                                                                                                            | Phase 0                                                                                                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marking 18+ (`2026-10-08-mark-18-plus-anytime.md`)                    | built, plan deleted (4021bd80); the 18+ box in the armed seal chip, no first-visit tip (5629756a, `fix/seal-step-18-plus`), Mark 18+ on the detail | builds on it: Show 18+ stickers keeps its switch and status lines; the Sealed card keeps its 18+ mark                                                                      |
| Kyoto Seika Practice Mode (`2026-10-07-kyoto-seika-practice-mode.md`) | built; one phone check left                                                                                                                        | no shared files; run the check any time. Phase 0 keeps Kyoto Seika's Settings group (legend, help, note, switch, Dark subjects, credit) and the Sealed card's subject pair |
| e2e suite (056d3cfa)                                                  | `pnpm test:e2e`, 4 specs                                                                                                                           | keeps every name it reads; Task 15 runs it                                                                                                                                 |
| iPad plans (84eed5b8, 4cd9f5bf, more coming)                          | written against Phase 0's names                                                                                                                    | the board plan's Task 9 brings the draft's tray names (`trayFitFor`, `TrayFit`, `trayTop()`, `--scale`) with the stack's growth; Task 10 keeps main's phone structure      |

## Task 0: Worktree and hand-port files

- [ ] Check open PRs don't already do this: `gh pr list --state open`.
- [ ] Worktree:

```bash
W=/Users/adoll/projects/drawing-app/.claude/worktrees/small-fixes
git -C /Users/adoll/projects/drawing-app worktree add "$W" -b fix/small-fixes main
(cd "$W" && pnpm install --frozen-lockfile --prefer-offline)
```

- [ ] Extract the hand-port files:

````bash
mkdir -p /tmp/phase0 && python3 - /Users/adoll/projects/drawing-app/docs/superpowers/plans/2026-10-08-small-fixes.md <<'PY'
import pathlib, re, sys
plan = pathlib.Path(sys.argv[1]).read_text()
for body in re.findall(r"```(?:diff|python|js)\n((?:#|//) phase0/[^\n]+\n.*?)```", plan, re.S):
    name = body.split("\n", 1)[0].split("phase0/", 1)[1].strip()
    pathlib.Path("/tmp/phase0", name).write_text(body)
    print("wrote", name)
PY
````

Expected: 11 files.

## Task 1: Someone else's Sui address: route and client (draft)

- [ ] Port: `git -C "$W" show e3a451c6 -- apps/api/src/routes/stickerBoards.ts apps/api/src/routes/stickerBoards.test.ts apps/api/src/services/privySuiWallets.ts apps/api/src/services/privySuiWallets.test.ts apps/frontend/src/api/apiClient.ts apps/frontend/src/api/httpApi.ts apps/frontend/src/api/testing.tsx apps/frontend/src/i18n/strings/errors.ts | git -C "$W" apply -3`. Conflicts: none.
- [ ] Test: API `src/routes/stickerBoards.test.ts src/services/privySuiWallets.test.ts`. Red check: delete the route's `if (owner.suiAddress) return …` line; "asking Privy only until it's kept" fails.
- [ ] Commit `feat(api): someone else's Sui address, kept on their row once Privy answers`.

## Task 2: Your gratitude events: route and client (draft)

- [ ] Port: `git -C "$W" show 8ba750b3 -- apps/api/src/client.ts apps/api/src/gratitude/events.ts apps/api/src/routes/gratitude.ts apps/api/src/routes/gratitudeReads.test.ts apps/frontend/src/api/apiClient.ts apps/frontend/src/api/httpApi.ts apps/frontend/src/api/testing.tsx | git -C "$W" apply -3`. Conflicts: none once Task 1 is in (its client lines are this hunk's context).
- [ ] Don't port 8c41c9e4: `GRATITUDE_EVENTS_PAGE` stays exported for the paging test.
- [ ] Apply `2-events-paging.diff` (new test: more than a page, half the combos at one time, Direct and Residual mixed; every combo once, newest first):

```diff
# phase0/2-events-paging.diff
diff --git a/apps/api/src/routes/gratitudeReads.test.ts b/apps/api/src/routes/gratitudeReads.test.ts
index c43b013a..98f46c56 100644
--- a/apps/api/src/routes/gratitudeReads.test.ts
+++ b/apps/api/src/routes/gratitudeReads.test.ts
@@ -8,7 +8,7 @@ import {
   unseenGratitudeCount,
   unseenGratitudeSchema,
 } from "../gratitude/feed.ts";
-import { gratitudeEventsSchema } from "../gratitude/events.ts";
+import { GRATITUDE_EVENTS_PAGE, gratitudeEventsSchema } from "../gratitude/events.ts";
 import { gzipReplay } from "../gratitude/replay.ts";
 import { tapReplay } from "../gratitude/testReplays.ts";
 import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
@@ -117,6 +117,37 @@ describe("GET /api/gratitude/events", () => {
     ]);
     expect(next).toBeNull();
   });
+
+  it("pages back through every combo once, newest first, Direct and Residual together", async () => {
+    const me = insertUser(test.db);
+    const friend = insertUser(test.db);
+    const other = insertUser(test.db);
+    // More than a page, half recorded at each time, so a page ends among combos recorded together.
+    const count = GRATITUDE_EVENTS_PAGE + 2;
+    const giftIds = Array.from({ length: count }, (_, i) => {
+      const createdAt = i < count / 2 ? NEWER : OLDER;
+      if (i % 2 === 0) return giftWithGratitude(me, friend, { ...OWN_TAP, createdAt }).giftId;
+      const drawn = insertSealedSticker(test.db, me);
+      return sendGratitude(test.db, drawn, other, friend, { ...SHARED_TAP, createdAt }).giftId;
+    });
+
+    const shown: { giftId: string; recordedAt: string }[] = [];
+    let pages = 0;
+    let before: string | null = null;
+    do {
+      const query: string = before === null ? "" : `?before=${before}`;
+      const response = await test.send("GET", `/api/gratitude/events${query}`, { as: me });
+      const page = await bodyOf(response, gratitudeEventsSchema);
+      shown.push(...page.events);
+      before = page.next;
+      pages++;
+    } while (before !== null);
+
+    expect(pages).toBeGreaterThan(1);
+    expect(shown.map((event) => event.giftId).sort()).toEqual(giftIds.sort());
+    const times = shown.map((event) => Date.parse(event.recordedAt));
+    expect(times).toEqual(times.toSorted((a, b) => b - a));
+  });
 });

 describe("GET /api/gratitude/:giftId", () => {
```

- [ ] Test: API `src/routes/gratitudeReads.test.ts`. Red check: in `events.ts` make the cursor's tie-break `lt(gratitude.giftId, "")`; the paging test fails.
- [ ] Commit `feat(api): your gratitude events, newest first, a page at a time`.

## Task 3: The receipt's total, your gratitude events sheet, Best day (draft)

- [ ] Port:

```bash
F=apps/frontend/src; SB=$F/sticker-board/stat-board
git -C "$W" show 0b313803 -- $F/i18n/strings/stickerBoard.ts $SB/StatCork.tsx $SB/StatCork.test.tsx $SB/statFigures.ts | git -C "$W" apply -3
git -C "$W" show 8ba750b3 -- $F/i18n/strings/stickerBoard.ts $SB/GratitudeEvents.tsx $SB/GratitudeEvents.test.tsx $SB/gratitude-events.css $SB/StatBoard.tsx | git -C "$W" apply -3
git -C "$W" show 911d56e4 -- $SB/GratitudeEvents.tsx | git -C "$W" apply -3
```

- [ ] Conflicts, ported by hand:
  - `StatCork.tsx` from 8ba750b3 (its base had `useLargeScreen` and `side`): add only the `QuietLink` import, the `onShowGratitude?: () => void` prop and its destructuring, and the link block under the total.
  - `stat-board.css` from 0b313803 and e3a451c6 (large-screen context): rename `.stat-board__receipt-heart` to `.stat-board__heart` (both rules; its comment adds "It's the printed papers' mark: the receipt's heading and Best day"); delete the `.stat-board__receipt-rows` rules and `.stat-board__receipt-total .fine`; `.stat-board__receipt-total` becomes `margin: 10px 0 0` and its `b` 40px; add `.stat-board__receipt-more { margin-top: 4px; }`; Bests rows become `display: flex; flex-wrap: wrap; align-items: flex-start; column-gap: 8px`, `dt { flex: 1 1 auto }`, `dd { margin: 0 0 0 auto }`, and the `@container (max-width: 205px)` block goes; add `.stat-board__scrap-rows .stat-board__heart { margin-right: 4px; vertical-align: -1px; }`.
  - `gratitude-events.css`: delete the `@media (min-width: 600px) …` card block (the shop-and-cards plan's); add 911d56e4's `.gratitude-events__heart { flex: none; color: var(--pink); }`, its other hunks being that card's.
- [ ] Test: frontend `src/sticker-board/stat-board`. Red checks: make StatCork's link condition `false` (GratitudeEvents test fails); `gratitude: stats.gratitude.direct` in `statFigures.ts` (the one-total test fails).
- [ ] Commit `feat(frontend): the receipt says your gratitude in one figure, your gratitude events open from it, and Best day keeps to one line`.

## Task 4: Their Sui address on their stat board, and the paper's copy (draft + new)

- [ ] Port: `git -C "$W" show e3a451c6 -- apps/frontend/src/sticker-board/ArtistBoard.tsx apps/frontend/src/sticker-board/stat-board/AddressDialog.tsx apps/frontend/src/sticker-board/stat-board/AddressPapers.tsx apps/frontend/src/sticker-board/stat-board/address-papers.css | git -C "$W" apply -3`. Conflicts: none.
- [ ] Not ported: e3a451c6's `StatCork.tsx`, `stickerBoard.ts` and `stat-board.css` (Settings and large-screen hunks). Apply `4-sui-address.diff`: the `side` slot, their address strings, and the new copy: no "Sui Testnet" line on the paper (`addresses.sui.network` goes), gloss "Holds your stickers" / "Holds their stickers" (ja シールの保管用), and the test.

```diff
# phase0/4-sui-address.diff
diff --git a/apps/frontend/src/i18n/strings/stickerBoard.ts b/apps/frontend/src/i18n/strings/stickerBoard.ts
index 2939dcb0..322c3572 100644
--- a/apps/frontend/src/i18n/strings/stickerBoard.ts
+++ b/apps/frontend/src/i18n/strings/stickerBoard.ts
@@ -99,23 +99,18 @@ export const stickerBoard = {
     /** Your stat board, opened outside LINE's app: the button under Flip back that logs out of LINE */
     logOut: { en: "Log out of LINE", ja: "LINEからログアウト" },
   },
-  /** Your Sui address as a QR code on the cork, and the dialog that holds it up. */
+  /** A Sui address as a QR code on the cork, yours or someone else's, and the dialog that holds it up. */
   addresses: {
     sui: {
-      /** Your stat board: the caption on the Sui address's QR code paper */
+      /** Stat board, yours or someone else's: the caption on the Sui address's QR code paper */
       caption: { en: "Sui address", ja: "Suiアドレス" },
-      /** Your stat board: the network's name under the Sui address paper's caption */
-      network: { en: "Sui Testnet", ja: "Sui Testnet" },
-      /** Your stat board: fine print on the Sui address paper, under its network, saying what the address is for */
-      gloss: {
-        en: "Keeps your stickers and pays for reserve tickets",
-        ja: "シールの保管・<wbr/>有償チケットの<wbr/>支払い用",
-      },
+      /** Your stat board: fine print on the Sui address paper, under its caption, saying what the address is for */
+      gloss: { en: "Holds your stickers", ja: "シールの保管用" },
       /** Your stat board: screen readers' name for the Sui address paper, a button that holds its QR code up in the address dialog */
       open: { en: "Show your Sui address as a QR code", ja: "SuiアドレスをQRコードで表示" },
       /** Your stat board: on the Sui address paper while the address loads */
       loading: { en: "Getting your Sui address…", ja: "Suiアドレスを<wbr/>取得しています…" },
-      /** Your stat board: on the Sui address paper when the address didn't load, over Try again */
+      /** Stat board, yours or someone else's: on the Sui address paper when the address didn't load, over Try again */
       didntLoad: { en: "Sui address didn’t load", ja: "Suiアドレスを<wbr/>読み込めませんでした" },
       /** Address dialog for the Sui address: its heading, under the large QR code */
       title: { en: "Your Sui address", ja: "あなたのSuiアドレス" },
@@ -140,8 +135,37 @@ export const stickerBoard = {
         en: "View on Suiscan: your Sui address",
         ja: "SuiアドレスをSuiscanで見る",
       },
+      /** Someone else's Sui address, on their stat board; {{name}} is the board owner's LINE name. */
+      theirs: {
+        /** Someone else's stat board: fine print on the Sui address paper, under its caption, saying what the address is for */
+        gloss: { en: "Holds their stickers", ja: "シールの保管用" },
+        /** Someone else's stat board: screen readers' name for the Sui address paper, a button that holds its QR code up in the address dialog */
+        open: {
+          en: "Show {{name}}’s Sui address as a QR code",
+          ja: "{{name}}さんのSuiアドレスをQRコードで表示",
+        },
+        /** Someone else's stat board: on the Sui address paper while the address loads */
+        loading: { en: "Getting their Sui address…", ja: "Suiアドレスを<wbr/>取得しています…" },
+        /** Address dialog for someone else's Sui address: its heading, under the large QR code */
+        title: { en: "{{name}}’s Sui address", ja: "{{name}}さんのSuiアドレス" },
+        /** Address dialog for someone else's Sui address: screen readers' name for the large QR code */
+        qrCode: {
+          en: "QR code of {{name}}’s Sui address",
+          ja: "{{name}}さんのSuiアドレスのQRコード",
+        },
+        /** Address dialog for someone else's Sui address: the note under the address */
+        note: {
+          en: "{{name}}’s stickers are kept at this address on Sui Testnet.",
+          ja: "{{name}}さんのシールは、<wbr/>Sui Testnetの<wbr/>このアドレスに<wbr/>保管されます。",
+        },
+        /** Address dialog for someone else's Sui address: screen readers' name for the Suiscan link */
+        viewOnExplorerLabel: {
+          en: "View on Suiscan: {{name}}’s Sui address",
+          ja: "{{name}}さんのSuiアドレスをSuiscanで見る",
+        },
+      },
     },
-    /** Your stat board: the link on the Sui address paper when its address didn't load */
+    /** Stat board, yours or someone else's: the link on the Sui address paper when its address didn't load */
     tryAgain: { en: "Try again", ja: "もう一度" },
     /** Address dialog: screen readers' name for the X button that puts the paper back on the cork */
     close: { en: "Close", ja: "閉じる" },
diff --git a/apps/frontend/src/sticker-board/ArtistBoard.test.tsx b/apps/frontend/src/sticker-board/ArtistBoard.test.tsx
index 1d1cd091..97d09030 100644
--- a/apps/frontend/src/sticker-board/ArtistBoard.test.tsx
+++ b/apps/frontend/src/sticker-board/ArtistBoard.test.tsx
@@ -5,10 +5,12 @@ import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import type { ApiClient } from "../api/apiClient";
 import { boardSticker, gift, people, sticker } from "../api/testFixtures";
 import { emptyApi, renderWithApi, TEST_OWNER } from "../api/testing";
+import { toPerson } from "../api/views";
 import type { GiftSender } from "../giving/giftSender";
 import { PREPARING_SLOW_MS } from "../giving/giveFlow";
 import { forgetGreetings } from "./artistChipGreeting";
 import { ArtistBoard } from "./ArtistBoard";
+import { shortAddress } from "./stat-board/addresses";

 // Someone's stat board mounts behind the front; nothing here needs LINE.
 vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
@@ -242,3 +244,21 @@ describe("ArtistBoard's Give key", () => {
     expect(document.activeElement).toBe(give);
   });
 });
+
+describe("ArtistBoard's stat board", () => {
+  const SUI_ADDRESS = `0x${"5".repeat(64)}`;
+
+  it("pins their Sui address at the foot of the leaf-and-stamps column, named for them", async () => {
+    const suiAddress = vi.fn<ApiClient["suiAddress"]>(() => Promise.resolve(SUI_ADDRESS));
+    const host = await visit(three(), { suiAddress });
+    expect(suiAddress).toHaveBeenCalledWith(people.ken.id);
+    const paper = host.querySelector(".stat-board__col--b .address-papers__face");
+    expect(paper?.textContent).toContain(shortAddress(SUI_ADDRESS));
+    expect(paper?.getAttribute("aria-label")).toContain(toPerson(people.ken).name);
+  });
+
+  it("pins no address paper while they have no Sui wallet", async () => {
+    const host = await visit(three(), { suiAddress: () => Promise.resolve(null) });
+    expect(host.querySelector(".address-papers")).toBeNull();
+  });
+});
diff --git a/apps/frontend/src/sticker-board/stat-board/AddressPapers.tsx b/apps/frontend/src/sticker-board/stat-board/AddressPapers.tsx
index ee4e4273..916592b7 100644
--- a/apps/frontend/src/sticker-board/stat-board/AddressPapers.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/AddressPapers.tsx
@@ -77,9 +77,6 @@ export function AddressPapers({ sui, whose, lifted, paperRef, onOpen }: Props) {
       <span className="fine address-papers__caption">
         {t(($) => $.stickerBoard.addresses.sui.caption)}
       </span>
-      <span className="fine address-papers__chain">
-        {t(($) => $.stickerBoard.addresses.sui.network)}
-      </span>
       <span className="fine address-papers__gloss keep-phrases" id={glossId}>
         {whose === undefined
           ? t(($) => $.stickerBoard.addresses.sui.gloss)
diff --git a/apps/frontend/src/sticker-board/stat-board/StatCork.tsx b/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
index da6eee48..737f0ffd 100644
--- a/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
@@ -59,6 +59,8 @@ interface Props {
   afterFlipBack?: ReactNode;
   /** Paper pinned below the stats, such as your addresses and Settings. */
   children?: ReactNode;
+  /** Paper at the foot of the leaf-and-stamps column, such as someone else's Sui address. */
+  side?: ReactNode;
   /** Opens your gratitude events, from a link under the receipt's total; your own board only. */
   onShowGratitude?: () => void;
   ref?: Ref<StatCorkHandle>;
@@ -113,6 +115,7 @@ export function StatCork({
   onEscape,
   afterFlipBack,
   children,
+  side,
   onShowGratitude,
   ref,
 }: Props) {
@@ -354,6 +357,7 @@ export function StatCork({
                 ))}
               </div>

+              {side}
               <LabelButton
                 ref={flipBackRef}
                 size="sm"
diff --git a/apps/frontend/src/sticker-board/stat-board/address-papers.css b/apps/frontend/src/sticker-board/stat-board/address-papers.css
index 1a9c9897..d7a59ac3 100644
--- a/apps/frontend/src/sticker-board/stat-board/address-papers.css
+++ b/apps/frontend/src/sticker-board/stat-board/address-papers.css
@@ -1,4 +1,4 @@
-/* ---------- Your Sui address as a QR code on white label stock ---------- */
+/* ---------- A Sui address, yours or someone else's, as a QR code on white label stock ---------- */

 /* Under Settings, centered. */
 .address-papers {
@@ -53,7 +53,6 @@

 /* The lines under the code may run into the side margins, which only the code needs clear. */
 .address-papers__caption,
-.address-papers__chain,
 .address-papers__gloss,
 .address-papers__address,
 .address-papers__status {
@@ -61,7 +60,7 @@
   margin-inline: -6px;
 }

-/* What the address is for, under its network. */
+/* What the address is for, under its caption. */
 .address-papers__gloss {
   margin-top: 5px;
   text-wrap: balance;
```

- [ ] Test: frontend `src/sticker-board/ArtistBoard.test.tsx src/sticker-board/stat-board`. Red check: drop `{side}` from StatCork; "pins their Sui address" fails.
- [ ] Commit `feat(frontend): someone else's stat board pins their Sui address, and the paper says what it holds`.

## Task 5: Flip back at the stat board's top left (new)

- [ ] Apply `5-flip-back.diff`: Flip back, and Log out of LINE after it (outside LINE's app), move from the foot of the leaf-and-stamps column to `.stat-board__head`, first in the cork.

```diff
# phase0/5-flip-back.diff
diff --git a/apps/frontend/src/i18n/strings/stickerBoard.ts b/apps/frontend/src/i18n/strings/stickerBoard.ts
index 322c3572..06bd96fe 100644
--- a/apps/frontend/src/i18n/strings/stickerBoard.ts
+++ b/apps/frontend/src/i18n/strings/stickerBoard.ts
@@ -96,7 +96,7 @@ export const stickerBoard = {
     },
     /** Stat board: the Flip back button, which turns the board back over to its stickers */
     flipBack: { en: "Flip back", ja: "表に戻す" },
-    /** Your stat board, opened outside LINE's app: the button under Flip back that logs out of LINE */
+    /** Your stat board, opened outside LINE's app: the button after Flip back, at the top left, that logs out of LINE */
     logOut: { en: "Log out of LINE", ja: "LINEからログアウト" },
   },
   /** A Sui address as a QR code on the cork, yours or someone else's, and the dialog that holds it up. */
diff --git a/apps/frontend/src/sticker-board/stat-board/StatCork.test.tsx b/apps/frontend/src/sticker-board/stat-board/StatCork.test.tsx
index 9e8bea4f..db670ac9 100644
--- a/apps/frontend/src/sticker-board/stat-board/StatCork.test.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/StatCork.test.tsx
@@ -195,6 +195,18 @@ describe("StatCork's Bests", () => {
   });
 });

+describe("StatCork's Flip back", () => {
+  it("comes first on the stat board, before the papers, for keyboards and screen readers too", () => {
+    // The receipt's Try again is a button among the papers.
+    render(null);
+    const buttons = [...host.querySelectorAll(".stat-board__cork button")].map(
+      (b) => b.textContent,
+    );
+    expect(buttons).toContain("Try again");
+    expect(buttons[0]).toBe("Flip back");
+  });
+});
+
 describe("StatCork's bare cork", () => {
   it("turns the board back for a tap on it", () => {
     const onFlipBack = vi.fn();
diff --git a/apps/frontend/src/sticker-board/stat-board/StatCork.tsx b/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
index 737f0ffd..6932bead 100644
--- a/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/StatCork.tsx
@@ -55,7 +55,7 @@ interface Props {
   flipBackRef: Ref<HTMLButtonElement>;
   /** Escape closes this first when it returns true, before flipping back. */
   onEscape?: () => boolean;
-  /** Labels under Flip back, such as logging out of LINE on your own board. */
+  /** Labels after Flip back, such as logging out of LINE on your own board. */
   afterFlipBack?: ReactNode;
   /** Paper pinned below the stats, such as your addresses and Settings. */
   children?: ReactNode;
@@ -189,6 +189,20 @@ export function StatCork({
                 : t(($) => $.stickerBoard.statBoard.loadingTheirs, { name: f.name })
               : ""}
           </p>
+          {/* At the top left, where the name that turns the board over sits on its front, so it comes
+              first for keyboards and screen readers too. */}
+          <div className="stat-board__head">
+            <LabelButton
+              ref={flipBackRef}
+              size="sm"
+              icon={<ArrowUUpLeft />}
+              className="stat-board__flip-back"
+              onClick={onFlipBack}
+            >
+              {t(($) => $.stickerBoard.statBoard.flipBack)}
+            </LabelButton>
+            {afterFlipBack}
+          </div>
           <div className="stat-board__stats">
             <div className="stat-board__col stat-board__col--a">
               <section
@@ -358,16 +372,6 @@ export function StatCork({
               </div>

               {side}
-              <LabelButton
-                ref={flipBackRef}
-                size="sm"
-                icon={<ArrowUUpLeft />}
-                className="stat-board__flip-back"
-                onClick={onFlipBack}
-              >
-                {t(($) => $.stickerBoard.statBoard.flipBack)}
-              </LabelButton>
-              {afterFlipBack}
             </div>
           </div>

diff --git a/apps/frontend/src/sticker-board/stat-board/stat-board.css b/apps/frontend/src/sticker-board/stat-board/stat-board.css
index 6cb17e81..f5ca9b1f 100644
--- a/apps/frontend/src/sticker-board/stat-board/stat-board.css
+++ b/apps/frontend/src/sticker-board/stat-board/stat-board.css
@@ -80,8 +80,17 @@
   display: none;
 }

-/* The stats are pinned up together, so Flip back ends the right column level with the left one's
-   foot rather than across a stretch of bare cork. */
+/* Flip back at the top left, where the name that turns the board over sits on its front, then any
+   label after it. */
+.stat-board__head {
+  display: flex;
+  flex-wrap: wrap;
+  align-items: center;
+  gap: 8px 12px;
+  margin-bottom: 16px;
+}
+
+/* The stats, pinned up together in two columns. */
 .stat-board__stats {
   display: grid;
   /* The right column keeps the stamps' width; a narrow phone takes the rest from the left. */
@@ -110,7 +119,7 @@
   container-type: inline-size;
 }

-/* Flip back rides at its foot, in the thumb's reach. */
+/* The leaf over the stamps, and on someone else's stat board their Sui address paper. */
 .stat-board__col--b {
   grid-area: b;
   display: flex;
@@ -582,18 +591,10 @@
   }
 }

-/* The way back, as label stock on the cork. */
-.stat-board__flip-back {
-  align-self: stretch;
-  gap: 8px;
-  margin-top: auto;
-}
-
-/* Far enough below Try again that their touch bands don't overlap. */
+/* The way back, and logging out of LINE after it, as label stock on the cork. */
+.stat-board__flip-back,
 .stat-board__logout {
-  align-self: stretch;
   gap: 8px;
-  margin-top: 8px;
 }

 /* Privy's sign-in starts its own part of the slip, as a sentence with Try again after a failure. */
```

- [ ] Test: frontend `src/sticker-board/stat-board src/sticker-board/StickerBoard.test.tsx src/sticker-board/ArtistBoard.test.tsx`. Red check: move `.stat-board__head` back under the stamps; "comes first on the stat board" fails.
- [ ] Commit `feat(frontend): Flip back leads the stat board at its top left on every screen`.

## Task 6: Settings in rows (draft, adapted)

- [ ] Don't port e3a451c6's `SettingsNote.tsx`, `SettingsNote.test.tsx`, `settings-note.css` or settings strings: main added Kyoto Seika's group to all four after the draft branched, and its CSS reads the legend, note and switch rules the draft deletes. Apply `6-settings.diff`, the draft's two rows on main's note: Language one row (an unseen `<select>` over it, the pick in Graphite with a caret), Show 18+ stickers one switch row (no legend, note or `aria-describedby`; `settings.nsfw.title` and `.about` go), settings split by dashed rules, Kyoto Seika's legend keeping 12px under its rule.

```diff
# phase0/6-settings.diff
diff --git a/apps/frontend/src/i18n/strings/stickerBoard.ts b/apps/frontend/src/i18n/strings/stickerBoard.ts
index 06bd96fe..43dc7e01 100644
--- a/apps/frontend/src/i18n/strings/stickerBoard.ts
+++ b/apps/frontend/src/i18n/strings/stickerBoard.ts
@@ -172,14 +172,14 @@ export const stickerBoard = {
     /** Address dialog: the Copy address button under the card */
     copy: { en: "Copy address", ja: "アドレスをコピー" },
   },
-  /** The Settings note, the first paper under the stats on your cork back. */
+  /** The Settings note, the first paper under the stats on your stat board. */
   settings: {
     /** Your stat board: the title of the Settings note, the first paper under the stats on the cork, which peeks up from the cork's foot until it's scrolled into view */
     title: { en: "Settings", ja: "設定" },
     /** Settings note: the status line while a setting saves, which screen readers announce */
     saving: { en: "Saving…", ja: "保存しています…" },
     language: {
-      /** Settings note: the heading over the language choices */
+      /** Settings note: the language row's name, before the choice it shows, which opens the list of choices */
       title: { en: "Language", ja: "言語" },
       /** Settings note: the first language choice, which follows LINE's language; {{language}} is that language's own name, such as "日本語" */
       sameAsLine: { en: "Same as LINE ({{language}})", ja: "LINEと同じ（{{language}}）" },
@@ -208,15 +208,8 @@ export const stickerBoard = {
     },
     /** The NSFW opt-in, a second setting under Language. */
     nsfw: {
-      /** Settings note: the heading over the NSFW opt-in's switch */
-      title: { en: "18+ stickers", ja: "18+のシール" },
       /** Settings note: the NSFW opt-in's switch, off until you turn it on; on, 18+ stickers show unblurred and you can receive them */
       show: { en: "Show 18+ stickers", ja: "18+のシールを表示する" },
-      /** Settings note: the note under the NSFW opt-in's switch, saying who it's for and what it changes */
-      about: {
-        en: "For people 18 or older. On, 18+ stickers show unblurred, and you can receive them. Off, they’re blurred, yours too.",
-        ja: "18歳以上の方向けです。オンにすると、18+のシールがぼかしなしで表示され、受け取れるようになります。オフにすると、自分のものも含めてぼかして表示されます。",
-      },
       /** Settings note: the status line once Show 18+ stickers has been turned on and saved */
       shown: {
         en: "18+ stickers now show unblurred.",
diff --git a/apps/frontend/src/sticker-board/stat-board/SettingsNote.test.tsx b/apps/frontend/src/sticker-board/stat-board/SettingsNote.test.tsx
index cf951c70..a16d423c 100644
--- a/apps/frontend/src/sticker-board/stat-board/SettingsNote.test.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/SettingsNote.test.tsx
@@ -47,14 +47,23 @@ const saving = () =>
     Promise.resolve({ ...TEST_ME, languageChoice: choice }),
   );

-const option = (host: HTMLElement, label: string) => {
-  const found = [...host.querySelectorAll("label")].find((l) => l.textContent === label);
-  const input = found?.querySelector("input");
-  if (!input) throw new Error(`No option ${label}`);
-  return input;
+const picker = (host: HTMLElement) => {
+  const found = host.querySelector("select");
+  if (!found) throw new Error("No language select on the note");
+  return found;
 };

-const choose = (host: HTMLElement, label: string) => act(async () => option(host, label).click());
+/** The language the select has picked, as it names it. */
+const picked = (host: HTMLElement) => picker(host).selectedOptions[0]?.textContent;
+
+const choose = (host: HTMLElement, label: string) =>
+  act(async () => {
+    const select = picker(host);
+    const choice = [...select.options].find((o) => o.textContent === label);
+    if (!choice) throw new Error(`No language ${label}`);
+    select.value = choice.value;
+    select.dispatchEvent(new Event("change", { bubbles: true }));
+  });

 /** Show 18+ stickers, the note's first switch. */
 const switchOf = (host: HTMLElement) => {
@@ -78,7 +87,7 @@ describe("the Settings note's language", () => {
     expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja", "en");
     expect(readChosenLanguage()).toBe("ja");
     expect(currentLanguage()).toBe("ja");
-    expect(option(host, "日本語").checked).toBe(true);
+    expect(picked(host)).toBe("日本語");
     expect(statuses(host)[0]).toBe(
       i18next.t(($) => $.stickerBoard.settings.language.applied, { language: "日本語" }),
     );
@@ -89,7 +98,7 @@ describe("the Settings note's language", () => {
     await i18next.changeLanguage("ja");
     const setLanguageChoice = saving();
     const host = render(setLanguageChoice, "ja");
-    expect(option(host, "日本語").checked).toBe(true);
+    expect(picked(host)).toBe("日本語");
     await choose(host, "LINEと同じ（English）");
     expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith(null, "en");
     expect(readChosenLanguage()).toBeNull();
@@ -104,7 +113,7 @@ describe("the Settings note's language", () => {
     expect(alert(host)).toContain(errors.network.en);
     expect(host.textContent).toContain("Failed to fetch");
     expect(readChosenLanguage()).toBeNull();
-    expect(option(host, "Same as LINE (English)").checked).toBe(true);
+    expect(picked(host)).toBe("Same as LINE (English)");
     expect(currentLanguage()).toBe("en");
   });

@@ -127,10 +136,13 @@ describe("the Settings note's language", () => {
     await i18next.changeLanguage("ja");
     const host = render(saving());
     expect(host.querySelector("h3")?.textContent).toBe("設定");
-    expect(host.querySelector("legend")?.textContent).toBe("言語");
-    expect(
-      [...host.querySelectorAll("label:has(input[type=radio])")].map((l) => l.textContent),
-    ).toEqual(["LINEと同じ（English）", "English", "日本語"]);
+    const name = picker(host).getAttribute("aria-labelledby") ?? "";
+    expect(document.getElementById(name)?.textContent).toBe("言語");
+    expect([...picker(host).options].map((o) => o.textContent)).toEqual([
+      "LINEと同じ（English）",
+      "English",
+      "日本語",
+    ]);
   });
 });

@@ -139,11 +151,10 @@ describe("the Settings note's 18+ switch", () => {
     vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) => Promise.resolve({ ...TEST_ME, nsfwOptIn }));
   const keepABoard = () => keepBoard(TEST_ME.id, { owner: toPerson(TEST_OWNER), stickers: [] });

-  it("is off until turned on, and says what it does", () => {
+  it("is off until turned on", () => {
     const host = renderNote({});
     expect(switchOf(host).checked).toBe(false);
     expect(switchOf(host).closest("label")?.textContent).toBe("Show 18+ stickers");
-    expect(host.textContent).toContain("For people 18 or older.");
   });

   it("saves it to your account, forgets the board kept on this phone, and says the stickers show", async () => {
@@ -182,11 +193,6 @@ describe("the Settings note's 18+ switch", () => {
   it("reads in Japanese", async () => {
     await i18next.changeLanguage("ja");
     const host = renderNote({});
-    expect([...host.querySelectorAll("legend")].map((l) => l.textContent)).toEqual([
-      "言語",
-      "18+のシール",
-      "入試",
-    ]);
     expect(host.querySelector("label:has(input[role='switch'])")?.textContent).toBe(
       "18+のシールを表示する",
     );
@@ -278,7 +284,7 @@ describe("the Settings note's saves", () => {
   }
   /** The 18+ setting's alert, under its switch. */
   const nsfwProblem = (host: HTMLElement) =>
-    switchOf(host).closest("fieldset")?.querySelector('[role="alert"]')?.textContent;
+    switchOf(host).closest(".settings-note__setting")?.querySelector('[role="alert"]')?.textContent;

   it("keeps a setting's failure while another setting saves, until that setting saves", async () => {
     vi.spyOn(console, "error").mockImplementation(() => {});
@@ -319,7 +325,7 @@ describe("the Settings note's saves", () => {

     await act(async () => answerLanguage());
     expect(server.setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
-    expect(option(host, "English").checked).toBe(true);
+    expect(picked(host)).toBe("English");
     expect(switchOf(host).checked).toBe(true);
     expect(statuses(host)).toEqual([
       i18next.t(($) => $.stickerBoard.settings.language.applied, { language: "English" }),
diff --git a/apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx b/apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx
index 13c8182c..e1e3ba6d 100644
--- a/apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx
+++ b/apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx
@@ -12,7 +12,7 @@ import { currentLanguage } from "../../i18n/i18n";
 import { keepChosenLanguage, type Language } from "../../i18n/language";
 import { followLanguageChoice, lineLanguage } from "../../i18n/pageLanguage";
 import { Trans, useTranslation } from "../../i18n/react";
-import { Question } from "../../icons";
+import { CaretDown, Question } from "../../icons";
 import { CensorBar } from "../../kyoto-seika/CensorBar";
 import { openLinkInLine } from "../../line/openLink";
 import { useTickets } from "../../tickets/useTickets";
@@ -99,7 +99,7 @@ function usePeek(note: RefObject<HTMLElement | null>, title: RefObject<HTMLEleme
 }

 /**
- * Your Settings, the first paper under the stats on your cork back. Each setting saves to your account
+ * Your Settings, the first paper under the stats on your stat board. Each setting saves to your account
  * and applies in place: `me` takes the server's answer, and every screen follows it. A language is
  * also kept on this phone for the first screens of the next start.
  */
@@ -261,49 +261,51 @@ export function SettingsNote() {
         <h3 ref={title} className="settings-note__title" id={`${id}-title`}>
           {t(($) => $.stickerBoard.settings.title)}
         </h3>
-        <fieldset className="settings-note__setting" aria-busy={saving("language")}>
-          <legend className="fine settings-note__legend">
-            {t(($) => $.stickerBoard.settings.language.title)}
-          </legend>
-          {CHOICES.map((choice) => (
-            <label key={choice ?? "line"} className="settings-note__option">
-              <input
-                type="radio"
-                name={`${id}-language`}
-                checked={shown.languageChoice === choice}
-                onChange={() => choose(choice)}
-              />
-              {/* A language's own name is in that language, for screen readers too. */}
-              <span lang={choice ?? undefined}>{label(choice)}</span>
-            </label>
-          ))}
+        <div className="settings-note__setting" aria-busy={saving("language")}>
+          {/* One row with its choice at the end. The select lies unseen over the whole row, so a tap
+              anywhere on it opens the phone's own list of choices. */}
+          <div className="settings-note__option settings-note__choice">
+            <span id={`${id}-language`}>{t(($) => $.stickerBoard.settings.language.title)}</span>
+            <span className="settings-note__picked" aria-hidden>
+              <span lang={shown.languageChoice ?? undefined}>{label(shown.languageChoice)}</span>
+              <CaretDown size={16} weight="bold" />
+            </span>
+            <select
+              className="settings-note__select"
+              aria-labelledby={`${id}-language`}
+              value={shown.languageChoice ?? ""}
+              onChange={(event) =>
+                choose(CHOICES.find((choice) => (choice ?? "") === event.target.value) ?? null)
+              }
+            >
+              {CHOICES.map((choice) => (
+                // A language's own name is in that language, for screen readers too.
+                <option key={choice ?? "line"} value={choice ?? ""} lang={choice ?? undefined}>
+                  {label(choice)}
+                </option>
+              ))}
+            </select>
+          </div>
           <p className="fine settings-note__status" role="status">
             {statusLine("language")}
           </p>
           {problem("language")}
-        </fieldset>
-        <fieldset className="settings-note__setting" aria-busy={saving("nsfw")}>
-          <legend className="fine settings-note__legend">
-            {t(($) => $.stickerBoard.settings.nsfw.title)}
-          </legend>
+        </div>
+        <div className="settings-note__setting" aria-busy={saving("nsfw")}>
           <label className="settings-note__option settings-note__switch">
             <span>{t(($) => $.stickerBoard.settings.nsfw.show)}</span>
             <input
               type="checkbox"
               role="switch"
               checked={shown.nsfwOptIn}
-              aria-describedby={`${id}-nsfw-about`}
               onChange={() => switchNsfw(!shown.nsfwOptIn)}
             />
           </label>
-          <p className="settings-note__about" id={`${id}-nsfw-about`}>
-            {t(($) => $.stickerBoard.settings.nsfw.about)}
-          </p>
           <p className="fine settings-note__status" role="status">
             {statusLine("nsfw")}
           </p>
           {problem("nsfw")}
-        </fieldset>
+        </div>
         <fieldset
           className="settings-note__setting"
           data-setting="kyoto-seika"
diff --git a/apps/frontend/src/sticker-board/stat-board/settings-note.css b/apps/frontend/src/sticker-board/stat-board/settings-note.css
index 97e1f467..35818564 100644
--- a/apps/frontend/src/sticker-board/stat-board/settings-note.css
+++ b/apps/frontend/src/sticker-board/stat-board/settings-note.css
@@ -1,4 +1,4 @@
-/* ---------- Settings: an index card taped on your cork back, first under the stats ---------- */
+/* ---------- Settings: an index card taped on your stat board, first under the stats ---------- */

 /* Until it scrolls into view it sticks to the cork's foot, tucked down so only its title peeks up
    (SettingsNote measures the tuck). While it peeks it rides over the stats above it. */
@@ -24,7 +24,7 @@
 }

 .settings-note__title {
-  margin: 0;
+  margin: 0 0 2px;
   padding-bottom: 10px;
   border-bottom: 1.5px solid var(--ink);
   font: 800 18px/1.1 var(--font-ui);
@@ -32,13 +32,24 @@
   letter-spacing: -0.01em;
 }

+/* A setting: its row, or a legend over its rows, then its status line and any error. */
 .settings-note__setting {
   min-width: 0;
   margin: 0;
-  padding: 12px 0 0;
+  padding: 0;
   border: 0;
 }

+/* Each setting under the first is set off by a dashed rule, as the rows are. */
+.settings-note__setting + .settings-note__setting {
+  border-top: 1px dashed var(--rule);
+}
+
+/* A legend over a setting's rows keeps a little room under the rule. */
+.settings-note__setting:has(> .settings-note__legend) {
+  padding-top: 12px;
+}
+
 /* Floated, the legend sits in the card like a heading rather than set into a border. */
 .settings-note__legend {
   float: left;
@@ -49,54 +60,65 @@
   letter-spacing: 0.1em;
 }

-/* A ruled row per choice, the whole row its touch target. */
+/* A row per setting, the whole row its touch target: its name, then its control at the end. */
 .settings-note__option {
   display: flex;
   clear: both;
   align-items: center;
+  justify-content: space-between;
   gap: 12px;
   min-height: 44px;
-  border-bottom: 1px dashed var(--rule);
   font: 650 15px/1.25 var(--font-ui);
   touch-action: manipulation;
 }

-.settings-note__option:last-of-type {
-  border-bottom: 0;
+.settings-note__status {
+  clear: both;
+  margin: 0 0 8px;
 }

-.settings-note__option input {
-  flex: none;
-  width: 22px;
-  height: 22px;
-  margin: 0;
-  border: 1.5px solid var(--graphite);
-  border-radius: 50%;
-  background: var(--canvas);
-  appearance: none;
+/* Under a switch's note, rather than right under its row. */
+.settings-note__about + .settings-note__status {
+  margin-top: 8px;
 }

-.settings-note__option input:checked {
-  border-color: var(--ink);
-  background: radial-gradient(circle, var(--ink) 0 5px, var(--canvas) 5.5px);
+.settings-note__status:empty {
+  display: none;
 }

-.settings-note__option input:focus-visible {
-  outline: 2px solid var(--ink);
-  outline-offset: 3px;
+.settings-note__problem {
+  margin: 0 0 8px;
 }

-.settings-note__status {
-  clear: both;
-  margin: 8px 0 0;
+/* Language's row: the choice it shows, with a caret, and the unseen select over the whole row. */
+.settings-note__choice {
+  position: relative;
 }

-.settings-note__status:empty {
-  display: none;
+.settings-note__picked {
+  display: flex;
+  align-items: center;
+  gap: 6px;
+  min-width: 0;
+  color: var(--graphite);
 }

-.settings-note__problem {
-  margin: 6px 0 8px;
+.settings-note__select {
+  position: absolute;
+  inset: 0;
+  width: 100%;
+  height: 100%;
+  margin: 0;
+  opacity: 0;
+  font: inherit;
+  appearance: none;
+  cursor: pointer;
+}
+
+.settings-note__choice:has(.settings-note__select:focus-visible) {
+  border-radius: 3px;
+  outline: 2px solid var(--ink);
+  outline-offset: 2px;
 }

 /* Washi across both top corners. */
@@ -116,27 +138,21 @@
   transform: rotate(27deg);
 }

-/* Under the first setting, a second one: set off by a dashed rule, as the rows are. */
-.settings-note__setting + .settings-note__setting {
-  margin-top: 12px;
-  border-top: 1px dashed var(--rule);
-}
-
-/* The NSFW opt-in's one row: its words, then a switch at the row's end, filled Bonbon Pink when on.
-   The thumb is a gradient so it needs no pseudo-element, which a checkbox may not carry. */
-.settings-note__switch {
-  justify-content: space-between;
-}
-
+/* A switch at its row's end, filled Bonbon Pink when on. The thumb is a gradient so it needs no
+   pseudo-element, which a checkbox may not carry. */
 .settings-note__switch input {
+  flex: none;
   width: 46px;
   height: 28px;
+  margin: 0;
+  border: 1.5px solid var(--graphite);
   border-radius: 999px;
   background-color: var(--canvas);
   background-image: radial-gradient(circle, var(--graphite) 0 8px, transparent 8.5px);
   background-repeat: no-repeat;
   background-size: 22px 22px;
   background-position: 2px 50%;
+  appearance: none;
 }

 .settings-note__switch input:checked {
@@ -146,6 +162,11 @@
   background-position: calc(100% - 2px) 50%;
 }

+.settings-note__switch input:focus-visible {
+  outline: 2px solid var(--ink);
+  outline-offset: 3px;
+}
+
 @media (prefers-reduced-motion: no-preference) {
   .settings-note__switch input {
     transition:
```

- [ ] Test: frontend `src/sticker-board/stat-board/SettingsNote.test.tsx`. Red check: make the select's `onChange` call `choose(null)`; "saves a choice to your account" fails.
- [ ] Commit `feat(frontend): Settings in rows: Language shows its choice, Show 18+ stickers is one switch`.

## Task 7: Language is English or 日本語 (new; not run in the scratch)

The brief: "Same as LINE" goes; a new account starts in LINE's language (the device's outside LINE, `liff.getAppLanguage()`, which `lineLanguage()` reads); Settings offers English and 日本語.

Today: `users.language_choice` is null ("follow LINE") or `en`/`ja`; `users.language` is the language in effect. Sign-in sets `language = coalesce(language_choice, <LINE's>)` (`apps/api/src/routes/session.ts`); `POST /api/me/language-choice` takes `{ languageChoice, language }` and sets `language = languageChoice ?? language`; `SessionGate.tsx` re-signs-in when `languageChoice === null && language !== lineLanguage()`.

- [ ] **DB** (`packages/db/src/schema/users.ts`): `languageChoice` becomes `.notNull()`. `pnpm --filter @drawing-app/db db:generate` writes the table rebuild; in it, copy `coalesce(language_choice, language)` into the new column, so an account with no choice keeps the language it has now, and append the `updated_at` trigger from `updatedAtTriggerStatements`. Fix the users fixtures in `packages/db/src/testDb.ts` (and any test inserting users) to set it.
- [ ] **Sign-in** (`session.ts`): a new person gets `languageChoice` and `language` both from the sign-in's `language` (LINE's, or the device's outside LINE); an existing person's sign-in no longer touches either (drop the `coalesce`).
- [ ] **`POST /api/me/language-choice`**: body `{ languageChoice: "en" | "ja" }` (no null, no `language`); sets both columns. The chat menu relink stays where it runs today (on a language change); there's no longer a "cleared" case. 400 `invalid_request` for null.
- [ ] **App:** `ApiClient.setLanguageChoice(choice: Language)`; `SettingsNote`'s `CHOICES = ["en", "ja"]`, the select's value `shown.languageChoice`; `keepChosenLanguage` and `followLanguageChoice` take a `Language`; `SessionGate`'s re-sign-in for "follow LINE" goes; the `sameAsLine` string goes; the language-name strings stay.
- [ ] **Tests:** API: a new person's `languageChoice` is the sign-in's language; a later sign-in with another LINE language leaves it; `POST /me/language-choice` with null answers 400. App: the select offers English and 日本語 only (update "reads in Japanese"); delete "goes back to following LINE" and any SessionGate test of the follow-LINE re-sign-in. Red check: restore the `coalesce` at sign-in; "a later sign-in leaves it" fails.
- [ ] `pnpm db:migrate` on a copy of a dev database with a null choice: it keeps its `language`.
- [ ] Commit `feat: Settings offers English and 日本語; a new account starts in LINE's language`.

## Task 8: The Shop says less (draft, adapted, + one "Coming soon")

- [ ] Port: `git -C "$W" show c9d290b0 -- apps/frontend/src/i18n/strings/shop.ts apps/frontend/src/shop/ComingSoonShelf.tsx | git -C "$W" apply -3`. Conflicts: none.
- [ ] Not ported: c9d290b0's `ReserveTicketsHero.tsx`, `ShopScreen.tsx`, `ShopScreen.css` (built on the draft's large-screen banner rows). Apply `8-shop.diff`: the card's order (fan, title, line, perforation, any load error, You have ×N, Buy, Sui credit), no price line, and new: one "Coming soon" pill heading the shelves (shelf names become `h3`), `singleTicketPrice` without `lessInPacks`, the order test.

```diff
# phase0/8-shop.diff
diff --git a/apps/frontend/src/i18n/strings/shop.ts b/apps/frontend/src/i18n/strings/shop.ts
index 2b033c5a..050b695f 100644
--- a/apps/frontend/src/i18n/strings/shop.ts
+++ b/apps/frontend/src/i18n/strings/shop.ts
@@ -31,7 +31,7 @@ export const shop = {
   },
   /** The Sui credit, under the checkout's Pay key and at the foot of the reserve tickets section; `<logo/>` is Sui's logo, which Japanese puts first */
   paymentsOn: { en: "Payments on <logo/>", ja: "<logo/>で決済" },
-  /** Beside each coming-soon shelf's name: nothing on it is on sale yet */
+  /** The Shop: the one pill over the coming-soon shelves, saying nothing on them is on sale yet */
   comingSoon: { en: "Coming soon", ja: "近日登場" },
   /** On the first swatch of each coming-soon shelf: the one you have now */
   yours: { en: "Yours", ja: "使用中" },
diff --git a/apps/frontend/src/shop/ComingSoonShelf.tsx b/apps/frontend/src/shop/ComingSoonShelf.tsx
index 00aae2e3..733198eb 100644
--- a/apps/frontend/src/shop/ComingSoonShelf.tsx
+++ b/apps/frontend/src/shop/ComingSoonShelf.tsx
@@ -25,12 +25,9 @@ export function ComingSoonShelf({ title, items, swatch = "label" }: Props) {
   const id = useId();
   return (
     <section className="shelf" aria-labelledby={`${id}-title`}>
-      <header className="shelf__head">
-        <h2 className="shelf__title" id={`${id}-title`}>
-          {title}
-        </h2>
-        <span className="shelf__soon fine">{t(($) => $.shop.comingSoon)}</span>
-      </header>
+      <h3 className="shelf__title" id={`${id}-title`}>
+        {title}
+      </h3>
       <ul className="shelf__row">
         {items.map((item, i) => (
           <li key={item.id} className="shelf-item">
diff --git a/apps/frontend/src/shop/ReserveTicketsHero.tsx b/apps/frontend/src/shop/ReserveTicketsHero.tsx
index 00942a60..7187eb02 100644
--- a/apps/frontend/src/shop/ReserveTicketsHero.tsx
+++ b/apps/frontend/src/shop/ReserveTicketsHero.tsx
@@ -1,16 +1,12 @@
-import { useId, useState } from "react";
+import { useId } from "react";
 import { errorDetail, errorMessage } from "../i18n/errorMessage";
 import { Trans, useTranslation } from "../i18n/react";
 import { BuyTicketsIcon } from "../icons";
-import { formatYen } from "../tickets/prices";
-import { singleTicketPrice, useShownReservePacks } from "../tickets/reservePacks";
 import { TicketCount } from "../tickets/TicketCount";
 import { TicketStubs, type TicketStub } from "../tickets/TicketStubs";
 import { useTickets } from "../tickets/useTickets";
 import { ErrorLine } from "../ui/ErrorLine";
 import { Key } from "../ui/Key";
-import { REVEAL } from "../ui/reveal";
-import { Skeleton } from "../ui/Skeleton";
 import { TearLine } from "../ui/TearLine";
 import { SuiCredit } from "./SuiCredit";

@@ -21,23 +17,23 @@ const FAN: TicketStub[] = [
 ];

 /**
- * The Shop's one thing on sale, laid out as the page's peak: a fan of reserve tickets, what you hold,
- * what they're for and what they cost, and the key that opens the reserve ticket checkout.
+ * The Shop's one thing on sale, laid out as the page's peak: a fan of reserve tickets, what they're
+ * for, and over the key that opens the reserve ticket checkout, how many you hold.
  */
 export function ReserveTicketsHero({ onBuy }: { onBuy: () => void }) {
   const { t } = useTranslation();
   const id = useId();
   const { tickets, error, refresh } = useTickets();
-  const packs = useShownReservePacks();
-  // The price waits on the packs, and nothing else here does.
-  const price = packs.state === "ready" ? singleTicketPrice(packs.data.packs) : null;
-  // A price there as the Shop opens is simply there; only one that arrives later rises in.
-  const [pricedAtOnce] = useState(price !== null);
   const held = tickets?.reserveLeft ?? 0;

   return (
     <section className="reserve-hero" aria-labelledby={`${id}-title`}>
       <TicketStubs className="reserve-hero__fan" size="large" stubs={FAN} stars="front" />
+      <h2 className="reserve-hero__title" id={`${id}-title`}>
+        {t(($) => $.shop.reserve.title)}
+      </h2>
+      <p className="reserve-hero__lead keep-phrases">{t(($) => $.shop.reserve.lead)}</p>
+      <TearLine />
       {/* With no tickets loaded the Shop would read as if you hold none, so a failed load says so. */}
       {error && (
         <ErrorLine className="reserve-hero__problem" detail={errorDetail(error)} onRetry={refresh}>
@@ -57,23 +53,6 @@ export function ReserveTicketsHero({ onBuy }: { onBuy: () => void }) {
           </span>
         </p>
       )}
-      <h2 className="reserve-hero__title" id={`${id}-title`}>
-        {t(($) => $.shop.reserve.title)}
-      </h2>
-      <p className="reserve-hero__lead keep-phrases">{t(($) => $.shop.reserve.lead)}</p>
-      {/* Its line keeps its height while the price loads, or if it can't, so the key never jumps. */}
-      <p className="reserve-hero__price">
-        {price ? (
-          <span className={pricedAtOnce ? undefined : REVEAL}>
-            {price.lessInPacks
-              ? t(($) => $.shop.reserve.priceWithPacks, { price: formatYen(price.priceYen) })
-              : t(($) => $.shop.reserve.price, { price: formatYen(price.priceYen) })}
-          </span>
-        ) : (
-          packs.state === "loading" && <Skeleton width={168} height={16} />
-        )}
-      </p>
-      <TearLine />
       <Key className="reserve-hero__key" tone="blue" icon={<BuyTicketsIcon />} onClick={onBuy}>
         {t(($) => $.shop.reserve.buy)}
       </Key>
diff --git a/apps/frontend/src/shop/ShopScreen.css b/apps/frontend/src/shop/ShopScreen.css
index b154ff83..1116eefd 100644
--- a/apps/frontend/src/shop/ShopScreen.css
+++ b/apps/frontend/src/shop/ShopScreen.css
@@ -73,7 +73,7 @@
   line-height: 1.2;
 }

-/* Tickets that didn't load: in the count's place, above the title. */
+/* Tickets that didn't load: in the count's place, over the Buy key. */
 .reserve-hero__problem {
   margin: 0 0 10px;
 }
@@ -96,17 +96,6 @@
   text-wrap: balance;
 }

-/* Holds its line while the price loads, or if it doesn't. */
-.reserve-hero__price {
-  display: flex;
-  justify-content: center;
-  align-items: center;
-  min-height: 22px;
-  margin: 8px 0 0;
-  font-size: 15px;
-  font-weight: 800;
-}
-
 .reserve-hero__key {
   width: 100%;
 }
@@ -118,19 +107,28 @@

 /* ---------- Coming-soon shelves ---------- */

+/* One "Coming soon" over every shelf: a quiet pressed pill, in the Graphite that reads on Liner Deep
+   (plain Graphite reads only 4.2:1 there). */
+.shop__soon {
+  width: fit-content;
+  margin: 28px 18px 0;
+  padding: 3px 8px;
+  border-radius: 999px;
+  background: var(--liner-deep);
+  color: var(--graphite-on-deep);
+}
+
 .shelf {
   margin-top: 28px;
 }

-.shelf__head {
-  display: flex;
-  align-items: center;
-  gap: 10px;
-  padding: 0 18px;
+.shop__soon + .shelf {
+  margin-top: 12px;
 }

 .shelf__title {
   margin: 0;
+  padding: 0 18px;
   font-size: 19px;
   line-height: 1.1;
   font-weight: 800;
@@ -138,21 +136,6 @@
   letter-spacing: -0.012em;
 }

-/* A quiet pressed pill, in the Graphite that reads on Liner Deep (plain Graphite reads only 4.2:1 there). */
-.shelf__soon {
-  padding: 3px 8px;
-  border-radius: 999px;
-  background: var(--liner-deep);
-  color: var(--graphite-on-deep);
-}
-
-.shelf__lead {
-  margin: 4px 18px 0;
-  font-size: 13px;
-  line-height: 1.4;
-  color: var(--graphite);
-}
-
 /* A row that scrolls sideways; the last swatch peeks past the edge, so there's plainly more. */
 .shelf__row {
   display: flex;
diff --git a/apps/frontend/src/shop/ShopScreen.test.tsx b/apps/frontend/src/shop/ShopScreen.test.tsx
index 0648c4f8..929f93b0 100644
--- a/apps/frontend/src/shop/ShopScreen.test.tsx
+++ b/apps/frontend/src/shop/ShopScreen.test.tsx
@@ -73,6 +73,25 @@ afterEach(() => {
 });

 describe("ShopScreen", () => {
+  it("leads reserve tickets with their name, holds your count over Buy, and says Coming soon once", async () => {
+    view = renderWithApi(
+      <ShopScreen onBuyReserveTickets={() => {}} />,
+      emptyApi({
+        tickets: () => Promise.resolve({ ...FRESH_TICKETS, reserveLeft: 2 }),
+        ticketShop: () => Promise.resolve(SHOP),
+      }),
+    );
+    await settle();
+    const lines = [...(document.querySelector(".reserve-hero")?.children ?? [])].map(
+      (el) => el.textContent ?? "",
+    );
+    const at = (text: string) => lines.findIndex((line) => line.includes(text));
+    expect(at("Reserve tickets")).toBeGreaterThan(-1);
+    expect(at("Reserve tickets")).toBeLessThan(at("You have"));
+    expect(at("You have")).toBeLessThan(at("Buy reserve tickets"));
+    expect(document.body.textContent?.split("Coming soon")).toHaveLength(2);
+  });
+
   it("lists your ticket purchases from Sui under the reserve tickets, and reads them again after a purchase", async () => {
     vi.mocked(getTicketPayments).mockResolvedValue({
       payments: [{ digest: "D".repeat(44), paidAt: Date.now(), amount: BigInt(PACK.priceJpyc) }],
diff --git a/apps/frontend/src/shop/ShopScreen.tsx b/apps/frontend/src/shop/ShopScreen.tsx
index e1531952..95d1fc61 100644
--- a/apps/frontend/src/shop/ShopScreen.tsx
+++ b/apps/frontend/src/shop/ShopScreen.tsx
@@ -1,4 +1,4 @@
-import type { ReactNode } from "react";
+import { useId, type ReactNode } from "react";
 import { useTranslation } from "../i18n/react";
 import { useLight } from "../stickers/light";
 import { Skeleton } from "../ui/Skeleton";
@@ -24,6 +24,7 @@ const BACKING_FOILS: readonly BackingFoil[] = ["holo", "gold", "silver", "roseGo
  */
 export function ShopScreen({ onBuyReserveTickets }: { onBuyReserveTickets: () => void }) {
   const { t } = useTranslation();
+  const soonId = useId();
   const sticker = useShopSticker();
   useLight(sticker !== null);

@@ -36,36 +37,41 @@ export function ShopScreen({ onBuyReserveTickets }: { onBuyReserveTickets: () =>
       <h1 className="shop__title">{t(($) => $.shop.title)}</h1>
       <ReserveTicketsHero onBuy={onBuyReserveTickets} />
       <ShopTicketPurchases />
-      <ComingSoonShelf
-        title={t(($) => $.shop.shelves.laminates.title)}
-        lead={t(($) => $.shop.shelves.laminates.lead)}
-        items={LAMINATES.map((laminate) => ({
-          id: laminate,
-          name: t(($) => $.shop.shelves.laminates.items[laminate]),
-          preview: onSticker((s) => (
-            <FinishPreview sticker={s} side={SWATCH} finish={{ laminate }} />
-          )),
-        }))}
-      />
-      <ComingSoonShelf
-        title={t(($) => $.shop.shelves.brushes.title)}
-        lead={t(($) => $.shop.shelves.brushes.lead)}
-        swatch="white"
-        items={BRUSHES.map((kind) => ({
-          id: kind,
-          name: t(($) => $.shop.shelves.brushes.items[kind]),
-          preview: <BrushStrokeSample kind={kind} side={SWATCH} />,
-        }))}
-      />
-      <ComingSoonShelf
-        title={t(($) => $.shop.shelves.backingFoils.title)}
-        lead={t(($) => $.shop.shelves.backingFoils.lead)}
-        items={BACKING_FOILS.map((foil) => ({
-          id: foil,
-          name: t(($) => $.shop.shelves.backingFoils.items[foil]),
-          preview: onSticker((s) => <FinishPreview sticker={s} side={SWATCH} finish={{ foil }} />),
-        }))}
-      />
+      {/* Nothing on the shelves is on sale yet: one "Coming soon" says so for all three. */}
+      <section className="shop__shelves" aria-labelledby={soonId}>
+        <h2 className="shop__soon fine" id={soonId}>
+          {t(($) => $.shop.comingSoon)}
+        </h2>
+        <ComingSoonShelf
+          title={t(($) => $.shop.shelves.laminates.title)}
+          items={LAMINATES.map((laminate) => ({
+            id: laminate,
+            name: t(($) => $.shop.shelves.laminates.items[laminate]),
+            preview: onSticker((s) => (
+              <FinishPreview sticker={s} side={SWATCH} finish={{ laminate }} />
+            )),
+          }))}
+        />
+        <ComingSoonShelf
+          title={t(($) => $.shop.shelves.brushes.title)}
+          swatch="white"
+          items={BRUSHES.map((kind) => ({
+            id: kind,
+            name: t(($) => $.shop.shelves.brushes.items[kind]),
+            preview: <BrushStrokeSample kind={kind} side={SWATCH} />,
+          }))}
+        />
+        <ComingSoonShelf
+          title={t(($) => $.shop.shelves.backingFoils.title)}
+          items={BACKING_FOILS.map((foil) => ({
+            id: foil,
+            name: t(($) => $.shop.shelves.backingFoils.items[foil]),
+            preview: onSticker((s) => (
+              <FinishPreview sticker={s} side={SWATCH} finish={{ foil }} />
+            )),
+          }))}
+        />
+      </section>
     </div>
   );
 }
diff --git a/apps/frontend/src/tickets/reservePacks.ts b/apps/frontend/src/tickets/reservePacks.ts
index 7073c416..c1ebf306 100644
--- a/apps/frontend/src/tickets/reservePacks.ts
+++ b/apps/frontend/src/tickets/reservePacks.ts
@@ -24,9 +24,8 @@ export const useShownReservePacks = () => useApiQuery(KEY, loadPacks, answers);
 /** Loads the packs ahead, so the Shop opens on its prices. */
 export const preloadReservePacks = (api: ApiClient) => preloadQuery(api, KEY, loadPacks, answers);

-/** The price of one reserve ticket bought alone, and whether a bigger pack costs less a ticket. */
+/** The price of one reserve ticket bought alone. */
 export function singleTicketPrice(packs: ReservePacks["packs"]) {
   const single = packs.find((p) => p.tickets === 1);
-  if (!single) return null;
-  return { priceYen: single.priceYen, lessInPacks: packs.some((p) => p.discountPercent > 0) };
+  return single ? { priceYen: single.priceYen } : null;
 }
```

- [ ] Test: frontend `src/shop src/tickets`. Red check: put the title back after the `held` line; "leads reserve tickets with their name" fails.
- [ ] Commit `feat(frontend): the Shop says less: reserve tickets lead with their name, the count sits over Buy, one Coming soon`.

## Task 9: One gratitude heart in Explore, one text field (draft)

- [ ] Port:

```bash
F=apps/frontend/src
git -C "$W" show 890a78d0 -- $F/explore/ExploreScreen.css $F/explore/ExploreScreen.tsx | git -C "$W" apply -3
git -C "$W" show 911d56e4 -- $F/styles/text-field.css $F/main.tsx $F/api/HandlePrompt.css $F/api/HandlePrompt.tsx $F/sticker-board/tray/sticker-tray.css $F/sticker-creation/tools/ClearBar.css | git -C "$W" apply -3
```

The second brings the critique's two size fixes too: the tray's folder tabs on `--r-label`, the Clear bar's line at 13px.

- [ ] Conflicts, by hand: 911d56e4's `ExploreScreen.tsx`/`.css` (the draft's two-column `.explore-side`): Explore's search label gets `className="text-field artist-search"`, and `.artist-search` keeps only `flex: none` under the comment "The search is the text field (styles/text-field.css); it keeps its height in Explore's column."; its other rules, and `:has(input:focus-visible)` and `input`/`::placeholder` rules, go.
- [ ] Test: no new test (a class and CSS; Task 15's captures check both fields and the heart). Run frontend `src/explore src/api`.
- [ ] Commit `fix(frontend): Explore's Most gratitude figures wear the gratitude heart, and Explore's search and the handle prompt share one text field`.

## Task 10: The tray under the gifts badge, open only as far as its sheets (draft, ported for phones)

- [ ] Don't port 44e77a72: it rewrites the draft's large-screen tray fit (`trayFitFor`, `--tray-foot`, `is-short`), none of it on main, where the rail already runs to the foot. Apply `10-tray.diff`, its phone half on main's structure: `TOP` 64 → 72 (and `--tray-top`); the Zipper's `stopShort` (`openWindow(short)` answers `slider`; `reshape({ stopShort })`); `fitStack` stops the slider 24px below the stack and skips the frame it redrew; `pouchFoot()`; a sticker let go below the open slider stays on the board.

```diff
# phase0/10-tray.diff
diff --git a/apps/frontend/src/sticker-board/tray/StickerTray.test.tsx b/apps/frontend/src/sticker-board/tray/StickerTray.test.tsx
index 6036d07e..f0d5a375 100644
--- a/apps/frontend/src/sticker-board/tray/StickerTray.test.tsx
+++ b/apps/frontend/src/sticker-board/tray/StickerTray.test.tsx
@@ -860,6 +860,38 @@ describe("StickerTray", () => {
       expect(scale).toBe(1);
     });

+    // A phone's browser outside LINE gives the board more height than the stack needs.
+    it("opens a tall board's mouth only as far as the stack, full size", async () => {
+      await openOn(776, 60);
+      const [, stackTop = NaN, scale = NaN] = numbersIn(stackEl());
+      const [, mouthFootShift = NaN] = numbersIn(board.querySelector(".tray__w2"));
+      const mouthFoot = 776 - TOP + mouthFootShift;
+      const stackFoot = stackTop + scale * SHEET.h + STACK_FOOT;
+      expect(scale).toBe(1);
+      // The slider stopped short of the rail's foot: only a little lining under the sheets.
+      expect(stackFoot).toBeLessThanOrEqual(mouthFoot);
+      expect(mouthFoot - stackFoot).toBeLessThan(STACK_FOOT);
+    });
+
+    it("takes a sticker back beside the open mouth, and not from below its slider", async () => {
+      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
+        this: HTMLElement,
+      ) {
+        return this.classList.contains("tray__col") ? 776 - TOP : 776;
+      });
+      render([sticker("a", 1, true), sticker("b", 2, true)]);
+      await openTray();
+      const putBack = async (id: string, y: number) => {
+        let back: boolean | undefined;
+        await act(async () => {
+          back = await tray.current?.boardDrop(id, { x: 380, y });
+        });
+        return back;
+      };
+      expect(await putBack("a", 770)).toBe(false);
+      expect(await putBack("b", 300)).toBe(true);
+    });
+
     // An iPhone SE inside LINE has the shortest board the tray is made for; the other is shorter.
     it.each([523, 501])(
       "shrinks the stack until the +N button fits the mouth, on a board %ipx tall",
diff --git a/apps/frontend/src/sticker-board/tray/sticker-tray.css b/apps/frontend/src/sticker-board/tray/sticker-tray.css
index 0860ba1c..2da710fa 100644
--- a/apps/frontend/src/sticker-board/tray/sticker-tray.css
+++ b/apps/frontend/src/sticker-board/tray/sticker-tray.css
@@ -12,7 +12,7 @@
   --tray-edge-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.4), -0.5px 0 0 rgba(120, 20, 70, 0.3);
   --tray-weave: rgba(255, 255, 255, 0.55);
   --tray-deep: rgba(150, 30, 90, 0.22);
-  --tray-top: 64px;
+  --tray-top: 72px;
   --tray-col: 205px;
   position: absolute;
   inset: 0;
diff --git a/apps/frontend/src/sticker-board/tray/trayBoardDrop.ts b/apps/frontend/src/sticker-board/tray/trayBoardDrop.ts
index d136d1a1..ae314b55 100644
--- a/apps/frontend/src/sticker-board/tray/trayBoardDrop.ts
+++ b/apps/frontend/src/sticker-board/tray/trayBoardDrop.ts
@@ -29,7 +29,8 @@ export function createTrayBoardDrop(
   trayPeel: TrayPeel,
   trayPresses: TrayPresses,
 ) {
-  const { reduced, later, cancel, zip, api, root, stack, ui, Wb, colLeft, boardView } = tray;
+  const { reduced, later, cancel, zip, api, root, stack, ui, Wb, colLeft, pouchFoot, boardView } =
+    tray;
   const { itemOf, topF } = trayModel;
   const { renderStack, rerenderPulled, sayReturned } = traySheets;
   const { bringToFront } = trayPaging;
@@ -37,6 +38,8 @@ export function createTrayBoardDrop(
   const { sendHome } = trayPresses;

   /* ---------------------------------------------------------------- putting a board sticker back */
+  /** Beside the open mouth, not the meshed teeth below its slider. */
+  const besidePouch = (pt: Point) => pt.y < pouchFoot() + 20;
   function clearTarget() {
     for (const el of root.querySelectorAll(".tray__slot.is-target"))
       el.classList.remove("is-target");
@@ -100,7 +103,7 @@ export function createTrayBoardDrop(
     const size = api.sizeFor(s.id);
     const lip = colLeft() + ui.geo.chainX - ui.geo.G;
     const dist = Math.hypot(pt.x - silhouette.x, pt.y - silhouette.y);
-    const over = onPulled ? onPulled.over : pt.x > lip - 12;
+    const over = onPulled ? onPulled.over : pt.x > lip - 12 && besidePouch(pt);
     if (dist < SNAP && over) {
       const k = Math.pow(1 - dist / SNAP, 1.6) * 0.92;
       const from = api.stickerRect(s.id)?.r ?? 0;
@@ -138,7 +141,7 @@ export function createTrayBoardDrop(
     if (!s || ui.destroyed) return false;
     const lip = ui.geo ? colLeft() + ui.geo.chainX - ui.geo.G : Wb() - 30;
     const onPulled = pulledFor(s, pt, boardView())?.over === true;
-    const into = onPulled || (zip.isOpen ? pt.x > lip - 12 : pt.x > Wb() - 74);
+    const into = onPulled || (zip.isOpen ? pt.x > lip - 12 && besidePouch(pt) : pt.x > Wb() - 74);
     if (!into) {
       clearTarget();
       // It opened for this sticker, which went elsewhere.
diff --git a/apps/frontend/src/sticker-board/tray/trayEngine.ts b/apps/frontend/src/sticker-board/tray/trayEngine.ts
index 37da9d0f..77bbd0be 100644
--- a/apps/frontend/src/sticker-board/tray/trayEngine.ts
+++ b/apps/frontend/src/sticker-board/tray/trayEngine.ts
@@ -25,6 +25,7 @@ import {
   STACK_FOOT,
   STACK_Y,
   SVG_NS,
+  TOP,
   createTrayModel,
   modelOf,
   type BoardView,
@@ -68,6 +69,8 @@ export interface TrayEngine {
  * edge, kept at the fine-print floor, still sit beside the sheet's number.
  */
 const MIN_SHRINK = 0.5;
+/** The open mouth keeps this much lining under the stack's foot, where the +N button's reach ends. */
+const POUCH_LINING = 24;
 /** The stack's foot (dates, NEW, +N) is hidden below this share of the mouth's open width, whole above the other. */
 const FOOT_FADE = { hidden: 0.35, whole: 0.7 };
 /** The pull tugs itself, and the front sheet's grip nudges, on this many visits to the tray. */
@@ -250,6 +253,9 @@ export function createTrayEngine(
   const Wb = () => board.clientWidth || 390;
   const Hb = () => board.clientHeight || 657;
   const colLeft = () => Wb() - COL;
+  /** Where the open pouch ends, as the board's y: where its slider stops. */
+  let openFoot = 0;
+  const pouchFoot = () => openFoot || Hb();
   const boardView = (): BoardView => {
     const r = board.getBoundingClientRect();
     return { left: r.left, top: r.top, k: r.width / (board.offsetWidth || r.width || 1) };
@@ -282,6 +288,7 @@ export function createTrayEngine(
     Wb,
     Hb,
     colLeft,
+    pouchFoot,
     boardView,
   };
   const traySheets = createTraySheets(tray, trayModel);
@@ -300,27 +307,39 @@ export function createTrayEngine(
     w1.toggleAttribute("inert", now);
   }
   let footShown = "1.00";
-  let shrunkFor = 0;
+  let fittedFor = 0;
+  let stoppedShort = 0;
   /**
-   * Shrinks the stack until its sheets, the edges behind them and the +N button all fit the open mouth:
-   * on a short board the mouth's window ends above where the stack would.
+   * Fits the stack to the open mouth: shrunk until its sheets, the edges behind them and the +N button
+   * all fit on a short board, whose mouth ends above where the stack would. Opened, the slider stops
+   * just below the stack, so the pouch holds no bare lining under the sheets. True when that moved
+   * the stop: the Zipper redrawn for it has drawn this frame already.
    */
-  function shrinkStack(height: number) {
-    if (!height || height === shrunkFor) return;
-    shrunkFor = height;
-    const room = zip.openWindow();
+  function fitStack(height: number) {
+    if (!height || height === fittedFor) return false;
+    fittedFor = height;
+    const room = zip.openWindow(0);
     const next = room ? clamp((room.bot - 2 - STACK_Y - STACK_FOOT) / SHEET.h, MIN_SHRINK, 1) : 1;
-    if (Math.abs(next - ui.shrink) < 0.001) return;
-    ui.shrink = next;
-    stack.style.setProperty("--shrink", ui.shrink.toFixed(4));
-    if (ui.model && ui.order.length) renderStack();
+    if (Math.abs(next - ui.shrink) >= 0.001) {
+      ui.shrink = next;
+      stack.style.setProperty("--shrink", ui.shrink.toFixed(4));
+      if (ui.model && ui.order.length) renderStack();
+    }
+    const stackFoot = 2 + STACK_Y + ui.shrink * SHEET.h + STACK_FOOT + POUCH_LINING;
+    const stopShort = room ? Math.max(0, Math.floor(room.bot - stackFoot)) : 0;
+    const moved = stopShort !== stoppedShort;
+    stoppedShort = stopShort;
+    if (moved) zip.reshape({ stopShort });
+    const stop = zip.openWindow();
+    openFoot = stop ? TOP + stop.slider : 0;
+    return moved;
   }
   function onFrame(g: Geometry) {
+    if (fitStack(g.H)) return;
     ui.geo = g;
     const G = g.G;
     const k = showsFrom(g.spread);
     const open = clamp(G / (0.97 * GMAX), 0, 1);
-    shrinkStack(g.H);
     const range = G > 3 ? mouthRange(g, G, k) : null;
     const show = range !== null;
     // A mouth sagged to a crack rings through shut for a few frames: the stack stays as it was, so it
diff --git a/apps/frontend/src/sticker-board/tray/trayModel.ts b/apps/frontend/src/sticker-board/tray/trayModel.ts
index 35d61692..1b685582 100644
--- a/apps/frontend/src/sticker-board/tray/trayModel.ts
+++ b/apps/frontend/src/sticker-board/tray/trayModel.ts
@@ -242,6 +242,8 @@ export interface Tray {
   Wb: () => number;
   Hb: () => number;
   colLeft: () => number;
+  /** Where the open pouch ends, as the board's y: where its slider stops. */
+  pouchFoot: () => number;
   boardView: () => BoardView;
 }

@@ -254,8 +256,9 @@ export const STACK_FOOT = PEEKS * PEEK + 3 + 22;
 export const SHEET = { w: 156, h: 364 };
 /** Packing keeps clear of the sheet's tear strip at the top and its dated foot. */
 const PACK = { sheet: SHEET, margin: { top: 30, right: 10, bottom: 24, left: 10 } };
-/** The tray runs from just under the board's header to its foot. */
-export const TOP = 64;
+/** The tray runs from under the board's header and its gifts badge to its foot (sticker-tray.css sets
+ * --tray-top to match). */
+export const TOP = 72;
 /** The tray's column: wide enough for the left row's full travel. */
 export const COL = 205;
 /** How far the left row travels open: the tray takes about half the screen. */
diff --git a/apps/frontend/src/sticker-board/tray/zipper.ts b/apps/frontend/src/sticker-board/tray/zipper.ts
index ef54be7a..43d5aec1 100644
--- a/apps/frontend/src/sticker-board/tray/zipper.ts
+++ b/apps/frontend/src/sticker-board/tray/zipper.ts
@@ -28,6 +28,11 @@ export interface ZipperOptions {
   insets: readonly [top: number, bottom: number];
   /** How far the left row travels when fully open and spread flat. */
   maxGap: number;
+  /**
+   * Opened, the slider stops this many px short of the far stop, and the teeth below it stay meshed:
+   * the run's overshoot and knock happen there.
+   */
+  stopShort?: number;
 }

 interface RunOptions {
@@ -106,8 +111,14 @@ export interface Zipper {
   /** The pip on the pull that marks something new inside. */
   badge: (on: boolean) => void;
   geometry: () => ZipperGeometry;
-  /** Where the fully open mouth shows through, as the host's y from top to foot; null before it's laid out. */
-  openWindow: () => { top: number; bot: number } | null;
+  /**
+   * Where the fully open mouth shows through, as the host's y from top to foot, and where its slider
+   * stops: with the slider stopping `short` px short of the far stop, or where it does now; null before
+   * the host is laid out.
+   */
+  openWindow: (short?: number) => { top: number; bot: number; slider: number } | null;
+  /** Moves where the opened slider stops: it redraws at once. */
+  reshape: (options: Required<Pick<ZipperOptions, "stopShort">>) => void;
   on: <K extends keyof ZipperEvents>(event: K, fn: Listener<K>) => () => void;
   destroy: () => void;
 }
@@ -147,8 +158,9 @@ const STOP_GAP = 1.5;
 const SHOULDER = 12;
 /** The pull's hinge on the slider's bridge, below the slider's center. */
 const HINGE = 2;
-/** However short the host, the track is at least this long. */
+/** However short the host, the track is at least this long, and an opening slider runs at least this far. */
 const MIN_TRACK = 80;
+const MIN_RUN = 48;
 /** The lining: a sliver every `step` px, `half` px either side of its place, shown once the mouth is
  * `minGap` wide; it tucks under the left lip and the right row, and its CSS box is `width` px wide. */
 const LINING = { step: 4, half: 2.5, minGap: 2.5, underLip: 3, underChain: 2, width: 100 };
@@ -559,7 +571,8 @@ function windowOf(doc: Document): Window & typeof globalThis {
 export function createZipper(host: HTMLElement, options: ZipperOptions): Zipper {
   const doc = host.ownerDocument;
   const win = windowOf(doc);
-  const o = options;
+  // Its own copy: `reshape` moves the stop.
+  const o = { stopShort: 0, ...options };
   /** The pull's name, which says so when the pip marks something new. */
   const names = {
     plain: i18next.t(($) => $.stickerBoard.tray.zipper),
@@ -657,6 +670,9 @@ export function createZipper(host: HTMLElement, options: ZipperOptions): Zipper
   let slivers: Sliver[] = [];
   const yOf = (a: number) => o.insets[0] + a;
   const aOf = (y: number) => y - o.insets[0];
+  /** Where an open slider's center stops on a track this long, `short` px short of the far stop. */
+  const stopOf = (track: number, short: number) =>
+    Math.max(STOP + SLIDER / 2 + MIN_RUN, track - STOP - SLIDER / 2 - short);

   function segment(row: "a" | "b", a: number): Segment {
     const tape = make(doc, "i", "zip__tape");
@@ -685,7 +701,7 @@ export function createZipper(host: HTMLElement, options: ZipperOptions): Zipper
     }
     lining.replaceChildren(...slivers.map((s) => s.el));
     S0 = STOP + SLIDER / 2;
-    S1 = L - STOP - SLIDER / 2;
+    S1 = stopOf(L, o.stopShort);
     travel = Math.max(1, S1 - S0);
     // New teeth have never been drawn.
     drawn.S = NaN;
@@ -1373,12 +1389,21 @@ export function createZipper(host: HTMLElement, options: ZipperOptions): Zipper
       slider.setAttribute("aria-label", on ? names.fresh : names.plain);
     },
     geometry,
-    openWindow() {
+    openWindow(short = o.stopShort) {
       if (!L && !build()) return null;
+      const S = stopOf(L, short);
       const open: MouthShape = { S: 0, sM: 0, Ts: 1, Te: 1, ms: 0.8, me: 1.2, G: 0 };
-      fillShape(open, 1, 1, o.maxGap, 0);
+      fillShape(open, (S - S0) / travel, 1, o.maxGap, 0);
       const range = mouthRange({ sM: open.sM, gap: (a) => gapOf(open, a) }, open.G, showsFrom(1));
-      return range && { top: yOf(range.from), bot: yOf(range.to) };
+      return range && { top: yOf(range.from), bot: yOf(range.to), slider: yOf(S) };
+    },
+    reshape({ stopShort }) {
+      if (destroyed || stopShort === o.stopShort) return;
+      o.stopShort = stopShort;
+      L = 0;
+      if (build()) render();
+      // An open mouth settles to its new shape.
+      wake();
     },
     on(event, fn) {
       listeners[event].add(fn);
```

- [ ] Test: frontend `src/sticker-board/tray src/sticker-board/StickerBoard.test.tsx`. Red checks: drop `zip.reshape({ stopShort })` ("opens a tall board's mouth only as far as the stack" fails); drop `&& besidePouch(pt)` from `into` ("not from below its slider" fails).
- [ ] Commit `feat(frontend): the tray starts under the gifts badge and opens only as far as its sheets`.

## Task 11: No first-selection hint; the gift chip says Gifts for you (new)

- [ ] Apply `11-board.diff`, run `11-delete-hint.py`, then `git -C "$W" rm apps/frontend/src/sticker-board/selectionHint.ts`. Devices that saw the hint keep a `draw.board.selectionHint.<id>` counter nothing reads.

```diff
# phase0/11-board.diff
diff --git a/apps/frontend/src/i18n/strings/receiving.ts b/apps/frontend/src/i18n/strings/receiving.ts
index 91dd07f5..8630e592 100644
--- a/apps/frontend/src/i18n/strings/receiving.ts
+++ b/apps/frontend/src/i18n/strings/receiving.ts
@@ -190,12 +190,10 @@ export const receiving = {
   giftsForYou: {
     /** Gifts for you badge on your own sticker board: its first line, with one gift waiting */
     title_one: { en: "A gift for you" },
-    /** Gifts for you badge on your own sticker board: its first line, with gifts waiting */
-    title_other: { en: "{{count}} gifts for you", ja: "ギフトが{{count}}件" },
+    /** Gifts for you badge on your own sticker board: its first line, with gifts waiting, beside the dot badge that counts them */
+    title_other: { en: "Gifts for you", ja: "届いたギフト" },
     /** Gifts for you badge on your own sticker board: the line under the title, naming who sent the newest gift; <name/> is their handle, which keeps its own case in the capitals */
     from: { en: "from <name/>", ja: "<name/>さんから" },
-    /** Gifts for you badge on your own sticker board: the line under the title, naming the newest gift's sender and how many more are waiting; <name/> is their handle, which keeps its own case in the capitals */
-    fromAndMore: { en: "from <name/> and {{count}} more", ja: "<name/>さんほか{{count}}件" },
     /** Gifts for you badge on your own sticker board: its name for assistive tech, tapping it opens the newest gift */
     label_one: { en: "A gift for you from {{name}}. Open it" },
     /** Gifts for you badge on your own sticker board: its name for assistive tech with several gifts, tapping it opens the newest */
diff --git a/apps/frontend/src/i18n/strings/stickerBoard.ts b/apps/frontend/src/i18n/strings/stickerBoard.ts
index 43dc7e01..2b8c04e5 100644
--- a/apps/frontend/src/i18n/strings/stickerBoard.ts
+++ b/apps/frontend/src/i18n/strings/stickerBoard.ts
@@ -413,11 +413,6 @@ export const stickerBoard = {
     view: { en: "View", ja: "見る" },
     /** Your sticker board, a sticker selected: the toolbar's Remove key, which takes it off the board and back into the sticker tray */
     remove: { en: "Remove", ja: "はがす" },
-    /** Your sticker board, the first time you select a sticker on this phone: the chip clear of the sticker and its toolbar until you let go of the sticker, hidden from screen readers; its first row says how to open the sticker and let go of it by tapping, its second how to put it away in the sticker tray by dragging it to the Zipper */
-    firstSelectionHint: {
-      en: "Tap again to open · Tap the board to let go\nDrag to the zipper to put it away",
-      ja: "もう一度タップでひらく・<wbr/>ボードをタップで解除\nファスナーにドラッグでしまう",
-    },
     /** The toolbar's Arrange tile and the step tiles it opens, which arrange the selected sticker without dragging it: each names what one press does. */
     arrange: {
       /** Your sticker board, a sticker selected: the toolbar's Arrange tile, which shows or hides the step tiles, and screen readers' name for their group */
diff --git a/apps/frontend/src/receiving/GiftsForYouBadge.test.tsx b/apps/frontend/src/receiving/GiftsForYouBadge.test.tsx
index f142cacb..41a816f8 100644
--- a/apps/frontend/src/receiving/GiftsForYouBadge.test.tsx
+++ b/apps/frontend/src/receiving/GiftsForYouBadge.test.tsx
@@ -3,6 +3,7 @@ import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { gift, people, sticker } from "../api/testFixtures";
+import { formatHandle } from "../stickers/format";
 import { GiftsForYouBadge, type GiftForYou } from "./GiftsForYouBadge";

 declare global {
@@ -22,6 +23,8 @@ const show = (gifts: GiftForYou[]) =>
   act(() => root.render(<GiftsForYouBadge gifts={gifts} onOpen={onOpen} />));
 const badge = () => host.querySelector("button");
 const count = () => host.querySelector(".gifts-for-you-badge__count")?.textContent;
+const title = () => host.querySelector(".gifts-for-you-badge__title")?.textContent;
+const from = () => host.querySelector(".gifts-for-you-badge__from")?.textContent;

 beforeEach(() => {
   host = document.createElement("div");
@@ -41,11 +44,12 @@ describe("GiftsForYouBadge", () => {
     expect(badge()).toBeNull();
   });

-  it("names the newest gift's sender, counts the rest, and opens the newest", () => {
+  it("counts them on its badge alone, names the newest gift's sender, and opens the newest", () => {
     const newest = waiting(people.mika);
-    show([newest, waiting(), waiting()]);
+    show([newest, waiting(people.ken), waiting(people.bob)]);
     expect(count()).toBe("3");
-    expect(badge()?.textContent).toContain("and 2 more");
+    expect(title()).toBe("Gifts for you");
+    expect(from()).toBe(`from ${formatHandle(people.mika.handle ?? "")}`);
     act(() => badge()?.click());
     expect(onOpen).toHaveBeenCalledWith(newest);
   });
diff --git a/apps/frontend/src/receiving/GiftsForYouBadge.tsx b/apps/frontend/src/receiving/GiftsForYouBadge.tsx
index 0de4e56a..eb225f1c 100644
--- a/apps/frontend/src/receiving/GiftsForYouBadge.tsx
+++ b/apps/frontend/src/receiving/GiftsForYouBadge.tsx
@@ -52,19 +52,11 @@ export function GiftsForYouBadge({ gifts, onOpen, nudging = false }: Props) {
           {t(($) => $.receiving.giftsForYou.title, { count })}
         </span>
         <span className="fine gifts-for-you-badge__from">
-          {/* The handle keeps its own case in the fine print's capitals. */}
-          {count > 1 ? (
-            <Trans
-              i18nKey={($) => $.receiving.giftsForYou.fromAndMore}
-              values={{ count: count - 1 }}
-              components={{ name: <span className="handle">{name}</span> }}
-            />
-          ) : (
-            <Trans
-              i18nKey={($) => $.receiving.giftsForYou.from}
-              components={{ name: <span className="handle">{name}</span> }}
-            />
-          )}
+          {/* The handle keeps its own case in the fine print's capitals; the badge counts the rest. */}
+          <Trans
+            i18nKey={($) => $.receiving.giftsForYou.from}
+            components={{ name: <span className="handle">{name}</span> }}
+          />
         </span>
       </span>
     </button>
diff --git a/apps/frontend/src/sticker-board/StickerBoard.tsx b/apps/frontend/src/sticker-board/StickerBoard.tsx
index e942fdc3..a3988e2c 100644
--- a/apps/frontend/src/sticker-board/StickerBoard.tsx
+++ b/apps/frontend/src/sticker-board/StickerBoard.tsx
@@ -92,7 +92,6 @@ import { keepBoard, keptBoardFor } from "./lastBoard";
 import { BoardFlip } from "./stat-board/BoardFlip";
 import type { StatBoardHandle } from "./stat-board/StatBoard";
 import { arrangeLeftOpen, keepArrangeOpen } from "./arrangeOpen";
-import { markSelectionHintShown, owesSelectionHint } from "./selectionHint";
 import { readingOrder } from "./stickerOrder";
 import { StickerToolbar } from "./StickerToolbar";
 import { SendGratitudeSheet } from "../receiving/SendGratitudeSheet";
@@ -314,9 +313,6 @@ export function StickerBoard({ freshId, onDraw, onOpenGift, giftClosures = 0 }:
   /** The sticker landing as this visit opened. `landingId` clears once it sticks; its chip plays on. */
   const [arrivedId] = useState(landingId);
   const [selected, setSelected] = useState<string | null>(null);
-  /** This selection owes the hint on how to go on, which stays until the selection ends. */
-  const [hinting, setHinting] = useState(false);
-  if (hinting && selected === null) setHinting(false);
   /** The sticker the detail shows, among your stickers or among the ones you gave. */
   const [open, setOpen] = useState<{ id: string; mode: "yours" | "given" } | null>(null);
   const openYours = (id: string) => setOpen({ id, mode: "yours" });
@@ -601,7 +597,6 @@ export function StickerBoard({ freshId, onDraw, onOpenGift, giftClosures = 0 }:
   const select = (id: string | null) => {
     setSelected(id);
     if (id) setChipsDone(true);
-    if (id && owesSelectionHint(account.id)) setHinting(true);
     if (!id || !stickers) return;
     settled.add(id);
     const sticker = stickers.find((s) => s.id === id);
@@ -856,8 +851,6 @@ export function StickerBoard({ freshId, onDraw, onOpenGift, giftClosures = 0 }:
                   knobBelow={knobBelow}
                   clearOf={draw}
                   {...(giftSender && { onGive: () => setGiving(s) })}
-                  hinted={hinting}
-                  onHintShown={() => markSelectionHintShown(account.id)}
                   onView={() => openYours(s.id)}
                   onRemove={() => stow(s.id)}
                   arrange={{
diff --git a/apps/frontend/src/sticker-board/StickerToolbar.tsx b/apps/frontend/src/sticker-board/StickerToolbar.tsx
index 9907163c..38ed7eee 100644
--- a/apps/frontend/src/sticker-board/StickerToolbar.tsx
+++ b/apps/frontend/src/sticker-board/StickerToolbar.tsx
@@ -21,7 +21,7 @@ import { EASE_OUT } from "../ui/easing";
 import { LabelButton } from "../ui/LabelButton";
 import { useHeldRepeat } from "../ui/useHeldRepeat";
 import type { Step } from "./boardGesture";
-import { hintRoom, hintSpot, toolbarSpot, type Box } from "./placement";
+import { toolbarSpot, type Box } from "./placement";

 interface Props {
   /** Names the toolbar after its sticker. */
@@ -51,10 +51,6 @@ interface Props {
   reduced: boolean;
   /** Its Original Artist, when someone other than the board's owner drew it: the chip heads the toolbar. */
   artist?: PersonView;
-  /** The first selection on this device: a hint says how to go on, placed clear of what it mustn't cover. */
-  hinted?: boolean;
-  /** The hint found room and is on screen. */
-  onHintShown?: () => void;
 }

 /** Arrange's step tiles in the order they read: moves on the first row, sizes and turns on the second. */
@@ -87,18 +83,13 @@ export function StickerToolbar({
   onEscape,
   reduced,
   artist,
-  hinted = false,
-  onHintShown,
 }: Props) {
   const { t } = useTranslation();
   const ref = useRef<HTMLDivElement>(null);
-  const hint = useRef<HTMLSpanElement>(null);
   const tiles = useRef<HTMLDivElement>(null);
   const tilesId = useId();
-  const hintShown = useEffectEvent(() => onHintShown?.());

-  // Placed once it's measured, before it's painted: its width follows the labels it shows. The hint
-  // hugs its words up to the room the board has, and is placed once the toolbar is.
+  // Placed once it's measured, before it's painted: its width follows the labels it shows.
   useLayoutEffect(() => {
     const el = ref.current;
     if (!el) return;
@@ -108,35 +99,19 @@ export function StickerToolbar({
     // The step tiles open on the row's far side from the sticker, so where the open toolbar fits,
     // opening them leaves the row in place.
     el.dataset.over = String(top + bar.h / 2 < sticker.y);
-    const note = hint.current;
-    if (!note) return;
-    note.style.maxWidth = `${hintRoom(board.W)}px`;
-    const spot = hintSpot(
-      sticker,
-      board,
-      { w: note.offsetWidth, h: note.offsetHeight },
-      { left, top, right: left + bar.w, bottom: top + bar.h },
-      { knobBelow, clearOf },
-    );
-    // With no room it stays hidden, and the board doesn't count it as shown.
-    note.style.visibility = spot ? "visible" : "hidden";
-    if (!spot) return;
-    note.style.transform = `translate(${spot.left.toFixed(1)}px, ${spot.top.toFixed(1)}px)`;
-    hintShown();
   });

   // It comes in when it first shows. Selection moving straight to another sticker swaps one toolbar
   // for another in the same commit, and that one moves over without coming in again.
   const reveal = useEffectEvent(() => {
     if (reduced || performance.now() - lastHidden < HANDOFF_MS) return;
-    for (const el of [ref.current, hint.current])
-      el?.animate(
-        [
-          { opacity: 0, translate: "0 -4px" },
-          { opacity: 1, translate: "0 0" },
-        ],
-        { duration: 160, easing: EASE_OUT },
-      );
+    ref.current?.animate(
+      [
+        { opacity: 0, translate: "0 -4px" },
+        { opacity: 1, translate: "0 0" },
+      ],
+      { duration: 160, easing: EASE_OUT },
+    );
   });
   useLayoutEffect(() => {
     reveal();
@@ -224,12 +199,6 @@ export function StickerToolbar({
           </div>
         )}
       </div>
-      {/* Hidden from screen readers, who hear the sticker's own description of its keys instead. */}
-      {hinted && (
-        <span ref={hint} className="sticker-toolbar__hint keep-phrases" aria-hidden>
-          {t(($) => $.stickerBoard.toolbar.firstSelectionHint)}
-        </span>
-      )}
     </>
   );
 }
```

```python
# phase0/11-delete-hint.py
# Removes the first-selection hint's placement, tests and style. Run from the worktree's root.
from pathlib import Path


def cut(path, start, end):
    """Deletes from the line that starts with `start` up to, not including, the one that starts with `end`."""
    p = Path(path)
    s = p.read_text()
    a = s.index(start)
    b = s.index(end, a)
    p.write_text(s[:a] + s[b:])


def swap(path, old, new):
    p = Path(path)
    s = p.read_text()
    assert s.count(old) == 1, (path, old)
    p.write_text(s.replace(old, new))


SB = "apps/frontend/src/sticker-board/"
cut(SB + "placement.ts",
    "/** A selected sticker's frame, and the handles on its corners, reach this far past its box. */",
    "/**\n * Spots for new stickers, as x, y, s and r")
cut(SB + "placement.test.ts",
    '  describe("the first selection\'s hint", () => {',
    '  it("finds the knob out of reach off the board\'s top or under the name, and nowhere else", () => {')
swap(SB + "placement.test.ts", "  freeSpot,\n  hintSpot,\n", "  freeSpot,\n")
swap(SB + "placement.test.ts", "  nextZ,\n  S_MAX,\n", "  nextZ,\n")
swap(SB + "placement.test.ts", "  toolbarSpot,\n  toPx,\n  type Box,\n", "  toolbarSpot,\n")
cut(SB + "StickerBoard.test.tsx",
    'describe("StickerBoard\'s first-selection hint", () => {',
    'describe("StickerBoard\'s Arrange", () => {')
swap(SB + "StickerBoard.test.tsx", 'import { forgetSelectionHints } from "./selectionHint";\n', "")
swap(SB + "StickerBoard.test.tsx", "  forgetGreetings();\n  forgetSelectionHints();\n", "  forgetGreetings();\n")
cut(SB + "StickerBoard.css",
    "/* The first selection's hint: label stock like the seal check's chip.",
    "/* Arrange's step tiles: moves on the first row")
```

- [ ] Test: frontend `src/receiving src/sticker-board/StickerBoard.test.tsx src/sticker-board/StickerToolbar.test.tsx src/sticker-board/placement.test.ts`. Red check: `title_other` en back to "{{count}} gifts for you"; the badge test fails.
- [ ] Commit `fix(frontend): no first-selection hint, and the gift chip says Gifts for you beside its count`.

## Task 12: The Sealed card's fine print without your handle (new)

```diff
# phase0/12-sealed-card.diff
diff --git a/apps/frontend/src/i18n/strings/stickerCreation.ts b/apps/frontend/src/i18n/strings/stickerCreation.ts
index ecc822d5..f49a1baa 100644
--- a/apps/frontend/src/i18n/strings/stickerCreation.ts
+++ b/apps/frontend/src/i18n/strings/stickerCreation.ts
@@ -340,11 +340,8 @@ export const stickerCreation = {
   sealedCard: {
     /** Sealed card, the backing card the new sticker lands on at the end of the seal ceremony: its title, under the sticker */
     title: { en: "Sealed", ja: "仕上がりました" },
-    /** Sealed card: the fine print under the title; {{no}} is the sticker's number (No.0012), <duration/> its drawing time (3分12秒), {{day}} the day it was sealed (2026.09.27) and <handle/> your @handle */
-    finePrint: {
-      en: "{{no}} · <duration/> · {{day}} · <handle/>",
-      ja: "{{no}}・<duration/>・{{day}}・<handle/>",
-    },
+    /** Sealed card: the fine print under the title; {{no}} is the sticker's number (No.0012), <duration/> its drawing time (3分12秒) and {{day}} the day it was sealed (2026.09.27) */
+    finePrint: { en: "{{no}} · <duration/> · {{day}}", ja: "{{no}}・<duration/>・{{day}}" },
     /** Sealed card: the main key while you have tickets left; it opens a fresh sheet for the next sticker */
     keepDrawing: { en: "Keep drawing", ja: "もう1枚かく" },
     /** Sealed card: the small button at the bottom after your last ticket, with a ticket icon; it opens the reserve ticket checkout */
diff --git a/apps/frontend/src/sticker-creation/DrawingScreen.tsx b/apps/frontend/src/sticker-creation/DrawingScreen.tsx
index d37a4c06..9828e7fe 100644
--- a/apps/frontend/src/sticker-creation/DrawingScreen.tsx
+++ b/apps/frontend/src/sticker-creation/DrawingScreen.tsx
@@ -1116,7 +1116,6 @@ export function DrawingScreen({ ref, active, onSealed, onNewSticker, onGoToBoard
           leaving={ceremony.leaving}
           onLeft={() => dropCeremony(ceremony)}
           sheet={ceremony.sheet}
-          handle={me.handle ?? ""}
           onKeepDrawing={() => {
             handOver(ceremony);
             startRightAway({ reserve: false });
diff --git a/apps/frontend/src/sticker-creation/sealing/SealCeremony.test.tsx b/apps/frontend/src/sticker-creation/sealing/SealCeremony.test.tsx
index 4da72414..45c429c2 100644
--- a/apps/frontend/src/sticker-creation/sealing/SealCeremony.test.tsx
+++ b/apps/frontend/src/sticker-creation/sealing/SealCeremony.test.tsx
@@ -2,11 +2,7 @@
 import { act } from "react";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import { emptyApi, FRESH_TICKETS, renderWithApi, shownText } from "../../api/testing";
-import {
-  MARKUP_LIKE_NAME,
-  sticker as apiSticker,
-  TEST_KYOTO_SEIKA_SUBJECTS,
-} from "../../api/testFixtures";
+import { sticker as apiSticker, TEST_KYOTO_SEIKA_SUBJECTS } from "../../api/testFixtures";
 import type { Sticker, Tickets } from "@drawing-app/api/client";
 import { formatDay, formatDuration, formatNo } from "../../stickers/format";
 import { formatRefillTime } from "../../tickets/refill";
@@ -64,11 +60,8 @@ let mountedAt = 0;
 // One sheet for every render: a new one would be a new ceremony.
 const SHEET = { x: 8, y: 8, w: 374, h: 788 };

-/** The ceremony with the server's answer, as `handle`: null while the seal is on its way. */
-const ceremony = (
-  answer: Sticker | null,
-  { handle = "alice", failed = false, leaving = false } = {},
-) => (
+/** The ceremony with the server's answer: null while the seal is on its way. */
+const ceremony = (answer: Sticker | null, { failed = false, leaving = false } = {}) => (
   <SealCeremony
     sticker={sticker}
     sealed={answer}
@@ -76,7 +69,6 @@ const ceremony = (
     leaving={leaving}
     onLeft={onLeft}
     sheet={SHEET}
-    handle={handle}
     onKeepDrawing={onKeepDrawing}
     onBoard={onBoard}
     onShop={onShop}
@@ -92,12 +84,11 @@ const use = (dayIndex: number, kind: "daily" | "reserve" = "daily") => ({
 });

 /**
- * Opens the ceremony as `handle`, with `used` of the day's three tickets used, then `reserveUsed` reserve tickets,
+ * Opens the ceremony with `used` of the day's three tickets used, then `reserveUsed` reserve tickets,
  * and `reserveLeft` held. `answer` is the server's: null while the seal is on its way.
  */
 async function seal(
   used: number,
-  handle = "alice",
   {
     answer = sealed,
     reserveLeft = 0,
@@ -108,10 +99,7 @@ async function seal(
     use(i, i < used ? "daily" : "reserve"),
   );
   const tickets = { ...FRESH_TICKETS, dailyLeft: 3 - used, reserveLeft, usedToday };
-  view = renderWithApi(
-    ceremony(answer, { handle }),
-    emptyApi({ tickets: () => Promise.resolve(tickets) }),
-  );
+  view = renderWithApi(ceremony(answer), emptyApi({ tickets: () => Promise.resolve(tickets) }));
   host = view.host;
   mountedAt = Date.now();
   // The tickets load before the card can show them.
@@ -393,7 +381,7 @@ describe("SealCeremony", () => {

   it("says when daily tickets come back only when this sticker used the day's last one", async () => {
     const refill = `New daily tickets at ${formatRefillTime(new Date(FRESH_TICKETS.nextRefillAt))}`;
-    await seal(3, "alice", { reserveLeft: 2 });
+    await seal(3, { reserveLeft: 2 });
     playThrough();
     expect(host.textContent).toContain(refill);
     // One reserve ticket in the daily slots' place, with its count.
@@ -404,14 +392,14 @@ describe("SealCeremony", () => {
     view?.unmount();

     // A reserve ticket sealed this one: the daily tickets were already gone.
-    await seal(3, "alice", { reserveLeft: 1, reserveUsed: 1 });
+    await seal(3, { reserveLeft: 1, reserveUsed: 1 });
     playThrough();
     expect(button("Keep drawing")).toBeTruthy();
     expect(host.textContent).not.toContain("New daily tickets at");
   });

   it("waits at the cut while the seal is on its way, then peels onto the card", async () => {
-    await seal(1, "alice", { answer: null });
+    await seal(1, { answer: null });
     wait(20_000);
     expect(card()).toBeNull();
     expect(root()?.hasAttribute("data-lifted")).toBe(false);
@@ -428,7 +416,7 @@ describe("SealCeremony", () => {
   });

   it("skips to the wait at a tap, and on to the card once sealed", async () => {
-    await seal(1, "alice", { answer: null });
+    await seal(1, { answer: null });
     wait(100);
     tap();
     expect(host.querySelector<HTMLElement>(".seal-ceremony__plain")?.style.opacity).toBe("1");
@@ -468,7 +456,7 @@ describe("SealCeremony", () => {
   });

   it("fades back to the drawing when the seal fails", async () => {
-    await seal(1, "alice", { answer: null });
+    await seal(1, { answer: null });
     wait(3000);
     view?.rerender(ceremony(null, { failed: true }));
     expect(root()?.classList.contains("is-failed")).toBe(true);
@@ -479,7 +467,7 @@ describe("SealCeremony", () => {
   it("names the pair a sticker drawn in Kyoto Seika Practice Mode was dealt, under Sealed, as a line of the card", async () => {
     const [first, second] = TEST_KYOTO_SEIKA_SUBJECTS;
     const kyotoSeika = { ...sealed, kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS };
-    await seal(1, "alice", { answer: kyotoSeika });
+    await seal(1, { answer: kyotoSeika });
     const pair = host.querySelector(".sealed-card__pair");
     if (!pair) throw new Error("The sealed card names no pair");
     expect([...pair.querySelectorAll("rt")].map((rt) => rt.textContent)).toEqual([
@@ -502,14 +490,10 @@ describe("SealCeremony", () => {
     expect(host.querySelector(".sealed-card__pair")).toBeNull();
   });

-  it("prints a handle that reads as markup as it is, in the card's fine print", async () => {
-    await seal(1, MARKUP_LIKE_NAME);
+  it("prints the sticker's number, drawing time and seal day in the card's fine print", async () => {
+    await seal(1);
     expect(shownText(".sealed-card__fine")).toBe(
-      `${formatNo(sealed.number)} · ${formatDuration(sealed.timeUsed)} · ${formatDay(NOW.getTime())} · @${MARKUP_LIKE_NAME}`,
-    );
-    // The handle keeps its own case in the fine print's capitals.
-    expect(host.querySelector(".sealed-card__fine .handle")?.textContent).toBe(
-      `@${MARKUP_LIKE_NAME}`,
+      `${formatNo(sealed.number)} · ${formatDuration(sealed.timeUsed)} · ${formatDay(NOW.getTime())}`,
     );
   });
 });
diff --git a/apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx b/apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx
index c5bf250d..ed9e8b22 100644
--- a/apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx
+++ b/apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx
@@ -58,7 +58,6 @@ interface Props {
   onLeft: () => void;
   /** The sheet the sticker was cut from, in the ceremony's own pixels. */
   sheet: Box;
-  handle: string;
   onKeepDrawing: () => void;
   onBoard: () => void;
   onShop: () => void;
@@ -117,7 +116,6 @@ export function SealCeremony({
   leaving,
   onLeft,
   sheet,
-  handle,
   onKeepDrawing,
   onBoard,
   onShop,
@@ -355,7 +353,6 @@ export function SealCeremony({
         {sealed && (
           <SealedCard
             sealed={sealed}
-            handle={handle}
             keyShown={keyShown}
             leaving={leaving}
             cardRef={card}
diff --git a/apps/frontend/src/sticker-creation/sealing/SealedCard.tsx b/apps/frontend/src/sticker-creation/sealing/SealedCard.tsx
index b5f638ef..538b1a25 100644
--- a/apps/frontend/src/sticker-creation/sealing/SealedCard.tsx
+++ b/apps/frontend/src/sticker-creation/sealing/SealedCard.tsx
@@ -4,7 +4,7 @@ import { BuyTicketsIcon, DrawIcon, StickerBoardIcon } from "../../icons";
 import { spokenSubject } from "../../kyoto-seika/spokenSubject";
 import { SubjectPair } from "../../kyoto-seika/SubjectPair";
 import { Duration } from "../../stickers/Duration";
-import { formatDay, formatHandle, formatNo } from "../../stickers/format";
+import { formatDay, formatNo } from "../../stickers/format";
 import type { Sticker } from "@drawing-app/api/client";
 import { toSticker } from "../../api/views";
 import { formatRefillTime } from "../../tickets/refill";
@@ -22,7 +22,6 @@ const ACT_AFTER_MS = 160;

 interface Props {
   sealed: Sticker;
-  handle: string;
   /** Its first key has faded up: until then nothing on the card takes a press, focus or Escape. */
   keyShown: boolean;
   /** It's on its way out, over the fresh sheet: it takes no presses and keeps what it showed. */
@@ -80,7 +79,6 @@ function TicketRow({ tickets, peel }: { tickets: Tickets; peel: boolean }) {
  */
 export function SealedCard({
   sealed,
-  handle,
   keyShown,
   leaving,
   cardRef,
@@ -151,12 +149,7 @@ export function SealedCard({
         <Trans
           i18nKey={($) => $.stickerCreation.sealedCard.finePrint}
           values={{ no: formatNo(sealed.number), day: formatDay(Date.parse(sealed.sealedAt)) }}
-          components={{
-            duration: <Duration seconds={sealed.timeUsed} />,
-            // A handle is a component's text, not a value: Trans would read markup in a value. It
-            // keeps its own case in the fine print's capitals.
-            handle: <span className="handle">{formatHandle(handle)}</span>,
-          }}
+          components={{ duration: <Duration seconds={sealed.timeUsed} /> }}
         />
       </p>
       <div data-card-line>
```

- [ ] Apply `12-sealed-card.diff`. Test: frontend `src/sticker-creation/sealing`. Red check: append ` · @` to the English `finePrint`; the fine print test fails.
- [ ] Commit `fix(frontend): the Sealed card's fine print leaves out your own handle`.

## Task 13: Words and docs (draft + new)

- [ ] Port: `git -C "$W" show eb163762 -- AGENTS.MD | git -C "$W" apply -3` (Direct and Residual as built). Conflicts: none.
- [ ] Not ported: 9ba3c957 and the DESIGN.md hunks of 890a78d0, c9d290b0 and 911d56e4 (main's docs moved; large-screen text). Run `13-docs.py` (stat board for "cork back" in AGENTS.MD's `src/sticker-board` line and every doc; DESIGN.md, PRODUCT.md and the glossary for Tasks 3–12), then `(cd "$W" && pnpm exec oxfmt AGENTS.MD DESIGN.md PRODUCT.md apps/frontend/src/i18n/glossary.md)`. The script writes Settings and PRODUCT.md's Languages line as Task 7 leaves them: English and 日本語, a new account in LINE's language.

```python
# phase0/13-docs.py
# The stat board's name, Direct and Residual as built, and the docs for Phase 0. Run from the worktree's
# root, after eb163762's AGENTS.MD hunks; then run oxfmt on the four docs.
from pathlib import Path


def edit(path, swaps):
    p = Path(path)
    s = p.read_text()
    for old, new in swaps:
        assert s.count(old) == 1, (path, old[:80], s.count(old))
        s = s.replace(old, new)
    p.write_text(s)


edit("AGENTS.MD", [
    ("someone else's sticker board and its cork back;", "someone else's sticker board and its stat board;"),
])
edit("apps/frontend/src/i18n/strings/stickerBoard.ts", [
    ("  /** The Sticker Board's cork back: your own, or someone else's. */",
     "  /** The stat board, the back of a sticker board: your own, or someone else's. */"),
    ("    /** Stat board (a sticker board's cork back, yours or someone else's): screen readers' name for the dialog; {{name}} is the board owner's LINE name */",
     "    /** Stat board (the back of a sticker board, yours or someone else's): screen readers' name for the dialog; {{name}} is the board owner's LINE name */"),
])
edit("DESIGN.md", [
    ("The board has a cork back, and your figures are paper pinned to it.",
     "The board's back is its stat board, a corkboard, and your figures are paper pinned to it."),
    ("the whole board turns over to its cork back, where their figures",
     "the whole board turns over to its stat board, where their figures"),
    ("the made stamp on the cork back, NEW dots", "the made stamp on the stat board, NEW dots"),
    ("the selected leaderboard tab (but Streak's, which is tangerine), and on the cork back the receipt's pushpin and heart, and the hit counter's speed lines.",
     "the selected leaderboard tab (but Streak's, which is tangerine), the heart before each Most gratitude figure, and on the stat board the receipt's pushpin and heart, and the hit counter's speed lines. Gratitude has one mark wherever it shows, Phosphor's filled heart (GratitudeIcon): plain Bonbon Pink before every amount, with the drawings' ink line only on the stat board's printed papers, and on a pink disc only in the open trail row."),
    ("and the received stamp on the cork back.", "and the received stamp on the stat board."),
    ("The streak leaf's band on the cork back, with the Fire icon", "The streak leaf's band on the stat board, with the Fire icon"),
    ("### The cork back\n\n- **Cork** (cork)", "### The stat board\n\n- **Cork** (cork)"),
    ("the paper on the cork back, the artist chip", "the paper on the stat board, the artist chip"),
    ("the label-maker tape on the cork back, the current drawing tool", "the label-maker tape on the stat board, the current drawing tool"),
    ("- **Figure** (900, 26px on the cork back's stamps up to two characters, stepping down from three and never under 11px, and 27px in the open trail row and its replay stage, up to 52px on the gratitude receipt and 58px on the streak leaf; line-height about 0.95, width 125, proportional figures): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the cork back (the receipt's TOTAL at 30px), and the hit counter (23px on the leaderboard, 20px in the cork back's Bests).",
     "- **Figure** (900, 26px on the stat board's stamps up to two characters, stepping down from three and never under 11px, 27px in the open trail row and its replay stage, 40px for the gratitude receipt's total and 58px on the streak leaf; line-height about 0.95, width 125, proportional figures): gratitude amounts in the combo, the receipt and the sticker's trail, the counts pinned on the stat board, and the hit counter (23px on the leaderboard, 20px in the stat board's Bests)."),
    ("Settings headings on the cork back (18px).", "Settings headings on the stat board (18px)."),
    ("the sticker tray runs down the right edge from under the header (y 64) to the foot and opens across half the screen.",
     "the sticker tray runs down the right edge from under the header and its gifts badge (y 72) to the foot, and opens across half the screen, only as far as its sheets."),
    ("The cork back is a two-column grid (206px and the rest, 16 × 12px gaps), with Flip back at the foot of the right column in the thumb's reach.",
     "The stat board is a two-column grid (206px and the rest, 16 × 12px gaps) under Flip back, which sits at its top left, where the name that turns the board over sits."),
    ("paper hanging on the cork back, from its pin or tape.", "paper hanging on the stat board, from its pin or tape."),
    ("The one exception is the cork back: paper, stamps and pins", "The one exception is the stat board: paper, stamps and pins"),
    ("Paper on the cork back has torn or cut edges", "Paper on the stat board has torn or cut edges"),
    ("Tapping it turns the whole board over to its cork back;", "Tapping it turns the whole board over to its stat board;"),
    ("### The cork back\n\nThe board's back,", "### The stat board\n\nThe board's back,"),
    ('- **Gratitude:** a printed receipt pinned with a pink pushpin, headed "Gratitude received" beside a pink heart with an ink line. Its rows are plain line items in Ink, Direct and Residual, with no dots, each glossed in one line of fine print ("For stickers given", "For stickers made, given on"); a row at 0 is left off, so a friend-first artist sees Direct alone. The total is its TOTAL line. When the stats don\'t load, the receipt says why in place of its rows.',
     '- **Gratitude:** a printed receipt pinned with a pink pushpin, headed "Gratitude received" beside a pink heart with an ink line, over the total in big numerals. On your own stat board a quiet link under it, "See where it came from", opens your gratitude events in a bottom sheet: a row per combo, newest first, with the sticker, who sent it, the day, a RESIDUAL tag on your Original Artist Gratitude Share, and the amount after its plain pink heart; Show more loads older ones. Someone else\'s receipt shows only the total. When the stats don\'t load, the receipt says why in place of its total.'),
    ("Best combo on it is the hit counter, with no note, and it fits inside its line.",
     "Best combo on it is the hit counter, with no note, and it fits inside its line. Best day, the most gratitude received in a day, leads its figure with the ink-lined heart. Each best's name stays on one line: its figure moves under it, at the right, only when the two don't fit side by side."),
    ("- **Controls:** Flip back is label stock at the foot of the right column. Bare cork, Escape and LINE's Back also flip back. The back has no key.",
     "- **Controls:** Flip back is label stock at the top left, where the name that turns the board over sits on its front, and it comes first for keyboards and screen readers; on your own stat board outside LINE's app, Log out of LINE follows it. Bare cork, Escape and LINE's Back also flip back. The stat board has no key."),
    ("- **Settings:** your own back's first paper under the stats,", "- **Settings:** your own stat board's first paper under the stats,"),
    ("Language is ruled 44px radio rows (Same as LINE, English, 日本語) with an Ink dot in a ring for the pick; a failed save shows the error line. Under it, 18+ stickers is one switch row, Show 18+ stickers, filled Bonbon Pink when on, over a line on who it's for. What a switch does is a 13px Graphite supporting note in sentence case under it, never caps fine print; the legends and the credit stay fine print. Under that, Entrance exam is Kyoto Seika Manga Expression Practice Mode's switch row.",
     "Its settings are split by dashed rules. Language is one 44px row showing its choice in Graphite with a caret; the select lies unseen over the whole row, so a tap anywhere on it opens the phone's own list of its two choices, English and 日本語, and a failed save shows the error line. Under it, Show 18+ stickers is one switch row, with no heading and no fine print, filled Bonbon Pink when on. Under that, Entrance exam is Kyoto Seika Manga Expression Practice Mode's switch row, under its legend; what the switch does is a 13px Graphite supporting note in sentence case under it, never caps fine print, and the legend and the credit stay fine print."),
    ('- **The Sui address paper:** one line of fine print says what it\'s for ("Keeps your stickers and pays for reserve tickets").',
     '- **The Sui address paper:** its caption, then one line of fine print on what it\'s for: "Holds your stickers". The network\'s name is left to the address dialog\'s note. Someone else\'s stat board shows theirs too, at the foot of the leaf-and-stamps column, glossed "Holds their stickers"; it opens the same address dialog, titled with their name.'),
    ('"A gift for you" or "3 gifts for you" over "from @alice (and 2 more)" in Ink fine print, since Graphite is too faint on Pink Soft; a Seal Yellow dot badge counts them past one.',
     '"A gift for you", or "Gifts for you" beside a Seal Yellow dot badge that counts them, over "from @alice", the newest gift\'s sender, in Ink fine print, since Graphite is too faint on Pink Soft.'),
    ('Under "Sealed", the fine print keeps the handle\'s own case.',
     'Under "Sealed", the fine print: the sticker\'s number, drawing time and seal day.'),
    ('what you hold (the reserve ticket mark × count, left off at zero); the headline "Reserve tickets"; one line on what they\'re for; the one-ticket price from the pack list ("¥100 each, less in packs", the tail only while a pack is discounted, outlined while it loads); the perforation; the blue Buy reserve tickets key, the page\'s only key; and the Sui credit.',
     'the headline "Reserve tickets"; one line on what they\'re for; the perforation; what you hold (the reserve ticket mark × count, left off at zero) over the blue Buy reserve tickets key, the page\'s only key; and the Sui credit.'),
    ('- **Coming-soon shelves:** Laminates, Brushes and Backing foils. Each has its name in Title type, a quiet Liner Deep "Coming soon" pill in `--graphite-on-deep`, the Graphite that reads 5.0:1 on Liner Deep where plain Graphite reads 4.2:1, and one Graphite line on what the things are. Four 104px swatches scroll sideways with snap, the fourth peeking past the edge.',
     '- **Coming-soon shelves:** Laminates, Brushes and Backing foils, under one quiet Liner Deep "Coming soon" pill in `--graphite-on-deep`, the Graphite that reads 5.0:1 on Liner Deep where plain Graphite reads 4.2:1. Each shelf has its name in Title type over four 104px swatches that scroll sideways with snap, the fourth peeking past the edge.'),
    ('- **The search:** white label stock on the label shadow, "Search artists" beside an @, with no halo.',
     '- **The search:** the text field, "Search artists" beside an @, with no halo.'),
    ("Best combo is the hit counter, and Streak's figures (each person's current streak, ties sharing a rank) lead with the streak's fire (StreakIcon) in Tangerine.",
     "Best combo is the hit counter; Most gratitude's figures lead with the gratitude heart in Bonbon Pink, and Streak's (each person's current streak, ties sharing a rank) with the streak's fire (StreakIcon) in Tangerine."),
    ("in the cork back's Bests (20px)", "in the stat board's Bests (20px)"),
    ('\n\nThe first time you select a sticker on a phone, a hint in the seal check\'s chip stock says how to go on, in two rows: "Tap again to open · Tap the board to let go" and "Drag to the zipper to put it away". It sits nearest the toolbar, clear of the frame, knob, toolbar and Draw, and goes when the selection ends, never to return on that phone; with no clear room it waits for a selection that has some. Taps pass through it, screen readers skip it (the selected sticker\'s own description says as much), reduced motion shows it with no travel, and someone else\'s board has none.',
     ""),
    ("The slider rests at the top, just under the board header, with its pull hanging down.",
     "The slider rests at the top, just under the board header and its gifts badge, with its pull hanging down."),
    ("past 25%, or flicked, it runs to the bottom stop, knocks it, and the mouth overshoots and settles at half the screen.",
     "past 25%, or flicked, it runs on and knocks to a stop just below the stack, and the mouth overshoots and settles at half the screen. The rail runs on to the board's foot, its teeth meshed below the slider, so the open pouch shows no bare lining under the sheets."),
    ("the cork back its papers' figures as blocks", "the stat board its papers' figures as blocks"),
    ("- **Gratitude:** heart (fill) at every size, since it's a mark, not a control: Send gratitude, the Transfer Trail, the combo HUD and the receipt.",
     "- **Gratitude:** heart (fill) at every size, since it's a mark, not a control: Send gratitude, the Transfer Trail, the combo HUD, the stat board's receipt and Best day, your gratitude events, and Explore's Most gratitude figures."),
    ("your own cork back's controls add Share my board", "your own stat board's controls add Share my board"),
    ("the sticker's trail and the board's cork back.", "the sticker's trail and the stat board."),
    ("they live on the cork back as paper.", "they live on the stat board as paper."),
    ('"Residual", the receipt\'s name for the Original Artist Gratitude Share, is the one allowed exception',
     '"Residual", the tag on your gratitude events\' Original Artist Gratitude Share rows, is the one allowed exception'),
    ('  label-tape:\n    backgroundColor: "{colors.ink}"\n    textColor: "{colors.liner}"\n    padding: "0 12px 0 11px"\n    height: "26px"\n',
     '  label-tape:\n    backgroundColor: "{colors.ink}"\n    textColor: "{colors.liner}"\n    padding: "0 12px 0 11px"\n    height: "26px"\n  text-field:\n    backgroundColor: "{colors.canvas}"\n    textColor: "{colors.ink}"\n    rounded: "{rounded.label}"\n    padding: "0 12px"\n    height: "48px"\n'),
    ("### The press\n",
     "### Text field\n\nOne field wherever a person types, Explore's search and the handle prompt: a Canvas face on the label shadow with a 1px strong rule, 6px corners, 48px tall with 12px inside, and 16px text at 500 over a Graphite placeholder, the size below which iOS zooms into a focused field. Typing draws the house focus ring, 2px Ink at a 3px offset. It isn't label stock, and never presses.\n\n### The press\n"),
])
edit("PRODUCT.md", [
    (" The first sticker you select on a phone says, once, how to open it, let go and put it away.", ""),
    ("- **The stat board** is a sticker board's cork back: tap a person's picture and name to turn their board over. It holds their User Stats: Gratitude received (Direct and Residual), the streak (consecutive days with a sealed sticker), stickers made, received and given, and bests (longest streak, best combo in hits, most Gratitude in a day). Your own adds Settings, with Language, Show 18+ stickers and Kyoto Seika Manga Expression Practice Mode, and your Sui address as a QR code.",
     "- **The stat board** is the back of a sticker board, a corkboard: tap a person's picture and name to turn their board over. It holds their User Stats: Gratitude received as one total, the streak (consecutive days with a sealed sticker), stickers made, received and given, and bests (longest streak, best combo in hits, best day: the most Gratitude in a day); and their Sui address as a QR code. Your own lists where your Gratitude came from, combo by combo, Direct or Residual, and adds Settings, with Language, Show 18+ stickers and Kyoto Seika Manga Expression Practice Mode."),
    ("your Sui address on your stat board, as a QR code with its explorer;", "a person's Sui address on their stat board, as a QR code with its explorer;"),
    ("Residual, on the stat board's receipt, is the one exception.", "Residual, in your gratitude events, is the one exception."),
    ("The app follows LINE's language unless the person picks one in Settings, and that language also sets",
     "A new account starts in LINE's language (the device's, outside LINE), Settings switches it between English and 日本語, and that language also sets"),
])
edit("apps/frontend/src/i18n/glossary.md", [
    ("| stat board (the board's cork back) |", "| stat board (the board's back) |"),
    ("| Direct / Residual (gratitude)      | 直接 / 作者として                      | The stat board's receipt rows; never a money word such as 印税                        |",
     "| Residual (gratitude) | 作者として | The tag on your gratitude events' rows; never a money word such as 印税 |"),
    ("| The stat board's address paper, which keeps your stickers and pays                    |",
     "| The stat board's address paper, which holds the stickers |"),
])
```

- [ ] Older plans: `(cd "$W" && git grep -l -i "cork back" -- docs/superpowers/plans | while read -r f; do sed -i '' -e 's/cork back/stat board/g' -e 's/Cork back/Stat board/g' "$f"; done)`.
- [ ] Check: `git -C "$W" grep -n -i "cork back"` shows only the brief's own rule line.
- [ ] Commit `docs: say stat board, not cork back; Phase 0 in DESIGN.md, PRODUCT.md and the glossary`.

## Task 14: Backlog

- [ ] Nothing to do: `docs/superpowers/plans/2026-10-08-board-feedback-backlog.md` was cut to the open items with this plan. If a Phase 0 item is dropped while building, put it back there.

## Task 15: Verify, capture, squash, merge, clean up

- [ ] `(cd "$W" && pnpm check:full)` and `(cd "$W" && pnpm test:e2e)`: all pass.
- [ ] Servers on the e2e ports (stop them before `pnpm test:e2e`):

```bash
mkdir -p "$W/data/phase0/images"
(cd "$W/apps/api" && PORT=8799 DATABASE_URL="$W/data/phase0/drawing-app.db" IMAGE_DIR="$W/data/phase0/images" IMAGE_BASE_URL=http://localhost:5199/api/images DEV_SIGN_IN=on STICKER_CHAIN_MODE=mock node --env-file=.env.example src/server.ts) &
(cd "$W/apps/frontend" && VITE_LIFF_MOCK=on node_modules/.bin/vite --config e2e/vite.config.ts) &
```

- [ ] Captures with `captures.cjs` (routes stand in for gratitude, gifts and reserve tickets a fresh account lacks): `W="$W" ENGINE=chromium SIZE=390x844 UI_LANG=en node /tmp/phase0/captures.cjs`, then `SIZE=820x1094`, then `UI_LANG=ja`. Look for: gift chip on one line, clear of the zipper; tray open with little lining; Flip back top left; receipt total and the link; Best day on one line; Settings rows (en/ja); the events sheet; the paper's copy (yours, theirs); the Shop's order and one Coming soon; Explore's field and Most gratitude's heart.
- [ ] WebKit: probe first (`webkit.launch()` then `page.goto("data:text/html,ok")`). On 2026-10-08 it couldn't open even that here. If it opens pages, run the captures with `ENGINE=webkit` (it drops the API's `Secure` cookie on localhost: send `POST /api/session` from Node and add the cookie back without `Secure`). If not, say so and list the checks for ad0ll's iPhone.

```js
// phase0/captures.cjs
// Phase 0's captures, against the dev server on the e2e suite's ports (Task 13). Scratch: not committed.
// W=<worktree> ENGINE=chromium|webkit SIZE=390x844|820x1094 UI_LANG=en|ja node /tmp/phase0/captures.cjs
const path = require("node:path");
const fs = require("node:fs");
const { chromium, webkit } = require(
  path.join(process.env.W, "apps/frontend/node_modules/@playwright/test"),
);

const BASE = "http://localhost:5199";
const ENGINE = process.env.ENGINE === "webkit" ? "webkit" : "chromium";
const SIZE = process.env.SIZE ?? "390x844";
const LANG = process.env.UI_LANG === "ja" ? "ja" : "en";
const [width, height] = SIZE.split("x").map(Number);
const OUT = path.join("/tmp/phase0/shots", `${ENGINE}-${SIZE}-${LANG}`);
fs.mkdirSync(OUT, { recursive: true });

const hex = (n, fill = "0") => `0x${n.toString(16).padStart(64, fill)}`;
const person = (handle, name) => ({
  id: `user-${handle}`,
  handle,
  lineDisplayName: name,
  linePictureUrl: null,
  nsfwOptIn: false,
});
const files = {
  png: "/x.png",
  mask: "/x.png",
  spec: "/x.png",
  rim: "/x.png",
  flat: "/x.png",
  webp: { sticker: "/x.webp", mask: "/x.webp", spec: "/x.webp", rim: "/x.webp", foil: "/x.webp" },
};
const sticker = (n, artist) => ({
  id: `sticker-${n}`,
  number: 140 + n,
  artist,
  ownerId: artist.id,
  timeUsed: 172,
  width: 224,
  height: 224,
  outline: "M0 0L224 0L224 224L0 224Z",
  contentHash: hex(n),
  images: files,
  objectId: null,
  sealedAt: "2026-10-07T11:52:00.000Z",
  nsfw: false,
  kyotoSeikaSubjects: null,
});
// A long handle, as the critique's: the gift chip still cuts it short (see Open decisions).
const giver = person("lpad-bob-the-long-handle", "Bob");
const ken = person("ken", "Ken Mori");

/** Gives a fresh person the figures the screens need: gratitude, bests, gifts waiting, reserve tickets. */
async function routeData(page) {
  const patch = (url, change) =>
    page.route(url, async (route) => {
      const response = await route.fetch();
      if (!response.ok()) return route.fulfill({ response });
      const body = await response.json();
      change(body);
      await route.fulfill({ response, json: body });
    });
  await patch(/\/api\/sticker-boards\/me\/user-stats$/, (body) => {
    body.userStats.gratitude = { direct: 2460, residual: 395, total: 2855 };
    body.userStats.bests = { bestCombo: 64, mostGratitudeInADay: 1210, longestStreak: 9 };
  });
  await patch(/\/api\/tickets$/, (body) => {
    body.tickets.reserveLeft = 2;
  });
  await patch(/\/api\/explore$/, (body) => {
    body.leaderboards.mostGratitude = [{ person: ken, value: 1210 }];
  });
  await page.route("**/api/gratitude/events*", (route) =>
    route.fulfill({
      json: {
        events: [
          {
            giftId: hex(2, "b"),
            sticker: sticker(2, giver),
            from: ken,
            part: "residual",
            amount: 120,
            recordedAt: "2026-10-07T03:00:00.000Z",
          },
          {
            giftId: hex(1, "a"),
            sticker: sticker(1, giver),
            from: giver,
            part: "direct",
            amount: 480,
            recordedAt: "2026-10-06T03:00:00.000Z",
          },
        ],
        next: null,
      },
    }),
  );
  await page.route("**/api/gifts/for-you", (route) =>
    route.fulfill({
      json: {
        gifts: [1, 2, 3].map((n) => ({
          gift: {
            id: hex(10 + n, "c"),
            stickerId: `sticker-${10 + n}`,
            giverId: giver.id,
            receiverId: null,
            status: "sent",
            escrowStatus: "pending",
            packedAt: "2026-10-07T12:00:00.000Z",
            expiresAt: "2026-10-14T12:00:00.000Z",
            sentAt: "2026-10-07T12:00:30.000Z",
            takenOutAt: null,
            receivedAt: null,
            returnedAt: null,
          },
          giver,
          sticker: sticker(10 + n, giver),
        })),
      },
    }),
  );
  await page.route("**/api/sticker-boards/*/sui-address", (route) =>
    route.fulfill({ json: { suiAddress: `0x7a1e${"0".repeat(56)}b04d` } }),
  );
}

(async () => {
  const browser = await (ENGINE === "webkit" ? webkit : chromium).launch();
  const options = {
    viewport: { width, height },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    locale: LANG === "ja" ? "ja-JP" : "en-US",
  };
  const stamp = Date.now().toString(36);
  // Someone else, made first so their board can be found from Explore.
  const other = `phase0-bob-${stamp}`;
  const otherContext = await browser.newContext(options);
  const otherPage = await otherContext.newPage();
  await otherPage.goto(`${BASE}/?as=${other}`);
  await otherPage.waitForSelector(".board-who", { timeout: 30000 });
  await otherContext.close();

  const context = await browser.newContext(options);
  const page = await context.newPage();
  await routeData(page);
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await page.goto(`${BASE}/?as=phase0-alice-${stamp}`);
  await page.waitForSelector(".board-who", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("1-board-gifts");
  await page.evaluate(() => document.querySelector(".zip__slider")?.click());
  await page.waitForTimeout(1200);
  await shot("2-tray-open");
  await page.evaluate(() => document.querySelector(".zip__slider")?.click());
  await page.waitForTimeout(800);

  await page.click(".board-who");
  await page.waitForTimeout(1500);
  await shot("3-stat-board");
  await page.click(".stat-board__receipt-more");
  await page.waitForTimeout(1200);
  await shot("4-gratitude-events");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const cork = document.querySelector(".stat-board__cork");
    cork?.scrollTo({ top: cork.scrollHeight });
  });
  await page.waitForTimeout(800);
  await shot("5-settings-and-sui-address");
  await page.click(".stat-board__flip-back");
  await page.waitForTimeout(1000);

  await page.click(".tab-shop");
  await page.waitForTimeout(1500);
  await shot("6-shop");
  await page.evaluate(() => document.querySelector(".shop")?.scrollTo({ top: 520 }));
  await page.waitForTimeout(800);
  await shot("7-shop-shelves");

  await page.click(".tab-explore");
  await page.waitForTimeout(1200);
  await page.locator(".explore [role=tab]").nth(1).click();
  await page.waitForTimeout(1200);
  await shot("8-explore-this-week");
  await page.fill(".artist-search input", other);
  await page.waitForTimeout(1500);
  await shot("9-explore-search");
  await page.getByText(other, { exact: false }).first().click();
  await page.waitForTimeout(2000);
  await page.click(".board-who");
  await page.waitForTimeout(1500);
  await shot("10-their-stat-board");
  await browser.close();
  console.log(`captures in ${OUT}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] Squash into five commits, messages on stdin (`git commit -F - <<'MSG'`), no AI attribution: `feat(api): someone else's Sui address and your gratitude events` (1–2); `feat(frontend): one gratitude total and its events, Best day, their Sui address, Flip back at the top left, Settings in rows` (3–6); `feat: Settings offers English and 日本語` (7); `fix(frontend): the Shop says less, one heart and one text field, the tray under the gifts badge, no first-selection hint, the gift chip, the Sealed card's fine print` (8–12); `docs: …` (13).
- [ ] Merge: `git -C "$W" rebase main`, rerun `pnpm check`, then in one command `git -C /Users/adoll/projects/drawing-app merge --ff-only fix/small-fixes && git -C /Users/adoll/projects/drawing-app push`.
- [ ] Clean up: delete this plan; in the brief, replace Phase 0's bullets with one line (built, date, DESIGN.md holds it); remove the worktree and branch; `rm -rf /tmp/phase0`.

## Self-review against the brief

| Brief, Phase 0                                                                                                                                       | Task                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Settings: Language one row, select unseen; Show 18+ stickers one switch, no heading or fine print                                                    | 6                                           |
| Settings: English and 日本語 only; a new account starts in LINE's language                                                                           | 7                                           |
| Receipt: title and total; your events via `GET /api/gratitude/events`; someone else's total only                                                     | 2, 3                                        |
| Bests: Best day with the heart; one line                                                                                                             | 3                                           |
| Sui address: theirs via `GET /api/sticker-boards/:userId/sui-address`; no "Sui Testnet"; "Holds your stickers"                                       | 1, 4                                        |
| Flip back top left, phones too                                                                                                                       | 5                                           |
| Shop: title first, count over Buy, no price line, no shelf lines, one Coming soon                                                                    | 8                                           |
| Sticker board: no first-selection hint; "Gifts for you" without "and 1 more"; zipper clears the badges, runs to the foot, opens as far as its sheets | 10, 11                                      |
| Sealed card: no handle                                                                                                                               | 12                                          |
| One gratitude mark                                                                                                                                   | 3 (stat board), 9 (Explore), 13 (DESIGN.md) |
| One text field                                                                                                                                       | 9, 13                                       |
| Words: stat board; Direct and Residual as built                                                                                                      | 4–6 (comments they touch), 13               |

Names across tasks: `onShowGratitude`, `side`, `.stat-board__head`, `.stat-board__heart`, `GRATITUDE_EVENTS_PAGE`, `stopShort`, `reshape`, `openWindow(short).slider`, `pouchFoot`, `fitStack`, `TOP`, `.text-field`, `.shop__shelves`, `.shop__soon`.

## Open

1. **Japanese "Gifts for you": 届いたギフト.** あなたへのギフト wrapped to two lines and pushed the chip over the zipper's top. A native read is pending for the whole catalog anyway.
2. **"Holds their stickers"** on someone else's paper; the brief gives only "Holds your stickers".
3. **"Sui Testnet" stays in the address dialog's note;** the brief drops it from the paper only.
4. **Log out of LINE** (outside LINE's app) moves up beside Flip back, as on the draft's large screens, rather than staying alone at the column's foot.
5. **One gift keeps "A gift for you"** (no count badge for one); several read "Gifts for you" beside the badge.
6. **A long handle still truncates** in the chip's from line; showing it whole would wrap the chip past the tray's 72px top.
7. **Both gift badges at once:** the second, gifts on their way, still meets the zipper's top on a phone, until the open "On its way" item moves it.
8. **Fewer than four sheets:** the room kept for the edges and +N still shows as lining in the open pouch, as in the draft.
9. **The "For people 18 or older" line** goes with the 18+ fine print, as the brief says; the draft session flagged it and ad0ll didn't answer.
10. **Task 7's details:** the users table rebuild and its migration, which tests insert users without a choice, and where the chat menu relink runs were read, not run.
