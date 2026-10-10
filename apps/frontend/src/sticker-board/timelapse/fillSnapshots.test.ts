// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { hexToRgb } from "../../sticker-creation/canvas/color";
import type { FillOp, Op, Step, StrokeOp } from "../../sticker-creation/canvas/ops";
import { LayerInk } from "../../sticker-creation/layers/layerInk";
import { FIRST_LAYERS, type LayerState } from "../../sticker-creation/layers/layerState";
import { addLayer } from "../../sticker-creation/layers/testLayerSteps";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import {
  PREPARE_TIMEOUT_MS,
  prepareFillSnapshots,
  type PrepareControl,
  type PrepareInput,
} from "./fillSnapshots";
import { contextOf, forgetContexts, madeContexts } from "./testCanvas";

vi.mock(
  "../../sticker-creation/canvas/context2d",
  () => import("../../sticker-creation/canvas/testContext2d"),
);
/** Ops the sheet fails to apply, as if it ran out of memory. */
const failing = vi.hoisted(() => new Set<object>());
vi.mock("../../sticker-creation/layers/layerInk", async (importOriginal) => {
  const real = await importOriginal<{ LayerInk: typeof LayerInk }>();
  class FailingLayerInk extends real.LayerInk {
    override apply(step: Step, before: LayerState): void {
      if (failing.has(step)) throw new Error("out of memory");
      super.apply(step, before);
    }
    override flood(op: FillOp, state: LayerState) {
      if (failing.has(op)) throw new Error("out of memory");
      return super.flood(op, state);
    }
  }
  return { ...real, LayerInk: FailingLayerInk };
});
/** The boxes a stroke inks black, by op, device px at density 1: the fake canvas paints no paths. */
const inked = vi.hoisted(() => new Map<object, readonly Rect[]>());
vi.mock("../../sticker-creation/canvas/paintStroke", () => ({
  paintStroke: (g: CanvasRenderingContext2D, op: object) => {
    for (const { x, y, w, h } of inked.get(op) ?? []) {
      const black = new ImageData(w, h);
      for (let alpha = 3; alpha < black.data.length; alpha += 4) black.data[alpha] = 255;
      g.putImageData(black, x, y);
    }
  },
}));

const line: StrokeOp = {
  tool: "brush",
  layer: 1,
  color: "#1c1824",
  T: 0,
  pts: [30, 40, 4, 0, 60, 40, 4, 16],
};
const fill = (color: string, T: number): FillOp => ({
  tool: "fill",
  layer: 1,
  color,
  x: 40,
  y: 50,
  gap: 0,
  T,
});
const RED = "#ff0000";
const BLUE = "#0000ff";

/** A 100 × 100 sheet drawn at density 1. The fake canvas paints no paths, so a fill floods it all. */
const SHEET = { x: 0, y: 0, w: 100, h: 100 };
/** The frame the strokes and the sticker's place make. */
const STROKES = { x: 20, y: 30, w: 60, h: 40 };
/** Each frame shown 1:1 from its own top left, on a sheet that starts with one layer. */
const input = (steps: Step[], frame: Rect = SHEET): PrepareInput => ({
  steps,
  layers: FIRST_LAYERS,
  ink: { width: SHEET.w, height: SHEET.h },
  density: 1,
  frame,
  viewOf: (f) => ({ width: f.w, height: f.h, scale: 1, origin: { x: f.x, y: f.y } }),
});
const control = (overrides: Partial<PrepareControl> = {}): PrepareControl => ({
  now: () => 0,
  stopped: () => false,
  yieldToPage: async () => {},
  ...overrides,
});
const prepare = (
  steps: Step[],
  { frame, ...overrides }: Partial<PrepareControl> & { frame?: Rect } = {},
) => prepareFillSnapshots(input(steps, frame), control(overrides));

/** The color of a canvas's first pixel. */
const firstPixel = (canvas: HTMLCanvasElement) => [
  ...(contextOf(canvas)?.image.data.slice(0, 3) ?? []),
];
/** The canvases the pass made that still hold memory. */
const heldCanvases = () =>
  madeContexts()
    .map((context) => context.canvas)
    .filter((canvas) => canvas.width > 0 || canvas.height > 0);

afterEach(() => {
  vi.restoreAllMocks();
  forgetContexts();
  failing.clear();
  inked.clear();
});

describe("the prepare pass", () => {
  it("keeps each fill's change to the display, by its op, and none for a fill that changed nothing", async () => {
    const applied = vi.spyOn(LayerInk.prototype, "apply");
    const flooded = vi.spyOn(LayerInk.prototype, "flood");
    const ops = [line, fill(RED, 100), fill(RED, 200), fill(BLUE, 300), line];
    const prepared = await prepare(ops);
    if (!prepared) throw new Error("it wasn't stopped");

    expect(prepared.passes).toBe(1);
    expect([...prepared.snapshots.keys()]).toEqual([1, 3]);
    for (const { box, reach } of prepared.snapshots.values()) {
      expect(box).toEqual({ x: 0, y: 0, w: SHEET.w, h: SHEET.h });
      // The tap is (40, 50); each fill reached the sheet's far corner.
      expect(reach).toBeCloseTo(Math.hypot(SHEET.w - 40, SHEET.h - 50), 9);
    }
    const blue = prepared.snapshots.get(3)?.canvas;
    if (!blue) throw new Error("the blue fill changed the display");
    expect(firstPixel(blue)).toEqual([...hexToRgb(BLUE)]);
    // Every op up to the last fill went on the sheet, in order; nothing after it is needed.
    const order = (spy: typeof applied | typeof flooded) =>
      spy.mock.calls.map(([op], i) => [spy.mock.invocationCallOrder[i], op] as const);
    const onSheet = [...order(applied), ...order(flooded)].toSorted(([a], [b]) => a - b);
    expect(onSheet.map(([, op]) => op)).toEqual(ops.slice(0, 4));
  });

  it("reveals a fill on a color layer, bounded by another layer's lines, in the box it changed when drawn", async () => {
    // A square outline, one px thick, with a spur down into it, on a layer added over the fill's.
    const { x, y, w, h } = { x: 30, y: 40, w: 30, h: 20 };
    const spur = { x: 45, y, w: 1, h: 10 };
    const lines: StrokeOp = { ...line, layer: 2, T: 50 };
    inked.set(lines, [
      { x, y, w, h: 1 },
      { x, y: y + h - 1, w, h: 1 },
      { x, y, w: 1, h },
      { x: x + w - 1, y, w: 1, h },
      spur,
    ]);
    const prepared = await prepare([addLayer(2, 1), lines, fill(RED, 100)]);
    const snapshot = prepared?.snapshots.get(2);
    if (!snapshot) throw new Error("the fill changed nothing");
    const inside = { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };
    expect(snapshot.box).toEqual(inside);
    // It's the fill's own layer, so the lines' pixels in its box stay clear.
    const at = (px: number, py: number) => [
      ...(contextOf(snapshot.canvas)?.getImageData(px - inside.x, py - inside.y, 1, 1).data ?? []),
    ];
    expect(at(inside.x, inside.y)).toEqual([...hexToRgb(RED), 255]);
    expect(at(spur.x, spur.y + 2)).toEqual([0, 0, 0, 0]);
  });

  it("grows the frame to hold a fill that reached past the strokes, and cuts its snapshots in that", async () => {
    const prepared = await prepare([line, fill(RED, 100)], { frame: STROKES });
    expect(prepared?.passes).toBe(2);
    expect(prepared?.frame).toEqual(SHEET);
    expect(prepared?.snapshots.get(1)?.box).toEqual({ x: 0, y: 0, w: SHEET.w, h: SHEET.h });
  });

  it("reads only the sheet where the frame reaches past its edge", async () => {
    const past = { x: -10, y: -5, w: 60, h: 40 };
    const prepared = await prepare([fill(RED, 0)], { frame: past });
    // The fill grew the frame to the sheet's far corner; the sheet starts 10 and 5 px in.
    expect(prepared?.frame).toEqual({
      x: past.x,
      y: past.y,
      w: SHEET.w - past.x,
      h: SHEET.h - past.y,
    });
    expect(prepared?.snapshots.get(0)?.box).toEqual({ x: 10, y: 5, w: SHEET.w, h: SHEET.h });
  });

  it("reads the sheet's view once per fill, and once more where a stroke lands between fills", async () => {
    const ops = [line, fill(RED, 100), fill(BLUE, 200), line, fill(RED, 300)];
    await prepare(ops);
    // Each read of the view clears the canvas it reads into first.
    const reads = madeContexts()
      .filter((context) => context.settings?.willReadFrequently)
      .flatMap((context) => context.calls)
      .filter(([name]) => name === "clearRect");
    const fills = ops.filter((op) => op.tool === "fill").length;
    // Two runs of fills: each reads before its first fill, then after every one.
    expect(reads).toHaveLength(fills + 2);
  });

  it("lets go of its own canvases when done, keeping only the snapshots", async () => {
    const prepared = await prepare([line, fill(RED, 100), fill(BLUE, 200)], { frame: STROKES });
    const kept = [...(prepared?.snapshots.values() ?? [])].map((s) => s.canvas);
    expect(heldCanvases()).toEqual(kept);
  });

  it("yields to the page before each fill, and when stopped answers null, letting go of every canvas", async () => {
    let yields = 0;
    let stopped = false;
    const snapshots = await prepare([fill(RED, 0), fill(BLUE, 100), fill(RED, 200)], {
      yieldToPage: async () => {
        yields++;
        if (yields === 2) stopped = true;
      },
      stopped: () => stopped,
    });
    expect(snapshots).toBeNull();
    expect(yields).toBe(2);
    expect(heldCanvases()).toEqual([]);
  });

  it.each<[string, Op]>([
    ["fill 2 of 3", fill(BLUE, 100)],
    ["stroke, step 2 of 4,", { ...line, T: 50 }],
  ])("fails naming the %s that failed, letting go of every canvas", async (named, fails) => {
    failing.add(fails);
    const ops = [fill(RED, 0), fails, fill(RED, 200), fill(BLUE, 300)].slice(
      0,
      fails.tool === "fill" ? 3 : 4,
    );
    await expect(prepare(ops)).rejects.toThrow(
      `Preparing the timelapse's ${named} failed: out of memory`,
    );
    expect(heldCanvases()).toEqual([]);
  });

  it("gives up once it has run PREPARE_TIMEOUT_MS, saying how far it got", async () => {
    let now = 0;
    const slow = prepare([fill(RED, 0), fill(BLUE, 100), fill(RED, 200)], {
      now: () => now,
      yieldToPage: async () => {
        now += PREPARE_TIMEOUT_MS / 2 + 1;
      },
    });
    await expect(slow).rejects.toThrow(
      `Preparing the timelapse's fills took over ${PREPARE_TIMEOUT_MS / 1000} s, so it stopped before fill 2 of 3`,
    );
    expect(heldCanvases()).toEqual([]);
  });
});
