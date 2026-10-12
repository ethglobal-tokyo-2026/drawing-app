// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contextOf,
  forgetContexts,
  madeContexts,
  paintPaths,
} from "../../sticker-board/timelapse/testCanvas";
import type { FillOp, LayerId, LayerStep } from "../canvas/ops";
import type { SheetFrame } from "../canvas/sheetFrame";
import { blankCanvas } from "../canvas/context2d";
import * as contexts from "../canvas/context2d";
import { CanvasUnavailableError } from "../canvas/canvasUnavailable";
import { prepareFillPatch } from "../canvas/fill-worker/core";
import { FillError } from "../canvas/fill-worker/errors";
import { hexToRgb } from "../canvas/color";
import type { Rect } from "../sealing/stickerPasses";
import { CHECKPOINT_COST } from "./checkpoints";
import { compositeLayers } from "./composite";
import { LayerInk } from "./layerInk";
import { LayerHistory } from "./layerHistory";
import {
  applyLayerStep,
  mergeDownTarget,
  FULL_OPACITY,
  type Layer,
  type LayerState,
} from "./layerState";
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

describe("Merge down", () => {
  it("keeps both originals, history and redo when result or scratch allocation fails", () => {
    for (const failAt of [1, 2]) {
      const ink = sheet();
      const history = new LayerHistory(ink);
      history.load([
        fill(1),
        { tool: "add", layer: 2, at: 1, T: 0 },
        fill(2),
        { tool: "opacity", layer: 2, opacity: 40, T: 0 },
      ]);
      history.undo();
      const originals = [ink.layerCanvas(1), ink.layerCanvas(2)];
      const steps = [...history.steps];
      const madeBefore = madeContexts().length;
      const allocate = contexts.blankCanvas;
      let calls = 0;
      const spy = vi.spyOn(contexts, "blankCanvas").mockImplementation((...args) => {
        if (++calls === failAt) throw new CanvasUnavailableError();
        return allocate(...args);
      });
      expect(() => history.perform({ tool: "merge", layer: 2, into: 1, T: 0 })).toThrow(
        CanvasUnavailableError,
      );
      expect([ink.layerCanvas(1), ink.layerCanvas(2)]).toEqual(originals);
      expect(history.steps).toEqual(steps);
      expect(history.canRedo).toBe(true);
      expect(
        madeContexts()
          .slice(madeBefore)
          .every(({ canvas }) => canvas.width === 0),
      ).toBe(true);
      spy.mockRestore();
      history.redo();
      expect(history.state.layers[1].opacity).toBe(40);
    }
  });

  it("rolls back both restored layers when merge Undo fails after the source was reconstructed", () => {
    const ink = sheet();
    const history = new LayerHistory(ink);
    history.load([
      fill(1),
      { tool: "add", layer: 2, at: 1, T: 0 },
      fill(2),
      { tool: "merge", layer: 2, into: 1, T: 0 },
    ]);
    history.dropCheckpoints();
    const original = ink.layerCanvas(1);
    const steps = [...history.steps];
    const madeBefore = madeContexts().length;
    const apply = ink.apply.bind(ink);
    const spy = vi.spyOn(ink, "apply").mockImplementation((step, before) => {
      if (step.layer === 1) throw new CanvasUnavailableError();
      apply(step, before);
    });
    expect(() => history.undo()).toThrow(CanvasUnavailableError);
    expect(ink.layerCanvas(1)).toBe(original);
    expect(ink.layerCanvas(2)).toBeNull();
    expect(history.steps).toEqual(steps);
    expect(
      madeContexts()
        .slice(madeBefore)
        .every(({ canvas }) => canvas.width === 0),
    ).toBe(true);
    spy.mockRestore();
    history.undo();
    expect(ink.layerCanvas(1)).not.toBeNull();
    expect(ink.layerCanvas(2)).not.toBeNull();
  });

  it("replays cross-layer clipped merges, later Fill, clears and density changes from steps alone", () => {
    const ink = sheet();
    const history = new LayerHistory(ink);
    const steps = [
      { ...fill(1), color: "#FF0000" },
      { tool: "add" as const, layer: 2, at: 1, T: 0 },
      { ...fill(2), color: "#0000FF" },
      { tool: "opacity" as const, layer: 1, opacity: 50, T: 0 },
      { tool: "clip" as const, layer: 2, on: true, T: 0 },
      { tool: "add" as const, layer: 3, at: 2, T: 0 },
      { ...fill(3), color: "#00FF00" },
      { tool: "clip" as const, layer: 3, on: true, T: 0 },
      { tool: "merge" as const, layer: 3, into: 2, T: 0 },
      { tool: "merge" as const, layer: 2, into: 1, T: 0 },
      { ...fill(1), color: "#FFFFFF" },
      { tool: "clear" as const, layer: 1, T: 0 },
    ];
    history.load(steps);
    history.dropCheckpoints();
    for (let i = 0; i < 4; i++) {
      history.undo();
      const expected = sheet();
      new LayerHistory(expected).load(history.steps);
      for (const { id } of history.state.layers)
        expect(pixel(ink, id, 1, 1)).toEqual(pixel(expected, id, 1, 1));
    }
    for (let i = 0; i < 3; i++) history.redo();
    const pixelBefore = pixel(ink, 1, 1, 1);
    ink.setFrame({ ...FRAME, density: 1 });
    history.invalidate();
    expect(pixel(ink, 1, 1, 1)).toEqual(pixelBefore);
    expect(history.canRedo).toBe(true);
  });

  it("keeps a hidden or empty pair canvas-free", () => {
    const ink = sheet();
    ink.apply({ tool: "merge", layer: 2, into: 1, T: 0 }, TWO);
    expect(ink.layerCanvas(1)).toBeNull();
    const before = stateOf(layer(1, { opacity: 0 }), layer(2, { opacity: 0 }));
    paint(ink, before, 1, WHOLE, RED);
    paint(ink, before, 2, WHOLE, BLUE);
    ink.apply({ tool: "merge", layer: 2, into: 1, T: 0 }, before);
    expect(ink.layerCanvas(1)).toBeNull();
    expect(ink.layerCanvas(2)).toBeNull();
  });

  it("restores a merge's historical base for replay without overwriting that base's current ink", () => {
    const ink = sheet();
    const history = new LayerHistory(ink);
    history.load([
      { ...fill(1), color: "#FF0000" },
      { tool: "opacity", layer: 1, opacity: 50, T: 0 },
      { tool: "add", layer: 2, at: 1, T: 0 },
      { ...fill(2), color: "#0000FF" },
      { tool: "clip", layer: 2, on: true, T: 0 },
      { tool: "add", layer: 3, at: 2, T: 0 },
      { ...fill(3), color: "#00FF00" },
      { tool: "clip", layer: 3, on: true, T: 0 },
      { tool: "merge", layer: 3, into: 2, T: 0 },
      { ...fill(1), color: "#FFFFFF", reference: "layer" },
    ]);
    const merged = pixel(ink, 2, 1, 1);
    const base = ink.layerCanvas(1);
    const basePixel = pixel(ink, 1, 1, 1);
    const later = { ...fill(2), color: "#FFFFFF", reference: "layer" as const };
    ink.apply(later, history.state);
    history.commit(later);
    history.dropCheckpoints();
    history.undo();
    expect(pixel(ink, 2, 1, 1)).toEqual(merged);
    expect(ink.layerCanvas(1)).toBe(base);
    expect(pixel(ink, 1, 1, 1)).toEqual(basePixel);
    expect(ink.layerCanvas(3)).toBeNull();
  });
  it("keeps the destination lock and next ID, and refuses only an immediate clipped layer above", () => {
    const before = stateOf(
      layer(1, { opacity: 40, locked: true, clipped: true }),
      layer(2),
      layer(3),
    );
    expect(mergeDownTarget(before, 2)).toEqual({ into: 1 });
    expect(applyLayerStep(before, { tool: "merge", layer: 2, into: 1, T: 0 })).toEqual({
      layers: [layer(1, { locked: true }), layer(3)],
      nextId: 4,
    });
    expect(mergeDownTarget(stateOf(layer(1), layer(2), layer(3, { clipped: true })), 2)).toEqual({
      reason: "clipped-above",
    });
    expect(mergeDownTarget(before, 1)).toEqual({ reason: "no-lower-layer" });
    expect(
      mergeDownTarget(stateOf(layer(1), layer(2), layer(3), layer(4, { clipped: true })), 2),
    ).toEqual({ into: 1 });
    expect(() => applyLayerStep(before, { tool: "merge", layer: 2, into: 3, T: 0 })).toThrow(
      "immediately below",
    );
    expect(() =>
      applyLayerStep(stateOf(layer(1), layer(2), layer(3, { clipped: true })), {
        tool: "merge",
        layer: 2,
        into: 1,
        T: 0,
      }),
    ).toThrow("clipped-above");
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])("flattens before-state opacity and clipping (%s, %s)", (destinationClip, sourceClip) => {
    const ink = sheet();
    const before = stateOf(
      layer(1, { opacity: 50 }),
      layer(2, { clipped: destinationClip, opacity: 50 }),
      layer(3, { clipped: sourceClip, opacity: 50 }),
    );
    paint(ink, before, 1, LEFT, FAINT_RED);
    paint(ink, before, 2, WHOLE, BLUE);
    paint(ink, before, 3, RIGHT, GREEN);
    const { g } = blankCanvas(SIDE, SIDE);
    ink.compositeInto(g, before, [2, 3], WHOLE);
    ink.apply({ tool: "merge", layer: 3, into: 2, T: 0 }, before);
    expect(pixelsOf(ink, 2)).toEqual([...g.getImageData(0, 0, SIDE, SIDE).data]);
    expect(ink.layerCanvas(3)).toBeNull();
  });
});

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
  vi.restoreAllMocks();
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

  it("keeps the original pixels and shared holds when checkpoint materialization fails", () => {
    const ink = sheet();
    paint(ink, ONE, 1, WHOLE, RED);
    const hold = ink.hold(1);
    const shared = hold.shared;
    const count = liveCanvases();
    const allocate = contexts.blankCanvas;
    let refused: HTMLCanvasElement | undefined;
    vi.spyOn(contexts, "blankCanvas").mockImplementation((...args) => {
      const made = allocate(...args);
      refused = made.canvas;
      vi.spyOn(made.g, "getImageData").mockImplementation(() => {
        throw new Error("Checkpoint copy read failed");
      });
      return made;
    });

    expect(() => paint(ink, ONE, 1, WHOLE, BLUE)).toThrow("Checkpoint copy read failed");
    expect(pixel(ink, 1, 5, 5)).toEqual(RED);
    expect(hold.shared).toBe(shared);
    expect(hold.copy).toBeNull();
    expect(hold.released).toBe(false);
    expect(ink.copiesHeld).toBe(0);
    expect(liveCanvases()).toBe(count);
    expect(refused?.width).toBe(0);
    expect(refused?.height).toBe(0);
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
  it.each(["layer", "visible"] as const)(
    "installs prepared %s fills with clipping, opacity, and locked alpha exactly as replay",
    (reference) => {
      for (const locked of [false, true]) {
        const prepared = sheet();
        const synchronous = sheet();
        const state = stateOf(
          layer(1, { locked, opacity: 50 }),
          layer(2, { clipped: true, opacity: 70 }),
        );
        for (const ink of [prepared, synchronous]) {
          paint(ink, ONE, 1, LEFT, FAINT_BLUE);
          drawOutline(ink);
        }
        const op = { ...fillAt(1, { x: 4, y: 4 }), reference };
        const patch = prepared.readFillPatch(op, state, WHOLE);
        expect(patch.locked).toBe(locked);
        if (reference === "layer") expect(patch.shown).toBe(patch.target);
        const result = prepareFillPatch({
          at: WHOLE,
          ...patch,
          sx: 8,
          sy: 8,
          color: hexToRgb(op.color),
          gap: op.gap * FRAME.density,
        });
        if (result.kind !== "found") throw new Error("No region found");
        const changed = prepared.applyPreparedFill(op, WHOLE, result);
        expect(changed).toEqual(synchronous.flood(op, state));
        expect(pixelsOf(prepared, 1)).toEqual(pixelsOf(synchronous, 1));
        expect(prepared.inkBox(1)).toEqual(synchronous.inkBox(1));
        const hold = synchronous.hold(1);
        prepared.apply(clearLayer(2), state);
        prepared.apply(clearLayer(1), state);
        const flood = vi.spyOn(prepared, "flood");
        prepared.apply(op, state);
        expect(flood).not.toHaveBeenCalled();
        expect(pixelsOf(prepared, 1)).toEqual(pixelsOf(synchronous, 1));
        synchronous.release(hold);
      }
    },
  );
  it("releases reference scratch before making checkpoint copies and the accepted destination", () => {
    const ink = sheet();
    paint(ink, TWO, 1, LEFT, BLUE);
    paint(ink, TWO, 2, RIGHT, GREEN);
    ink.countView(true);
    const withView = ink.copyBudgetFor(2);
    ink.countView(false);
    expect(ink.copyBudgetFor(2)).toBe(withView + 2);
    ink.countView(true);
    const hold = ink.hold(1);
    const op = fillAt(1, { x: 0, y: 0 });
    const patch = ink.readFillPatch(op, TWO, WHOLE);
    const scratches = madeContexts().filter(
      ({ canvas }) => canvas !== ink.layerCanvas(1) && canvas !== ink.layerCanvas(2),
    );
    const result = prepareFillPatch({
      at: WHOLE,
      ...patch,
      sx: 0,
      sy: 0,
      color: [255, 0, 0],
      gap: 0,
    });
    if (result.kind !== "found") throw new Error("No region found");
    const allocate = contexts.blankCanvas;
    const spy = vi.spyOn(contexts, "blankCanvas").mockImplementation((...args) => {
      expect(scratches.every(({ canvas }) => canvas.width === 0)).toBe(true);
      return allocate(...args);
    });
    ink.applyPreparedFill(op, WHOLE, result);
    expect(ink.copiesHeld).toBe(1);
    expect(liveCanvases()).toBe(3);
    spy.mockRestore();
    ink.release(hold);
  });
  it("keeps captured lock metadata through an allocation failure and retries the same prepared operation", () => {
    const ink = sheet();
    paint(ink, ONE, 1, LEFT, FAINT_BLUE);
    const hold = ink.hold(1);
    const op = { ...fillAt(1, { x: 0, y: 0 }), reference: "layer" as const };
    const patch = ink.readFillPatch(op, stateOf(layer(1, { locked: true })), WHOLE);
    const result = prepareFillPatch({
      at: WHOLE,
      ...patch,
      sx: 0,
      sy: 0,
      color: [255, 0, 0],
      gap: 0,
    });
    if (result.kind !== "found") throw new Error("No region found");
    const box = ink.inkBox(1);
    const spy = vi.spyOn(contexts, "blankCanvas").mockImplementation(() => {
      throw new CanvasUnavailableError();
    });
    expect(() => ink.applyPreparedFill(op, WHOLE, result)).toThrow(CanvasUnavailableError);
    expect(pixel(ink, 1, 0, 0)).toEqual(FAINT_BLUE);
    spy.mockRestore();
    ink.applyPreparedFill(op, WHOLE, result);
    expect(pixel(ink, 1, 0, 0)).toEqual(FAINT_RED);
    expect(ink.inkBox(1)).toEqual(box);
    expect(() => ink.applyPreparedFill({ ...op }, WHOLE, result)).toThrow(FillError);
    ink.release(hold);
  });
  it("keeps a no-write region's coverage while releasing scratch without allocating a destination", () => {
    const ink = sheet();
    drawOutline(ink);
    const op = fillAt(1, { x: 4, y: 4 });
    const patch = ink.readFillPatch(op, LOCKED_UNDER_LINES, WHOLE);
    const result = prepareFillPatch({
      at: WHOLE,
      ...patch,
      sx: 8,
      sy: 8,
      color: [255, 0, 0],
      gap: 0,
    });
    if (result.kind !== "found") throw new Error("No region found");
    expect(result.interiorSpans.length).toBeGreaterThan(0);
    expect(result.written).toBeNull();
    expect(ink.applyPreparedFill(op, WHOLE, result)).toBeNull();
    expect(ink.layerCanvas(1)).toBeNull();
    expect(liveCanvases()).toBe(1);
  });
  it("rejects malformed prepared output before changing canvas pixels or detaching holds", () => {
    const ink = sheet();
    paint(ink, ONE, 1, WHOLE, BLUE);
    ink.hold(1);
    const op = { ...fillAt(1, { x: 0, y: 0 }), reference: "layer" as const };
    const patch = ink.readFillPatch(op, ONE, WHOLE);
    const result = prepareFillPatch({
      at: WHOLE,
      ...patch,
      sx: 0,
      sy: 0,
      color: [255, 0, 0],
      gap: 0,
    });
    if (result.kind !== "found") throw new Error("No region found");
    result.found.box.w++;
    expect(() => ink.applyPreparedFill(op, WHOLE, result)).toThrow(FillError);
    expect(pixel(ink, 1, 0, 0)).toEqual(BLUE);
    expect(ink.copiesHeld).toBe(0);
  });
  it.each(["layer", "visible"] as const)(
    "rebuilds %s fills using their recorded reference",
    (reference) => {
      const ink = sheet();
      const op = { ...fillAt(1, { x: 4, y: 4 }), reference };
      for (let rebuild = 0; rebuild < 2; rebuild++) {
        drawOutline(ink);
        const lines = pixelsOf(ink, 2);
        ink.apply(op, TWO);
        expect(pixel(ink, 1, 0, 0)).toEqual(reference === "layer" ? RED : CLEAR);
        expect(pixel(ink, 1, 8, 8)).toEqual(RED);
        expect(pixelsOf(ink, 2)).toEqual(lines);
        ink.releaseAll();
      }
    },
  );
  it.each(["layer", "visible"] as const)(
    "fills a blank upper layer using %s reference without altering the lower outline",
    (reference) => {
      const ink = sheet();
      const { x, y, w, h } = OUTLINE;
      for (const side of [
        { x, y, w, h: 1 },
        { x, y: y + h - 1, w, h: 1 },
        { x, y, w: 1, h },
        { x: x + w - 1, y, w: 1, h },
      ])
        paint(ink, TWO, 1, side, INK);
      const lower = pixelsOf(ink, 1);
      ink.flood({ ...fillAt(2, { x: 4, y: 4 }), reference }, TWO);
      expect(pixel(ink, 2, 0, 0)).toEqual(reference === "layer" ? RED : CLEAR);
      expect(pixel(ink, 2, 8, 8)).toEqual(RED);
      expect(pixelsOf(ink, 1)).toEqual(lower);
    },
  );
  it.each(["layer", "visible"] as const)(
    "undoes and rebuilds a %s Fill from recorded history",
    (reference) => {
      const ink = sheet();
      const history = new LayerHistory(ink);
      const first = { ...fillAt(1, { x: 4, y: 4 }, "#0000ff"), reference: "layer" as const };
      ink.apply(first, history.state);
      history.commit(first);
      history.perform({ tool: "add", layer: 2, at: 1, T: 1 });
      const op = { ...fillAt(2, { x: 4, y: 4 }), reference };
      ink.apply(op, history.state);
      history.commit(op);
      expect(pixel(ink, 2, 0, 0)).toEqual(RED);
      history.undo();
      expect(pixel(ink, 2, 0, 0)).toEqual(CLEAR);
      ink.releaseFill(op);
      history.redo();
      expect(pixel(ink, 2, 0, 0)).toEqual(RED);
      history.load(history.steps);
      expect(pixel(ink, 2, 0, 0)).toEqual(RED);
      expect(pixel(ink, 1, 0, 0)).toEqual(BLUE);
    },
  );
  it("preserves own alpha when a layer-reference Fill recolors locked raw ink", () => {
    const ink = sheet();
    paint(ink, ONE, 1, LEFT, FAINT_BLUE);
    ink.flood(
      { ...fillAt(1, { x: 4, y: 4 }), reference: "layer" },
      stateOf(layer(1, { locked: true, opacity: 0 })),
    );
    expect(pixel(ink, 1, 0, 0)).toEqual(FAINT_RED);
    expect(pixel(ink, 1, 15, 0)).toEqual(CLEAR);
  });
  it("samples raw layer ink even when opacity and clipping hide its outline", () => {
    const ink = sheet();
    drawOutline(ink);
    const hidden = stateOf(layer(1), layer(2, { opacity: 0, clipped: true }));
    ink.flood({ ...fillAt(2, { x: 4, y: 4 }), reference: "layer" }, hidden);
    expect(pixel(ink, 2, 0, 0)).toEqual(CLEAR);
    expect(pixel(ink, 2, 8, 8)).toEqual(RED);
  });
  it("releases one cached fill without changing its layer pixels or other cached fills", () => {
    const ink = sheet();
    drawOutline(ink);
    const blank = ink.hold(1);
    const first = fillAt(1, { x: 4, y: 4 });
    const second = fillAt(1, { x: 4, y: 4 }, "#0000ff");
    ink.apply(first, TWO);
    ink.apply(second, TWO);
    const filled = pixelsOf(ink, 1);
    ink.releaseFill(first);
    ink.releaseFill(first);
    expect(pixelsOf(ink, 1)).toEqual(filled);
    ink.restore(1, blank);
    const flood = vi.spyOn(ink, "flood");
    ink.apply(second, TWO);
    expect(flood).not.toHaveBeenCalled();
    ink.apply(first, TWO);
    expect(flood).toHaveBeenCalledWith(first, TWO);
    ink.release(blank);
    ink.releaseAll();
  });

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
    expect(liveCanvases()).toBe(2); // Fill preparation releases its scratch before installation.
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

describe("grouped Fill Redo on replacement canvases", () => {
  it.each([false, true])(
    "preserves existing brush ink outside both fills with checkpoint at head: %s",
    (checkpointAtHead) => {
      paintPaths(true);
      try {
        const ink = sheet();
        const history = new LayerHistory(ink);
        // A solid vertical brush line separates two fill regions and must survive both.
        const line = { ...brush(), pts: [4, 0, 1, 0, 4, 8, 1, 10] };
        for (let i = 0; i < (checkpointAtHead ? CHECKPOINT_COST : 1); i++) {
          const op = { ...line, T: i };
          ink.apply(op, history.state);
          history.commit(op);
        }
        const beforeGroup = pixelsOf(ink, 1);
        expect(pixel(ink, 1, 8, 8)).toEqual(INK);
        const first = fillAt(1, { x: 1, y: 4 });
        const second: FillOp = { ...fillAt(1, { x: 6, y: 4 }), undoWithPrevious: true };
        for (const op of [first, second]) {
          expect(ink.flood(op, history.state)).not.toBeNull();
          history.commit(op);
        }
        const filled = pixelsOf(ink, 1);
        expect(pixel(ink, 1, 2, 8)).toEqual(RED);
        expect(pixel(ink, 1, 12, 8)).toEqual(RED);
        expect(pixel(ink, 1, 8, 8)).toEqual(INK);
        history.undo();
        expect(pixelsOf(ink, 1)).toEqual(beforeGroup);
        history.redo();
        expect(pixel(ink, 1, 8, 8)).toEqual(INK);
        expect(pixelsOf(ink, 1)).toEqual(filled);
        ink.releaseAll();
      } finally {
        paintPaths(false);
      }
    },
  );

  it("keeps the original canvas and hold ownership when the second grouped Redo fill fails", () => {
    paintPaths(true);
    try {
      const ink = sheet();
      const history = new LayerHistory(ink);
      const line = { ...brush(), pts: [4, 0, 1, 0, 4, 8, 1, 10] };
      for (let i = 0; i < CHECKPOINT_COST; i++) {
        const op = { ...line, T: i };
        ink.apply(op, history.state);
        history.commit(op);
      }
      const first = fillAt(1, { x: 1, y: 4 });
      const second: FillOp = { ...fillAt(1, { x: 6, y: 4 }), undoWithPrevious: true };
      for (const op of [first, second]) {
        ink.flood(op, history.state);
        history.commit(op);
      }
      const filled = pixelsOf(ink, 1);
      history.undo();
      const beforeSteps = [...history.steps];
      const beforeCanvas = ink.layerCanvas(1);
      const beforePixels = pixelsOf(ink, 1);
      const beforeCopies = ink.copiesHeld;
      const hold = ink.hold(1);
      const shared = hold.shared;
      const copy = hold.copy;
      const apply = ink.apply.bind(ink);
      const failure = vi.spyOn(ink, "apply").mockImplementation((op, state) => {
        if (op === second) throw new CanvasUnavailableError();
        apply(op, state);
      });
      expect(() => history.redo()).toThrow(CanvasUnavailableError);
      expect(history.steps).toEqual(beforeSteps);
      expect(history.canRedo).toBe(true);
      expect(ink.layerCanvas(1)).toBe(beforeCanvas);
      expect(pixelsOf(ink, 1)).toEqual(beforePixels);
      expect(ink.copiesHeld).toBe(beforeCopies);
      expect(hold.shared).toBe(shared);
      expect(hold.copy).toBe(copy);
      expect(hold.released).toBe(false);
      failure.mockRestore();
      history.redo();
      expect(pixelsOf(ink, 1)).toEqual(filled);
      ink.release(hold);
      ink.releaseAll();
    } finally {
      paintPaths(false);
    }
  });
});
