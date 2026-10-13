import { expect, test, type Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import {
  button,
  chip,
  createLayer,
  line,
  openSheet,
  options,
  sheetBox,
  slider,
} from "./fillHelpers.ts";
import { canvas, say } from "./helpers.ts";
import { along, inkAt, inkShows, middle, pencil, penStroke } from "./pen.ts";

const { stickerCreation: creation } = strings;
const copy = creation.layers;
const recovery = (page: Page) => page.locator(".layer-recovery-paper");

async function hideCurrent(page: Page, id = 1, language: Language = "en") {
  await chip(page, id).click();
  const range = page.getByRole("slider", { name: say(creation.opacitySlider.label, language) });
  await expect(range).toBeFocused();
  await range.press("Home");
  await expect(range).toHaveValue("0");
  await chip(page, id).click();
  await expect(page.locator(".layer-options-bar")).toBeHidden();
}

/** Actual pen input on the sheet, with localized canvas names. */
async function attempt(page: Page, language: Language = "en", down = 0.4) {
  const leftHand = (await page.locator(".drawing-screen").getAttribute("data-hand")) === "left";
  const points = along(
    await sheetBox(page, language),
    down,
    leftHand ? 0.04 : 0.9,
    leftHand ? 0.1 : 0.96,
    8,
  );
  await penStroke(page, await pencil(page), points, () => 0.5, 8);
  await page.mouse.move(points.at(-1)?.x ?? 0, points.at(-1)?.y ?? 0);
  return middle(points);
}

test("blocked brush input expires once, and hidden options still restore drawing", async ({
  page,
}) => {
  await openSheet(page, "gexpiry");
  await hideCurrent(page);
  await expect(recovery(page)).toHaveCount(0);
  const blocked = await attempt(page);
  await expect(recovery(page)).toBeVisible();
  await expect.poll(() => inkAt(page, blocked)).toBe(0);
  await page.waitForTimeout(3800);
  await attempt(page);
  await expect(recovery(page)).toHaveCount(0, { timeout: 2000 });
  await attempt(page);
  await expect(recovery(page)).toHaveCount(0);
  await options(page, 1);
  await expect(page.locator(".layer-hidden-options")).toContainText(copy.hiddenRecovery.en);
  const show = button(page, copy.showLayer);
  await show.focus();
  await show.press("Enter");
  await expect(chip(page, 1)).toBeFocused();
  await expect(slider(page)).toHaveValue("100");
  await chip(page, 1).click();
  await inkShows(page, await line(page, 0.6));
});

test("focused recovery survives timeout and Layer settings focuses opacity", async ({ page }) => {
  await openSheet(page, "gfocus");
  await hideCurrent(page);
  await attempt(page);
  const settings = recovery(page).getByRole("button", { name: copy.openOptions.en });
  await settings.focus();
  await page.waitForTimeout(5400);
  await expect(settings).toBeFocused();
  await expect(recovery(page)).toBeVisible();
  await settings.press("Enter");
  await expect(recovery(page)).toHaveCount(0);
  await expect(slider(page)).toBeFocused();
  await expect(page.locator(".layer-hidden-options")).toBeVisible();
});

test("Fill and Eraser blocked input each explains a fresh hidden-layer episode", async ({
  page,
}) => {
  await openSheet(page, "gtools");
  for (const tool of [creation.tools.fill, creation.tools.eraser]) {
    await button(page, tool).click();
    await hideCurrent(page);
    const blocked = await attempt(page);
    await expect(recovery(page)).toBeVisible();
    await expect.poll(() => inkAt(page, blocked)).toBe(0);
    await recovery(page).getByRole("button", { name: copy.showLayer.en }).click();
    await expect(recovery(page)).toHaveCount(0);
  }
});

for (const variant of [
  { language: "en" as const, hand: "right", width: 375, height: 667 },
  { language: "ja" as const, hand: "left", width: 390, height: 844 },
  { language: "en" as const, hand: "left", width: 1024, height: 768 },
  { language: "ja" as const, hand: "right", width: 768, height: 1024 },
]) {
  test.describe(`${variant.language}/${variant.hand}/${variant.width}`, () => {
    test.use({ locale: variant.language === "ja" ? "ja-JP" : "en-US" });
    test(`hidden recovery stays beside its chip on ${variant.language}/${variant.hand}/${variant.width}`, async ({
      page,
    }) => {
      const { language, hand, width, height } = variant;
      await page.setViewportSize({ width, height });
      await page.addInitScript(
        ({ hand, language }) => {
          localStorage.setItem("draw.hand", hand);
          localStorage.setItem("draw.language", language);
        },
        { hand, language },
      );
      await openSheet(page, `g${language}${hand[0]}${width}`, language);
      for (let id = 2; id <= 10; id++) await createLayer(page, "above", language);
      await chip(page, 1).scrollIntoViewIfNeeded();
      await chip(page, 1).click();
      await hideCurrent(page, 1, language);
      await attempt(page, language, 0.25);
      await expect(recovery(page)).toBeVisible();
      // Focus pins the hint during the measurements, which may span several browser frames.
      await recovery(page)
        .getByRole("button", { name: say(copy.openOptions, language) })
        .focus();
      await expect(recovery(page)).toContainText(say(copy.hiddenRecovery, language));
      await expect(page.locator(".layer-options-hint")).toHaveCount(0);
      const [paper, selected, screen, footer] = await Promise.all([
        recovery(page).boundingBox(),
        chip(page, 1).boundingBox(),
        page.locator(".drawing-screen").boundingBox(),
        page.locator(".history-buttons").boundingBox(),
      ]);
      if (!paper || !selected || !screen || !footer)
        throw new Error("Layer guidance has no painted box");
      expect(paper.x).toBeGreaterThanOrEqual(screen.x + 8);
      expect(paper.x + paper.width).toBeLessThanOrEqual(screen.x + screen.width - 8);
      expect(paper.y).toBeGreaterThanOrEqual(screen.y + 8);
      expect(paper.y + paper.height).toBeLessThanOrEqual(footer.y - 8);
      if (hand === "right") expect(paper.x).toBeGreaterThan(selected.x + selected.width);
      else expect(paper.x + paper.width).toBeLessThan(selected.x);
      const targets = await page.locator(".layer-column").evaluate((column) => {
        const add = column.querySelector<HTMLElement>(".layer-add");
        const selected = column.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!add || !selected) throw new Error("The layer controls are missing");
        const addBox = add.getBoundingClientRect();
        const chipBox = selected.getBoundingClientRect();
        const chipHit = getComputedStyle(selected, "::after");
        const addStyle = getComputedStyle(add);
        const svg = add.querySelector("svg")?.getBoundingClientRect();
        return {
          addTarget: addBox.width,
          addFace:
            addBox.width -
            parseFloat(addStyle.borderLeftWidth) -
            parseFloat(addStyle.borderRightWidth),
          chipFace: chipBox.width,
          chipHeight: chipBox.height,
          chipTarget: chipBox.width - parseFloat(chipHit.left) - parseFloat(chipHit.right),
          plus: svg?.width,
          column: column.getBoundingClientRect().width,
        };
      });
      expect(targets.addTarget).toBeGreaterThanOrEqual(44);
      expect(targets.chipTarget).toBeGreaterThanOrEqual(44);
      expect(targets.addFace).toBeCloseTo(targets.chipFace, 1);
      expect(targets.chipFace).toBe(36);
      expect(targets.chipHeight).toBe(46);
      expect(targets.plus).toBe(34);
      expect(targets.column).toBe(44);
      // The outer 4px of the chip still selects it: validate actual hit testing at that edge.
      const hit = await page.evaluate(
        ({ x, y }) =>
          document
            .elementFromPoint(x, y)
            ?.closest("[data-layer-chip]")
            ?.getAttribute("data-layer-chip"),
        { x: selected.x - 3, y: selected.y + selected.height / 2 },
      );
      expect(hit).toBe("1");
      await canvas(page, language).focus();
      await page.locator(".layer-list").evaluate((list) => {
        list.scrollTop = 0;
      });
      await expect(recovery(page)).toHaveCount(0);
      await attempt(page, language, 0.25);
      await expect(recovery(page)).toHaveCount(0);
    });
  });
}
