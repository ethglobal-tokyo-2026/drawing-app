# Lane: transitions (page hand-overs, loading states, first board open)

Checkout read: `.claude/worktrees/feedback-plan` at main 42d698a. Code paths are under `apps/frontend/src/`.
Evidence is in `/tmp/feedback-plan/transitions/`:

- `record.mjs` records each hand-over as a frame strip from Chromium's screencast, with 250 ms added to every `/api/`
  request (the Japan-to-Germany round trip).
  - `rec/` is the shared dev server (5190), a new user with no stickers.
  - `rec-prod/` is the perf lane's production preview (5191), with 250 ms also added to every `/assets/` chunk, for
    user `transitions-s`, who has one sticker.
- `sheet.py` lays a strip out as a contact sheet labeled in ms (`sheet-*.png`, `strip-*.png`, `crop-*.png`).
- `vt-probe.mjs`, `vt-input-probe.mjs` and `vt-input-probe2.mjs` probe view transitions in Playwright's WebKit 26.5 and
  Chromium 151. `switch-timing.mjs` times a tab tap in the page itself.

Every finding is marked verified (seen in a recording, a probe or the code) or suspected.

---

## The navigation motion system (shape brief)

**Who and when.** Someone in LINE on an iPhone. They open the app from the chat menu or a gift, then move between My
board, Explore and Shop many times a visit. Visitor mode is **Operate**: motion explains and never delays.

**Focal moment.** There's one authored moment: the first open of your board, the board laid out on the table. Every
other hand-over stays quick and quiet. The bolder lens applies to that moment only (bolder.md: "If every element got
louder, the section got flatter").

**Four parts, one vocabulary**

1. **Tab hand-over.** Pages slide in the tab order.
   - The order is My board → Explore → Shop, left to right.
   - Tapping a tab to the right: the new page enters from 24px right, going from opacity 0 to 1 over the first 55% of
     240 ms on `--ease-out`. The old page leaves 12px left and fades out in 120 ms on an ease-in, so the exit is faster
     than the entrance. It's `inert` while it goes and is removed at the end. Tapping to the left is mirrored.
   - LINE's header and the tab strip never move.
   - The tapped tab **sticks on**: its hue fills (140 ms, as now) and its 2px lift arrives with a 1.04→1 settle
     (220 ms, `--ease-peel`), the world's stick. The old tab's lift and shadow drop in 140 ms.
   - Only transform and opacity animate. Both pages are live DOM, so a tap on the new page works from its first frame.
2. **While data loads: blank stock, never grey boxes or spinners.** The page arrives at its real layout in unprinted
   material:
   - blank label-stock rows at their real heights;
   - kiss-cut outlines where stickers and photo stickers will sit, in the same language as a used ticket's outline and
     the tray's holes (DESIGN.md).
   - Text lines aren't drawn: the stock is simply unprinted.
   - A blank that still waits after 400 ms **breathes**: opacity 0.55↔0.9 on a 1.2 s ease-in-out, each row 120 ms after
     the one above. This is the tray's "hole breathing in Ink until it drops in", and it's the loading animation ad0ll
     asked for.
3. **Data arrives by sticking on, not popping.**
   - Items print or stick into their blanks in reading order.
     - Rows and cards: opacity plus a 6px rise over 200 ms on `--ease-out`.
     - Stickers: the existing stick (1.06 → 0.99 → 1) plus opacity, 220 ms on `--ease-peel`.
   - Siblings start 35 ms apart (25 ms for list rows). Only the first 8 are staggered; the rest arrive with the 8th, so
     the whole batch lands within 465 ms.
   - The blank crossfades out in 100 ms under its content, so nothing shifts.
   - **Skip it** when the data was already there (cached) or lands within 100 ms of the page starting to enter: the
     page's own entrance carries it.
4. **Switching back never refetches and pops.**
   - The last answer per query key is kept (stale-while-revalidate). A returning page paints complete and revalidates
     quietly.
   - Rows that are new after revalidating stick on. Rows that are gone fade out in 120 ms.

**Reduced motion.** DESIGN.md already says "tab changes fade".

- Page hand-over: a 120 ms opacity crossfade with no shift.
- Arrivals: one 120 ms fade, all together, with no stagger or scale.
- Blank stock: holds still at 0.7.
- The tab: its hue changes in 120 ms, with no settle.
- Every animation above ends in the final state if it's cancelled (`fill: "backwards"`), so content is never left
  hidden.

**Budget**

- Hand-over: 240 ms in, 120 ms out.
- Arrival: at most 465 ms per batch.
- Board assembly after data: at most 500 ms, then the existing artist chips.
- Nothing blocks input or waits on an animation.
- Only transform and opacity animate (DESIGN.md), with `will-change` set only while running.

**Tokens** (`styles/tokens.css`, with reduced-motion overrides beside the existing ones at 96-105): `--t-page-in: 240ms`,
`--t-page-out: 120ms`, `--page-shift: 24px`, `--stagger: 35ms`, `--t-breathe: 1200ms`,
`--ease-in: cubic-bezier(0.4, 0, 1, 1)`. The existing `--t-stick`, `--ease-peel` and `--ease-out` are reused. Share these
with the tickets-motion lane so Keep drawing uses the same hand-over timing.

**New shared parts (proposed names, plain and literal).** "Blank stock" and "stick on" describe the look; they are not
new vocabulary.

- `app/ScreenTransition.tsx` plus CSS: holds the current page and the leaving one, sets the direction from the tab
  order, and marks the leaving page `inert`.
- `ui/BlankLabelRow.tsx` and `ui/BlankStickerSpot.tsx` plus `blank-stock.css`: the placeholders and their breathing.
- `ui/stickOn.ts`: plays a staggered arrival (WAAPI) on a list of elements, with the reduced-motion branch built in. It
  sits beside `stickers/stick.ts`, which gains a `batch` option with no sheen sweep.
- A query cache in `api/useApiQuery.ts` (`queryCache`), plus `prefetchApiQuery(key, load)` for idle prefetch.

**Implementation: CSS and WAAPI on live DOM, not View Transitions (verified)**

- **React supports it (verified).** React 19.3.0 in node_modules exports stable `ViewTransition`, `Activity` and
  `addTransitionType`. react-dom 19.3.0 calls `document.startViewTransition({ update, types })` inside a `try`, and if it
  throws, it applies the update with no animation (`node_modules/react-dom/cjs/react-dom-client.production.js:15719-15898`).
- **WebKit supports it (verified).** WebKit 26.5 supports the options object, `types`, `view-transition-class` and
  `:active-view-transition-type()` (`vt-probe.mjs`).
- **But it swallows taps (verified).** In both WebKit 26.5 and Chromium 151, a tap during a running view transition
  never reaches the page, even with `::view-transition { pointer-events: none }` (`vt-input-probe.mjs`). The control
  run, tapping after the transition, lands (`vt-input-probe2.mjs`). So a 240 ms view-transition hand-over would swallow a
  quick second tap, which breaks "nothing may block input".
- **Older iOS (suspected).**
  - iOS 17 has no `startViewTransition`.
  - Per WebKit's Safari 18.2 notes (https://webkit.org/blog/16301/webkit-features-in-safari-18-2/), types arrived in
    18.2; MDN documents the options-object form (https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).
    So React's object call probably throws on iOS 18.0–18.1 and falls back to today's hard cut.
  - LINE's in-app browser uses the system WebKit, so it matches Safari on the same iOS.
- **Recommendation:** CSS and WAAPI on live DOM. It works on every iOS, never snapshots or blocks input, and needs no
  transition wrappers around state updates. React's `<ViewTransition>` can wait for a non-interactive moment. `<Activity>`
  is useful now (see item 3).

---

## 1. First board open: the buttons pop in

- **Item:** "When you open your sticker board for the first time and you're loading it, the buttons and stuff pop in
  instead of animating… do a little bit of prep to have a smooth display of the board."

**Now (verified).** Production preview, 250 ms per request (`sheet-prod-1-first-open.png`,
`strip-prod-first-open-data.png`):

| Time         | What shows                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–320 ms     | A white page.                                                                                                                                       |
| 320–894 ms   | Bare backing paper, while LIFF starts and `/api/session` answers.                                                                                   |
| 894 ms       | In one frame: the header, Draw without ticket counts, and the tab strip.                                                                            |
| 1115–1125 ms | The zipper; the ticket counts (Draw widens); the sticker. The sticker first shows as a translucent resin ghost (1117 ms), then its image (1125 ms). |

- The dev server shows the same order, then "Make your first sticker" pops in about 350 ms later
  (`sheet-1-first-open.png`).
- Every return to My board repeats the second-stage pop: an empty board at 120 ms, then the sticker and zipper at
  ~400 ms (`sheet-prod-4-to-board.png`).
- Every return also replays Draw's first-sticker ring and hop and the note (`sheet-4-to-board.png`).

**Cause (verified in code unless marked)**

- The sign-in gate holds only paper and a fine-print line (after 1.2 s) until `/api/session` answers
  (`api/SessionGate.tsx:81-110`, `line/LineGate.css:52-55`). The board can't mount before then. The LINE profile (name
  and picture) is already known inside the gate, because `useIdentity()` needs only LineGate (`identity/useIdentity.ts:11-22`).
- The tray mounts only once the board query answers (`sticker-board/StickerBoard.tsx:661`, `stickers && owner`). The
  owner is the signed-in person, whose id `useMe()` already knows at mount.
- The ticket counts render only once the tickets load (`StickerBoard.tsx:570`), so the key widens then.
- Stickers render at full opacity in the frame the query answers (`StickerBoard.tsx:606-650`). Only a fresh sticker
  lands (`sticker-board/PlacedSticker.tsx:71-86`).
- The resin ghost frame: `stickers/StickerFigure.tsx:48-63` paints the spot, resin and foil layers beside an `<img>`
  that hasn't decoded yet. The ghost frame itself is verified; this cause is suspected.
- The board remounts on every tab visit (`app/App.tsx:104-106`), and its load is in component state
  (`api/useApiQuery.ts:20-52`), so it refetches.
- The ring and hop run 4 × 1.8 s (`StickerBoard.css:461-476`) and the note pops (`:503-518`) whenever `firstVisit` is
  true (`StickerBoard.tsx:530`). `chipsDone` is component state (`:244`), so artist chips replay on every return too.
  That last point is verified in code; it wasn't seen on screen, because no lane user has foil stickers.

**Fix: the board is laid out on the table.** There are three stages.

- **Stage 0: before any data, from the moment LINE is ready.**
  - SessionGate's signing-in state renders a `BoardShell`: the board's paper, the header (photo sticker and name from
    `useIdentity`), the closed zipper, Draw, and the tab strip (`TabBar` with `active="board"`).
  - The real board is built from the same `BoardShell` parts (extract the header and the Draw slot from
    `StickerBoard.tsx:535-578`), so nothing moves when the app mounts.
  - "Opening your sticker board…" stays as the delayed fine-print line, set in the board's blank spot.
  - Draw sits sunk (disabled) in the shell. When the app mounts, it springs up out of the page, using the key's
    existing enable spring (`styles/keys.css:31-32`, `:303-318`, 360 ms). That spring means "now you can draw", and no
    input is lost, since nothing can be drawn before sign-in.
- **Stage 1: the board and tickets answer, t = 0.**
  - The **zipper** is already there. Mount the tray engine before data, with `stickers=[]` and
    `ownerId = useMe().id`: its slots are read lazily and it has `refresh()` (`sticker-board/tray/StickerTray.tsx:58-93`).
    At the hand-over it plays one `shake(0.35)`, so the pull swings and settles as the board lands. That's the zipper's
    own physics (`tray/zipper.ts`). Under reduced motion there's no shake.
  - The **ticket counts** print into a slot reserved from the start (a fixed-width chip with its marks hidden), fading in
    over 160 ms, so Draw never widens.
  - The **stickers** stick on in reading order (the `order` already computed at `StickerBoard.tsx:513-517`).
    - Each lift gets `playStick(lift, { from: "drop", batch: true, delay: min(i, 7) × 35, reduced })`: the existing stick
      plus opacity 0→1 over its first 40%, with no sheen sweep.
    - It starts only after `img.decode()` of each PNG, capped at 300 ms, so no resin ghost shows.
    - The batch lands within 465 ms. A just-sealed or received sticker keeps its own landing and goes last.
    - Given sticker silhouettes fade in (160 ms) with the first sticker.
  - Then the **artist chips** play (`ArtistChipLayer`, unchanged, starting when the batch ends), then the first-sticker
    note and Draw's ring and hop. The chips, note, ring and hop play **once per app open**, held in module-level sets
    like the existing `landed` (`StickerBoard.tsx:105`), not on every return.
- **Stage 2: returning to My board.** It comes from the cache (see item 3) and arrives whole with the page hand-over,
  with no stagger. Stickers that are new since the cached copy stick on.
- **Reduced motion:** the stickers fade in together (the `playStick` reduced branch, `stickers/stick.ts:19-22`), with no
  shake and no stagger; the key enables at once.
- **Input:** a sticker is tappable from its first frame. WAAPI runs on `.placed-sticker__lift`, and hit-testing is on
  its parent.

**Files:** `api/SessionGate.tsx`, a new `sticker-board/BoardShell.tsx` (used by SessionGate and `StickerBoard.tsx`),
`StickerBoard.tsx` (the tray condition at :661, the counts slot at :558-571, the batch stick at :606-650, once-per-open
flags at :244 and :530), `stickers/stick.ts`, `sticker-board/tray/StickerTray.tsx`, `StickerBoard.css` and
`tickets/TicketCount.css`.

**Impeccable:** `/impeccable animate` for the sequence, `/impeccable bolder` scoped to this moment only, then
`/impeccable polish`.

**Size:** L. The shell is most of it; the stick-on batch alone is S.

**Decisions for ad0ll**

1. Show the board shell (header, zipper, Draw, tabs) during sign-in instead of bare paper. _Recommend yes._
2. Play the first-sticker ring, hop and note, and the artist chips, once per app open instead of on every return to
   My board. _Recommend once per app open._
3. Keep the last board on the device, so the next app open paints the stickers before the network answers. This is
   the perf lane's decision (speed). _Recommend yes_: it's what makes a returning open fully smooth.

**Overlaps**

- perf lane: sign-in and board request speed, chunk loading, and a stored last board. This lane owns only what shows
  meanwhile.
- stat-board lane: the flip is untouched.
- In-flight `i18n/sticker-board` and `i18n/api` branches edit the same files' strings (`StickerBoard.tsx`,
  `SessionGate.tsx`).

---

## 2. The shop has no loading animation

- **Item:** "The shop takes a while to load, and it doesn't have an animation showing that it's loading… a progressive
  animation there."

**Now (verified)** (`sheet-3-to-shop.png`, `sheet-prod-3-to-shop.png`)

- At 100 ms, the shop shows "Reading your balance…" and "Getting today's prices…" lines above a sunk Pay key.
- At ~390 ms, all four packs pop in at once and the Pay key jumps about 270 px down the page.
- The balance pops in on its own about 50 ms later.
- Every visit asks `/api/ticket-quote` again (`rec/api.json`, `rec-prod/api.json`).

**Cause (verified)**

- The quote and balance live in the shop's own state (`tickets/TicketShop.tsx:39-73` and `:75-99`), and `ShopScreen`
  mounts on every visit (`app/App.tsx:122`).
- While loading, one text line stands where four 52px rows will go (`TicketShop.tsx:246-249`), so the layout jumps.
- The server answers at once with a mock price (`apps/api/src/server.ts:102`). The wait is the round trip plus the mock
  wallet's 300 ms (`payments/sui.ts:25-28`).

**Fix: a progressive print-in**

1. **Blank stock at the real layout.**
   - The balance well is an unprinted well at its real height.
   - Four `BlankLabelRow`s (52px Liner Lift label stock, a kiss-cut outline where the grape ticket mark sits, no text)
     fill `.ticket-shop__packs`.
   - The Pay key stays sunk.
   - After 400 ms the rows breathe top to bottom, 120 ms apart.
2. **Print in.**
   - When the quote lands, each row's content prints in, top to bottom, 40 ms apart (opacity plus a 4px rise, 180 ms,
     `--ease-out`).
   - Then the smallest pack sticks on as picked (the existing 140 ms grape fill, `TicketShop.css:51-62`).
   - Then Pay springs up out of the page (the existing enable spring).
   - The order reads: packs printed → one picked → you can pay. Nothing moves.
3. **Cache and prefetch.**
   - The quote goes into the query cache under `ticket-quote`, fresh until its `expiresAt`, so the second visit is
     instant.
   - `prefetchApiQuery` fetches it once the board is idle, the way Explore's code is preloaded (`App.tsx:56`), so the
     first visit usually is too.

The same blank stock serves the card layout over the draw screen.

**Files:** `tickets/TicketShop.tsx`, `tickets/TicketShop.css`, `api/useApiQuery.ts`, `app/App.tsx` (prefetch), and the new
blank-stock parts.

**Impeccable:** `/impeccable harden` (the loading, empty and failed states), `/impeccable animate` (the print-in), then
`/impeccable polish`.

**Size:** M.

**Decisions for ad0ll**

1. Prefetch the ticket quote once the board is idle (one small request per app open). _Recommend yes._

**Overlaps**

- shop lane: its redesign of the Shop's content (Favio's 8442396 moved it to yen). The blank stock follows whatever
  layout ships.
- tickets-motion lane: the card layout and the scrim.
- In-flight `i18n/tickets` branch.

---

## 3. Hard cuts, then popping data, between Shop, Explore and My board

- **Item:** "It's also a little bit jarring how hard the transition is between the different pages… hard cutoffs and
  then hard popping of data… look at /impeccable shape for this and maybe bolder too."

**Now (verified)**

- A tab tap swaps whole screens in one frame. `switch-timing.mjs` shows the new screen in the first frame after the tap,
  with no long tasks. (The production strip for the Explore switch dropped screencast frames; the in-page timing is the
  reliable one.)
- The tab's hue fades in 140 ms (`app/TabBar.css:35-38`), but its 2px lift and shadow snap (`:58-66`).
- The new screen arrives empty, and its data pops in one round trip later:
  - **Explore:** "LOADING…" alone, then every section at ~355 ms (`sheet-2-to-explore.png`,
    `sheet-prod-2-to-explore.png`).
  - **Shop:** see item 2.
  - **My board:** see item 1.
- Going back to a tab fetches everything again: `/api/sticker-boards/me`, `/api/gifts/pending`,
  `/api/sticker-boards/me/user-stats` and `/api/explore` repeat on every visit (`rec/api.json`).

**Cause (verified)**

- `app/App.tsx:104-122` mounts only the current view, with no exit or entrance.
- `useApiQuery` keeps its answer in the unmounted component's state (`api/useApiQuery.ts:26-51`).
- Explore's loading state is one line (`explore/ExploreScreen.tsx:381-387`).

**Fix: the motion system above, built in this order**

1. **Query cache** (`api/useApiQuery.ts` and its test).
   - A module-level `Map` of the last good answer per key.
   - On mount it returns `ready` with the cached data at once, and loads again in the background.
   - `refresh` and `retry` are unchanged.
   - This alone removes the second pop on every return, and serves the board, Explore, someone else's board, and the
     quote.
2. **`ScreenTransition`** in `App.tsx` around the three tab screens. The drawing screen stays outside; its hand-over
   belongs to the tickets-motion lane.
   - Direction comes from the tab order. At most one page is leaving at a time.
   - On a second tap mid-change, the leaving page is dropped and the entering one continues.
   - `.explore` and `.shop` already fill `.screen` absolutely at z-index 25 (`ExploreScreen.css:7-18`, `ShopScreen.css`).
     The wrapper is `position: absolute; inset: 0; isolation: isolate` so their stacking stays inside it.
   - Someone else's board, opened from Explore (`App.tsx:113-121`), can reuse the "forward" entrance and a "back" exit.
3. **The tab sticks on** (`app/TabBar.css`). Transition the current tab's `transform` and `box-shadow`, and settle the
   label from 1.04 to 1. `transform` doesn't fight the shared press, which animates `translate`.
4. **Explore's blank stock and arrival.**
   - Today's stickers: the white strip with four `BlankStickerSpot`s (72px kiss-cut outlines).
   - This week: the real leaderboard tabs over a label-stock card of five blank rows (a photo-sticker outline, no text).
   - The feed: two posts, each with an avatar outline and a 112px sticker spot.
   - Sections stick on top to bottom, and each sticker image fades in on `load` inside its spot (160 ms), so images don't
     pop after the data.
5. **Keep Explore alive.** Wrap it in `<Activity mode={view === "explore" ? "visible" : "hidden"}>`, so its search text
   and scroll survive a tab switch. Today only an open artist board keeps them (`App.tsx:107`).
   - Hidden `Activity` content unmounts its effects, so `useApiQuery` revalidates on return; with the cache, that's
     invisible.
   - Don't keep the board alive the same way: its tray engine, light and chips are heavy, and the cache already makes
     its return smooth.

**Bolder, if ad0ll wants more than the slide.**

- The routine hand-over should stay quiet (Operate mode).
- The bolder energy belongs in item 1's first open, and in the tab's stick-on, which is already the world's own motion.
- An alternative for decision 2 below: "the page pulled up by its tab", where the page rises 10px and scales 0.97→1 from
  the tapped tab's position.

**Files:** `app/App.tsx`, a new `app/ScreenTransition.tsx` (+ CSS), `app/TabBar.css`, `styles/tokens.css`,
`api/useApiQuery.ts` (+ `useApiQuery.test.tsx`), `explore/ExploreScreen.tsx` and `.css`, and the blank-stock parts.

**Impeccable:** `/impeccable shape` (this brief, for ad0ll to confirm), then `/impeccable animate`, then
`/impeccable polish`. `/impeccable bolder` applies only to item 1's focal moment and the tab's stick-on.

**Size:** L in all. The cache is S–M, `ScreenTransition` M, Explore's blank stock M, the tab S.

**Decisions for ad0ll**

1. **Hand-over technique.** CSS on live DOM, or React `<ViewTransition>`? `<ViewTransition>` swallows taps while it
   runs (verified) and only animates on iOS 18.2+ (suspected). _Recommend CSS on live DOM._
2. **Hand-over look.** A lateral slide in the tab order, or "the page pulled up by its tab"? _Recommend the lateral
   slide_: legible and calm, with the bolder energy spent on the first open.
3. **Keep-alive.** Keep Explore alive with `<Activity>` for its search and scroll? _Recommend yes; not the board._

**Overlaps**

- explore lane: its content redesign; the blank stock follows whichever layout ships.
- perf lane: the cache and prefetch touch its area. Agree who builds `useApiQuery`'s cache.
- tickets-motion lane: the Keep drawing hand-over uses the same tokens.
- In-flight `i18n/explore` branch.
- DESIGN.md needs a page hand-over and blank-stock rule, and its Index tabs section still says two tabs, but Shop is a
  third (`app/TabBar.tsx`).

---

## 4. Hard cuts on the tray's folder tabs and on Explore's tabs

- **Item:** "Same comment about hard cutoffs on the tabs… on the sticker sheet as well as the tabs on the Explore page."

### 4a. The tray's folder tabs (All, Mine, Gifts)

**Now (verified).** Mine's fill is full hue 12 ms after the tap, and All loses its white at once, while the stack's
gather, drop and deal takes ~650 ms (`crop-7-folder-tabs.png`, `sheet-7-tray-folder-tab.png`). The tabs were unhidden
for the recording, since a tray shows them only once it holds a gift (`tray/trayEngine.ts:685-687`).

**Cause (verified)**

- `.tray__tab::before` transitions only `transform` (`sticker-board/tray/sticker-tray.css:614-625`). Its `background`
  and `box-shadow` snap (`:655-665`).
- Under reduced motion even that is removed (`:795-800`).
- The tabs have no press feedback. They are plain buttons built in `trayEngine.ts:675-682`.

**Fix: the tab stands up and colors in as one move**

- Transition `transform 220ms var(--ease-out), background-color 160ms linear, box-shadow 160ms linear` on `::before`.
  The label's 2px rise already transitions.
- The pressed tab starts at once (feedback within 100 ms), and the stack's deal follows as today.
- Give the tabs the shared press: add `data-press` with a 1px tile travel (`--press-travel: 1px`), as the index tabs
  have.
- Optional: when the dealt sheet lands (~330 ms into the deal), the tab row nudges 1px down and back, as the stack
  squares up.
- Reduced motion: the color changes in 120 ms, with no scale. The existing stack crossfade stays.

**Files:** `sticker-board/tray/sticker-tray.css` (:614-675, :795-800), and `tray/trayEngine.ts:675-682` for `data-press`.

**Size:** S.

### 4b. Explore's leaderboard tabs (Most gratitude, Best combo, Longest streak)

**Now (verified).** The pink fill jumps to the new tab in one frame, and the rows swap in the same frame
(`crop-6-leaderboard-tab.png`).

**Cause (verified).** `.leaderboard-tabs button.selected` has no transition (`explore/ExploreScreen.css:157-175`). The
rows re-render at once when `setBoard` runs (`explore/ExploreScreen.tsx:143-185`).

**Fix**

- **One pink label slides along the track.**
  - A single absolutely placed span in `.leaderboard-tabs`, a third of the track wide less the gaps, carries the label
    shadow.
  - It moves with `transform: translateX(calc(var(--i) * (100% + 4px)))` over 260 ms on `--ease-out`.
  - Button text changes color over 140 ms.
  - The tabs get the shared press, since they're selectable labels.
- **The rows re-deal.** The old list fades out in 90 ms. The new rows stick on top to bottom, 25 ms apart (the first 5
  staggered, the rest together), each over 200 ms.
- **Optional, bolder:** FLIP the rows. People on both boards slide to their new rank (260 ms), new people stick on, and
  those who dropped off fade out. This shows it's the same people ranked another way. It's a ~40-line `useFlipList` hook
  on `[data-person-id]`, reusable for search results.
- **Reduced motion:** the label moves at once, and the rows crossfade in 120 ms.

**Files:** `explore/ExploreScreen.tsx` (:143-185) and `explore/ExploreScreen.css` (:149-175).

**Size:** S for the sliding label and re-deal; M with FLIP.

### Item 4 in common

**Impeccable:** `/impeccable animate`, then `/impeccable polish`.

**Decisions for ad0ll**

1. **Leaderboard rows.** Re-deal them (recommended now), or FLIP them to their new rank (bolder; could come later)?

**Overlaps**

- explore lane: the leaderboard's look and the `i18n/explore` branch.
- The tray's filter motion in `trayEngine.ts` stays as it is.

---

## Summary of decisions for ad0ll (each with a recommendation)

1. **Tab hand-over technique:** CSS on live DOM (recommended), or React `<ViewTransition>`, which swallows taps while it
   runs and needs iOS 18.2+.
2. **Hand-over look:** a lateral slide in the tab order (recommended), or "the page pulled up by its tab" (bolder).
3. **The board shell during sign-in:** show the header, zipper, Draw and tabs before data. Recommended yes.
4. **Once per app open:** the first-sticker ring, hop and note, and the artist chips. Recommended once per app open,
   not on every return to My board.
5. **Keep-alive:** keep Explore alive with `<Activity>` for its search and scroll (recommended yes), but not the board.
6. **Ticket quote:** prefetch it once the board is idle. Recommended yes.
7. **The last board:** keep it on the device for an instant next open. The perf lane decides; recommended yes.
8. **Leaderboard rows:** re-deal them (recommended now), or FLIP them (later).
