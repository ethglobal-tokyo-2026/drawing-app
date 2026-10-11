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
  reference: "visible",
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
  it("retains at most one fill snapshot for forty full-sheet fills", async () => {
    const retained = new Map<WeakKey, number>();
    let cacheWrites = 0;
    let peakCacheBytes = 0;
    const originalSet = Reflect.get(WeakMap.prototype, "set") as (
      this: WeakMap<WeakKey, unknown>,
      key: WeakKey,
      value: unknown,
    ) => WeakMap<WeakKey, unknown>;
    const originalDelete = Reflect.get(WeakMap.prototype, "delete") as (
      this: WeakMap<WeakKey, unknown>,
      key: WeakKey,
    ) => boolean;
    vi.spyOn(WeakMap.prototype, "set").mockImplementation(function (
      this: WeakMap<WeakKey, unknown>,
      key,
      value: unknown,
    ) {
      if (
        typeof value === "object" &&
        value !== null &&
        "spans" in value &&
        value.spans instanceof Uint32Array &&
        "colors" in value &&
        value.colors instanceof Uint32Array
      ) {
        retained.set(key, value.spans.byteLength + value.colors.byteLength);
        cacheWrites++;
        peakCacheBytes = Math.max(
          peakCacheBytes,
          [...retained.values()].reduce((sum, bytes) => sum + bytes, 0),
        );
      }
      return originalSet.call(this, key, value);
    });
    vi.spyOn(WeakMap.prototype, "delete").mockImplementation(function (
      this: WeakMap<WeakKey, unknown>,
      key,
    ) {
      retained.delete(key);
      return originalDelete.call(this, key);
    });
    const steps = Array.from({ length: 40 }, (_, i) => fill(i % 2 ? BLUE : RED, i * 100));
    const prepared = await prepareFillSnapshots(
      {
        ...input(steps),
        viewOf: () => ({ width: 1000, height: 1000, scale: 10, origin: { x: 0, y: 0 } }),
      },
      control({
        yieldToPage: async () => {
          expect(retained.size).toBe(0);
        },
      }),
    );
    if (!prepared) throw new Error("preparation stopped");
    expect(prepared).not.toHaveProperty("snapshots");
    for (let i = 0; i < steps.length; i++) {
      const snapshot = await prepared.next(i);
      if (!snapshot) throw new Error(`Fill ${i} changed nothing`);
      expect([...retained.values()].reduce((sum, bytes) => sum + bytes, 0)).toBe(0);
      // One original layer plus reader/clipper, two display reads, and one snapshot.
      expect(
        heldCanvases().reduce((sum, c) => sum + c.width * c.height * 4, 0),
      ).toBeLessThanOrEqual(12_120_000);
      expect(heldCanvases().filter((c) => c.width === 1000)).toHaveLength(3);
      expect(firstPixel(snapshot.canvas)).toEqual([...hexToRgb(steps[i].color)]);
      expect(snapshot.canvas.width * snapshot.canvas.height * 4).toBeLessThanOrEqual(4_000_000);
      expect(await prepared.next(i)).toBe(snapshot);
      if (i + 1 < steps.length) await expect(prepared.next(i + 1)).rejects.toThrow(/release/i);
      prepared.release();
      prepared.release();
      expect(snapshot.canvas.width * snapshot.canvas.height).toBe(0);
      expect(heldCanvases().filter((c) => c.width === 1000)).toHaveLength(2);
    }
    expect(cacheWrites).toBe(80);
    expect(peakCacheBytes).toBe(1208); // 100 spans and one RGBA run, released after each flood.
    const displayReads = madeContexts().filter((g) => g.settings?.willReadFrequently);
    expect(displayReads).toHaveLength(2);
    for (const g of displayReads) {
      const reads = g.calls.filter(([name]) => name === "getImageData");
      expect(reads).toHaveLength(40);
      // Two temporary ImageData arrays of 4 MB per changed-area comparison, separate from canvases.
      expect(reads.every(([, , , w, h]) => Number(w) * Number(h) * 4 === 4_000_000)).toBe(true);
    }
    prepared.dispose();
    prepared.dispose();
    expect(heldCanvases()).toEqual([]);
  }, 60_000);

  it("keeps each fill's change to the display, by its op, and none for a fill that changed nothing", async () => {
    const applied = vi.spyOn(LayerInk.prototype, "apply");
    const flooded = vi.spyOn(LayerInk.prototype, "flood");
    const ops = [line, fill(RED, 100), fill(RED, 200), fill(BLUE, 300), line];
    const prepared = await prepare(ops);
    if (!prepared) throw new Error("it wasn't stopped");

    const changed = [];
    for (const index of [1, 2, 3]) {
      const snapshot = await prepared.next(index);
      if (!snapshot) continue;
      changed.push(index);
      const { box, reach } = snapshot;
      expect(box).toEqual({ x: 0, y: 0, w: SHEET.w, h: SHEET.h });
      // The tap is (40, 50); each fill reached the sheet's far corner.
      expect(reach).toBeCloseTo(Math.hypot(SHEET.w - 40, SHEET.h - 50), 9);
      expect(firstPixel(snapshot.canvas)).toEqual([...hexToRgb(index === 3 ? BLUE : RED)]);
      prepared.release();
    }
    expect(changed).toEqual([1, 3]);
    prepared.dispose();
    // Every op up to the last fill went on the sheet, in order; nothing after it is needed.
    const order = (spy: typeof applied | typeof flooded) =>
      spy.mock.calls.map(([op], i) => [spy.mock.invocationCallOrder[i], op] as const);
    const onSheet = [...order(applied), ...order(flooded)].toSorted(([a], [b]) => a - b);
    expect(onSheet.map(([, op]) => op)).toEqual([...ops.slice(0, 4), ...ops.slice(0, 4)]);
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
    const snapshot = await prepared?.next(2);
    if (!snapshot) throw new Error("the fill changed nothing");
    const inside = { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };
    expect(snapshot.box).toEqual(inside);
    // It's the fill's own layer, so the lines' pixels in its box stay clear.
    const at = (px: number, py: number) => [
      ...(contextOf(snapshot.canvas)?.getImageData(px - inside.x, py - inside.y, 1, 1).data ?? []),
    ];
    expect(at(inside.x, inside.y)).toEqual([...hexToRgb(RED), 255]);
    expect(at(spur.x, spur.y + 2)).toEqual([0, 0, 0, 0]);
    prepared?.dispose();
  });

  it("grows the frame to hold a fill that reached past the strokes, and cuts its snapshots in that", async () => {
    const prepared = await prepare([line, fill(RED, 100)], { frame: STROKES });
    expect(prepared?.frame).toEqual(SHEET);
    expect((await prepared?.next(1))?.box).toEqual({ x: 0, y: 0, w: SHEET.w, h: SHEET.h });
    prepared?.dispose();
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
    expect((await prepared?.next(0))?.box).toEqual({ x: 10, y: 5, w: SHEET.w, h: SHEET.h });
    prepared?.dispose();
  });

  it("reads the sheet's view once per fill, and once more where a stroke lands between fills", async () => {
    const ops = [line, fill(RED, 100), fill(BLUE, 200), line, fill(RED, 300)];
    const prepared = await prepare(ops);
    for (const index of [1, 2, 4]) {
      await prepared?.next(index);
      prepared?.release();
    }
    // Each read of the view clears the canvas it reads into first.
    const reads = madeContexts()
      .filter((context) => context.settings?.willReadFrequently)
      .flatMap((context) => context.calls)
      .filter(([name]) => name === "clearRect");
    const fills = ops.filter((op) => op.tool === "fill").length;
    // Two runs of fills: each reads before its first fill, then after every one.
    expect(reads).toHaveLength(fills + 2);
    prepared?.dispose();
  });

  it("lets go of every owned canvas on disposal", async () => {
    const prepared = await prepare([line, fill(RED, 100), fill(BLUE, 200)], { frame: STROKES });
    await prepared?.next(1);
    prepared?.dispose();
    expect(heldCanvases()).toEqual([]);
  });

  it("replays strokes and erasers between streamed fills once", async () => {
    const eraser: StrokeOp = { ...line, tool: "eraser", T: 200 };
    const steps = [fill(RED, 0), line, eraser, fill(BLUE, 300), fill(RED, 400)];
    const applied = vi.spyOn(LayerInk.prototype, "apply");
    const flooded = vi.spyOn(LayerInk.prototype, "flood");
    const prepared = await prepare(steps);
    applied.mockClear();
    flooded.mockClear();
    for (const index of [0, 3, 4]) {
      await prepared?.next(index);
      prepared?.release();
    }
    expect(applied.mock.calls.map(([step]) => step)).toEqual([line, eraser]);
    expect(flooded.mock.calls.map(([step]) => step)).toEqual([steps[0], steps[3], steps[4]]);
    prepared?.dispose();
  });

  it("gives each next its own active deadline and releases everything on timeout", async () => {
    let now = 0;
    let slow = false;
    const prepared = await prepare([fill(RED, 0), fill(BLUE, 100)], {
      now: () => now,
      yieldToPage: async () => {
        if (slow) now += PREPARE_TIMEOUT_MS + 1;
      },
    });
    now += PREPARE_TIMEOUT_MS * 4;
    expect(await prepared?.next(0)).not.toBeNull();
    prepared?.release();
    now += PREPARE_TIMEOUT_MS * 4;
    slow = true;
    await expect(prepared?.next(1)).rejects.toThrow("fill 2 of 2");
    expect(heldCanvases()).toEqual([]);
  });

  it("disposes during a pending yield without publishing a late snapshot", async () => {
    let resume = () => {};
    let pending = false;
    const prepared = await prepare([fill(RED, 0)], {
      yieldToPage: () =>
        pending
          ? new Promise<void>((resolve) => {
              resume = resolve;
            })
          : Promise.resolve(),
    });
    pending = true;
    const next = prepared?.next(0);
    prepared?.dispose();
    expect(heldCanvases()).toEqual([]);
    resume();
    await expect(next).resolves.toBeNull();
    expect(heldCanvases()).toEqual([]);
    await expect(prepared?.next(0)).resolves.toBeNull();
  });

  it("yields during a long stroke history before reaching a fill", async () => {
    const applied = vi.spyOn(LayerInk.prototype, "apply");
    let stopped = false;
    const prepared = await prepare([...Array.from({ length: 200 }, () => line), fill(RED, 500)], {
      stopped: () => stopped,
      yieldToPage: async () => {
        stopped = true;
      },
    });
    expect(prepared).toBeNull();
    expect(applied).toHaveBeenCalledTimes(63);
    expect(heldCanvases()).toEqual([]);
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
