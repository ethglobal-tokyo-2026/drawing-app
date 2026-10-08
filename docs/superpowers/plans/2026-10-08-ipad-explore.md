# iPad Explore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On an iPad held sideways Explore is a split view: the search across the top, the pile in the left column and This week in the right, search results taking the pile's column, each column scrolling on its own, in the screen's reading order. This week shows all three leaderboards at once (three columns upright, stacked in the column sideways). The pile keeps stickers about a phone's size and shows more of them. Phones unchanged.

**Architecture:** Ported from the draft on `spike/ipad-board`: `pileFit` in `explore/pileLayout.ts` (a large screen's pile keeps `LARGE_PILE_SCALE` px per unit and spans as many units as fit), `explore/exploreColumns.ts` (one or two columns from Explore's own box), and `ExploreScreen.tsx`'s layout: `.explore-search`, `.explore-results`, `.explore-view` (the pile, never remounted by a turn or a search) and `.explore-week`, keyed in CSS on `.explore[data-columns="2"]`. New beside the draft: two columns only held sideways (Open 1), and a turn keeps the reader's place in the pile (Open 2).

**Tech Stack:** React 19, TypeScript, CSS, vitest + happy-dom, Playwright (WebKit, Chromium).

Source of truth: `docs/superpowers/specs/2026-10-08-ipad-design-brief.md`, "Explore". The draft: branch `spike/ipad-board`, never merged; read a commit with `git show <sha>`, a file as it ended with `git show 00f17212:<path>`. Never port with `git diff main..spike/ipad-board`: the draft predates main's Kyoto Seika work, and that diff reverts it.

---

## Open (ad0ll's sign-off)

1. **The split view only held sideways:** two columns when the screen is large and Explore's box is wider than tall and at least `TWO_COLUMNS_MIN_WIDTH` (960px). The draft split any large screen 960px wide, so a 13-inch iPad upright got the split view, against the brief's "three columns in portrait".
2. **A turn keeps the reader's place in the pile** (Task 6). Beyond the brief: the split view moves the pile between Explore's scroller and its own column and lays it out at a new width, so without it every turn lands at the pile's top. Tried in Chromium: the sticker nearest the view's top came back within 0.5% of its height through a turn and back. Drop Task 6 if declined.
3. **The lifted sticker on an iPad** stays a full-width bottom sheet, its paging carets at the screen's far edges (the draft left it; the deleted 2026-10-07 plan made it a centered card at the content width). Needs a design call; `2026-10-08-ipad-dialogs.md` (to write) takes it.
4. **As drafted:** `LARGE_PILE_SCALE` 1.25 (a phone's is its width over 360, 1.083 at 390px); the search, view switch and results 540px wide upright; This week upright 1040px wide at most, its three boards' rows a size down; This week's column 300–380px sideways.

From the deleted `2026-10-07-ipad-explore-and-dialogs.md` (`git show 22de7791:docs/superpowers/plans/2026-10-07-ipad-explore-and-dialogs.md`): its pile that stopped growing at 1.5px a unit and its This week beside the pile from 960px are superseded by the brief; its place kept through a turn (its Task 5) comes back as Task 6; its dialogs are listed in the Shop and cards plan's "Left for later", for `2026-10-08-ipad-dialogs.md` (to write).

## Base

- Branch from `origin/main` once Phase 0 (`2026-10-08-small-fixes.md`) and foundations (`2026-10-08-ipad-foundations.md`) have merged. The board, Shop and cards, and drawing plans can run beside this one.
- From foundations: `apps/frontend/src/ui/largeScreen.ts` exports `LARGE_SCREEN`, `"(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)"`, and `useLargeScreen()`; the CSS uses the same query; `ui/testing.ts` has `onLargeScreen()`.
- From Phase 0: Explore's search is the text field (`<label className="text-field artist-search">`, `styles/text-field.css`), and Most gratitude's figure leads with `GratitudeIcon` (`figure--gratitude`), the draft's `911d56e4` and `890a78d0`.
- Overlaps: a plan that moved `SlidingTabs` and the `.sliding-tabs` rules into `ui/` keeps their new home; this plan changes only where the view switch renders. The Shop and cards plan adds the same `stubResizeObservers` to `ui/testing.ts`: whichever lands second keeps one copy.
- Ports: this plan's dev server takes 5184 and its API 8784; if either is taken, use a free pair throughout.

## Ports from the draft

| Draft commit                       | Paths                                                            | Task | How, and the conflicts to expect                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `afa10768`                         | `explore/pileLayout.ts`, `pileLayout.test.ts`, `StickerPile.tsx` | 2    | `git apply --3way`: clean on main at `ed18a266` and over Phase 0's Explore edits, which don't reach these files                                                                                                                    |
| `afa10768`                         | `explore/exploreColumns.ts`, `exploreColumns.test.ts`            | 3    | take, then change the rule (Open 1)                                                                                                                                                                                                |
| `afa10768`, `e7b08172`, `00f17212` | `explore/ExploreScreen.tsx`, `ExploreScreen.css`                 | 4–5  | by hand, to `00f17212`'s end state: `e7b08172`'s search heading This week's column is superseded. As patches, `afa10768`'s first hunk conflicts with Phase 0's `text-field artist-search` label (trial-applied): keep `text-field` |
| `911d56e4`                         | `explore/ExploreScreen.css` (the side column's 6px padding)      | 4    | already in `00f17212`'s end state; its text field is Phase 0's                                                                                                                                                                     |
| `00f17212`                         | `DESIGN.md` (Explore)                                            | 7    | by hand over Phase 0's text                                                                                                                                                                                                        |
| `890a78d0`                         | the gratitude heart on Most gratitude                            | —    | Phase 0                                                                                                                                                                                                                            |

## Files

- Modify: `apps/frontend/src/ui/testing.ts` (Task 1)
- Modify: `apps/frontend/src/explore/pileLayout.ts`, `pileLayout.test.ts`, `StickerPile.tsx` (Task 2)
- Create: `apps/frontend/src/explore/exploreColumns.ts`, `exploreColumns.test.ts` (Task 3)
- Modify: `apps/frontend/src/explore/ExploreScreen.tsx`, `ExploreScreen.css`, `ExploreScreen.test.tsx` (Tasks 4–6), `apps/frontend/src/i18n/strings/explore.ts` (Task 5)
- Create: `apps/frontend/src/explore/keptPlace.ts`, `keptPlace.test.ts`, `useKeptPlace.ts` (Task 6)
- Modify: `DESIGN.md` (Task 7)
- Scratch, never committed: `data/scratch/ipad-explore/` (gitignored), untracked `apps/frontend/vite.ipad-explore.config.ts` (Task 8)

Test commands run from the worktree root. `TZ=Asia/Tokyo` because some frontend tests assume Tokyo time. Every test below was tried on main with this plan's changes and stand-ins for Phase 0 and foundations: each fails under the change it guards against.

### Task 1: Base check, worktree, test helpers

- [ ] **Step 1: Worktree.** From the main checkout: `git fetch origin && git worktree add -b feat/ipad-explore .claude/worktrees/ipad-explore origin/main`, then `pnpm install --frozen-lockfile --prefer-offline` in it. A lane in an isolated agent worktree runs `git switch -c feat/ipad-explore origin/main`, `git checkout -- .` and the install in its own.
- [ ] **Step 2: Check the base.**

```bash
rg -n 'export const (LARGE_SCREEN|useLargeScreen)' apps/frontend/src/ui/largeScreen.ts
rg -n 'export function onLargeScreen' apps/frontend/src/ui/testing.ts
rg -n 'text-field artist-search|figure--gratitude' apps/frontend/src/explore/ExploreScreen.tsx
rg -n 'function SlidingTabs' apps/frontend/src
git cat-file -t afa10768
```

Expected: both exports with the query above; `onLargeScreen`; both Phase 0 hits; where `SlidingTabs` lives; `commit`. No Phase 0 or foundations on main, or `afa10768` missing: stop and report. Foundations keys the large layout another way (a class or data attribute on `.phone`): write every large-screen rule here in its form.

- [ ] **Step 3: Test helpers** in `apps/frontend/src/ui/testing.ts`, each unless already there:
  - `stubResizeObservers()`: copy it from the Shop and cards plan's Task 1 Step 3 (identical): a stand-in `ResizeObserver` that records each observer's targets; `resize(el)` calls back every observer watching `el`, `resize()` every observer watching anything; `globalThis.ResizeObserver` restored by `onTestFinished`.
  - `onLargeScreen()` is foundations' (it spies `window.matchMedia` and returns the switch); the iPad `describe` restores mocks after each test (`vi.restoreAllMocks()`).
- [ ] **Step 4:** `pnpm -C apps/frontend typecheck` → passes. Commit: `test(frontend): a large screen and ResizeObservers a test can report to`

### Task 2: The pile at about a phone's size, showing more stickers

- [ ] **Step 1: Port.** `git show afa10768 -- apps/frontend/src/explore/pileLayout.ts apps/frontend/src/explore/pileLayout.test.ts apps/frontend/src/explore/StickerPile.tsx | git apply --3way` → clean. It adds `LARGE_PILE_SCALE` and `pileFit(px, large)` (a phone: `PILE_WIDTH` units at its width over 360; a large screen wider than 360 × 1.25px: 1.25px a unit, `floor(px / 1.25)` units), the test "scales a phone's 360-unit pile to its width, and keeps a large screen's scale across more units", and `StickerPile`'s fit: `useLargeScreen()`, `units` state passed to `pileStickers` as `width`, `--k` from `pileFit`.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore` → PASS.
- [ ] **Step 3:** Commit: `feat(frontend): on an iPad Explore's pile keeps stickers about a phone's size and shows more of them`

### Task 3: Explore's columns (Open 1)

- [ ] **Step 1: Write the failing test.** Take `git show afa10768:apps/frontend/src/explore/exploreColumns.test.ts`, with one test, "splits Explore only on a large screen held sideways, with room for both columns", built from `TWO_COLUMNS_MIN_WIDTH` (`w`): `exploreColumns(w, w - 1, true)` is 2; `exploreColumns(w - 1, w - 2, true)`, `exploreColumns(w, w + 1, true)` and `exploreColumns(w, w - 1, false)` are 1.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore/exploreColumns.test.ts` → FAIL: the module doesn't resolve.
- [ ] **Step 3: Implement** from `git show afa10768:apps/frontend/src/explore/exploreColumns.ts`, changed so `exploreColumns(width, height, large)` is 2 only when `large && width > height && width >= TWO_COLUMNS_MIN_WIDTH`, and `useExploreColumns(scroller)` measures the scroller's `clientWidth` and `clientHeight` (one state object, kept when neither changes) on mount and on its `ResizeObserver`.
- [ ] **Step 4:** Run Step 2 again → PASS. Commit: `feat(frontend): Explore's split view is for an iPad held sideways`

### Task 4: The split view

From `00f17212`'s end state (`git show 00f17212:apps/frontend/src/explore/ExploreScreen.tsx`, `…/ExploreScreen.css`), This week still as its tabs until Task 5.

- [ ] **Step 1: Write the failing tests** in `ExploreScreen.test.tsx`, a `describe("ExploreScreen on an iPad")`:
  - Helpers: `SIDEWAYS` `{ width: TWO_COLUMNS_MIN_WIDTH, height: Math.round(TWO_COLUMNS_MIN_WIDTH * 0.7) }` and `UPRIGHT`, its sides swapped; `onIpad(size)`: `onLargeScreen()`, `stubResizeObservers()`, `vi.spyOn(HTMLElement.prototype, "clientWidth" | "clientHeight", "get")` reading a box (restored in `onTestFinished`), and `turn()` swapping the box's sides inside `act(() => resizes.resize())`; `withOlderPage()`: `openExplore` on a first page of today's sticker with `CURSOR` and boards for all three leaderboards, `reachEnd()` loading a last page of a sticker from two days back, returning the host, the `explorePile` spy and `layersOf(host)`.
  - "splits sideways: the search across the top, then the pile, then This week, in reading order": no `.view-switch`; `.explore`'s children's classes are `explore-search`, `explore-view`, `explore-week`; `.explore-week .this-week` is there.
  - "puts a search's results in the pile's column, with This week beside them and the pile's pages kept": `searchFor(host, "mi")` → `.explore-results .row-names b` is `["@mika"]`, `.explore-view` is `hidden`, `.explore-week .this-week` stays; `searchFor(host, "")` → the view shows, `layersOf` as before, `explorePile` called once.
  - "keeps the pile and the pages it loaded through a turn": `onIpad(UPRIGHT)`, `withOlderPage()`, `turn()` → `.explore-week` there, `layersOf` as before, `explorePile` called once.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore/ExploreScreen.test.tsx` → the three FAIL; the phone tests pass.
- [ ] **Step 3: Implement**, `ExploreScreen.tsx` as `00f17212` left it, minus This week's split (Task 5):
  - `useExploreColumns(scroller)` with `ref={scroller}` and `data-columns={columns}` on `.explore`.
  - The field and its status line in `.explore-search`; the view switch only `columns === 1 && !q`; results in `.explore-results`, rendered `q ? … : null` rather than the draft's `q && …`; the view `{!(q && columns === 1) && <div className="explore-view" hidden={columns === 2 && q !== ""} {...panel}>}` with the pile always its last child, so a turn or a search never remounts it; `{columns === 2 && <div className="explore-week">{week}</div>}` after it; `panel`'s tabpanel props only in one column; `LoadingStatus` once, in the view, out of `ThisWeekLoading` and `PileLoading`; `this-week` on This week's sections.
  - `ExploreScreen.css`: `00f17212`'s "Large screens" block minus the boards' rules (Task 5): `.explore-search, .explore-results { display: contents }`; behind the large-screen query the field, switch, results and view sections 540px wide, centered; the `.explore[data-columns="2"]` grid (`minmax(0, 1fr) minmax(300px, 380px)`, rows `auto minmax(0, 1fr)`, `overflow: hidden`), the search across both columns with 6px of padding for its focus ring, each column `overflow-y: auto`, and the pile's margin 0 in its column.
- [ ] **Step 4:** Run Step 2 again → PASS, and `pnpm -C apps/frontend typecheck`. Commit: `feat(frontend): Explore on an iPad held sideways is a split view, the search across the top`

### Task 5: This week's three boards at once

- [ ] **Step 1: Write the failing test** in the iPad `describe`: `boardsShown(host)`, each `.leaderboard-board`'s `.leaderboard-title` then its `.row-names b`; "shows This week's three boards at once upright, each under its name, with no tabs": `onIpad(UPRIGHT)`, the This week tab → `[["Most gratitude", "@mika"], ["Best combo", "@ken"], ["Streak", "@bob"]]` and no `.leaderboard-tabs`. In "splits sideways…", `.explore-week .this-week` becomes `boardsShown(host)` of length 3.
- [ ] **Step 2:** Run Task 4 Step 2's command → those two FAIL.
- [ ] **Step 3: Implement** from `00f17212`: `ThisWeek` becomes `LeaderboardRows` (one board's ranked rows, `compact` rows a size down), `WeekResets`, `ThisWeekTabs` (the phone's) and `ThisWeekAll` (three `section`s, each `aria-labelledby` its `h3.leaderboard-title`, `data-board` on the title); `Figure` takes `compact` (marks 14px, the hit counter 19px); `ThisWeekLoading({ all })` outlines the three boards on a large screen; in `ExploreScreen`, `large ? <ThisWeekAll compact={columns === 1} /> : <ThisWeekTabs />`. CSS: `00f17212`'s `.leaderboard-boards`, `.leaderboard-board`, `.leaderboard-title` (radius `var(--r-label)`; Tangerine for Streak), the `.this-week--compact` rows, `.explore-view > .this-week--all` 1040px behind the large-screen query, one column of boards in `.explore[data-columns="2"]`.
- [ ] **Step 4: Catalog comments**, `i18n/strings/explore.ts`: the `leaderboards` group's comment becomes "The leaderboards' names: their tabs on a phone, and the label over each board on an iPad.", and each of its three strings' comment ends "; its tab on a phone, the label over its board on an iPad". No string changes.
- [ ] **Step 5:** Run Task 4 Step 2's command → PASS. Commit: `feat(frontend): on an iPad This week shows all three leaderboards at once`

### Task 6: A turn keeps the reader's place (Open 2)

- [ ] **Step 1: Write the failing test**, `explore/keptPlace.test.ts`: "keeps the marker nearest the view's top the same share of itself below it, once laid out anew" (markers `past` −400, `near` 30, `lower` 300, each 150 tall, in a 700px view: `placeOf` keeps `near`; laid out again at top 245 and 225 tall, `scrollToKeep` leaves it 30/150 of itself below the top) and "keeps no place where the view shows no marker". The deleted plan's Task 5 has the same test and helpers.
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/explore/keptPlace.test.ts` → FAIL: the module doesn't resolve.
- [ ] **Step 3: Implement.** `keptPlace.ts`: `Marker` (key, top below the view's top, height), `Place` (key, `at`: that top in the marker's heights), `placeOf(markers, height)` (the shown marker nearest the top, or null), `scrollToKeep(place, marker)`. `useKeptPlace.ts`, `useKeptPlace(explore, columns)`, called in `ExploreScreen` after `useExploreColumns`:
  - What scrolls the pile: `.explore-view` in two columns, `.explore` in one. Markers: `.pile-sticker[data-pile-id]`.
  - Note the place 100ms after a scroll of that box (a capture-phase listener on `.explore`; scrolls don't bubble).
  - When `columns` changes, put the noted place back every frame for 400ms: the pile lays its days out again as its width settles, through an in-between width (Chromium showed it at 360px for a frame), so a fixed three frames came out 35px off.
  - Ignore notes until 100ms after that window: the putting back scrolls too, and noting those would swap the reader's sticker for whichever is nearest after the turn, which drifted 35px over a turn and back.
- [ ] **Step 4:** Run Step 2 again and Task 4 Step 2's command → PASS. Commit: `feat(frontend): turning an iPad keeps your place in Explore's pile`

### Task 7: DESIGN.md

- [ ] **Step 1:** Explore's lead, search bullet and This week bullet as `00f17212` left them (`git show 00f17212 -- DESIGN.md`), over Phase 0's words; add to the lead "Each column scrolls on its own, and a turn keeps your place in the pile." (without Task 6, "Each column scrolls on its own."). Its heap bullet gains: "On an iPad a pile unit stays 1.25px, about a phone's, and the pile spans as many units as fit, so the extra width shows more stickers rather than bigger ones."
- [ ] **Step 2:** `pnpm exec oxfmt DESIGN.md`, commit: `docs: DESIGN.md describes Explore on an iPad`. No PRODUCT.md sentence becomes false.

### Task 8: Check it in WebKit and Chromium

- [ ] **Step 1: Servers and library.** As the Shop and cards plan's Task 10 Steps 1–2, with this plan's names and ports: `apps/frontend/vite.ipad-explore.config.ts` on 5184 proxying 8784, the API with `DATABASE_URL=data/ipad-explore.db IMAGE_DIR=../../data/ipad-explore-images`, and its `lib.mjs` copied to `data/scratch/ipad-explore/`.
- [ ] **Step 2: The checks**, `data/scratch/ipad-explore/checks.mjs`, signed in as `ipadexplore-ann` at each of the brief's sizes (390×844, 744×1047, 820×1094, 1133×658, 1180×734). Seal one sticker if the pile is empty (the Shop and cards plan's `sealOne`), then route `GET /api/explore` to the real answer with its pile replaced by 24 copies of its newest sticker on each of six Tokyo days (new ids, numbers and `sealedAt`; fewer don't scroll far enough to test a turn) and five people on each board. Pass lines:
  - 390×844: one column, the view switch, `--k` the pile's width over 360 (±0.002); This week's tabs.
  - Every iPad size: `--k` 1.25.
  - Upright: one column, the view switch, the search ≤540px and centered (±1); This week: three boards side by side (tops ±1), no tabs, ≤1040px.
  - Sideways: `data-columns="2"`, no switch; the search from the pile's left to This week's right (±8); the pile wholly left of This week; three boards stacked, no tabs; `.explore-view` scrolls 400px while `.explore-week` and `.explore` stay at 0.
  - Sideways, a search: results in the pile's column, left of This week, `.explore-view` hidden, three boards still there; cleared, the pile back with as many days.
  - Turn (Task 6): at 820×1094 scroll `.explore` to the third day; the sticker nearest the view's top, and its top below that in its heights; after 1180×734 and again after 820×1094 (300ms after each), the same sticker within 0.05.
  - Screenshots at every size: the pile, This week, the search; a contact sheet per engine.

  This check ran in Chromium against main with this plan's changes: every line passed.

- [ ] **Step 3: Run** as the Shop and cards plan's Task 10 Step 4, with `BASE=http://localhost:5184` and this plan's script → every line `PASS`. WebKit that can't load a `data:` URL is the Mac's fault (it couldn't on 2026-10-08): say so and finish in Chromium. Fix what fails in one batch, run again, commit fixes as `fix(frontend): …`, stop both servers.

### Task 9: Check and merge

- [ ] **Step 1:** `TZ=Asia/Tokyo pnpm check` → passes.
- [ ] **Step 2:** Squash onto `origin/main` as two commits with no AI attribution lines: `feat(frontend): Explore on an iPad` (Tasks 1–6 and Task 8's fixes) and `docs: DESIGN.md describes Explore on an iPad`.
- [ ] **Step 3:** Rebase on `origin/main` and run the changed files' tests; in the main checkout, with no merge in progress, in one command: `git fetch origin && git merge --ff-only origin/main && git merge-base --is-ancestor main feat/ipad-explore && git merge --ff-only feat/ipad-explore && git push origin main`.
- [ ] **Step 4:** Remove the worktree and branch once ad0ll has the contact sheets; `git rm` this plan on main with a `docs:` commit by pathspec. Hand ad0ll the contact sheets and the Open list.

## Self-review

- **Brief coverage:** search across the top, pile left, This week right (Task 4); results in the pile's column with This week staying (Task 4's test, Task 8); each column scrolling on its own (Task 4's CSS, Task 8's scroll line); reading order (Task 4's test of `.explore`'s children); three boards at once, side by side upright and stacked sideways, phones keeping the tabs (Task 5, Task 8); phone-size stickers, more of them (Task 2, Task 8's `--k` lines); phones unchanged (`display: contents` wrappers, rules behind the large-screen query or `data-columns="2"`, Task 8's 390×844 lines).
- **Ports:** each draft commit has its paths, how it's applied and its conflicts; `890a78d0` and `911d56e4`'s text field stay Phase 0's.
- **Tests:** each named test fails under the change it guards against (tried: tabs on a large screen, This week before the pile, the view unmounted by a search, the view remounted by a turn).
- **Open:** split view by orientation, the kept place; the lifted sticker and the deleted plan's dialogs go to `2026-10-08-ipad-dialogs.md` (to write).
