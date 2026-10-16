import { expect, test, type Page } from "@playwright/test";
import { expectLanded, holdPortrait } from "./screenTilt.ts";

test.beforeEach(({ page }) => holdPortrait(page));

const coatOf = (page: Page) => page.locator("[data-reload] canvas.sticker-material");

/** One horizontal support band under the sticker: its crease's normal and height, from the real bake. */
const bandCrease = (page: Page) =>
  page.evaluate(async () => {
    const { creasePixels } = await import("../src/stickers/crease.ts");
    const side = 240;
    const surface = new Float32Array(side * side);
    for (let y = 96; y < 144; y++) surface.fill(1, y * side, (y + 1) * side);
    const pixels = creasePixels({
      width: side,
      height: side,
      surface,
      own: new Float32Array(side * side).fill(1),
      scale: 1,
    });
    if (!pixels) throw new Error("The support band raised no crease");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The band crease's context is missing");
    const image = (data: Uint8ClampedArray<ArrayBuffer>) => {
      context.putImageData(new ImageData(data, side, side), 0, 0);
      return canvas.toDataURL();
    };
    return {
      normal: image(pixels.normal),
      height: image(pixels.height),
      maxSlope: pixels.maxSlope,
    };
  });

/**
 * Rows of the 240 px sticker: the band's top edge drapes down from it toward the screen's top, and its
 * bottom edge toward the bottom; flat paper lies beside each.
 */
const ROWS = {
  aboveTop: [62, 78],
  top: [80, 98],
  bottom: [142, 160],
  belowBottom: [162, 178],
} as const;

/**
 * Rows with the light square across the band from the sticker's top: flat paper far from the band; the
 * paper just past the bottom drape's foot, which the drape faces away from the light; and the paper
 * above the top drape, which faces the light, so nothing stands between it and the light.
 */
const SHADOW_ROWS = {
  flat: [20, 40],
  pastFoot: [156, 164],
  facing: [70, 82],
} as const;

type Bands = Record<string, readonly [number, number]>;
type Rows = Record<string, number>;

/** Mean linear luminance of each set of rows across the sticker's middle, from the laminate snapshot. */
const rowLuma = (page: Page, bands: Bands) =>
  coatOf(page).evaluate((canvas, rows) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The laminate snapshot context is missing");
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    const linear = (level: number) => {
      const v = level / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const mean = ([from, to]: readonly number[]) => {
      let sum = 0;
      let count = 0;
      for (let y = Math.round((from / 240) * height); y < Math.round((to / 240) * height); y++)
        for (let x = Math.round(width * 0.2); x < Math.round(width * 0.8); x++) {
          const q = (y * width + x) * 4;
          sum +=
            0.2126 * linear(data[q]) + 0.7152 * linear(data[q + 1]) + 0.0722 * linear(data[q + 2]);
          count++;
        }
      return sum / count;
    };
    return Object.fromEntries(Object.entries(rows).map(([name, band]) => [name, mean(band)]));
  }, bands);

/**
 * The coat's rows once it holds still at the pose it has landed on, repainted off `unlike`'s print,
 * which the first band, flat paper, tells.
 */
async function settledRows(page: Page, bands: Bands, unlike?: Rows) {
  let previous = "";
  let settled: Rows | undefined;
  const reference = Object.keys(bands)[0];
  await expect
    .poll(async () => {
      await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
      const now = await rowLuma(page, bands);
      const same = JSON.stringify(now) === previous;
      previous = JSON.stringify(now);
      const repainted = !unlike || Math.abs(now[reference] - unlike[reference]) > 0.05;
      if (same && repainted) settled = now;
      return same && repainted;
    })
    .toBe(true);
  if (!settled) throw new Error("The coat never held still");
  return settled;
}

const flatPrint = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${fill}"/></svg>`)}`;
const GRAY = flatPrint("#808080");
/** White paper rounds finest in the 8-bit snapshot, and stays below the coat's highlight shoulder at raking light. */
const WHITE = flatPrint("#ffffff");
/** Black paper takes no light, so its coat is the reflection alone. */
const BLACK = flatPrint("#000000");

test("a crease keeps its appearance through a long inspection and restores it on return", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
  const crease = await bandCrease(page);
  await page.evaluate(({ crease, print }) => window.laminateFixture.update({ print, ...crease }), {
    crease,
    print: WHITE,
  });
  const beta = await page.evaluate(
    async () => (await import("../src/stickers/lightMode.ts")).STILL_POSE.beta,
  );
  await expectLanded(page, [beta, 0]);
  await settledRows(page, ROWS);
  const snapshot = () =>
    coatOf(page).evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
      return canvas.toDataURL();
    });
  const before = await snapshot();
  await expectLanded(page, [beta + 45, 0]);
  await settledRows(page, ROWS);
  const inspecting = await snapshot();
  expect(inspecting).not.toBe(before);
  await page.clock.install();
  await page.clock.runFor(20_000);
  expect(await snapshot()).toBe(inspecting);
  await expectLanded(page, [beta, 0]);
  await settledRows(page, ROWS);
  expect(await snapshot()).toBe(before);
});

/** A coat to read: its print, and whether it carries the band's height image, which the self-shadow marches. */
interface Coat {
  print: string;
  height: boolean;
}

/**
 * The band's sticker at the screen's foot, turned `turn` degrees on screen: each coat's rows at β, γ 0,
 * in order. The fixture loads afresh, so each pose starts with the viewer centered on its reading.
 */
async function coatsAt(page: Page, beta: number, bands: Bands, coats: Coat[], turn = 0) {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  // At the screen's foot, off the light's glare, so the coat stays below its highlight shoulder.
  await page.addStyleTag({
    content: "[data-reload]{position:fixed!important;left:50%;bottom:0;translate:-50% 0}",
  });
  await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
  const crease = await bandCrease(page);
  // The fixture's own print is white where the first band reads, so the first coat repaints off it.
  const read = [await settledRows(page, bands)];
  for (const coat of coats) {
    await page.evaluate((options) => window.laminateFixture.update(options), {
      print: coat.print,
      normal: crease.normal,
      height: coat.height ? crease.height : undefined,
      maxSlope: coat.height ? crease.maxSlope : undefined,
      turn,
    });
    await expectLanded(page, [beta, 0]);
    read.push(await settledRows(page, bands, read.at(-1)));
  }
  return read.slice(1);
}

/**
 * In the page, so the room is its own device class's, with γ 0 and the viewer centered on the reading:
 * at each β, the room's light on a ramp of the drape's mean slope over `rows` facing the screen's
 * bottom, less one facing its top, against flat paper's: the contrast the shading predicts.
 */
const slopeLightAt = (page: Page, betas: number[], rows: number) =>
  page.evaluate(
    async ({ betas, rows }) => {
      const { roomFrame } = await import("../src/stickers/sharedRoom.ts");
      const { paperIrradiance } = await import("../src/stickers/roomIrradiance.ts");
      const { STICKER_THICKNESS } = await import("../src/stickers/crease.ts");
      // The drape falls one thickness across the rows; the shader's y runs down.
      const slope = STICKER_THICKNESS / rows;
      const facing = (y: number): [number, number, number] => {
        const length = Math.hypot(y, 1);
        return [0, y / length, 1 / length];
      };
      return betas.map((beta) => {
        const frame = roomFrame({ beta, gamma: 0, screenAngle: 0 });
        const light = (y: number) => paperIrradiance(frame, facing(y)).total;
        return (light(slope) - light(-slope)) / light(0);
      });
    },
    { betas, rows },
  );

/**
 * In the page, so the room is its own device class's, with γ 0 and the viewer centered on the reading:
 * the β past the reading pose whose ceiling light stands `elevation` degrees above the paper; the turn,
 * clockwise on screen, that brings the light square across the band from the sticker's top; and the
 * light's share of flat paper's light there.
 */
const lightAbovePaper = (page: Page, elevation: number) =>
  page.evaluate(async (elevation) => {
    const { roomFrame } = await import("../src/stickers/sharedRoom.ts");
    const { paperIrradiance } = await import("../src/stickers/roomIrradiance.ts");
    const { STILL_POSE } = await import("../src/stickers/lightMode.ts");
    const DEGREES = 180 / Math.PI;
    const frameAt = (beta: number) => roomFrame({ beta, gamma: 0, screenAngle: 0 });
    const elevationAt = (beta: number) => Math.asin(frameAt(beta).light[2]) * DEGREES;
    // The light sinks toward the paper as the screen turns past upright to face down.
    let [low, high] = [STILL_POSE.beta, 180];
    if (elevationAt(low) < elevation || elevationAt(high) > elevation)
      throw new Error(`No β from ${low} to ${high} holds the light ${elevation}° above the paper`);
    for (let i = 0; i < 40; i++) {
      const middle = (low + high) / 2;
      if (elevationAt(middle) > elevation) low = middle;
      else high = middle;
    }
    const beta = (low + high) / 2;
    const frame = frameAt(beta);
    const { light, total } = paperIrradiance(frame);
    return {
      beta,
      turn: Math.atan2(frame.light[0], -frame.light[1]) * DEGREES,
      lightShare: light / total,
    };
  }, elevation);

/** One 8-bit display level up from linear luminance `l`, in linear: the snapshot's rounding step. */
const displayLevel = (l: number) => {
  const display = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  const up = display + 1 / 255;
  return (up <= 0.04045 ? up / 12.92 : ((up + 0.055) / 1.055) ** 2.4) - l;
};

// Red when the shader stops shading by the room's light (CREASE_SHADING 0).
test("the room's light shades a crease's slopes, more as the device rises", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const reading = await page.evaluate(
    async () => (await import("../src/stickers/lightMode.ts")).STILL_POSE.beta,
  );
  const betas = [0, 20, reading, 70, 90];
  const model = await slopeLightAt(page, betas, ROWS.bottom[1] - ROWS.bottom[0]);
  // D: the bottom-facing drape against the top-facing one, each relative to the flat paper beside it.
  // Faint at the physical strength, so each side averages thousands of pixels.
  const contrast: Record<number, number> = {};
  for (const beta of betas) {
    const [gray, black] = await coatsAt(page, beta, ROWS, [
      { print: GRAY, height: true },
      { print: BLACK, height: true },
    ]);
    const paper = (row: string) => gray[row] - black[row];
    contrast[beta] = paper("bottom") / paper("belowBottom") - paper("top") / paper("aboveTop");
  }
  const report = JSON.stringify({ contrast, model });
  const upright = betas.indexOf(90);
  // Upright the ceiling light is above the sticker: bottom-facing slopes darken, more as the device
  // rises and the light lies lower across them, each by at least half what the room predicts.
  expect(contrast[90], `upright, the bottom-facing drape is darker: ${report}`).toBeLessThan(
    model[upright] / 2,
  );
  expect(contrast[70], `raised, the bottom-facing drape is darker: ${report}`).toBeLessThan(0);
  expect(
    contrast[90] - contrast[reading],
    `upright shades more than the reading pose: ${report}`,
  ).toBeLessThan((model[upright] - model[betas.indexOf(reading)]) / 2);
});

// Red when the self-shadow is dropped (creaseSelfShadow returning 0, or CREASE_SHADING 0), when the
// height image's march flag leaves the paper past the foot unmarked, or when any rise toward the light
// hides the whole disc, however high it stands.
test("a crease's drape shadows itself only at raking light", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const rakingPose = await lightAbovePaper(page, 4);
  const highPose = await lightAbovePaper(page, 24);
  /**
   * With the light square across the band: how much darker each set of rows' paper is with the height
   * image than without, and one display level, each against the paper's light without it.
   */
  const shadowAt = async ({ beta, turn }: { beta: number; turn: number }) => {
    const [without, black, height] = await coatsAt(
      page,
      beta,
      SHADOW_ROWS,
      [
        { print: WHITE, height: false },
        { print: BLACK, height: false },
        { print: WHITE, height: true },
      ],
      turn,
    );
    return Object.fromEntries(
      Object.keys(SHADOW_ROWS).map((row) => {
        const paper = without[row] - black[row];
        return [
          row,
          {
            darker: 1 - (height[row] - black[row]) / paper,
            level: displayLevel(without[row]) / paper,
          },
        ];
      }),
    );
  };
  const raking = await shadowAt(rakingPose);
  const high = await shadowAt(highPose);
  const report = JSON.stringify({ rakingPose, highPose, raking, high });
  // Raking, the drape hides much of the light's disc from the paper past its foot: that paper loses at
  // least a quarter of the light's part of its light, and more than a display level.
  expect(
    raking.pastFoot.darker,
    `raking, the paper past the foot is shadowed: ${report}`,
  ).toBeGreaterThan(Math.max(raking.pastFoot.level, rakingPose.lightShare / 4));
  expect(
    Math.abs(raking.facing.darker),
    `raking, paper facing the light is lit: ${report}`,
  ).toBeLessThan(raking.facing.level / 2);
  // High enough, the whole disc clears the drape's slopes.
  for (const row of ["pastFoot", "facing"])
    expect(
      Math.abs(high[row].darker),
      `high, ${row} matches without the height: ${report}`,
    ).toBeLessThan(high[row].level / 2);
});
