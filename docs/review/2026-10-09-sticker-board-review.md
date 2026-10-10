# Sticker board review (2026-10-09)

**Scope:** `apps/frontend/src/sticker-board/` and the material it draws (`src/stickers/`), at main 52493b56, plus the render cost of foils, the light, resin, creases and the board's motion, on the board and the sticker detail.

**How:** the `code-review` skill at max effort (14 finder lanes, a verifier per candidate); seven checklist lanes (comments, tests, names, magic numbers, leftovers); a material benchmark and two trace runs on a seeded 24-sticker board. Each lane's findings, with quotes and proof, are in `2026-10-09-sticker-board-review/lanes/` (the skill's ranked list: `lanes/skill-final.txt`). Fixes: `docs/superpowers/plans/2026-10-09-sticker-board-review-fixes.md`.

**Status:**

- Merged: the light is written on the highlights that move with it (95a45b14), and the Shop's previews follow their own light again (662d6016).
- Running: tray frame cost (`perf/tray-frames`), the board's re-render cost (`perf/board-renders`).
- Taken elsewhere: the spec and rim masks (d6380033); TryPenPressure's pipeline copy, `testCanvas.ts`'s dirty rect and `fillSnapshots.ts`'s canvases (drawing screen review).

## Bugs (verified)

| ID       | Where                             | What happens                                                                                              |
| -------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| ADOPT-1  | `boardSticker.ts:204`             | A load adopted over held stickers gives each a fresh large spot and saves it over the iPad's arrangement  |
| DETAIL-1 | `StickerDetail.tsx:471`           | An 18+ mark that fails after paging away is never shown; Escape tests the wrong sticker's mark            |
| TRAY-2   | `tray/trayBoardDrop.ts:174`       | Every put-back draws the sticker in its slot while its flying copy is still in the air                    |
| PEEL-2   | `tray/trayPeel.ts:116`            | A press off a tray sticker's center skips the curl; a short drag sticks it under the tray                 |
| DETAIL-4 | `ArtistBoard.css:96`              | View on someone else's board squashes a non-square sticker square                                         |
| ENGINE-1 | `tray/trayModel.ts:412`           | Packing height follows the sheet count, so one new sticker moves earlier ones to other sheets             |
| KEPT-3   | `stickers/nsfw.ts:30`             | After the NSFW opt-in goes off, a decoded sharp copy shows unblurred under the 18+ mark                   |
| KEPT-2   | `StickerBoard.tsx:521`            | After an 18+ mark or a take-out, the next tap writes the old board back to the device                     |
| DEPTH-2  | `placement.ts:61`                 | A phone layout wider than 440 px shares spacing with the phone, so overlaps appear or vanish between them |
| ADOPT-3  | `boardSticker.ts:206`             | Given-away stickers still block spots: a new sticker misses the empty board's dashed spot or overlaps     |
| PEEL-1   | `tray/trayPeel.ts:263`            | A stale timer reopens the pouch under the next sticker in hand; it lands hidden under the tray            |
| KEPT-4   | `stickerDetailQuery.ts:22`        | Detail answers stay fresh 60 s and nothing forgets them: a gift within the minute is missing              |
| GEST-2   | `useBoardGestures.ts:436`         | A drag that becomes a pinch leaves the tray's drop state live; the tray unzips over the sticker           |
| ZIP-1    | `tray/zipper.ts:1196`             | A second touch on the Zipper's pull replaces the first finger's grab and opens the tray                   |
| STAT-2   | `stat-board/SettingsNote.tsx:147` | A setting's save that fails after leaving the board tab is only logged                                    |
| —        | `StickerBoard.tsx:1104`           | The gratitude check's failure hides whenever a spot is unsaved                                            |

Lower severity, confirmed: STAT-1 (first turn's focus lost), DETAIL-3 (detail jumps to the first sticker), KEPT-1 (first large layout derived with the phone's size), TRAY-1 (pulled-out sheet: no Enter, hidden from VoiceOver), DETAIL-2, TRAY-3, TRAY-4, GEST-1 (a cancelled touch is saved as a move), GEST-3, GEST-4, ENGINE-2, PEEL-3, ADOPT-2, DEPTH-1, ENGINE-4, TRAY-5, STAT-3, STAT-4, SWEEP-1, SWEEP-2, DEPTH-4. Plausible: ADOPT-4, ENGINE-3, ZIP-2, MEASURE-1. Unverified: DEPTH-3, NEW-ZIP-1, NEW-STAT-1 (Copy in LINE's iOS browser).

## Cleanup

| Lane file                | Findings | Leading items                                                                                    |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `board-screen.txt`       | ~60      | O(n²) order per render; ArtistBoard's memos never hold; 23 hand-written board renders in tests   |
| `board-logic.txt`        | ~50      | "held" and "given" mean two things each; tests that restate constants; one test that can't fail  |
| `sticker-detail.txt`     | 35       | Flyer blurs a foil sticker's image twice under its mask; Mark/Remove 18+ test helpers duplicated |
| `material-timelapse.txt` | 38       | `releaseCanvas` hand-copied; foil CSS numbers that don't say what they derive from               |
| `tray-engine.txt`        | ~48      | Five Zipper events nobody hears; per-frame transforms re-formatted; idle tug's bare numbers      |
| `tray-sheets.txt`        | 53       | Unused packer options; CSS restating TS sizes; StickerTray test boilerplate                      |
| `stat-board.txt`         | 45       | Dead `onEscape`; developer slip CSS repeated in five files; stale slip description               |

Shared helpers wanted across the app (copies counted by the lanes): `handleOf` (9+ copies), the sticker element lookup (8), the `.phone` portal (11 components), reading-order points (5), turned-box extents (4), saved-spot rounding (4), `messageOf` (~15), the AbortError check (4), the reduced-motion query string (7 files), `setPointerCapture` try/catch (7 files), React test setup (44 test files), a `BoardStickerView` test builder (5 test files).

## Performance

Chromium, CPU slowed 4×, 24 stickers; GPU is software here, so raster numbers aren't a phone's.

| What                                    | Measured                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Light moving (bench, mouse)             | Main thread 768 → 524 ms/s, style 430 → 228 ms/s, frames over 1.5× the median 23–62 → 0–1 per 6 s (merged)         |
| Light moving (bench, tilt)              | Main thread 766 → 538 ms/s, style 425 → 226 ms/s                                                                   |
| Light written every 90 ms instead of 45 | A further cut to 344–528 ms/s; not merged, see question 2                                                          |
| Idle sway                               | About 80 ms/s of main thread, no dropped frames in either engine                                                   |
| Taps (dev build)                        | Select 175 ms, open detail 257, drag pickup 167, drop 177: the board's React re-render; production numbers pending |
| Board turn                              | 130 ms at the start (style recalc over 1,653 elements as the front goes inert), 64 ms landing                      |
| Detail close                            | 161 ms: style 45 ms, raster 61 ms                                                                                  |
| Tray                                    | Opening frame 367 ms (rendering, no script); closing: 34 of 205 frames over 33 ms                                  |
| Boot                                    | Spec and rim masks were 23% of image bytes and 34% of requests (removed, d6380033)                                 |

Tried and dropped: the light written once per sticker or on the board (slower), `--lx`/`--ly` registered with `@property` (no gain), a per-frame JS glide in place of the CSS transitions (twice the writes), a baked resin band (no gain). Each mask downloads twice in dev because Vite's proxy adds `Vary: Origin`; the API doesn't, and production is unchecked.

## Questions for ad0ll

1. DESIGN.md's One Light Rule says the foil's bands flow "on a 7s loop staggered per sticker"; since 59ec2b18 they move only with the light. Change the sentence to match?
2. Writing the light every 90 ms instead of 45 cuts its cost by about a third again. The highlights still glide (280 ms transitions), but the light updates about 11 times a second instead of 22. Try it? Recommended: yes, judged on your phone.
3. DEPTH-2: phone-layout windows wider than a phone (LINE's sheet on an iPad, Split View) keep phone-sized stickers but spread them, so a wide window and a phone disagree on overlaps. Recommended: accept it; the alternative is a third saved layout.
4. Bigger then Smaller leaves a sticker 0.64% smaller (`STEP_GROW` 1.08, `STEP_SHRINK` 0.92). Make Smaller undo Bigger exactly? Recommended: yes.
