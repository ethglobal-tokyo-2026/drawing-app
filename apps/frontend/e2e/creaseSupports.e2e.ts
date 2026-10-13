import { expect, test, type Page } from "@playwright/test";
import type { CreaseJob, CreaseReply } from "../src/stickers/creaseWorker";

/** A real worker bake over two separate support masks, or one exposed support edge. */
async function bakeSupports(page: Page, gap: number | null) {
  return page.evaluate(async (gap) => {
    const side = 240;
    if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function")
      throw new Error("This browser cannot run the crease worker with OffscreenCanvas");
    if (!new OffscreenCanvas(1, 1).getContext("2d"))
      throw new Error("This browser cannot paint the crease worker's masks");
    const mask = (left: number, width: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The support mask context is missing");
      context.fillStyle = "white";
      context.fillRect(left, 0, width, side);
      return canvas.toDataURL();
    };
    const own = { url: mask(0, side), grow: 0 };
    const silhouettes =
      gap === null
        ? [mask(0, side / 2)]
        : [mask(0, (side - gap) / 2), mask((side + gap) / 2, (side - gap) / 2)];
    const job: CreaseJob = {
      id: "cover",
      key: `support-gap:${gap}`,
      width: side,
      height: side,
      scale: 1,
      own,
      lights: {
        topLeft: [-0.6, -0.8],
        bottomRight: [0.6, 0.8],
        topRight: [0.8, -0.6],
        bottomLeft: [-0.8, 0.6],
      },
      under: silhouettes.map((url) => ({
        url,
        grow: 0,
        w: side,
        h: side,
        at: [1, 0, 0, 1, 0, 0],
      })),
    };
    const worker = new Worker("/src/stickers/creaseWorker.ts?worker_file&type=module", {
      type: "module",
    });
    const reply = await new Promise<CreaseReply>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("The support crease bake did not answer within 25 seconds"));
      }, 25_000);
      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(`The support crease worker failed: ${error.message}`));
      };
      worker.onmessageerror = () => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error("The support crease worker's answer could not be read"));
      };
      worker.onmessage = (event: MessageEvent<CreaseReply>) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(event.data);
      };
      worker.postMessage({ board: "supports", batch: 1, start: true, jobs: [job] });
    });
    if (!reply.ok) throw new Error(`The support crease bake failed: ${reply.error}`);
    if (!reply.crease) throw new Error("The raised supports lost their laminate geometry");
    let paintedPeak = 0;
    let normalDeviation = 0;
    for (const [name, blob] of Object.entries(reply.crease)) {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The baked crease image context is missing");
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pixels = context.getImageData(80, 60, 80, 120).data;
      for (let q = 0; q < pixels.length; q += 4) {
        if (name === "normal")
          normalDeviation = Math.max(
            normalDeviation,
            Math.abs(pixels[q] - 128),
            Math.abs(pixels[q + 1] - 128),
            Math.abs(pixels[q + 2] - 255),
          );
        else paintedPeak = Math.max(paintedPeak, pixels[q + 3]);
      }
    }
    return {
      paintedPeak,
      normalDeviation,
      normalUrl: URL.createObjectURL(reply.crease.normal),
    };
  }, gap);
}

/** The actual laminate canvas over the support seam, away from the sticker's cut. */
const laminatePixels = (page: Page) =>
  page.locator("[data-reload] canvas.sticker-laminate").evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The laminate snapshot context is missing");
    return [
      ...context.getImageData(
        canvas.width * 0.35,
        canvas.height * 0.3,
        canvas.width * 0.3,
        canvas.height * 0.4,
      ).data,
    ];
  });

test("touching and nearby separate supports produce flat crease images and tilted laminate", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  for (const gap of [0, 2, 4]) {
    const baked = await bakeSupports(page, gap);
    const differences: number[] = [];
    for (const pose of [
      [40, 0],
      [35, 12],
      [55, -18],
    ]) {
      await page.evaluate((pose) => {
        window.laminateFixture.update({ normal: undefined });
        window.laminateFixture.tilt(pose[0], pose[1]);
      }, pose);
      await expect
        .poll(async () => {
          const before = await page.evaluate(() => window.laminateFixture.getPose());
          await page.waitForTimeout(300);
          const after = await page.evaluate(() => window.laminateFixture.getPose());
          return before.x === after.x && before.y === after.y;
        })
        .toBe(true);
      await expect(coat).toHaveAttribute("data-state", "ready");
      const heldPose = await page.evaluate(() => window.laminateFixture.getPose());
      const flat = await laminatePixels(page);
      await page.evaluate(async (normal) => {
        window.laminateFixture.update({ normal });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }, baked.normalUrl);
      await expect(coat).toHaveAttribute("data-state", "ready");
      const actual = await laminatePixels(page);
      expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(heldPose);
      let difference = 0;
      for (let q = 0; q < flat.length; q++)
        difference = Math.max(difference, Math.abs(actual[q] - flat[q]));
      differences.push(difference);
    }
    await page.evaluate((url) => URL.revokeObjectURL(url), baked.normalUrl);
    expect(baked.paintedPeak, `Gap ${gap}: painted crease over neighboring supports`).toBe(0);
    expect(baked.normalDeviation, `Gap ${gap}: false slope in laminate normals`).toBe(0);
    expect(
      Math.max(...differences),
      `Gap ${gap}: tilted laminate differed from flat by ${differences.join(", ")}`,
    ).toBeLessThanOrEqual(1);
  }
});

test("an exposed edge and a wide support gap retain painted creases and laminate slopes", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  for (const gap of [null, 16]) {
    const baked = await bakeSupports(page, gap);
    await page.evaluate((url) => URL.revokeObjectURL(url), baked.normalUrl);
    expect(baked.paintedPeak, `Support ${gap}: real edge was suppressed`).toBeGreaterThan(0);
    expect(baked.normalDeviation, `Support ${gap}: real slope was flattened`).toBeGreaterThan(0);
  }
});
