import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { InkSettings } from "../src/sticker-creation/canvas/inkEngine.ts";
import type { Step } from "../src/sticker-creation/canvas/ops.ts";
import {
  installFillWorkerProbe,
  readFillWorkerProbe,
  armFillWorkerGate,
  releaseFillWorkerGate,
  clearFillWorkerGate,
} from "./fillWorkerProbe.ts";
import {
  installFillCanvasProbe,
  armFillCanvasRefusal,
  readFillCanvasProbe,
  disarmFillCanvasRefusal,
} from "./fillCanvasProbe.ts";

interface EngineSnapshot {
  pixels: number[][];
  rawDigest: number;
  boundary: number[];
  steps: Step[];
  errors: string[];
  failures: {
    layer: number;
    x: number;
    y: number;
    completedRegions: number;
    pendingGestures: number;
  }[];
  canvases: { width: number; height: number }[];
  shownPixels: number[][];
  copies: number;
  canRedo: boolean;
}
interface EngineFixture {
  down: (cell: number, touch?: boolean) => void;
  move: (cell: number) => void;
  up: (cell: number) => void;
  cancel: () => void;
  finish: () => Promise<string>;
  replace: (action: "reset" | "load" | "dispose") => void;
  undo: () => void;
  redo: () => void;
  snapshot: () => EngineSnapshot;
}
declare global {
  interface Window {
    fillEngineFixture?: EngineFixture;
  }
}

/** Native canvases, display, history, and module worker in the application's origin. */
async function openEngine(page: Page) {
  await installFillWorkerProbe(page);
  await installFillCanvasProbe(page);
  await page.route("**/e2e-fill-engine", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fill engine</title>" }),
  );
  await page.goto("/e2e-fill-engine");
  await page.evaluate(async () => {
    const [
      { InkEngine },
      { LayerInk },
      { LayerDisplay },
      { FIRST_POST_CORRECTION },
      { FillError },
    ] = await Promise.all([
      import("../src/sticker-creation/canvas/inkEngine.ts"),
      import("../src/sticker-creation/layers/layerInk.ts"),
      import("../src/sticker-creation/layers/layerDisplay.ts"),
      import("../src/sticker-creation/canvas/post-correction/settings.ts"),
      import("../src/sticker-creation/canvas/fill-worker/errors.ts"),
    ]);
    const host = document.createElement("div");
    document.body.append(host);
    const ink = new LayerInk();
    const display = new LayerDisplay(host, ink);
    const errors: string[] = [];
    const failures: {
      layer: number;
      x: number;
      y: number;
      completedRegions: number;
      pendingGestures: number;
    }[] = [];
    let canRedo = false;
    const settings: InkSettings = {
      tool: "fill",
      fillReference: "layer",
      color: "#ff0000",
      size: 6,
      smoothing: 0,
      smoothingMode: "fixed",
      postCorrection: FIRST_POST_CORRECTION,
      locked: false,
      paused: false,
      panelOpen: false,
      inputMode: "pencilAndFinger",
      penPressure: "normal",
      penMinimumWidth: 20,
      sessionMs: () => performance.now(),
    };
    const engine = new InkEngine(ink, display, settings, {
      onHistory: (state) => {
        canRedo = state.canRedo;
      },
      onCommit: () => {},
      onBlocked: () => {},
      onBlockedHidden: () => {},
      onPen: () => {},
      onHover: () => {},
      onLayers: () => {},
      onFillState: () => {},
      onInkFailed: (error) => {
        errors.push(error instanceof Error ? error.message : String(error));
        if (error instanceof FillError && error.context) failures.push({ ...error.context });
      },
    });
    const frame = { w: 320, h: 120, density: 1 };
    const line = (points: number[]): Step => ({
      tool: "brush",
      layer: 1,
      color: "#0000ff",
      T: 0,
      pts: points,
    });
    const outline: Step[] = [
      line([16, 20, 6, 0, 304, 20, 6, 1, 304, 100, 6, 2, 16, 100, 6, 3, 16, 20, 6, 4]),
    ];
    for (let x = 52; x < 304; x += 36) outline.push(line([x, 20, 6, 0, x, 100, 6, 1]));
    engine.load(outline, frame, 1);
    let touch = false;
    const at = (cell: number) => ({
      pointerId: 17,
      pointerType: touch ? "touch" : "pen",
      button: 0,
      buttons: 1,
      clientX: 34 + 36 * cell,
      clientY: 60,
      pressure: 0.5,
      width: touch ? 8 : 1,
      height: touch ? 8 : 1,
      timeStamp: performance.now(),
      preventDefault() {},
    });
    const pixel = (canvas: HTMLCanvasElement | null, x: number, y: number) => {
      if (!canvas || !canvas.width || !canvas.height) return [0, 0, 0, 0];
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Native pixel reader has no 2D context");
      return [...context.getImageData(x, y, 1, 1).data];
    };
    const retainedCanvases = [...host.querySelectorAll("canvas")];
    window.fillEngineFixture = {
      down(cell, finger = false) {
        touch = finger;
        engine.down(at(cell));
      },
      move(cell) {
        engine.move(at(cell));
      },
      up(cell) {
        engine.up(at(cell));
      },
      cancel() {
        engine.cancel(at(0));
      },
      async finish() {
        try {
          await engine.finishInk();
          return "done";
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
      replace(action) {
        if (action === "reset") engine.reset();
        else if (action === "dispose") engine.dispose();
        else engine.load([line([20, 40, 6, 0, 40, 40, 6, 1])], frame, 1);
      },
      undo() {
        engine.undo();
      },
      redo() {
        engine.redo();
      },
      snapshot() {
        const raw = ink.layerCanvas(1);
        return {
          rawDigest: (() => {
            if (!raw) return 0;
            const context = raw.getContext("2d");
            if (!context) throw new Error("Native digest reader has no 2D context");
            let digest = 2166136261;
            for (const byte of context.getImageData(0, 0, raw.width, raw.height).data)
              digest = Math.imul(digest ^ byte, 16777619);
            return digest >>> 0;
          })(),
          pixels: Array.from({ length: 8 }, (_, cell) => pixel(raw, 34 + 36 * cell, 60)),
          boundary: pixel(raw, 52, 60),
          steps: [...engine.steps],
          errors: [...errors],
          failures: [...failures],
          shownPixels: [...host.querySelectorAll("canvas")].map((canvas) => pixel(canvas, 34, 60)),
          canvases: retainedCanvases.map((canvas) => ({
            width: canvas.width,
            height: canvas.height,
          })),
          copies: ink.copiesHeld,
          canRedo,
        };
      },
    };
  });
}
const snapshot = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillEngineFixture) throw new Error("Fill fixture is missing");
    return window.fillEngineFixture.snapshot();
  });
const fills = async (page: Page) =>
  (await snapshot(page)).steps.filter((step) => step.tool === "fill");
const browserLogs = new WeakMap<
  Page,
  Promise<{ type: string; text: string; arguments: unknown[] }>[]
>();
const uncaughtErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: Promise<{ type: string; text: string; arguments: unknown[] }>[] = [];
  browserLogs.set(page, messages);
  const errors: string[] = [];
  uncaughtErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      messages.push(
        Promise.all(message.args().map((argument) => argument.jsonValue())).then((arguments_) => ({
          type: message.type(),
          text: message.text(),
          arguments: arguments_,
        })),
      );
  });
});
test.afterEach(async ({ page }, testInfo) => {
  const state = await snapshot(page);
  const worker = await readFillWorkerProbe(page);
  const canvas = await readFillCanvasProbe(page);
  const logs = await Promise.all(browserLogs.get(page) ?? []);
  const observations = testInfo.outputPath("native-fill-observations.json");
  await writeFile(observations, JSON.stringify({ state, worker, canvas, console: logs }, null, 2));
  await testInfo.attach("native-fill-observations", {
    path: observations,
    contentType: "application/json",
  });
  await clearFillWorkerGate(page);
  expect(uncaughtErrors.get(page)).toEqual([]);
});
const red = [255, 0, 0, 255];
const clear = [0, 0, 0, 0];

// Removing native transfer lists, response decoding, or pixel installation breaks this case.
test("native module worker transfers detached buffers and installs actual region pixels", async ({
  page,
}) => {
  await openEngine(page);
  await page.evaluate(() => {
    window.fillEngineFixture?.down(0);
    window.fillEngineFixture?.up(0);
  });
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  expect((await snapshot(page)).pixels).toEqual([
    red,
    clear,
    clear,
    clear,
    clear,
    clear,
    clear,
    clear,
  ]);
  expect(await fills(page)).toHaveLength(1);
  const probe = await readFillWorkerProbe(page);
  expect(probe.workers).toHaveLength(1);
  expect(probe.workers[0]?.type).toBe("module");
  expect(probe.requests.length).toBeGreaterThan(0);
  for (const request of probe.requests) {
    expect(request.beforeBytes).toHaveLength(1);
    expect(request.beforeBytes.every((bytes) => bytes > 0)).toBe(true);
    expect(request.afterBytes.every((bytes) => bytes === 0)).toBe(true);
    expect(request.uniqueTransfers).toBe(true);
  }
  expect(
    probe.responses.some(
      (response) =>
        response.kind === "found" &&
        response.typedPixels &&
        response.typedMarks &&
        response.typedSpans &&
        response.written,
    ),
  ).toBe(true);
});

// A region stall must retain preceding commits and discard a late answer after worker replacement.
test("never-delivered native answer reaches region deadline, retains prefix, and retries with a fresh worker", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openEngine(page);
  await page.evaluate(() => window.fillEngineFixture?.down(0));
  await expect.poll(async () => (await fills(page)).length).toBe(1);
  const prefix = await snapshot(page);
  await armFillWorkerGate(page, (await readFillWorkerProbe(page)).requests.length + 1);
  const started = Date.now();
  await page.evaluate(() => {
    window.fillEngineFixture?.move(1);
    window.fillEngineFixture?.up(1);
  });
  await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
  const result = await page.evaluate(() => window.fillEngineFixture?.finish());
  expect(result).toContain("deadline");
  expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  expect(Date.now() - started).toBeLessThan(2000);
  const failed = await snapshot(page);
  expect(failed.pixels).toEqual([red, clear, clear, clear, clear, clear, clear, clear]);
  expect(failed.rawDigest).toBe(prefix.rawDigest);
  expect(failed.shownPixels).toEqual(prefix.shownPixels);
  expect(failed.errors).toHaveLength(1);
  expect(await fills(page)).toHaveLength(1);
  expect((await readFillWorkerProbe(page)).workers[0]?.terminated).toBe(true);
  await releaseFillWorkerGate(page);
  await page.waitForTimeout(50);
  expect(await snapshot(page)).toEqual(failed);
  await clearFillWorkerGate(page);
  await page.evaluate(() => {
    window.fillEngineFixture?.down(2);
    window.fillEngineFixture?.up(2);
  });
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  expect((await snapshot(page)).pixels[2]).toEqual(red);
  expect((await readFillWorkerProbe(page)).workers).toHaveLength(2);
  const productErrors = consoleErrors.filter((message) =>
    message.startsWith("Fill could not finish;"),
  );
  expect(productErrors).toHaveLength(1);
  expect(productErrors[0]).toContain("region deadline");
  expect(failed.failures).toEqual([
    { layer: 1, x: 55, y: 60, completedRegions: 1, pendingGestures: 1 },
  ]);
  const expectedDevErrors = consoleErrors.filter(
    (message) =>
      message.startsWith("WebSocket connection to") ||
      message.startsWith("[vite] failed to connect") ||
      message.startsWith("Failed to send error to Vite server:"),
  );
  expect(consoleErrors).toHaveLength(productErrors.length + expectedDevErrors.length);
  expect(pageErrors).toEqual([]);
});

// A held contact has no total-duration limit while no region request is stalled.
test("held fill continues after more than two seconds", async ({ page }) => {
  await openEngine(page);
  await page.evaluate(() => window.fillEngineFixture?.down(0));
  await expect.poll(async () => (await fills(page)).length).toBe(1);
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    window.fillEngineFixture?.move(1);
    window.fillEngineFixture?.up(1);
  });
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  const result = await snapshot(page);
  expect(result.pixels.slice(0, 2)).toEqual([red, red]);
  expect(result.errors).toEqual([]);
});

// The drain deadline measures inactivity, so productive regions may exceed two seconds in total.
test("productive released sweep drains for more than two seconds without cancellation", async ({
  page,
}) => {
  await openEngine(page);
  await armFillWorkerGate(page, 1);
  const start = Date.now();
  await page.evaluate(() => {
    window.fillEngineFixture?.down(0);
    window.fillEngineFixture?.up(4);
  });
  for (let region = 0; region < 5; region++) {
    await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
    await page.waitForTimeout(550);
    await armFillWorkerGate(page, (await readFillWorkerProbe(page)).requests.length + 1);
    await releaseFillWorkerGate(page);
  }
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  expect(Date.now() - start).toBeGreaterThan(2000);
  const result = await snapshot(page);
  expect(result.pixels.slice(0, 5)).toEqual([red, red, red, red, red]);
  expect(result.errors).toEqual([]);
  expect(await fills(page)).toHaveLength(5);
  expect((await readFillWorkerProbe(page)).delivered).toBe(5);
});

for (const action of ["reset", "load", "dispose"] as const) {
  // Removing public lifecycle invalidation lets the captured callback alter replaced resources.
  test(`late native answer cannot paint after public ${action}`, async ({ page }) => {
    await openEngine(page);
    await page.evaluate(() => window.fillEngineFixture?.down(0));
    await expect.poll(async () => (await fills(page)).length).toBe(1);
    await armFillWorkerGate(page, (await readFillWorkerProbe(page)).requests.length + 1);
    await page.evaluate(() => window.fillEngineFixture?.move(1));
    await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
    await page.evaluate((action) => window.fillEngineFixture?.replace(action), action);
    const after = await snapshot(page);
    await releaseFillWorkerGate(page);
    await page.waitForTimeout(50);
    expect(await snapshot(page)).toEqual(after);
    expect(after.pixels[1]).toEqual(clear);
    expect((await readFillWorkerProbe(page)).workers[0]?.terminated).toBe(true);
    expect((await readFillWorkerProbe(page)).delivered).toBe(1);
    if (action === "dispose") {
      expect(after.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(
        true,
      );
      expect(after.copies).toBe(0);
    }
  });
}

// An unaccepted first touch must neither commit nor create a preview from its stale answer.
test("cancelled unaccepted touch rejects its retained native answer", async ({ page }) => {
  await openEngine(page);
  const clockTime = new Date("2026-10-11T12:00:00Z");
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(clockTime);
  await armFillWorkerGate(page, 1);
  await page.evaluate(() => window.fillEngineFixture?.down(0, true));
  await page.clock.runFor(16);
  await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
  await page.evaluate(() => window.fillEngineFixture?.cancel());
  const before = await snapshot(page);
  expect(before.steps.filter((step) => step.tool === "fill")).toEqual([]);
  expect((await readFillWorkerProbe(page)).workers[0]?.terminated).toBe(true);
  await releaseFillWorkerGate(page);
  await page.clock.runFor(300);
  expect((await readFillWorkerProbe(page)).delivered).toBe(1);
  expect(await snapshot(page)).toEqual(before);
  expect(before.shownPixels.every((pixel) => pixel[3] === 0)).toBe(true);
});

// Clearing a computed provisional region must preserve raw pixels, history, and Redo.
test("computed unaccepted native touch preview clears without committing or clearing Redo", async ({
  page,
}) => {
  await openEngine(page);
  await page.evaluate(() => {
    window.fillEngineFixture?.down(2);
    window.fillEngineFixture?.up(2);
  });
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  await page.evaluate(() => window.fillEngineFixture?.undo());
  const before = await snapshot(page);
  expect(before.canRedo).toBe(true);
  const clockTime = new Date("2026-10-11T12:00:00Z");
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(clockTime);
  await armFillWorkerGate(page, (await readFillWorkerProbe(page)).requests.length + 1);
  await page.evaluate(() => window.fillEngineFixture?.down(0, true));
  await page.clock.runFor(16);
  await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
  await releaseFillWorkerGate(page);
  const preview = await snapshot(page);
  expect(preview.shownPixels).toContainEqual(red);
  expect(preview.pixels).toEqual(before.pixels);
  expect(preview.steps).toEqual(before.steps);
  expect(preview.canRedo).toBe(true);
  expect(preview.copies).toBe(before.copies);
  await page.evaluate(() => window.fillEngineFixture?.cancel());
  expect(await snapshot(page)).toEqual(before);
});

// Redo must stage all members before moving history or replacing any current pixels.
test("grouped Redo refuses native replacement canvases atomically and succeeds on retry", async ({
  page,
}) => {
  await openEngine(page);
  await page.evaluate(() => {
    window.fillEngineFixture?.down(0);
    window.fillEngineFixture?.up(2);
  });
  expect(await page.evaluate(() => window.fillEngineFixture?.finish())).toBe("done");
  expect(await fills(page)).toHaveLength(3);
  await page.evaluate(() => window.fillEngineFixture?.undo());
  const before = await snapshot(page);
  expect(before.canRedo).toBe(true);
  expect(before.pixels).toEqual(Array.from({ length: 8 }, () => clear));
  await armFillCanvasRefusal(page, { width: 320, height: 120 });
  await page.evaluate(() => window.fillEngineFixture?.redo());
  const refusal = await readFillCanvasProbe(page);
  await disarmFillCanvasRefusal(page);
  expect(refusal.refused.length).toBeGreaterThanOrEqual(2);
  const failed = await snapshot(page);
  expect(failed.pixels).toEqual(before.pixels);
  expect(failed.rawDigest).toBe(before.rawDigest);
  expect(failed.steps).toEqual(before.steps);
  expect(failed.canRedo).toBe(true);
  expect(failed.errors).toHaveLength(1);
  await page.evaluate(() => window.fillEngineFixture?.redo());
  const retried = await snapshot(page);
  expect(retried.pixels.slice(0, 3)).toEqual([red, red, red]);
  expect(retried.canRedo).toBe(false);
  expect(await fills(page)).toHaveLength(3);
});
