import { expect, test } from "@playwright/test";
import { emptyLaminatePage } from "./stickerMaterialFixture";

const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const encode = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
/** Paper's highlight shoulder: identity below its knee, then a roll toward the display's peak. */
const shoulder = (c: number[], knee = 0.88) => {
  const peak = Math.max(...c);
  if (peak <= knee) return c;
  const rolled = knee + (1 - knee) * (1 - Math.exp(-(peak - knee) / (1 - knee)));
  return c.map((v) => (v * rolled) / peak);
};
/** Air to film at the near-normal view of an eye far in front of the screen. */
const FRESNEL = 0.04;

test("the displayed full-cut coat is the print's transmitted light plus the reflection black ink shows", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.goto("/e2e/stickerLaminate.html");
  const prints = { black: [0, 0, 0], white: [255, 255, 255], gray: [136, 136, 136] } as const;
  const colored = [208, 55, 113] as const;
  for (const [side, height, turn] of [
    [120, 120, 0],
    [240, 240, 90],
    [480, 320, -27],
  ]) {
    // Each print in turn on one sticker, so every sample sees the same room from the same place.
    const samples = await page.evaluate(
      async ({ side, height, turn, colors }) => {
        const { required, solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
        const api = await import("../src/stickers/stickerRenderer.ts");
        const host = document.createElement("div");
        host.className = "sticker-material-surface";
        host.style.cssText = `position:absolute;left:20px;top:20px;width:${side}px;height:${height}px;rotate:${turn}deg`;
        const c = document.createElement("canvas");
        c.className = "sticker-material";
        host.append(c);
        document.body.append(host);
        const cut = solidPng(side, height, "white");
        const solid = (rgb: readonly number[]) => solidPng(side, height, `rgb(${rgb.join(",")})`);
        const release = api.mountSticker(c, {
          print: solid(colors[0]),
          cut,
          finish: "gloss",
          turn,
        });
        try {
          const out: number[][][] = [];
          for (const [i, rgb] of colors.entries()) {
            if (i) api.updateSticker(c, { print: solid(rgb), cut, finish: "gloss" });
            await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
            await twoFrames();
            const context = required(c.getContext("2d"));
            out.push(
              [0.1, 0.5, 0.9].flatMap((v) =>
                [0.1, 0.5, 0.9].map((u) => [
                  ...context.getImageData(Math.floor(u * c.width), Math.floor(v * c.height), 1, 1)
                    .data,
                ]),
              ),
            );
          }
          return out;
        } finally {
          release();
          host.remove();
        }
      },
      { side, height, turn, colors: [...Object.values(prints), colored] },
    );
    const [black, ...others] = samples;
    const reflections = black.map((pixel) => pixel.slice(0, 3).map((v) => decode(v / 255)));
    // The room shows in black ink: the glare and the bounce differ across the sticker.
    expect(
      Math.max(...black.map((p) => p[0])) - Math.min(...black.map((p) => p[0])),
    ).toBeGreaterThan(5);
    for (const [k, rgb] of [prints.white, prints.gray, colored].entries())
      others[k].forEach((pixel, i) => {
        const expected = shoulder(
          rgb.map((v, c) => decode(v / 255) * 0.9 * (1 - FRESNEL) + reflections[i][c]),
        );
        expect(pixel[3]).toBe(255);
        for (let c = 0; c < 3; c++)
          expect(
            Math.abs(pixel[c] - encode(expected[c]) * 255),
            `${rgb.join(",")} at sample ${i}`,
          ).toBeLessThanOrEqual(2);
      });
  }
});

test("blank paper and gray ink share a persistent laminate after iPad tilt", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html");
  const coat = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pixels = () =>
    coat.evaluate(async (el) => {
      if (!(el instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is not a canvas");
      const context = el.getContext("2d");
      if (!context) throw new Error("The material snapshot context is missing");
      const data = context.getImageData(0, 0, el.width, el.height).data;
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].join(",");
    });
  // The first reading glides the light from the still pose; once it has landed, it holds.
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await expect
    .poll(() => page.evaluate(() => window.laminateFixture.getPose()))
    .toMatchObject({ beta: 40, gamma: 0 });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
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
      !message.text().includes("The shared sticker material GPU context was lost")
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
  const coat = page.locator('[data-sticker="0"] canvas.sticker-material');
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
          .locator("canvas.sticker-material")
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
