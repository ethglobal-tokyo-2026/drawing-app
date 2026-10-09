# The Fill Closes Small Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fill on paper treats openings up to `FILL_GAP` sheet units across as closed, each fill records its gap so every replay matches, and the timelapse's never-null density path goes.

**Architecture:** `floodFill` takes a `gap` in its pixels' units. On paper with a gap, chamfer distances to the lines (and the sheet's uncut edges) split paper into open paper, farther than half the gap from every line, and paper near a line. Open paper floods from the tap (8-connected). A multi-source BFS then gives each pixel of paper near a line to the nearest open paper, with ties going to the region. A first-square read answers "past" when lines or open paper past a cut side could change the result. `FillOp.gap` carries the gap through undo, the kept drawing and the timelapse (`["fill", color, T, x, y, gap]`; five-element entries read as gap 0).

**Tech Stack:** TypeScript, vitest, zod 4 (the API's timelapse schema), Vite and Playwright (Chromium, WebKit) for calibration.

Spec: `docs/superpowers/specs/2026-10-09-fill-gap-closing-design.md`.

Paths below are from the worktree's root. Frontend tests: `pnpm --filter frontend exec vitest run <files>`; API tests: `pnpm --filter @drawing-app/api exec vitest run <files>`.

---

### Task 0: Worktree and baseline timings

- [ ] **Step 1:** Make a worktree on branch `feat/fill-gap-closing` from `main` (superpowers:using-git-worktrees), then `pnpm install` in it.
- [ ] **Step 2:** Create the calibration page and its driver, the three files in Task 4 Step 2 (untracked; never committed).
- [ ] **Step 3:** Start Vite from the worktree in the background: `pnpm --filter frontend exec vite --port 5191 --strictPort`.
- [ ] **Step 4:** Run the driver with the label `before` (Task 4 Step 3) and keep its timings: main's fill ignores `gap`, so every row is today's cost.
- [ ] **Step 5:** Delete `apps/frontend/scratch-fill/` (`pnpm lint` would read it), and leave Vite running for Task 4.

### Task 1: Each fill records its gap

**Files:**

- Modify: `apps/frontend/src/sticker-creation/canvas/fill.ts` (export `FILL_GAP` only)
- Modify: `apps/frontend/src/sticker-creation/canvas/ops.ts`, `canvas/inkEngine.ts`
- Modify: `apps/frontend/src/sticker-creation/session/keptSession.ts`, `keptSession.test.ts`
- Modify: `apps/frontend/src/sticker-creation/sealing/timelapse.ts`, `timelapse.test.ts`
- Modify: `apps/api/src/stickers/timelapse.ts`, `apps/api/src/stickers/testPngs.ts`
- Modify (fixtures get `gap: 0`): `canvas/history.test.ts`, `sticker-board/timelapse/fillSnapshots.test.ts`, `timelapseSchedule.test.ts`, `timelapsePlayer.test.ts`

- [ ] **Step 1: Write the failing tests**

`keptSession.test.ts`: import `FILL_GAP` from `../canvas/fill` and `FillOp` from `../canvas/ops`. Replace `holdStores`' opening of the database with a shared helper, and add a writer for older steps:

```ts
/** A second connection to the one database kept, as another tab would open. */
async function openKept(): Promise<IDBDatabase> {
  const [{ name } = {}] = await indexedDB.databases();
  if (!name) throw new Error("Nothing is kept");
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Holds the one database's stores in a transaction until the returned release, as a slow disk would. */
async function holdStores() {
  const db = await openKept();
  const stores = [...db.objectStoreNames];
  const store = db.transaction(stores, "readwrite").objectStore(stores[0]);
  let held = true;
  const spin = () => {
    if (held) store.count().onsuccess = spin;
  };
  spin();
  return () => {
    held = false;
    db.close();
  };
}

/** Writes `step` as step `i` of the drawing kept, as an older build would have kept it. */
async function keepStepAs(i: number, step: unknown) {
  const db = await openKept();
  await new Promise<void>((resolve, reject) => {
    // keptSession.ts's store of steps.
    const tx = db.transaction("ops", "readwrite");
    tx.objectStore("ops").put(step, i);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
```

In `describe("the drawing kept on this device")`, after the clears test:

```ts
it("keeps each fill's gap, and reads a fill kept before fills recorded one as closing none", async () => {
  const userId = someone();
  const fill: FillOp = { tool: "fill", x: 4, y: 5, color: "#00868B", gap: FILL_GAP, T: 0 };
  draw(userId, [fill]);
  expect(await keptSteps(userId)).toEqual([fill]);
  await keepStepAs(0, { tool: "fill", x: 4, y: 5, color: "#00868B", T: 0 });
  expect(await keptSteps(userId)).toEqual([{ ...fill, gap: 0 }]);
});
```

`keptColor`'s test fill gains `gap: 0`.

`sealing/timelapse.test.ts`: import `FILL_GAP` from `../canvas/fill`. The shared fill becomes `{ tool: "fill", color: "#00ff00", T: 9000.4, x: 30.26, y: 40, gap: FILL_GAP }`; the taps' fills gain `gap: 0`; the decoded fill in "decodes back to the drawing screen's ops" becomes `{ tool: "fill", color: "#00ff00", T: 9000, x: 30.25, y: 40.25, gap: FILL_GAP }`. Add:

```ts
it("reads a fill sealed before fills recorded their gap as one that closed none", () => {
  const older: TimelapseV1 = {
    ...encodeTimelapse(input),
    ops: [["fill", "#00ff00", 9000, 30.25, 40.25]],
  };
  expect(decodeTimelapse(older).ops).toEqual([
    { tool: "fill", color: "#00ff00", T: 9000, x: 30.25, y: 40.25, gap: 0 },
  ]);
});
```

`apps/api/src/stickers/testPngs.ts`: `TEST_TIMELAPSE`'s comment becomes "one brush stroke of two points, then two fills", and its ops:

```ts
  ops: [
    ["brush", "#ff3366", 0, [100, 200, 60, 0, 50, 25, 0, 16]],
    // Sealed before fills recorded their gap, as stored timelapses may be.
    ["fill", "#33aaff", 1500, 40.5, 60],
    ["fill", "#ffcc00", 2100, 80.5, 30, 2],
  ],
```

- [ ] **Step 2: Run them, expecting failures** (type errors and the new tests):
      `pnpm --filter frontend exec vitest run src/sticker-creation/session/keptSession.test.ts src/sticker-creation/sealing/timelapse.test.ts` and `pnpm --filter @drawing-app/api exec vitest run src/routes/stickers.test.ts` (the seal refuses the six-element fill).

- [ ] **Step 3: Implement**

`fill.ts`, after the `Rgb` type:

```ts
/**
 * The widest opening, in sheet units, a fill on paper treats as closed, so a line that stops just
 * short of meeting itself still holds the fill. Each fill records its own, so changing this leaves
 * every drawing as it was drawn.
 */
export const FILL_GAP = 2;
```

`ops.ts`, `FillOp`:

```ts
/** A fill seeded at a point in sheet units, `T` ms into the session. */
export interface FillOp {
  tool: "fill";
  x: number;
  y: number;
  color: string;
  /** The widest opening, in sheet units, it treated as closed; 0 for a fill that closed none. */
  gap: number;
  T: number;
}
```

`inkEngine.ts`: `import { FILL_GAP } from "./fill";`, and `applyFill`'s op gains `gap: FILL_GAP,` after `color`.

`keptSession.ts`, `readStep`'s fill branch:

```ts
if (tool === "fill") {
  if (!("x" in v) || !isFiniteNumber(v.x) || !("y" in v) || !isFiniteNumber(v.y)) return undefined;
  // A fill kept before fills recorded their gap closed none.
  const gap = "gap" in v ? v.gap : 0;
  return isFiniteNumber(gap) && gap >= 0 ? { tool, x: v.x, y: v.y, color, gap, T } : undefined;
}
```

`sealing/timelapse.ts`: the encoded fill appends `op.gap` after `seededPixel(op.y, density)`; the decoded fill is

```ts
      op[0] === "fill"
        ? // A fill sealed before fills recorded their gap closed none.
          { tool: "fill", color: op[1], T: op[2], x: op[3], y: op[4], gap: op[5] ?? 0 }
        : { tool: op[0], color: op[1], T: op[2], pts: pointsFrom(op[3]) },
```

`apps/api/src/stickers/timelapse.ts`, the fill entry in `ops`:

```ts
      // A fill's last entry is the widest opening it closed, in units; fills sealed before fills
      // recorded one have none, and closed none.
      z.tuple([
        z.literal("fill"),
        z.string(),
        z.number(),
        z.number(),
        z.number(),
        z.number().nonnegative().optional(),
      ]),
```

zod 4.6.5 returns a five-element entry as five elements, so a stored timelapse serves unchanged. Fixtures that build a `FillOp` gain `gap: 0`: `history.test.ts`'s `fill`, `fillSnapshots.test.ts`'s `fill`, `timelapseSchedule.test.ts`'s `fill`, `timelapsePlayer.test.ts`'s `fill` const.

- [ ] **Step 4: Run** Step 2's commands, plus `pnpm --filter frontend exec vitest run src/sticker-creation src/sticker-board/timelapse`, `pnpm --filter frontend typecheck` and `pnpm --filter @drawing-app/api typecheck`. Expected: all pass.
- [ ] **Step 5: Commit** the files above: `feat: each fill records the widest opening it closes; fills from before close none`.

### Task 2: The flood closes gaps

**Files:**

- Modify: `apps/frontend/src/sticker-creation/canvas/fill.ts` (whole file below)
- Modify: `apps/frontend/src/sticker-creation/canvas/fill.test.ts` (whole file below)
- Modify: `apps/frontend/src/sticker-creation/canvas/inkSurface.ts`
- Modify: `PRODUCT.md`

- [ ] **Step 1: Write the failing tests.** `fill.test.ts` becomes:

```ts
import { describe, expect, it } from "vitest";
import type { Rect } from "../sealing/stickerLayers";
import { floodFill, floodSheet, type Pixels } from "./fill";

type Rgba = [number, number, number, number];

const INK: Rgba = [28, 24, 36, 255];
const RED = [255, 0, 0] as const;
const KEY: Record<string, Rgba> = {
  ".": [0, 0, 0, 0],
  "#": INK,
  // Faint enough to count as empty paper.
  f: [28, 24, 36, 100],
  // A line's soft edge: ink, but not opaque.
  e: [28, 24, 36, 191],
  o: [255, 90, 54, 255],
  // Within the tolerance of o (|ΔRGB| sums to 46)…
  p: [255, 110, 80, 255],
  // …and outside it (sums to 105).
  q: [200, 40, 54, 255],
};
/** The widest opening, in pixels, the tests' fills close. */
const GAP = 2;

/** Pixels from rows of characters, one per pixel, colored by `KEY`. */
function image(rows: string[]): Pixels {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => row.split("").forEach((c, x) => data.set(KEY[c], (y * width + x) * 4)));
  return { width, height: rows.length, data };
}

const at = (img: Pixels, x: number, y: number) => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];

const copyOf = (img: Pixels): Pixels => ({ ...img, data: img.data.slice() });

/** Copies a block the size of `size` from (fx, fy) of `from` to (tx, ty) of `to`. */
function blit(
  from: Pixels,
  fx: number,
  fy: number,
  to: Pixels,
  tx: number,
  ty: number,
  size: Rect,
) {
  for (let row = 0; row < size.h; row++) {
    const start = ((fy + row) * from.width + fx) * 4;
    to.data.set(from.data.subarray(start, start + size.w * 4), ((ty + row) * to.width + tx) * 4);
  }
}

/** The whole image flooded in place, closing openings up to `gap`, as a fill reading the whole sheet. */
function wholeImageFill(img: Pixels, x: number, y: number, gap: number): Pixels {
  const out = copyOf(img);
  floodFill(out, x, y, RED, gap);
  return out;
}

/** A fill as the ink takes one: `floodSheet` reads boxes of `img`, and only the changed box is written back. */
function sheetFill(img: Pixels, x: number, y: number, gap: number, near: number) {
  const reads: Rect[] = [];
  const read = (box: Rect) => {
    reads.push(box);
    const pixels = { width: box.w, height: box.h, data: new Uint8ClampedArray(box.w * box.h * 4) };
    blit(img, box.x, box.y, pixels, 0, 0, box);
    return pixels;
  };
  const out = copyOf(img);
  const flood = floodSheet(img, read, x, y, RED, gap, near);
  if (flood) {
    const { pixels, at: box, changed } = flood;
    blit(pixels, changed.x, changed.y, out, box.x + changed.x, box.y + changed.y, changed);
  }
  return { out, reads };
}

/** A shape drawn closed, soft inside as deep as the tuck, with a faint speck, beside a colored patch. */
const SHEET = image([
  "...........................",
  "..#############............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#....ooooo...",
  "..#ee.......ee#....opooq...",
  "..#ee...f...ee#....ooooo...",
  "..#ee.......ee#............",
  "..#eeeeeeeeeee#............",
  "..#eeeeeeeeeee#............",
  "..#############............",
  "...........................",
]);

/** A shape whose bottom line has an opening `across` pixels wide, with open paper round it. */
const shapeWithOpening = (across: number) =>
  image([
    "....................",
    "....................",
    "..###########.......",
    "..#.........#.......",
    "..#.........#.......",
    "..#.........#.......",
    "..#.........#.......",
    `..####${".".repeat(across)}${"#".repeat(7 - across)}.......`,
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
  ]);

/** A shape whose opening the tests' fills close. */
const OPENING = shapeWithOpening(GAP);

/** A closed triangle with sharp corners. */
const TRIANGLE = image([
  "..................",
  ".################.",
  "..#.............#.",
  "...#............#.",
  "....#...........#.",
  ".....#..........#.",
  "......#.........#.",
  ".......#........#.",
  "........#.......#.",
  ".........#......#.",
  "..........#.....#.",
  "...........#....#.",
  "............#...#.",
  ".............#..#.",
  "..............#.#.",
  "...............##.",
  "..................",
]);

/** A closed loop with no room inside as wide as the gaps it's filled with. */
const LOOP = image([
  "..........",
  "..#####...",
  "..#...#...",
  "..#...#...",
  "..#####...",
  "..........",
]);

/** One color in two blobs, joined by a stroke narrower than the gap. */
const DUMBBELL = image([
  "...............",
  ".ooooo...ooooo.",
  ".ooooo...ooooo.",
  ".ooooooooooooo.",
  ".ooooo...ooooo.",
  ".ooooo...ooooo.",
  "...............",
]);

describe("floodFill", () => {
  it("fills empty paper up to the line, counting faint pixels as empty", () => {
    const img = image([
      "..........",
      ".########.",
      ".########.",
      ".##....##.",
      ".##.f..##.",
      ".##....##.",
      ".########.",
      ".########.",
      "..........",
    ]);
    expect(floodFill(img, 3, 3, RED, 0)).not.toBeNull();
    expect(at(img, 3, 3)).toEqual([...RED, 255]);
    expect(at(img, 6, 5)).toEqual([...RED, 255]);
    expect(at(img, 4, 4)).toEqual([...RED, 255]);
    expect(at(img, 1, 1)).toEqual(INK);
    expect(at(img, 0, 0)).toEqual(KEY["."]);
    expect(at(img, 9, 8)).toEqual(KEY["."]);
  });

  it("fills a colored region across small color differences but not large ones", () => {
    const img = image(["oopoq", "ooooq"]);
    floodFill(img, 0, 0, RED, 0);
    expect(at(img, 2, 0)).toEqual([...RED, 255]);
    expect(at(img, 4, 0)).toEqual(KEY.q);
  });

  it("does nothing on a color already within 8 of the fill color", () => {
    const img = image(["ooo"]);
    const before = [...img.data];
    expect(floodFill(img, 1, 0, [255, 93, 55], 0)).toBeNull();
    expect([...img.data]).toEqual(before);
  });

  it("tucks the fill 2px under a line's soft edge", () => {
    const img = image(["....eeee...."]);
    floodFill(img, 0, 0, RED, 0);
    for (const x of [4, 5]) {
      const [r, g, b, a] = at(img, x, 0);
      expect(a).toBe(255);
      // The fill shows through under the edge, so the pixel sits between the ink and the fill.
      expect(r).toBeGreaterThan(INK[0]);
      expect(r).toBeLessThan(RED[0]);
      expect([g, b]).toEqual([18, 27]);
    }
    expect(at(img, 6, 0)).toEqual(KEY.e);
    expect(at(img, 11, 0)).toEqual(KEY["."]);
  });
});

describe("floodFill closing gaps", () => {
  it("holds a fill on paper in a shape whose opening is as wide as the gap", () => {
    const filled = wholeImageFill(OPENING, 5, 4, GAP);
    expect(at(filled, 5, 4)).toEqual([...RED, 255]);
    // Past the tuck under the opening, and round the shape.
    expect(at(filled, 6, 10)).toEqual(KEY["."]);
    expect(at(filled, 0, 0)).toEqual(KEY["."]);
  });

  it("lets a fill out through an opening wider than the gap", () => {
    expect(at(wholeImageFill(shapeWithOpening(GAP + 1), 5, 4, GAP), 0, 0)).toEqual([...RED, 255]);
  });

  it("holds a fill on paper at a line that stops as near the sheet's edge as the gap", () => {
    const img = image([
      "............",
      "............",
      "............",
      "##########..",
      "............",
      "............",
      "............",
    ]);
    expect(at(wholeImageFill(img, 5, 1, GAP), 5, 6)).toEqual(KEY["."]);
    expect(at(wholeImageFill(img, 5, 1, 0), 5, 6)).toEqual([...RED, 255]);
  });

  it.each([
    ["a closed shape with soft edges", SHEET, 6, 5, GAP],
    ["a closed shape's sharp corners", TRIANGLE, 12, 4, 2 * GAP],
    ["a closed loop with no room as wide as the gap", LOOP, 4, 2, 2 * GAP],
    ["a color joined narrower than the gap", DUMBBELL, 3, 3, GAP],
  ])("fills %s as it would without closing gaps", (_, img, x, y, gap) => {
    expect(wholeImageFill(img, x, y, gap).data).toEqual(wholeImageFill(img, x, y, 0).data);
  });
});

describe("floodSheet", () => {
  it.each([
    ["inside the closed shape", SHEET, 6, 5, 0],
    ["on open paper", SHEET, 0, 0, 0],
    ["on the colored patch", SHEET, 19, 4, 0],
    ["inside the closed shape, closing gaps", SHEET, 6, 5, GAP],
    ["inside a shape whose opening it closes", OPENING, 5, 4, GAP],
    ["outside that shape", OPENING, 15, 10, GAP],
    ["in that shape's opening", OPENING, 6, 7, GAP],
  ])("gives the whole-image fill's pixels %s, whatever box it reads first", (_, img, x, y, gap) => {
    const expected = wholeImageFill(img, x, y, gap).data;
    // Every size moves the box's sides across the region: cutting it, touching it or its tuck, clearing it.
    for (let near = 1; near <= img.width + 2; near++) {
      expect(sheetFill(img, x, y, gap, near).out.data, `near ${near}`).toEqual(expected);
    }
  });

  it.each([0, GAP])(
    "reads only the box around the seed when the region and its tuck fit inside it, closing gaps of %s",
    (gap) => {
      const { reads } = sheetFill(SHEET, 6, 5, gap, 16);
      expect(reads).toHaveLength(1);
      expect(reads[0].w * reads[0].h).toBeLessThan(SHEET.width * SHEET.height);
    },
  );
});
```

- [ ] **Step 2: Run, expecting failures:** `pnpm --filter frontend exec vitest run src/sticker-creation/canvas/fill.test.ts`.

- [ ] **Step 3: Implement.** `fill.ts` becomes:

```ts
import type { Rect } from "../sealing/stickerLayers";

/** Structural subset of ImageData, so the fill runs in tests without a DOM. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Which sides of the pixels were cut from a bigger image, so a region may go on past them. */
interface Cut {
  left: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
}

type Rgb = readonly [number, number, number];

/** The extremes of the pixels a flood took in, inclusive. */
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Whether a box with these extremes comes near a side cut from a bigger image. */
type NearCut = (x0: number, y0: number, x1: number, y1: number) => boolean;

/**
 * The widest opening, in sheet units, a fill on paper treats as closed, so a line that stops just
 * short of meeting itself still holds the fill. Each fill records its own, so changing this leaves
 * every drawing as it was drawn.
 */
export const FILL_GAP = 2;

/** Pixels fainter than this are empty paper. */
const EMPTY_ALPHA = 128;
/** A colored region takes in pixels whose summed |ΔRGB| from the tapped pixel is under this. */
const REGION_TOLERANCE = 72;
/** A tap on a color this close to the fill color changes nothing. */
const SAME_COLOR = 8;
/** The fill reaches this many pixels under neighboring edges, so no white halo shows between color and line. */
const TUCK = 2;
/** A region this close to a cut side may go on past it, or tuck under pixels beyond it. */
const CLEAR = Math.max(TUCK, 1);
/** Chamfer steps, in thirds of a pixel: to the pixel beside, and to the pixel across a corner. */
const SIDE = 3;
const CORNER = 4;
/** Distances stop at this many thirds of a pixel, so a byte holds each. */
const FAR = 255;

/** Marks in a flood's `region`. The region's own pixels: */
const IN = 1;
/** Paper that goes to other open paper, so it stays as it is: */
const OUT = 2;
/** Paper near a cut side, which open paper past that side may be nearer: */
const UNSEEN = 3;
/** Paper searched for the open paper nearest a tap near a line: */
const SEARCHED = 4;

const rgbDistance = (data: Uint8ClampedArray, i: number, [r, g, b]: Rgb) =>
  Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);

/**
 * Scanline flood fill from (sx, sy), in the pixels' own units. It takes in empty paper, or a colored
 * region of similar colors, and tucks the fill under what borders it. On paper, openings in the lines
 * up to about `gap` across hold the fill as if closed (`closeGaps`). Returns the box it changed, or
 * null when nothing changed: the seed is off the image or already the fill color. With `cut` sides
 * it answers "past", changing nothing, once the region comes close enough to one to go on beyond it.
 */
export function floodFill(img: Pixels, sx: number, sy: number, fill: Rgb, gap: number): Rect | null;
export function floodFill(
  img: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut: Cut,
): Rect | "past" | null;
export function floodFill(
  img: Pixels,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  cut?: Cut,
): Rect | "past" | null {
  const { width: w, height: h, data } = img;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const seed = (sy * w + sx) * 4;
  const target: Rgb = [data[seed], data[seed + 1], data[seed + 2]];
  const empty = data[seed + 3] < EMPTY_ALPHA;
  if (!empty && rgbDistance(data, seed, fill) < SAME_COLOR) return null;

  // Half the widest opening closed, in thirds of a pixel. A fill on a color closes none, so a stroke
  // thinner than the gap still recolors whole.
  const reach = empty ? Math.min((gap * SIDE) / 2, FAR - 1) : 0;
  const far = reach > 0 ? lineDistances(img, cut) : null;
  // Lines past a cut side are unseen, so paper this near one may be nearer them than it looks.
  const margin = reach > 0 ? Math.max(CLEAR, Math.ceil(reach / SIDE) + 1) : CLEAR;
  const nearCut: NearCut = (x0, y0, x1, y1) =>
    cut !== undefined &&
    ((cut.left && x0 < margin) ||
      (cut.top && y0 < margin) ||
      (cut.right && x1 > w - 1 - margin) ||
      (cut.bottom && y1 > h - 1 - margin));

  const region = new Uint8Array(w * h);
  // One test for every kind of region, so the engine's optimized flood survives a switch between them.
  const open = (p: number) => {
    if (region[p]) return false;
    const i = p * 4;
    if (!empty)
      return data[i + 3] >= EMPTY_ALPHA && rgbDistance(data, i, target) < REGION_TOLERANCE;
    return data[i + 3] < EMPTY_ALPHA && (far === null || far[p] > reach);
  };
  const box =
    far === null
      ? scanFill(region, w, h, sx, sy, open, false, nearCut)
      : closeGaps(region, far, reach, w, h, sx, sy, open, nearCut);
  if (box === "past") return "past";

  const bx0 = Math.max(0, box.x0 - TUCK);
  const bx1 = Math.min(w - 1, box.x1 + TUCK);
  const by0 = Math.max(0, box.y0 - TUCK);
  const by1 = Math.min(h - 1, box.y1 + TUCK);
  const tucked = dilate(region, w, bx0, bx1, by0, by1);
  const [fr, fg, fb] = fill;
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const p = y * w + x;
      if (!tucked[p]) continue;
      const i = p * 4;
      // The region takes the fill; its surroundings keep their color over it, by their own alpha.
      const a = region[p] === IN ? 0 : data[i + 3] / 255;
      data[i] = data[i] * a + fr * (1 - a);
      data[i + 1] = data[i + 1] * a + fg * (1 - a);
      data[i + 2] = data[i + 2] * a + fb * (1 - a);
      data[i + 3] = 255;
    }
  }
  return { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
}

/**
 * Marks IN in `region` what `open` takes in from (sx, sy), a run along a row at a time; with
 * `corners`, a run reaches the rows beside it across a corner too. Returns the box it marked, or
 * "past" once that box comes near a cut side.
 */
function scanFill(
  region: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
  open: (p: number) => boolean,
  corners: boolean,
  nearCut: NearCut,
): Box | "past" {
  const box: Box = { x0: sx, y0: sy, x1: sx, y1: sy };
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop() ?? 0;
    let x = stack.pop() ?? 0;
    while (x > 0 && open(y * w + x - 1)) x--;
    // Taken in by another run since it was stacked.
    if (!open(y * w + x)) continue;
    let up = false;
    let down = false;
    if (corners && x > 0) {
      up = y > 0 && open((y - 1) * w + x - 1);
      if (up) stack.push(x - 1, y - 1);
      down = y < h - 1 && open((y + 1) * w + x - 1);
      if (down) stack.push(x - 1, y + 1);
    }
    for (; x < w && open(y * w + x); x++) {
      const p = y * w + x;
      region[p] = IN;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y > 0) {
        const next = open(p - w);
        if (next && !up) stack.push(x, y - 1);
        up = next;
      }
      if (y < h - 1) {
        const next = open(p + w);
        if (next && !down) stack.push(x, y + 1);
        down = next;
      }
    }
    if (corners && x < w) {
      if (y > 0 && !up && open((y - 1) * w + x)) stack.push(x, y - 1);
      if (y < h - 1 && !down && open((y + 1) * w + x)) stack.push(x, y + 1);
    }
    if (y < box.y0) box.y0 = y;
    if (y > box.y1) box.y1 = y;
    if (nearCut(box.x0, box.y0, box.x1, box.y1)) return "past";
  }
  return box;
}

/**
 * The flood on paper with openings up to twice `reach` closed. Open paper, farther than `reach`
 * from every line, floods from the tap, or from the open paper nearest a tap near a line, and none
 * fits through a closed opening. Each pixel of paper near a line then goes to the open paper nearest
 * it, in steps through paper, and to the region when it's as near as any, so the region stops about
 * midway across an opening and still fills its corners. A tap on paper with no open paper takes
 * that paper whole.
 */
function closeGaps(
  region: Uint8Array,
  far: Uint8Array,
  reach: number,
  w: number,
  h: number,
  sx: number,
  sy: number,
  open: (p: number) => boolean,
  nearCut: NearCut,
): Box | "past" {
  const lineNear = (p: number) => far[p] > 0 && far[p] <= reach;
  let start = sy * w + sx;
  if (lineNear(start)) {
    const searched = [start];
    region[start] = SEARCHED;
    let found = -1;
    const search = (q: number) => {
      if (found >= 0 || region[q] || far[q] === 0) return;
      if (far[q] > reach) {
        found = q;
        return;
      }
      region[q] = SEARCHED;
      searched.push(q);
    };
    for (let head = 0; head < searched.length && found < 0; head++) {
      const p = searched[head];
      const x = p % w;
      const y = (p - x) / w;
      if (nearCut(x, y, x, y)) return "past";
      eachBeside(p, w, h, search);
    }
    if (found < 0) {
      // Every pixel of this paper is near a line, so it has no opening to close: it all fills.
      const box: Box = { x0: sx, y0: sy, x1: sx, y1: sy };
      for (const p of searched) {
        region[p] = IN;
        extend(box, p, w);
      }
      return box;
    }
    for (const p of searched) region[p] = 0;
    start = found;
  }
  const box = scanFill(region, w, h, start % w, Math.floor(start / w), open, true, nearCut);
  if (box === "past") return "past";

  // Claims start from open paper beside paper near a line, the region's first, so paper as near the
  // region as any other open paper goes to the region. Paper near a cut side starts UNSEEN.
  const claims: number[] = [];
  const others: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const d = far[p];
      if (d === 0) continue;
      const unseen = nearCut(x, y, x, y);
      if (d <= reach) {
        if (unseen) {
          region[p] = UNSEEN;
          others.push(p);
        }
        continue;
      }
      const besideNear =
        (x > 0 && lineNear(p - 1)) ||
        (x < w - 1 && lineNear(p + 1)) ||
        (y > 0 && lineNear(p - w)) ||
        (y < h - 1 && lineNear(p + w));
      if (!besideNear) continue;
      if (region[p] === IN) claims.push(p);
      else {
        region[p] = unseen ? UNSEEN : OUT;
        others.push(p);
      }
    }
  }
  for (const p of others) claims.push(p);
  let from = IN;
  let met = false;
  const claim = (q: number) => {
    const at = region[q];
    if (at === 0) {
      if (!lineNear(q)) return;
      region[q] = from;
      claims.push(q);
    } else if ((from === IN && at === UNSEEN) || (from === UNSEEN && at === IN)) met = true;
  };
  for (let head = 0; head < claims.length && !met; head++) {
    const p = claims[head];
    from = region[p];
    eachBeside(p, w, h, claim);
  }
  // The region meets paper that open paper past a cut side may claim: only the whole sheet settles it.
  if (met) return "past";
  for (const p of claims) if (region[p] === IN) extend(box, p, w);
  return box;
}

/**
 * Each pixel's chamfer distance to the nearest line, in thirds of a pixel and at most FAR. Lines are
 * pixels as opaque as EMPTY_ALPHA, and the sheet's edge past each side that isn't cut, which closes
 * a gap as a line does. Chamfer distances come within a few percent of true ones, in a byte a pixel.
 */
function lineDistances({ width: w, height: h, data }: Pixels, cut: Cut | undefined): Uint8Array {
  const far = new Uint8Array(w * h);
  // Past a cut side the lines are unseen, so none is counted there.
  const left = cut?.left ? FAR : 0;
  const top = cut?.top ? FAR : 0;
  const right = cut?.right ? FAR : 0;
  const bottom = cut?.bottom ? FAR : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (data[p * 4 + 3] >= EMPTY_ALPHA) continue;
      let d = Math.min((x > 0 ? far[p - 1] : left) + SIDE, (y > 0 ? far[p - w] : top) + SIDE);
      if (y > 0 && x > 0) d = Math.min(d, far[p - w - 1] + CORNER);
      if (y > 0 && x < w - 1) d = Math.min(d, far[p - w + 1] + CORNER);
      far[p] = Math.min(d, FAR);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (far[p] === 0) continue;
      let d = Math.min(
        far[p],
        (x < w - 1 ? far[p + 1] : right) + SIDE,
        (y < h - 1 ? far[p + w] : bottom) + SIDE,
      );
      if (y < h - 1 && x < w - 1) d = Math.min(d, far[p + w + 1] + CORNER);
      if (y < h - 1 && x > 0) d = Math.min(d, far[p + w - 1] + CORNER);
      far[p] = d;
    }
  }
  return far;
}

/** Calls `visit` with each pixel beside p, left, right, above and below, that's on the image. */
function eachBeside(p: number, w: number, h: number, visit: (q: number) => void): void {
  const x = p % w;
  if (x > 0) visit(p - 1);
  if (x < w - 1) visit(p + 1);
  if (p >= w) visit(p - w);
  if (p < w * (h - 1)) visit(p + w);
}

/** Grows `box` to take in pixel p. */
function extend(box: Box, p: number, w: number): void {
  const x = p % w;
  const y = (p - x) / w;
  if (x < box.x0) box.x0 = x;
  if (x > box.x1) box.x1 = x;
  if (y < box.y0) box.y0 = y;
  if (y > box.y1) box.y1 = y;
}
```

Then `SheetFlood` as it is, and:

```ts
/**
 * Floods a sheet from (sx, sy), closing openings up to `gap` across, reading its pixels through
 * `read`: first a square about `near` px on a side around the seed, then the whole sheet only when
 * the region reaches past that square, so a small shape's fill reads a small box. Null when nothing
 * changed.
 */
export function floodSheet<P extends Pixels>(
  sheet: { width: number; height: number },
  read: (box: Rect) => P,
  sx: number,
  sy: number,
  fill: Rgb,
  gap: number,
  near: number,
): SheetFlood<P> | null {
  const { width, height } = sheet;
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
  const half = Math.floor(near / 2);
  const x = Math.max(0, sx - half);
  const y = Math.max(0, sy - half);
  const around = {
    x,
    y,
    w: Math.min(width, sx + half + 1) - x,
    h: Math.min(height, sy + half + 1) - y,
  };
  const pixels = read(around);
  const cut = {
    left: around.x > 0,
    top: around.y > 0,
    right: around.x + around.w < width,
    bottom: around.y + around.h < height,
  };
  const changed = floodFill(pixels, sx - around.x, sy - around.y, fill, gap, cut);
  if (changed !== "past") return changed && { pixels, at: around, changed };
  const whole = { x: 0, y: 0, w: width, h: height };
  const all = read(whole);
  const changedAll = floodFill(all, sx, sy, fill, gap);
  return changedAll && { pixels: all, at: whole, changed: changedAll };
}

/** The region grown by `TUCK` pixels in every direction (a square), within the given box. */
function dilate(
  region: Uint8Array,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): Uint8Array {
  // Two one-dimensional passes grow the same square as checking every neighbor, for far less work.
  const rows = new Uint8Array(region.length);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let dx = -TUCK; dx <= TUCK; dx++) {
        const nx = x + dx;
        if (nx >= x0 && nx <= x1 && region[y * w + nx] === IN) {
          rows[y * w + x] = 1;
          break;
        }
      }
    }
  }
  const grown = new Uint8Array(region.length);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let dy = -TUCK; dy <= TUCK; dy++) {
        const ny = y + dy;
        if (ny >= y0 && ny <= y1 && rows[ny * w + x]) {
          grown[y * w + x] = 1;
          break;
        }
      }
    }
  }
  return grown;
}
```

`inkSurface.ts`, `fill(op)`: pass `op.gap * this.dpr,` after `hexToRgb(op.color),`.

`PRODUCT.md`, the Tools line: `brush, eraser and fill, which closes small gaps in the lines around it on paper;` in place of `brush, eraser and fill;`.

- [ ] **Step 4: Run** `pnpm --filter frontend exec vitest run src/sticker-creation src/sticker-board/timelapse` and `pnpm --filter frontend typecheck`. Expected: all pass. A sliver left unfilled in the triangle's tips means the open paper broke into islands there: check `scanFill`'s corner pushes before anything else.
- [ ] **Step 5: Commit** `fill.ts`, `fill.test.ts`, `inkSurface.ts`, `PRODUCT.md`: `feat(frontend): a fill on paper closes small gaps in its lines`.

### Task 3: A timelapse's density is always recorded

The API's schema requires `density`, so `decodeTimelapse`'s null and `drawingDensity`'s estimate from the image never run.

**Files:** `sealing/timelapse.ts`; `sticker-board/timelapse/timelapseCrop.ts`, `timelapseCrop.test.ts`, `timelapsePlayer.ts`, `timelapsePlayer.test.ts`, `useTimelapse.ts`, `useTimelapse.test.tsx`

- [ ] **Step 1: Tests.** In `timelapseCrop.test.ts`, delete `sealedSquare`, the two estimate tests and the imports only they used (`dieCut`, `BORDER_UNITS`, `stickerLayers`, `encodeTimelapse`, `decodeTimelapse`, `CAPPED_IMAGE_SIDE`), and the density test becomes:

```ts
describe("the density a sticker was drawn at", () => {
  it("is the recorded one, up to the densest any sheet that size was backed at", () => {
    const ink = { width: 150, height: 150 };
    const most = maxInkDensity({ w: ink.width, h: ink.height });
    // An iPad's sheet is backed denser than any screen's own pixels, and its fills flood at that.
    expect(drawingDensity({ ink, density: most - 1 })).toBe(most - 1);
    expect(drawingDensity({ ink, density: most + 1 })).toBe(most);
    // A sheet the size of a big screen, backed at the screen's own density, floods as it did.
    const side = Math.sqrt(MAX_INK_PIXELS);
    const big = { width: side, height: side };
    expect(drawingDensity({ ink: big, density: MAX_DPR - 1 })).toBe(MAX_DPR - 1);
    expect(drawingDensity({ ink: big, density: MAX_DPR + 1 })).toBe(MAX_DPR);
  });
});
```

`timelapsePlayer.test.ts`: drop `image: { width: PLACE.w, height: PLACE.h },`. `useTimelapse.test.tsx`: `STICKER` drops `width` and `height`; drop `expect(player.options.image)…`.

- [ ] **Step 2: Implement.** `sealing/timelapse.ts`: `DecodedTimelapse.density` becomes `/** Device pixels per sheet unit where it was drawn. */ density: number;`, and the decode sets `density: timelapse.density`. `timelapseCrop.ts`: delete `CAPPED_IMAGE_SIDE` and its comment; `drawingDensity` becomes

```ts
/**
 * Device pixels per sheet unit where the sticker was drawn, which its fills flood at, kept up to the
 * densest any sheet that size was backed at, so a replay floods as the drawing did.
 */
export function drawingDensity(timelapse: Pick<DecodedTimelapse, "density" | "ink">): number {
  const most = maxInkDensity({ w: timelapse.ink.width, h: timelapse.ink.height });
  return Math.min(timelapse.density, Math.max(MAX_DPR, most));
}
```

`timelapsePlayer.ts`: drop `image` and its comment from `TimelapsePlayerOptions`; `density: drawingDensity(timelapse),`. `useTimelapse.ts`: drop `image: { width: target.width, height: target.height },`; `TimelapseSticker` becomes `Pick<BoardSticker, "id" | "no" | "urls">`.

- [ ] **Step 3: Run** `pnpm --filter frontend exec vitest run src/sticker-board src/sticker-creation/sealing`, `pnpm --filter frontend typecheck` and `pnpm --filter frontend lint`. Expected: pass, with no unused imports left.
- [ ] **Step 4: Commit** those files: `refactor(frontend): a timelapse always records its density, so nothing estimates one`.

### Task 4: Check, calibrate and time

- [ ] **Step 1:** `pnpm check` from the worktree's root. Expected: lint, typecheck, tests, format and the Move tests pass.
- [ ] **Step 2: The calibration page** (one-shot, untracked, deleted in Step 5). `apps/frontend/scratch-fill/index.html`:

```html
<!doctype html>
<meta charset="utf-8" />
<title>Fill gap calibration</title>
<body style="margin: 8px; font: 12px system-ui; background: #fff"></body>
<script type="module" src="./main.ts"></script>
```

`apps/frontend/scratch-fill/main.ts`:

```ts
// One-shot calibration for docs/superpowers/plans/2026-10-09-fill-gap-closing.md: fills real strokes
// with openings of 1 to 6 units at several gaps, and times fills. Never committed; deleted once reported.
import { InkSurface } from "../src/sticker-creation/canvas/inkSurface";
import type { FillOp, StrokeOp } from "../src/sticker-creation/canvas/ops";
import { maxInkDensity, type SheetFrame } from "../src/sticker-creation/canvas/sheetFrame";

const INK = "#1c1824";
const RED = "#ff3b30";
/** The default brush's width, units. */
const BRUSH = 6.9;
const OPENINGS = [1, 2, 3, 4, 5, 6];
const GAPS = [0, 2, 3, 4];
const SQUARE = 40;
/** A 3× phone. */
const DENSITY = 3;

const stroke = (pts: [number, number][]): StrokeOp => ({
  tool: "brush",
  color: INK,
  T: 0,
  pts: pts.flatMap(([x, y], i) => [x, y, BRUSH, i * 16]),
});
/** A square from (x, y) whose stroke stops `opening` units short of meeting itself, caps and all. */
const square = (x: number, y: number, opening: number) =>
  stroke([
    [x + opening + BRUSH, y],
    [x + SQUARE, y],
    [x + SQUARE, y + SQUARE],
    [x, y + SQUARE],
    [x, y],
  ]);
/** Two rooms joined by a doorway `waist` units wide. */
const rooms = (x: number, y: number, waist: number) => [
  stroke([
    [x, y],
    [x + 100, y],
    [x + 100, y + 40],
    [x, y + 40],
    [x, y],
  ]),
  stroke([
    [x + 50, y],
    [x + 50, y + 20 - waist / 2 - BRUSH / 2],
  ]),
  stroke([
    [x + 50, y + 40],
    [x + 50, y + 20 + waist / 2 + BRUSH / 2],
  ]),
];
const fillAt = (x: number, y: number, gap: number): FillOp => ({
  tool: "fill",
  x,
  y,
  color: RED,
  gap,
  T: 0,
});

function sheet(frame: SheetFrame, strokes: StrokeOp[]) {
  const canvas = document.createElement("canvas");
  const surface = new InkSurface(canvas);
  surface.setFrame(frame);
  for (const each of strokes) surface.apply(each);
  // Drawing waits on the GPU; reading a pixel settles it, as the frames before a real tap do.
  canvas.getContext("2d")?.getImageData(0, 0, 1, 1);
  return { canvas, surface };
}
function filledAt(canvas: HTMLCanvasElement, x: number, y: number) {
  const [r, g, , a] =
    canvas.getContext("2d")?.getImageData(Math.floor(x * DENSITY), Math.floor(y * DENSITY), 1, 1)
      .data ?? [];
  return a > 0 && r > 200 && g < 120;
}
function show(label: string, canvas: HTMLCanvasElement, w: number) {
  const figure = document.createElement("figure");
  figure.style.cssText = "display:inline-block;margin:4px;text-align:center";
  canvas.style.cssText = `width:${w}px;background:#fff;outline:1px solid #ccc`;
  figure.append(
    canvas,
    Object.assign(document.createElement("figcaption"), { textContent: label }),
  );
  document.body.append(figure);
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const held: Record<string, Record<string, string>> = {};
const cell: SheetFrame = { w: 56, h: 60, density: DENSITY };
for (const gap of GAPS) {
  held[`gap ${gap}`] = {};
  document.body.append(Object.assign(document.createElement("h3"), { textContent: `Gap ${gap}` }));
  for (const opening of OPENINGS) {
    const { canvas, surface } = sheet(cell, [square(8, 12, opening)]);
    surface.fill(fillAt(28, 32, gap));
    held[`gap ${gap}`][`opening ${opening}`] = filledAt(canvas, 2, 2) ? "leaked" : "held";
    show(`opening ${opening}`, canvas, cell.w * 2);
  }
  for (const waist of [3, 5]) {
    const frame: SheetFrame = { w: 116, h: 56, density: DENSITY };
    const { canvas, surface } = sheet(frame, rooms(8, 8, waist));
    surface.fill(fillAt(30, 28, gap));
    held[`gap ${gap}`][`doorway ${waist}`] = filledAt(canvas, 84, 28) ? "both rooms" : "one room";
    show(`doorway ${waist}`, canvas, frame.w * 2);
  }
}

// Timings on the densest sheet: 6 × 13 closed squares, then a background fill and a small one.
const tall = { w: 374, h: 823 };
const full: SheetFrame = { ...tall, density: maxInkDensity(tall) };
const squares: StrokeOp[] = [];
for (let row = 0; row < 13; row++)
  for (let col = 0; col < 6; col++) squares.push(square(12 + col * 60, 12 + row * 62, 0));
const timing: Record<string, number> = {};
for (const gap of [0, 2, 3, 4]) {
  for (const [name, x, y] of [
    ["background", 4, 4],
    ["one square", 32, 32],
  ] as const) {
    const ms: number[] = [];
    for (let run = 0; run < 5; run++) {
      const { canvas, surface } = sheet(full, squares);
      const began = performance.now();
      surface.fill(fillAt(x, y, gap));
      ms.push(performance.now() - began);
      canvas.width = 0;
    }
    timing[`${name}, gap ${gap}`] = Math.round(median(ms) * 10) / 10;
  }
}
Object.assign(window, {
  results: {
    held,
    timing,
    sheet: `${Math.round(full.w * full.density)} × ${Math.round(full.h * full.density)} px`,
  },
  done: true,
});
```

`apps/frontend/scratch-fill/run.mjs` (Playwright's module path per browser, since WebKit needs the 1.64 copy):

```js
// One-shot: drives the calibration page in Chromium and WebKit. Never committed.
import { mkdirSync, writeFileSync } from "node:fs";
const [, , label, chromiumFrom, webkitFrom] = process.argv;
const OUT = "/tmp/fill-gap-calibration";
mkdirSync(OUT, { recursive: true });
for (const [name, from] of [
  ["chromium", chromiumFrom],
  ["webkit", webkitFrom],
]) {
  const playwright = await import(from);
  const browser = await playwright[name].launch();
  const page = await browser.newPage({
    viewport: { width: 760, height: 900 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (error) => console.error(`[${name}] ${error.message}`));
  await page.goto("http://localhost:5191/scratch-fill/index.html");
  await page.waitForFunction(() => window.done === true, null, { timeout: 180_000 });
  const results = await page.evaluate(() => window.results);
  writeFileSync(`${OUT}/${label}-${name}.json`, JSON.stringify(results, null, 2));
  await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true });
  console.log(`${label} ${name}`, JSON.stringify(results, null, 1));
  await browser.close();
}
```

- [ ] **Step 3: Run it** from the worktree's `apps/frontend`: `node scratch-fill/run.mjs after "$PWD/node_modules/@playwright/test/index.mjs" /Users/adoll/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs`. Builds 2336 and 2342 of WebKit, which 1.63 knows, stopped opening pages on 2026-10-08, so WebKit comes from the 1.64 copy. If 1.63's Chromium build is missing, pass the 1.64 path for both. Never run `playwright install` with either: it deletes builds other installs use. Expected: a JSON and PNG per browser in `/tmp/fill-gap-calibration/`.
- [ ] **Step 4: Pick `FILL_GAP`.** Keep 2, the small increase ad0ll asked for, when gap 2 holds the 1-unit opening and lets the 3-unit and wider ones out, in both browsers; 2 units sits on the threshold either way. If it doesn't, the fill is wrong: go back to Task 2, not to the constant. The gap 3 and 4 rows go in the report for ad0ll to choose a larger gap. Record the table and the before/after timings.
- [ ] **Step 5:** Delete `apps/frontend/scratch-fill/`, and stop Vite with TaskStop.

### Task 5: Merge and clean up

- [ ] **Step 1:** Squash the branch into two commits, without AI attribution lines: `feat: a fill on paper closes small gaps in its lines, and records the gap it closed` (Tasks 1, 2 and any tune) and Task 3's refactor.
- [ ] **Step 2:** In the worktree, `git merge main`, then rerun the touched suites if main moved under `sticker-creation`, `sticker-board/timelapse` or `apps/api/src/stickers`. In one command from the main checkout: `git merge-base --is-ancestor main feat/fill-gap-closing && git merge --ff-only feat/fill-gap-closing`; on a conflict there, `git merge --abort` at once and settle it in the worktree.
- [ ] **Step 3:** `git push origin main`.
- [ ] **Step 4:** Delete this plan and the spec from main (a `docs:` commit with explicit pathspecs), then remove the worktree and the branch.
