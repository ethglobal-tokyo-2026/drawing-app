# Drawing screen review (2026-10-09)

A max-effort `code-review` of `apps/frontend/src/sticker-creation/` at main `3f2c21bd`, plus where its ink pipeline can be simplified or made faster. Each lane's full text is in `data/scratch/drawing-review/` (gitignored). This record goes once its findings are fixed or decided.

Status: finder lanes running; nothing below is verified yet.

## Lanes

| Lane | Angle                                          | Status   |
| ---- | ---------------------------------------------- | -------- |
| A1   | Line by line: canvas engine                    | running  |
| A2   | Line by line: screen and tools                 | running  |
| A3   | Line by line: sealing                          | running  |
| A4   | Line by line: kept drawing and clock           | running  |
| B    | What recent rewrites removed                   | running  |
| C    | Cross-file contracts and wrappers              | running  |
| D    | Language and platform pitfalls                 | running  |
| R    | Reuse                                          | running  |
| S    | Simplification: screen, sealing, session       | running  |
| P    | Ink pipeline: simplify without losing anything | running  |
| H    | Performance: the drawing hot path              | running  |
| O    | Performance: fill, undo, seal, save            | running  |
| M    | Profiling scripted strokes                     | running  |
| T    | Fixes at the wrong depth                       | running  |
| K    | Comments, i18n, docs                           | running  |
| X    | Tests                                          | running  |
| Z    | Dead code, deprecation, naming                 | reported |

## Candidates

### Dead code, deprecation, naming (Z)

- **Z-1** (high) `session/keptSession.ts:456,534-541,566-568`: three back-compat shims for kept drawings from older builds (fill without `gap`, two-die `rolls`, a pair dealt without picks), against AGENTS.md's "No back-compat shims".
- **Z-2** (high) `packages/db/src/drawnSizes.ts`: the one-shot helper for migration 0008 runs a check on every API start; its own header says to delete it once every database has applied 0008. Its export `drawnSizeOf` is unused and shares a name with the frontend's `sealing/timelapse.ts:46`.
- **Z-3** (medium) `DrawingScreen.tsx`: 1240 lines doing three jobs besides layout: picking a kept session back up (608-826), sealing (335-533), spending tickets (540-584, 871-951).
- **Z-4** (medium) `session/session.ts`: a generic name over four jobs: clock length, the phase machine, seal failure sorting, clock holds.
- **Z-5** (medium) `drawingSettings.ts:41,50`, `tools/palette.ts:80,82`: four exports only tests read.
- **Z-6** (low) `sealing/pixels.ts`: holds only `boxResample`.
- **Z-7** (low) `tools/MyBoardTile.css:4,6`: places the tile with the history tiles' sizes copied in.
