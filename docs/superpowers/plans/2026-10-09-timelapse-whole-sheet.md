# Timelapse on the whole sheet: plan

Spec: `docs/superpowers/specs/2026-10-09-timelapse-whole-sheet-design.md`. Branch `feat/timelapse-whole-sheet`, worktree `.claude/worktrees/timelapse-mock` (mock servers on 5191/8791, a sealed test sticker with marks erased outside its cut: `apps/frontend/scratch/seed.ts`, untracked, never committed).

## Shared interface (task 1 lands it before the lanes start)

`apps/frontend/src/sticker-board/timelapse/timelapseFrame.ts`, pure:

```ts
/** Where the sheet sits on the stage: sheet point (x, y) lands at (left + x·scale, top + y·scale), CSS px. */
interface Placement { left: number; top: number; scale: number }
interface TimelapseLayout {
  frame: Rect;        // sheet units: the paper
  playing: Placement; // while it plays
  inSpot: Placement;  // the sticker's place over the figure's box
}
strokeFrame(ops, place, sheet): Rect          // brush strokes ± half width, the place, margin, clipped
growFrame(frame, box, sheet): Rect            // takes in a fill's box
layoutFor({ frame, place, stage, figure }): TimelapseLayout
figureTransform(layout, place, figure): { x; y; scale }  // origin 0 0: the figure from its spot to its place on the playing sheet
```

`TimelapsePlayerOptions` drops `width` for `stage: { width; height }` (the slide's box, CSS px) and `figure: Rect` (the figure's box in the stage). `TimelapsePlayer` gains `layout(): TimelapseLayout`, valid once `prepare()` resolves.

## Tasks

1. [ ] **Frame and layout** (coordinator): `timelapseFrame.ts` and its test. Commit, then start lanes A and B from it.
2. [ ] **Lane A, the player** (`inkSurface.ts`, `timelapseCrop.ts`, `fillSnapshots.ts`, `timelapsePlayer.ts`, their tests, `testTimelapse.ts`/`testCanvas.ts` helpers):
   - `InkSurface.fill` returns the changed box (device px) or null; `apply` and the engine's caller keep working.
   - Display canvas covers the stage at `min(dpr, MAX_DPR)`; the context transform is `layout.playing` at that density.
   - Prepare: frame from `strokeFrame`; flood each fill, grow by its box; if it grew past the frame snapshots were cut for, flood on (no snapshots), then redo the pass at the final layout. Each fill compares only its changed box mapped onto the display.
   - Tests: a stroke outside the place paints on the display; a fill whose region reaches past the strokes grows the frame and its snapshot covers it; a fill inside prepares in one pass.
3. [ ] **Lane B, the stage and motion** (`useTimelapse.ts`, `TimelapseLayer.tsx`, `timelapse.css`, `sticker-detail.css`, `StickerDetail.tsx`, their tests); the player is injected (`createPlayer`) in tests:
   - The layer covers the slide (`inset: 0`), no silhouette mask; a paper element at `layout.playing` × frame, Canvas, `--r-paper`, the sheet's shadow; the canvas over the whole layer.
   - The hook passes `stage` (slide box) and `figure` (figure's box in it) to the player.
   - Start: paper fades in (160ms); the figure, above the layer, flies spot → `figureTransform` (400ms, `--ease-out` values), then fades out (160ms) as playback starts. No flight when the transform is identity.
   - Playing: figure and gift dot hidden.
   - End: hold `HOLD_MS`; figure fades in at the playing transform (160ms); flies back to identity (520ms, peel curve, overshooting to 1.06 and settling); the layer fades out over the flight; sheen. Identity transform: no flight, the layer fades under the figure (`FADE_MS`).
   - Reduced motion: no flights; at the end the layer fades while the figure fades in, in its spot (`REDUCED_FADE_MS`); no sheen.
   - All motion on the hook's `FrameSource`, so tests drive it; `end()` restores the figure and dot (transform, opacity) synchronously.
   - Tests: figure hidden while playing; lands at identity at the end; stop mid-flight restores it; reduced motion never sets a transform.
4. [ ] **E2E** (coordinator, after A and B merge): `apps/frontend/e2e/timelapse.e2e.ts`, both engines: draw with a mark erased outside the cut, seal, play; while playing the paper's box reaches past the figure's; at the end the figure is in its spot with no transform.
5. [ ] **Verify** (coordinator): `pnpm check`, the e2e spec, then screenshots and a recording at 390×844 and an iPad size, WebKit and Chromium, en and ja, reduced motion; tune margins and timings by eye.
6. [ ] **Merge**: squash to a few commits, merge to main, delete this plan, the spec and the worktree.
