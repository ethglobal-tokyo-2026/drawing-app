# Sticker board review fixes

Findings and IDs: `docs/review/2026-10-09-sticker-board-review.md`; each item's full text, quotes and proof are in that review's `lanes/` files.

Each lane: its own worktree from main; commits as it goes (squash before merge, no AI attribution); runs its files' tests, frontend typecheck and lint; reports. The coordinator merges, runs `pnpm check`, and ticks the item.

## Wave 0: performance

- [x] The light on the highlights, the Shop's previews, the tilt sweep (95a45b14, 662d6016, fc8ffb3b).
- [x] P-tray: the Zipper's per-frame work (bedb31ea, 72420473).
- [x] P-board: StickerTray memoized, the board's per-render storage reads and writes, O(n²) order, ArtistBoard's memos, the crease signature, the reading-order effect (d3484b12).

## Wave 1: bugs

B1 waits for B4 (both edit `StickerBoard.tsx`).

- [ ] B1 board placement (`StickerBoard.tsx`, `boardSticker.ts`, `largeLayout.ts`, `lastBoard.ts`, `ArtistBoard.css`, `StickerToolbar.tsx`): ADOPT-1, ADOPT-2, ADOPT-3, KEPT-1, KEPT-2, ADOPT-4 (reproduce first), DETAIL-4, the hidden gratitude-check alert (`StickerBoard.tsx:1104`), `StickerToolbar`'s width read after every board render (place it on its own size changes).
- [ ] B2 gestures (`useBoardGestures.ts`, `boardGesture.ts`): GEST-1 (a cancel puts the sticker back, as the Zipper does), GEST-2, GEST-3, GEST-4, SWEEP-2, a second Remove during a stow (board-logic).
- [ ] B3a tray hands (`zipper.ts`, `trayPeel.ts`, `trayPresses.ts`, `trayBoardDrop.ts`): ZIP-1, ZIP-2 and NEW-ZIP-1 (speed from `e.timeStamp`), PEEL-1 to PEEL-3, TRAY-1, TRAY-2.
- [ ] B3b tray sheets (`trayEngine.ts`, `trayModel.ts`, `trayPaging.ts`, `traySpread.ts`, `sheetPacking.ts`): ENGINE-1 (pack on a page height from the layout alone), ENGINE-2, ENGINE-4, TRAY-3, TRAY-4, TRAY-5, MEASURE-1.
- [ ] B4 detail and NSFW (`StickerDetail.tsx`, `stickerDetailQuery.ts`, `stickers/nsfw.ts`, `sticker-detail.css`, `detail-lift.css`): DETAIL-1 with its Escape, DETAIL-2, DETAIL-3, KEPT-3, KEPT-4, DEPTH-1, the flyer's double blur (sticker-detail P1).
- [ ] B5 stat board: STAT-1 to STAT-4, SWEEP-1. NEW-STAT-1 needs a tap in LINE's iOS browser.

## Wave 2: cleanup

High and medium-high items in each lane file; lower ones only with a reason.

- [ ] C1 board: `board-screen.txt`, `board-logic.txt`, SIMP-1 to SIMP-6, REUSE-1 to REUSE-6, CONV-1, CONV-2, CONV-4.
- [ ] C2 tray: `tray-engine.txt`, `tray-sheets.txt`. Split `zipper.ts` only for its SVG artwork, if at all.
- [ ] C3 detail, material and timelapse: `sticker-detail.txt`, `material-timelapse.txt`.
- [ ] C4 stat board: `stat-board.txt`.
- [ ] C5 shared helpers and test setup, alone and last: `handleOf` into `stickers/format.ts`, the sticker element lookup beside PlacedSticker, one portal over `.phone` in `ui/`, `messageOf` into `i18n/errorMessage.ts`, one AbortError check, one pointer-capture helper, one reduced-motion query, React test setup in vitest's `setupFiles`, a `BoardStickerView` test builder, test copy read from the catalog.

## Decisions waiting on ad0ll

Questions 1–5 in the review. Approved answers become items here.
