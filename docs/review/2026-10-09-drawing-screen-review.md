# Drawing screen review (2026-10-09)

A max-effort `code-review` of `apps/frontend/src/sticker-creation/` at main `3f2c21bd`, plus where its ink pipeline can be simplified or made faster. Each lane's full text is in `data/scratch/drawing-review/` (gitignored). This record goes once its findings are fixed or decided.

Status: finder lanes running; nothing below is verified yet.

## Lanes

| Lane | Angle                                          | Status   |
| ---- | ---------------------------------------------- | -------- |
| A1   | Line by line: canvas engine                    | running  |
| A2   | Line by line: screen and tools                 | running  |
| A3   | Line by line: sealing                          | reported |
| A4   | Line by line: kept drawing and clock           | reported |
| B    | What recent rewrites removed                   | running  |
| C    | Cross-file contracts and wrappers              | running  |
| D    | Language and platform pitfalls                 | running  |
| R    | Reuse                                          | running  |
| S    | Simplification: screen, sealing, session       | reported |
| P    | Ink pipeline: simplify without losing anything | reported |
| H    | Performance: the drawing hot path              | running  |
| O    | Performance: fill, undo, seal, save            | reported |
| M    | Profiling scripted strokes                     | running  |
| T    | Fixes at the wrong depth                       | reported |
| K    | Comments, i18n, docs                           | reported |
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

### Sealing, line by line (A3)

- **A3-1** (high) `sealing/stickerLayers.ts:279` with `:242-246`: for some cut and ink sizes a float error makes the sharp copy wider but not taller than the sticker PNG. The server then refuses the seal (`apps/api/src/stickers/seal.ts:90`), and at 0:00 a refusal resets the sheet, so the drawing goes and its ticket is spent. A brute force found hundreds of failing combinations at certain ink sizes.
- **A3-2** (medium) `sealing/SealCeremony.tsx:352`: a Pencil tap that skips the ceremony isn't cancelled the way a finger's is, so its click can press Keep drawing, which spends the next daily ticket (also T-4).
- **A3-3** (medium) `apps/api/src/stickers/seal.ts:221-223`: a timelapse the server can't read refuses the whole seal, though the client treats the timelapse as optional.
- **A3-4** (medium) `stickerLayers.ts:314-329`: the sharp copy builds every grid field at full size, about 136 MB of Float32 for a large sticker (worked out, not measured).
- **A3-6** (low) `makeSticker.ts:96-106`: a worker the OS kills sends no error, so only the 60 s timer ends the wait.
- **A3-7** (medium) `DrawingScreen.tsx:1175`: leaving mid-seal and coming back replays the ceremony from the start.

### Kept drawing and clock, line by line (A4)

- **A4-1** (medium) `session/keptSession.ts:99-159,321-343`: IndexedDB writes have no timeout; a hung open shows the drawing as kept while nothing is written, and a late answer clones every queued step in one burst.
- **A4-2** (medium-low) `app/App.tsx:215`, `keptSession.ts:181`: every open tab picks up the same kept drawing and writes over the others'.
- **A4-3** (low-medium) `DrawingScreen.tsx:266-271`: the spend's key is forgotten even when the session record failed to write, so a reload spends a second ticket.
- **A4-4** (low) `keptSession.ts:421-428`: undo leaves step records past the count, and a failed write's gap is filled by a stale undone step on reload.
- **A4-5** (low-medium) `keptSession.ts:283-290`: after a failed write the next save rewrites every step, which the performance recorder doesn't time.
- **A4-6** (medium) `keptSession.ts:447-465`: `readStep` drops fields it doesn't know; layers must extend it and record layer changes that affect a fill as steps.
- **A4-7** (medium) `DrawingScreen.tsx:608-826`: the pick-up state machine belongs in a `session/` hook (also Z-3).

### Simplification: screen, sealing, session (S)

- **S-1** (high) `canvas/DrawingCanvas.tsx:57`, `inkEngine.ts:439-444`: `screenToSheet` has no caller, while `sheetBox()` (`DrawingScreen.tsx:323-333`) finds the sheet by its `.ink-sheet` class.
- **S-2** (medium) `sealing/makeSticker.ts:9-40`: `SealedSticker` restates eleven of `CutSticker`'s fields and copies them by hand.
- **S-3** (high) `sealing/sealWorker.ts:9,15` and `DrawingScreen.tsx:107`: `SealRequest` names both the worker's cut message and the API's seal body.
- **S-4** (high on structure) `session/useSessionClock.ts:172`, `session.ts:187-210`: which hold stops the clock takes four structures in two files, and `activeHolds()` builds an array and a Set four times a frame (also A4-8).
- **S-5** (medium) `DrawingScreen.tsx:211,217`: the sheet's ticket is two refs, set with the clock's length in three copies.
- **S-6** (medium) `DrawingScreen.tsx:925-939`: `timerNote` is a seven-deep ternary.
- **S-7** (high) `DrawingScreen.tsx:87`, `tools/SizeRail.tsx:13`: the size step is defined twice.
- **S-8** (medium) `TimerDot.tsx:117-118`: `held` and `heldCall` name the kept label, beside `view.held`, a clock hold.
- Aside: `penDrew()` re-reads and parses localStorage on every pen pointerdown (`inkEngine.ts:298`, `drawingSettings.ts:44-46`).

### Ink pipeline (P)

Positions are smoothed once (the filter), `MIN_STEP` only thins, the curve passes through every point and is what's stored, and painting is incremental. Prediction is gone since d6d190f4, though the layers spec still names a prediction canvas. Another session is replacing Smoothing with a rebuild of Clip Studio Paint's stabilizer (`docs/research/clip-studio-paint-stabilization/`, untracked), so P-4 and P-5 matter only if the One Euro filter stays.

- **P-1** (medium) `canvas/inkEngine.ts:606-609,702-711`: every Pencil brush stroke copies the whole ink into a new canvas before its first dot, then restores it and repaints the whole stroke at lift, to narrow its last 8 units. Established practice is a wet-stroke canvas committed once (Excalidraw #8340; Krita's indirect painting). Same as T-1, H-a, H-b.
- **P-2** (low) `canvas/inkSurface.ts:70`: live strokes paint in per-frame chunks whose overlapping edges carry more alpha than one whole fill does in replay, so a fill near the closing threshold can flood differently after an undo, a reload or in the timelapse. The stabilizer research measured the same mismatch for the eraser (216 pixels, alpha off by up to 62).
- **P-3** (medium) `canvas/history.ts:187`: each checkpoint makes a fresh full-ink canvas and frees the oldest; reuse the evicted one (also O-4).
- **P-4** (medium) `inkEngine.ts:653`: under Smoothing the line's position trails the nib but its pressure is the newest raw sample, so pressure lands ahead of the path.
- **P-5** (low) `stabilizer.ts:130`: speed is measured raw to raw, where the One Euro reference now measures from the filtered value.
- **P-6** (medium) `brush.ts:187,201`: fingers' taper-in and speed easing step per point, so they vary with the sample rate (also T-2).
- **P-7** (high) `brush.ts:191-196`: an array push, splice and reduce per pen point to average two numbers.
- **P-8** (low) `strokeCurve.ts:110`: tens of short-lived allocations per point.

### Fill, undo, seal and save performance (O)

JavaScript times from V8 on this Mac (probes in `data/scratch/drawing-review/`), not device timings.

- **O-1** (high) `canvas/history.ts:186-191`: after a deep undo, eviction drops the checkpoint just taken, so past the oldest of four checkpoints every undo replays the whole page, fills included (probe: 263 ops and 8 fills per undo).
- **O-2** (high) `canvas/fill.ts:508-541`, `inkSurface.ts:75-107`: a fill reaching past its near square reads and floods the whole sheet at lift (probe: 149-303 ms of JavaScript at iPad size), and every replay floods again.
- **O-3** (high) `history.ts:113-116,136-144`: picking a drawing back up replays every step and snapshots every 24 cost units, discarding most (probe: 20 snapshots and 16 discarded for 300 steps).
- **O-4** (medium) `history.ts:186-191` via `inkEngine.ts:712,728`: every 24th lift and every fill makes a full-ink canvas synchronously, timed under the same label as the pen's copy.
- **O-5** (medium) `DrawingScreen.tsx:363-370`, `makeSticker.ts:79`, `SealSheet.tsx:181,241-251`: the seal copies the whole ink two or three times where drawing the live canvas would do.
- **O-6** (medium) `sealing/cutSticker.ts:105-118`, `stickerLayers.ts:253,280,329`: four ceremony-only layers are PNG-encoded in the worker and decoded on the main thread, and `glossPlanes` runs twice a seal.
- **O-7** (medium) `sealing/ceremonyPaint.ts:127-207`: while the seal waits on the server, every frame clears a full-screen canvas and strokes the whole contour (also A3-5).
- **O-8** (medium) `history.ts:42`: the ink and four full-ink checkpoints stay alive under the board and through the seal's peak memory.

### Fixes at the wrong depth (T)

- **T-1** (high) `canvas/inkEngine.ts:605-611,689-692,702-711`: the pen's tail taper is applied after painting, so every Pencil stroke copies and restores the whole ink, and a take-back ignores that copy and replays history. A wet-stroke canvas committed at lift removes all of it (P-1).
- **T-3** (high) `sticker-board/stat-board/TryPenPressure.tsx:45-150`: Settings' Try it strip runs its own copy of the pen pipeline, which missed d6d190f4's Smoothing.
- **T-7** (medium) `inkEngine.ts:169-176,387-394,457-500`: each pointer's role lives in five structures plus `fingersGone`; one map of pointer id to role would replace them.
- **T-8** (medium) `DrawingScreen.tsx:980-995`, `inkEngine.ts:302-306`: "a tap outside an open panel closes it" is enforced by three mechanisms that depend on each other's order.
- **T-2** (medium) `canvas/brush.ts:17-25,148,199-201`: two taper-in models, pens by distance and fingers by point count (P-6).
- **T-5** (medium) `SealSheet.tsx:86,149-162` and other Sheet callers: each builds its own large-screen scrim.
- **T-6** (medium) `DrawingScreen.css:126-219,304-346`: four hand-written positions per control (phone or large, right or left hand).

### Comments, i18n, docs (K)

- **K-1** (high) `i18n/strings/stickerCreation.ts:212,312`: translator notes with stale numbers (30 colors, sizes 1 to 48).
- **K-2** (high) `DrawingScreen.tsx:118`, `App.tsx:198`, AGENTS.md's architecture line: "drawers" is a stale name for panels, and the line leaves out `session/`.
- **K-3** (high) `SealSheet.css:57,90,133`, `DrawingScreen.css:210`, tests, `i18n/glossary.md:20`: Kyoto Seika Practice Mode shortened and made into nouns.
- **K-4** (high) `keptSession.ts:7-16`: an 8-line file header.
- **K-5** (high) `TimerDot.tsx:23`: "an unverified guess, to tune by feel" in a comment.
- **K-6** (medium): comments in the screen's CSS and tests restate values set elsewhere.
- **K-7** (medium) `DrawingScreen.css:113`, `brush.ts:20-30`, `SealKey.css:97`, `ClearBar.css:48`: comments that log what happened instead of a standing reason.
- **K-8** to **K-12** (low): research precedents as reasons, long doc comments, Smoothing's capital, an inline printed pattern, "drawings" in the burn-sticker plan.
