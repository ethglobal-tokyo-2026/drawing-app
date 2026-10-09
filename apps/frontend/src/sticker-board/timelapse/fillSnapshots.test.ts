// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { hexToRgb } from "../../sticker-creation/canvas/color";
import { InkSurface } from "../../sticker-creation/canvas/inkSurface";
import type { FillOp, Op, StrokeOp } from "../../sticker-creation/canvas/ops";
import {
  PREPARE_TIMEOUT_MS,
  prepareFillSnapshots,
  type PrepareControl,
  type PrepareInput,
} from "./fillSnapshots";
import { contextOf, forgetContexts, madeContexts } from "./testCanvas";

vi.mock("../../sticker-creation/canvas/context2d", async () => {
  const { fakeContext2d } = await import("./testCanvas");
  return { context2d: fakeContext2d };
});
/** Ops the sheet fails to apply, as if it ran out of memory. */
const failing = vi.hoisted(() => new Set<object>());
vi.mock("../../sticker-creation/canvas/inkSurface", async (importOriginal) => {
  const real = await importOriginal<{ InkSurface: typeof InkSurface }>();
  class FailingInkSurface extends real.InkSurface {
    override apply(op: Op): void {
      if (failing.has(op)) throw new Error("out of memory");
      super.apply(op);
    }
  }
  return { ...real, InkSurface: FailingInkSurface };
});

const line: StrokeOp = {
  tool: "brush",
  color: "#1c1824",
  T: 0,
  pts: [30, 40, 4, 0, 60, 40, 4, 16],
};
const fill = (color: string, T: number): FillOp => ({
  tool: "fill",
  color,
  x: 40,
  y: 50,
  gap: 0,
  T,
});
const RED = "#ff0000";
const BLUE = "#0000ff";

/** A 100 × 100 sheet drawn at density 1, whose sticker covers `place`, shown 1:1. */
const input = (ops: Op[], place = { x: 20, y: 30, w: 60, h: 40 }): PrepareInput => ({
  ops,
  ink: { width: 100, height: 100 },
  place,
  density: 1,
  display: { width: 60, height: 40, scale: 1 },
});
const control = (overrides: Partial<PrepareControl> = {}): PrepareControl => ({
  now: () => 0,
  stopped: () => false,
  yieldToPage: async () => {},
  ...overrides,
});
const prepare = (ops: Op[], overrides?: Partial<PrepareControl>) =>
  prepareFillSnapshots(input(ops), control(overrides));

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
});

describe("the prepare pass", () => {
  it("keeps each fill's change to the display, by its op, and none for a fill that changed nothing", async () => {
    const applied = vi.spyOn(InkSurface.prototype, "apply");
    const ops = [line, fill(RED, 100), fill(RED, 200), fill(BLUE, 300), line];
    const snapshots = await prepare(ops);
    if (!snapshots) throw new Error("it wasn't stopped");

    expect([...snapshots.keys()]).toEqual([1, 3]);
    for (const { box, reach } of snapshots.values()) {
      expect(box).toEqual({ x: 0, y: 0, w: 60, h: 40 });
      // The tap, (40, 50) on the sheet, is (20, 20) on the display; the fill reached its far corner.
      expect(reach).toBeCloseTo(Math.hypot(60 - 20, 40 - 20), 9);
    }
    const blue = snapshots.get(3)?.canvas;
    if (!blue) throw new Error("the blue fill changed the display");
    expect(firstPixel(blue)).toEqual([...hexToRgb(BLUE)]);
    // Every op up to the last fill went on the sheet, in order; nothing after it is needed.
    expect(applied.mock.calls.map(([op]) => op)).toEqual(ops.slice(0, 4));
  });

  it("reads only the sheet where the sticker reaches past its edge", async () => {
    const snapshots = await prepareFillSnapshots(
      input([fill(RED, 0)], { x: -10, y: -5, w: 60, h: 40 }),
      control(),
    );
    expect(snapshots?.get(0)?.box).toEqual({ x: 10, y: 5, w: 50, h: 35 });
  });

  it("lets go of its own canvases when done, keeping only the snapshots", async () => {
    const snapshots = await prepare([line, fill(RED, 100), fill(BLUE, 200)]);
    const kept = [...(snapshots?.values() ?? [])].map((s) => s.canvas);
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
    ["stroke, op 2 of 4,", { ...line, T: 50 }],
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
