// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { contextOf, forgetContexts, madeContexts } from "../../sticker-board/timelapse/testCanvas";
import type { FillOp, LayerId, LayerStep } from "../canvas/ops";
import type { SheetFrame } from "../canvas/sheetFrame";
import type { Rect } from "../sealing/stickerPasses";
import { compositeLayers } from "./composite";
import { LayerInk } from "./layerInk";
import { FULL_OPACITY, type Layer, type LayerState } from "./layerState";
import { brush, clearLayer, deleteLayer, fill } from "./testLayerSteps";

vi.mock("../canvas/context2d", () => import("../canvas/testContext2d"));
vi.mock("./composite", async (importOriginal) => {
  const real = await importOriginal<{ compositeLayers: typeof compositeLayers }>();
  return { compositeLayers: vi.fn(real.compositeLayers) };
});

/** 8 sheet units square at 2 device px a unit: every region below is in device px. */
const FRAME: SheetFrame = { w: 8, h: 8, density: 2 };
const SIDE = FRAME.w * FRAME.density;
const WHOLE: Rect = { x: 0, y: 0, w: SIDE, h: SIDE };
const LEFT: Rect = { x: 0, y: 0, w: SIDE / 2, h: SIDE };
const RIGHT: Rect = { x: SIDE / 2, y: 0, w: SIDE / 2, h: SIDE };
/** A square outline, one px thick, and the paper inside it. */
const OUTLINE = { x: 2, y: 2, w: 12, h: 12 };
const INSIDE: Rect = { x: 3, y: 3, w: 10, h: 10 };

type Rgba = readonly number[];
const RED: Rgba = [255, 0, 0, 255];
const GREEN: Rgba = [0, 255, 0, 255];
const BLUE: Rgba = [0, 0, 255, 255];
const INK: Rgba = [28, 24, 36, 255];
const CLEAR: Rgba = [0, 0, 0, 0];

const layer = (id: LayerId, overrides: Partial<Layer> = {}): Layer => ({
  id,
  opacity: FULL_OPACITY,
  locked: false,
  clipped: false,
  ...overrides,
});
const stateOf = (...layers: Layer[]): LayerState => ({
  layers,
  nextId: Math.max(...layers.map((l) => l.id)) + 1,
});
const ONE = stateOf(layer(1));
/** A color layer under a line art layer. */
const TWO = stateOf(layer(1), layer(2));
const LOCKED_UNDER_LINES = stateOf(layer(1, { locked: true }), layer(2));

/** Too faint to hold a fill, so a fill takes it for paper. */
const FAINT_BLUE: Rgba = [0, 0, 255, 100];
const FAINT_RED: Rgba = [255, 0, 0, 100];
/** Where the color layer has a faint wash: inside the outline's left half, and above the outline. */
const WASH_INSIDE: Rect = { ...INSIDE, w: INSIDE.w / 2 };
const WASH_ABOVE: Rect = { x: 0, y: 0, w: SIDE, h: OUTLINE.y };

function sheet(): LayerInk {
  const ink = new LayerInk();
  ink.setFrame(FRAME);
  return ink;
}

/**
 * A brush stroke on layer `id` that inks `region` in `color`. The fake canvas paints no paths, so
 * the stroke's pixels are put on the layer's canvas once the stroke has made it.
 */
function paint(ink: LayerInk, state: LayerState, id: LayerId, region: Rect, color: Rgba) {
  ink.apply(
    { ...brush(id), pts: [region.x / FRAME.density, region.y / FRAME.density, 1, 0] },
    state,
  );
  const g = contextOf(mustCanvas(ink, id));
  const image = new ImageData(region.w, region.h);
  for (let i = 0; i < image.data.length; i += 4) image.data.set(color, i);
  g?.putImageData(image, region.x, region.y);
}

/** Line art on layer 2: OUTLINE's four sides. */
function drawOutline(ink: LayerInk) {
  const { x, y, w, h } = OUTLINE;
  for (const side of [
    { x, y, w, h: 1 },
    { x, y: y + h - 1, w, h: 1 },
    { x, y, w: 1, h },
    { x: x + w - 1, y, w: 1, h },
  ]) {
    paint(ink, TWO, 2, side, INK);
  }
}

function mustCanvas(ink: LayerInk, id: LayerId): HTMLCanvasElement {
  const canvas = ink.layerCanvas(id);
  if (!canvas) throw new Error(`Layer ${id} has no canvas`);
  return canvas;
}

/** The layer's pixel at (x, y): clear where it has no canvas. */
function pixel(ink: LayerInk, id: LayerId, x: number, y: number): Rgba {
  const canvas = ink.layerCanvas(id);
  return canvas ? [...(contextOf(canvas)?.getImageData(x, y, 1, 1).data ?? [])] : CLEAR;
}

const pixelsOf = (ink: LayerInk, id: LayerId) => [
  ...(contextOf(mustCanvas(ink, id))?.getImageData(0, 0, SIDE, SIDE).data ?? []),
];

/** A layer's pixels, as `pixelsOf` gives them: clear but for each patch in its color. */
function pixelsWith(...patches: [Rect, Rgba][]): number[] {
  const image = new ImageData(SIDE, SIDE);
  for (const [{ x, y, w, h }, color] of patches) {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) image.data.set(color, (row * SIDE + col) * 4);
    }
  }
  return [...image.data];
}

/** Canvases made in this test that still hold memory. */
const liveCanvases = () => madeContexts().filter(({ canvas }) => canvas.width > 0).length;

const fillAt = (id: LayerId, at: { x: number; y: number }, color = "#ff0000"): FillOp => ({
  ...fill(id),
  ...at,
  color,
});

/** Holds on layer 1 at three versions: two on red, one on blue, and one on green, the layer as it is. */
function heldVersions() {
  const ink = sheet();
  paint(ink, ONE, 1, WHOLE, RED);
  const red = [ink.hold(1), ink.hold(1)];
  paint(ink, ONE, 1, WHOLE, BLUE);
  const blue = ink.hold(1);
  paint(ink, ONE, 1, WHOLE, GREEN);
  const green = ink.hold(1);
  return { ink, red, blue, green };
}

afterEach(() => {
  vi.clearAllMocks();
  forgetContexts();
});

describe("the layer ink's holds", () => {
  it("share the layer's canvas until it's next written, then one copy serves every hold made before", () => {
    const ink = sheet();
    paint(ink, ONE, 1, WHOLE, RED);
    ink.hold(1);
    ink.hold(1);
    expect(ink.copiesHeld).toBe(0);
    paint(ink, ONE, 1, WHOLE, BLUE);
    expect(ink.copiesHeld).toBe(1);
    paint(ink, ONE, 1, WHOLE, GREEN);
    expect(ink.copiesHeld).toBe(1);
    ink.hold(1);
    paint(ink, ONE, 1, WHOLE, RED);
    expect(ink.copiesHeld).toBe(2);
  });

  it("count a copy as freed only when every hold sharing it lets go", () => {
    const { ink, red, blue, green } = heldVersions();
    expect(ink.copiesHeld).toBe(2);
    expect(ink.copiesFreedBy([red[0]])).toBe(0);
    expect(ink.copiesFreedBy(red)).toBe(1);
    expect(ink.copiesFreedBy([blue, blue])).toBe(1);
    // Green shares the layer's own canvas, which no hold frees.
    expect(ink.copiesFreedBy([green])).toBe(0);
    expect(ink.copiesFreedBy([...red, blue, green])).toBe(2);
  });

  it("restore the pixels each held, blank the layer for null, and write nothing for a hold that shares it", () => {
    const { ink, red, blue, green } = heldVersions();
    ink.restore(1, green);
    expect(ink.copiesHeld).toBe(2);
    ink.restore(1, red[1]);
    expect(pixel(ink, 1, 5, 5)).toEqual(RED);
    ink.restore(1, blue);
    expect(pixel(ink, 1, 5, 5)).toEqual(BLUE);
    // Green kept its pixels through the restores that wrote over them.
    ink.restore(1, green);
    expect(pixel(ink, 1, 5, 5)).toEqual(GREEN);
    ink.restore(1, null);
    expect(ink.layerCanvas(1)).toBeNull();
  });

  it("free a copy's canvas once the last hold on it is released", () => {
    const { ink, red } = heldVersions();
    const held = liveCanvases();
    ink.release(red[0]);
    expect([ink.copiesHeld, liveCanvases()]).toEqual([2, held]);
    ink.release(red[1]);
    expect([ink.copiesHeld, liveCanvases()]).toEqual([1, held - 1]);
  });

  it.each<[string, LayerStep]>([
    ["clear", clearLayer(1)],
    ["delete", deleteLayer(1)],
  ])("keep the original pixels after a %s without allocating a replacement copy", (_, step) => {
    const ink = sheet();
    paint(ink, TWO, 1, WHOLE, RED);
    const hold = ink.hold(1);
    const canvas = mustCanvas(ink, 1);
    const count = liveCanvases();
    ink.apply(step, TWO);
    expect(ink.layerCanvas(1)).toBeNull();
    expect(liveCanvases()).toBe(count);
    ink.restore(1, hold);
    expect(pixel(ink, 1, 5, 5)).toEqual(RED);
    ink.release(hold);
    expect(canvas.width).toBe(0);
  });

  it("can't be restored once a new frame lets go of every canvas, the holds' copies too", () => {
    const { ink, red } = heldVersions();
    expect(ink.setFrame(FRAME)).toBe(false);
    expect(ink.setFrame({ ...FRAME, density: FRAME.density + 1 })).toBe(true);
    expect([ink.layerCanvas(1), ink.copiesHeld, liveCanvases()]).toEqual([null, 0, 0]);
    expect(() => ink.restore(1, red[0])).toThrow("resized");
  });
});

describe("the layer ink's fills", () => {
  it("find the region on what's shown and write it on their own layer alone", () => {
    const ink = sheet();
    drawOutline(ink);
    const lines = pixelsOf(ink, 2);
    const changed = ink.flood(fillAt(1, { x: 4, y: 4 }), TWO);

    expect(changed).toEqual(INSIDE);
    expect(ink.inkBox(1)).toEqual({ x: 1.5, y: 1.5, w: 5, h: 5 });
    expect(pixel(ink, 1, INSIDE.x, INSIDE.y)).toEqual(RED);
    // Under the lines and outside them, the color layer stays clear.
    expect(pixel(ink, 1, OUTLINE.x, OUTLINE.y)).toEqual(CLEAR);
    expect(pixel(ink, 1, 0, 0)).toEqual(CLEAR);
    expect(pixelsOf(ink, 2)).toEqual(lines);
  });

  it("replay what they wrote when applied again, without reading what's shown", () => {
    const ink = sheet();
    drawOutline(ink);
    const blank = ink.hold(1);
    const op = fillAt(1, { x: 4, y: 4 });
    ink.apply(op, TWO);
    const filled = pixelsOf(ink, 1);

    // Without the lines, flooding again would fill the whole sheet.
    ink.apply(clearLayer(2), TWO);
    ink.restore(1, blank);
    vi.mocked(compositeLayers).mockClear();
    ink.apply(op, TWO);
    expect(compositeLayers).not.toHaveBeenCalled();
    expect(pixelsOf(ink, 1)).toEqual(filled);
  });

  it("on a locked layer under the lines recolor only its ink there, at the ink's alpha, and write the same on a redo", () => {
    const ink = sheet();
    drawOutline(ink);
    paint(ink, TWO, 1, WASH_INSIDE, FAINT_BLUE);
    paint(ink, TWO, 1, WASH_ABOVE, FAINT_BLUE);
    const washed = pixelsOf(ink, 1);
    const inkBox = ink.inkBox(1);
    const unfilled = ink.hold(1);
    const op = fillAt(1, { x: 4, y: 4 });

    expect(ink.flood(op, LOCKED_UNDER_LINES)).toEqual(INSIDE);
    const filled = pixelsWith([WASH_INSIDE, FAINT_RED], [WASH_ABOVE, FAINT_BLUE]);
    expect(pixelsOf(ink, 1)).toEqual(filled);
    // Its ink reaches no further than it did.
    expect(ink.inkBox(1)).toEqual(inkBox);

    ink.restore(1, unfilled);
    expect(pixelsOf(ink, 1)).toEqual(washed);
    ink.apply(op, LOCKED_UNDER_LINES);
    expect(pixelsOf(ink, 1)).toEqual(filled);
    expect(ink.inkBox(1)).toEqual(inkBox);
  });

  it("on a locked layer change nothing, and make no canvas, when the region holds none of its ink", () => {
    const ink = sheet();
    drawOutline(ink);
    const locked = stateOf(layer(1, { locked: true }), layer(2, { locked: true }));
    // Inside the lines, their own layer is clear.
    expect(ink.flood(fillAt(2, { x: 4, y: 4 }), locked)).toBeNull();
    expect(ink.flood(fillAt(1, { x: 4, y: 4 }), locked)).toBeNull();
    expect(ink.layerCanvas(1)).toBeNull();
  });
});

describe("the layer ink's strokes", () => {
  it("paint a brush atop a locked layer's ink, and make no canvas for a locked layer with none", () => {
    const ink = sheet();
    paint(ink, ONE, 1, LEFT, RED);
    const g = contextOf(mustCanvas(ink, 1));
    if (!g) throw new Error("Layer 1's canvas has no context");
    const operations: string[] = [];
    vi.spyOn(g, "fill").mockImplementation(() => operations.push(g.globalCompositeOperation));
    const stroke = { ...brush(1), pts: [1, 1, 1, 0] };
    ink.apply(stroke, stateOf(layer(1, { locked: true })));
    ink.apply(stroke, ONE);
    expect(operations).toEqual(["source-atop", "source-over"]);

    ink.apply(brush(2), stateOf(layer(1), layer(2, { locked: true })));
    expect(ink.layerCanvas(2)).toBeNull();
  });

  it("grow the layer's ink box by each brush point, half its width out, until a clear", () => {
    const ink = sheet();
    ink.apply({ ...brush(1), pts: [2, 3, 2, 0, 5, 4, 1, 16] }, ONE);
    expect(ink.inkBox(1)).toEqual({ x: 1, y: 2, w: 4.5, h: 2.5 });
    const hold = ink.hold(1);
    ink.apply(clearLayer(1), ONE);
    expect(ink.inkBox(1)).toBeNull();
    ink.restore(1, hold);
    expect(ink.inkBox(1)).toEqual({ x: 1, y: 2, w: 4.5, h: 2.5 });
  });
});

describe("the layer ink", () => {
  it("composites every layer the state shows onto a new canvas", () => {
    const ink = sheet();
    paint(ink, TWO, 1, LEFT, RED);
    paint(ink, TWO, 2, RIGHT, BLUE);
    const out = ink.composite(stateOf(layer(1), layer(2, { opacity: 0 })));
    const at = (x: number) => [...(contextOf(out)?.getImageData(x, 5, 1, 1).data ?? [])];
    expect([at(LEFT.x), at(RIGHT.x)]).toEqual([RED, CLEAR]);
  });

  it("drops cached fill regions with the canvases so replay reads the rebuilt layers", () => {
    const ink = sheet();
    const op = fillAt(1, { x: 4, y: 4 });
    ink.apply(op, TWO);
    expect(pixel(ink, 1, 0, 0)).toEqual(RED);
    ink.releaseAll();
    drawOutline(ink);
    ink.apply(op, TWO);
    expect(pixel(ink, 1, 0, 0)).toEqual(CLEAR);
    expect(pixel(ink, 1, 8, 8)).toEqual(RED);
  });

  it("releases fill and clipping scratch canvases after making a composite", () => {
    const ink = sheet();
    paint(ink, TWO, 1, LEFT, RED);
    paint(ink, TWO, 2, RIGHT, BLUE);
    ink.flood(fillAt(1, { x: 4, y: 4 }), TWO);
    expect(liveCanvases()).toBeGreaterThan(2);
    const clipped = stateOf(layer(1), layer(2, { clipped: true }));
    const out = ink.composite(clipped);
    expect(out.width).toBe(SIDE);
    expect(liveCanvases()).toBe(3); // Two inked layers and the composite; scratch is released.
  });

  it("lets holds keep fewer copies as layers ink, and none below zero", () => {
    const ink = new LayerInk();
    ink.setFrame({ w: 400, h: 800, density: 3 });
    const none = ink.copyBudgetFor(0);
    expect(none).toBeGreaterThan(0);
    for (let inked = 0; inked <= none + 2; inked++) {
      expect(ink.copyBudgetFor(inked)).toBe(Math.max(0, none - inked));
    }
    ink.setFrame({ w: 800, h: 800, density: 3 });
    expect(ink.copyBudgetFor(0)).toBeLessThan(none);
  });
});
