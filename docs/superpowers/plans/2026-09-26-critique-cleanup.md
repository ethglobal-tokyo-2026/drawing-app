# Critique cleanup Implementation Plan

Fixes from the 2026-09-26 whole-app critique (27/40, Acceptable), plus the owner's decisions from the same day. Each stream works in its own worktree under `.claude/worktrees/` and merges into main once its checks pass. Remove this plan when every stream has merged.

## Decisions

- The stat board's developer slip goes behind a dev flag, `VITE_DEV_SLIP`. Its content is styled to blend into the stat board, in case the flag is left on.
- Android Back and LINE's Back close the open overlay, app-wide.
- The sticker detail opens with a "lift off the board" (spec below).
- Drawing time prints with units: "4m 52s", "5m" on the minute, "54s" under a minute. The live timer keeps M:SS.
- Share my board and its QR code are removed until visiting someone's board exists. Their link opens the app, not your board.
- Kept as they are: the mock Sui ticket purchase, a placeholder until it has designs. Not supported: 320px phones.

## Streams

| Stream      | Branch (worktree)                           | Owns                                                                                                                                               |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board       | `cleanup/board` (`cleanup-board`)           | `sticker-board/` except the stat board's contents, `giving/`, the Back handling in `app/`, `stickers/format.ts`, the sealed card's fine print line |
| Drawing     | `cleanup/drawing` (`cleanup-drawing`)       | `sticker-creation/` except the sealed card's fine print line, `app/TabBar.*`, `tickets/`, `stickers/light.ts`                                      |
| Stat board  | `cleanup/stat-board` (`cleanup-stat-board`) | `sticker-board/stat-board/` except `BoardFlip.tsx`, the slip's styling in `identity/`, `line/LineGate.*`, the dev flag                             |
| Coordinator | main                                        | detector config, `.gitignore`, merges, the bundle split after Board merges, the final critique                                                     |

## Board

- [x] B1 (P1) Keep the selected sticker's toolbar clear of the Draw key. Draw (z-index 955) covers Give on stickers low on the board, because `toolbarSpot` (`placement.ts`) doesn't avoid it. Pass Draw's box into `toolbarSpot` and flip the toolbar above the sticker when they'd meet. As a backstop, stack the toolbar above Draw.
- [x] B2 (P2) Keyboard path:
  - The stickers take one Tab stop. Focus doesn't select; arrows move focus between stickers until one is selected.
  - Enter or Space selects. Arrows then move the selected sticker, and Tab enters its toolbar. Escape returns to focus-only.
  - The name and Draw come before the stickers in DOM order.
  - The detail's dialog is named after its sticker ("No.0117").
- [ ] B3 The detail's "lift off the board" (spec below).
- [x] B4 App-wide Back, as an overlay stack on `history.pushState`/`popstate`:
  - It covers the sticker detail, the stat board (Back flips it back, as DESIGN.md says for LINE's Back) and the Giving sheet.
  - Closing from the UI pops its own entry, so the stack stays true.
  - LIFF's start-up URL handling and gift links keep working.
- [x] B5 `formatDuration` in `stickers/format.ts`, with a spoken form ("4 minutes 52 seconds"). Use it on:
  - the sealed card: "No.0147 · 4m 52s · 2026.09.23 · @alice";
  - the detail: "By @alice · drawn in 4m 52s · 2026.09.23";
  - the give sheet's meta line;
  - the gift message: "A one-of-one drawing · drawn in 4m 52s";
  - the board's sticker labels.

  The units stay lowercase inside capitalized fine print.

- [x] B6 The first sticker lands on the empty board's dashed spot, the one saying "Stickers you make or receive land here".
- [x] B7 Giving:
  - "When they accept, you'll see who opened it" promises what isn't built; say what's true now.
  - "In the bag" has two controls for one action; keep one, as the drafts do.
- [x] B8 Tray: no NEW mark on a used sticker silhouette.
- [x] B9 The board's load error leads with a plain sentence instead of splicing the raw message mid-sentence.
- [x] B10 (optional, skipped) A sticker's tap area follows its cut, not its image box.

## Drawing

- [x] D1 (P1) Keep the drawing across a reload.
  - Save the ops and the elapsed clock to IndexedDB after each committed stroke and when the page hides.
  - On Draw, restore them paused, with a white label: "Picked up where you left off".
  - Wipe at seal, and when time runs out on an empty sheet.
  - If restoring fails, say so and give the ticket back.
- [x] D2 (P2) First run:
  - For the first few visits, a white label under the timer reads "Starts when you draw"; the first stroke peels it off.
  - The grabber reaches at least 3:1 contrast and gets a 44px touch band.
  - It shows as a label-stock pull tab reading "Board" until it's been used once.
  - It comes after the tools in Tab order.
- [x] D3 The PAUSED tag shows only once the clock has started.
- [x] D4 Focus stays within the drawing screen's controls; it never falls to the page body.
- [x] D5 The light listens for tilt only while a screen with stickers is showing.

Another branch changes the session to 3 minutes, so no new code or copy assumes 5:00.

## Stat board

- [x] S1 The dev flag and the slip:
  - `VITE_DEV_SLIP` is on in the dev server. Builds show the slip only when it's set to `on`. Document the flag in `.env.example` and `env.d.ts`.
  - Style the slip's rows in the stat board's paper and label vocabulary, keeping their wording.
  - The Privy status line moves from the 11px caption size to a body size.
- [x] S2 Remove Share my board, the QR sheet and their now-unused code; git keeps them for when boards can be visited.
- [x] S3 At 360px, the Bests note keeps its labels on one line where the drafts do. Close the empty gap above Flip back.
- [x] S4 "Since" is the earliest of the first visit and the oldest sticker.
- [x] S5 LINE's screens:
  - The world's ground: Liner with its grain and the SEAL · シール maker print.
  - A plain first sentence, with LIFF's code as selectable fine print.
  - A quiet opening state instead of a blank page while LIFF starts.

## Coordinator

- [x] C1 Commit `.impeccable/config.json`:
  - drop the stale `cubic-bezier(0.3, 1.6, 0.5, 1)`;
  - add the spring curve without leading zeros and Mona Sans;
  - write the reasons neutrally.
- [x] C2 Ignore `.playwright-mcp/`, the detector's caches and critique snapshots.
- [ ] C3 After Board merges, split the bundle: lazy-load the tray, the detail, the stat board, Giving and the LIFF SDK. The entry chunk is over Vite's 500 kB warning.
- [ ] C4 Push. The whole-app critique isn't re-run yet (owner, 2026-09-26).
- [ ] C5 Critique and code-review the sticker board and `stickers/` once the three streams have merged, and fix what they find on a branch.
- [ ] C6 Clean up: remove merged, finished worktrees and branches (asking each owner first for work that isn't this plan's), this plan, and the scratch files.

## Detail "lift off the board"

- **The sticker's flight:** FLIP from the tapped sticker's rect and turn to its place in the detail, 280ms (`--t-peel`, `--ease-peel`).
  - It passes through a slight lift: `translateY(-8px) rotateY(-11deg)` at 35%, under `perspective(900px)`.
  - It uses the peeling shadow.
  - The board's copy is hidden during the flight.
- **The rest of the detail:**
  - The ground fades in over 180ms.
  - The thumbnail strip slides 12px in from the left over 200ms, 40ms in.
  - The fine print and Give rise 8px over 160ms, 120ms in.
- **Given stickers:** they start from their given sticker silhouette and fade in over the first 40%.
- **Closing:** the flight reverses in 220ms (`--t-stick`), then the existing stick settle plays. A sticker in the tray just fades.
- **Input and reduced motion:** the detail takes input from the first frame, and Escape and Enter work mid-flight. Reduced motion is a 150ms crossfade.

## Verification

- **Per stream:**
  - the frontend's lint, typecheck and tests, and the format check;
  - screenshots of every changed screen at 390×844, plus 360 and 430 where layout changed, beside the drafts.
- **Before each merge:** the coordinator re-runs the checks and the build on the merged result.
- **At the end:** the detector and the critique.
