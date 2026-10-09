# Sticker board review

**Scope:** `apps/frontend/src/sticker-board/` and the sticker material it draws (`apps/frontend/src/stickers/`), at main 52493b56; the render cost of foils, the one light, the resin, creases and the board's motion, on the board and the sticker detail.

**Lanes:** the `code-review` skill at max effort (correctness, reuse, simplification); checklist lanes for comments, tests, naming, magic numbers and leftovers (board screen, board logic, sticker detail, material and timelapse, tray engine, tray sheets, stat board); two performance lanes (a material A/B bench, and traces of real interactions on a seeded board).

**Status:** lanes reporting. Findings below are verified unless marked suspected.

## Findings

### Leftovers to remove

1. **The resin's spec and rim highlight masks are made, stored, served and decoded, and nothing shows them.** Since 34b8d903 (the thin laminate), the live resin's specular is cut from `--m` alone; `--mt`/`--mb` have no reader. Sealing still computes both bands (`sticker-creation/sealing/stickerLayers.ts`, `cutSticker.ts`) and uploads them, the API stores and serves them as PNG and WebP (`apps/api/src/stickers/seal.ts`, `sealForm.ts`, `services/imageStore.ts`, `shapes.ts`), `api/views.ts` maps them, and `sticker-board/boardComplete.ts:78` decodes them for every board sticker at boot: two of the four images each sticker waits for. Confidence: high. **Taken by another session:** branch `refactor/drop-resin-masks` (93e2c583) drops them end to end.

### Owned by the drawing screen review

`docs/review/2026-10-09-drawing-screen-review.md` already holds three findings in this folder; this review leaves them to it: T-3 (`stat-board/TryPenPressure.tsx` runs its own copy of the pen pipeline), C-4 (`timelapse/testCanvas.ts` ignores `putImageData`'s dirty rect) and R-2 (`timelapse/fillSnapshots.ts` makes canvases by hand).

### Docs

1. **DESIGN.md's One Light Rule still says the foil's bands "run on their own clock, flowing on a 7s loop staggered per sticker"**; 59ec2b18 made every foil move only with the light. A question for ad0ll (DESIGN.md changes need their sign-off).

## Performance

Pending the performance lanes.

## Questions for ad0ll

Collected as lanes report.
