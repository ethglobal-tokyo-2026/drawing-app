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
const laminatePixels = (page: Page, box = { left: 0.35, top: 0.3, width: 0.3, height: 0.4 }) =>
  page.locator("[data-reload] canvas.sticker-material").evaluate((canvas, box) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The laminate snapshot context is missing");
    return [
      ...context.getImageData(
        canvas.width * box.left,
        canvas.height * box.top,
        canvas.width * box.width,
        canvas.height * box.height,
      ).data,
    ];
  }, box);

test("touching and nearby separate supports produce flat crease images and tilted laminate", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  for (const gap of [0, 2, 4, 8, 12, 16, 24, 32]) {
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
  for (const gap of [null, 48, 64]) {
    const baked = await bakeSupports(page, gap);
    await page.evaluate((url) => URL.revokeObjectURL(url), baked.normalUrl);
    expect(baked.paintedPeak, `Support ${gap}: real edge was suppressed`).toBeGreaterThan(0);
    expect(baked.normalDeviation, `Support ${gap}: real slope was flattened`).toBeGreaterThan(0);
  }
});

test.describe("finite supports on an iPad-sized board", () => {
  test.use({ viewport: { width: 1200, height: 1480 }, deviceScaleFactor: 2 });

  for (const arrangement of [
    "kyoto-seika",
    "pink",
    "adjacent-left-first",
    "adjacent-right-first",
    "gap12-turn17",
    "gap16-turn45",
    "gap32-turn45",
    "gap48-turn45",
  ] as const) {
    const adjacent = arrangement.startsWith("adjacent");
    const separated = arrangement.startsWith("gap");
    const wide = arrangement === "gap48-turn45";
    const description = separated
      ? `${wide ? "wide" : "nearby"} rotated finite supports ${wide ? "retain separate edges" : "bridge their gap"}, ${arrangement}`
      : adjacent
        ? `lightly overlapping finite supports keep their seam flat, ${arrangement}`
        : `a rotated finite ${arrangement} support hides its buried edge and keeps its exposed edge`;
    test(description, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      // Load the board's dependencies before the fixture mounts React; discovering them afterward
      // can replace Vite's optimized React dependency while a mounted fixture still holds the old one.
      await page.route("**/e2e/stickerLaminate.html?*", async (route) => {
        const response = await route.fetch();
        const body = await response.text();
        const script = /<script type="module" src="[^"]*stickerLaminate\.tsx[^"]*"><\/script>/;
        if (!script.test(body)) throw new Error("The laminate fixture's module script is missing");
        await route.fulfill({
          response,
          body: body.replace(
            script,
            '<script type="module">await import("/src/sticker-board/useCreases.ts"); await import("/e2e/stickerLaminate.tsx");</script>',
          ),
        });
      });
      await page.goto("/e2e/stickerLaminate.html?reload=1&side=390");
      const coat = page.locator("[data-reload] canvas.sticker-material");
      await expect(coat).toHaveAttribute("data-state", "ready");
      const result = await page.evaluate(async (arrangement) => {
        const { creaseJobs } = await import("../src/sticker-board/useCreases.ts");
        const { fieldOf, unitOf } = await import("../src/sticker-board/placement.ts");
        const { boardFoil } = await import("../src/stickers/madeFoil.ts");
        const source = 512;
        const adjacent = arrangement.startsWith("adjacent");
        const reverse = arrangement === "adjacent-right-first";
        const gap =
          arrangement === "gap12-turn17"
            ? 12
            : arrangement === "gap16-turn45"
              ? 16
              : arrangement === "gap32-turn45"
                ? 32
                : arrangement === "gap48-turn45"
                  ? 48
                  : null;
        const pair = adjacent || gap !== null;
        const turn =
          arrangement === "gap16-turn45" ||
          arrangement === "gap32-turn45" ||
          arrangement === "gap48-turn45"
            ? 45
            : 17;
        const mask = (kind: "step" | "cover" | "foil" | "full" | "left" | "right") => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = source;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("The finite support mask context is missing");
          context.fillStyle = "white";
          if (kind === "left" || kind === "right") {
            // Their common finite rectangle is 384px wide. Each support occupies 55% of it,
            // so the 10% shared strip covers about 18% of either support, in either stack order.
            const span = source - 128;
            if (gap === null) {
              context.fillRect(64 + (kind === "right" ? span * 0.45 : 0), 64, span * 0.55, span);
            } else {
              // Both support frames are 312 CSS px wide; convert the perpendicular gap into
              // their 512px source masks before the real worker downsamples and turns them.
              const space = (gap * source) / 312;
              const left = kind === "right" ? source / 2 + space / 2 : 64;
              const width = span / 2 - space / 2;
              context.beginPath();
              context.roundRect(left, 64, width, span, 24);
              context.fill();
            }
          } else if (kind === "cover" || kind === "foil") {
            const inset = kind === "cover" ? 64 : 44;
            context.beginPath();
            context.roundRect(inset, inset, source - 2 * inset, source - 2 * inset, 24);
            context.fill();
          } else context.fillRect(0, 0, kind === "step" ? source / 2 : source, source);
          return canvas.toDataURL();
        };
        const full = mask("full");
        const stickers = ["lower", "support", "top"].map((id) => ({
          id,
          width: source,
          height: source,
          urls: {
            png: full,
            mask:
              id === "top"
                ? full
                : pair
                  ? mask(id === "lower" ? (reverse ? "right" : "left") : reverse ? "left" : "right")
                  : id === "lower"
                    ? mask("step")
                    : mask("cover"),
            foil: mask("foil"),
          },
          placement: {
            on: true,
            x: 0.5,
            y: 0.5,
            s: id === "top" ? 1 : pair ? 0.8 : id === "support" ? 0.65 : 1,
            r: id === "support" || (pair && id === "lower") ? turn : -11,
            z: id === "lower" ? 0 : id === "support" ? 1 : 2,
          },
          nsfw: id === "support" && arrangement === "pink",
          kyotoSeika: id === "support" && arrangement === "kyoto-seika",
          byOther: false,
        }));
        const jobs = creaseJobs(
          stickers,
          fieldOf(1200, 1369),
          unitOf("large", 1200),
          boardFoil,
          Math.min(1, devicePixelRatio),
        );
        const job = jobs.find((job) => job.id === "top");
        if (!job || job.under.length !== 2)
          throw new Error("The real board did not select both underlying supports");
        const worker = new Worker("/src/stickers/creaseWorker.ts?worker_file&type=module", {
          type: "module",
        });
        const reply = await new Promise<CreaseReply>((resolve, reject) => {
          const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error("The finite support worker did not answer within 25 seconds"));
          }, 25_000);
          worker.onerror = (event) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(new Error(`The finite support worker failed: ${event.message}`));
          };
          worker.onmessageerror = () => {
            clearTimeout(timeout);
            worker.terminate();
            reject(new Error("The finite support worker's answer could not be read"));
          };
          worker.onmessage = (event: MessageEvent<CreaseReply>) => {
            clearTimeout(timeout);
            worker.terminate();
            resolve(event.data);
          };
          worker.postMessage({ board: "finite-supports", batch: 1, start: true, jobs: [job] });
        });
        if (!reply.ok) throw new Error(`The finite support bake failed: ${reply.error}`);
        if (!reply.crease) throw new Error("The finite support lost its material geometry");
        let insidePaint = 0,
          insideNormal = 0,
          edgePaint = 0,
          edgeNormal = 0;
        const support = job.under[1];
        const [a, b, c, d, e, f] = support.at;
        for (const [name, blob] of Object.entries(reply.crease)) {
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = job.width;
          canvas.height = job.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("The finite crease image context is missing");
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const pixels = context.getImageData(0, 0, job.width, job.height).data;
          const amount = (x: number, y: number) => {
            const q = (Math.floor(y) * job.width + Math.floor(x)) * 4;
            return name === "normal"
              ? Math.max(
                  Math.abs(pixels[q] - 128),
                  Math.abs(pixels[q + 1] - 128),
                  Math.abs(pixels[q + 2] - 255),
                )
              : pixels[q + 3];
          };
          for (let y = Math.floor(job.height * 0.44); y < job.height * 0.56; y++)
            for (let x = Math.floor(job.width * 0.44); x < job.width * 0.56; x++) {
              if (name === "normal") insideNormal = Math.max(insideNormal, amount(x, y));
              else insidePaint = Math.max(insidePaint, amount(x, y));
            }
          for (let x = support.w * 0.8; x < support.w; x++) {
            const y = support.h / 2;
            const value = amount(a * x + c * y + e, b * x + d * y + f);
            if (name === "normal") edgeNormal = Math.max(edgeNormal, value);
            else edgePaint = Math.max(edgePaint, value);
          }
        }
        return {
          insidePaint,
          insideNormal,
          edgePaint,
          edgeNormal,
          normalUrl: URL.createObjectURL(reply.crease.normal),
        };
      }, arrangement);
      await page.evaluate(() => window.laminateFixture.tilt(40, 0));
      for (const pose of [
        [47, -12],
        [45, -14],
      ]) {
        await page.evaluate((pose) => {
          window.laminateFixture.update({ normal: undefined, turn: -11 });
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
        const center = { left: 0.44, top: 0.44, width: 0.12, height: 0.12 };
        const flat = await laminatePixels(page, center);
        expect(
          flat.some((value, q) => q % 4 === 3 && value > 0),
          "The laminate comparison must contain visible paper",
        ).toBe(true);
        await page.evaluate(async (normal) => {
          window.laminateFixture.update({ normal });
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
        }, result.normalUrl);
        await expect(coat).toHaveAttribute("data-state", "ready");
        await expect(coat).toBeVisible();
        const actual = await laminatePixels(page, center);
        expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(heldPose);
        let difference = 0;
        for (let q = 0; q < flat.length; q++)
          difference = Math.max(difference, Math.abs(actual[q] - flat[q]));
        if (!wide)
          expect(
            difference,
            `${arrangement}: a hidden or nearby edge changed the tilted laminate`,
          ).toBeLessThanOrEqual(1);
      }
      await page.evaluate((url) => URL.revokeObjectURL(url), result.normalUrl);
      if (wide) {
        expect(
          result.insidePaint,
          `${arrangement}: separate edges lost their painted creases`,
        ).toBeGreaterThan(0);
        expect(
          result.insideNormal,
          `${arrangement}: separate edges lost their slopes`,
        ).toBeGreaterThan(0);
      } else {
        expect(
          result.insidePaint,
          `${arrangement}: a hidden or nearby edge produced a painted crease`,
        ).toBe(0);
        expect(
          result.insideNormal,
          `${arrangement}: a hidden or nearby edge bent the laminate`,
        ).toBe(0);
      }
      expect(
        result.edgePaint,
        `${arrangement}: the exposed support edge was suppressed`,
      ).toBeGreaterThan(0);
      expect(
        result.edgeNormal,
        `${arrangement}: the exposed support edge lost its slope`,
      ).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });
  }
});
