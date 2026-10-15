import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { strings } from "../src/i18n/strings/index.ts";
import { eraseTestLine } from "./emptySeal.ts";
import {
  canvas,
  chooseLanguage,
  drawKey,
  drawKeyName,
  drawStroke,
  nsfwSwitch,
  openSealSheet,
  openSettings,
  say,
  signIn,
  tapKey,
} from "./helpers.ts";
import { along, inkedPixels, pencil, penStroke } from "./pen.ts";

const evidence = fileURLToPath(
  new URL(
    "../../../data/verification/layer-selection-delight-2026-10-11/seal-recovery/",
    import.meta.url,
  ),
);

declare global {
  interface Window {
    __failSealPreview?: boolean;
  }
}

/** Real Canvas2D pixels, independent of the app's drawing and test mocks. */
async function previewFixture(page: Page, kind: "zero" | "white" | "faint" | "edge") {
  await page.goto("/");
  return page.evaluate(async (fixture) => {
    const { prepareSealPreview } = await import("../src/sticker-creation/sealing/sealPreview.ts");
    const source = document.createElement("canvas");
    const target = document.createElement("canvas");
    const scan = document.createElement("canvas");
    try {
      source.width = 2000;
      source.height = 1400;
      const ink = source.getContext("2d", { willReadFrequently: true });
      if (!ink) throw new Error("The fixture could not obtain a source context");
      if (fixture !== "zero") {
        const pixel = fixture === "edge" ? [0, 0] : [1000, 700];
        ink.fillStyle =
          fixture === "edge"
            ? "rgb(7,31,83)"
            : fixture === "white"
              ? "white"
              : "rgba(7,31,83,0.004)";
        ink.fillRect(pixel[0], pixel[1], 1, 1);
      }
      scan.width = 192;
      scan.height = 134;
      const scanContext = scan.getContext("2d", { willReadFrequently: true });
      if (!scanContext) throw new Error("The fixture could not obtain a scan context");
      scanContext.drawImage(source, 0, 0, scan.width, scan.height);
      const scanData = scanContext.getImageData(0, 0, scan.width, scan.height).data;
      let scanHasAlpha = false;
      for (let i = 3; i < scanData.length; i += 4) if (scanData[i] > 0) scanHasAlpha = true;
      const result = prepareSealPreview(target, source, 23);
      const edgeRgba =
        fixture === "edge"
          ? [...(target.getContext("2d")?.getImageData(23, 23, 1, 1).data ?? [])]
          : [];
      return { result, scanHasAlpha, size: [target.width, target.height], edgeRgba };
    } finally {
      source.width = source.height = 0;
      target.width = target.height = 0;
      scan.width = scan.height = 0;
    }
  }, kind);
}

test("real preview distinguishes transparent, white and faint ink", async ({ page }) => {
  const zero = await previewFixture(page, "zero");
  const white = await previewFixture(page, "white");
  const faint = await previewFixture(page, "faint");
  expect(zero.result).toBe("empty");
  expect(white.result).toBe("ready");
  expect(faint.scanHasAlpha).toBe(false);
  expect(faint.result).toBe("ready");
  expect(faint.size).toEqual([47, 47]);
});

test("real preview retains ink when its padded crop crosses the source edge", async ({ page }) => {
  const edge = await previewFixture(page, "edge");
  expect(edge.result).toBe("ready");
  expect(edge.edgeRgba).toEqual([7, 31, 83, 255]);
});

test("the preview's paper has a label's rounded corners, and marking it 18+ adds no pink gloss", async ({
  page,
}) => {
  await signIn(page, "seal-preview-paper", "en");
  await tapKey(drawKey(page, "en"));
  await drawStroke(page, "en");
  const dialog = await openSealSheet(page, "en");
  const paper = dialog.locator(".seal-preview__sticker canvas.sticker-material");
  await expect(paper).toHaveAttribute("data-state", "ready");
  const alpha = await paper.evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The preview paper is missing");
    const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) throw new Error("The preview paper's pixels are unreadable");
    const at = (x: number, y: number) => pixels[(y * canvas.width + x) * 4 + 3];
    return { corner: at(0, 0), middle: at(canvas.width >> 1, canvas.height >> 1) };
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.middle).toBeGreaterThan(0);
  await nsfwSwitch(page, "en").check();
  const gloss = dialog.locator(".sticker-figure__gloss");
  await expect(gloss).toBeAttached();
  await expect(gloss).toBeHidden();
});

test("measures normal and empty maximum-size preparation", async ({ page, browserName }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { prepareSealPreview } = await import("../src/sticker-creation/sealing/sealPreview.ts");
    const source = document.createElement("canvas");
    const target = document.createElement("canvas");
    source.width = 2000;
    source.height = 1400;
    const g = source.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("The measurement could not obtain a source context");
    const normalSamples: number[] = [];
    const emptySamples: number[] = [];
    try {
      for (let i = 0; i < 10; i++) {
        g.clearRect(0, 0, source.width, source.height);
        g.fillStyle = "#071f53";
        g.fillRect(900, 600, 200, 200);
        const start = performance.now();
        if (prepareSealPreview(target, source, 23) !== "ready")
          throw new Error("Normal ink was empty");
        normalSamples.push(performance.now() - start);
        g.clearRect(0, 0, source.width, source.height);
        const emptyStart = performance.now();
        if (prepareSealPreview(target, source, 23) !== "empty")
          throw new Error("Blank ink was ready");
        emptySamples.push(performance.now() - emptyStart);
      }
      return { normalSamples, emptySamples, userAgent: navigator.userAgent };
    } finally {
      source.width = source.height = 0;
      target.width = target.height = 0;
    }
  });
  const median = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b);
    return (sorted[4] + sorted[5]) / 2;
  };
  expect(result.normalSamples).toHaveLength(10);
  expect(result.emptySamples).toHaveLength(10);
  expect(
    [...result.normalSamples, ...result.emptySamples].every((ms) => Number.isFinite(ms) && ms >= 0),
  ).toBe(true);
  const measurements = {
    browserName,
    userAgent: result.userAgent,
    machine: { platform: process.platform, architecture: process.arch },
    sourcePixels: 2_800_000,
    normal: {
      samplesMs: result.normalSamples,
      medianMs: median(result.normalSamples),
      maxMs: Math.max(...result.normalSamples),
    },
    empty: {
      samplesMs: result.emptySamples,
      medianMs: median(result.emptySamples),
      maxMs: Math.max(...result.emptySamples),
    },
  };
  const bytes = Buffer.from(JSON.stringify(measurements, null, 2));
  await test
    .info()
    .attach("seal-preview-preparation.json", { body: bytes, contentType: "application/json" });
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/preparation-${browserName}.json`, bytes);
});

for (const language of ["en", "ja"] as const) {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1024, height: 1366 },
  ]) {
    for (const hand of ["right", "left"] as const) {
      test(`inspects ${language} ready, empty and failed previews at ${size.width} with ${hand} hand and reduced motion`, async ({
        page,
        browserName,
      }) => {
        await page.setViewportSize(size);
        await page.emulateMedia({ reducedMotion: "reduce" });
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await page.addInitScript(() => {
          const original: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
          if (typeof original !== "function") throw new Error("Canvas getContext is unavailable");
          Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
            configurable: true,
            writable: true,
            value: function (this: HTMLCanvasElement, ...args: unknown[]) {
              if (
                window.__failSealPreview &&
                !this.isConnected &&
                this.width * this.height >= 1_000_000
              )
                throw new Error("Explicit browser-test preview failure");
              return Reflect.apply(original, this, args) as unknown;
            },
          });
        });
        await signIn(page, `sv-${language}-${size.width}-${hand[0]}`, "en");
        await openSettings(page, "en");
        if (language === "ja") await chooseLanguage(page, "en", "ja");
        const settings = page.getByRole("region", {
          name: say(strings.stickerBoard.settings.title, language),
        });
        const handWords = strings.stickerBoard.settings.drawing.hand;
        const handChoice = settings
          .getByRole("radiogroup", { name: say(handWords.label, language) })
          .getByRole("radio", { name: say(handWords[hand], language) });
        await handChoice.click();
        await expect(handChoice).toBeChecked();
        await page
          .getByRole("button", { name: say(strings.stickerBoard.statBoard.flipBack, language) })
          .click();
        await page
          .getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) })
          .click();
        const sheet = canvas(page, language);
        await expect(async () => {
          const box = await sheet.boundingBox();
          if (!box) throw new Error("The drawing sheet is not visible");
          await penStroke(page, await pencil(page), along(box, 0.5, 0.45, 0.55, 12), () => 0.5, 8);
          await expect
            .poll(() => inkedPixels(page, ".ink-sheet"), { timeout: 2_000 })
            .toBeGreaterThan(0);
        }).toPass();
        const labels = strings.stickerCreation.sealSheet;
        const screenStates = ["ready", "empty", "failed"] as const;
        const focusFindings: string[] = [];
        for (const state of screenStates) {
          if (state === "empty") {
            await eraseTestLine(page, language);
            await expect.poll(() => inkedPixels(page, ".ink-sheet")).toBe(0);
          }
          if (state === "failed")
            await page.evaluate(() => {
              window.__failSealPreview = true;
            });
          const dialog = await openSealSheet(page, language);
          if (state === "ready") {
            await expect(
              dialog.locator(".seal-preview__sticker canvas.sticker-material"),
            ).toHaveAttribute("data-state", "ready");
            await expect(
              dialog.locator(".seal-preview__sticker canvas.sticker-material"),
            ).toBeVisible();
            await expect(
              dialog.getByRole("switch", { name: say(labels.nsfwLabel, language) }),
            ).toBeFocused();
          } else {
            await expect(
              dialog.getByRole("heading", {
                name: say(state === "empty" ? labels.emptyTitle : labels.failedTitle, language),
              }),
            ).toBeVisible();
            await expect(
              dialog.getByText(
                say(state === "empty" ? labels.empty : labels.previewFailed, language),
                { exact: true },
              ),
            ).toBeVisible();
            await expect(dialog.locator(".seal-preview__sticker")).toBeHidden();
            await expect(dialog.getByRole("switch")).toHaveCount(0);
            await expect(
              dialog.getByRole("button", { name: say(labels.seal, language), exact: true }),
            ).toBeDisabled();
            await expect(
              dialog.getByRole("button", {
                name: say(state === "empty" ? labels.backToDrawing : labels.retryPreview, language),
              }),
            ).toHaveClass(/\bkey\b/);
            const focused = await page.evaluate(() => document.activeElement?.outerHTML ?? "none");
            if (
              !focused.includes(
                state === "empty" ? "seal-sheet__back-to-drawing" : "seal-sheet__retry",
              )
            )
              focusFindings.push(`${state}: ${focused}`);
          }
          const bounds = await dialog.boundingBox();
          if (!bounds) throw new Error("The seal sheet has no visible bounds");
          expect(bounds.x).toBeGreaterThanOrEqual(-1);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
          const stopCount = await dialog.evaluate((root) => {
            const stops = [
              ...root.querySelectorAll<HTMLElement>(
                "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]",
              ),
            ].filter(
              (element) =>
                element.tabIndex >= 0 &&
                !element.closest("[inert]") &&
                element.checkVisibility({ visibilityProperty: true }),
            );
            stops.forEach((element, index) => {
              element.dataset.sealTestTabIndex = String(index);
            });
            return stops.length;
          });
          expect(stopCount).toBeGreaterThan(1);
          const firstStop = dialog.locator('[data-seal-test-tab-index="0"]');
          const lastStop = dialog.locator(`[data-seal-test-tab-index="${stopCount - 1}"]`);
          await lastStop.focus();
          await page.keyboard.press("Tab");
          await expect(firstStop).toBeFocused();
          await firstStop.focus();
          await page.keyboard.press("Shift+Tab");
          await expect(lastStop).toBeFocused();
          if (state === "failed") {
            const failureLogs = () =>
              consoleErrors.filter((message) =>
                message.includes("The seal sheet's preview couldn't be drawn"),
              );
            await expect.poll(() => failureLogs().length).toBeGreaterThan(0);
            expect(
              failureLogs().every((message) =>
                message.includes("Explicit browser-test preview failure"),
              ),
            ).toBe(true);
          }
          const path = `${evidence}/visual-${browserName}-${language}-${size.width}x${size.height}-${hand}-${state}.png`;
          await mkdir(evidence, { recursive: true });
          await page.screenshot({ path, animations: "disabled" });
          if (state === "failed") {
            await page.evaluate(() => {
              window.__failSealPreview = false;
            });
            await dialog.getByRole("button", { name: say(labels.retryPreview, language) }).click();
            await expect(
              dialog.getByText(say(labels.empty, language), { exact: true }),
            ).toBeVisible();
          }
          await dialog
            .getByRole("button", {
              name: say(state === "ready" ? labels.notYet : labels.backToDrawing, language),
            })
            .click();
        }
        const focusPath = `${evidence}/visual-focus-${browserName}-${language}-${size.width}x${size.height}-${hand}.json`;
        await writeFile(
          focusPath,
          JSON.stringify({ focusFindings, consoleErrors, pageErrors }, null, 2),
        );
        expect(focusFindings).toEqual([]);
        expect(consoleErrors.length).toBeGreaterThan(0);
        expect(pageErrors).toEqual([]);
      });
    }
  }
}
