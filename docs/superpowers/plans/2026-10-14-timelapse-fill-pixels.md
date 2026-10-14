# Timelapse v5: store each fill's written pixels

> **For agentic workers:** Use superpowers:executing-plans to implement this task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Make a sealed sticker's timelapse replay its fills from stored pixels instead of re-running the fill algorithm, so changing the fill algorithm later does not change how already-sealed stickers replay.

**Why now / ordering:** This must ship **before** the Fill gap-closing algorithm change in `docs/superpowers/plans/2026-10-13-fill-gap-levels.md`. It is independent of that algorithm and of whatever the new algorithm becomes — a timelapse format/playback change only. It does **not** touch `canvas/fill.ts`'s algorithm, the Fill worker, or anything under `docs/research/`. A fresh agent can execute this without the gap-levels context.

## Background: how the timelapse replays fills today

A sealed sticker's timelapse stores the drawing's **steps** (ops + layer changes), not pixels. Playback reconstructs each fill by **re-running** it:

- `apps/frontend/src/sticker-creation/sealing/timelapse.ts` — `encodeTimelapse`/`decodeTimelapse`. A fill encodes as the tuple `["fill", layer, color, T, x, y, gap, reference]` (seed point, color, gap, reference) under `v: 4`. No pixels. `gzipTimelapse` gzips it for upload.
- `apps/frontend/src/sticker-creation/DrawingScreen.tsx` builds it at seal: `gzipTimelapse(encodeTimelapse({ ...drawn, frame, place }))`.
- `apps/frontend/src/sticker-board/timelapse/fillSnapshots.ts` — `prepareFillSnapshots` rebuilds a fresh `LayerInk` and calls `sheet.flood(op, state)` for every fill, then `releaseFill(op)` ("Preparation never needs its undo replay data"). So playback re-floods with whatever algorithm is installed, under `PREPARE_TIMEOUT_MS` (30 s).

Consequence: once the fill algorithm changes, every already-sealed sticker's timelapse replays differently than it was drawn.

The pixels already exist in the engine but aren't persisted:

- `canvas/fill.ts` — `WrittenFill { box, spans, colors }` run-length encoded: `spans` = `y, x0, x1` (end-exclusive) triples in sheet px; `colors` = `count, RGBA` pairs over those pixels in order. `recordFill(after, at, found)` produces it; `replayFill(target, at, written)` paints it back. Undo uses this today.
- `layers/layerInk.ts` — `flood(op, state)` stores each fill's `WrittenFill` in a private `fills` WeakMap (`fills.set(op, result.written)`); `releaseFill(op)` drops it.

## The change

1. **Format v5** (`packages/db/src/timelapseFormat.ts`): add `timelapseV5Schema` with `v: 5`; the fill tuple gains a trailing pixels payload or `null`: `["fill", layer, color, T, x, y, gap, reference, pixels]`, where `pixels = [boxX, boxY, boxW, boxH, spans[], colors[]]` in sheet px as plain `number[]` (reconstruct `Uint32Array` on decode). Extend `normalizeTimelapse` so v1–v4 upgrade to v5 with `pixels = null` on every fill.
2. **Seal capture** (`sealing/timelapse.ts` + caller): `encodeTimelapse` records each fill's `WrittenFill`, captured with a single pass over the steps through a `LayerInk` using the **current** algorithm (mirror `prepareFillSnapshots`'s first pass so a `"visible"` reference reads the other layers correctly), reading each fill's `result.written`. Do **not** rely on the live undo `fills` map — `releaseFill` may have dropped older fills. Add a public `LayerInk` accessor for a fill's `WrittenFill` (or have `flood` return it).
3. **Playback** (`sticker-board/timelapse/fillSnapshots.ts`): when a decoded fill has stored pixels, paint them with `replayFill` instead of `sheet.flood`; when it has none (upgraded v4, or dropped by the cap), re-flood as today. `decodeTimelapse` surfaces the pixels alongside steps (recommend a parallel `(WrittenFill | null)[]` aligned to fill steps in order).
4. **Size cap**: the seal upload is capped at `MAX_TIMELAPSE_BYTES = 2 * 1024 * 1024` gzipped (`apps/api/src/stickers/timelapseLimit.ts`, enforced in `sealForm.ts`). Flat fills RLE to almost nothing, but the over-cap policy must be defined (see Open decision).

## Scope boundaries

- **Sealed timelapse only.** The kept-session store (`session/keptSession.ts`, IndexedDB v3, steps only) is **unchanged**: a recovered in-progress drawing re-floods with the installed algorithm. Accepted.
- **Pre-v5 sealed stickers re-flood.** Their stored timelapses hold no pixels and can't be recovered without the old algorithm. Accepted.
- Does not touch the fill algorithm, the Fill worker, or anything under `docs/research/`.

## Migration / compatibility

- `normalizeTimelapse` upgrades stored v1–v4 to v5 with null pixels → playback re-floods (today's behavior). The server already normalizes on read (`apps/api/src/stickers/timelapse.ts`); keep that path.
- New seals write v5 with pixels. After the later algorithm change, v5 stickers replay their frozen pixels; only pre-v5 stickers shift. Shipping v5 first bounds the shift to the accepted set.

## Tasks

### Task 1: Format v5 + migration

**Files:** `packages/db/src/timelapseFormat.ts` + tests; `apps/api/src/stickers/timelapse.ts`, `testTimelapses.ts`, `testPngs.ts`.

- [ ] Add `timelapseV5Schema` and the v5 type; fill tuple gains the pixels payload or null.
- [ ] Extend `normalizeTimelapse` to upgrade v1–v4 → v5 with null pixels; keep existing upgrades chaining in.
- [ ] Tests: round-trip a v5 fill with pixels; a v4 timelapse normalizes to v5 with null pixels; the schema rejects malformed pixels.

### Task 2: Encode pixels at seal

**Files:** `sticker-creation/sealing/timelapse.ts` + `.test.ts`; `layers/layerInk.ts` + `.test.ts`; `DrawingScreen.tsx`.

- [ ] Add a public `LayerInk` accessor for a fill's `WrittenFill`.
- [ ] `encodeTimelapse` captures each fill's pixels via a current-algorithm pass over the steps; bump `v: 5`.
- [ ] Tests: encoded v5 fills carry the same pixels `recordFill` produced; a fill that changed nothing stores null; `decodeTimelapse` reconstructs `WrittenFill` exactly (Uint32Array round-trip).

### Task 3: Replay from stored pixels

**Files:** `sticker-board/timelapse/fillSnapshots.ts` + `.test.ts`; `timelapsePlayer.test.ts`.

- [ ] `decodeTimelapse` surfaces per-fill pixels; `prepareFillSnapshots` uses `replayFill` when present, re-floods when null.
- [ ] Test that playback uses the stored pixels, not the algorithm: give a v5 fill stored pixels that differ from what re-flooding would produce, and assert the reveal matches the stored pixels. (This is the test that goes red if playback silently re-floods.)
- [ ] Test the v4/null fallback still re-floods and matches today.

### Task 4: Over-cap policy

**Files:** `sealing/timelapse.ts` (shared with Task 2).

- [ ] Implement the chosen policy (Open decision). Never fail the seal, never silently drop — log which fills fell back.
- [ ] Test: a timelapse whose pixels would exceed the cap drops the largest fills to re-flood, stays under cap, logs it, and still seals.

## Verification

```sh
pnpm --filter @drawing-app/db test
pnpm --filter frontend test -- src/sticker-creation/sealing/timelapse.test.ts src/sticker-creation/layers/layerInk.test.ts src/sticker-board/timelapse/fillSnapshots.test.ts src/sticker-board/timelapse/timelapsePlayer.test.ts
pnpm --filter frontend typecheck && pnpm --filter frontend lint
pnpm --filter frontend test:e2e -- fillHistory.e2e.ts
```

## Open decision (needs sign-off)

**Over-cap policy.** Stored pixels add bytes under the 2 MiB gzipped cap. Flat fills RLE to almost nothing, so this rarely bites, but it must be defined. Recommendation: pixels are best-effort — encode them, and if the gzipped v5 would exceed `MAX_TIMELAPSE_BYTES`, drop stored pixels from the largest fills first (those re-flood on playback) until under cap, logging each drop. The seal always succeeds; re-flood is the graceful fallback. Alternative (not recommended): raise the cap, which grows every sealed sticker's stored timelapse and its upload.

When implemented and merged, remove this completed plan per the project's post-merge instructions.
