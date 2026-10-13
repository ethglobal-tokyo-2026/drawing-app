import { expect, test } from "@playwright/test";
import {
  coatField,
  compositePrint,
  MATERIAL_GLOSS,
  orientNormal,
  screenPoint,
} from "../../../docs/research/sticker-laminate/material-reference.ts";

test("the displayed full-cut coat agrees with the independent linear reference on white, gray, black, and colored print", async ({
  page,
}) => {
  for (const [side, height, turn] of [
    [120, 120, 0],
    [240, 240, 90],
    [480, 320, -27],
  ]) {
    await page.goto(`/e2e/stickerLaminate.html?side=${side}&height=${height}&turn=${turn}`);
    const coat = page.locator('[data-sticker="0"] canvas.sticker-laminate');
    await expect(coat).toHaveAttribute("data-state", "ready");
    const pose = await page.evaluate(() => window.laminateFixture.getPose());
    for (const [u, v, rgb] of [
      [0.1, 0.5, [255, 255, 255]],
      [0.5, 0.55, [136, 136, 136]],
      [0.2, 0.825, [0, 0, 0]],
      [0.52, 0.825, [208, 55, 113]],
    ] as const) {
      const actual = await coat.evaluate(
        (el, point) => {
          if (!(el instanceof HTMLCanvasElement))
            throw new Error("The material snapshot is not a canvas");
          const canvas = el;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("The material snapshot context is missing");
          const x = Math.floor(point[0] * canvas.width),
            y = Math.floor(point[1] * canvas.height);
          return {
            uv: [(x + 0.5) / canvas.width, (y + 0.5) / canvas.height],
            rgba: [...context.getImageData(x, y, 1, 1).data],
          };
        },
        [u, v],
      );
      const reference = compositePrint(
        [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255],
        coatField({
          point: screenPoint(actual.uv[0], actual.uv[1], side, height, turn + pose.rotationDegrees),
          normal: orientNormal([0, 0, 1], turn, pose),
          material: MATERIAL_GLOSS,
        }),
      );
      for (let channel = 0; channel < 3; channel++)
        expect(Math.abs(actual.rgba[channel] - reference[channel] * 255)).toBeLessThanOrEqual(2);
      expect(actual.rgba[3]).toBe(255);
    }
    const paper = page.locator("[data-white] canvas.sticker-laminate");
    await expect(paper).toHaveAttribute("data-state", "ready");
    const range = await paper.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) throw new Error("The paper snapshot is not a canvas");
      const c = el,
        g = c.getContext("2d");
      if (!g) throw new Error("The paper snapshot context is missing");
      const data = g.getImageData(
        c.width * 0.1,
        c.height * 0.1,
        c.width * 0.8,
        c.height * 0.8,
      ).data;
      let min = 255,
        max = 0;
      for (let q = 0; q < data.length; q += 4) {
        min = Math.min(min, data[q]);
        max = Math.max(max, data[q]);
      }
      return max - min;
    });
    expect(range).toBeGreaterThan(5);
  }
});

test("blank paper and gray ink share a persistent laminate after iPad tilt", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html");
  const coat = page.locator('[data-sticker="0"] canvas.sticker-laminate');
  await expect(coat).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  const pixels = () =>
    coat.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is not a canvas");
      const canvas = el;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The material snapshot context is missing");
      return [...context.getImageData(0, 0, canvas.width, canvas.height).data];
    });
  const still = await pixels();
  await page.waitForTimeout(1100);
  expect(await pixels()).toEqual(still);
  await page.evaluate(() =>
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta: 40, gamma: 28 })),
  );
  await expect.poll(pixels).not.toEqual(still);
  await page.waitForTimeout(1200);
  const held = await pixels();
  await page.waitForTimeout(1100);
  expect(await pixels()).toEqual(held);
  // No independent material animation exists before or after a real device reading.
  expect(await coat.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test("GPU loss shows the original print and restoration recovers the held coating", async ({
  page,
}) => {
  const lifecycleErrors: string[] = [];
  page.on("pageerror", (error) => lifecycleErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("The shared laminate GPU context was lost")
    )
      lifecycleErrors.push(message.text());
    if (message.type() === "warning" && message.text().includes("INVALID_OPERATION"))
      lifecycleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const read: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof read !== "function") throw new Error("The browser canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(read, this, [kind, ...args]);
        if (kind === "webgl" && context instanceof WebGLRenderingContext)
          Reflect.set(window, "laminateGpu", context);
        return context;
      },
    });
  });
  await page.goto("/e2e/stickerLaminate.html");
  const coat = page.locator('[data-sticker="0"] canvas.sticker-laminate');
  await expect(coat).toHaveAttribute("data-state", "ready");
  const still = await coat.evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    return canvas.toDataURL();
  });
  for (let recovery = 0; recovery < 2; recovery++) {
    await page.evaluate(() => {
      const context: unknown = Reflect.get(window, "laminateGpu");
      if (!(context instanceof WebGLRenderingContext))
        throw new Error("No real laminate GPU context was captured");
      const extension = context.getExtension("WEBGL_lose_context");
      if (!extension) throw new Error("The browser cannot exercise GPU loss");
      // getExtension returns null while lost; retain the enabled extension before losing the context.
      Reflect.set(window, "laminateLoss", extension);
      Reflect.set(window, "laminateRetiredGpu", context);
      extension.loseContext();
    });
    await expect(coat).toHaveAttribute("data-state", "failed");
    await expect(page.locator('[data-sticker="0"] .sticker-figure__img')).toBeVisible();
    await page.evaluate(() => {
      const extension: unknown = Reflect.get(window, "laminateLoss");
      if (
        !extension ||
        typeof extension !== "object" ||
        !("restoreContext" in extension) ||
        typeof extension.restoreContext !== "function"
      )
        throw new Error("The cached GPU restoration extension is missing");
      Reflect.apply(extension.restoreContext, extension, []);
    });
    await expect(coat).toHaveAttribute("data-state", "ready");
    await expect
      .poll(() =>
        page
          .locator("canvas.sticker-laminate")
          .evaluateAll((canvases) =>
            canvases.every((canvas) => canvas.getAttribute("data-state") === "ready"),
          ),
      )
      .toBe(true);
    expect(
      await coat.evaluate((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement))
          throw new Error("The material snapshot is not a canvas");
        return canvas.toDataURL();
      }),
    ).toBe(still);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const retired: unknown = Reflect.get(window, "laminateRetiredGpu");
          if (!(retired instanceof WebGLRenderingContext))
            throw new Error("The retired GPU context is missing");
          return retired.isContextLost();
        }),
      )
      .toBe(true);
    expect(lifecycleErrors).toEqual([]);
  }
});
