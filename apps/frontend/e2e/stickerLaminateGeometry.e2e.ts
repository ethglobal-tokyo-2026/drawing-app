import { expect, test } from "@playwright/test";
import {
  coatField,
  compositePrint,
  MATERIAL_GLOSS,
  MATERIAL_MATTE,
  normalFromHeight,
  orientNormal,
  screenPoint,
} from "../../../docs/research/sticker-laminate/material-reference.ts";

test("a turn-only React update redraws the held reflection in the sticker's new axes", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const before = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    return el.toDataURL();
  });
  await page.evaluate(() => window.laminateFixture.update({ turn: 90 }));
  await expect(coat).toHaveAttribute("data-state", "ready");
  const sample = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The material snapshot context is missing");
    return {
      image: el.toDataURL(),
      points: [0.1, 0.5, 0.9].map((u) => {
        const x = Math.floor(u * el.width),
          y = Math.floor(0.58 * el.height);
        return {
          uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
          rgba: [...context.getImageData(x, y, 1, 1).data],
        };
      }),
    };
  });
  expect(sample.image).not.toBe(before);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
  for (const point of sample.points) {
    // These sample positions fall on white paper or the gray ash region in the diagnostic print.
    const print =
      point.uv[0] > 0.14 && point.uv[0] < 0.86
        ? ([136 / 255, 136 / 255, 136 / 255] as const)
        : ([1, 1, 1] as const);
    const expected = compositePrint(
      print,
      coatField({
        point: screenPoint(point.uv[0], point.uv[1], 240, 240, 90),
        normal: orientNormal([0, 0, 1], 90, pose),
        material: MATERIAL_GLOSS,
      }),
    );
    for (let c = 0; c < 3; c++)
      expect(Math.abs(point.rgba[c] - expected[c] * 255)).toBeLessThanOrEqual(2);
  }
});

test("a tilted flight reflects in the same axes as its turned sticker", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?turn=90");
  const coat = page.locator('[data-sticker="0"] canvas.sticker-laminate');
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  await page.evaluate(() => window.laminateFixture.flight(30, 12));
  const points = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The flight snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The flight snapshot context is missing");
    return [
      [0.1, 0.5],
      [0.5, 0.55],
      [0.2, 0.825],
    ].map(([u, v]) => {
      const x = Math.floor(u * el.width),
        y = Math.floor(v * el.height);
      return {
        uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
        rgba: [...context.getImageData(x, y, 1, 1).data],
      };
    });
  });
  const print = [
    [1, 1, 1],
    [136 / 255, 136 / 255, 136 / 255],
    [0, 0, 0],
  ] as const;
  for (let i = 0; i < points.length; i++) {
    const reference = compositePrint(
      print[i],
      coatField({
        point: screenPoint(points[i].uv[0], points[i].uv[1], 240, 240, 90),
        normal: orientNormal([0, 0, 1], 90, pose, { x: 30, y: 12 }),
        material: MATERIAL_GLOSS,
      }),
    );
    for (let c = 0; c < 3; c++)
      expect(Math.abs(points[i].rgba[c] - reference[c] * 255)).toBeLessThanOrEqual(2);
  }
});

test("the draped ramp changes reflection by slope while raised plateaus stay flat", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?ramp=1");
  const ramp = page.locator("[data-ramp] canvas.sticker-laminate");
  await expect(ramp).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-white] canvas.sticker-laminate")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await page.evaluate(() => window.laminateFixture.tilt(35, 10));
  await page.waitForTimeout(1000);
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const sample = await ramp.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The ramp snapshot is not a canvas");
    const context = el.getContext("2d");
    const flat = document.querySelector("[data-white] canvas");
    if (!context || !(flat instanceof HTMLCanvasElement))
      throw new Error("The ramp comparison is missing");
    const paper = flat.getContext("2d");
    if (!paper) throw new Error("The flat comparison context is missing");
    const points = [40, 110, 114, 118, 122, 126, 200].map((x) => {
      const u = (x + 0.5) / 240,
        v = 100.5 / 240;
      const px = Math.floor(u * el.width),
        py = Math.floor(v * el.height);
      return {
        x,
        uv: [(px + 0.5) / el.width, (py + 0.5) / el.height],
        color: context.getImageData(px, py, 1, 1).data[0],
        flat: paper.getImageData(px, py, 1, 1).data[0],
      };
    });
    return { points, height: window.laminateFixture.rampHeight };
  });
  for (const point of sample.points) {
    const reference = compositePrint(
      [1, 1, 1],
      coatField({
        point: screenPoint(point.uv[0], point.uv[1], 240, 240),
        normal: orientNormal(
          normalFromHeight(new Float32Array(sample.height), 240, 240, point.x, 100),
          0,
          pose,
        ),
        material: MATERIAL_GLOSS,
      }),
    );
    expect(Math.abs(point.color - reference[0] * 255)).toBeLessThanOrEqual(3);
  }
  expect(sample.points[0].color).toBe(sample.points[0].flat);
  expect(sample.points[sample.points.length - 1].color).toBe(
    sample.points[sample.points.length - 1].flat,
  );
  expect(
    sample.points.some((p) => Math.abs(p.color - p.flat) > 2),
    JSON.stringify(sample.points),
  ).toBe(true);
});

test("Shop matte uses the same held light and broadens the white-paper reflection", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html");
  const matte = page.locator("[data-matte] canvas.sticker-laminate");
  await expect(matte).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const points = await matte.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The matte snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The matte snapshot context is missing");
    return [0.2, 0.5, 0.8].map((u) => {
      const x = Math.floor(u * el.width),
        y = Math.floor(0.1 * el.height);
      return {
        uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
        rgba: [...context.getImageData(x, y, 1, 1).data],
      };
    });
  });
  let differs = false;
  for (const point of points) {
    const input = {
      point: screenPoint(point.uv[0], point.uv[1], 240, 240, -4),
      normal: orientNormal([0, 0, 1], -4, pose),
    };
    const expected = compositePrint([1, 1, 1], coatField({ ...input, material: MATERIAL_MATTE }));
    const gloss = compositePrint([1, 1, 1], coatField({ ...input, material: MATERIAL_GLOSS }));
    expect(Math.abs(point.rgba[0] - expected[0] * 255)).toBeLessThanOrEqual(2);
    if (Math.abs(expected[0] - gloss[0]) * 255 > 1) differs = true;
  }
  expect(differs).toBe(true);
  const image = () =>
    matte.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) throw new Error("The matte snapshot is not a canvas");
      return el.toDataURL();
    });
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await page.evaluate(() => window.laminateFixture.tilt(40, 28));
  await page.waitForTimeout(1200);
  const held = await image();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.laminateFixture.tilt(10, -28));
  await page.waitForTimeout(1100);
  expect(await image()).toBe(held);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1100);
  expect(await image()).toBe(held);
  await page.evaluate(() => window.laminateFixture.tilt(10, -28));
  await expect.poll(image).not.toBe(held);
});
