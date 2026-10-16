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
    return { normal: image(pixels.normal), height: image(pixels.height) };
  });

/**
 * Rows of the 240 px sticker: the band's top edge ramps up to it, facing the screen's top, and its
 * bottom edge faces the bottom; flat paper lies beside each.
 */
const ROWS = {
  aboveTop: [62, 78],
  top: [80, 98],
  bottom: [142, 160],
  belowBottom: [162, 178],
} as const;

/**
 * Rows beside the band's two steps: each step's foot, where its contact shadow falls when the light is
 * on the band's side, and the ramp just past it, which the shadow can't reach.
 */
const STEP_ROWS = {
  flat: [20, 40],
  bottomFoot: [144, 146],
  bottomRamp: [147, 150],
  topFoot: [94, 96],
  topRamp: [90, 93],
} as const;

type Bands = Record<string, readonly [number, number]>;
type Rows = Record<string, number>;

/** Mean linear luminance of each set of rows across the sticker's middle, from the laminate snapshot. */
const rowLuma = (page: Page, bands: Bands = ROWS) =>
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
async function settledRows(page: Page, unlike?: Rows, bands: Bands = ROWS) {
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
/** Black paper takes no light, so its coat is the reflection alone. */
const BLACK = flatPrint("#000000");

/**
 * The band's sticker at the screen's foot, and the paper's own light in a set of rows at a pose: gray
 * paper's coat less black paper's, which is the reflection alone, since a reflection bending over a
 * crease outweighs the faint shading wherever a light's edge is near.
 */
async function bandSticker(page: Page, bands: Bands) {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  // At the screen's foot, off the light's glare, so the coat stays below its highlight shoulder.
  await page.addStyleTag({
    content: "[data-reload]{position:fixed!important;left:50%;bottom:0;translate:-50% 0}",
  });
  await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
  const crease = await bandCrease(page);
  let print = GRAY;
  let turn = 0;
  let turned = false;
  let last: Rows | undefined;
  const paint = (next: string) => {
    print = next;
    return page.evaluate((options) => window.laminateFixture.update(options), {
      print: next,
      ...crease,
      turn,
    });
  };
  const repaint = () => paint(print === GRAY ? BLACK : GRAY);
  await paint(print);
  return {
    /** Turns the sticker on screen with its next coats. */
    turn: (degrees: number) => {
      turn = degrees;
      turned = true;
    },
    paperAt: async (beta: number) => {
      const coats: Record<string, Rows> = {};
      // A turn lands with the other print, so its first coat can't be the unturned one.
      let unlike = turned ? last : undefined;
      if (turned) await repaint();
      turned = false;
      for (let i = 0; i < 2; i++) {
        if (i === 1) await repaint();
        await expectLanded(page, [beta, 0]);
        unlike = last = coats[print] = await settledRows(page, unlike, bands);
      }
      return (row: string) => coats[GRAY][row] - coats[BLACK][row];
    },
  };
}

// Red when the shader stops shading by the room's light (CREASE_SHADING 0, or creaseLight left out),
// when its light stops following the pose (a fixed frame for roomLight), or when creases are drawn at
// the bake's own slope (CREASE_STEEPENING 1).
test("the room's light shades a crease's slopes, more as the device rises", async ({ page }) => {
  const band = await bandSticker(page, ROWS);
  // D: the bottom-facing ramp against the top-facing one, each relative to the flat paper beside it.
  // Faint at the physical strength, so each side averages thousands of pixels.
  const contrast: Record<number, number> = {};
  for (const beta of [0, 20, 47, 70, 90]) {
    const paper = await band.paperAt(beta);
    contrast[beta] = paper("bottom") / paper("belowBottom") - paper("top") / paper("aboveTop");
  }
  const report = JSON.stringify(contrast);
  // Upright the ceiling light is above the sticker: bottom-facing slopes darken, more as the device
  // rises. A real sticker's drape darkens them clearly upright, where the bake's own slope barely does.
  expect(contrast[90], `upright, the bottom-facing ramp is darker: ${report}`).toBeLessThan(-0.07);
  expect(contrast[70], `raised, the bottom-facing ramp is darker: ${report}`).toBeLessThan(0);
  expect(
    Math.abs(contrast[90]),
    `upright shades more than the reading pose: ${report}`,
  ).toBeGreaterThan(Math.abs(contrast[47]) + 0.002);
});

// Red when the shader drops the contact shadow's march (creaseContactShadow returning 0): a step's
// foot is then only as much darker than the ramp past it as its slope is steeper.
test("a crease's step casts a short contact shadow away from the light", async ({ page }) => {
  const band = await bandSticker(page, STEP_ROWS);
  /** How much darker a step's foot is than the ramp just past it. */
  const footShade = (paper: (row: string) => number, step: "bottom" | "top") =>
    1 - paper(`${step}Foot`) / paper(`${step}Ramp`);
  // Upright the light is above the sticker, so the band's bottom step faces away from it.
  const lightAbove = await band.paperAt(90);
  // Turned over, the light falls from the sticker's own bottom, so its top step faces away.
  band.turn(180);
  const lightBelow = await band.paperAt(90);
  const shades = {
    above: { bottom: footShade(lightAbove, "bottom"), top: footShade(lightAbove, "top") },
    below: { bottom: footShade(lightBelow, "bottom"), top: footShade(lightBelow, "top") },
  };
  const report = JSON.stringify(shades);
  expect(shades.above.bottom, `the bottom step shades its foot: ${report}`).toBeGreaterThan(0.05);
  expect(shades.above.top, `the top step faces the light: ${report}`).toBeLessThan(0.02);
  expect(shades.below.top, `turned over, the top step shades its foot: ${report}`).toBeGreaterThan(
    0.05,
  );
  expect(shades.below.bottom, `turned over, the bottom step faces it: ${report}`).toBeLessThan(
    0.02,
  );
});
