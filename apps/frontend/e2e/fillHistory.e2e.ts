import { expect, test } from "@playwright/test";
import type { FillOp, Step } from "../src/sticker-creation/canvas/ops.ts";

for (const { axis, seed, extent } of (["x", "y"] as const).flatMap((axis) =>
  [...[0, 51, 63].map((seed) => ({ seed, extent: 24.2 })), { seed: 52, extent: 20 }].map(
    (sample) => ({ axis, ...sample }),
  ),
)) {
  test(`fractional-density ${axis} Fill from pixel ${seed} keeps accepted pixels through history, local load, and timelapse`, async ({
    page,
  }) => {
    await page.route("**/e2e-fill-history", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Fill history</title>",
      }),
    );
    await page.goto("/e2e-fill-history");
    const result = await page.evaluate(
      async ({ axis, seed, extent }) => {
        const [
          { LayerInk },
          { LayerHistory },
          { FillGestureController },
          { prepareFillPatch },
          { browserFrames },
          { encodeTimelapse, decodeTimelapse },
          { SessionKeeper, loadKeptSession },
          { FIRST_LAYERS },
        ] = await Promise.all([
          import("../src/sticker-creation/layers/layerInk.ts"),
          import("../src/sticker-creation/layers/layerHistory.ts"),
          import("../src/sticker-creation/canvas/fillGesture.ts"),
          import("../src/sticker-creation/canvas/fill-worker/core.ts"),
          import("../src/ui/frameSource.ts"),
          import("../src/sticker-creation/sealing/timelapse.ts"),
          import("../src/sticker-creation/session/keptSession.ts"),
          import("../src/sticker-creation/layers/layerState.ts"),
        ]);
        const frame = { w: extent, h: extent, density: 2.625 };
        const dimension = Math.round(extent * frame.density);
        const ink = new LayerInk();
        ink.setFrame(frame);
        const history = new LayerHistory(ink);
        const line: Step = {
          tool: "brush",
          layer: 1,
          color: "#000000",
          T: 0,
          pts: axis === "x" ? [18, -2, 2.6, 0, 18, 27, 2.6, 1] : [-2, 18, 2.6, 0, 27, 18, 2.6, 1],
        };
        history.load([line]);
        const pixels = () => {
          const canvas = ink.layerCanvas(1);
          const context = canvas?.getContext("2d");
          if (!canvas || !context) throw new Error("Fill history canvas unavailable");
          return [...context.getImageData(0, 0, canvas.width, canvas.height).data];
        };
        const before = pixels();
        const errors: string[] = [];
        const controller = new FillGestureController(
          ink,
          {
            prepare: async (input) => prepareFillPatch(input),
            dispose: () => {},
          },
          browserFrames,
          {
            state: () => history.state,
            reserve: (count) => history.reserveCanvases(count),
            retryCanvas: (_op, write) => write(),
            preview: () => {},
            clearPreview: () => {},
            commit: (op) => history.commit(op),
            show: () => {},
            changed: () => {},
            fail: (error) => errors.push(error.message),
          },
        );
        const point = (n: number, T: number) =>
          axis === "x" ? { x: n, y: 16, T } : { x: 16, y: n, T };
        controller.begin(
          1,
          "mouse",
          { frame, layer: 1, reference: "layer", color: "#ff0000", gap: 2 },
          point(seed, 10),
        );
        // Round the last eligible cell at the sheet edge, then cross the line to the first cell.
        controller.append(1, [point(dimension - 0.51, 20)]);
        controller.release(1, point(0, 30));
        await controller.finish();
        const live = pixels();
        const saved = [...history.steps];
        const fills = saved.filter((step) => step.tool === "fill");
        history.undo();
        const undo = pixels();
        const undoSteps = history.steps.length;
        for (const fill of fills) ink.releaseFill(fill);
        history.redo();
        const redo = pixels();
        ink.releaseAll();
        history.invalidate();
        const reconstructed = pixels();
        const user = `fractional-fill-${axis}`;
        const keeper = new SessionKeeper(user);
        keeper.start(1);
        keeper.save(saved, 30, frame);
        const deadline = performance.now() + 5000;
        let loaded = await loadKeptSession(user);
        while (
          (loaded.status !== "found" || loaded.steps.length !== saved.length) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          loaded = await loadKeptSession(user);
        }
        if (loaded.status !== "found" || !loaded.frame || loaded.steps.length !== saved.length)
          throw new Error(`Saved Fill was incomplete after its write deadline: ${loaded.status}`);
        ink.setFrame(loaded.frame);
        history.load(loaded.steps);
        const local = pixels();
        const decoded = decodeTimelapse(
          encodeTimelapse({
            steps: saved,
            start: FIRST_LAYERS,
            frame,
            place: { x: 0, y: 0, w: dimension, h: dimension },
          }),
        );
        ink.setFrame({ w: decoded.ink.width, h: decoded.ink.height, density: decoded.density });
        history.load(decoded.steps);
        const replay = pixels();
        const sample = (n: number) => {
          const { x, y } = point(n, 0);
          return live.slice((y * dimension + x) * 4, (y * dimension + x) * 4 + 4);
        };
        controller.dispose();
        history.dropCheckpoints();
        ink.releaseAll();
        keeper.wipe();
        return {
          before,
          live,
          undo,
          redo,
          reconstructed,
          local,
          replay,
          undoSteps,
          fills,
          errors,
          samples: [0, 51, dimension - 1].map(sample),
        };
      },
      { axis, seed, extent },
    );
    expect(result.errors).toEqual([]);
    expect(result.fills).toHaveLength(2);
    expect(result.fills.map((fill) => fill.undoWithPrevious)).toEqual([undefined, true]);
    expect(result.samples).toEqual(Array.from({ length: 3 }, () => [255, 0, 0, 255]));
    expect(result.undoSteps).toBe(1);
    expect(result.undo).toEqual(result.before);
    for (const stage of ["redo", "reconstructed", "local", "replay"] as const)
      expect.soft(result[stage], stage).toEqual(result.live);
  });
}

for (const secondTool of ["fill", "brush"] as const) {
  test(`a prepared Fill checkpoint stays immutable after an independent ${secondTool}`, async ({
    page,
  }) => {
    await page.route("**/e2e-fill-history", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Fill history</title>",
      }),
    );
    await page.goto("/e2e-fill-history");
    const result = await page.evaluate(async (secondTool) => {
      const [{ LayerInk }, { LayerHistory }, { prepareFillPatch }, { hexToRgb }] =
        await Promise.all([
          import("../src/sticker-creation/layers/layerInk.ts"),
          import("../src/sticker-creation/layers/layerHistory.ts"),
          import("../src/sticker-creation/canvas/fill-worker/core.ts"),
          import("../src/sticker-creation/canvas/color.ts"),
        ]);
      const ink = new LayerInk();
      const history = new LayerHistory(ink);
      const frame = { w: 374, h: 822, density: 3 };
      const stroke = (pts: number[]): Step => ({
        tool: "brush",
        layer: 1,
        color: "#2F6BFF",
        pts,
        T: 0,
      });
      const lines = [
        stroke([75, 287, 6, 0, 299, 287, 6, 1, 299, 535, 6, 2, 75, 535, 6, 3, 75, 287, 6, 4]),
        ...[134, 161, 221].map((x) => stroke([x, 287, 6, 0, x, 535, 6, 1])),
      ];
      history.load(lines, false);
      ink.setFrame(frame);
      history.invalidate();
      const whole = { x: 0, y: 0, w: frame.w * frame.density, h: frame.h * frame.density };
      const first: FillOp = {
        tool: "fill",
        reference: "layer",
        layer: 1,
        color: "#E8484F",
        x: 104,
        y: 411,
        gap: 2,
        T: 1,
      };
      const second: FillOp = { ...first, x: 260, T: 2 };
      const sample = (canvas: HTMLCanvasElement | null | undefined) => {
        if (!canvas) throw new Error("Native checkpoint canvas is missing");
        const scratch = document.createElement("canvas");
        scratch.width = scratch.height = 1;
        const context = scratch.getContext("2d");
        if (!context) throw new Error("Native sample context unavailable");
        try {
          return [104, 260].map((x) => {
            context.globalCompositeOperation = "copy";
            context.drawImage(canvas, x * frame.density, 411 * frame.density, 1, 1, 0, 0, 1, 1);
            return [...context.getImageData(0, 0, 1, 1).data];
          });
        } finally {
          scratch.width = scratch.height = 0;
        }
      };
      const apply = (op: FillOp) => {
        const patch = ink.readFillPatch(op, history.state, whole);
        const prepared = prepareFillPatch({
          ...patch,
          at: whole,
          sx: op.x * frame.density,
          sy: op.y * frame.density,
          color: hexToRgb(op.color),
          gap: op.gap * frame.density,
          cut: { left: false, top: false, right: false, bottom: false },
        });
        if (prepared.kind !== "found") throw new Error("Expected a prepared region");
        ink.applyPreparedFill(op, whole, prepared);
        history.commit(op);
      };
      apply(first);
      const firstHold = ink.hold(1);
      const sharedHold = ink.hold(1);
      const beforeSecond = sample(firstHold.shared?.canvas);
      if (secondTool === "fill") {
        apply(second);
      } else {
        const brush: Step = {
          tool: "brush",
          layer: 1,
          color: first.color,
          pts: [260, 411, 20, 0, 261, 411, 20, 1],
          T: 2,
        };
        ink.apply(brush, history.state);
        history.commit(brush);
      }
      const holdsShareCopy = firstHold.copy !== null && firstHold.copy === sharedHold.copy;
      const checkpointAfterSecond = sample(firstHold.copy?.canvas);
      const liveAfterSecond = sample(ink.layerCanvas(1));
      history.undo();
      const liveAfterUndo = sample(ink.layerCanvas(1));
      const undoSteps = history.steps.length;
      history.redo();
      const liveAfterRedo = sample(ink.layerCanvas(1));
      ink.release(firstHold);
      ink.release(sharedHold);
      ink.releaseAll();
      return {
        holdsShareCopy,
        beforeSecond,
        checkpointAfterSecond,
        liveAfterSecond,
        liveAfterUndo,
        liveAfterRedo,
        undoSteps,
      };
    }, secondTool);
    const red = [232, 72, 79, 255];
    const clear = [0, 0, 0, 0];
    expect(result.holdsShareCopy).toBe(true);
    expect(result.beforeSecond).toEqual([red, clear]);
    expect(result.liveAfterSecond).toEqual([red, red]);
    expect(result.checkpointAfterSecond).toEqual([red, clear]);
    expect(result.undoSteps).toBe(5);
    expect(result.liveAfterUndo).toEqual([red, clear]);
    expect(result.liveAfterRedo).toEqual([red, red]);
  });
}
