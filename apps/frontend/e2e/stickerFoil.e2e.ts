import {
  referenceFrame,
  reflectionMetrics,
  type ReferenceFrame,
} from "../../../docs/research/sticker-foil/material-reference";
import { expect, test } from "@playwright/test";

test("foil follows the room as the device turns, returns to its held pose, and goes dark with its room", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/e2e/stickerFoil.html");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  const a = await page.locator("canvas").screenshot();
  await page.locator("#pose").selectOption("tilted");
  const b = await page.locator("canvas").screenshot();
  expect(b.equals(a)).toBe(false);
  await page.locator("#pose").selectOption("still");
  expect((await page.locator("canvas").screenshot()).equals(a)).toBe(true);
  await page.locator("#room").selectOption("dark");
  const dark = await page.evaluate(() =>
    window.foilFixture.render({ room: "dark" }).some((v, i) => i % 4 !== 3 && v > 0),
  );
  expect(dark).toBe(false);
  expect(errors).toEqual([]);
});

test("the window's source grid matches independently integrated diffraction", async ({
  page,
}, info) => {
  await page.goto("/e2e/stickerFoil.html");
  await expect(page.locator("#foil")).toHaveAttribute("data-ready", "true");
  const matrix: ReferenceFrame[] = [
    { x: 0, y: 0, turn: 0, grating: 0, geometry: "flat", broad: false },
    { x: -0.6, y: -0.6, turn: 0, grating: 0, geometry: "flat", broad: false },
    { x: 0.6, y: -0.6, turn: 0, grating: 0, geometry: "flat", broad: false },
    { x: -0.6, y: 0.6, turn: 0, grating: 0, geometry: "ramp", broad: false },
    { x: 0.6, y: 0, turn: 45, grating: 0, geometry: "plateau", broad: false },
    { x: 0.6, y: 0, turn: 0, grating: 90, geometry: "flat", broad: false },
    { x: 0.6, y: 0, turn: 0, grating: 0, geometry: "flat", broad: true },
  ];
  const results: { frame: ReferenceFrame; relativeEnergy: number; centroid: number }[] = [];
  for (const frame of matrix) {
    const reference = reflectionMetrics(referenceFrame(frame));
    {
      const samples = await page.evaluate(
        (options) => {
          const pixels = window.foilFixture.render(options);
          const samples: number[] = [];
          for (let y = 0; y < 16; y++)
            for (let x = 0; x < 16; x++) {
              const px = Math.floor(((x + 0.5) * 240) / 16),
                py = 239 - Math.floor(((y + 0.5) * 240) / 16);
              const at = (py * 240 + px) * 4;
              samples.push(pixels[at] * 256 + pixels[at + 1]);
            }
          return samples;
        },
        {
          ...frame,
          room: frame.broad ? ("broad" as const) : ("source" as const),
          diagnostic: true,
          grid: 3,
        },
      );
      const values = samples.map((encoded) => 2 ** ((encoded / 65535) * 34 - 30));
      const actual = reflectionMetrics(values);
      results.push({
        frame,
        relativeEnergy: Math.abs(actual.energy / reference.energy - 1),
        centroid: Math.hypot(actual.x - reference.x, actual.y - reference.y),
      });
    }
  }
  await info.attach("foil-calibration.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  for (const result of results) {
    expect(result.relativeEnergy, JSON.stringify(result.frame)).toBeLessThanOrEqual(0.05);
    expect(result.centroid, JSON.stringify(result.frame)).toBeLessThanOrEqual(1);
  }
});

test("the window adds light, back views and a dark room render nothing", async ({ page }) => {
  await page.goto("/e2e/stickerFoil.html");
  await expect(page.locator("#foil")).toHaveAttribute("data-ready", "true");
  const result = await page.evaluate(() => {
    const render = window.foilFixture.render;
    const sum = (p: number[]) => p.reduce((s, v, i) => s + (i % 4 === 3 ? 0 : v), 0);
    return {
      lit: sum(render({ style: "holo" })),
      removed: sum(render({ style: "holo", room: "removed" })),
      back: sum(render({ x: Math.PI / 0.38, room: "source" })),
      dark: (["holo", "pink", "kyoto-seika"] as const).map((style) =>
        sum(render({ style, room: "dark" })),
      ),
    };
  });
  expect(result.lit).toBeGreaterThan(result.removed);
  expect(result.back).toBe(0);
  expect(result.dark).toEqual([0, 0, 0]);
});

test("displayed combined-source holo retains color without green hues across the device's poses", async ({
  page,
}) => {
  await page.goto("/e2e/stickerFoil.html");
  await expect(page.locator("#foil")).toHaveAttribute("data-ready", "true");
  const outputs = await page.evaluate(() => {
    // Upright to tilted past upright, and turned either way at the usual reading angle.
    const poses = [
      ...[0, 30, 55, 75, 90, 110].map((beta) => ({ beta, gamma: 0 })),
      { beta: 55, gamma: -25 },
      { beta: 55, gamma: 25 },
    ];
    return (["holo", "pink"] as const).flatMap((style) =>
      poses.map((pose) => {
        const p = window.foilFixture.render({ style, ...pose });
        let green = 0,
          color = 0;
        for (let i = 0; i < p.length; i += 4) {
          if (p[i + 1] > p[i] + 2 && p[i + 1] > p[i + 2] + 2) green++;
          color = Math.max(
            color,
            (Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2])) / 255,
          );
        }
        return { style, ...pose, green, color };
      }),
    );
  });
  expect(
    outputs.every((o) => o.green === 0),
    JSON.stringify(outputs),
  ).toBe(true);
  expect(
    Math.max(...outputs.filter((o) => o.style === "holo").map((o) => o.color)),
  ).toBeGreaterThan(0.08);
});
