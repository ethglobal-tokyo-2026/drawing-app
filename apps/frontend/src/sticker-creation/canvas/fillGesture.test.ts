// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { contextOf, forgetContexts } from "../../sticker-board/timelapse/testCanvas";
import { LayerInk } from "../layers/layerInk";
import { LayerHistory } from "../layers/layerHistory";
import { LayerDisplay } from "../layers/layerDisplay";
import { brush } from "../layers/testLayerSteps";
import { FIRST_LAYERS, type LayerState } from "../layers/layerState";
import type { FrameSource } from "../../ui/frameSource";
import { prepareFillPatch } from "./fill-worker/core";
import type { FillPatchInput, FillPatchResult } from "./fill-worker/protocol";
import type { FillOp } from "./ops";
import type { Pixels } from "./fill";
import { FillGestureController } from "./fillGesture";

vi.mock("./context2d", () => import("./testContext2d"));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  forgetContexts();
});

function setup(
  width = 40,
  height = 10,
  overrides: Partial<ConstructorParameters<typeof FillGestureController>[3]> = {},
) {
  const frame = { w: width, h: height, density: 1 };
  const ink = new LayerInk();
  ink.setFrame(frame);
  let time = 0;
  const requests = new Set<(time: number) => void>();
  const frames: FrameSource = {
    now: () => time,
    request: (callback) => {
      requests.add(callback);
      return () => requests.delete(callback);
    },
  };
  const workerRequests: {
    input: FillPatchInput;
    resolve: (result: FillPatchResult) => void;
    signal: AbortSignal;
    deadline: number;
  }[] = [];
  const saved: FillOp[] = [];
  const previews: Pixels[] = [];
  const errors: Error[] = [];
  let state: LayerState = FIRST_LAYERS;
  const worker = {
    prepare: (input: FillPatchInput, deadline: number, signal: AbortSignal) =>
      new Promise<FillPatchResult>((resolve) => {
        workerRequests.push({ input, resolve, signal, deadline });
      }),
    dispose: () => {},
  };
  const controller = new FillGestureController(ink, worker, frames, {
    state: () => state,
    reserve: () => {},
    retryCanvas: <T>(_op: FillOp | string, action: () => T) => action(),
    preview: (_layer, _at, pixels) => {
      previews.push(pixels);
    },
    clearPreview: () => {
      previews.length = 0;
    },
    commit: (op) => saved.push(op),
    show: () => {},
    fail: (error) => errors.push(error),
    changed: () => {},
    ...overrides,
  });
  const settings = { layer: 1, reference: "layer" as const, color: "#ff0000", gap: 0, frame };
  async function tick(ms = 16) {
    time += ms;
    const callbacks = [...requests];
    requests.clear();
    for (const callback of callbacks) callback(time);
    await Promise.resolve();
    await Promise.resolve();
  }
  async function answer() {
    const request = workerRequests.shift();
    if (!request) throw new Error("No pending worker request");
    request.resolve(prepareFillPatch(request.input));
    await Promise.resolve();
    await Promise.resolve();
  }
  function seed(columns: readonly (readonly number[])[]) {
    ink.flood(
      { tool: "fill", layer: 1, reference: "layer", color: "#ffffff", gap: 0, x: 0, y: 0, T: 0 },
      state,
    );
    const canvas = ink.layerCanvas(1);
    if (!canvas) throw new Error("Missing seeded canvas");
    const pixels = new ImageData(width, height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        pixels.data.set(columns[x % columns.length], (y * width + x) * 4);
    const context = contextOf(canvas);
    if (!context) throw new Error("Missing seeded context");
    context.putImageData(pixels, 0, 0);
  }
  return {
    controller,
    ink,
    frame,
    settings,
    saved,
    previews,
    errors,
    workerRequests,
    tick,
    answer,
    seed,
    elapse: (ms: number) => {
      time += ms;
    },
    setState: (next: LayerState) => {
      state = next;
    },
  };
}

describe("continuous Fill", () => {
  it("submits the next region from a worker answer without waiting for another display frame", async () => {
    const run = setup(5, 3);
    run.seed([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ]);
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 1, T: 0 });
    run.controller.release(1, { x: 4, y: 1, T: 10 });
    await run.tick();
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    expect(run.saved).toHaveLength(1);
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    expect(run.saved.map((op) => Math.floor(op.x))).toEqual([0, 3]);
    expect(run.saved.map((op) => op.undoWithPrevious)).toEqual([undefined, true]);
    expect(run.controller.busy).toBe(false);
  });

  it("yields after display consumes the worker answer's scan budget", async () => {
    const run = setup(5, 3, {
      show: () => {
        run.elapse(4);
      },
    });
    run.seed([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ]);
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 1, T: 0 });
    run.controller.release(1, { x: 4, y: 1, T: 10 });
    await run.tick();
    await run.answer();
    expect(run.saved).toHaveLength(1);
    expect(run.workerRequests).toEqual([]);
    expect(run.controller.busy).toBe(true);
    await run.tick();
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    await run.tick();
    expect(run.controller.busy).toBe(false);
  });

  it("keeps a provisional worker answer pending without advancing to the next region", async () => {
    const run = setup(5, 3);
    run.seed([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ]);
    run.controller.begin(1, "touch", run.settings, { x: 0, y: 1, T: 0 });
    run.controller.append(1, [{ x: 4, y: 1, T: 10 }]);
    await run.tick();
    await run.answer();
    await run.tick();
    expect(run.saved).toEqual([]);
    expect(run.previews).toHaveLength(1);
    expect(run.workerRequests).toEqual([]);
    run.controller.release(1, { x: 4, y: 1, T: 20 });
    await run.tick();
    expect(run.saved).toHaveLength(1);
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    await run.tick();
    expect(run.saved).toHaveLength(2);
  });

  it("limits worker-answer continuation to 256 path candidates before yielding", async () => {
    const run = setup(601, 1);
    run.seed(
      Array.from({ length: 601 }, (_, x) =>
        x === 0 || x === 600 ? [255, 255, 255, 255] : [0, 0, 0, 255],
      ),
    );
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 0, T: 0 });
    run.controller.release(1, { x: 600, y: 0, T: 10 });
    await run.tick();
    await run.answer();
    expect(run.saved).toHaveLength(1);
    expect(run.workerRequests).toEqual([]);
    await run.tick();
    expect(run.workerRequests).toEqual([]);
    await run.tick();
    expect(run.workerRequests).toHaveLength(1);
    run.controller.dispose();
  });

  it("records held and released queued cancellations before removing their accepted prefix", async () => {
    const run = setup();
    const log = vi.spyOn(console, "info").mockImplementation(() => {
      expect(run.controller.busy).toBe(true);
    });
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 10 });
    await run.tick();
    await run.answer();
    run.controller.release(1, { x: 8, y: 4, T: 15 });
    run.controller.begin(1, "touch", run.settings, { x: 6, y: 4, T: 20 });
    run.controller.abort("sheet hidden");
    expect(log).toHaveBeenCalledExactlyOnceWith("Fill input cancelled", {
      reason: "sheet hidden",
      affectedGestures: 2,
      gestures: [
        {
          pointerId: 1,
          accepted: true,
          released: true,
          layer: 1,
          seed: { x: 4, y: 4, T: 10 },
          completedRegions: 1,
        },
        {
          pointerId: 1,
          accepted: false,
          released: false,
          layer: 1,
          seed: { x: 6, y: 4, T: 20 },
          completedRegions: 0,
        },
      ],
    });
    expect(run.controller.busy).toBe(false);
    expect(run.saved).toHaveLength(1);
    expect(run.errors).toEqual([]);
    run.controller.abort("already empty");
    expect(log).toHaveBeenCalledOnce();
  });

  it("records a provisional contact's cancellation reason and seed before clearing its preview", async () => {
    const run = setup();
    const log = vi.spyOn(console, "info").mockImplementation(() => {
      expect(run.previews).toHaveLength(1);
    });
    run.controller.begin(8, "touch", run.settings, { x: 4, y: 4, T: 10 });
    await run.tick();
    await run.answer();
    run.controller.cancel(8, "second finger");
    expect(log).toHaveBeenCalledExactlyOnceWith("Fill input cancelled", {
      reason: "second finger",
      affectedGestures: 1,
      gestures: [
        {
          pointerId: 8,
          accepted: false,
          released: false,
          layer: 1,
          seed: { x: 4, y: 4, T: 10 },
          completedRegions: 0,
        },
      ],
    });
    expect(run.previews).toEqual([]);
    expect(run.saved).toEqual([]);
    run.controller.cancel(8, "already removed");
    expect(log).toHaveBeenCalledOnce();
  });
  it("reserves canvas room around a saturated clipped-layer preview and accepted checkpoint detachment", async () => {
    const frame = { w: 1400, h: 2000, density: 1 };
    const ink = new LayerInk();
    ink.setFrame(frame);
    const history = new LayerHistory(ink);
    history.perform({ tool: "add", layer: 2, at: 1, T: 0 });
    for (const layer of [1, 2]) {
      const op = brush(layer);
      ink.apply(op, history.state);
      history.commit(op);
      const canvas = ink.layerCanvas(layer);
      const context = canvas && contextOf(canvas);
      if (!context) throw new Error("Missing layer context");
      const pixels = new ImageData(8, 8);
      for (let i = 0; i < pixels.data.length; i += 4) pixels.data.set([80, 80, 80, 255], i);
      context.putImageData(pixels, frame.w - 8, frame.h - 8);
    }
    const priorBudget = ink.copyBudgetFor(history.inked.size);
    for (let i = 0; i <= priorBudget; i++) {
      const op: FillOp = {
        tool: "fill",
        layer: 2,
        reference: "layer",
        color: i % 2 ? "#555555" : "#777777",
        x: frame.w - 4,
        y: frame.h - 4,
        gap: 0,
        T: i,
      };
      ink.flood(op, history.state);
      history.commit(op);
    }
    const initialCopies = ink.copiesHeld;
    expect(initialCopies).toBe(priorBudget);
    history.perform({ tool: "clip", layer: 2, on: true, T: 20 });
    const display = new LayerDisplay(document.createElement("div"), ink);
    display.show(history.state, 2);
    expect(ink.copiesHeld).toBeGreaterThan(ink.copyBudgetFor(history.inked.size));
    const selected = ink.layerCanvas(2);
    const before =
      selected &&
      contextOf(selected)
        ?.getImageData(frame.w - 4, frame.h - 4, 1, 1)
        .data.slice();
    const callbacks = new Set<() => void>();
    let prepared = false;
    const saved: FillOp[] = [];
    const errors: Error[] = [];
    const reserves: number[] = [];
    const controller = new FillGestureController(
      ink,
      {
        prepare: (input) => Promise.resolve(prepareFillPatch(input)),
        dispose: () => {},
      },
      {
        now: () => 0,
        request: (next) => {
          const callback = () => next(0);
          callbacks.add(callback);
          return () => {
            callbacks.delete(callback);
          };
        },
      },
      {
        state: () => history.state,
        reserve: (copies) => {
          history.reserveCanvases(copies);
          reserves.push(copies);
          expect(ink.copiesHeld + copies).toBeLessThanOrEqual(
            ink.copyBudgetFor(history.inked.size),
          );
        },
        retryCanvas: (_op, write) => write(),
        preview: (layer, at, pixels) => {
          display.previewFill(layer, at, pixels);
          prepared = true;
        },
        clearPreview: () => display.clearFillPreview(),
        commit: (op) => {
          history.commit(op);
          saved.push(op);
        },
        show: (_layer, changed) => {
          display.showCurrent();
          display.inkChanged(changed);
        },
        fail: (error) => errors.push(error),
        changed: () => {},
      },
    );
    controller.begin(
      1,
      "touch",
      { layer: 2, reference: "visible", color: "#ff0000", gap: 0, frame },
      { x: frame.w - 4, y: frame.h - 4, T: 30 },
    );
    for (let i = 0; i < 10 && !prepared; i++) {
      const next = [...callbacks];
      callbacks.clear();
      for (const callback of next) callback();
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(prepared).toBe(true);
    expect(
      selected && contextOf(selected)?.getImageData(frame.w - 4, frame.h - 4, 1, 1).data,
    ).toEqual(before);
    expect(saved).toEqual([]);
    expect(ink.copiesHeld).toBeLessThan(initialCopies);
    const previewCopies = ink.copiesHeld;
    controller.release(1, { x: frame.w - 4, y: frame.h - 4, T: 40 });
    for (let i = 0; i < 10 && controller.busy; i++) {
      const next = [...callbacks];
      callbacks.clear();
      for (const callback of next) callback();
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(saved).toHaveLength(1);
    expect(ink.copiesHeld).toBe(previewCopies + 1);
    expect(ink.copiesHeld + 1).toBeLessThanOrEqual(ink.copyBudgetFor(history.inked.size));
    expect(reserves).toContain(2);
    expect(errors).toEqual([]);
    controller.dispose();
    display.release();
    history.dropCheckpoints();
    ink.releaseAll();
  }, 20_000);
  it("installs accepted mouse ink and saves its captured settings", async () => {
    const run = setup();
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    expect(run.controller.acceptedPending).toBe(true);
    await run.answer();
    expect(run.saved).toEqual([
      {
        tool: "fill",
        layer: 1,
        reference: "layer",
        color: "#ff0000",
        gap: 0,
        x: 4.5,
        y: 4.5,
        T: 20,
      },
    ]);
    const canvas = run.ink.layerCanvas(1);
    expect(canvas).not.toBeNull();
    expect(canvas && Array.from(contextOf(canvas)?.getImageData(4, 4, 1, 1).data ?? [])).toEqual([
      255, 0, 0, 255,
    ]);
    run.controller.dispose();
  });

  it("previews touch without writing until acceptance, then drains the same prepared result", async () => {
    const run = setup();
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    await run.answer();
    expect(run.previews).toHaveLength(1);
    expect(run.ink.layerCanvas(1)).toBeNull();
    expect(run.saved).toEqual([]);
    run.controller.release(1, { x: 4, y: 4, T: 30 });
    await run.tick();
    expect(run.saved).toHaveLength(1);
    expect(run.previews).toEqual([]);
    await run.controller.finish();
    expect(run.controller.busy).toBe(false);
  });

  it("interpolates crossed cells, includes lift, and groups only successful regions", async () => {
    const run = setup(9, 5);
    run.seed([
      [255, 0, 0, 255],
      [0, 0, 0, 255],
      [240, 0, 0, 255],
    ]);
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 2, T: 0 });
    run.controller.release(1, { x: 8, y: 2, T: 80 });
    for (let i = 0; i < 20 && run.controller.busy; i++) {
      await run.tick();
      if (run.workerRequests.length) await run.answer();
    }
    expect(run.saved.map((op) => Math.floor(op.x))).toEqual([2, 5, 8]);
    expect(run.saved.map((op) => op.undoWithPrevious)).toEqual([undefined, true, true]);
    expect(run.saved.map((op) => op.T)).toEqual([15, 45, 75]);
    expect(run.controller.busy).toBe(false);
  });

  it("keeps rapid released taps with reused pointer IDs as separate FIFO actions", async () => {
    const run = setup();
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 10 });
    run.controller.release(1, { x: 4, y: 4, T: 11 });
    run.controller.begin(1, "pen", { ...run.settings, color: "#0000ff" }, { x: 4, y: 4, T: 20 });
    run.controller.release(1, { x: 4, y: 4, T: 21 });
    await run.tick();
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    await run.tick();
    expect(run.workerRequests).toHaveLength(1);
    await run.answer();
    await run.tick();
    expect(run.saved.map((op) => [op.color, op.undoWithPrevious])).toEqual([
      ["#ff0000", undefined],
      ["#0000ff", undefined],
    ]);
    await run.controller.finish();
  });

  it("rejects later colors outside the original target even when each neighbor is close", async () => {
    const run = setup(9, 5);
    run.seed([
      [100, 100, 100, 255],
      [0, 0, 0, 255],
      [150, 100, 100, 255],
      [0, 0, 0, 255],
      [200, 100, 100, 255],
    ]);
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 2, T: 0 });
    run.controller.release(1, { x: 4, y: 2, T: 40 });
    for (let i = 0; i < 10 && run.controller.busy; i++) {
      await run.tick();
      if (run.workerRequests.length) await run.answer();
    }
    expect(run.saved.map((op) => Math.floor(op.x))).toEqual([0, 2]);
  });

  it("bounds same-paint scanning and caches each reference tile without worker requests", async () => {
    const run = setup(1024, 1);
    run.seed([[255, 0, 0, 255]]);
    const read = vi.spyOn(run.ink, "readFillReference");
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 0, T: 0 });
    run.controller.release(1, { x: 1023, y: 0, T: 100 });
    await run.tick();
    expect(run.controller.busy).toBe(true);
    expect(read.mock.calls.length).toBeLessThanOrEqual(2);
    for (let i = 0; i < 10 && run.controller.busy; i++) await run.tick();
    expect(read).toHaveBeenCalledTimes(8);
    expect(read.mock.calls.every(([, , at]) => at.w * at.h * 4 <= 65536)).toBe(true);
    expect(run.workerRequests).toEqual([]);
    expect(run.saved).toEqual([]);
  });

  it("cancels provisional preview without history and ignores its late worker answer", async () => {
    const run = setup();
    const release = vi.spyOn(run.ink, "releaseFill");
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    const signal = run.workerRequests[0].signal;
    run.controller.cancel(1, "second finger");
    expect(signal.aborted).toBe(true);
    await run.answer();
    expect(run.ink.layerCanvas(1)).toBeNull();
    expect(run.previews).toEqual([]);
    expect(run.saved).toEqual([]);
    expect(release).toHaveBeenCalledTimes(1);
    expect(run.controller.busy).toBe(false);
    expect(run.errors).toEqual([]);
  });

  it("shares completion, accepts provisional touch, and retains its pending first region", async () => {
    const run = setup();
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    const finishing = run.controller.finish();
    expect(run.controller.finish()).toBe(finishing);
    expect(run.controller.acceptedPending).toBe(true);
    await run.answer();
    await run.tick();
    await finishing;
    expect(run.saved).toHaveLength(1);
    expect(run.controller.busy).toBe(false);
  });

  it("fails a stalled released drain, preserving already committed ink", async () => {
    vi.useFakeTimers();
    const run = setup();
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    await run.answer();
    run.controller.release(1, { x: 8, y: 4, T: 30 });
    const finishing = run.controller.finish();
    const rejected = expect(finishing).rejects.toThrow("inactivity");
    await vi.advanceTimersByTimeAsync(2001);
    await rejected;
    expect(run.saved).toHaveLength(1);
    expect(run.errors).toHaveLength(1);
    expect(run.controller.busy).toBe(false);
  });

  it("does not start a path from non-finite coordinates", async () => {
    const run = setup();
    run.controller.begin(1, "mouse", run.settings, { x: NaN, y: 4, T: 20 });
    await run.tick();
    expect(run.controller.busy).toBe(false);
    expect(run.workerRequests).toEqual([]);
  });

  it("marks a locked no-write region before saving the first successful region without continuation", async () => {
    const run = setup(9, 5);
    run.seed([
      [0, 0, 0, 0],
      [0, 0, 0, 255],
      [40, 40, 40, 100],
    ]);
    run.setState({ ...FIRST_LAYERS, layers: [{ ...FIRST_LAYERS.layers[0], locked: true }] });
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 2, T: 0 });
    run.controller.release(1, { x: 8, y: 2, T: 80 });
    for (let i = 0; i < 30 && run.controller.busy; i++) {
      await run.tick();
      if (run.workerRequests.length) await run.answer();
    }
    expect(run.saved.map((op) => Math.floor(op.x))).toEqual([2, 5, 8]);
    expect(run.saved.map((op) => op.undoWithPrevious)).toEqual([undefined, true, true]);
    const canvas = run.ink.layerCanvas(1);
    expect(canvas && contextOf(canvas)?.getImageData(2, 2, 1, 1).data[3]).toBe(100);
  });

  it("rereads references after installation and ignores revisits to a found region", async () => {
    const run = setup();
    const read = vi.spyOn(run.ink, "readFillReference");
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 0 });
    await run.tick();
    await run.answer();
    run.controller.append(1, [
      { x: 30, y: 4, T: 10 },
      { x: 4, y: 4, T: 20 },
    ]);
    run.controller.release(1, { x: 30, y: 4, T: 30 });
    await run.tick();
    expect(run.saved).toHaveLength(1);
    expect(run.workerRequests).toEqual([]);
    run.controller.begin(1, "mouse", { ...run.settings, color: "#0000ff" }, { x: 4, y: 4, T: 40 });
    await run.tick();
    expect(read).toHaveBeenCalledTimes(2);
    expect(run.workerRequests[0].input.shown.data.slice(0, 4)).toEqual(
      new Uint8ClampedArray([255, 0, 0, 255]),
    );
    run.controller.dispose();
  });

  it("rejects a region answer after its absolute deadline and releases prepared metadata", async () => {
    const run = setup();
    const release = vi.spyOn(run.ink, "releaseFill");
    run.controller.begin(1, "mouse", run.settings, { x: 4, y: 4, T: 0 });
    run.controller.release(1, { x: 4, y: 4, T: 10 });
    await run.tick();
    await run.tick(1001);
    await run.answer();
    expect(run.errors[0]?.message).toContain("region deadline");
    expect(release).toHaveBeenCalledTimes(1);
    expect(run.saved).toEqual([]);
    expect(run.controller.busy).toBe(false);
  });

  it("allows a productive released drain to take longer than the inactivity deadline", async () => {
    vi.useFakeTimers();
    const run = setup(12, 5);
    run.seed([
      [250, 250, 250, 255],
      [0, 0, 0, 255],
      [250, 250, 250, 255],
      [0, 0, 0, 255],
    ]);
    run.controller.begin(1, "mouse", run.settings, { x: 0, y: 2, T: 0 });
    run.controller.release(1, { x: 10, y: 2, T: 10 });
    const finishing = run.controller.finish();
    for (let i = 0; i < 6; i++) {
      await run.tick();
      await vi.advanceTimersByTimeAsync(600);
      await run.tick(600);
      await run.answer();
    }
    await run.tick();
    await finishing;
    expect(run.saved).toHaveLength(6);
    expect(run.errors).toEqual([]);
  });

  it("clears a prepared preview and rereads pixels for a replacement gesture", async () => {
    const run = setup();
    const read = vi.spyOn(run.ink, "readFillReference");
    const released = vi.spyOn(run.ink, "releaseFill");
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 0 });
    await run.tick();
    await run.answer();
    run.controller.cancel(1, "second finger");
    expect(run.previews).toEqual([]);
    expect(released).toHaveBeenCalledTimes(1);
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 20 });
    await run.tick();
    expect(read).toHaveBeenCalledTimes(2);
    expect(run.workerRequests[0].input.target.data.every((byte) => byte === 0)).toBe(true);
    run.controller.dispose();
  });

  it("reports preview cancellation failure after releasing queued work", async () => {
    const run = setup(40, 10, {
      clearPreview: () => {
        throw new Error("Preview display unavailable");
      },
    });
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 0 });
    await run.tick();
    await run.answer();
    expect(() => run.controller.cancel(1, "second finger")).not.toThrow();
    expect(run.controller.busy).toBe(false);
    expect(run.saved).toEqual([]);
    expect(run.errors[0]?.message).toBe("Preview display unavailable");
  });

  it("reports preview creation failure without recursively attempting a failed clear", async () => {
    const run = setup(40, 10, {
      preview: () => {
        throw new Error("Preview allocation failed");
      },
      clearPreview: () => {
        throw new Error("Preview clear failed");
      },
    });
    run.controller.begin(1, "touch", run.settings, { x: 4, y: 4, T: 0 });
    await run.tick();
    await run.answer();
    expect(run.controller.busy).toBe(false);
    expect(run.saved).toEqual([]);
    expect(run.errors).toHaveLength(1);
  });
});
