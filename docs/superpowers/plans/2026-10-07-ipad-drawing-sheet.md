# iPad Drawing Sheet Implementation Plan

> **On hold (2026-10-08):** being reworked with its spec; don't build from it. Its scratch paths under `~/.cache` are out of date: a task's scratch goes in its worktree's gitignored `data/scratch/`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A drawing keeps one sheet for its whole life, measured in sheet units and shown scaled to fit, so turning the iPad or resizing its window never moves, hides or drops a stroke, and a sticker comes out the same from any device.

**Architecture:** `canvas/sheetFrame.ts` picks a drawing's frame (its size in units, and its ink's density) from the area the sheet has. The ink engine holds the frame: a blank sheet's frame follows its area, and from the first mark it's fixed, so the ink canvas is never resized or replayed while a drawing has marks. The engine maps pointers through the paper's on-screen scale; `DrawingCanvas` sizes the paper to fit its area. The kept drawing stores its frame beside its steps. Sealing measures the die-cut border in units through the frame's density, and the timelapse records the frame.

**Tech Stack:** React 19, TypeScript, Canvas 2D, IndexedDB, vitest + happy-dom + fake-indexeddb, Playwright (WebKit and Chromium) for the browser checks.

**Spec:** `docs/superpowers/specs/2026-10-07-ipad-layout-design.md`, decision 4 and section 6. This plan owns the size ghost's scale; the Pencil plan's hover ring reads `sheetScale`.

**Depends on:** `2026-10-07-ipad-foundations.md`, merged first (the spec's build order). This plan reads none of its code, but branches from main after it, so its edits are in the base: `DrawingScreen.test.tsx`, which Tasks 4 and 5 edit, reads `seal.failed.onThisDevice` (no longer `onThisPhone`). **Runs beside** the board plan and `2026-10-07-ipad-explore-and-dialogs.md`. That plan's Task 11 also edits `DrawingScreen.tsx`, one prop on `<SealCeremony>` (`measureSheet={sheetBox}`), and counts on `sheetBox()` still returning `.ink-sheet`'s box on screen; whichever lands second rebases over the other. **Needed by:** `2026-10-07-ipad-drawing-screen-and-pencil.md`, which reads `DrawingCanvasHandle.frame()` and `screenToSheet()` and wraps `DrawingCanvas` in its own area.

---

## Decisions (awaiting ad0ll's sign-off)

**4. One sheet for every device,** as the spec has it: a 374-unit short side; the long side following the screen's shape at the drawing's first mark (1 to 2.2 times the short side), a blank sheet following its area until then; shown scaled to fit, so turning or resizing only rescales; strokes, brush sizes, Smoothing, the fill's reach and tap slop, the speed-to-width model and the die-cut border (23 units) in sheet units, the multi-finger tap recognizer in CSS px; the ink's resolution fixed per drawing, matched to the screen and capped at about 4 MP, so a small iPad drawing keeps more pixels until its cut reaches the 640 px cap; fills replaying at their recorded density; drawings already kept opening as drawn on the device's own sheet.

The choices this plan makes inside it:

- **4a. Density:** the screen's own at the size the sheet is shown (fit scale × `devicePixelRatio`, that capped at `MAX_DPR` 3), never coarser than a 390 px phone's sheet on the same screen, held under `MAX_INK_PIXELS`, and kept to the thousandth so the timelapse replays fills on the same pixels. A window enlarged after the first mark shows the ink scaled up, softer; it's never re-rendered.
- **4b. Units or screen px:** `CANCEL_KEEPS`, the lazy brush's catch-up and the point spacing are in units too; the paused sheet's `BLOCKED_DRAG` stays in CSS px with the tap recognizer, which gets a stroke's reach converted to CSS px. The width factor's shape stays as it is: decision 19's pressure choices change it in the Pencil plan.
- **4c. The size rail still says "px".** A unit is a 390 px phone's px, as canvas px are in drawing apps, so "7px" means the same brush everywhere. Its ghost shows the brush at the size it draws on screen. `sizePx` keeps its name.
- **4d. The die-cut's measuring grid** (512 cells on the ink's long side), the full-bleed and three-edge square cuts, the 640 px cut cap and the flat sheet's 1100 px cap stay: they're shares of the sheet or caps on pixels. Sealing never upsamples past the ink's own resolution.
- **4e. The kept frame sits in IndexedDB beside the steps** (the progress store, key 1), written in each save's transaction, so a frame never outlives its steps. A drawing kept before this change has none: it opens with its area as its frame at scale 1, and its next save keeps that frame.
- **4f. The player floods a fill at its recorded density,** up to the most any sheet that size was backed at: `MAX_DPR` for stickers sealed before this change, `maxInkDensity` after.
- **4g. The paper's CSS size comes from `fitScale`,** set by `DrawingCanvas` each time its area is measured; the area's grid centers it. One formula sizes the paper, the size ghost and `screenToSheet`.

**What each screen gets** (`frameFor` run over each screen's sheet area: the viewport less the sheet's margins and the tucked tabs, as the drawing lane measured for the 390 px phone and the iPads, and taken the same way for the others; "Today" is the lane's measured ink canvas, and for the 430 and 375 px phones and LINE's sheet, today's sizing worked out):

| Screen (CSS px, density)       | Frame (units)     | Scale         | Ink density   | Ink pixels     | Today          |
| ------------------------------ | ----------------- | ------------- | ------------- | -------------- | -------------- |
| Phone 390×844 @3               | 374×772           | 1             | 3             | 2.60 MP        | 2.60 MP        |
| Phone 430×932 @3               | 374×777           | 1.107         | 3.32          | 3.20 MP        | 3.20 MP        |
| Phone 375×667 @2               | 374×620           | 0.96          | 2             | 0.93 MP        | 0.85 MP        |
| LINE's sheet 540×620 @2        | 374×391           | 1.401         | 2.802         | 1.15 MP        | 1.15 MP        |
| iPad mini 744×1133 / 1133×744  | 374×545 / 622×374 | 1.947 / 1.796 | 3.893 / 3.591 | 3.09 / 3.00 MP | same           |
| iPad 11" 820×1180 / 1180×820   | 374×515 / 582×374 | 2.15 / 2.0    | 4.299 / 4     | 3.56 / 3.48 MP | same           |
| iPad 13" 1032×1376 / 1376×1032 | 374×480 / 530×374 | 2.717 / 2.566 | 4.836 / 4.603 | 4.20 / 4.20 MP | 5.30 / 5.22 MP |

**Memory:** one ink canvas at the frame's resolution plus at most 4 History snapshots, as today. Only the 13-inch iPad changes: 16.8 MB a copy and 84 MB with 4 snapshots, from 21.2 MB and 106 MB (arithmetic at 4 bytes a pixel). Its whole-sheet fill and seal transients shrink in the same proportion, to about four-fifths.

## Files

- Create `apps/frontend/src/sticker-creation/canvas/sheetFrame.ts`, `sheetFrame.test.ts`
- Modify `apps/frontend/src/sticker-creation/canvas/`: `inkSurface.ts` (`setFrame` replaces `resize`; `MAX_DPR` moves to `sheetFrame.ts`), `inkEngine.ts` and its test (the frame, `fit`, `screenToSheet`, mapping; `resized()` goes), `DrawingCanvas.tsx`, `DrawingCanvas.css` (`.ink-area`, the paper fitted in it), and comments in `brush.ts`, `lazyBrush.ts`, `ops.ts`, `gestures.ts`
- Modify `apps/frontend/src/sticker-creation/session/keptSession.ts` and its test
- Modify `apps/frontend/src/sticker-creation/sealing/`: `dieCut.ts` (`BORDER_UNITS`, the border in ink px) and its test, `stickerLayers.test.ts`, `cutSticker.ts` (`cutInk`), create `cutSticker.test.ts`, `sealWorker.ts`, `makeSticker.ts` and its test, `timelapse.ts` and its test
- Modify `apps/frontend/src/sticker-creation/DrawingScreen.tsx` and `tools/SizeRail.tsx`, and their tests
- Modify `apps/frontend/src/sticker-board/timelapse/`: `timelapseCrop.ts`, `fillSnapshots.ts`, `timelapsePlayer.ts`, and the tests of the first and last
- Modify `apps/api/src/stickers/timelapse.ts` (comments: the format's lengths are sheet units)
- Modify `DESIGN.md`'s Draw screen: the size rail's number, and the sheet. No PRODUCT.md sentence becomes false.

Checked, unchanged: the paused hint and the timer's notes (`TimerDot`) and the seal key's first-visit chip sit by their own controls, in CSS px; the seal ceremony places the cut through `.ink-sheet`'s box over `inkWidth`, and `.ink-sheet` stays the paper; `history.ts` keeps `invalidate()` for a frame change on a blank sheet or a drawing kept without a frame; `fill.ts`, `paintStroke.ts` and `stickerLayers.ts` work in pixels or units already.

Beyond the spec's shared names, `sheetFrame.ts` also exports `SheetArea` (the area, CSS px), `maxInkDensity`, `areaFrame` and `MAX_DPR`, and `DrawingCanvas` takes `onFit(scale)`.

## Setup

- [ ] Once the foundations plan is on main, from the main checkout: `git fetch`, then `git worktree add -b feat/ipad-drawing-sheet .claude/worktrees/ipad-drawing-sheet origin/main`, and `pnpm install` in the worktree. Every command below runs from the worktree root. Scratch (scripts, screenshots) goes in `~/.cache/drawing-app-ipad-sheet/`, never in the repo.

### Task 1: The sheet's frame

**Files:** Create `apps/frontend/src/sticker-creation/canvas/sheetFrame.ts`, `sheetFrame.test.ts`; modify `canvas/inkSurface.ts`, `apps/frontend/src/sticker-board/timelapse/timelapseCrop.ts`, `timelapsePlayer.ts`, `timelapseCrop.test.ts`, `timelapsePlayer.test.ts`

- [ ] **Step 1: Write the failing test,** `canvas/sheetFrame.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  areaFrame,
  fitScale,
  frameFor,
  MAX_DPR,
  MAX_INK_PIXELS,
  MAX_SHEET_ASPECT,
  maxInkDensity,
  SHEET_SHORT_UNITS,
  type SheetArea,
  type SheetFrame,
} from "./sheetFrame";

/** The sheet's room on a 390 px phone, and on an 11-inch and a 13-inch iPad in portrait, CSS px. */
const PHONE: SheetArea = { width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 };
const IPAD_11: SheetArea = { width: 804, height: 1108 };
const IPAD_13: SheetArea = { width: 1016, height: 1304 };
const turned = ({ width, height }: SheetArea): SheetArea => ({ width: height, height: width });

const longOverShort = ({ w, h }: SheetFrame) => Math.max(w, h) / Math.min(w, h);
const backing = ({ w, h, density }: SheetFrame) => w * density * h * density;

describe("frameFor", () => {
  it("is a 390 px phone's own sheet, shown at scale 1 at the phone's density", () => {
    const frame = frameFor(PHONE, MAX_DPR);
    expect(frame).toEqual({ w: PHONE.width, h: PHONE.height, density: MAX_DPR });
    expect(fitScale(frame, PHONE)).toBe(1);
  });

  it("keeps the short side and gives the long side the area's shape, up to the widest the sheet goes", () => {
    for (const area of [IPAD_11, turned(IPAD_11), { width: 300, height: 300 * 4 }]) {
      const frame = frameFor(area, 2);
      expect(Math.min(frame.w, frame.h)).toBe(SHEET_SHORT_UNITS);
      expect(frame.h >= frame.w).toBe(area.height >= area.width);
      const shape = Math.max(area.width, area.height) / Math.min(area.width, area.height);
      expect(longOverShort(frame)).toBeCloseTo(Math.min(shape, MAX_SHEET_ASPECT), 2);
    }
  });

  it("backs the ink at the screen's density as the sheet is shown, within MAX_INK_PIXELS", () => {
    const shown = frameFor(IPAD_11, 2);
    expect(shown.density).toBeCloseTo(fitScale(shown, IPAD_11) * 2, 2);
    expect(backing(shown)).toBeLessThan(MAX_INK_PIXELS);

    const big = frameFor(IPAD_13, 2);
    expect(big.density).toBe(maxInkDensity(big));
    expect(big.density).toBeLessThan(fitScale(big, IPAD_13) * 2);
    expect(backing(big)).toBeLessThanOrEqual(MAX_INK_PIXELS);
  });

  it("never backs a sheet shown small coarser than a phone's sheet, nor past MAX_DPR", () => {
    const small = { width: SHEET_SHORT_UNITS / 2, height: SHEET_SHORT_UNITS };
    expect(fitScale(frameFor(small, 2), small)).toBeLessThan(1);
    expect(frameFor(small, 2).density).toBe(2);
    expect(frameFor(PHONE, MAX_DPR + 1).density).toBe(MAX_DPR);
  });
});

describe("fitScale", () => {
  it("shows the whole sheet as large as the area holds", () => {
    for (const area of [PHONE, IPAD_11, turned(IPAD_11), turned(IPAD_13)]) {
      const frame = frameFor(IPAD_11, 2);
      const scale = fitScale(frame, area);
      // How much of the area's width and height the sheet takes: all of one, no more of the other.
      const taken = [(frame.w * scale) / area.width, (frame.h * scale) / area.height];
      expect(Math.max(...taken)).toBeCloseTo(1, 9);
      expect(Math.min(...taken)).toBeLessThanOrEqual(1);
    }
  });
});

describe("areaFrame", () => {
  it("takes the area itself as the sheet, at scale 1, at the screen's density", () => {
    const area = { width: 1163.53, height: 747.5 };
    const frame = areaFrame(area, 2);
    expect(fitScale(frame, area)).toBeCloseTo(1, 3);
    expect(frame.density).toBe(2);
  });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/sheetFrame.test.ts` → fails: `Failed to resolve import "./sheetFrame"`.
- [ ] **Step 3: Create `canvas/sheetFrame.ts`:**

```ts
/**
 * The sheet a drawing is drawn on: its size in sheet units, fixed for the life of the drawing,
 * and the density its ink is backed at. A unit is a CSS px on a 390 px phone's sheet. Every
 * screen shows the sheet scaled to fit, so a sticker comes out the same from any device, and
 * turning the screen or resizing the window only rescales it.
 */
import { clamp } from "../../ui/easing";

/** The sheet's short side, in units: the sheet on a 390 px phone. */
export const SHEET_SHORT_UNITS = 374;
/** The long side follows the area's shape as the drawing starts, between these times the short. */
export const MIN_SHEET_ASPECT = 1;
export const MAX_SHEET_ASPECT = 2.2;
/** The most device px the ink is backed with: a bigger screen gets softer ink, not more memory. */
export const MAX_INK_PIXELS = 4_200_000;
/** Past this many device px per CSS px, a sharper canvas costs memory and shows nothing more. */
export const MAX_DPR = 3;

/** A sheet's size in units, and the device px its ink holds per unit. */
export type SheetFrame = { w: number; h: number; density: number };

/** The room the sheet has on screen, in CSS px. */
export type SheetArea = { width: number; height: number };

type Size = Pick<SheetFrame, "w" | "h">;

/** Densities are kept to the thousandth, as the timelapse records them, so replays flood alike. */
const thousandthBelow = (n: number) => Math.floor(n * 1000) / 1000;
/** Sizes are kept to the tenth, as the timelapse records them. */
const tenth = (n: number) => Math.round(n * 10) / 10;

/** CSS px per unit, with the sheet shown as large as it fits in the area. */
export const fitScale = (frame: Size, area: SheetArea) =>
  Math.min(area.width / frame.w, area.height / frame.h);

/** The densest a sheet this size is backed at, held under MAX_INK_PIXELS. */
export const maxInkDensity = ({ w, h }: Size) =>
  thousandthBelow(Math.sqrt(MAX_INK_PIXELS / (w * h)));

/**
 * Device px per unit for a sheet shown in this area: the screen's own at the size it's shown, never
 * coarser than a phone's sheet on the same screen, and held under MAX_INK_PIXELS.
 */
function densityFor(size: Size, area: SheetArea, devicePixelRatio: number): number {
  const shown = Math.max(1, fitScale(size, area)) * Math.min(devicePixelRatio || 1, MAX_DPR);
  return Math.min(thousandthBelow(shown), maxInkDensity(size));
}

/** A new drawing's frame: SHEET_SHORT_UNITS on its short side, the area's shape on its long. */
export function frameFor(area: SheetArea, devicePixelRatio: number): SheetFrame {
  const long = Math.max(area.width, area.height);
  const short = Math.min(area.width, area.height);
  const aspect = clamp(long / short, MIN_SHEET_ASPECT, MAX_SHEET_ASPECT);
  const longUnits = Math.round(SHEET_SHORT_UNITS * aspect);
  const size =
    area.height >= area.width
      ? { w: SHEET_SHORT_UNITS, h: longUnits }
      : { w: longUnits, h: SHEET_SHORT_UNITS };
  return { ...size, density: densityFor(size, area, devicePixelRatio) };
}

/**
 * The area itself as a frame, shown at scale 1: the sheet a drawing kept without a frame was drawn
 * on, its ops in that sheet's CSS px.
 */
export function areaFrame(area: SheetArea, devicePixelRatio: number): SheetFrame {
  const size = { w: tenth(area.width), h: tenth(area.height) };
  return { ...size, density: densityFor(size, area, devicePixelRatio) };
}
```

- [ ] **Step 4: `MAX_DPR` moves to `sheetFrame.ts`.** In `canvas/inkSurface.ts`, delete `/** Past this density a sharper canvas costs memory and shows nothing more. */ export const MAX_DPR = 3;` and add `import { MAX_DPR } from "./sheetFrame";` (its `resize` uses it until Task 2). In `sticker-board/timelapse/timelapseCrop.ts`, `timelapsePlayer.ts` and `timelapseCrop.test.ts`, `import { MAX_DPR } from "../../sticker-creation/canvas/inkSurface";` becomes `import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";`. In `timelapsePlayer.test.ts`, `import { InkSurface, MAX_DPR } from "../../sticker-creation/canvas/inkSurface";` becomes `import { InkSurface } from "../../sticker-creation/canvas/inkSurface";`, with `import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";` after the `paintStroke` import.
- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/sheetFrame.test.ts src/sticker-board/timelapse` and `pnpm -C apps/frontend typecheck` → pass (sheetFrame: 6 tests).
- [ ] **Step 6:** Commit: `feat(frontend): the drawing sheet's frame, in sheet units, with its fit and ink density`

### Task 2: One frame per drawing, the paper scaled to fit

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/inkSurface.ts`, `inkEngine.ts`, `inkEngine.test.ts`, `DrawingCanvas.tsx`, `DrawingCanvas.css`, `brush.ts`, `lazyBrush.ts`, `ops.ts`, `gestures.ts`; `apps/frontend/src/sticker-board/timelapse/fillSnapshots.ts`

`DrawingScreen` doesn't change here: until Task 4, every kept drawing loads as one kept without a frame, which is what it does today.

- [ ] **Step 1: Write the failing tests,** in `canvas/inkEngine.test.ts`:

The file runs in happy-dom (the mapping test attaches the engine to an element), and imports the frame's names. Its head becomes:

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { InkEngine, type InkLayer, type InkSettings, type PointerInput } from "./inkEngine";
import { STRIDE, type FillOp, type Op, type StrokeOp } from "./ops";
import {
  areaFrame,
  frameFor,
  SHEET_SHORT_UNITS,
  type SheetArea,
  type SheetFrame,
} from "./sheetFrame";
```

`FakeLayer` counts frames and rebuilds: after `paints = 0;` add the block below, and `restore() {}` becomes `restore() { this.restores++; }`:

```ts
  /** Every frame the ink was sized to, and how often it was blanked to be rebuilt. */
  frames: SheetFrame[] = [];
  restores = 0;
  setFrame(frame: SheetFrame) {
    this.frames.push(frame);
    return true;
  }
```

Before `const SETTINGS`:

```ts
/** The sheet's room on screen: a sheet that fits it exactly shows at scale 1. */
const AREA: SheetArea = { width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 };
/** The same room with the screen turned. */
const TURNED: SheetArea = { width: AREA.height, height: AREA.width };
/** A stroke kept from before a reload. */
const KEPT: StrokeOp = { tool: "brush", color: "#1C1824", pts: [10, 10, 7, 0], T: 0 };
```

In `setup()`, right after the engine is made, `engine.fit(AREA, 1);`. The frame-running lines in `stroke`'s loop (`const run = frame; frame = null; run?.();`) become one call, `runFrame();`, of this helper, defined before `stroke`; and after `stroke`, a `trace` that lands on exact points:

```ts
/** Runs the animation frame the engine asked for, if it asked. */
const runFrame = () => {
  const run = frame;
  frame = null;
  run?.();
};

/** A pointer landing on the first point, through the rest 16ms apart, lifting on the last. */
const trace = (pointerType: string, id: number, points: [number, number][]) => {
  points.forEach(([x, y], i) => {
    const sample = at(pointerType, id, x, y, i * 16);
    if (i === 0) engine.down(sample);
    else {
      engine.move(sample);
      runFrame();
    }
  });
  const [x, y] = points[points.length - 1];
  engine.up(at(pointerType, id, x, y, points.length * 16));
};
```

`setup()` returns `trace` too: `return { engine, layer, events, at, trace, stroke, tap, committed };`. After `setup()`:

```ts
/** The engine's frame, which every sheet here has from the start. */
function framed(engine: InkEngine): SheetFrame {
  const { frame } = engine;
  if (!frame) throw new Error("The sheet has no frame");
  return frame;
}

/** Paper at `left`, `top`, `scale` CSS px to the unit, as the drawing screen shows it. */
function paperAt(frame: SheetFrame, left: number, top: number, scale: number) {
  const paper = document.createElement("div");
  paper.getBoundingClientRect = () => new DOMRect(left, top, frame.w * scale, frame.h * scale);
  return paper;
}
```

At the end of `describe("InkEngine")`:

```ts
it("measures a stroke in sheet units, whatever size the sheet is shown at", () => {
  /** A pen stroke along the same units, on paper shown `scale` CSS px to the unit. */
  const drawnAt = (scale: number) => {
    const { engine, trace, committed } = setup();
    const [left, top] = [30, 40];
    const detach = engine.attach(paperAt(framed(engine), left, top, scale));
    trace(
      "pen",
      1,
      Array.from({ length: 11 }, (_, i) => [left + (20 + 10 * i) * scale, top + 50 * scale]),
    );
    detach();
    return committed();
  };
  const ops = drawnAt(1);
  expect(ops.map(lastPoint)).toEqual([[120, 50]]);
  expect(drawnAt(2.5)).toEqual(ops);
});

it("lets a blank sheet's frame follow its area until the first mark, and again after a reset", () => {
  const { engine, stroke } = setup();
  engine.fit(TURNED, 1);
  expect(engine.frame).toEqual(frameFor(TURNED, 1));
  stroke("mouse", 1, [0, 0], [100, 0]);
  engine.fit(AREA, 1);
  expect(engine.frame).toEqual(frameFor(TURNED, 1));
  engine.reset();
  engine.fit(AREA, 1);
  expect(engine.frame).toEqual(frameFor(AREA, 1));
});

it("keeps a drawing's frame through any change of size, so nothing clears or replays", () => {
  const { engine, layer, stroke } = setup();
  stroke("mouse", 1, [0, 0], [100, 0]);
  const frame = engine.frame;
  const [sized, rebuilt] = [layer.frames.length, layer.restores];
  engine.fit(TURNED, 2);
  engine.fit({ width: AREA.width / 2, height: AREA.height / 2 }, 1);
  expect(engine.frame).toBe(frame);
  expect([layer.frames.length, layer.restores]).toEqual([sized, rebuilt]);
  expect(engine.ops).toHaveLength(1);
});

it("puts a kept drawing back in its own frame, and one kept without a frame in its area", () => {
  const { engine } = setup();
  const own = frameFor(TURNED, 2);
  engine.load([KEPT], own);
  engine.fit(AREA, 1);
  expect(engine.frame).toBe(own);

  const area = { width: AREA.width * 1.5, height: AREA.height };
  engine.load([KEPT], null);
  engine.fit(area, 2);
  engine.fit(AREA, 1);
  expect(engine.frame).toEqual(areaFrame(area, 2));
  expect(engine.ops).toEqual([KEPT]);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas/inkEngine.test.ts` → every test fails: `engine.fit is not a function`.
- [ ] **Step 3: The surface.** In `canvas/inkSurface.ts`, Task 1's `import { MAX_DPR } from "./sheetFrame";` becomes `import type { SheetFrame } from "./sheetFrame";`. `FILL_NEAR`'s comment starts "Sheet units on a side of the square a fill reads first", and the class comment says "drawn in sheet units and backed at its frame's density" for "drawn in sheet pixels and backed at the screen's density". `density`'s comment becomes `/** Device pixels per sheet unit. */`, and `resize` gives way to:

```ts
  /** Sizes the canvas to the frame, which clears it; says whether its size changed. */
  setFrame({ w, h, density }: SheetFrame): boolean {
    const width = Math.max(1, Math.round(w * density));
    const height = Math.max(1, Math.round(h * density));
    if (width === this.canvas.width && height === this.canvas.height && density === this.dpr)
      return false;
    this.dpr = density;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.setTransform(density, 0, 0, density, 0, 0);
    return true;
  }
```

`sticker-board/timelapse/fillSnapshots.ts`: `sheet.resize(ink.width, ink.height, density);` becomes `sheet.setFrame({ w: ink.width, h: ink.height, density });`, and `PrepareInput`'s comments say "in sheet units" and "Device px per sheet unit" where they say "sheet px" and "per sheet px".

- [ ] **Step 4: The engine.** In `canvas/inkEngine.ts`:

1. After the `./ops` import: `import { areaFrame, frameFor, type SheetArea, type SheetFrame } from "./sheetFrame";`. The first three constants' comments become:

```ts
/** A fill takes a tap: a pointer that lifts within this many sheet units of where it landed. */
const TAP_SLOP = 10;
/** A touch on a paused sheet that drags this many CSS px gets the paused hint before it lifts. */
const BLOCKED_DRAG = 8;
/** When the browser takes a pointer mid-stroke, the stroke stays if it had gone this many units. */
const CANCEL_KEEPS = 4;
```

2. `InkLayer` gains, first: `/** Sizes the ink to a frame, which clears it; says whether its size changed. */ setFrame: (frame: SheetFrame) => boolean;`. In `InkSettings`, `size` and `lazyRadius` say "in sheet units" for "in px", as does `LiveStroke.moved`.
3. Before `export type RequestFrame`:

```ts
/** Where the sheet's paper is on screen, in CSS px. */
interface PaperRect {
  left: number;
  top: number;
  width: number;
}
```

4. The class comment gains a paragraph after its first:

```ts
 * Ink is in sheet units: a pointer's offset on the paper over the CSS px a unit spans there. The
 * sheet's frame follows its area while the sheet is blank, and is fixed from the first mark.
```

5. `fillTap` loses `cx` and `cy`: `private fillTap: { id: number; x: number; y: number } | null = null;`. `locate` and `origin` give way to:

```ts
  /** The sheet's frame; null until its area is first measured. */
  private sheet: SheetFrame | null = null;
  /**
   * How the frame is decided at the next measure: it follows the area while the sheet is blank,
   * takes the area itself for a drawing kept without one, and stays once the drawing has marks.
   */
  private frameRule: "follows" | "area" | "fixed" = "follows";
  private locate: () => PaperRect = () => ({ left: 0, top: 0, width: this.sheet?.w ?? 1 });
  /** Where the paper was and how many CSS px a unit spanned there, as the pointer landed. */
  private origin = { left: 0, top: 0, scale: 1 };
```

6. In `down()`: the first guard becomes `if (s.locked || !this.sheet || (pointerType === "mouse" && e.button !== 0)) return;`. The tap recognizer's call becomes:

```ts
// The tap recognizer judges fingers on the glass, so the stroke's reach goes to it in CSS px.
const result = this.taps.down(
  id,
  e.clientX,
  e.clientY,
  e.timeStamp,
  stroke ? { age: e.timeStamp - stroke.t0, moved: stroke.moved * this.origin.scale } : undefined,
);
```

and the lines from `this.origin = this.locate();` to the end of `down()`:

```ts
this.origin = this.place();
const [x, y] = this.toSheet(e);
if (s.tool === "fill") this.fillTap = { id, x, y };
else this.beginStroke(e, x, y);
```

7. `reset()`, `load()` and `resized()` give way to:

```ts
  /** The sheet's size in units and its ink's density; null until its area is first measured. */
  get frame(): SheetFrame | null {
    return this.sheet;
  }

  /**
   * The sheet's area was measured on screen, in CSS px. A blank sheet's frame follows it, and a
   * drawing kept without a frame takes it as its own. A drawing with marks keeps its frame: the
   * paper only rescales, so nothing clears or replays.
   */
  fit(area: SheetArea, devicePixelRatio: number): void {
    if (this.frameRule === "fixed") return;
    if (this.frameRule === "follows") {
      this.useFrame(frameFor(area, devicePixelRatio));
      return;
    }
    this.frameRule = "fixed";
    this.useFrame(areaFrame(area, devicePixelRatio));
  }

  /** Where a point on screen falls on the sheet, in units; null until the sheet has a frame. */
  screenToSheet(clientX: number, clientY: number): [x: number, y: number] | null {
    if (!this.sheet) return null;
    const { left, top, scale } = this.place();
    return [(clientX - left) / scale, (clientY - top) / scale];
  }

  /** A fresh sheet: no ink, nothing to undo or redo, its frame following its area again. */
  reset(): void {
    this.load([], null);
  }

  /**
   * A sheet with these steps on it and nothing to redo, as a drawing picked up after a reload has,
   * in the frame it was drawn in. A drawing kept without a frame takes its area as its frame at the
   * next measure; with no steps, the frame follows the area.
   */
  load(steps: readonly Step[], frame: SheetFrame | null): void {
    this.endStroke(true);
    this.fillTap = null;
    this.blocked = null;
    this.swallowed.clear();
    this.taps.clear();
    if (steps.length === 0) this.frameRule = "follows";
    else if (frame) {
      this.frameRule = "fixed";
      this.useFrame(frame);
    } else this.frameRule = "area";
    this.history.load(steps);
    this.notifyHistory();
  }
```

8. `toSheet` gives way to:

```ts
  /** Sizes the ink to a new frame; sized afresh, it clears, so what was on it goes back on. */
  private useFrame(frame: SheetFrame): void {
    const was = this.sheet;
    if (was?.w === frame.w && was.h === frame.h && was.density === frame.density) return;
    this.sheet = frame;
    if (this.layer.setFrame(frame)) this.history.invalidate();
  }

  /** Where the paper is now, and how many CSS px a unit spans on it. */
  private place(): { left: number; top: number; scale: number } {
    const paper = this.locate();
    return {
      left: paper.left,
      top: paper.top,
      scale: paper.width / (this.sheet?.w ?? paper.width),
    };
  }

  private toSheet(e: PointerInput): [number, number] {
    const { left, top, scale } = this.origin;
    return [(e.clientX - left) / scale, (e.clientY - top) / scale];
  }
```

9. In `lift()`, the fill tap is judged in units:

```ts
const tap = this.fillTap;
if (tap?.id === id) {
  this.fillTap = null;
  const [x, y] = this.toSheet(e);
  if (!cancelled && Math.hypot(x - tap.x, y - tap.y) < TAP_SLOP) this.applyFill(tap.x, tap.y);
  return;
}
```

10. The first mark fixes the frame. `beginStroke` starts, after `const s = this.settings;`, with `// The first mark fixes the frame for the life of the drawing.` and `this.frameRule = "fixed";`. In `applyFill`, after `if (!this.layer.fill(op)) return;`, add `this.frameRule = "fixed";`.

- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/canvas src/sticker-board/timelapse` → pass (inkEngine: 14 tests).
- [ ] **Step 6: `DrawingCanvas.tsx`.** Import `fitScale`, `type SheetArea` and `type SheetFrame` from `"./sheetFrame"`. In `DrawingCanvasHandle`, `reset`'s comment becomes `/** A fresh sheet, with nothing to undo, whose frame follows its area until the first mark. */`, `inkDensity`'s `/** Device pixels per sheet unit: the ink canvas's density. */`, and it ends with:

```ts
  /** The sheet's size in units and its ink's density; null until the sheet first shows. */
  frame: () => SheetFrame | null;
  /** Where a point on screen falls on the sheet, in units; null until the sheet first shows. */
  screenToSheet: (clientX: number, clientY: number) => [x: number, y: number] | null;
```

`Props` stays. The component, from its comment to the end of the file:

```tsx
/**
 * The white sheet and the ink on it, scaled to fit the area the drawing screen gives it. Pointer
 * input goes straight to the ink engine and never through React state; the engine reads the
 * settings as each pointer lands and reports back through the events.
 */
export function DrawingCanvas({ ref, settings, active, ...events }: Props) {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = useRef<{ engine: InkEngine; surface: InkSurface } | null>(null);
  const showing = useRef(active);
  const measureAgain = useRef<(() => void) | null>(null);
  const fitAgain = useRef<(() => void) | null>(null);

  const onHistory = useEffectEvent(events.onHistory);
  const onCommit = useEffectEvent(events.onCommit);
  const onBlocked = useEffectEvent(events.onBlocked);
  const onDismissPanel = useEffectEvent(events.onDismissPanel);
  const onDisarm = useEffectEvent(events.onDisarm);
  const initialSettings = useEffectEvent(() => settings);

  useEffect(() => {
    const area = areaRef.current;
    const sheet = sheetRef.current;
    const canvas = canvasRef.current;
    if (!area || !sheet || !canvas) return;
    const surface = new InkSurface(canvas);
    const engine = new InkEngine(surface, initialSettings(), {
      onHistory: (state) => onHistory(state),
      onCommit: (op) => onCommit(op),
      onBlocked: () => onBlocked(),
      onDismissPanel: () => onDismissPanel(),
      onDisarm: () => onDisarm(),
    });
    ink.current = { engine, surface };
    const detach = engine.attach(sheet);
    /** The area the sheet last had on screen, in CSS px. */
    let shown: SheetArea | null = null;
    // The paper takes its frame's shape, as large as the area holds; the ink's pixels never change.
    const fit = () => {
      if (!shown || !showing.current) return;
      engine.fit(shown, devicePixelRatio);
      const { frame } = engine;
      if (!frame) return;
      const scale = fitScale(frame, shown);
      sheet.style.width = `${frame.w * scale}px`;
      sheet.style.height = `${frame.h * scale}px`;
    };
    fitAgain.current = fit;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Covered, or not laid out yet, the area isn't the one the sheet is drawn in.
      if (!showing.current || width <= 0 || height <= 0) return;
      shown = { width, height };
      fit();
    });
    observer.observe(area);
    // Observing afresh reports the area's size at the next frame, even when it hasn't changed.
    measureAgain.current = () => {
      observer.unobserve(area);
      observer.observe(area);
    };
    return () => {
      observer.disconnect();
      measureAgain.current = null;
      fitAgain.current = null;
      detach();
      engine.dispose();
      ink.current = null;
    };
  }, []);

  // Covered, the area changes height with the tab bar, and a blank sheet's frame follows its area.
  // So the sheet is fitted only while the drawing screen shows, and measures again as it shows.
  useLayoutEffect(() => {
    showing.current = active;
    if (active) measureAgain.current?.();
  }, [active]);

  useLayoutEffect(() => {
    if (ink.current) ink.current.engine.settings = settings;
  });

  useImperativeHandle(
    ref,
    () => ({
      undo: () => ink.current?.engine.undo(),
      redo: () => ink.current?.engine.redo(),
      clear: () => ink.current?.engine.clear(),
      reset: () => {
        ink.current?.engine.reset();
        fitAgain.current?.();
      },
      load: (steps) => {
        ink.current?.engine.load(steps, null);
        fitAgain.current?.();
      },
      ops: () => ink.current?.engine.ops ?? [],
      steps: () => ink.current?.engine.steps ?? [],
      finishStroke: () => ink.current?.engine.finishStroke(),
      inkForReading: () => ink.current?.surface.copyForReading() ?? null,
      inkDensity: () => ink.current?.surface.density ?? 1,
      frame: () => ink.current?.engine.frame ?? null,
      screenToSheet: (x, y) => ink.current?.engine.screenToSheet(x, y) ?? null,
    }),
    [],
  );

  return (
    <div ref={areaRef} className="ink-area">
      <div ref={sheetRef} className="ink-sheet" data-tool={settings.tool}>
        <canvas
          ref={canvasRef}
          className="ink-canvas"
          aria-label={t(($) => $.stickerCreation.canvas)}
        />
      </div>
    </div>
  );
}
```

`DrawingCanvas.css`: the `.ink-sheet` rule's comment and its first two declarations (`position: absolute; inset: 8px 8px 14px;`) give way to an area rule and a paper rule; `.ink-sheet[data-tool="fill"]` and `.ink-canvas` stay:

```css
/* The room the drawing screen gives the sheet, inside thin Liner margins, so a swipe in from the
   screen's edge never starts a stroke. The sheet sits in its middle, scaled to fit. */
.ink-area {
  position: absolute;
  inset: 8px 8px 14px;
  display: grid;
  place-items: center;
}

/* The sheet: white paper in its frame's shape, which DrawingCanvas sizes to fit the area. The ink
   canvas over it is transparent; the paper is this element. */
.ink-sheet {
  position: relative;
  background: var(--canvas);
  border-radius: 3px;
  box-shadow:
    0 0 0 1px rgba(28, 24, 36, 0.05),
    0 1px 2px rgba(28, 24, 36, 0.06),
    1px 3px 10px rgba(28, 24, 36, 0.05);
  touch-action: none;
  cursor: crosshair;
}
```

- [ ] **Step 7: Comments that measured the sheet in px.** `brush.ts`'s `sizePx`:

```ts
/**
 * The size rail's value (0–1) as a width in sheet units, the px the rail shows, squared so the
 * fine sizes get most of the travel.
 */
```

| File                              | Comment becomes                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `brush.ts`, `MIN_STEP`            | `/** Points closer than this many sheet units to the last one add cost and nothing else. */`              |
| `brush.ts`, `StrokeStart.size`    | `/** Width in sheet units. */`                                                                            |
| `brush.ts`, `add`                 | `/** Adds a point unless it's within half a unit of the last one; says whether it did. */`                |
| `lazyBrush.ts`, `lazyRadius`      | `/** How far the brush trails the finger, in sheet units, for Smoothing from 0 (Raw) to 100 (Smooth). */` |
| `lazyBrush.ts`, `CATCH_UP_STEP`   | `/** The lift's catch-up steps are at most this many units apart, so the tail keeps its texture. */`      |
| `ops.ts`, `StrokeOp`              | "One stroke, in sheet pixels." becomes "One stroke, in sheet units."                                      |
| `ops.ts`, `FillOp`                | ``/** A fill seeded at a point in sheet units, `T` ms into the session. */``                              |
| `gestures.ts`, `TAP_SLOP`         | `/** …each having moved less than this many CSS px. */`                                                   |
| `gestures.ts`, `LiveStroke.moved` | `/** CSS px from where it began. */`                                                                      |

- [ ] **Step 8:** `pnpm -C apps/frontend typecheck` and `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board/timelapse` → pass.
- [ ] **Step 9:** Commit: `feat(frontend): a drawing keeps one frame in sheet units, and its paper scales to fit`

### Task 3: The size ghost at the sheet's scale

**Files:** Modify `apps/frontend/src/sticker-creation/canvas/DrawingCanvas.tsx`, `tools/SizeRail.tsx`, `tools/SizeRail.test.tsx`, `DrawingScreen.tsx`

- [ ] **Step 1: Write the failing test.** In `tools/SizeRail.test.tsx`, import `sizePx` from `"../canvas/brush"`; after `const VALUE = 0.5;`:

```ts
/** CSS px per sheet unit, as on an iPad. */
const SCALE = 2;
```

`beforeEach`'s `<SizeRail … />` takes `scale={SCALE}` after `active={false}`. Before "moves the thumb with the finger…":

```tsx
it("shows the ghost at the size the brush draws on the sheet as it's shown", () => {
  const ghost = () => host.querySelector<HTMLElement>(".size-ghost")?.style.getPropertyValue("--d");
  expect(ghost()).toBe(`${sizePx(VALUE) * SCALE}px`);
  dragThumb(205, 180);
  const [[dragged]] = onChange.mock.calls;
  expect(ghost()).toBe(`${sizePx(dragged) * SCALE}px`);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/tools/SizeRail.test.tsx` → the new test fails: `--d` is `sizePx(VALUE)` px, unscaled.
- [ ] **Step 3: Implement.** In `tools/SizeRail.tsx`, `sizeStyle` becomes:

```ts
/**
 * The size as CSS draws it: the thumb's place, the tip's dot, the px label, and the ghost's width,
 * the size the brush draws at on the sheet as it's shown, `scale` CSS px to the unit.
 */
function sizeStyle(value: number, scale: number): CSSProperties {
  const px = sizePx(value);
  return {
    "--v": value,
    "--d": `${px * scale}px`,
    "--tip": `${Math.min(24, Math.max(5, px))}px`,
    "--px": Math.round(px),
  };
}
```

`Props` gains, after `active`: `/** How many CSS px a sheet unit spans on screen. */ scale: number;`. The component takes `scale` (`{ value, eraser, active, scale, onChange, onHold }`), and both `sizeStyle(dragged.current)` and `sizeStyle(value)` pass `scale` second. Its comment becomes:

```ts
/**
 * The size rail: a groove down the left edge, a thumb that is the brush tip itself, and the size
 * in sheet units, shown as px, at its foot. While a finger is on it, a ghost of the tip shows
 * mid-sheet at the size it draws. Only the thumb takes a finger, so a stroke beside it is a stroke.
 */
```

- [ ] **Step 4: The scale reaches the rail.** In `canvas/DrawingCanvas.tsx`, `Props` gains, after `active`: `/** The sheet was fitted to its area: how many CSS px a sheet unit spans on screen now. */ onFit: (scale: number) => void;`. Beside the other effect events: `const onFit = useEffectEvent(events.onFit);`. In `fit`, after the two style lines: `onFit(scale);`. In `DrawingScreen.tsx`, after `const [sizing, setSizing] = useState(false);`:

```ts
// How many CSS px a sheet unit spans on screen: the size rail's ghost shows the brush at it.
const [sheetScale, setSheetScale] = useState(1);
```

`<DrawingCanvas … />` takes `onFit={setSheetScale}` after `onDisarm`, and `<SizeRail … />` takes `scale={sheetScale}` after `active={sizing}`.

- [ ] **Step 5:** `pnpm -C apps/frontend typecheck`, then `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/tools src/sticker-creation/DrawingScreen.test.tsx` → pass.
- [ ] **Step 6:** Commit: `feat(frontend): the size rail's ghost shows the brush at its size on the sheet`

### Task 4: The kept drawing keeps its frame

**Files:** Modify `apps/frontend/src/sticker-creation/session/keptSession.ts`, `keptSession.test.ts`, `canvas/DrawingCanvas.tsx`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`

- [ ] **Step 1: Write the failing test.** In `session/keptSession.test.ts`, import `frameFor`, `SHEET_SHORT_UNITS` and `type SheetFrame` from `"../canvas/sheetFrame"`; after `stroke`:

```ts
/** The sheet these drawings are drawn on. */
const FRAME = frameFor({ width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 }, 2);
```

`draw` takes the frame:

```ts
/** `userId` starts a session on ticket 7 and draws `steps`, on `frame`. */
function draw(
  userId: string,
  steps: Step[],
  { frame = FRAME, onKept }: { frame?: SheetFrame | null; onKept?: (kept: boolean) => void } = {},
) {
  const keeper = new SessionKeeper(userId, onKept);
  keeper.start(7);
  keeper.save(steps, 1000, frame);
  return keeper;
}
```

The last test's `draw(userId, [a], onKept)` becomes `draw(userId, [a], { onKept })`, and its three `keeper.save([…], n)` calls take `FRAME` third. Before "keeps how the tools were set…":

```ts
it("keeps the frame a drawing is drawn in with it, and has none for one kept without", async () => {
  const [framed, unframed] = [someone(), someone()];
  draw(framed, [stroke("a")]);
  draw(unframed, [stroke("a")], { frame: null });
  expect(await loadKeptSession(framed)).toMatchObject({ status: "found", frame: FRAME });
  expect(await loadKeptSession(unframed)).toMatchObject({ status: "found", frame: null });
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/session/keptSession.test.ts` → the new test fails: the found drawing has no `frame`.
- [ ] **Step 3: Implement,** in `session/keptSession.ts`:

1. `import type { SheetFrame } from "../canvas/sheetFrame";` after the `../canvas/ops` import.
2. The file comment, from "live in IndexedDB" to its end:

```ts
 * live in IndexedDB, one record per step, so a stroke writes only itself, with the frame they're
 * drawn in beside them, in the same transaction. The ticket the session spent and the time drawn
 * live in localStorage: it writes at once, where an IndexedDB write started as the page unloads
 * never lands, and it can still be read when the steps can't, so a drawing that can't be picked
 * back up can still carry its ticket over to the next sheet.
 */
```

3. The progress store's keys:

```ts
/** The progress store's records: how many steps are kept, and the frame they were drawn in. */
const PROGRESS_KEY = 0;
const FRAME_KEY = 1;
```

4. `KeptDrawing`'s first member:

```ts
  /** `frame` is null for a drawing kept without one: it was drawn on this device's own sheet. */
  | ({ status: "found"; steps: Step[]; frame: SheetFrame | null } & SessionRecord)
```

5. `save` takes the frame and writes it with every write of steps:

```ts
  /** Keeps the time drawn, the steps changed since the last save, and the frame they're in. */
  save(steps: readonly Step[], elapsedMs: number, frame: SheetFrame | null): void {
```

and in its `write`, after `progressStore.put(steps.length, PROGRESS_KEY);`: `if (frame) progressStore.put(frame, FRAME_KEY);`

6. In `loadKeptSession`, `readSteps(userId).then((steps): KeptDrawing => ({ status: "found", steps, ...record }),` becomes `readDrawing(userId).then(({ steps, frame }): KeptDrawing => ({ status: "found", steps, frame, ...record }),`.
7. `readSteps` becomes `async function readDrawing(userId: string): Promise<{ steps: Step[]; frame: SheetFrame | null }>`, reading the frame in the same transaction: after `let count: unknown;`, `let frame: unknown;`; after the `one` request's `onsuccess`:

```ts
const drawnIn = progressStore.get(FRAME_KEY);
drawnIn.onsuccess = () => {
  frame = drawnIn.result;
};
```

and its last line, `return steps;`, becomes `return { steps, frame: readFrame(frame) };`. 8. Before `isTicketUseId`:

```ts
const isPositive = (v: unknown): v is number => isFiniteNumber(v) && v > 0;

/**
 * The frame a kept drawing was drawn in; null when none was kept. One that can't be read is said,
 * and taken as none: the drawing still comes back, on this device's own sheet.
 */
function readFrame(v: unknown): SheetFrame | null {
  if (v === undefined) return null;
  if (typeof v === "object" && v !== null && "w" in v && "h" in v && "density" in v) {
    const { w, h, density } = v;
    if (isPositive(w) && isPositive(h) && isPositive(density)) return { w, h, density };
  }
  console.error("The kept drawing's frame is unreadable, so it opens on this device's sheet:", v);
  return null;
}
```

- [ ] **Step 4:** Run the keptSession tests again → pass (10 tests).
- [ ] **Step 5: The drawing screen keeps and loads it.** In `canvas/DrawingCanvas.tsx`, the handle's `load` becomes:

```ts
  /**
   * A sheet with these steps on it, as a drawing picked up after a reload has, in the frame they
   * were drawn in; with no frame, the sheet's area is taken as that frame.
   */
  load: (steps: readonly Step[], frame: SheetFrame | null) => void;
```

with `load: (steps, frame) => { ink.current?.engine.load(steps, frame); fitAgain.current?.(); },` in `useImperativeHandle`. In `DrawingScreen.tsx`: `keepProgress`'s save becomes `keeper.save(canvas.current?.steps() ?? [], clock.elapsed, canvas.current?.frame() ?? null);`; in `cutFromSheet`, after `const ops = …`, `const frame = canvas.current?.frame() ?? null;`, and its save becomes `keeper.save(canvas.current?.steps() ?? [], clock.elapsed, frame);`; `putBack`'s `canvas.current?.load(found.steps);` becomes `canvas.current?.load(found.steps, found.frame);`.

`DrawingScreen.test.tsx`: import `frameFor` and `SHEET_SHORT_UNITS` from `"./canvas/sheetFrame"`; after `kept`'s `vi.hoisted`:

```ts
/** The sheet every drawing here is on. */
const FRAME = frameFor({ width: SHEET_SHORT_UNITS, height: SHEET_SHORT_UNITS * 2 }, 1);
```

The mocked handle gains `frame: () => FRAME,` after `inkForReading`; `keptAtTimeUp` gains `frame: null,` and `keptHalfway` `frame: FRAME,`.

- [ ] **Step 6:** `pnpm -C apps/frontend typecheck`, then `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation` → pass.
- [ ] **Step 7:** Commit: `feat(frontend): the drawing kept on the device keeps the frame it's drawn in`

### Task 5: Sealing in sheet units

A seal reads only the ink canvas, whose size and density are the frame's, so the display scale reaches a sticker only through the ops: Task 2's mapping test shows the same strokes commit the same ops at any scale, and its resize test that the frame stays. This task makes the cut itself the same in units at any density.

**Files:** Modify `apps/frontend/src/sticker-creation/sealing/dieCut.ts`, `dieCut.test.ts`, `stickerLayers.test.ts`, `cutSticker.ts`, `sealWorker.ts`, `makeSticker.ts`, `makeSticker.test.ts`, `timelapse.ts`, `timelapse.test.ts`; create `cutSticker.test.ts`; modify `canvas/DrawingCanvas.tsx`, `DrawingScreen.tsx`, `DrawingScreen.test.tsx`, `apps/frontend/src/sticker-board/timelapse/timelapseCrop.test.ts`, `timelapsePlayer.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `sealing/cutSticker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cutInk } from "./cutSticker";
import { BORDER_UNITS } from "./dieCut";
import type { Pixels } from "./pixels";

/** A sheet `side` units square at `density`, inked with a `radius`-unit disk in its middle. */
function diskSheet(side: number, radius: number, density: number): Pixels {
  const size = Math.round(side * density);
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= radius * density)
        data.set([28, 24, 36, 255], (y * size + x) * 4);
  return { width: size, height: size, data };
}

describe("cutInk", () => {
  it("cuts the same sticker, in sheet units, from ink backed at any density", () => {
    const [side, radius] = [200, 40];
    /** The cut's width and the image's, in sheet units, from the disk backed at `density`. */
    const inUnits = (density: number) => {
      const inked = cutInk(diskSheet(side, radius, density), density);
      if (!inked) throw new Error("The sheet has ink, so it cuts");
      const { cut, layers } = inked;
      return {
        cut: (cut.bounds.x1 - cut.bounds.x0 + 1) / (cut.scale * density),
        image: layers.place.w / density,
      };
    };
    const [phone, tablet] = [inUnits(1), inUnits(2.5)];
    // The white border is BORDER_UNITS wide all round, to within a cell of the cut's grid.
    expect(Math.abs(phone.cut - 2 * (radius + BORDER_UNITS))).toBeLessThan(2);
    expect(Math.abs(tablet.cut - phone.cut)).toBeLessThan(2);
    expect(Math.abs(tablet.image - phone.image)).toBeLessThan(2);
  });
});
```

`sealing/makeSticker.test.ts`: after `answer`, `/** The ink's pixels per sheet unit. */ const DENSITY = 2;`; both `makeSticker(document.createElement("canvas"))` calls take `DENSITY` second; in "hands the worker the ink rather than a copy…", after the `transfer` expectation:

```ts
// The cut measures its border in sheet units, so the worker hears the ink's density.
expect(worker.sent?.request.density).toBe(DENSITY);
```

`sealing/timelapse.test.ts`: the input carries the frame:

```ts
/** A sheet backed at density 2: the sticker's place is in the ink canvas's device pixels. */
const DENSITY = 2;
const input = {
  ops: [stroke, eraser, fill],
  frame: { w: 400, h: 600, density: DENSITY },
  place: { x: 100, y: 200, w: 300, h: 400 },
};
```

The first test is named "puts the sheet and the sticker's place in sheet units, the ops' own space" and expects `timelapse.ink` to equal `[input.frame.w, input.frame.h]`; the fill-tap test builds `const frame = { ...input.frame, density };` and encodes `{ ...input, ops, frame }`; the decode test is named "decodes back to the drawing screen's ops, in sheet units" and expects `decoded.ink` to equal `{ width: input.frame.w, height: input.frame.h }`.

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation/sealing` → fails: `cutInk is not a function`, the worker's request has no `density`, and `encodeTimelapse` reads `ink.width` of undefined.
- [ ] **Step 3: The die-cut's border in ink px.** In `sealing/dieCut.ts`, `/** The white border, as a share of the ink's long side. */ const BORDER = 0.03;` becomes:

```ts
/** The white border's width, in sheet units: what a 390 px phone's sticker has. */
export const BORDER_UNITS = 23;
```

and `dieCut`'s head:

```ts
/** Cuts the ink on a sheet, its white border `borderPx` ink px wide; null when there's no ink. */
export function dieCut(ink: Pixels, borderPx: number): DieCut | null {
  const scale = Math.min(1, GRID / Math.max(ink.width, ink.height));
  const iw = Math.max(1, Math.ceil(ink.width * scale));
  const ih = Math.max(1, Math.ceil(ink.height * scale));
  const long = Math.max(iw, ih);
  const border = borderPx * scale;
```

The rest of `dieCut` already measures in `border`s on the grid. Its tests give the border their small sheets had. `dieCut.test.ts`: after `type Shape`, `/** The white border on these small sheets, in ink pixels. */ const BORDER = 6;`; `cutOf` calls `dieCut(ink, BORDER)`; the blank-sheet test becomes:

```ts
const blank = sheet(80, 60, () => false);
const faint = sheet(80, 60, disk(40, 30, 10), 12);
expect(dieCut(blank, BORDER)).toBeNull();
expect(dieCut(faint, BORDER)).toBeNull();
```

`stickerLayers.test.ts`: after `RED`, `/** The white border on this sheet, in ink pixels. */ const BORDER = 6;`, and `layersOf` calls `dieCut(ink, BORDER)`.

- [ ] **Step 4: The cut takes the density.** In `sealing/cutSticker.ts`: `import { BORDER_UNITS, dieCut, type Point } from "./dieCut";` and `import type { Pixels } from "./pixels";`. `Ink` gains `density: number;`, its comment becoming `/** The ink: its pixels to cut from, the image the flat sheet scales down, and pixels per unit. */`. Before `cutSticker`:

```ts
/**
 * The die-cut and the sticker's layers from ink backed at `density` pixels per sheet unit, its
 * white border BORDER_UNITS wide on any device; null when there's no ink to cut.
 */
export function cutInk(pixels: Pixels, density: number) {
  const cut = dieCut(pixels, BORDER_UNITS * density);
  return cut && { cut, layers: stickerLayers(pixels, cut) };
}
```

and `cutSticker`'s first lines become:

```ts
const { pixels } = ink;
const inked = cutInk(pixels, ink.density);
if (!inked) return null;
const { cut, layers } = inked;
const { width, height, place, bands } = layers;
```

`sealing/sealWorker.ts`: `SealRequest` gains `density: number;` (its comment: `/** The ink to cut, handed over rather than copied, and its pixels per sheet unit. */`); `answer` takes the request:

```ts
async function answer({ ink, density }: SealRequest) {
  try {
    const cut = await cutSticker({ pixels: pixelsOf(ink), image: ink, density }, offscreenCanvas);
```

and `self.onmessage = ({ data }) => void answer(data);`.

`sealing/makeSticker.ts`: `cutInWorker(ink, density)` sends `{ ink: image, density }`; `cutHere(ink, density)` passes `{ pixels, image: ink, density }`; `cutInWorkerOrHere(ink, density)` hands `density` to both; and:

```ts
/**
 * Cuts the sticker from a copy of the ink made for reading, `density` pixels to the sheet unit,
 * which is read back once. Null when there's no ink on it. The cut runs in the sealing worker where
 * the browser can, so the screen keeps moving.
 */
export async function makeSticker(
  ink: HTMLCanvasElement,
  density: number,
): Promise<SealedSticker | null> {
  const cut = workerCanCut() ? await cutInWorkerOrHere(ink, density) : await cutHere(ink, density);
```

- [ ] **Step 5: The timelapse records the frame.** In `sealing/timelapse.ts`, `import type { SheetFrame } from "../canvas/sheetFrame";`, and:

```ts
interface TimelapseInput {
  ops: readonly Op[];
  /** The sheet the ops were drawn on: its size in units and its ink's density. */
  frame: SheetFrame;
  /** Where makeSticker cut the sticker from, in the ink canvas's device pixels. */
  place: Rect;
}
```

`encodeTimelapse` starts:

```ts
export function encodeTimelapse({ ops, frame, place }: TimelapseInput): TimelapseV1 {
  const { density } = frame;
  const sheet = (n: number) => toTenth(n / density);
  return {
    v: 1,
    ink: [toTenth(frame.w), toTenth(frame.h)],
```

and the rest stays. `seededPixel`'s comment says "a sheet unit" for "a sheet pixel"; `DecodedTimelapse` is "in sheet units" and its `density` "Device pixels per sheet unit".

The player's tests encode frames. `sticker-board/timelapse/timelapsePlayer.test.ts`: `setup`'s `encodeTimelapse({ … })` becomes `encodeTimelapse({ ops, frame: { w: 100, h: 100, density: 1 }, place: PLACE })`, and the comment on `PLACE` says "100 sheet units square". `timelapseCrop.test.ts`: `import { BORDER_UNITS, dieCut } from "../../sticker-creation/sealing/dieCut";`; `sealedSquare`'s comment becomes ``/** A square sheet drawn at `density`, inked over a `side`-unit square in its middle, cut as sealing cuts. */``, its cut `dieCut(ink, BORDER_UNITS * density)`, and it encodes `{ ops: [], frame: { w: sheetSide, h: sheetSide, density }, place: layers.place }`.

- [ ] **Step 6: The seal reads the frame.** In `DrawingScreen.tsx`, import `type SheetFrame` from `"./canvas/sheetFrame"`; `timelapseOf` becomes:

```ts
  /** How the sticker was drawn, gzipped; null when it can't be made, and the sticker seals without it. */
  async function timelapseOf(ops: readonly Op[], frame: SheetFrame, sticker: SealedSticker) {
    try {
      return await gzipTimelapse(encodeTimelapse({ ops, frame, place: sticker.place }));
```

In `cutFromSheet`, `const density = canvas.current?.inkDensity() ?? 1;` and `const size = { width: ink.width, height: ink.height };` go, and after `const marked = nsfw.current;`:

```ts
// A sheet that never showed has no frame, and nothing on it to cut.
if (!frame) return null;
```

`makeSticker(ink)` becomes `makeSticker(ink, frame.density)`, and `timelapseOf(ops, size, cut, density)` becomes `timelapseOf(ops, frame, cut)`. The handle's `inkDensity` goes from `DrawingCanvas.tsx` (interface and `useImperativeHandle`) and from `DrawingScreen.test.tsx`'s mock.

- [ ] **Step 7:** `pnpm -C apps/frontend typecheck`, then `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-creation src/sticker-board/timelapse` → pass (cutSticker: 1 test, makeSticker: 7, timelapse: 12).
- [ ] **Step 8:** Commit: `feat(frontend): stickers are cut with their border in sheet units, and the timelapse records the frame`

### Task 6: Fills replay at the density they were drawn at

**Files:** Modify `apps/frontend/src/sticker-board/timelapse/timelapseCrop.ts`, `timelapseCrop.test.ts`, `timelapsePlayer.ts`; `apps/api/src/stickers/timelapse.ts`

- [ ] **Step 1: Write the failing test.** In `timelapseCrop.test.ts`, the `sheetFrame` import becomes `import { MAX_DPR, MAX_INK_PIXELS, maxInkDensity } from "../../sticker-creation/canvas/sheetFrame";`, and "is the recorded one, up to the ink surface's cap" gives way to:

```ts
it("is the recorded one, up to the densest any sheet that size was backed at", () => {
  const { timelapse, image } = sealedSquare(2, 150, 50);
  const most = maxInkDensity({ w: timelapse.ink.width, h: timelapse.ink.height });
  // An iPad's sheet is backed denser than any screen's own pixels, and its fills flood at that.
  expect(drawingDensity({ ...timelapse, density: most - 1 }, image)).toBe(most - 1);
  expect(drawingDensity({ ...timelapse, density: most + 1 }, image)).toBe(most);
  // A sheet the size of a big screen, backed at the screen's own density, floods as it did.
  const side = Math.sqrt(MAX_INK_PIXELS);
  const big = { ...timelapse, ink: { width: side, height: side } };
  expect(drawingDensity({ ...big, density: MAX_DPR - 1 }, image)).toBe(MAX_DPR - 1);
  expect(drawingDensity({ ...big, density: MAX_DPR + 1 }, image)).toBe(MAX_DPR);
});
```

- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/timelapse/timelapseCrop.test.ts` → fails: `expected 3 to be 12.662`, today's cap at `MAX_DPR`.
- [ ] **Step 3: Implement.** In `timelapseCrop.ts`, the `sheetFrame` import takes `maxInkDensity` too, and:

```ts
/**
 * Device pixels per sheet unit where the sticker was drawn, which its fills flood at: recorded, or
 * read off an image cut at the ink's own resolution, or else the densest screen. A recorded one is
 * kept up to the densest any sheet that size was backed at, so a replay floods as the drawing did.
 */
export function drawingDensity(
  timelapse: Pick<DecodedTimelapse, "density" | "place" | "ink">,
  image: { width: number; height: number },
): number {
  if (timelapse.density !== null) {
    const most = maxInkDensity({ w: timelapse.ink.width, h: timelapse.ink.height });
    return Math.min(timelapse.density, Math.max(MAX_DPR, most));
  }
  const estimate = image.width / timelapse.place.w;
  const inkResolution = Math.max(image.width, image.height) < CAPPED_IMAGE_SIDE;
  return inkResolution && estimate > 0 ? Math.min(estimate, MAX_DPR) : MAX_DPR;
}
```

The comments on `SheetCanvas` and `DisplayCanvas` say "per sheet unit" for "per sheet px", as does `timelapsePlayer.ts`'s `/** Display px per sheet unit. */`.

- [ ] **Step 4: The format's comments.** `apps/api/src/stickers/timelapse.ts`: `strokePoints`' comment becomes `/** A stroke's points: x, y and width in tenths of a unit, plus ms, each a change from the one before. */`; the schema's says "Lengths are sheet units."; `density`'s `/** Device pixels per sheet unit where it was drawn: fills flood at it. */`.
- [ ] **Step 5:** `TZ=Asia/Tokyo pnpm -C apps/frontend exec vitest run src/sticker-board/timelapse` and `pnpm -C apps/frontend typecheck` → pass (timelapseCrop: 16 tests).
- [ ] **Step 6:** Commit: `fix(frontend): a timelapse floods its fills at the density they were drawn at`

### Task 7: Check it in WebKit and Chromium

A trial run of this plan's code passed every check below in both engines on 2026-10-07; its numbers are given as expected values.

- [ ] **Step 1: A dev server of its own,** on 5191 and 8791 (other sessions hold 5173/8788 and 5190/8790, and the other iPad plans 5192–5196; check with `lsof -nP -iTCP -sTCP:LISTEN`). The API: `PORT=8791 DATABASE_URL=data/ipad-sheet.db IMAGE_DIR=../../data/ipad-sheet-images IMAGE_BASE_URL=http://localhost:5191/api/images pnpm -C apps/api dev`. Vite, from an untracked `apps/frontend/vite.sheet.config.ts`:

```ts
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config.ts";

export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5191,
      strictPort: true,
      proxy: { "/api": { target: "http://localhost:8791" } },
    },
  }),
);
```

run as `VITE_LIFF_MOCK=on VITE_DEV_SLIP=on pnpm -C apps/frontend exec vite --config vite.sheet.config.ts`. Each run signs in as a fresh person, since each has three daily tickets.

- [ ] **Step 2: Helpers.** In `~/.cache/drawing-app-ipad-sheet/`: copy `~/.cache/drawing-app-ipad/scripts/drawing/lib.js` as `lib.js`, with `const BASE = process.env.SHEET_BASE || "http://localhost:5191";`, `const OUT = path.join(__dirname, "screens");` and `const LOG = path.join(__dirname, "run.log");`, and make `screens/`. Its `openContext` signs in from Node and adds the session cookie back without `Secure` (WebKit drops it on http://localhost: `~/.cache/drawing-app-ipad/seed.txt`), routes WebKit's HTTPS through Node, and uses the `~/.npm/_npx/<hash>/node_modules/playwright-core` whose WebKit is installed; `syntheticStroke` dispatches pen PointerEvents on `.ink-sheet`; `openCanvas` taps Draw. Then `sheet.js`:

```js
// Helpers for the drawing sheet's browser checks: strokes in sheet units, the paper's place, the kept
// frame, and a seal's sticker and timelapse. One-shot scratch: delete this folder once the plan merges.
const L = require("./lib");

/** Every new drawing's short side, in sheet units (SHEET_SHORT_UNITS). */
const SHORT = 374;

/** The paper on screen and the area it sits in, CSS px, with how many CSS px a sheet unit spans. */
const paper = (page) =>
  page.evaluate((short) => {
    const box = (sel) => {
      const r = document.querySelector(`.drawing-screen ${sel}`).getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    const sheet = box(".ink-sheet");
    return { ...sheet, scale: Math.min(sheet.width, sheet.height) / short, area: box(".ink-area") };
  }, SHORT);

/** A pen stroke along points [x, y, pressure] in sheet units, on the paper as it's shown. */
async function unitStroke(page, points, opts) {
  const { scale } = await paper(page);
  return L.syntheticStroke(
    page,
    points.map(([x, y, p]) => [x * scale, y * scale, p]),
    opts,
  );
}

/** The frame the kept drawing is drawn in, from IndexedDB's progress store. */
const keptFrame = (page, userId) =>
  page.evaluate(async (userId) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(`drawing-session.${userId}`, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const frame = await new Promise((resolve) => {
      const req = db.transaction("progress").objectStore("progress").get(1);
      req.onsuccess = () => resolve(req.result ?? null);
    });
    db.close();
    return frame;
  }, userId);

/** What the checks compare: the paper, the ink canvas's pixels, the kept steps and frame. */
const state = async (page, userId) => ({
  paper: await paper(page),
  ink: await L.inkStats(page),
  kept: await L.keptDrawing(page, userId),
  frame: await keptFrame(page, userId),
});

/** Two taps on the seal check; the sealed sticker, and its timelapse as the server keeps it. */
async function seal(page) {
  const sealed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/stickers" && r.request().method() === "POST",
    { timeout: 90000 },
  );
  const key = await page.locator(".seal-key").boundingBox();
  await page.touchscreen.tap(key.x + key.width / 2, key.y + key.height / 2);
  await L.sleep(700);
  await page.touchscreen.tap(key.x + key.width / 2, key.y + key.height / 2);
  const { sticker } = await (await sealed).json();
  const timelapse = await page.evaluate(
    async (id) => (await fetch(`/api/stickers/${id}/timelapse`)).json(),
    sticker.id,
  );
  return { sticker, timelapse };
}

/** Each stroke's extent in sheet units, from a timelapse's point changes (tenths, from zero). */
const opExtents = (timelapse) =>
  timelapse.ops
    .filter((op) => op[0] !== "fill")
    .map((op) => {
      const [xs, ys] = [[], []];
      let [x, y] = [0, 0];
      for (let i = 0; i + 4 <= op[3].length; i += 4) {
        xs.push((x += op[3][i]) / 10);
        ys.push((y += op[3][i + 1]) / 10);
      }
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    });

/** The paper has the frame's shape and fits its area, touching it on one axis, centered on both. */
function fitsCentered({ width, height, left, top, area }, frame) {
  const shape = Math.abs(width / height - frame.w / frame.h) < 0.005;
  const inside = width <= area.width + 0.5 && height <= area.height + 0.5;
  const touches = Math.abs(width - area.width) < 1 || Math.abs(height - area.height) < 1;
  const sides = [left - area.left, area.left + area.width - left - width];
  const ends = [top - area.top, area.top + area.height - top - height];
  const centered = Math.abs(sides[0] - sides[1]) <= 1 && Math.abs(ends[0] - ends[1]) <= 1;
  return shape && inside && touches && centered;
}

/** Says how a check went; a failure sets the exit code. */
function check(what, ok, detail) {
  L.log(`${ok ? "PASS" : "FAIL"} ${what}`, detail ?? "");
  if (!ok) process.exitCode = 1;
}

module.exports = { paper, unitStroke, state, seal, opExtents, fitsCentered, check };
```

- [ ] **Step 3: Turning and reloading, `rotate.js`:**

```js
// One-shot check: strokes survive turning the iPad and a reload in the other orientation, and a seal
// after turning holds every stroke. Usage: node rotate.js webkit|chromium
const L = require("./lib");
const S = require("./sheet");

const PORTRAIT = { width: 820, height: 1180 };
const LANDSCAPE = { width: 1180, height: 820 };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const engine = process.argv[2] || "webkit";
  const tag = engine === "webkit" ? "wk" : "cr";
  const name = `sheet-rot-${tag}${Date.now() % 100000}`;
  const vp = { w: PORTRAIT.width, h: PORTRAIT.height };
  const { browser, page, me } = await L.openContext({ engine, name, vp });
  try {
    await L.openCanvas(page, name);
    // Across the top, a diagonal, and one low on the portrait sheet (374 × 515 units), below
    // where a landscape sheet would end.
    await S.unitStroke(page, L.line(30, 40, 340, 60), { id: 21 });
    await S.unitStroke(page, L.line(40, 120, 350, 300, 30, 0.05, 1), { id: 22 });
    await S.unitStroke(page, L.line(50, 440, 300, 490, 24, 0.9, 0.3), { id: 23 });
    await L.sleep(800);
    const drawn = await S.state(page, me.id);
    S.check(
      "drawn: three steps kept, with a frame",
      drawn.kept.count === 3 && drawn.frame !== null,
    );
    await L.shot(page, `${tag}-sheet-1-portrait.png`);

    await page.setViewportSize(LANDSCAPE);
    await L.sleep(1200);
    const turned = await S.state(page, me.id);
    S.check("turned: the ink's pixels are untouched", same(turned.ink, drawn.ink), turned.ink);
    S.check(
      "turned: the paper fits its area, centered",
      S.fitsCentered(turned.paper, drawn.frame),
      turned.paper,
    );
    S.check("turned: the frame stays", same(turned.frame, drawn.frame), turned.frame);
    await L.shot(page, `${tag}-sheet-2-turned.png`);

    await page.setViewportSize(PORTRAIT);
    await L.sleep(1200);
    const back = await S.state(page, me.id);
    S.check("back: the ink's pixels are untouched", same(back.ink, drawn.ink), back.ink);
    S.check(
      "back: the paper fits its area, centered",
      S.fitsCentered(back.paper, drawn.frame),
      back.paper,
    );

    await page.setViewportSize(LANDSCAPE);
    await page.reload({ waitUntil: "domcontentloaded" });
    const draw = page.getByRole("button", { name: /^Draw a new sticker/ });
    await draw.waitFor({ timeout: 45000 });
    await L.sleep(1500);
    const at = await draw.boundingBox();
    await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
    await page.locator(".drawing-screen:not([inert]) .ink-sheet").waitFor({ timeout: 30000 });
    await L.sleep(2500);
    const reloaded = await S.state(page, me.id);
    S.check(
      "reloaded: the drawing keeps its frame",
      same(reloaded.frame, drawn.frame),
      reloaded.frame,
    );
    S.check(
      "reloaded: the same ink, replayed on a canvas the same size",
      reloaded.ink.canvas === drawn.ink.canvas &&
        Math.abs(reloaded.ink.inked - drawn.ink.inked) <= drawn.ink.inked * 0.01,
      reloaded.ink,
    );
    S.check(
      "reloaded: the paper fits its area, centered",
      S.fitsCentered(reloaded.paper, drawn.frame),
      reloaded.paper,
    );
    await L.shot(page, `${tag}-sheet-3-reloaded.png`);

    // Picked up paused: the timer resumes it, and the check seals it, turned.
    await page.locator(".timer-dot").tap();
    await L.sleep(500);
    const { sticker, timelapse } = await S.seal(page);
    const [x, y, w, h] = timelapse.place;
    const strokes = S.opExtents(timelapse);
    const holds = strokes.every((s) => s.x0 >= x && s.x1 <= x + w && s.y0 >= y && s.y1 <= y + h);
    L.log(tag, "sealed", {
      size: [sticker.width, sticker.height],
      place: timelapse.place,
      strokes,
    });
    S.check(
      "sealed: the timelapse's sheet is the frame",
      same(timelapse.ink, [drawn.frame.w, drawn.frame.h]),
      timelapse.ink,
    );
    S.check("sealed: the sticker holds every stroke", strokes.length === 3 && holds);
    await L.sleep(6000);
    await L.shot(page, `${tag}-sheet-4-sealed.png`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  L.log("rotate failed", String(e?.stack ?? e));
  process.exit(1);
});
```

`node rotate.js webkit` and `node rotate.js chromium` → every line PASS, exit 0. Expected: the ink canvas 1608×2214 throughout, frame `{ w: 374, h: 515, density: 4.299 }`; turned, the paper 543.2×748 at left 318.4 in a 1164×748 area; reloaded, inked pixels within 1% (the replay paints whole strokes); sealed, 539×704 with `ink` `[374, 515]`, the low stroke at y 440–490 inside `place`. Look at `*-sheet-2-turned.png` and `*-sheet-3-reloaded.png`: the whole portrait sheet, centered, every stroke on it.

- [ ] **Step 4: The same sticker from a phone and an iPad, `sameSize.js`:**

```js
// One-shot check: the same drawing in sheet units, sealed on a 390 px phone and on a 13-inch iPad in
// landscape, gives the same sticker. Usage: node sameSize.js webkit|chromium
const L = require("./lib");
const S = require("./sheet");

const SIZES = [
  { w: 390, h: 844, phone: true },
  { w: 1376, h: 1032 },
];
/** A loop in sheet units inside the 374-unit square every frame holds, its pressure wandering. */
const LOOP = Array.from({ length: 91 }, (_, i) => {
  const a = (i / 90) * 2 * Math.PI;
  return [187 + 150 * Math.cos(a), 187 + 120 * Math.sin(a), 0.35 + 0.6 * Math.abs(Math.sin(3 * a))];
});

(async () => {
  const engine = process.argv[2] || "webkit";
  const tag = engine === "webkit" ? "wk" : "cr";
  const sealed = [];
  for (const vp of SIZES) {
    const name = `sheet-size-${tag}${vp.w}-${Date.now() % 100000}`;
    const { browser, page } = await L.openContext({ engine, name, vp });
    try {
      await L.openCanvas(page, name);
      await S.unitStroke(page, LOOP, { id: 41 });
      await L.sleep(500);
      const { sticker, timelapse } = await S.seal(page);
      const { ink, place, density } = timelapse;
      sealed.push({
        vp: `${vp.w}x${vp.h}`,
        size: [sticker.width, sticker.height],
        ink,
        place,
        density,
      });
      await L.sleep(6000);
      await L.shot(page, `${tag}-sheet-sealed-${vp.w}x${vp.h}.png`);
    } finally {
      await browser.close();
    }
  }
  const [phone, ipad] = sealed;
  const long = (s) => Math.max(...s.size);
  const short = (s) => Math.min(...s.size);
  S.check("the stickers' long sides match", long(phone) === long(ipad), sealed);
  S.check(
    "their short sides match within 1%",
    Math.abs(short(phone) - short(ipad)) <= short(phone) * 0.01,
  );
  S.check(
    "they sit on the sheet in the same place, in units, within 3",
    phone.place.every((v, i) => Math.abs(v - ipad.place[i]) <= 3),
  );
})().catch((e) => {
  L.log("sameSize failed", String(e?.stack ?? e));
  process.exit(1);
});
```

`node sameSize.js webkit` and `node sameSize.js chromium` → three PASS lines, exit 0. Expected: the phone's frame `[374, 772]` at density 3 sealing 704×599, the iPad's `[530, 374]` at 4.603 sealing 704×598, their `place` within 1.3 units. In the two `*-sheet-sealed-*.png`, the border and the line's weight against the sticker match (the sealed card's own size on an iPad is another plan's).

- [ ] **Step 5: Every size the spec checks, `sizes.js`:**

```js
// One-shot check: at each size the spec checks, a sheet with a stroke on it fits its area, centered,
// in its frame's shape. Usage: node sizes.js webkit|chromium
const L = require("./lib");
const S = require("./sheet");

const SIZES = [
  [390, 844, true],
  [375, 591, true],
  [540, 564],
  [540, 620],
  [744, 1133],
  [1133, 690],
  [820, 1180],
  [1180, 820],
  [1376, 1032],
];

(async () => {
  const engine = process.argv[2] || "webkit";
  const tag = engine === "webkit" ? "wk" : "cr";
  for (const [w, h, phone] of SIZES) {
    const name = `sheet-fit-${tag}${w}-${Date.now() % 100000}`;
    const { browser, page, me } = await L.openContext({ engine, name, vp: { w, h, phone } });
    try {
      await L.openCanvas(page, name);
      await S.unitStroke(page, L.line(20, 20, 200, 120), { id: 51 });
      await L.sleep(600);
      const { paper, frame } = await S.state(page, me.id);
      S.check(`${w}x${h}: the sheet fits its area, centered`, S.fitsCentered(paper, frame), {
        frame,
        paper,
      });
      await L.shot(page, `${tag}-sheet-fit-${w}x${h}.png`);
    } finally {
      await browser.close();
    }
  }
})().catch((e) => {
  L.log("sizes failed", String(e?.stack ?? e));
  process.exit(1);
});
```

`node sizes.js webkit` and `node sizes.js chromium` → nine PASS lines each, exit 0, the frames as in the table above where it lists the size (540×620: 374×391 at 2.802, shown at 1.401).

- [ ] **Step 6:** Fix what a check finds and run it again. Stop both servers, and delete `apps/frontend/vite.sheet.config.ts` (`pnpm check` formats and lints untracked files too).

### Task 8: DESIGN.md, then check and merge

- [ ] **Step 1: DESIGN.md's Draw screen.** After "The canvas is just for drawing.", a first bullet: "- **Sheet:** white paper inside thin Liner margins. A drawing keeps the shape its sheet took at the first mark, and turning the screen or resizing the window scales it to fit, centered, so strokes, brush sizes and the sticker's white border are the same on every screen." The size rail's "with a live number of the brush size in px." becomes "with a live number of the brush size in the sheet's px, a 390 px phone's, so a size draws the same on any screen." Commit: `docs: DESIGN.md's drawing sheet keeps its shape and scales to fit`
- [ ] **Step 2:** `TZ=Asia/Tokyo pnpm check` → lint, typecheck, tests, format and the Move tests pass. Every test and check command here sets `TZ`: two tests outside this plan, `giving/GiftReceivedNotice.test.tsx` and `sticker-board/StickerDetail.test.tsx`, read the machine's clock in its own timezone and fail on main too when it isn't on Tokyo time.
- [ ] **Step 3:** Squash the branch into `feat(frontend): a drawing keeps one sheet in sheet units, shown scaled to fit on any screen` (Tasks 1–4), `feat(frontend): stickers seal and replay in sheet units` (Tasks 5–6) and the docs commit, with no AI attribution lines.
- [ ] **Step 4:** In the main checkout, in one command: fetch, fast-forward main, merge the branch, push.
- [ ] **Step 5:** Tell the coordinator, for the drawing screen and Pencil plan: `DrawingCanvas` renders `.ink-area` (inset 8px 8px 14px in its parent) holding `.ink-sheet`; it takes `onFit(scale)`, and `DrawingScreen` keeps the scale in `sheetScale`; the handle has `frame()` and `screenToSheet()`; `InkEngine.resized()` is gone, and a frame change replays in `useFrame`.
- [ ] **Step 6:** Once merged, delete the worktree, the branch and `~/.cache/drawing-app-ipad-sheet/`. The spec and this plan stay, with this plan's boxes ticked on main (the LINE sheet plan checks for open ones): the finish deletes them.
