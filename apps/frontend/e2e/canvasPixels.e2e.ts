import { expect, test, type Page } from "@playwright/test";
import type { Step } from "../src/sticker-creation/canvas/ops.ts";

const EMPTY_PAGE = "/e2e-canvas-pixels";

test("minimum brush dots remain within the sealed mask", async ({ page }) => {
  await page.route(`**${EMPTY_PAGE}`, (route) =>
    route.fulfill({
      body: "<!doctype html><title>Canvas pixels</title>",
      contentType: "text/html",
    }),
  );
  await page.goto(EMPTY_PAGE);

  const results = await page.evaluate(async () => {
    const [{ sizePx, StrokeBuilder }, { paintStroke }, { dieCut }] = await Promise.all([
      import("../src/sticker-creation/canvas/brush.ts"),
      import("../src/sticker-creation/canvas/paintStroke.ts"),
      import("../src/sticker-creation/sealing/dieCut.ts"),
    ]);
    const outcomes: {
      density: number;
      offset: number;
      detached: boolean;
      pixels: number;
      held: number;
    }[] = [];
    for (const density of [1, 2, 3]) {
      for (const offset of [0, 2.25, 4.5]) {
        for (const detached of [false, true]) {
          const canvas = document.createElement("canvas");
          canvas.width = 374 * density;
          canvas.height = 748 * density;
          const g = canvas.getContext("2d", { willReadFrequently: true });
          if (!g) throw new Error("The native 2D canvas is unavailable");
          g.scale(density, density);
          const dot = 58.4375 + offset;
          const brush = new StrokeBuilder({
            tool: "brush",
            layer: 1,
            color: "#16121c",
            size: sizePx(0),
            x: dot,
            y: dot,
            t: 0,
            T: 0,
            pressure: 0.5,
            pointerType: "pen",
            pressureVaries: true,
            response: "normal",
          });
          brush.settle(dot, dot);
          paintStroke(g, brush.op);
          if (detached) {
            const larger = new StrokeBuilder({
              tool: "brush",
              layer: 1,
              color: "#16121c",
              size: sizePx(0.6),
              x: 200,
              y: 300,
              t: 0,
              T: 0,
              pressure: 0.5,
              pointerType: "pen",
              pressureVaries: true,
              response: "normal",
            });
            larger.add(240, 320, 0.5, 16);
            larger.settle(240, 320);
            paintStroke(g, larger.op);
          }
          const image = g.getImageData(0, 0, canvas.width, canvas.height);
          const cut = dieCut(image, 23 * density);
          let pixels = 0;
          let held = 0;
          for (
            let y = Math.max(0, Math.floor((dot - 3) * density));
            y < Math.min(canvas.height, Math.ceil((dot + 3) * density));
            y++
          ) {
            for (
              let x = Math.max(0, Math.floor((dot - 3) * density));
              x < Math.min(canvas.width, Math.ceil((dot + 3) * density));
              x++
            ) {
              if (image.data[(y * image.width + x) * 4 + 3] <= 18) continue;
              pixels++;
              if (!cut) continue;
              const cx = Math.floor((x + 0.5) * cut.scale) + cut.pad;
              const cy = Math.floor((y + 0.5) * cut.scale) + cut.pad;
              held += cut.mask[cy * cut.width + cx];
            }
          }
          outcomes.push({ density, offset, detached, pixels, held });
        }
      }
    }
    return outcomes;
  });

  for (const result of results) {
    expect(result.pixels, JSON.stringify(result)).toBeGreaterThan(0);
    expect(result.held, JSON.stringify(result)).toBe(result.pixels);
  }
});

type ReplayMode = "normal" | "skip" | "reduced" | "hidden" | "layered" | "layered-skip";

/** Plays the actual player against the drawing screen's layer ink on a native 100×100 canvas. */
async function replayPixels(page: Page, mode: ReplayMode) {
  await page.route(`**${EMPTY_PAGE}`, (route) =>
    route.fulfill({
      body: "<!doctype html><title>Replay pixels</title>",
      contentType: "text/html",
    }),
  );
  await page.goto(EMPTY_PAGE);
  return page.evaluate(async (mode) => {
    const [
      { createTimelapsePlayer },
      { scheduleTimelapse },
      { encodeTimelapse, decodeTimelapse },
      { LayerInk },
      { FIRST_LAYERS, applyLayerStep },
      { isOp },
      { releaseCanvas },
    ] = await Promise.all([
      import("../src/sticker-board/timelapse/timelapsePlayer.ts"),
      import("../src/sticker-board/timelapse/timelapseSchedule.ts"),
      import("../src/sticker-creation/sealing/timelapse.ts"),
      import("../src/sticker-creation/layers/layerInk.ts"),
      import("../src/sticker-creation/layers/layerState.ts"),
      import("../src/sticker-creation/canvas/ops.ts"),
      import("../src/ui/releaseCanvas.ts"),
    ]);
    const mark = (
      layer: number,
      color: string,
      T: number,
      points: readonly (readonly [number, number])[],
      width: number,
      tool: "brush" | "eraser" = "brush",
    ): Step => ({
      tool,
      layer,
      color,
      T,
      pts: points.flatMap(([x, y], index) => [x, y, width, index * 20]),
    });
    const border = mark(
      1,
      "#0000ff",
      1000,
      [
        [50, 40],
        [80, 40],
        [80, 70],
        [50, 70],
        [50, 40],
      ],
      4,
    );
    const blueFill: Step = {
      tool: "fill",
      layer: 1,
      color: "#0000ff",
      x: 60.5,
      y: 50.5,
      gap: 0,
      T: 1400,
    };
    const steps: Step[] =
      mode === "layered" || mode === "layered-skip"
        ? [
            border,
            blueFill,
            { tool: "add", layer: 2, at: 1, T: 1600 },
            mark(
              2,
              "#ff0000",
              1900,
              [
                [45, 50],
                [75, 50],
              ],
              8,
            ),
            { tool: "clip", layer: 2, on: true, T: 2200 },
            { tool: "opacity", layer: 2, opacity: 50, T: 2500 },
            mark(
              2,
              "#00ff00",
              2800,
              [
                [60, 60],
                [70, 60],
              ],
              6,
            ),
            { tool: "lock", layer: 2, on: true, T: 3100 },
            { ...blueFill, layer: 2, color: "#00ff00", x: 65.5, y: 50.5, T: 3400 },
          ]
        : [
            mark(
              1,
              "#ff0000",
              0,
              [
                [10, 20],
                [30, 20],
              ],
              12,
            ),
            mark(
              1,
              "#000000",
              500,
              [
                [20, 20],
                [23, 20],
              ],
              8,
              "eraser",
            ),
            border,
            blueFill,
            mark(
              1,
              "#00ff00",
              1800,
              [
                [60, 50],
                [70, 50],
              ],
              8,
            ),
          ];
    const timelapse = encodeTimelapse({
      steps,
      start: FIRST_LAYERS,
      frame: { w: 100, h: 100, density: 1 },
      place: { x: 0, y: 0, w: 100, h: 100 },
    });
    const decoded = decodeTimelapse(timelapse);
    const reduced = mode === "reduced";
    const schedule = scheduleTimelapse(decoded.steps, { reduced });
    const canvas = document.createElement("canvas");
    const originalDensity = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
    let now = 1000;
    let pending: ((time: number) => void) | null = null;
    const pendingCount = () => (pending ? 1 : 0);
    const frames = {
      now: () => now,
      request(callback: (time: number) => void) {
        if (pending) throw new Error("The replay requested two frames at once");
        pending = callback;
        return () => {
          if (pending === callback) pending = null;
        };
      },
    };
    /** At most one frame per 16 ms, with a finite guard even if playback never settles. */
    let completed = false;
    const advance = async (ms: number, step = 16) => {
      if (ms < 0 || step <= 0 || Math.ceil(ms / step) > 2000)
        throw new Error(`The manual replay clock cannot advance ${ms} ms by ${step} ms`);
      const until = now + ms;
      while (now < until) {
        now = Math.min(until, now + step);
        const frame = pending;
        pending = null;
        frame?.(now);
        // A pending fill yields without consuming logical replay time. Keep this frame's clock
        // still until the serial consumer requests the next one or completes.
        for (
          let turn = 0;
          !pending && !completed && document.visibilityState !== "hidden";
          turn++
        ) {
          if (turn >= 30) throw new Error("Replay did not resume within 30 tasks");
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }
    };
    const waitForFrame = async () => {
      for (let i = 0; i < 30; i++) {
        if (pending) return;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      throw new Error("Replay did not request a frame within 30 tasks");
    };
    const within = async <T>(work: Promise<T>, name: string, ms: number): Promise<T> => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        return await Promise.race([
          work,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error(`${name} exceeded ${ms} ms`)), ms);
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("The replay canvas has no native 2D context");
    const pixel = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data];
    const sample = () => ({
      red: pixel(14, 20),
      erased: pixel(21, 20),
      beforeFill: pixel(60, 50),
      blue: pixel(55, 55),
      green: pixel(65, 50),
      outside: pixel(90, 90),
      clipped: pixel(46, 50),
      layered: pixel(65, 60),
    });
    const snapshots: Record<string, ReturnType<typeof sample>> = {};
    const player = createTimelapsePlayer({
      timelapse,
      canvas,
      stage: { width: 100, height: 100 },
      figure: { x: 0, y: 0, w: 100, h: 100 },
      reduced,
      kyotoSeika: false,
      frames,
    });
    let visibilityChanged = false;
    try {
      // A stalled preparation is stopped in the enclosing finally, then its own pass sees stop.
      await within(player.prepare(), "Preparing replay", 5000);
      const playing = player.play().then((result) => {
        completed = true;
        return result;
      });
      await waitForFrame();
      await advance(16); // The first frame starts the playback clock at zero.
      let elapsed = 0;
      const endOf = (index: number) => {
        const step = schedule.steps[index];
        // A frame exactly at a fractional due time can land just before it after repeated additions.
        return (step.kind === "stroke" ? (step.at.at(-1) ?? 0) : step.end) + 2;
      };
      const advanceTo = async (time: number) => {
        await advance(time - elapsed);
        elapsed = time;
      };
      if (mode === "normal") {
        await advanceTo(endOf(0));
        snapshots.beforeEraser = sample();
        await advanceTo(endOf(1));
        snapshots.afterEraser = sample();
        await advanceTo(endOf(2));
        snapshots.beforeFill = sample();
        await advanceTo(endOf(3));
        snapshots.afterFill = sample();
      } else if (mode === "skip" || mode === "layered-skip") {
        await advanceTo(endOf(mode === "skip" ? 1 : 0));
        snapshots.beforeSkip = sample();
        player.skip();
      } else if (mode === "hidden") {
        await advanceTo(endOf(0));
        snapshots.beforeHidden = sample();
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        visibilityChanged = true;
        document.dispatchEvent(new Event("visibilitychange"));
        if (pendingCount()) throw new Error("A hidden replay still has a pending frame");
        await advance(1000);
        snapshots.whileHidden = sample();
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        await waitForFrame();
        await advance(16); // Resuming starts a fresh frame interval.
      } else if (mode === "reduced") {
        await advanceTo(endOf(3));
        snapshots.afterFill = sample();
      }
      if (mode !== "skip" && mode !== "layered-skip") await advanceTo(schedule.length + 32);
      const outcome = await within(playing, "Playing replay", 1000);
      const final = sample();
      const reference = new LayerInk();
      reference.setFrame({ w: 100, h: 100, density: 1 });
      let state = decoded.layers;
      let expected: HTMLCanvasElement | null = null;
      try {
        for (const step of decoded.steps) {
          reference.apply(step, state);
          if (!isOp(step)) state = applyLayerStep(state, step);
        }
        expected = reference.composite(state);
        const expectedContext = expected.getContext("2d", { willReadFrequently: true });
        if (!expectedContext) throw new Error("The completed drawing has no native 2D context");
        const actual = context.getImageData(0, 0, 100, 100).data;
        const wanted = expectedContext.getImageData(0, 0, 100, 100).data;
        const compare = (shown: Uint8ClampedArray) => {
          let hardDifferences = 0;
          let edgeDifferences = 0;
          let maxEdgeDifference = 0;
          let maxHardContourDifference = 0;
          const firstDifferences: {
            x: number;
            y: number;
            actual: number[];
            wanted: number[];
          }[] = [];
          const firstHardDifferences: typeof firstDifferences = [];
          for (let i = 0; i < shown.length; i += 4) {
            if (shown.slice(i, i + 4).every((channel, k) => channel === wanted[i + k])) continue;
            const x = (i / 4) % 100;
            const y = Math.floor(i / 400);
            const neighbors = [
              x > 0 ? i - 4 : -1,
              x < 99 ? i + 4 : -1,
              y > 0 ? i - 400 : -1,
              y < 99 ? i + 400 : -1,
            ].filter((neighbor) => neighbor >= 0);
            const wantedAlpha = wanted[i + 3];
            const shownAlpha = shown[i + 3];
            const partial = (alpha: number) => alpha > 0 && alpha < 255;
            // Only the completed drawing defines an edge. One cardinal neighbor of a reference
            // alpha fringe is allowed for native rasterization; a color transition over an opaque
            // fill is an edge too. A hard alpha contour permits only tiny native rounding.
            const referenceFringe =
              partial(wantedAlpha) ||
              neighbors.some((neighbor) => partial(wanted[neighbor + 3])) ||
              (wantedAlpha === 255 &&
                neighbors.some(
                  (neighbor) =>
                    wanted[neighbor + 3] === 255 &&
                    [0, 1, 2].some((channel) => wanted[neighbor + channel] !== wanted[i + channel]),
                ));
            const hardContour = neighbors.some((neighbor) => wanted[neighbor + 3] !== wantedAlpha);
            const difference = Math.max(
              Math.abs(shownAlpha - wantedAlpha),
              ...[0, 1, 2].map((channel) =>
                Math.abs(
                  (shown[i + channel] * shownAlpha - wanted[i + channel] * wantedAlpha) / 255,
                ),
              ),
            );
            if (referenceFringe) {
              edgeDifferences++;
              maxEdgeDifference = Math.max(maxEdgeDifference, difference);
            } else if (hardContour && difference <= 3) {
              edgeDifferences++;
              maxHardContourDifference = Math.max(maxHardContourDifference, difference);
            } else if (difference > 1) {
              hardDifferences++;
              if (firstHardDifferences.length < 8)
                firstHardDifferences.push({
                  x,
                  y,
                  actual: [...shown.slice(i, i + 4)],
                  wanted: [...wanted.slice(i, i + 4)],
                });
            }
            if (firstDifferences.length < 8)
              firstDifferences.push({
                x,
                y,
                actual: [...shown.slice(i, i + 4)],
                wanted: [...wanted.slice(i, i + 4)],
              });
          }
          return {
            hardDifferences,
            edgeDifferences,
            maxEdgeDifference,
            maxHardContourDifference,
            firstDifferences,
            firstHardDifferences,
          };
        };
        const comparison = compare(actual);
        let negativeControl: ReturnType<typeof compare> | null = null;
        if (mode === "normal") {
          const unsampled = (55 * 100 + 56) * 4;
          const uniformBlue = [0, 0, 255, 255];
          for (const at of [
            unsampled,
            unsampled - 4,
            unsampled + 4,
            unsampled - 400,
            unsampled + 400,
          ])
            if (!uniformBlue.every((channel, offset) => wanted[at + offset] === channel))
              throw new Error("The negative control is not in a uniform opaque blue interior");
          const altered = actual.slice();
          altered[unsampled + 3] = 180;
          negativeControl = compare(altered);
        }
        return {
          mode,
          outcome,
          width: canvas.width,
          height: canvas.height,
          layout: player.layout().playing,
          pending: pendingCount(),
          snapshots,
          final,
          ...comparison,
          negativeControl,
        };
      } finally {
        if (expected) releaseCanvas(expected);
        reference.releaseAll();
      }
    } finally {
      player.stop();
      releaseCanvas(canvas);
      if (visibilityChanged) Reflect.deleteProperty(document, "visibilityState");
      if (originalDensity) Object.defineProperty(window, "devicePixelRatio", originalDensity);
      else Reflect.deleteProperty(window, "devicePixelRatio");
    }
  }, mode);
}

test("replay paints recorded colors and erases to transparency", async ({ page }) => {
  const result = await replayPixels(page, "normal");
  expect(result.outcome).toBe("done");
  expect([result.width, result.height]).toEqual([100, 100]);
  expect(result.layout).toEqual({ left: 0, top: 0, scale: 1 });
  expect(result.pending).toBe(0);
  expect(result.snapshots.beforeEraser?.red).toEqual([255, 0, 0, 255]);
  expect(result.snapshots.beforeEraser?.erased).toEqual([255, 0, 0, 255]);
  expect(result.snapshots.afterEraser?.red).toEqual([255, 0, 0, 255]);
  expect(result.snapshots.afterEraser?.erased).toEqual([0, 0, 0, 0]);
  expect(result.snapshots.beforeFill?.beforeFill).toEqual([0, 0, 0, 0]);
  expect(result.snapshots.afterFill?.beforeFill).toEqual([0, 0, 255, 255]);
  expect(result.final.blue).toEqual([0, 0, 255, 255]);
  expect(result.final.green).toEqual([0, 255, 0, 255]);
  expect(result.final.outside).toEqual([0, 0, 0, 0]);
  expect(result.hardDifferences, JSON.stringify(result.firstHardDifferences)).toBe(0);
  expect(result.maxEdgeDifference, JSON.stringify(result.firstDifferences)).toBeLessThanOrEqual(
    100,
  );
});

test("replay pixel oracle rejects partial alpha in an unsampled opaque interior", async ({
  page,
}) => {
  const result = await replayPixels(page, "normal");
  expect(result.hardDifferences).toBe(0);
  expect(result.negativeControl?.hardDifferences).toBe(1);
  expect(result.negativeControl?.firstHardDifferences).toEqual([
    { x: 56, y: 55, actual: [0, 0, 255, 180], wanted: [0, 0, 255, 255] },
  ]);
});

test("fill replay and Skip produce the same pixels as the completed drawing", async ({ page }) => {
  for (const mode of ["skip", "reduced", "hidden"] as const) {
    const result = await replayPixels(page, mode);
    expect(result.outcome, mode).toBe("done");
    expect(result.pending, mode).toBe(0);
    if (mode === "skip") {
      expect(result.snapshots.beforeSkip?.erased).toEqual([0, 0, 0, 0]);
      expect(result.snapshots.beforeSkip?.blue).toEqual([0, 0, 0, 0]);
    }
    if (mode === "reduced") expect(result.snapshots.afterFill?.blue).toEqual([0, 0, 255, 255]);
    if (mode === "hidden") {
      expect(result.snapshots.whileHidden).toEqual(result.snapshots.beforeHidden);
      expect(result.snapshots.beforeHidden?.erased).toEqual([255, 0, 0, 255]);
    }
    expect(result.final.red, mode).toEqual([255, 0, 0, 255]);
    expect(result.final.erased, mode).toEqual([0, 0, 0, 0]);
    expect(result.final.blue, mode).toEqual([0, 0, 255, 255]);
    expect(result.final.green, mode).toEqual([0, 255, 0, 255]);
    expect(result.hardDifferences, `${mode}: ${JSON.stringify(result.firstHardDifferences)}`).toBe(
      0,
    );
    expect(
      result.maxEdgeDifference,
      `${mode}: ${JSON.stringify(result.firstDifferences)}`,
    ).toBeLessThanOrEqual(100);
  }
});

test("layer changes between replayed marks and fills preserve final pixels", async ({ page }) => {
  for (const mode of ["layered", "layered-skip"] as const) {
    const result = await replayPixels(page, mode);
    expect(result.outcome).toBe("done");
    expect(result.final.blue).toEqual([0, 0, 255, 255]);
    expect(result.final.clipped).toEqual([0, 0, 0, 0]);
    expect(result.final.layered[3]).toBe(255);
    expect(result.final.layered[1]).toBeGreaterThan(100);
    expect(result.hardDifferences, JSON.stringify(result.firstHardDifferences)).toBe(0);
    expect(result.maxEdgeDifference, JSON.stringify(result.firstDifferences)).toBeLessThanOrEqual(
      100,
    );
  }
});
