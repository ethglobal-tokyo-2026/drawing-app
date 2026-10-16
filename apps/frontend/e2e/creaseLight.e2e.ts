import { expect, test, type Page } from "@playwright/test";
import { expectLanded, holdPortrait } from "./screenTilt.ts";

test.beforeEach(({ page }) => holdPortrait(page));

const coatOf = (page: Page) => page.locator("[data-reload] canvas.sticker-material");

/** One horizontal support band under the sticker: its crease's normal, from the real bake. */
const bandNormal = (page: Page) =>
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
    if (!context) throw new Error("The band normal's context is missing");
    context.putImageData(new ImageData(pixels.normal, side, side), 0, 0);
    return canvas.toDataURL();
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

type Rows = Record<keyof typeof ROWS, number>;

/** Mean linear luminance of each set of rows across the sticker's middle, from the laminate snapshot. */
const rowLuma = (page: Page) =>
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
    return {
      aboveTop: mean(rows.aboveTop),
      top: mean(rows.top),
      bottom: mean(rows.bottom),
      belowBottom: mean(rows.belowBottom),
    };
  }, ROWS);

/** The coat's rows once it holds still at the pose it has landed on, repainted off `unlike`'s print. */
async function settledRows(page: Page, unlike?: Rows) {
  let previous = "";
  let settled: Rows | undefined;
  await expect
    .poll(async () => {
      await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
      const now = await rowLuma(page);
      const same = JSON.stringify(now) === previous;
      previous = JSON.stringify(now);
      const repainted = !unlike || Math.abs(now.aboveTop - unlike.aboveTop) > 0.05;
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

// Red when the shader stops shading by the room's light (CREASE_SHADING 0, or creaseLight left out),
// when its light stops following the pose (a fixed roomFrame), or when creases are drawn at the bake's
// own slope (CREASE_STEEPENING 1).
test("the room's light shades a crease's slopes, more as the device rises", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  // At the screen's foot, off the ceiling light's glare, so the coat stays below its highlight shoulder.
  await page.addStyleTag({
    content: "[data-reload]{position:fixed!important;left:50%;bottom:0;translate:-50% 0}",
  });
  await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
  const normal = await bandNormal(page);
  let print = GRAY;
  const paint = (next: string) => {
    print = next;
    return page.evaluate((options) => window.laminateFixture.update(options), {
      print: next,
      normal,
    });
  };
  await paint(print);
  // D: the bottom-facing ramp against the top-facing one, each relative to the flat paper beside it,
  // in the paper's own light: gray paper's coat less black paper's, which is the reflection alone, since
  // a reflection bending over a crease outweighs the faint shading wherever a light's edge is near.
  // Faint at the physical strength, so each side averages thousands of pixels.
  const contrast: Record<number, number> = {};
  for (const beta of [0, 20, 47, 70, 90]) {
    await expectLanded(page, [beta, 0]);
    const first = await settledRows(page);
    const firstPrint = print;
    await paint(print === GRAY ? BLACK : GRAY);
    await expectLanded(page, [beta, 0]);
    const second = await settledRows(page, first);
    const [gray, black] = firstPrint === GRAY ? [first, second] : [second, first];
    const paper = (row: keyof Rows) => gray[row] - black[row];
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
