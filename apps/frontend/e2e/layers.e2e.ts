import { MAX_LAYERS, MAX_TIME_USED_S } from "@drawing-app/api/client";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { LIFT_HOLD_MS } from "../src/sticker-creation/layers/useLayerDrag.ts";
import { eraseTestLine, readKeptHistory } from "./emptySeal.ts";
import {
  add,
  boundary,
  button,
  chip,
  color,
  fillAt,
  line,
  openSheet,
  options,
  sheetBox,
  shownColor,
  slider,
  undo,
} from "./fillHelpers.ts";
import { canvas, openDetail, openSealSheet, say, sealOnSheet, ticketSnapshot } from "./helpers.ts";
import { along, at, FINGERTIP, hand, inkAt, inkedPixels, inkShows, middle } from "./pen.ts";

const language = "en";
const evidence = fileURLToPath(
  new URL("../../../data/verification/empty-seal-preview-2026-10-11/", import.meta.url),
);
interface CanvasNumbers {
  created: number;
  explicitReleases: number;
  allocationFailures: { nullContexts: number; thrownContexts: number };
  nominalActiveRgbaBytes: number;
  nominalPeakRgbaBytes: number;
  dimensions: { width: number; height: number; released: boolean }[];
}
declare global {
  interface Window {
    __sealCanvasNumbers?: () => CanvasNumbers;
    __resetSealCanvasPeak?: () => void;
  }
}
const { stickerCreation: creation, stickerBoard, ui } = strings;
const copy = creation.layers;

/** Two separated marks, on different layers: each can disappear without hiding the other. */
async function twoLayers(page: Page) {
  await openSheet(page);
  let lower = middle(along(await sheetBox(page), 0.35, 0.3, 0.7));
  await expect(async () => {
    lower = await line(page, 0.35);
    await inkShows(page, lower);
  }).toPass();
  await add(page).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  const upper = await line(page, 0.65);
  await inkShows(page, lower, upper);
  return { lower, upper };
}

test("clear and delete affect the current layer, and undo restores its ink and selection", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await button(page, creation.tools.clear).click();
  await button(page, creation.clearBar.clear).click();
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await undo(page).click();
  await inkShows(page, lower, upper);

  await options(page, 2);
  await button(page, copy.delete).click();
  await expect(chip(page, 2)).toHaveCount(0);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await undo(page).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await inkShows(page, lower, upper);
});

test("a reload restores layer order, the selected layer, and both layers' marks", async ({
  page,
}) => {
  await twoLayers(page);
  await options(page, 2);
  await button(page, copy.moveBack).click();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: say(copy.movedBehind, language, { number: 2, other: 1 }) }),
  ).toBeVisible();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  const box = await sheetBox(page);
  await inkShows(page, middle(along(box, 0.35, 0.3, 0.7)), middle(along(box, 0.65, 0.3, 0.7)));
});

test("the board releases drawing canvases, and returning restores layers and redo", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await undo(page).click();
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  await button(page, creation.myBoard).click();
  await expect(button(page, stickerBoard.board.continueDrawing)).toBeVisible();
  await expect(page.locator(".ink-sheet canvas")).toHaveCount(0);

  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await button(page, copy.dismissOptionsHint).click();
  await canvas(page, language).hover();
  const box = await sheetBox(page);
  const restoredLower = middle(along(box, 0.35, 0.3, 0.7));
  const restoredUpper = middle(along(box, 0.65, 0.3, 0.7));
  await inkShows(page, restoredLower);
  await expect.poll(() => inkAt(page, restoredUpper)).toBe(0);
  await button(page, creation.history.redo).click();
  await inkShows(page, restoredLower, restoredUpper);
});

test("layer setup survives a reload before the first mark, with the clock still waiting", async ({
  page,
}) => {
  await openSheet(page);
  await add(page).click();
  await options(page, 2);
  await expect(button(page, copy.lock)).not.toHaveAttribute("aria-disabled", "true");
  await button(page, copy.lock).click();
  await expect(button(page, copy.lock)).toHaveAttribute("aria-pressed", "true");
  await button(page, copy.moveBack).click();
  await slider(page).press("ArrowDown");
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "95");
  await chip(page, 2).click();
  const timer = button(page, creation.timer.label);
  await expect(timer).toBeVisible();
  const description = await timer.evaluate((dot) => {
    const id = dot.getAttribute("aria-describedby");
    return id ? document.getElementById(id)?.textContent : null;
  });
  if (!description) throw new Error("The waiting clock has no description");

  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await options(page, 2);
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "95");
  await chip(page, 2).click();
  await expect(timer).toHaveAccessibleDescription(description);
  await options(page, 2);
  await expect(button(page, copy.lock)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 2).click();
  await chip(page, 1).click();
  await line(page, 0.5);
  await expect(button(page, creation.timer.pause)).toBeVisible();
});

for (const firstTool of ["brush", "fill"] as const) {
  test(`empty eraser preserves the waiting clock through reload before first ${firstTool}`, async ({
    page,
  }) => {
    await openSheet(page);
    const before = await ticketSnapshot(page);
    const description = await button(page, creation.timer.label).evaluate((dot) => {
      const id = dot.getAttribute("aria-describedby");
      return id ? document.getElementById(id)?.textContent : null;
    });
    if (!description) throw new Error("The waiting clock has no description");
    await button(page, creation.tools.eraser).click();
    const point = await line(page, 0.5);
    for (const reload of [false, true]) {
      if (reload) {
        await page.reload();
        await button(page, stickerBoard.board.continueDrawing).click();
        await canvas(page, language).hover();
        await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
      }
      await expect(button(page, creation.timer.label)).toHaveAccessibleDescription(description);
      await expect(undo(page)).toBeDisabled();
      await expect(button(page, creation.seal.label)).toBeHidden();
      await expect.poll(() => inkAt(page, point)).toBe(0);
      expect(await ticketSnapshot(page)).toEqual(before);
    }
    await button(page, creation.tools[firstTool]).click();
    if (firstTool === "brush") await line(page, 0.5);
    else await canvas(page, language).click();
    await expect(button(page, creation.timer.pause)).toBeVisible();
    await expect(undo(page)).toBeEnabled();
    await expect(button(page, creation.seal.label)).toBeVisible();
    expect(await ticketSnapshot(page)).toEqual(before);
  });
}

test("Lock stays available before drawing and after full erasure", async ({ page }) => {
  await openSheet(page);
  await options(page, 1);
  const lock = button(page, copy.lock);
  await expect(lock).not.toHaveAttribute("aria-disabled", "true");
  await lock.press("Enter");
  await expect(lock).toHaveAttribute("aria-pressed", "true");
  await expect(lock).toHaveAccessibleDescription(
    "Keeps new marks inside this layer’s ink. Turn off to draw outside it.",
  );
  await lock.press("Enter");
  await expect(lock).toHaveAttribute("aria-pressed", "false");
  await chip(page, 1).click();
  await line(page, 0.5, 0.4, 0.6);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
  await eraseTestLine(page);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await options(page, 1);
  await lock.click();
  await expect(lock).toHaveAttribute("aria-pressed", "true");
  await chip(page, 1).click();
  await button(page, creation.tools.brush).click();
  await line(page, 0.5);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await options(page, 1);
  await lock.click();
  await expect(lock).toHaveAttribute("aria-pressed", "false");
  await chip(page, 1).click();
  await line(page, 0.5);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
});

test("fully erased ink offers recovery, and Undo restores a ready preview", async ({ page }) => {
  await openSheet(page);
  await line(page, 0.5, 0.45, 0.55);
  await eraseTestLine(page, language);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  const sheet = await openSealSheet(page, language);
  await expect(sheet.getByText(creation.sealSheet.empty.en, { exact: true })).toBeVisible();
  await expect(sheet.getByRole("switch")).toHaveCount(0);
  await expect(button(page, creation.sealSheet.seal)).toBeDisabled();
  await button(page, creation.sealSheet.backToDrawing).click();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(page.locator(".ink-sheet")).toBeVisible();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await undo(page).click();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
  await openSealSheet(page, language);
  await expect(page.locator(".seal-preview__ink")).toBeVisible();
  await expect(page.getByRole("switch", { name: creation.sealSheet.nsfwLabel.en })).toBeVisible();
});

/** Makes the visible sheet empty while keeping a spent, recoverable drawing session. */
async function invisibleSheet(page: Page, kind: "erased" | "hidden" | "clipped") {
  await openSheet(page);
  if (kind === "clipped" || kind === "hidden") {
    await add(page).click();
    await button(page, copy.dismissOptionsHint).click();
  }
  await line(page, 0.5, 0.45, 0.55);
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
  if (kind === "erased") await eraseTestLine(page, language);
  if (kind === "hidden") {
    await options(page, 2);
    for (let i = 0; i < 20; i++) await slider(page).press("ArrowDown");
    await expect(slider(page)).toHaveAttribute("aria-valuenow", "0");
    await chip(page, 2).click();
  }
  if (kind === "clipped") {
    await options(page, 2);
    await button(page, copy.clip).click();
    await chip(page, 2).click();
  }
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
}

test("restoring opacity replaces an empty preview with ready ink", async ({ page }) => {
  const sealRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
      sealRequests.push(request.url());
  });
  await invisibleSheet(page, "hidden");
  await openSealSheet(page, language);
  await expect(page.getByText(creation.sealSheet.empty.en, { exact: true })).toBeVisible();
  await expect(page.locator(".seal-sheet").getByRole("switch")).toHaveCount(0);
  await expect(button(page, creation.sealSheet.seal)).toBeDisabled();
  await expect(page.locator(".seal-preview__ink")).toBeHidden();
  await button(page, creation.sealSheet.backToDrawing).click();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(page.locator(".ink-sheet")).toBeVisible();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await options(page, 2);
  await button(page, copy.showLayer).click();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
  await chip(page, 2).click();
  await openSealSheet(page, language);
  await expect(page.locator(".seal-preview__ink")).toBeVisible();
  await expect(page.getByRole("switch", { name: creation.sealSheet.nsfwLabel.en })).toBeVisible();
  expect(sealRequests).toHaveLength(0);
});

test("clipping to an empty base preserves recoverable ink", async ({ page }) => {
  const sealRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
      sealRequests.push(request.url());
  });
  await invisibleSheet(page, "clipped");
  await openSealSheet(page, language);
  await expect(page.getByText(creation.sealSheet.empty.en, { exact: true })).toBeVisible();
  await expect(page.locator(".seal-sheet").getByRole("switch")).toHaveCount(0);
  await expect(button(page, creation.sealSheet.seal)).toBeDisabled();
  await expect(page.locator(".seal-preview__ink")).toBeHidden();
  await button(page, creation.sealSheet.backToDrawing).click();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(page.locator(".ink-sheet")).toBeVisible();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  await options(page, 2);
  await button(page, copy.clip).click();
  await chip(page, 2).click();
  await openSealSheet(page, language);
  await expect(page.locator(".seal-preview__ink")).toBeVisible();
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBeGreaterThan(0);
  expect(sealRequests).toHaveLength(0);
});

for (const invisible of ["erased", "hidden", "clipped"] as const) {
  test(`empty ordinary time-up preserves ${invisible} ink through reload until explicit discard`, async ({
    page,
  }) => {
    await page.clock.install();
    const sealRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/stickers")
        sealRequests.push(request.url());
    });
    await invisibleSheet(page, invisible);
    const before = await ticketSnapshot(page);
    const expectedSteps = [
      expect.objectContaining({
        tool: "brush",
        pts: expect.arrayContaining([expect.any(Number)]),
      }),
      expect.objectContaining(
        invisible === "erased"
          ? { tool: "eraser", pts: expect.arrayContaining([expect.any(Number)]) }
          : invisible === "hidden"
            ? { tool: "opacity", opacity: 0 }
            : { tool: "clip", on: true },
      ),
    ];
    await expect
      .poll(async () => (await readKeptHistory(page)).steps)
      .toEqual(expect.arrayContaining(expectedSteps));
    const keptBefore = await readKeptHistory(page);
    expect(keptBefore.count).toBe(keptBefore.steps.length);
    expect(keptBefore.identity).toEqual(
      expect.objectContaining({ ticket: expect.any(Number), generation: expect.any(String) }),
    );
    expect(keptBefore.frame).toEqual(
      expect.objectContaining({
        w: expect.any(Number),
        h: expect.any(Number),
        density: expect.any(Number),
      }),
    );
    await expect(button(page, creation.timer.pause)).toBeVisible();
    for (let ms = 0; ms < MAX_TIME_USED_S * 1000; ms += 5000) await page.clock.fastForward(5000);
    for (const reload of [false, true]) {
      if (reload) {
        await page.reload();
        await button(page, stickerBoard.board.continueDrawing).click();
      }
      await expect(page.getByRole("heading", { name: creation.sealSheet.timeUp.en })).toBeVisible();
      await expect(page.getByText(creation.sealSheet.empty.en, { exact: true })).toBeVisible();
      await expect(page.locator(".seal-sheet__preview-status")).toBeFocused();
      expect(await ticketSnapshot(page)).toEqual(before);
      expect(await readKeptHistory(page)).toEqual(keptBefore);
      expect(sealRequests).toHaveLength(0);
      if (reload && invisible === "erased") {
        await mkdir(evidence, { recursive: true });
        await page.screenshot({
          path: `${evidence}/time-up-ordinary-erased-${test.info().project.name}.png`,
          animations: "disabled",
        });
      }
    }
    await button(page, creation.seal.startOver).click();
    await expect(page.locator(".seal-sheet:not(.is-leaving)")).toHaveCount(0);
    await expect.poll(async () => (await readKeptHistory(page)).steps).toEqual([]);
  });
}

test("measures repeated empty previews with retained layer history", async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const records = new Map<number, { width: number; height: number; released: boolean }>();
    const ids = new WeakMap<HTMLCanvasElement, number>();
    let nextId = 1;
    let releaseCount = 0;
    let nullContexts = 0;
    let thrownContexts = 0;
    let nominalActiveRgbaBytes = 0;
    let nominalPeakRgbaBytes = 0;
    const track = (canvas: HTMLCanvasElement) => {
      let id = ids.get(canvas);
      if (!id) {
        id = nextId++;
        ids.set(canvas, id);
      }
      const width = canvas.width;
      const height = canvas.height;
      const prior = records.get(id);
      if (prior && prior.width * prior.height > 0 && width * height === 0) releaseCount++;
      nominalActiveRgbaBytes += (width * height - (prior?.width ?? 0) * (prior?.height ?? 0)) * 4;
      nominalPeakRgbaBytes = Math.max(nominalPeakRgbaBytes, nominalActiveRgbaBytes);
      records.set(id, { width, height, released: width * height === 0 });
    };
    const originalGetContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof originalGetContext !== "function")
      throw new Error("Canvas getContext is unavailable");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      writable: true,
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        track(this);
        try {
          const context: unknown = Reflect.apply(originalGetContext, this, args);
          if (args[0] === "2d" && context === null) nullContexts++;
          return context;
        } catch (error) {
          if (args[0] === "2d") thrownContexts++;
          throw error;
        }
      },
    });
    for (const key of ["width", "height"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key);
      if (!descriptor?.get || !descriptor.set)
        throw new Error(`Canvas ${key} descriptor unavailable`);
      Object.defineProperty(HTMLCanvasElement.prototype, key, {
        ...descriptor,
        set(this: HTMLCanvasElement, value: number) {
          descriptor.set?.call(this, value);
          track(this);
        },
      });
    }
    window.__resetSealCanvasPeak = () => {
      nominalPeakRgbaBytes = nominalActiveRgbaBytes;
    };
    window.__sealCanvasNumbers = () => ({
      created: nextId - 1,
      explicitReleases: releaseCount,
      allocationFailures: { nullContexts, thrownContexts },
      nominalActiveRgbaBytes,
      nominalPeakRgbaBytes,
      dimensions: [...records.values()].filter(
        (record) => !record.released && record.width * record.height >= 1_000_000,
      ),
    });
  });
  const numbers = () =>
    page.evaluate(() => {
      if (!window.__sealCanvasNumbers) throw new Error("Canvas measurement was not installed");
      return window.__sealCanvasNumbers();
    });
  await openSheet(page);
  for (let id = 1; id <= MAX_LAYERS; id++) {
    if (id > 1) {
      await add(page).click();
      if (id === 2) await button(page, copy.dismissOptionsHint).click();
    }
    await line(page, 0.5, 0.45, 0.55);
  }
  for (let stroke = 0; stroke < 14; stroke++) await line(page, 0.5, 0.45, 0.55);
  await options(page, MAX_LAYERS);
  await button(page, copy.clip).click();
  await chip(page, MAX_LAYERS).click();
  const beforeErasure = await numbers();
  for (let id = MAX_LAYERS; id >= 1; id--) {
    if (id !== MAX_LAYERS) await chip(page, id).click();
    await eraseTestLine(page, language);
  }
  await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
  const openings: {
    endToEndDialogReadyMs: number;
    before: CanvasNumbers;
    ready: CanvasNumbers;
    after: CanvasNumbers;
  }[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      if (!window.__resetSealCanvasPeak) throw new Error("Canvas measurement was not installed");
      window.__resetSealCanvasPeak();
    });
    const before = await numbers();
    const started = Date.now();
    const sheet = await openSealSheet(page, language);
    await expect(sheet.getByText(creation.sealSheet.empty.en, { exact: true })).toBeVisible();
    const endToEndDialogReadyMs = Date.now() - started;
    const ready = await numbers();
    await button(page, creation.sealSheet.backToDrawing).click();
    openings.push({ endToEndDialogReadyMs, before, ready, after: await numbers() });
  }
  const result = {
    browserName,
    layers: MAX_LAYERS,
    brushStrokes: 24,
    sourceCanvasDimensions: await page
      .locator(".ink-sheet canvas")
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node instanceof HTMLCanvasElement ? node.width : 0,
          node instanceof HTMLCanvasElement ? node.height : 0,
        ]),
      ),
    beforeErasure,
    openings,
    limits:
      "Canvas IDs are weak but numeric records can overcount canvases collected without explicit release. Nominal RGBA bytes are not measured GPU memory. End-to-end dialog readiness includes clicks, preparation and animation waits; helper-only samples are in preparation JSON.",
  };
  await mkdir(evidence, { recursive: true });
  const bytes = Buffer.from(JSON.stringify(result, null, 2));
  await writeFile(`${evidence}/retained-layers-${browserName}.json`, bytes);
  await test
    .info()
    .attach("retained-layers.json", { body: bytes, contentType: "application/json" });
  expect(openings).toHaveLength(3);
  expect(
    openings.every(({ endToEndDialogReadyMs }) => Number.isFinite(endToEndDialogReadyMs)),
  ).toBe(true);
  expect(
    openings.every(
      ({ ready }) =>
        ready.allocationFailures.nullContexts === 0 &&
        ready.allocationFailures.thrownContexts === 0,
    ),
  ).toBe(true);
  expect(
    openings.every(({ before, after }) => after.explicitReleases > before.explicitReleases),
  ).toBe(true);
});

test("opacity hides only its layer and direct recovery restores it without drawing", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await options(page, 2);
  await slider(page).press("Home");
  await expect(slider(page)).toHaveAttribute("aria-valuenow", "0");
  await chip(page, 2).click();
  await expect.poll(() => inkAt(page, upper)).toBe(0);
  await inkShows(page, lower);
  const before = await readKeptHistory(page);
  const blocked = await line(page, 0.8);
  await expect(page.locator(".layer-hidden-recovery")).toBeVisible();
  await expect.poll(() => inkAt(page, blocked)).toBe(0);
  expect(await readKeptHistory(page)).toEqual(before);
  await button(page, copy.showLayer).click();
  await inkShows(page, lower, upper);
  await expect.poll(() => inkAt(page, blocked)).toBe(0);
});

test("pointer opacity previews remain one undoable change on release", async ({ page }) => {
  await openSheet(page);
  await line(page, 0.5);
  await expect.poll(async () => (await readKeptHistory(page)).steps.length).toBe(1);
  await options(page, 1);
  const range = slider(page);
  // Raw mouse coordinates must come from the panel after its opening movement finishes.
  await range.evaluate(async (el) => {
    const panel = el.closest(".layer-options");
    if (!panel) throw new Error("The opacity range has no options panel");
    await Promise.all(panel.getAnimations().map((animation) => animation.finished));
  });
  const box = await range.boundingBox();
  if (!box) throw new Error("The opacity range has no box");
  await expect(range).toBeFocused();
  await page.mouse.move(box.x + box.width - 13, box.y + box.height / 2);
  await page.mouse.down();
  await expect(range).toHaveValue("100");
  await page.mouse.up();
  expect((await readKeptHistory(page)).steps).toHaveLength(1);
  await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2, { steps: 4 });
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 4 });
  await expect(range).toBeFocused();
  const preview = Number(await range.inputValue());
  expect(preview).toBeGreaterThan(0);
  expect(preview).toBeLessThan(50);
  expect((await readKeptHistory(page)).steps).toHaveLength(1);
  await page.mouse.up();
  await expect.poll(async () => (await readKeptHistory(page)).steps).toHaveLength(2);
  expect((await readKeptHistory(page)).steps.at(-1)).toMatchObject({
    tool: "opacity",
    opacity: preview,
  });
  await undo(page).click();
  await options(page, 1);
  await expect(range).toHaveValue("100");
});

test("Merge down retains both marks, selects its destination, and Undo restores the pair", async ({
  page,
}) => {
  const { lower, upper } = await twoLayers(page);
  await options(page, 2);
  await page.getByRole("button", { name: say(copy.mergeInto, language, { number: 1 }) }).click();
  await expect(chip(page, 2)).toHaveCount(0);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(chip(page, 1)).toBeFocused();
  await inkShows(page, lower, upper);
  await undo(page).click();
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await inkShows(page, lower, upper);
  await options(page, 1);
  const unavailableMerge = button(page, copy.merge);
  await expect(unavailableMerge).toHaveAttribute("aria-disabled", "true");
  await unavailableMerge.focus();
  await unavailableMerge.press("Enter");
  await expect(page.locator(".layer-options-help")).toContainText(copy.mergeNoLower.en);
  await expect(chip(page, 2)).toBeVisible();
});

test("Help works from the keyboard and Escape returns to the selected layer", async ({ page }) => {
  await openSheet(page);
  await options(page, 1);
  await expect(slider(page)).toBeFocused();
  await button(page, copy.help).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".layer-options-help")).toBeVisible();
  await expect(button(page, copy.help)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(chip(page, 1)).toBeFocused();
});

test("a touch hold reorders once, and undo restores the original order", async ({ page }) => {
  await twoLayers(page);
  const from = await chip(page, 2).boundingBox();
  const to = await chip(page, 1).boundingBox();
  if (!from || !to) throw new Error("The layer chips are not visible");
  const fingers = await hand(page);
  const contact = {
    id: 1,
    radius: FINGERTIP,
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  };
  await fingers.down([contact]);
  await page.waitForTimeout(LIFT_HOLD_MS + 100);
  await fingers.move([{ ...contact, y: to.y + to.height / 2 }]);
  await fingers.up();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await undo(page).click();
  await expect(page.locator(".layer-list [data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "2",
  );
});

test("the layer cap prevents another add and the last layer cannot be deleted", async ({
  page,
}) => {
  await openSheet(page);
  await options(page, 1);
  await expect(button(page, copy.delete)).toHaveAttribute("aria-disabled", "true");
  await chip(page, 1).click();
  for (let id = 2; id <= MAX_LAYERS; id++) {
    await add(page).click();
    await expect(chip(page, id)).toHaveAttribute("aria-selected", "true");
  }
  await expect(add(page)).toBeDisabled();
  await expect(page.locator(".layer-list [data-layer-chip]")).toHaveCount(MAX_LAYERS);
});

test("locking transparent pixels recolors existing ink without extending it", async ({ page }) => {
  await openSheet(page);
  await color(page, "blue");
  await expect(async () => {
    await inkShows(page, await line(page, 0.5, 0.4, 0.6));
  }).toPass();
  const box = await sheetBox(page);
  const center = at(box, 0.5, 0.5);
  await expect.poll(() => shownColor(page, center)).toEqual([47, 107, 255, 255]);
  await options(page, 1);
  await button(page, copy.lock).click();
  await expect(button(page, copy.lock)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 1).click();
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => shownColor(page, center)).toEqual([47, 107, 255, 255]);
  await options(page, 1);
  await expect(button(page, copy.lock)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 1).click();
  await button(page, creation.timer.resume).click();
  await expect(button(page, creation.timer.pause)).toBeVisible();
  await color(page, "red");
  await line(page, 0.5, 0.2, 0.8);
  await expect.poll(() => shownColor(page, center)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => inkAt(page, at(box, 0.3, 0.5))).toBe(0);
  await expect.poll(() => inkAt(page, at(box, 0.7, 0.5))).toBe(0);
  await undo(page).click();
  await expect.poll(() => shownColor(page, center)).toEqual([47, 107, 255, 255]);
});

test("Fill defaults to this layer, and visible reference respects a lower boundary through reload and replay", async ({
  page,
}) => {
  await openSheet(page);
  await color(page, "blue");
  const box = await boundary(page);
  const inside = at(box, 0.5, 0.5);
  const outside = at(box, 0.15, 0.5);
  await add(page).click();
  await button(page, copy.dismissOptionsHint).click();
  await color(page, "red");
  await button(page, creation.tools.fill).click();
  const choices = page.getByRole("radiogroup", {
    name: say(creation.fillReference.label, language),
  });
  const own = choices.getByRole("radio", { name: say(creation.fillReference.layer, language) });
  const visible = choices.getByRole("radio", {
    name: say(creation.fillReference.visible, language),
  });
  await expect(own).toBeChecked();
  await own.focus();
  await own.press("ArrowRight");
  await expect(visible).toBeChecked();
  await visible.press("ArrowLeft");
  await expect(own).toBeChecked();
  await expect(button(page, creation.timer.pause)).toBeVisible();
  await fillAt(page, inside);
  await expect.poll(() => shownColor(page, outside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await undo(page).click();
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await expect.poll(() => inkAt(page, inside)).toBe(0);
  await visible.click();
  await expect(visible).toBeChecked();
  await button(page, creation.tools.brush).click();
  await expect(choices).toBeHidden();
  await button(page, creation.tools.fill).click();
  await expect(visible).toBeChecked();
  await fillAt(page, inside);
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await expect
    .poll(async () => {
      const kept = await readKeptHistory(page);
      return { count: kept.count, last: kept.steps.at(-1) };
    })
    .toMatchObject({
      count: 3,
      last: { tool: "fill", layer: 2, reference: "visible", color: "#E8484F" },
    });
  const filled = await readKeptHistory(page);
  await undo(page).click();
  await expect.poll(() => inkAt(page, inside)).toBe(0);
  await expect.poll(async () => (await readKeptHistory(page)).count).toBe(2);
  await button(page, creation.history.redo).click();
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => readKeptHistory(page)).toEqual(filled);
  await page.reload();
  await button(page, stickerBoard.board.continueDrawing).click();
  await button(page, creation.tools.fill).click();
  await expect(visible).toBeChecked();
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await button(page, creation.timer.resume).click();
  await color(page, "blue");
  await own.click();
  await fillAt(page, outside);
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => shownColor(page, outside)).toEqual([47, 107, 255, 255]);
  await undo(page).click();
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await button(page, creation.history.redo).click();
  await expect.poll(() => shownColor(page, outside)).toEqual([47, 107, 255, 255]);
  await openSealSheet(page, language);
  const { card, no } = await sealOnSheet(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  await detail
    .getByRole("button", { name: say(stickerBoard.timelapse.watchLabel, language, { no }) })
    .click();
  const replay = detail.locator(".timelapse-overlay");
  await expect(replay).toHaveAttribute("data-phase", "ending", { timeout: 30_000 });
  const pixels = await replay.locator("canvas").evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Replay has no ink canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Replay canvas has no 2D context");
    const paper = canvas.parentElement?.querySelector(".timelapse-overlay__paper");
    if (!paper) throw new Error("Replay has no paper");
    const sheet = paper.getBoundingClientRect();
    const stage = canvas.getBoundingClientRect();
    const rgba = (x: number, y: number) => {
      const pixelX = Math.round(
        ((sheet.left - stage.left + sheet.width * x) * canvas.width) / stage.width,
      );
      const pixelY = Math.round(
        ((sheet.top - stage.top + sheet.height * y) * canvas.height) / stage.height,
      );
      return [...context.getImageData(pixelX, pixelY, 1, 1).data];
    };
    return { inside: rgba(0.5, 0.5), outside: rgba(0.15, 0.5) };
  });
  expect(pixels.inside).toEqual([232, 72, 79, 255]);
  expect(pixels.outside).toEqual([47, 107, 255, 255]);
});

test("Clip enabled before painting masks a broad base and reveals retained outside ink when disabled", async ({
  page,
}) => {
  await openSheet(page);
  await color(page, "blue");
  const box = await boundary(page);
  const inside = at(box, 0.5, 0.5);
  const outside = at(box, 0.8, 0.5);
  await button(page, creation.tools.fill).click();
  await fillAt(page, inside);
  await expect.poll(() => shownColor(page, inside)).toEqual([47, 107, 255, 255]);
  await add(page).click();
  await button(page, copy.dismissOptionsHint).click();
  await options(page, 2);
  await button(page, copy.clip).click();
  await expect(button(page, copy.clip)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 2).click();
  await color(page, "red");
  await button(page, creation.tools.brush).click();
  await line(page, 0.5, 0.4, 0.9);
  await expect.poll(() => shownColor(page, inside)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await options(page, 2);
  await button(page, copy.clip).click();
  await chip(page, 2).click();
  await expect.poll(() => shownColor(page, outside)).toEqual([232, 72, 79, 255]);
});

test("Clip enabled over an empty base keeps new ink recoverable", async ({ page }) => {
  await openSheet(page);
  await add(page).click();
  await button(page, copy.dismissOptionsHint).click();
  await options(page, 2);
  await button(page, copy.clip).click();
  await chip(page, 2).click();
  const point = await line(page, 0.5);
  await expect.poll(() => inkAt(page, point)).toBe(0);
  await options(page, 2);
  await button(page, copy.clip).click();
  await chip(page, 2).click();
  await inkShows(page, point);
});

test("clipping masks outside ink on screen and in the seal preview", async ({ page }) => {
  await openSheet(page);
  await color(page, "blue");
  await expect(async () => {
    await inkShows(page, await line(page, 0.5, 0.3, 0.7));
  }).toPass();
  await add(page).click();
  await button(page, copy.dismissOptionsHint).click();
  await color(page, "red");
  await line(page, 0.5, 0.4, 0.6);
  const outside = await line(page, 0.7);
  const box = await sheetBox(page);
  const center = at(box, 0.5, 0.5);
  await expect.poll(() => shownColor(page, center)).toEqual([232, 72, 79, 255]);
  await inkShows(page, outside);
  await options(page, 2);
  await button(page, copy.clip).click();
  await expect(button(page, copy.clip)).toHaveAttribute("aria-pressed", "true");
  await chip(page, 2).click();
  await expect.poll(() => inkAt(page, outside)).toBe(0);
  await expect.poll(() => shownColor(page, center)).toEqual([232, 72, 79, 255]);
  await expect.poll(() => shownColor(page, at(box, 0.35, 0.5))).toEqual([47, 107, 255, 255]);
  await openSealSheet(page, language);
  const preview = page.locator(".seal-preview__ink");
  await expect
    .poll(() =>
      preview.evaluate((node) => {
        if (!(node instanceof HTMLCanvasElement))
          throw new Error("The seal preview is not a canvas");
        const canvas = node;
        const g = canvas.getContext("2d");
        if (!g) throw new Error("No context for the seal preview");
        const { data } = g.getImageData(0, 0, canvas.width, canvas.height);
        const rows: number[] = [];
        let blue = 0;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (data[i] > 180 && data[i + 1] < 120 && data[i + 2] < 130) rows.push(y);
            if (data[i] < 100 && data[i + 1] < 150 && data[i + 2] > 220) blue++;
          }
        }
        if (!rows.length) return false;
        // Both colors belong to the same short row; the separate red stroke is absent.
        return blue > 0 && Math.max(...rows) - Math.min(...rows) < canvas.height * 0.5;
      }),
    )
    .toBe(true);
});

test("a sticker drawn on two layers seals and its layered timelapse plays to completion", async ({
  page,
}) => {
  await twoLayers(page);
  await openSealSheet(page, language);
  const { card, no } = await sealOnSheet(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  const watch = detail.getByRole("button", {
    name: say(stickerBoard.timelapse.watchLabel, language, { no }),
  });
  await watch.click();
  await expect(detail.locator(".timelapse-overlay")).toBeVisible();
  await expect(detail.locator(".timelapse-overlay")).toHaveCount(0, { timeout: 30_000 });
  await expect(watch).toBeEnabled();
});
