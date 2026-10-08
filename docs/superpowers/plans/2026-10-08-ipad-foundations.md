# iPad Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** written 2026-10-08; builds once ad0ll has signed off `docs/superpowers/specs/2026-10-08-ipad-design-brief.md` and Phase 0 (`2026-10-08-small-fixes.md`) has merged. Replaces `2026-10-07-ipad-foundations.md`.

**Goal:** The shell the other iPad plans build on: the large-screen query (a touch screen at least 600×600) in JS and CSS, the desktop frame skipping touch screens, the tab row's lead slot, the quieter tabs, the lit Explore tab leading back from someone's board, and the large-screen tokens. Phones unchanged.

**Architecture:** `ui/largeScreen.ts` holds `LARGE_SCREEN` and `useLargeScreen()`; every large-screen CSS rule spells the same query. TabBar renders `<TabsLeadSlot />` before its nav; a board wraps its key in `<TabsLead>` (`ui/TabsLead.tsx`), which portals it into the slot on a large screen. TabBar's `visiting` prop turns the lit Explore tab into the way back.

**Tech Stack:** React 19, TypeScript, CSS, vitest + happy-dom, Playwright (`apps/frontend/e2e/`: Chromium, WebKit with `E2E_WEBKIT=on`), the i18n catalog.

The design below was prototyped on a scratch copy of main at `056d3cfa`: unit tests, typecheck, lint, format, build, knip, the E2E specs and the captures passed in Chromium. WebKit couldn't open pages on that Mac.

---

## Decisions

1. **The query:** `(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`, as `LARGE_SCREEN` and verbatim in every CSS rule. The build rewrites it to range syntax (`(width>=600px) and (height>=600px) and (any-pointer:coarse)`), which its target (Vite 8's default, iOS 16.4) reads.
2. **The frame** nests `@media not all and (any-pointer: coarse)` inside its query, so any touch screen, an iPad with a trackpad included, keeps the whole screen. A touchscreen laptop at 600×600 or more gets the large layout too.
3. **The lead mounts a key once.** The draft's `useTabsLead()` returned null until TabBar's ref registered, so a board rendered its key on the board, then moved it into the slot a render later: two mounts on a large screen's first render (the TabBar test below caught it: `expected "vi.fn()" to be called once, but got 2 times`). The second mount spends DrawKeyTickets' once-per-open reserve star pop (`reserveShown`) on a key never painted. `TabsLead` renders nothing on a large screen until the slot exists, so the key mounts once, in the slot.
4. **The quieter tabs (option B):** on a large screen a tab you're not on has no outline, at rest or hovered; pressed, it keeps Liner Deep and the inner shadow, without the ring. The current tab is unchanged. The draft's mock (`data/scratch/board/me/footrow.js`, variant `b`, in the draft's worktree) dropped every non-current shadow, press included.
5. **The out-of-tickets card over the board dims the lead with the strip:** the lead drops to `z-index: 1`, under the strip's existing scrim (App.css), so a key in it dims evenly and a tap on it lands on the strip, which OutOfTickets already treats as Back to My board; a first-visit nudge in the lead hides meanwhile. The draft's `.tabs-lead::after` darkened the key's patch of strip twice and left the tickets and the nudge bright (captured on the draft at 820×1094). The checkout over the board dims neither the tabs nor the key, as now.
6. **The way back:** the lit Explore tab is named from a new string, `app.tabs.backToExplore` ("Back to Explore", さがすに戻る), each string naming one place. Focus stays on the tab, where the phone's chip returns it to your row in Explore.
7. **Tokens and sizes,** from the draft: `--gutter-large` 20px, `--tabs-lead-w` 228px, `--tabs-pad-top` 14px on a large screen, tabs at most 144px there. New: the icon sits 4px from its label below 640px wide, as on phones under 390px (マイボード overflowed its 101px tab by 1px at 600 wide, Chromium).
8. **The boundary with `2026-10-08-ipad-board-and-stat-board.md`** (on main): that plan ports the board side, Draw and Give into the lead, `.tabs-lead .board-draw`, the nudge's place, `.board-alerts` at the foot and the chip on phones only. This plan ships the slot and leaves the boards alone, so until the board plan lands a large screen shows the two-ended row with an empty left end, Draw still over the board, and both the chip and the tab leading back.

## Base and ports

- Branch from `origin/main` once Phase 0 has merged. `R` is the main checkout (`git rev-parse --show-toplevel`), shared with other sessions: edit only in your worktree. `SPIKE=$R/.claude/worktrees/ipad-research`; if it's gone, read the draft with `git -C "$R" show <sha> -- <paths>` while branch `spike/ipad-board` exists.
- Nothing is cherry-picked: the draft's commits mix this plan's hunks with the board plan's, and main has moved. Read each port, write the change described in its task.

| Task | Read with `git -C "$SPIKE" show …`                                                                                                                                                                                  | Take                                                                                                                                                                    | Leave                                                                                                                                                                                                                                         | Expect on main                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `09cfc89e -- apps/frontend/src/ui/largeScreen.ts`; `810cc081 -- apps/frontend/src/ui/largeScreen.ts apps/frontend/src/app/App.css`                                                                                  | `LARGE_SCREEN` with `any-pointer: coarse`, `useLargeScreen`, the nested frame query                                                                                     | `isLargeScreen`'s export (212615f7 made it private); 810cc081's other hunks (the gate on the draft's own rules, which this plan writes with it; `onPhoneScreen`, never on main)                                                               | App.css's frame block unchanged since the draft branched (d8132b13)                                                                     |
| 2    | `09cfc89e 212615f7 5cfbbe97 -- apps/frontend/src/ui/tabsLead.ts apps/frontend/src/app/TabBar.tsx apps/frontend/src/app/TabBar.css apps/frontend/src/styles/tokens.css`                                              | the slot element before the nav, outside its landmark; `.tabs` two ends; `.tab` max 144px; `.tabs-lead` place and `z-index: calc(var(--z-sheet) - 1)`; the three tokens | `useTabsLead`/`registerTabsLead` (decision 3); `.phone.has-tucked-tabs .tabs-lead` (no board is mounted while drawing); the `.tabs-lead::after` dim (decision 5); `.tab-home` and the grabber's move (c34494ea, 0a45a528: the drawing plan's) | TabBar.tsx, TabBar.css and TabBar.test.tsx unchanged since the draft branched; tokens.css gained Kyoto Seika lines elsewhere (ff9af30b) |
| 4    | `5cfbbe97 -- apps/frontend/src/app/TabBar.tsx apps/frontend/src/app/App.tsx apps/frontend/src/app/ExploreVisit.test.tsx`; `810cc081 -- apps/frontend/src/app/ExploreVisit.test.tsx apps/frontend/src/ui/testing.ts` | `visiting`, the caret in place of the compass, the tab's name while visiting                                                                                            | the chip's string as the tab's name (decision 6); `onPhoneScreen` (happy-dom is a phone); ArtistBoard's chip (the board plan's)                                                                                                               | App.tsx and ExploreVisit.test.tsx unchanged since the draft branched                                                                    |
| 5    | `09cfc89e -- apps/frontend/src/app/TabBar.css` (its last block)                                                                                                                                                     | the intent: the card dims the board's key                                                                                                                               | the `::after` (decision 5)                                                                                                                                                                                                                    | App.css's over-board strip dim as the draft knew it                                                                                     |

Phase 0 lands first and edits `StickerBoard.tsx`, the stat board, the Shop and DESIGN.md's wording; none of this plan's hunks touch those but DESIGN.md (Task 8: apply each edit to the sentence as it stands).

## Files

- Create `apps/frontend/src/ui/largeScreen.ts`, `apps/frontend/src/ui/TabsLead.tsx`, `apps/frontend/e2e/ipad.ts`, `apps/frontend/e2e/largeScreen.e2e.ts`
- Modify `apps/frontend/src/app/App.css`, `App.tsx`, `TabBar.tsx`, `TabBar.css`, `apps/frontend/src/styles/tokens.css`, `apps/frontend/src/ui/testing.ts`, `apps/frontend/src/i18n/strings/app.ts`, `DESIGN.md`
- Tests: `apps/frontend/src/app/TabBar.test.tsx`, `apps/frontend/src/app/ExploreVisit.test.tsx`

## Checks

- Unit: `pnpm -C "$W" --filter frontend exec vitest run <path>`. happy-dom has no touch screen, so it's a phone; a large-screen test calls `onLargeScreen()` (Task 2) and restores with `vi.restoreAllMocks()`.
- E2E: `pnpm -C "$W" --filter frontend exec playwright test e2e/largeScreen.e2e.ts`. It starts its own API and dev server on `e2e/ports.ts`'s ports (5199/8799) on a fresh database; if they're taken, another session's suite is running: wait. Chromium once per machine: `pnpm -C "$W" --filter frontend exec playwright install chromium`.
- Captures: scratch in `$W/data/scratch/ipad-foundations/` (gitignored), on a dev server of this plan's own, 5195/8795 (Task 7).

### Task 0: Worktree

- [ ] **Step 1:** `git -C "$R" fetch origin`; `git -C "$R" log --oneline origin/main -20` shows Phase 0's merge (stop and ask the coordinator if not); `gh pr list --state open` shows nothing touching TabBar or `src/ui/` (stop and ask if one does).
- [ ] **Step 2:** `W=$R/.claude/worktrees/ipad-foundations`; `git -C "$R" worktree add -b feat/ipad-foundations "$W" origin/main && pnpm -C "$W" install`. An isolated subagent already in a fresh worktree runs `git switch -c feat/ipad-foundations origin/main` and `pnpm install` in its own.

### Task 1: The large-screen query and the desktop frame

**Files:** create `apps/frontend/src/ui/largeScreen.ts`; modify `apps/frontend/src/app/App.css`.

- [ ] **Step 1:** `largeScreen.ts` as the draft's final version (`git -C "$SPIKE" show HEAD:apps/frontend/src/ui/largeScreen.ts`), its doc comment saying: a touch screen with a tablet's room both ways; anything smaller, Split View and LINE's sheet included, keeps the phone's layout, and so does a desktop, shown in its frame (App.css); every large-screen CSS rule spells the same query. Exports `LARGE_SCREEN` and `useLargeScreen()` only.
- [ ] **Step 2:** App.css: the frame's rules move inside `@media not all and (any-pointer: coarse)`, nested in the existing query (810cc081's hunk); the comment adds that a touch screen, an iPad with a trackpad included, keeps the whole screen for the large layout (`ui/largeScreen.ts`).
- [ ] **Step 3:** `pnpm -C "$W" --filter frontend typecheck` → passes. No unit test here: Task 2's test covers the hook, Task 6's desktop spec the frame. Playwright can't make a touch screen with a fine primary pointer (Chromium ignores `pointer` and `hover` in `Emulation.setEmulatedMedia`), so the trackpad case is read off the build in Task 9.
- [ ] **Step 4:** Commit: `feat(frontend): the large-screen query needs a touch screen, and the desktop's phone frame skips touch screens`

### Task 2: The tab row's lead slot and the large-screen tokens

**Files:** create `apps/frontend/src/ui/TabsLead.tsx`; modify `apps/frontend/src/ui/testing.ts`, `apps/frontend/src/app/TabBar.tsx`, `apps/frontend/src/app/TabBar.css`, `apps/frontend/src/styles/tokens.css`; test `apps/frontend/src/app/TabBar.test.tsx`.

- [ ] **Step 1: The test helper.** In `ui/testing.ts`, `ReducedMotion`'s body becomes an unexported `SwitchedQuery(media, matches)` (its `change(matches)` dispatches `change`), and `ReducedMotion extends SwitchedQuery` with the reduced-motion query, so its callers don't change. New export `onLargeScreen()`: spies `window.matchMedia` to answer `LARGE_SCREEN` with a `SwitchedQuery` that matches, and every other query through happy-dom's own; returns the switch, so `change(false)` makes the screen a phone's.
- [ ] **Step 2: The failing test,** a new describe in `TabBar.test.tsx` ("TabBar's lead on a large screen", `afterEach(() => vi.restoreAllMocks())`): on `onLargeScreen()`, render `<TabsLead><BoardKey /></TabsLead>` before `<TabBar tucked={false} … />`, as App renders the screen before the tabs, where `BoardKey` is a button that calls a `vi.fn` in a mount effect. Expect the button's parent to be `.tabs-lead` and the mock called once; then `change(false)` and expect the button back in the host, out of the slot.
- [ ] **Step 3:** `pnpm -C "$W" --filter frontend exec vitest run src/app/TabBar.test.tsx` → fails: `../ui/TabsLead` doesn't exist.
- [ ] **Step 4: `ui/TabsLead.tsx`,** components only (`react/only-export-components`): a module-level slot element and listener set; `TabsLeadSlot` renders `<div className="tabs-lead" ref={…} />`, whose ref callback stores the element and tells the listeners; `TabsLead({ children })` reads `useLargeScreen()` and the slot through `useSyncExternalStore`: on a phone it returns `children`; on a large screen `createPortal(children, slot)`, or `null` until the slot exists. TabBar renders `<TabsLeadSlot />` first in its fragment, before the `<nav>` (212615f7's place and comment), and its doc comment ends: "On a large screen a board's key leads the row (ui/TabsLead.tsx)."
- [ ] **Step 5:** The Step 3 command → passes (the file's 5 tests). Then watch it fail on the draft's way: in `TabsLead.tsx` return `children` instead of `null` while the slot is missing → `expected "vi.fn()" to be called once, but got 2 times`; put it back.
- [ ] **Step 6: Tokens** (09cfc89e's): `--gutter-large: 20px` after `--gutter`, `--tabs-lead-w: 228px` after `--tabs-strip`, and after the reduced-motion block a large-screen `:root { --tabs-pad-top: 14px; }`. Comments: the large screen's edge margin; the strip's left end holding a board's key, Draw with its widest tickets tucked behind; a little more paper above the tabs.
- [ ] **Step 7: TabBar.css,** a new section at the end, "Large screens: a board's key leads the tab row": `.tabs-lead { display: none; }` on a phone; in the large-screen query `.tabs` two ends (`justify-content: flex-end`, `padding-left: calc(var(--gutter-large) + var(--tabs-lead-w) + var(--gutter))`, `padding-right: var(--gutter-large)`), `.tab { max-width: 144px; }`, and `.tabs-lead` absolute at `left: var(--gutter-large)`, `bottom: calc(var(--tabs-pad-foot) + var(--tab-h) / 2 - 24px - 6px)` (the compact key's 48px face centered on the tabs, its 6px lip below), `z-index: calc(var(--z-sheet) - 1)`, `display: flex` (5cfbbe97 and 212615f7's values). Then `@media (min-width: 600px) and (max-width: 639px) and (min-height: 600px) and (any-pointer: coarse) { .tab { gap: 4px; } }` (decision 7).
- [ ] **Step 8:** `pnpm -C "$W" --filter frontend exec vitest run src/app src/ui` → passes. Commit: `feat(frontend): the tab row's lead slot, where a board's key stands on a large screen`

### Task 3: The quieter tabs

**Files:** modify `apps/frontend/src/app/TabBar.css`.

- [ ] **Step 1:** Inside the large-screen block from Task 2, right after `.tab { max-width: 144px; }`:

```css
/* Quieter: a tab you're not on loses its outline, so the row that's always in view stays light and
     the board's key stands out. Pressed, it still sinks; the current tab is as on a phone. */
.tab:not([aria-current="page"]),
.tab:not([aria-current="page"]):hover {
  box-shadow: none;
}

.tab[data-press-state="down"]:not([aria-current="page"]) {
  box-shadow: inset 0 2px 3px rgba(28, 24, 36, 0.16);
}
```

`:not([aria-current="page"])` keeps the current tab's lift when hovered (a bare `.tab:hover` would match it at the same specificity, later in the file); the pressed rule comes after the hover rule so a press under a trackpad's hover still sinks.

- [ ] **Step 2:** Checked by Task 7's captures (computed shadows, and Chromium's forced `:hover`). Commit: `feat(frontend): on a large screen the tabs you're not on lose their outline`

### Task 4: The lit Explore tab leads back from someone's board

**Files:** modify `apps/frontend/src/i18n/strings/app.ts`, `apps/frontend/src/app/TabBar.tsx`, `apps/frontend/src/app/App.tsx`; test `apps/frontend/src/app/ExploreVisit.test.tsx`.

- [ ] **Step 1: The failing test.** In `ExploreVisit.test.tsx`, the existing test's setup (render App on `/explore`, focus and click Ken's row, settle) becomes `visitKen()`, which returns the row, and `afterEach` gains `vi.restoreAllMocks()`. New test: on `onLargeScreen()`, `await visitKen()`; `.tab-explore`'s `aria-label` is `"Back to Explore"`; its click closes Ken's board (`.artist-board` gone, `.screen-layer` no longer inert) and the label goes. Don't assert the chip: the board plan removes it.
- [ ] **Step 2:** `pnpm -C "$W" --filter frontend exec vitest run src/app/ExploreVisit.test.tsx` → the new test fails (`expected null to be 'Back to Explore'`).
- [ ] **Step 3:** `app.ts`, after `tabs.explore`: `/** Tab bar on a large screen, while someone else's sticker board is open over Explore: screen readers' name for the lit Explore tab, which goes back to Explore */ backToExplore: { en: "Back to Explore", ja: "さがすに戻る" },` (the glossary's さがす, and 戻る as in マイボードに戻る).
- [ ] **Step 4:** TabBar, as 5cfbbe97: prop `visiting?: boolean` ("Someone else's sticker board is open over Explore."), `const large = useLargeScreen()` beside the other hooks, `backToExplore = large && visiting && active === "explore"`; the Explore tab takes `aria-label` from the new string and `<CaretLeft size={20} weight="bold" />` in place of its icon while `backToExplore`. App passes `visiting={visiting !== undefined}`; `changeTab` already clears `visiting`, so the tab leads back with no other change.
- [ ] **Step 5:** The Step 2 command and `src/app/TabBar.test.tsx` → pass; removing App's `visiting` prop turns the new test red. Commit: `feat(frontend): on a large screen the lit Explore tab leads back from someone's board`

### Task 5: A ticket card over the board dims the lead

**Files:** modify `apps/frontend/src/app/App.css`.

- [ ] **Step 1:** After the over-board strip dim's reduced-motion block, a large-screen block: `.phone:has(.out-of-tickets--over-board) .tabs-lead { z-index: 1; }` and `.phone:has(.out-of-tickets--over-board) .tabs-lead .board-nudge { visibility: hidden; }`, with a comment: under the card the board's key drops beneath the strip's scrim, so it dims with the strip and a tap on it closes the card; its nudge, which reaches up over the board, goes meanwhile. Same `z-index` as the strip's `::after` and earlier in the DOM, so the scrim paints over the key; above the strip's paper.
- [ ] **Step 2:** No key stands in the lead until the board plan lands; Task 7 checks the stacking with a stand-in. Commit: `feat(frontend): the out-of-tickets card over the board dims the tab row's lead with the strip`

### Task 6: End-to-end specs

**Files:** create `apps/frontend/e2e/ipad.ts`, `apps/frontend/e2e/largeScreen.e2e.ts`.

- [ ] **Step 1:** `ipad.ts`, beside `phone.ts`: an 11-inch iPad's page in Safari, held upright: 820×1094, `deviceScaleFactor: 2`, `isMobile`, `hasTouch`, `en-US`.
- [ ] **Step 2:** `largeScreen.e2e.ts`, names from the catalog through `helpers.ts`' `say`:
  - **On an iPad** (`test.use(ipad)`): sign an artist up through the `request` fixture (`POST /api/session` with `devIdToken({ sub: "dev-" + name, name })` from `@drawing-app/api/dev-sign-in`; the handle is the name), `signIn` the visitor, open Explore from the tab bar (`getByRole("navigation", { name: app.tabs.sections })`), search the artist's handle, open their board. The tab bar's Explore tab is named `app.tabs.backToExplore`; tapping it closes their board (their `artistBoard.theirStats` button gone) and the tab is `Explore` again. This is the real-browser check that `LARGE_SCREEN` matches an iPad.
  - **On a desktop** (`viewport` 1280×900, `isMobile: false`, `hasTouch: false`): the same visit; the tab bar is narrower than the window (the frame) and no tab is named `app.tabs.backToExplore` (a desktop isn't a large screen).
- [ ] **Step 3:** The E2E command (Checks) → 2 passed. `pnpm -C "$W" --filter frontend typecheck` and `lint` → pass (`tsconfig.e2e.json` types the specs).
- [ ] **Step 4: WebKit,** which counts most: `pnpm -C "$W" --filter frontend exec playwright install webkit`, then open a `data:` URL in it from Node; if that loads, `E2E_WEBKIT=on pnpm -C "$W" --filter frontend exec playwright test e2e/largeScreen.e2e.ts --project webkit` → 2 passed. If WebKit opens no page at all, the Mac is at fault (the suite's config says so): record it in the closing report and go on.
- [ ] **Step 5:** Commit: `test(e2e): an iPad's lit Explore tab leads back, and a desktop keeps its frame`

### Task 7: Captures at three sizes, both engines

- [ ] **Step 1: Server,** in the background. A gitignored Vite config, `$W/data/scratch/ipad-foundations/vite.checks.config.mjs`, spreads `../../../apps/frontend/vite.config.ts` with `server.port` 5195, `strictPort`, and `/api` proxied to `http://127.0.0.1:8795` (it can't import `vite` from there; a plain object works). Then `(cd "$W/apps/api" && PORT=8795 DATABASE_URL="$W/data/ipad-foundations/drawing-app.db" IMAGE_DIR="$W/data/ipad-foundations/images" IMAGE_BASE_URL=http://localhost:5195/api/images DEV_SIGN_IN=on STICKER_CHAIN_MODE=mock exec node --env-file=.env.example src/server.ts)` after `mkdir -p "$W/data/ipad-foundations/images"`, and `(cd "$W/apps/frontend" && VITE_LIFF_MOCK=on exec node_modules/.bin/vite --config ../../data/scratch/ipad-foundations/vite.checks.config.mjs)`.
- [ ] **Step 2: Script,** `$W/data/scratch/ipad-foundations/captures.mjs`, a one-shot that says so at its top, loading `@playwright/test` through `createRequire($W/apps/frontend/package.json)`. People sign in from Node (`POST /api/session`, the dev ID token, a name fresh each run), their cookies added without `Secure` (WebKit drops it on http://localhost); WebKit routes outside HTTPS through Node; every context has reduced motion and `localStorage["draw.motion"] = "denied"` (no motion card). It prints PASS or FAIL per check and exits 1 on a FAIL. At 390×844, 820×1094 and 1180×734 (touch: `isMobile`, `hasTouch`, 2x), in Chromium and WebKit:
  - your board, English and Japanese: `matchMedia(LARGE_SCREEN)` is false at 390 and true at the iPad sizes; `.phone` fills the window; on a large screen the last tab ends 20px from the right edge, no tab is over 144px, tabs you're not on have `box-shadow: none` while the current one keeps its lift, a tab given `data-press-state="down"` shows the inset shadow and no `0px 0px 0px 1px` ring, and in Chromium the current tab keeps its lift under `CSS.forcePseudoState` `:hover` while the others stay bare; at 390 the tabs you're not on keep their ring; in Japanese no tab's `scrollWidth` exceeds its `clientWidth`.
  - someone's board, opened through Explore's search: on a large screen the Explore tab is named "Back to Explore" and its icon differs from the compass, and tapping it leads back with the compass back; at 390 it has no name of its own.
  - out of tickets (a person with every daily ticket spent; wait for `.drawing-screen` to attach before tapping Draw): with a stand-in button appended to `.tabs-lead`, `.tabs-lead`'s computed `z-index` is `1` and `document.elementFromPoint` at the stand-in's middle is the strip (`.tabs`).
  - edges: 599×800 is a phone and 600×600 large; at 600×800 every label fits in both languages; a 1280×900 desktop context (no touch) has the frame (`.phone` narrower than the window) and isn't large.
  - shots `shots/<what>-<engine>-<w>x<h>.png` of each.
- [ ] **Step 3:** `node "$W/data/scratch/ipad-foundations/captures.mjs"` → `ALL PASS` (WebKit as in Task 6 Step 4).
- [ ] **Step 4: Look** at every shot: at 390×844 the row is as on main; on the iPad sizes the tabs sit at the right end with the left end empty, only the current tab outlined, the caret in the lit Explore tab while visiting. Fix what's off in one batch, run Step 3 again, commit as `fix(frontend): …`.
- [ ] **Step 5:** Stop both servers: `for p in 5195 8795; do kill $(lsof -ti tcp:$p -sTCP:LISTEN); done`.

### Task 8: DESIGN.md

Only what this plan makes true; Draw's place and the chip are the board plan's.

- [ ] **Step 1:** Index tabs, after "…bold at rest and fill when current.": " On a large screen (a touch screen at least 600 × 600, `ui/largeScreen.ts`) the tabs stand at the strip's right end, up to 144px each, under 14px of paper, and its left end holds the board's key. A tab you're not on has no outline there, only its Graphite label and icon, and still sinks when pressed. While someone else's board is open over Explore, the lit Explore tab there shows a caret in place of its compass, is named "Back to Explore", and leads back."
- [ ] **Step 2:** Commit with an explicit pathspec: `docs: DESIGN.md's tab row on a large screen`

### Task 9: Check, squash, merge

- [ ] **Step 1:** `pnpm -C "$W" check` → passes (lint, typecheck, tests, the format check, the Move tests; needs the Sui CLI).
- [ ] **Step 2: The build.** `pnpm -C "$W" --filter frontend build`, then `/usr/bin/grep -rhoE "@media[^{]{0,120}any-pointer:coarse[^{]{0,40}" "$W/apps/frontend/dist/assets" | sort | uniq -c` (`rg` skips the gitignored dist) → the large-screen queries in range syntax, and `@media not all and (any-pointer:coarse)` nested inside the frame's `(hover:hover) and (pointer:fine) and (width>=500px)`.
- [ ] **Step 3:** The coordinator runs `pnpm -C "$W" check:full` and the whole E2E suite, `pnpm -C "$W" test:e2e`.
- [ ] **Step 4: Squash** into `feat(frontend): …` (Tasks 1–5 and any Task 7 fix), `test(e2e): …` and `docs: …`, no AI attribution lines: `git -C "$W" reset --soft "$(git -C "$W" merge-base HEAD origin/main)"`, then one `git -C "$W" commit -F - -- <paths>` per group; `git -C "$W" status --short` → empty.
- [ ] **Step 5: Merge and push** in one command: `git -C "$R" fetch origin && git -C "$R" merge --ff-only origin/main && git -C "$R" merge --no-edit feat/ipad-foundations && git -C "$R" push origin main`.
- [ ] **Step 6:** `git -C "$R" worktree remove --force "$W"` (it holds the scratch), `git -C "$R" branch -d feat/ipad-foundations`; then delete this plan in a `docs:` commit with an explicit pathspec (AGENTS.MD's Post merge). The brief stays.

## For the other plans

- **The query:** CSS spells `@media (min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)`; code reads `useLargeScreen()`, or `window.matchMedia(LARGE_SCREEN)` outside React.
- **Tests:** happy-dom is a phone; `onLargeScreen()` (`ui/testing.ts`) makes it large and returns the switch. A test that renders a board on a large screen renders TabBar (or `<TabsLeadSlot />`) too, or the key never mounts.
- **The board plan's lead task:** `useTabsLead()` + `createPortal(group, lead)` becomes `<TabsLead>{group}</TabsLead>`; `lead`'s truthiness becomes `useLargeScreen()` (`is-away`, `inert`, the null box, effect deps `[size, large]`); StickerBoard's measure effect measures the name without waiting for Draw, which mounts after it on a large screen; a test's `registerTabsLead(slot)` becomes rendering `<TabsLeadSlot />`. Don't add the draft's `.tabs-lead::after` dim or `.phone.has-tucked-tabs .tabs-lead`: Task 5's rule dims the lead. On the draft at 600 wide, Draw with the backing ticket's English print reached 249px, 11px short of the first tab: worth re-measuring once Draw stands there.
- **Tokens:** `--gutter-large`, `--tabs-lead-w`; `--tabs-pad-top` is 14px on a large screen, so `--tabs-strip` and the toast above it rise 4px.
- **The drawing plan:** TabBar's tucked mode is unchanged; the draft's My board label (c34494ea) builds on `useLargeScreen()` in TabBar.
- **The cards plan:** keep `out-of-tickets--over-board` on the card over the board, which the strip's dim and Task 5's rule select.
- **The finish:** DESIGN.md's Layout still says every screen is a 390 × 844 iPhone viewport.

## Self-review

- **Brief coverage:** the query and touch gate (Task 1), the desktop frame (Task 1), the lead slot (Task 2), the quieter style (Task 3), the Explore tab's caret and way back (Task 4), the tokens (Task 2), phones unchanged (Task 7's 390 checks, the unit suite). Draw and Give in the slot and the chip's removal are the board plan's (decision 8).
- **Placeholders:** none; the only full code is Task 3's, as asked; ports name sha and paths.
- **Names:** `LARGE_SCREEN`, `useLargeScreen`, `TabsLeadSlot`, `TabsLead`, `onLargeScreen`, `app.tabs.backToExplore`, `.tabs-lead` are the same in every task and in For the other plans.

## Open

1. **The board plan's assumptions** (on main): it expects `ui/tabsLead.ts` with `registerTabsLead`/`useTabsLead()` and adds the draft's `::after` dim when foundations didn't bring one. Its Task 0 maps names, but its lead task needs the mapping under For the other plans, and it must not add the `::after`.
2. **The interim between this plan and the board plan:** a large screen shows the two-ended row with an empty left end, Draw over the board, and both the chip and the lit tab leading back. Fine if the board plan follows soon; otherwise this plan could take the board side.
3. **The pressed tab** keeps Liner Deep and its inner shadow without the ring (decision 4); option B's mock showed no pressed state.
4. **Focus after the tab leads back** stays on the tab; the phone's chip returns it to your row in Explore.
5. **The checkout over the board** dims neither the tabs nor a key in the lead (decision 5), where a phone has Draw under its scrim.
6. **An iPad with a trackpad or keyboard** can't be emulated; it needs a real iPad to confirm the large layout instead of the frame.
7. **WebKit** couldn't open pages on the Mac this was prototyped on; the iPad checks may rest on Chromium plus a device.
8. **The Oct 7 plan's other tasks**, none in the brief: LIFF is already `^2.31.1` on main; the size classes gave way to the query; the developer slip's Device paper and Pencil summary, the words that name the phone ("Saved on this phone", "Shake your phone… iPhone asks once more"), sheets padding the home indicator, and the out-of-tickets card scrolling the board in WebKit under reduced motion (`overflow: clip`) have no owner; sheets and cards at one width are the cards plan's.
