import { expect, test, type Page } from "@playwright/test";
import { STILL_POSE } from "../src/stickers/lightMode.ts";
import { expectLanded, holdPortrait } from "./screenTilt.ts";

test.beforeEach(({ page }) => holdPortrait(page));

const coatOf = (page: Page) => page.locator("[data-reload] canvas.sticker-material");

/** Mean linear luminance across the sticker's middle, from the laminate snapshot. */
const meanLuma = (page: Page) =>
  coatOf(page).evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The laminate canvas is missing");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The laminate snapshot context is missing");
    const { width, height } = canvas;
    const [x, y] = [Math.round(width * 0.2), Math.round(height * 0.2)];
    const data = context.getImageData(x, y, width - 2 * x, height - 2 * y).data;
    const linear = (level: number) => {
      const v = level / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    let sum = 0;
    for (let q = 0; q < data.length; q += 4)
      sum += 0.2126 * linear(data[q]) + 0.7152 * linear(data[q + 1]) + 0.0722 * linear(data[q + 2]);
    return sum / (data.length / 4);
  });

/** The coat's mean once it holds still at the pose it has landed on, repainted off `unlike`'s print. */
async function settledLuma(page: Page, unlike?: number) {
  let previous: number | undefined;
  let settled: number | undefined;
  await expect
    .poll(async () => {
      await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
      const now = await meanLuma(page);
      const same = now === previous;
      previous = now;
      if (same && (unlike === undefined || Math.abs(now - unlike) > 0.05)) settled = now;
      return settled !== undefined;
    })
    .toBe(true);
  if (settled === undefined) throw new Error("The coat never held still");
  return settled;
}

const flatPrint = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${fill}"/></svg>`)}`;
const WHITE = flatPrint("#ffffff");
/** Black paper takes no light, so its coat is the reflection alone. */
const BLACK = flatPrint("#000000");

/** The snapshot's rounding, as a share of the white paper's light. */
const ROUNDING = 0.02;

// Red when the print stops following the light: paperLight fixed at 1, in paperLight.ts or as the
// renderer's uniform, or the shader leaving it out of the print. The minimum's check is red when the
// clamp loses its floor.
test("white paper takes more of the room's light at the still pose than upright, never below the minimum", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  // At the screen's foot, off the light's glare, so the white coat stays below its highlight shoulder.
  await page.addStyleTag({
    content: "[data-reload]{position:fixed!important;left:50%;bottom:0;translate:-50% 0}",
  });
  await expect(coatOf(page)).toHaveAttribute("data-state", "ready");
  let print = WHITE;
  const paint = (next: string) => {
    print = next;
    return page.evaluate((options) => window.laminateFixture.update(options), { print: next });
  };
  await paint(print);
  // White paper's coat less black paper's: the paper's own light, without the reflection both carry.
  const paper: Record<number, number> = {};
  for (const beta of [STILL_POSE.beta, 90, 120]) {
    await expectLanded(page, [beta, 0]);
    const first = await settledLuma(page);
    const firstPrint = print;
    await paint(print === WHITE ? BLACK : WHITE);
    await expectLanded(page, [beta, 0]);
    const second = await settledLuma(page, first);
    const [white, black] = firstPrint === WHITE ? [first, second] : [second, first];
    paper[beta] = white - black;
  }
  // The room's module reads JSON that only the page's bundler imports.
  const minimum = await page.evaluate(
    async () => (await import("../src/stickers/paperLight.ts")).PAPER_LIGHT.min,
  );
  const still = paper[STILL_POSE.beta];
  const report = JSON.stringify(paper);
  expect(paper[90] / still, `upright, white paper takes less light: ${report}`).toBeLessThan(
    1 - ROUNDING,
  );
  for (const beta of [90, 120])
    expect(
      paper[beta] / still,
      `at beta ${beta}, the paper keeps its minimum: ${report}`,
    ).toBeGreaterThanOrEqual(minimum - ROUNDING);
});
