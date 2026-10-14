import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { PALM_CONTACT_PX } from "../src/sticker-creation/canvas/gestures.ts";
import { strokeFrame } from "../src/sticker-board/timelapse/timelapseFrame.ts";
import { readKeptHistory } from "./emptySeal.ts";
import { openDetail, openSealSheet, sealOnSheet, signedInUserId } from "./helpers.ts";
import { at, FINGERTIP, hand, pencil, type At } from "./pen.ts";
import {
  addLayer,
  button,
  captureFillCanvases,
  chip,
  color,
  controlTouchTime,
  fillAt,
  fillSteps,
  fillSweep,
  line,
  nearTimeUp,
  openSheet,
  options,
  outlinedCells,
  rawFillDigest,
  resumeSheet,
  selectFillReference,
  sheetBox,
  shownColor,
  slider,
  undo,
  wetFillColor,
  cancelFillPointer,
} from "./fillHelpers.ts";
import {
  armFillWorkerGate,
  clearFillWorkerGate,
  installFillWorkerProbe,
  readFillWorkerProbe,
  releaseFillWorkerGate,
} from "./fillWorkerProbe.ts";
import {
  armFillCanvasRefusal,
  disarmFillCanvasRefusal,
  installFillCanvasProbe,
  readFillCanvasProbe,
} from "./fillCanvasProbe.ts";

const { stickerCreation: creation, stickerBoard, ui } = strings;
const red = [232, 72, 79, 255];
const blue = [47, 107, 255, 255];
const green = [14, 154, 110, 255];
const orange = [255, 122, 69, 255];
const clear = [0, 0, 0, 0];
const activeSeal = (page: Page) => page.locator('.seal-sheet[role="dialog"]:not(.is-leaving)');
const redo = (page: Page) => button(page, creation.history.redo);

async function colorsAt(page: Page, points: At[]) {
  return Promise.all(points.map((point) => shownColor(page, point)));
}

async function heldAnswer(page: Page) {
  await expect.poll(async () => (await readFillWorkerProbe(page)).retained).toBe(1);
}

async function gateNext(page: Page) {
  await armFillWorkerGate(page, (await readFillWorkerProbe(page)).requests.length + 1);
}

async function fingerInput(page: Page) {
  const key = button(page, creation.tools.pencilOnly);
  if (await key.isVisible()) {
    if ((await key.getAttribute("aria-pressed")) === "true") await key.click();
    await expect(key).toHaveAttribute("aria-pressed", "false");
  }
}

const contact = (point: At, id = 1) => ({ ...point, id, radius: FINGERTIP });

test("a grouped Fill has matching seal preview, downloaded sticker, and ending timelapse colors", async ({
  page,
}, testInfo) => {
  await openSheet(page, "fill-sealed-replay");
  const { box, centers, boundaries } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await page.evaluate(async () => {
    const { setPerformanceRecorder } = await import("../src/performance/performanceRecorder.ts");
    setPerformanceRecorder(true);
  });
  await fillSweep(page, [centers[0], centers[3]]);
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => red));
  await expect.poll(() => fillSteps(page)).toHaveLength(4);
  const userId = await signedInUserId(page);
  const drawing = await page.evaluate(async (userId) => {
    const { loadKeptSession } = await import("../src/sticker-creation/session/keptSession.ts");
    const kept = await loadKeptSession(userId);
    if (kept.status !== "found") throw new Error(`Saved drawing is ${kept.status}`);
    return kept;
  }, userId);
  const screenshot = testInfo.outputPath("filled-sheet.png");
  await page.screenshot({ path: screenshot, animations: "disabled" });
  await testInfo.attach("filled-sheet", { path: screenshot, contentType: "image/png" });
  const recording = await page.evaluate(async () => {
    const { readPerformanceRecording, setPerformanceRecorder } =
      await import("../src/performance/performanceRecorder.ts");
    const result = readPerformanceRecording();
    setPerformanceRecorder(false);
    return result;
  });
  expect(recording).not.toBeNull();
  const performancePath = testInfo.outputPath("fill-performance.json");
  await writeFile(performancePath, JSON.stringify(recording, null, 2));
  await testInfo.attach("fill-performance", {
    path: performancePath,
    contentType: "application/json",
  });
  await openSealSheet(page, "en");
  const sealScreenshot = testInfo.outputPath("seal-preview.png");
  await page.screenshot({ path: sealScreenshot, animations: "disabled" });
  await testInfo.attach("seal-preview", { path: sealScreenshot, contentType: "image/png" });
  const previewColors = await page.locator("canvas.seal-preview__ink").evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Seal preview has no canvas");
    const g = element.getContext("2d");
    if (!g) throw new Error("Seal preview has no context");
    // The row's symmetrical bounds put its middle divider and adjacent cell safely inside the crop.
    return [0.5, 0.7].map((x) => [
      ...g.getImageData(Math.floor(element.width * x), Math.floor(element.height / 2), 1, 1).data,
    ]);
  });
  expect(previewColors).toEqual([red, red]);
  const { card, no } = await sealOnSheet(page, "en");
  await card.getByRole("button", { name: ui.backToBoard.en }).click();
  const detail = await openDetail(page, "en", no);
  const received = page.waitForResponse(
    (response) => response.url().includes("/timelapse?format=4") && response.ok(),
  );
  await detail
    .getByRole("button", { name: stickerBoard.timelapse.watchLabel.en.replace("{{no}}", no) })
    .click();
  const response = await received;
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("place" in data) ||
    !("ink" in data) ||
    !Array.isArray(data.place) ||
    !Array.isArray(data.ink) ||
    !data.place.every((value): value is number => typeof value === "number") ||
    !data.ink.every((value): value is number => typeof value === "number")
  )
    throw new Error("Timelapse has no actual sheet and cut coordinates");
  const { ink, place } = data;
  const fractions = [...centers, ...boundaries].map(({ x, y }) => ({
    x: (x - box.x) / box.width,
    y: (y - box.y) / box.height,
  }));
  const frame = strokeFrame(
    drawing.steps,
    { x: place[0], y: place[1], w: place[2], h: place[3] },
    { width: ink[0], height: ink[1] },
  );
  const replayPoints = fractions.map(({ x, y }) => ({
    x: (x * ink[0] - frame.x) / frame.w,
    y: (y * ink[1] - frame.y) / frame.h,
  }));
  const replay = detail.locator(".timelapse-overlay");
  await expect(replay).toHaveAttribute("data-phase", "ending", { timeout: 30_000 });
  const replayColors = await replay.locator("canvas").evaluate((element, points) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Timelapse has no canvas");
    const g = element.getContext("2d");
    const paper = element.parentElement
      ?.querySelector(".timelapse-overlay__paper")
      ?.getBoundingClientRect();
    if (!g || !paper) throw new Error("Timelapse has no sheet transform");
    const stage = element.getBoundingClientRect();
    return points.map(({ x, y }) => [
      ...g.getImageData(
        Math.round(((paper.left - stage.left + paper.width * x) * element.width) / stage.width),
        Math.round(((paper.top - stage.top + paper.height * y) * element.height) / stage.height),
        1,
        1,
      ).data,
    ]);
  }, replayPoints);
  expect(replayColors).toEqual([...centers.map(() => red), ...boundaries.map(() => blue)]);
  const image = detail.locator(".sticker-figure__img").first();
  const sealedColors = await image.evaluate(
    async (element, { points, place, ink }) => {
      if (!(element instanceof HTMLImageElement))
        throw new Error("Sticker detail has no downloaded image");
      await element.decode();
      const target = document.createElement("canvas");
      target.width = element.naturalWidth;
      target.height = element.naturalHeight;
      try {
        const g = target.getContext("2d");
        if (!g) throw new Error("Downloaded sticker has no sampler context");
        g.drawImage(element, 0, 0);
        return points.map(({ x, y }) => [
          ...g.getImageData(
            Math.round(((x * ink[0] - place[0]) * target.width) / place[2]),
            Math.round(((y * ink[1] - place[1]) * target.height) / place[3]),
            1,
            1,
          ).data,
        ]);
      } finally {
        target.width = target.height = 0;
      }
    },
    { points: fractions, place: data.place, ink: data.ink },
  );
  // The stored finish adds gloss and image encoding; its ink hues must remain at the mapped cells.
  for (const [index, rgba] of sealedColors.entries()) {
    expect(rgba[3]).toBe(255);
    if (index < centers.length) expect(rgba[0] - Math.max(rgba[1], rgba[2])).toBeGreaterThan(80);
    else expect(rgba[2] - Math.max(rgba[0], rgba[1])).toBeGreaterThan(80);
  }
});

for (const reference of ["layer", "visible"] as const) {
  test(`sparse Fill sweep ${reference} paints on press, crosses narrow cells, and restores one group`, async ({
    page,
  }) => {
    await installFillWorkerProbe(page);
    await openSheet(page, `fill-${reference}`);
    const { centers, boundaries } = await outlinedCells(page);
    if (reference === "visible") await addLayer(page);
    await color(page, "red");
    await selectFillReference(page, reference);
    const prior = await readKeptHistory(page);
    const pen = await pencil(page);
    await pen.down(centers[0], 0.5);
    await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
    await pen.move(centers[2], 0.5);
    await pen.move(centers[0], 0.5);
    await pen.up(centers[3]);
    await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => red));
    await expect.poll(() => fillSteps(page)).toHaveLength(4);
    const steps = await fillSteps(page);
    expect(steps[0]).not.toHaveProperty("undoWithPrevious");
    expect(steps.slice(1)).toEqual(
      Array.from({ length: 3 }, () =>
        expect.objectContaining({ undoWithPrevious: true, reference }),
      ),
    );
    expect(await colorsAt(page, boundaries)).toEqual(boundaries.map(() => blue));
    const native = await readFillWorkerProbe(page);
    expect(native.workers).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "module", terminated: false })]),
    );
    expect(native.requests.length).toBeGreaterThan(0);
    expect(
      native.requests.every(
        (request) =>
          request.uniqueTransfers &&
          request.beforeBytes.every((bytes) => bytes > 0) &&
          request.afterBytes.every((bytes) => bytes === 0),
      ),
    ).toBe(true);
    expect(
      native.responses.some(
        (response) =>
          response.typedPixels && response.typedMarks && response.typedSpans && response.written,
      ),
    ).toBe(true);
    const kept = await readKeptHistory(page);
    expect(kept.count).toBe(kept.steps.length);
    await page.reload();
    await resumeSheet(page);
    await button(page, creation.tools.fill).click();
    await expect(
      page.getByRole("radio", { name: creation.fillReference[reference].en, exact: true }),
    ).toBeChecked();
    expect(await colorsAt(page, centers)).toEqual(centers.map(() => red));
    expect(await readKeptHistory(page)).toEqual(kept);
    await undo(page).click();
    await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => clear));
    await expect.poll(async () => (await readKeptHistory(page)).count).toBe(prior.steps.length);
    expect(await colorsAt(page, boundaries)).toEqual(boundaries.map(() => blue));
    await redo(page).click();
    await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => red));
    await expect.poll(() => readKeptHistory(page)).toEqual(kept);
  });
}

test("opaque lower color supplies the initial target while Fill changes only the selected layer", async ({
  page,
}) => {
  await openSheet(page, "fill-lower-color");
  const box = await sheetBox(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await fillAt(page, at(box, 0.5, 0.5));
  await expect.poll(() => shownColor(page, at(box, 0.5, 0.5))).toEqual(red);
  await captureFillCanvases(page);
  const lower = await rawFillDigest(page);
  await addLayer(page);
  // The outlines' centers show the lower paint, so construct them while its opacity is hidden.
  await options(page, 1);
  await slider(page).press("Home");
  await page.keyboard.press("Escape");
  await chip(page, 2).click();
  const { centers, boundaries } = await outlinedCells(page);
  await captureFillCanvases(page);
  const outlines = await rawFillDigest(page);
  await options(page, 1);
  await slider(page).press("End");
  await page.keyboard.press("Escape");
  await chip(page, 2).click();
  await addLayer(page);
  await color(page, "green");
  await selectFillReference(page, "visible");
  await fillSweep(page, [centers[0], centers[3]]);
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => green));
  expect(await colorsAt(page, boundaries)).toEqual(boundaries.map(() => blue));
  await chip(page, 1).click();
  await captureFillCanvases(page);
  expect(await rawFillDigest(page)).toBe(lower);
  await chip(page, 2).click();
  await captureFillCanvases(page);
  expect(await rawFillDigest(page)).toBe(outlines);
});

test("a drag recolors only its starting color, skips other colors, revisits once, and same paint is a no-op", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-target");
  const { centers, boundaries } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await fillAt(page, centers[0]);
  await fillAt(page, centers[2]);
  await expect.poll(() => fillSteps(page)).toHaveLength(2);
  await color(page, "green");
  await fillAt(page, centers[1]);
  await expect.poll(() => shownColor(page, centers[1])).toEqual(green);
  await color(page, "orange");
  await fillSweep(page, [centers[0], centers[3], centers[0], centers[2]]);
  await expect.poll(() => colorsAt(page, centers)).toEqual([orange, green, orange, clear]);
  await expect.poll(() => fillSteps(page)).toHaveLength(5);
  const before = await readKeptHistory(page);
  const requests = (await readFillWorkerProbe(page)).requests.length;
  expect(requests).toBeGreaterThan(0);
  await fillSweep(page, [centers[0], centers[3], centers[0]]);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await readKeptHistory(page)).toEqual(before);
  expect((await readFillWorkerProbe(page)).requests).toHaveLength(requests);
  await color(page, "red");
  await fillSweep(page, [centers[3], centers[0]]);
  await expect.poll(() => colorsAt(page, centers)).toEqual([orange, green, orange, red]);
  expect(await colorsAt(page, boundaries)).toEqual(boundaries.map(() => blue));
});

test("two rapidly released taps using the same pen remain separate Undo actions", async ({
  page,
}, testInfo) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-two-taps");
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await gateNext(page);
  const pen = await pencil(page);
  await pen.down(centers[0], 0.5);
  await pen.up(centers[0]);
  await pen.down(centers[3], 0.5);
  await pen.up(centers[3]);
  await heldAnswer(page);
  await releaseFillWorkerGate(page);
  await expect.poll(() => colorsAt(page, [centers[0], centers[3]])).toEqual([red, red]);
  await expect.poll(() => fillSteps(page)).toHaveLength(2);
  expect((await fillSteps(page)).every((step) => step.undoWithPrevious === undefined)).toBe(true);
  await undo(page).click();
  try {
    await expect.poll(() => colorsAt(page, [centers[0], centers[3]])).toEqual([red, clear]);
    await expect.poll(async () => (await readKeptHistory(page)).count).toBe(5);
  } finally {
    const diagnostic = {
      history: await readKeptHistory(page),
      worker: await readFillWorkerProbe(page),
      colors: await colorsAt(page, centers),
      canvas: await page.locator(".ink-sheet").evaluate((sheet) => sheet.outerHTML),
      canvasColors: await page.evaluate(
        (centers) =>
          [...document.querySelectorAll<HTMLCanvasElement>(".ink-sheet .ink-canvas")].map(
            (canvas) => {
              const box = canvas.getBoundingClientRect();
              const context = canvas.getContext("2d");
              return {
                width: canvas.width,
                height: canvas.height,
                visibility: getComputedStyle(canvas).visibility,
                colors: centers.map(({ x, y }) =>
                  context && canvas.width && canvas.height
                    ? [
                        ...context.getImageData(
                          Math.floor(((x - box.left) * canvas.width) / box.width),
                          Math.floor(((y - box.top) * canvas.height) / box.height),
                          1,
                          1,
                        ).data,
                      ]
                    : null,
                ),
              };
            },
          ),
        centers,
      ),
    };
    const path = testInfo.outputPath("rapid-tap-undo.json");
    await writeFile(path, JSON.stringify(diagnostic, null, 2));
    await testInfo.attach("rapid-tap-undo", { path, contentType: "application/json" });
  }
});

test("the first Pencil Fill remains one continuous sweep while the Pencil only tile appears", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-first-pencil-sweep");
  const { centers } = await outlinedCells(page, "touch");
  await expect(button(page, creation.tools.pencilOnly)).toHaveCount(0);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await gateNext(page);
  const pen = await pencil(page);
  await pen.down(centers[0], 0.5);
  await heldAnswer(page);
  await expect(button(page, creation.tools.pencilOnly)).toHaveAttribute("aria-pressed", "true");
  await pen.move(centers[3], 0.5);
  await pen.up(centers[3]);
  await releaseFillWorkerGate(page);
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => red));
  await expect.poll(() => fillSteps(page)).toHaveLength(4);
  await undo(page).click();
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => clear));
});

test("an initially blank released Fill finishes before Seal opens and submits the sticker", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
      requests.push(request.url());
  });
  await openSheet(page, "fill-blank-seal");
  await color(page, "red");
  await selectFillReference(page, "layer");
  await gateNext(page);
  const center = at(await sheetBox(page), 0.5, 0.5);
  await fillAt(page, center);
  await button(page, creation.seal.label).click();
  await heldAnswer(page);
  expect(await activeSeal(page).count()).toBe(0);
  expect(requests).toHaveLength(0);
  expect(await fillSteps(page)).toEqual([]);
  await releaseFillWorkerGate(page);
  await expect(activeSeal(page)).toBeVisible();
  await expect.poll(() => fillSteps(page)).toHaveLength(1);
  await expect(page.locator(".seal-preview__sticker")).toBeVisible();
  const { card } = await sealOnSheet(page, "en");
  await expect(card).toBeVisible();
  expect(requests).toHaveLength(1);
});

test("a pending locked blank Fill never opens an empty seal sheet or records a Fill", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-locked-empty");
  await options(page, 1);
  await page.getByRole("switch", { name: creation.layers.lock.en }).click();
  await page.keyboard.press("Escape");
  await selectFillReference(page, "layer");
  const before = await readKeptHistory(page);
  await gateNext(page);
  const center = at(await sheetBox(page), 0.5, 0.5);
  await fillAt(page, center);
  await button(page, creation.seal.label).click();
  await heldAnswer(page);
  expect(await activeSeal(page).count()).toBe(0);
  await releaseFillWorkerGate(page);
  await expect(button(page, creation.tools.brush)).toBeEnabled();
  expect(await activeSeal(page).count()).toBe(0);
  expect(await shownColor(page, center)).toEqual(clear);
  expect(await readKeptHistory(page)).toEqual(before);
  expect((await readFillWorkerProbe(page)).responses.at(-1)?.written).toBe(false);
});

for (const transition of ["brush", "color", "visible", "layer", "pause"] as const) {
  test(`pending Fill retains its settings until the ${transition} transition finishes`, async ({
    page,
  }) => {
    await installFillWorkerProbe(page);
    await openSheet(page, `fill-transition-${transition}`);
    const { centers } = await outlinedCells(page);
    await color(page, "red");
    await selectFillReference(page, "layer");
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await gateNext(page);
    await fillAt(page, centers[0]);
    const key =
      transition === "visible"
        ? page.getByRole("radio", { name: creation.fillReference.visible.en, exact: true })
        : transition === "layer"
          ? chip(page, 1)
          : button(
              page,
              transition === "pause" ? creation.timer.pause : creation.tools[transition],
            );
    await key.click();
    await page.clock.runFor(200);
    const heldClock = await page.locator(".timer-time").textContent();
    await heldAnswer(page);
    await expect(
      page.getByText(creation.fillReference.finishing.en, { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".ink-sheet")).toHaveAttribute("data-tool", "fill");
    await expect(
      page.getByRole("radio", { name: creation.fillReference.layer.en, exact: true }),
    ).toBeChecked();
    await page.keyboard.press("b");
    await button(page, creation.layers.add).click({ force: true });
    const requests = (await readFillWorkerProbe(page)).requests.length;
    const blockedPen = await pencil(page);
    await blockedPen.down(centers[3], 0.5);
    await blockedPen.up(centers[3]);
    expect((await readFillWorkerProbe(page)).requests.length).toBe(requests);
    expect(await page.locator("[data-layer-chip]").count()).toBe(1);
    if (transition === "pause" || transition === "color" || transition === "layer") {
      await expect(page.locator(".timer-dot")).toHaveClass(/is-held/);
      await page.clock.runFor(600);
      expect(await page.locator(".timer-time").textContent()).toBe(heldClock);
    }
    await releaseFillWorkerGate(page);
    await expect
      .poll(async () => {
        await page.clock.runFor(40);
        return page.locator(".drawing-controls:disabled").count();
      })
      .toBe(0);
    await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
    expect(await shownColor(page, centers[3])).toEqual(clear);
    if (transition === "brush")
      await expect(page.locator(".ink-sheet")).toHaveAttribute("data-tool", "brush");
    if (transition === "visible") await expect(key).toBeChecked();
    if (transition === "color")
      await expect(page.getByRole("dialog", { name: creation.colorSheet.title.en })).toBeVisible();
    if (transition === "layer")
      await expect(page.getByRole("switch", { name: creation.layers.lock.en })).toBeVisible();
    if (transition === "pause") await expect(button(page, creation.timer.resume)).toBeVisible();
    if (transition === "pause" || transition === "color" || transition === "layer") {
      await page.clock.runFor(1100);
      expect(await page.locator(".timer-time").textContent()).toBe(heldClock);
    }
  });
}

// Tool panels hold a begun Kyoto Seika clock while recording (KYOTO_SEIKA_TOOLS_PAUSE_CLOCK).
test("a Kyoto Seika color panel holds the clock while Fill finishes and while the panel is open", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-kyoto-panel", "en", true);
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const seconds = async () => {
    const text = await page.locator(".timer-time").textContent();
    const match = text?.match(/(\d+):(\d\d)/);
    if (!match) throw new Error(`The clock has no time: ${text}`);
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const starting = await seconds();
  let readinessAdvancedMs = 0;
  await expect
    .poll(async () => {
      // Poll waits use real time, so advance a full displayed second explicitly.
      let current = await seconds();
      while (current >= starting && readinessAdvancedMs < 1_200) {
        await page.clock.runFor(40);
        readinessAdvancedMs += 40;
        current = await seconds();
      }
      return current;
    })
    .toBeLessThan(starting);
  await page.clock.runFor(500);
  await gateNext(page);
  await fillAt(page, centers[0]);
  const before = await seconds();
  const timer = page.locator(".timer-dot");
  await button(page, creation.tools.color).click();
  await expect(timer).toHaveClass(/is-held/);
  await page.clock.runFor(700);
  await heldAnswer(page);
  expect(await seconds()).toBe(before);
  await releaseFillWorkerGate(page);
  await expect
    .poll(async () => {
      await page.clock.runFor(40);
      return page.getByRole("dialog", { name: creation.colorSheet.title.en }).count();
    })
    .toBe(1);
  const opened = await seconds();
  await page.clock.runFor(1100);
  expect(await seconds()).toBe(opened);
  expect(await shownColor(page, centers[0])).toEqual(red);
  await page.keyboard.press("Escape");
  await expect(timer).not.toHaveClass(/is-held/);
  await page.clock.runFor(1100);
  expect(await seconds()).toBeLessThan(opened);
});

type WetVariant = "blank" | "opacity" | "lock" | "clipped" | "clipped-above";
async function wetFixture(page: Page, variant: WetVariant) {
  await openSheet(page, `fill-wet-${variant}`);
  const { box, centers } = await outlinedCells(page);
  const center = variant === "clipped-above" ? centers[3] : centers[0];
  if (variant === "blank") await addLayer(page);
  if (variant === "opacity") {
    await options(page, 1);
    for (let i = 0; i < 10; i++) await slider(page).press("ArrowDown");
    await page.keyboard.press("Escape");
  }
  if (variant === "lock" || variant === "clipped" || variant === "clipped-above") {
    await color(page, "green");
    await selectFillReference(page, "layer");
    await fillAt(page, centers[0]);
    await expect.poll(() => shownColor(page, centers[0])).toEqual(green);
  }
  if (variant === "lock") {
    await options(page, 1);
    await page.getByRole("switch", { name: creation.layers.lock.en }).click();
    await page.keyboard.press("Escape");
  }
  if (variant === "clipped") {
    await options(page, 1);
    for (let i = 0; i < 10; i++) await slider(page).press("ArrowDown");
    await page.keyboard.press("Escape");
    await addLayer(page);
    await options(page, 2);
    await page.getByRole("switch", { name: creation.layers.clip.en }).click();
    await page.keyboard.press("Escape");
  }
  if (variant === "clipped-above") {
    await addLayer(page);
    await color(page, "blue");
    await selectFillReference(page, "layer");
    await fillAt(page, center);
    await expect.poll(() => shownColor(page, center)).toEqual(blue);
    await options(page, 2);
    await page.getByRole("switch", { name: creation.layers.clip.en }).click();
    await page.keyboard.press("Escape");
    await chip(page, 1).click();
  }
  await color(page, "red");
  await selectFillReference(
    page,
    variant === "blank" || variant === "clipped" ? "visible" : "layer",
  );
  await fingerInput(page);
  await button(page, creation.tools.brush).click();
  await line(page, 0.5, 0.25, 0.31);
  await undo(page).click();
  await expect(redo(page)).toBeEnabled();
  await button(page, creation.tools.fill).click();
  await captureFillCanvases(page, variant === "clipped");
  return { center, box, centers };
}

for (const variant of ["blank", "opacity", "lock", "clipped", "clipped-above"] as const) {
  test(`provisional Fill ${variant} previews without changing raw ink, cancels, and accepts on lift`, async ({
    page,
  }) => {
    await installFillWorkerProbe(page);
    const { center } = await wetFixture(page, variant);
    const before = await readKeptHistory(page);
    const raw = await rawFillDigest(page);
    const shown = await shownColor(page, center);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await controlTouchTime(page);
    const fingers = await hand(page);
    await fingers.down([contact(center)]);
    await page.clock.runFor(30);
    const wet = variant === "clipped" ? [231, 72, 80, 128] : red;
    await expect.poll(() => wetFillColor(page, center)).toEqual(wet);
    const preview = await shownColor(page, center);
    expect(preview).not.toEqual(shown);
    expect(await rawFillDigest(page)).toBe(raw);
    expect(await readKeptHistory(page)).toEqual(before);
    await expect(redo(page)).toBeEnabled();
    // The second young contact cancels provisional paint before an Undo is recognized on lift.
    await fingers.down([contact(center), contact({ x: center.x + 40, y: center.y }, 2)]);
    await expect.poll(() => wetFillColor(page, center)).toEqual(clear);
    expect(await rawFillDigest(page)).toBe(raw);
    expect(await shownColor(page, center)).toEqual(shown);
    // Move the two-finger gesture out of tap slop, so cancellation itself performs no history action.
    await fingers.move([
      contact({ x: center.x + 30, y: center.y }),
      contact({ x: center.x + 70, y: center.y }, 2),
    ]);
    await fingers.up();
    expect(await readKeptHistory(page)).toEqual(before);
    await expect(redo(page)).toBeEnabled();
    await fingers.down([contact(center, 3)]);
    await page.clock.runFor(30);
    await expect.poll(() => wetFillColor(page, center)).toEqual(wet);
    await fingers.up();
    await page.clock.runFor(100);
    await expect.poll(() => shownColor(page, center)).toEqual(preview);
    await expect
      .poll(async () => (await fillSteps(page)).length)
      .toBe(
        before.steps.filter(
          (step) =>
            typeof step === "object" && step !== null && "tool" in step && step.tool === "fill",
        ).length + 1,
      );
    await expect.poll(() => wetFillColor(page, center)).toEqual(clear);
    await captureFillCanvases(page, variant === "clipped");
    expect(await rawFillDigest(page)).not.toBe(raw);
  });
}

for (const acceptance of ["movement", "age"] as const) {
  test(`accepted touch Fill by ${acceptance} survives a later second finger`, async ({ page }) => {
    const { center } = await wetFixture(page, "blank");
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await controlTouchTime(page);
    const fingers = await hand(page);
    await fingers.down([contact(center)]);
    await page.clock.runFor(acceptance === "age" ? 261 : 100);
    const moved = acceptance === "movement" ? { x: center.x + 27, y: center.y } : center;
    if (acceptance === "movement") await fingers.move([contact(moved)]);
    await page.clock.runFor(30);
    await expect.poll(() => fillSteps(page)).toHaveLength(1);
    await fingers.down([contact(moved), contact({ x: center.x + 60, y: center.y }, 2)]);
    await fingers.up();
    await page.clock.runFor(50);
    expect(await shownColor(page, center)).toEqual(red);
    expect(await fillSteps(page)).toHaveLength(1);
  });
}

for (const fingertips of [2, 3] as const) {
  test(`young ${fingertips} fingers cancel a gated provisional Fill and perform the prior ${fingertips === 2 ? "Undo" : "Redo"}`, async ({
    page,
  }) => {
    await installFillWorkerProbe(page);
    await openSheet(page, `fill-young-${fingertips}`);
    const { centers } = await outlinedCells(page);
    await color(page, "red");
    const marker = await line(page, 0.25, 0.3, 0.31);
    await expect.poll(() => shownColor(page, marker)).toEqual(red);
    if (fingertips === 3) {
      await undo(page).click();
      await expect.poll(() => shownColor(page, marker)).toEqual(clear);
    }
    await selectFillReference(page, "layer");
    await fingerInput(page);
    await captureFillCanvases(page);
    const before = await readKeptHistory(page);
    const raw = await rawFillDigest(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await controlTouchTime(page);
    await gateNext(page);
    const fingers = await hand(page);
    await fingers.down([contact(centers[0])]);
    await page.clock.runFor(30);
    await heldAnswer(page);
    expect(await rawFillDigest(page)).toBe(raw);
    expect(await readKeptHistory(page)).toEqual(before);
    const tap = [contact(centers[0]), contact(centers[2], 2)];
    if (fingertips === 3) tap.push(contact(centers[3], 3));
    await fingers.down(tap);
    await releaseFillWorkerGate(page);
    await fingers.up();
    await expect
      .poll(async () => {
        await page.clock.runFor(30);
        return shownColor(page, marker);
      })
      .toEqual(fingertips === 2 ? clear : red);
    expect(await colorsAt(page, centers)).toEqual(centers.map(() => clear));
    expect(await wetFillColor(page, centers[0])).toEqual(clear);
    expect(await fillSteps(page)).toEqual([]);
    if (typeof before.count !== "number") throw new Error("Prior history has no count");
    await expect
      .poll(async () => (await readKeptHistory(page)).count)
      .toBe(before.count + (fingertips === 2 ? -1 : 1));
  });
}

for (const cancellation of ["pointercancel", "lostpointercapture", "pagehide"] as const) {
  test(`${cancellation} clears a young Fill preview without changing raw ink or prior Redo`, async ({
    page,
  }) => {
    const { center } = await wetFixture(page, "blank");
    const before = await readKeptHistory(page);
    const raw = await rawFillDigest(page);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await controlTouchTime(page);
    await page.evaluate(() => {
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (event instanceof PointerEvent && event.pointerType === "touch")
            document
              .querySelector(".ink-sheet")
              ?.setAttribute("data-fill-test-pointer", String(event.pointerId));
        },
        { capture: true, once: true },
      );
    });
    const fingers = await hand(page);
    await fingers.down([contact(center)]);
    await page.clock.runFor(30);
    await expect.poll(() => wetFillColor(page, center)).toEqual(red);
    if (cancellation === "pagehide")
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    else
      await page.locator(".ink-sheet").evaluate((sheet, type) => {
        const pointerId = Number(sheet.getAttribute("data-fill-test-pointer"));
        if (!pointerId) throw new Error("The browser touch has no observed pointer ID");
        sheet.dispatchEvent(
          new PointerEvent(type, {
            pointerId,
            pointerType: "touch",
            clientX: -1000,
            clientY: -1000,
            bubbles: true,
          }),
        );
      }, cancellation);
    await fingers.up();
    expect(await wetFillColor(page, center)).toEqual(clear);
    expect(await rawFillDigest(page)).toBe(raw);
    expect(await shownColor(page, center)).toEqual(clear);
    expect(await readKeptHistory(page)).toEqual(before);
    await expect(redo(page)).toBeEnabled();
  });
}

test("a released Fill drains before a later young two-finger Undo and three fingers Redo it", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  const { center, centers } = await wetFixture(page, "blank");
  await gateNext(page);
  await fillAt(page, center);
  await heldAnswer(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await controlTouchTime(page);
  const fingers = await hand(page);
  const tap = [contact(centers[2]), contact(centers[3], 2)];
  await fingers.down(tap);
  await fingers.up();
  await releaseFillWorkerGate(page);
  await page.clock.runFor(80);
  await expect.poll(() => shownColor(page, center)).toEqual(clear);
  await expect(redo(page)).toBeEnabled();
  expect(await fillSteps(page)).toHaveLength(0);
  const triple = [...tap, contact({ x: centers[3].x, y: centers[3].y + 40 }, 3)];
  await fingers.down(triple);
  await fingers.up();
  await page.clock.runFor(80);
  await expect.poll(() => shownColor(page, center)).toEqual(red);
  expect(await fillSteps(page)).toHaveLength(1);
});

test("a worker deadline retains its accepted prefix and persistent notice, then a fresh worker retries", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await openSheet(page, "fill-deadline");
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  const pen = await pencil(page);
  await pen.down(centers[0], 0.5);
  await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
  await gateNext(page);
  await pen.move(centers[3], 0.5);
  await pen.up(centers[3]);
  await heldAnswer(page);
  await button(page, creation.seal.label).click();
  await expect(page.getByText(creation.fillReference.failed.en, { exact: true })).toBeVisible();
  expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
  await expect.poll(() => fillSteps(page)).toHaveLength(1);
  expect((await readFillWorkerProbe(page)).workers.some((worker) => worker.terminated)).toBe(true);
  await releaseFillWorkerGate(page);
  expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
  await expect(activeSeal(page)).toBeHidden();
  await expect(page.getByText(creation.fillReference.failed.en, { exact: true })).toBeVisible();
  expect(failures.some((message) => /deadline|Fill preparation/.test(message))).toBe(true);
  await clearFillWorkerGate(page);
  await fillAt(page, centers[1]);
  await expect.poll(() => shownColor(page, centers[1])).toEqual(red);
  expect((await readFillWorkerProbe(page)).workers.length).toBeGreaterThan(1);
  await expect(page.getByText(creation.fillReference.failed.en, { exact: true })).toBeVisible();
  await button(page, creation.tools.brush).click();
  await expect(page.locator(".ink-sheet")).toHaveAttribute("data-tool", "brush");
});

test("grouped Redo canvas refusal preserves all pixels and remains retryable", async ({ page }) => {
  await installFillCanvasProbe(page);
  await openSheet(page, "fill-redo-allocation");
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await fillSweep(page, [centers[0], centers[3]]);
  await expect.poll(() => fillSteps(page)).toHaveLength(4);
  await undo(page).click();
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => clear));
  await captureFillCanvases(page);
  const before = await readKeptHistory(page);
  const raw = await rawFillDigest(page);
  const size = await page
    .locator(".ink-current canvas")
    .first()
    .evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Selected layer has no canvas");
      return { width: element.width, height: element.height };
    });
  await armFillCanvasRefusal(page, size);
  await redo(page).click();
  await expect(page.getByText(creation.layers.inkFailed.en, { exact: true })).toBeVisible();
  expect((await readFillCanvasProbe(page)).refused.length).toBeGreaterThan(0);
  await disarmFillCanvasRefusal(page);
  expect(await colorsAt(page, centers)).toEqual(centers.map(() => clear));
  expect(await rawFillDigest(page)).toBe(raw);
  expect(await readKeptHistory(page)).toEqual(before);
  await expect(redo(page)).toBeEnabled();
  await redo(page).click();
  await expect.poll(() => colorsAt(page, centers)).toEqual(centers.map(() => red));
});

for (const cancellation of ["pointercancel", "lostpointercapture"] as const) {
  test(`${cancellation} keeps accepted Fill prefix and ignores cancellation coordinates`, async ({
    page,
  }) => {
    await openSheet(page, `fill-${cancellation}`);
    const { centers, box } = await outlinedCells(page);
    await color(page, "red");
    await selectFillReference(page, "layer");
    const pen = await pencil(page);
    await pen.down(centers[0], 0.5);
    await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
    await cancelFillPointer(page, cancellation);
    await pen.up(centers[0]);
    expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
    expect(await shownColor(page, at(box, 0.1, 0.1))).toEqual(clear);
    await expect.poll(() => fillSteps(page)).toHaveLength(1);
  });
}

test("pagehide cancels queued Fill while My board suspension releases canvases and restores the prefix", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-pagehide");
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  const pen = await pencil(page);
  await pen.down(centers[0], 0.5);
  await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
  await gateNext(page);
  await pen.move(centers[3], 0.5);
  await pen.up(centers[3]);
  await heldAnswer(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await releaseFillWorkerGate(page);
  expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
  await expect.poll(() => fillSteps(page)).toHaveLength(1);
  await button(page, creation.myBoard).click();
  await expect(page.locator(".ink-sheet canvas")).toHaveCount(0);
  await resumeSheet(page);
  expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
});

test("time-up wins over a pending tool transition and rejects later sheet input", async ({
  page,
}) => {
  await installFillWorkerProbe(page);
  await openSheet(page, "fill-cutoff");
  const { centers } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await expect.poll(async () => (await readKeptHistory(page)).count).toBeGreaterThan(0);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await nearTimeUp(page, 600);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await gateNext(page);
  await fillAt(page, centers[0]);
  await button(page, creation.tools.brush).click();
  await page.clock.runFor(700);
  await heldAnswer(page);
  await expect(button(page, creation.timer.label)).toBeDisabled();
  const pen = await pencil(page);
  await pen.down(centers[3], 0.5);
  await pen.move(centers[2], 0.5);
  await pen.up(centers[2]);
  await releaseFillWorkerGate(page);
  await page.clock.runFor(100);
  await expect(activeSeal(page)).toBeVisible();
  await expect(page.locator(".drawing-screen")).toHaveClass(/is-time-up/);
  expect(await colorsAt(page, centers)).toEqual([red, clear, clear, clear]);
  await expect.poll(() => fillSteps(page)).toHaveLength(1);
  await expect(page.locator(".ink-sheet")).toHaveAttribute("data-tool", "fill");
});

test("pagehide resolves a blank cutoff without reviving a late Fill or opening an empty seal", async ({
  page,
}, testInfo) => {
  await installFillWorkerProbe(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
      requests.push(request.url());
  });
  await openSheet(page, "fill-blank-cutoff-hide");
  await color(page, "red");
  await selectFillReference(page, "layer");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await nearTimeUp(page, 600);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await gateNext(page);
  const center = at(await sheetBox(page), 0.5, 0.5);
  await fillAt(page, center);
  await page.clock.runFor(40);
  const cutoffEvidence = testInfo.outputPath("blank-cutoff-before-answer.json");
  await writeFile(
    cutoffEvidence,
    JSON.stringify(
      {
        probe: await readFillWorkerProbe(page),
        history: await readKeptHistory(page),
        sheet: await page.locator(".ink-sheet").evaluate((sheet) => {
          const box = sheet.getBoundingClientRect();
          return {
            html: sheet.outerHTML,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
          };
        }),
      },
      null,
      2,
    ),
  );
  await testInfo.attach("blank-cutoff-before-answer", {
    contentType: "application/json",
    path: cutoffEvidence,
  });
  await heldAnswer(page);
  await page.clock.runFor(700);
  await expect(button(page, creation.timer.label)).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await releaseFillWorkerGate(page);
  await page.clock.runFor(80);
  await expect(page.getByText(creation.seal.emptyAtTimeUp.en, { exact: true })).toBeVisible();
  await expect(activeSeal(page)).toBeHidden();
  expect(await shownColor(page, center)).toEqual(clear);
  expect(requests).toEqual([]);
});

test("Fill respects Pencil only input and a resting palm while fingers still Undo", async ({
  page,
}) => {
  await openSheet(page, "fill-pencil-palm");
  const { centers, box } = await outlinedCells(page);
  await color(page, "red");
  await selectFillReference(page, "layer");
  await expect(button(page, creation.tools.pencilOnly)).toHaveAttribute("aria-pressed", "true");
  const fingers = await hand(page);
  await fingers.down([contact(centers[0])]);
  await fingers.up();
  expect(await colorsAt(page, centers)).toEqual(centers.map(() => clear));
  await fillAt(page, centers[0]);
  await expect.poll(() => shownColor(page, centers[0])).toEqual(red);
  const palm = { ...at(box, 0.85, 0.85), id: 8, radius: PALM_CONTACT_PX };
  await fingers.down([palm]);
  const tap = [contact(centers[2], 2), contact(centers[3], 3)];
  await fingers.down([palm, ...tap]);
  await fingers.up(tap);
  await expect.poll(() => shownColor(page, centers[0])).toEqual(clear);
  await fingers.up();
  await fingerInput(page);
  await fingers.down([{ ...palm, ...centers[0] }]);
  await fingers.up();
  expect(await colorsAt(page, centers)).toEqual(centers.map(() => clear));
});
