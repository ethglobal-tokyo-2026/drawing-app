import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { drawKeyName, openSettings, say, signIn, tapKey } from "./helpers.ts";

const { kyotoSeika, stickerBoard, stickerCreation } = strings;
const language = "en";

const layers = (page: Page) =>
  page.getByRole("listbox", { name: say(stickerCreation.layers.label, language) });
const chip = (page: Page, number: number) => layers(page).locator(`[data-layer-chip="${number}"]`);
const timer = (page: Page) =>
  page.getByRole("button", { name: say(stickerCreation.timer.label, language), exact: true });

/** The running clock's seconds left, from the timer's spoken status. */
async function runningSeconds(page: Page) {
  const status = await timer(page).evaluate((dot) => {
    const id = dot.getAttribute("aria-describedby");
    return id ? (document.getElementById(id)?.textContent ?? "") : "";
  });
  const pattern = new RegExp(
    `^${say(stickerCreation.timer.status.running, language, { time: "TIME" }).replace("TIME", "(\\d+):(\\d\\d)")}$`,
  );
  const match = status.match(pattern);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Watches the begun Kyoto Seika clock advance while the interaction remains in place. */
async function clockContinues(page: Page) {
  await expect.poll(() => runningSeconds(page)).not.toBeNull();
  const before = await runningSeconds(page);
  if (before === null)
    throw new Error("The Kyoto Seika clock stopped before the layer interaction");
  await expect
    .poll(
      async () => {
        const now = await runningSeconds(page);
        return now !== null && now < before;
      },
      { timeout: 6_000 },
    )
    .toBe(true);
}

async function expectCornerPrintClearOfLayers(page: Page) {
  const print = await page.locator(".corner-print").boundingBox();
  if (!print) throw new Error("The Kyoto Seika Subjects have no corner print");
  for (const selector of [".drawing-layer-column", ".opacity-slider"]) {
    const control = await page.locator(selector).boundingBox();
    if (!control) throw new Error(`${selector} has no box`);
    expect(control.y + control.height, `${selector} reaches the corner print`).toBeLessThanOrEqual(
      print.y - 8,
    );
  }
}

test("a left drawing hand mirrors the layer column, slider and options toward the sheet", async ({
  page,
}) => {
  await signIn(page, "left-layers", language);
  const settings = await openSettings(page, language);
  await settings
    .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, language) })
    .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, language) })
    .click();
  await expect(
    settings
      .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, language) })
      .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, language) }),
  ).toBeChecked();
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await page.getByRole("button", { name: drawKeyName(language, 3) }).click();

  const screen = page.locator(".drawing-screen");
  await expect(screen).toHaveAttribute("data-hand", "left");
  const column = page.locator(".drawing-layer-column .layer-column");
  await expect(column).toHaveAttribute("data-edge", "right");
  const columnBox = await column.boundingBox();
  if (!columnBox) throw new Error("The layer column has no box");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The page has no viewport");
  expect(columnBox.x).toBeGreaterThan(viewport.width / 2);

  await page.getByRole("button", { name: say(stickerCreation.layers.add, language) }).click();
  await expect(chip(page, 2)).toBeVisible();
  const slider = page.getByRole("slider", {
    name: say(stickerCreation.opacitySlider.label, language),
  });
  const [chipBox, sliderBox] = await Promise.all([
    chip(page, 2).boundingBox(),
    slider.boundingBox(),
  ]);
  if (!chipBox || !sliderBox) throw new Error("The left-hand chip or slider has no box");
  expect(sliderBox.x + sliderBox.width).toBeLessThanOrEqual(chipBox.x + 1);

  await chip(page, 2).click();
  const options = page.getByRole("toolbar", {
    name: say(stickerCreation.layers.options, language, { number: 2 }),
  });
  await expect(options).toBeVisible();
  const optionsBox = await options.boundingBox();
  if (!optionsBox) throw new Error("The layer options have no box");
  expect(optionsBox.x + optionsBox.width).toBeLessThan(chipBox.x);
  await expect(
    options.getByRole("button", { name: say(stickerCreation.layers.clip, language) }),
  ).toBeVisible();
});

test("a begun Kyoto Seika clock continues through layer options, opacity and reorder", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "kyoto-layers", language);
  const on = await page.request.post("/api/me/kyoto-seika-practice", {
    data: { kyotoSeikaPractice: true },
  });
  expect(on.ok()).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();
  const subjects = page.getByRole("group", { name: say(kyotoSeika.balloons.label, language) });
  await subjects.locator("[aria-pressed]").nth(0).click();
  await subjects.locator("[aria-pressed]").nth(1).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  await expect.poll(() => runningSeconds(page)).toBeGreaterThan(KYOTO_SEIKA_TIME_USED_S - 60);

  await page.getByRole("button", { name: say(stickerCreation.layers.add, language) }).click();
  await chip(page, 2).click();
  await expect(
    page.getByRole("toolbar", {
      name: say(stickerCreation.layers.options, language, { number: 2 }),
    }),
  ).toBeVisible();
  await clockContinues(page);
  await chip(page, 2).click();

  const thumb = page.locator(".opacity-thumb");
  const thumbBox = await thumb.boundingBox();
  if (!thumbBox) throw new Error("The opacity thumb has no box");
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await page.mouse.down();
  await expect(page.locator(".opacity-slider")).toHaveClass(/is-held/);
  await clockContinues(page);
  await page.mouse.up();

  const top = await chip(page, 2).boundingBox();
  const bottom = await chip(page, 1).boundingBox();
  if (!top || !bottom) throw new Error("The layer chips have no boxes");
  await page.mouse.move(top.x + top.width / 2, top.y + top.height / 2);
  await page.mouse.down();
  await expect.poll(() => chip(page, 2).evaluate((el) => el.style.boxShadow)).not.toBe("");
  await clockContinues(page);
  await page.mouse.move(bottom.x + bottom.width / 2, bottom.y + bottom.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(layers(page).locator("[data-layer-chip]").first()).toHaveAttribute(
    "data-layer-chip",
    "1",
  );
  const add = page.getByRole("button", { name: say(stickerCreation.layers.add, language) });
  for (let number = 3; number <= 10; number++) await add.click();
  await expectCornerPrintClearOfLayers(page);
});

test("the left-hand layer column scrolls above the Kyoto Seika corner print", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 753 });
  await signIn(page, "left-kyoto-layers", language);
  const on = await page.request.post("/api/me/kyoto-seika-practice", {
    data: { kyotoSeikaPractice: true },
  });
  expect(on.ok()).toBe(true);
  await page.reload();
  const settings = await openSettings(page, language);
  await settings
    .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, language) })
    .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, language) })
    .click();
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await tapKey(
    page.getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) }),
  );
  const subjects = page.getByRole("group", { name: say(kyotoSeika.balloons.label, language) });
  await subjects.locator("[aria-pressed]").nth(0).click();
  await subjects.locator("[aria-pressed]").nth(1).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  const add = page.getByRole("button", { name: say(stickerCreation.layers.add, language) });
  for (let number = 2; number <= 10; number++) await add.click();
  await expect(chip(page, 10)).toBeVisible();
  await expectCornerPrintClearOfLayers(page);
});
