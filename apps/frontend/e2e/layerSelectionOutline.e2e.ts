import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { button, chip, color, createLayer, openSheet, sheetBox, undo } from "./fillHelpers.ts";
import { ipad } from "./ipad.ts";
import { at, pencil, penStroke } from "./pen.ts";

test.use({ ...ipad, reducedMotion: "reduce" });

test("selecting an inked layer shows a sharp contour around real pen marks", async ({
  page,
}, testInfo) => {
  await openSheet(page, "layer-selection-outline");
  await color(page, "blue");
  const box = await sheetBox(page);
  const center = at(box, 0.5, 0.45);
  const pen = await pencil(page);
  const curve = Array.from({ length: 49 }, (_, i) => {
    const angle = Math.PI * (0.2 + (1.65 * i) / 48);
    return { x: center.x + 52 * Math.cos(angle), y: center.y + 48 * Math.sin(angle) };
  });
  const diagonal = Array.from({ length: 25 }, (_, i) => ({
    x: center.x - 30 + (75 * i) / 24,
    y: center.y + 85 + (50 * i) / 24,
  }));
  // A reported pressure keeps native event delivery speed out of the stroke's width.
  await penStroke(page, pen, curve, () => 0.35, 8);
  await penStroke(page, pen, diagonal, () => 0.35, 8);
  await expect(undo(page)).toBeEnabled();
  await pen.hover({ x: 1, y: 1 });
  await page.mouse.move(1, 1);
  await expect(page.locator(".nib-ring")).toBeHidden();
  const clip = {
    x: Math.floor(center.x - 80),
    y: Math.floor(center.y - 80),
    width: 180,
    height: 240,
  };
  const original = await page.locator(".ink-current canvas").first().elementHandle();
  if (!original) throw new Error("The original layer has no canvas");
  const originalPixels = () =>
    original.evaluate(async (element) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("The artwork is not a canvas");
      const g = element.getContext("2d");
      if (!g) throw new Error("The artwork has no context");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        g.getImageData(0, 0, element.width, element.height).data,
      );
      return {
        width: element.width,
        height: element.height,
        selected:
          element.isConnected &&
          document.querySelector(".ink-current canvas") === element &&
          getComputedStyle(element).visibility === "visible",
        digest: [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join(""),
      };
    });
  // Read the same original canvas area so privacy-protected readbacks remain comparable.
  const before = await originalPixels();
  expect(before.selected).toBe(true);
  await createLayer(page);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  const hint = button(page, strings.stickerCreation.layers.dismissOptionsHint);
  if (await hint.isVisible()) await hint.click();
  await pen.hover({ x: 1, y: 1 });
  await page.mouse.move(1, 1);
  await expect(page.locator(".nib-ring")).toBeHidden();

  // Freeze only after the real sheet and its controls settle; reduced motion keeps the cue still.
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 100));
  await chip(page, 1).click();
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".layer-flash__outline")).toBeVisible();

  // This region includes the curved and diagonal contours without labels or clock text.
  await expect(page).toHaveScreenshot("selected-layer-contour.png", {
    clip,
    scale: "device",
    animations: "allow",
    threshold: 0,
    maxDiffPixels: 0,
  });
  await page.screenshot({
    path: testInfo.outputPath("selected-layer-contour.png"),
    clip,
    scale: "device",
  });
  const screen = testInfo.outputPath("selected-layer-on-drawing-screen.png");
  await page.screenshot({ path: screen, scale: "device" });
  await testInfo.attach("selected-layer-on-drawing-screen", {
    path: screen,
    contentType: "image/png",
  });
  const density = await page.locator(".layer-flash__outline").evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement))
      throw new Error("The layer contour is not a canvas");
    const artwork = document.querySelector<HTMLCanvasElement>(".ink-current canvas");
    const sheet = document.querySelector(".ink-sheet");
    if (!artwork || !sheet) throw new Error("The selected artwork has no visible sheet");
    const contourBox = element.getBoundingClientRect();
    const sheetBox = sheet.getBoundingClientRect();
    return {
      contourX: element.width / contourBox.width,
      contourY: element.height / contourBox.height,
      artworkX: artwork.width / sheetBox.width,
      artworkY: artwork.height / sheetBox.height,
    };
  });
  const nativeDensity = Math.min(ipad.deviceScaleFactor, density.artworkX, density.artworkY);
  expect(density.contourX).toBeCloseTo(nativeDensity, 2);
  expect(density.contourY).toBeCloseTo(nativeDensity, 2);

  await page.clock.runFor(1000);
  await expect(page.locator("[class*='layer-flash__']")).toHaveCount(0);
  await expect(chip(page, 1)).toHaveAttribute("aria-selected", "true");
  expect(await originalPixels(), "Layer selection must leave the artwork unchanged").toEqual(
    before,
  );
});
