import { expect, type Locator } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { boardSticker, say, sealFromBoard, signIn, startsWith, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";

test.use(ipad);

/** The real material snapshot, including its printed ink and coating. */
const snapshot = (coat: Locator) =>
  coat.evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The material snapshot is missing");
    return canvas.toDataURL();
  });

/** Copies into this displayed material surface since its observations were cleared. */
const snapshotCopies = (coat: Locator) =>
  coat.evaluate((canvas) => {
    const copies: unknown = Reflect.get(window, "laminateSnapshotCopies");
    if (!(copies instanceof WeakMap)) throw new Error("The material copy observations are missing");
    const count: unknown = copies.get(canvas);
    return typeof count === "number" ? count : 0;
  });

test("an opaque sticker detail pauses the covered Sticker Board and uncovering it samples the held pose", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", { value: 0, configurable: true });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    if (typeof window.DeviceMotionEvent === "function")
      Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
        value: undefined,
        configurable: true,
      });
    const copies = new WeakMap<HTMLCanvasElement, number>();
    Reflect.set(window, "laminateSnapshotCopies", copies);
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (typeof drawImage !== "function")
      throw new Error("The native canvas copy method is missing");
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        Reflect.apply(drawImage, this, args);
        if (this.canvas.matches("canvas.sticker-material"))
          copies.set(this.canvas, (copies.get(this.canvas) ?? 0) + 1);
      },
    });
  });
  const language = "en";
  await signIn(page, "covered-laminate", language);
  const no = await sealFromBoard(page, language);
  const trayNo = await sealFromBoard(page, language);
  await boardSticker(page, language, trayNo).click();
  await page
    .getByRole("button", { name: say(strings.stickerBoard.toolbar.remove, language) })
    .click();
  await expect(boardSticker(page, language, trayNo)).toHaveCount(0);
  await boardSticker(page, language, no).click();
  const zipper = page.getByRole("button", {
    name: startsWith(say(strings.stickerBoard.tray.zipper, language)),
  });
  await expect(zipper).toHaveAttribute("aria-expanded", "false");
  await zipper.press("ArrowDown");
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  const trayCoats = page.locator(".tray__stack canvas.sticker-material[data-state=ready]");
  await expect.poll(() => trayCoats.count()).toBeGreaterThan(0);
  // A DOM locator retains access while the detail makes the covered board inert.
  const boardCoat = page.locator(".placed-sticker canvas.sticker-material");
  await expect(boardCoat).toHaveAttribute("data-state", "ready");
  await page.evaluate(() =>
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: 40, gamma: 0 })),
  );
  await page
    .getByRole("button", { name: say(strings.stickerBoard.toolbar.view, language), exact: true })
    .click();
  const detail = page.getByRole("dialog", { name: no });
  await expect(detail).toBeVisible();
  const detailCoat = detail.locator(".sticker-detail__slide canvas.sticker-material");
  await expect(detailCoat).toHaveAttribute("data-state", "ready");
  const covered = await snapshot(boardCoat);
  const detailBefore = await snapshot(detailCoat);
  await boardCoat.evaluate((canvas) => {
    const copies: unknown = Reflect.get(window, "laminateSnapshotCopies");
    if (!(copies instanceof WeakMap)) throw new Error("The material copy observations are missing");
    copies.delete(canvas);
    for (const trayCanvas of document.querySelectorAll(".tray__stack canvas.sticker-material"))
      copies.delete(trayCanvas);
  });
  await page.evaluate(() =>
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: 40, gamma: 28 })),
  );
  await expect.poll(() => snapshot(detailCoat)).not.toBe(detailBefore);
  const held = await page.evaluate(async () => {
    const { currentLight, subscribeLight } = await import("../src/stickers/light.ts");
    return new Promise<ReturnType<typeof currentLight>>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        window.clearTimeout(quiet);
        reject(new Error("The material light did not settle within 5 seconds"));
      }, 5000);
      const finish = () => {
        unsubscribe();
        window.clearTimeout(timeout);
        resolve(currentLight());
      };
      let quiet = window.setTimeout(finish, 250);
      const unsubscribe = subscribeLight(() => {
        window.clearTimeout(quiet);
        quiet = window.setTimeout(finish, 250);
      });
    });
  });
  expect(
    await snapshotCopies(boardCoat),
    "The opaque detail covers every board material surface",
  ).toBe(0);
  const trayCopies = () =>
    trayCoats.evaluateAll((canvases) => {
      const copies: unknown = Reflect.get(window, "laminateSnapshotCopies");
      if (!(copies instanceof WeakMap))
        throw new Error("The material copy observations are missing");
      return canvases.reduce((total, canvas) => {
        const count: unknown = copies.get(canvas);
        return total + (typeof count === "number" ? count : 0);
      }, 0);
    });
  expect(
    await trayCopies(),
    "The opaque detail also covers the open tray's material surfaces",
  ).toBe(0);
  expect(await snapshot(boardCoat)).toBe(covered);
  await detail
    .getByRole("button", { name: say(strings.ui.backToBoard, language), exact: true })
    .click();
  await expect(detail).toHaveCount(0);
  await expect.poll(() => snapshotCopies(boardCoat)).toBeGreaterThan(0);
  await expect.poll(() => snapshot(boardCoat)).not.toBe(covered);
  // The tray its Zipper opened stays open through the detail, and draws again without another sensor
  // reading.
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  await expect.poll(trayCopies).toBeGreaterThan(0);
  expect(
    await page.evaluate(async () => (await import("../src/stickers/light.ts")).currentLight()),
  ).toEqual(held);
});
