import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  canvas,
  chooseLanguage,
  drawKeyName,
  openSettings,
  say,
  signIn,
  signedInUserId,
} from "./helpers.ts";
import { at, pencil } from "./pen.ts";

const { stickerCreation: creation, stickerBoard, kyotoSeika } = strings;
const evidence =
  process.env.LAYER_CONTROLS_EVIDENCE_DIR ??
  fileURLToPath(new URL("../../../data/verification/layer-controls-2026-10-11/", import.meta.url));

async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const engine = page.context().browser()?.browserType().name() ?? "browser";
  await page.screenshot({ path: `${evidence}/task3-${engine}-${name}.png` });
}

async function draw(page: Page, language: "en" | "ja", tickets = 3) {
  await page.getByRole("button", { name: drawKeyName(language, tickets) }).click();
  await expect(page.locator(".drawing-screen")).not.toHaveAttribute("inert");
}

async function chooseColor(page: Page, language: "en" | "ja", color: "ink" | "blue") {
  await page.getByRole("button", { name: say(creation.tools.color, language) }).click();
  const sheet = page.getByRole("dialog", { name: say(creation.colorSheet.title, language) });
  await sheet
    .getByRole("radiogroup", { name: say(creation.colorSheet.swatches, language) })
    .getByRole("radio", {
      name: say(creation.colorSheet.swatchNames[color], language),
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
}

async function fillOnce(page: Page, language: "en" | "ja") {
  await page.getByRole("button", { name: say(creation.tools.fill, language) }).click();
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet has no box");
  const point = at(box, 0.5, 0.5);
  const pen = await pencil(page);
  await pen.down(point, 0.5);
  await pen.up(point);
}

async function selectorFits(page: Page, language: "en" | "ja") {
  const bar = page.getByRole("radiogroup", { name: say(creation.fillReference.label, language) });
  await expect(bar).toBeVisible();
  const [control, tools] = await Promise.all([
    bar.boundingBox(),
    page.locator(".tool-strip").boundingBox(),
  ]);
  const viewport = page.viewportSize();
  if (!control || !tools || !viewport)
    throw new Error("The Fill selector, tools or viewport has no box");
  expect(control.y).toBeGreaterThanOrEqual(tools.y + tools.height - 1);
  expect(control.x).toBeGreaterThanOrEqual(0);
  expect(control.x + control.width).toBeLessThanOrEqual(viewport.width);
  for (const radio of await bar.getByRole("radio").all()) {
    const box = await radio.locator("..").boundingBox();
    if (!box) throw new Error("A Fill choice has no box");
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
}

async function expectTimerNoteClearOfSelector(page: Page) {
  const hint = page.locator(".timer-hint");
  const bar = page.locator(".fill-reference-bar");
  const [note, choices, opacity] = await Promise.all([
    hint.boundingBox(),
    bar.boundingBox(),
    hint.evaluate((el) => Number(getComputedStyle(el).opacity)),
  ]);
  if (!note || !choices) throw new Error("The timer note or Fill selector has no box");
  if (opacity > 0.05) {
    const apart =
      choices.y >= note.y + note.height ||
      note.y >= choices.y + choices.height ||
      choices.x >= note.x + note.width ||
      note.x >= choices.x + choices.width;
    expect(apart, "The visible timer help must be readable beside Fill reference").toBe(true);
  }
}

async function expectLayerHintClearOfOpacity(page: Page) {
  const [hint, readout, add, viewport] = await Promise.all([
    page.locator(".layer-options-hint").boundingBox(),
    page.locator(".opacity-readout").boundingBox(),
    page.locator(".layer-add").boundingBox(),
    page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
  ]);
  if (!hint || !readout || !add)
    throw new Error("The layer hint or its neighboring controls has no box");
  for (const [name, box] of [
    ["opacity readout", readout],
    ["New layer", add],
  ] as const) {
    const apart =
      hint.x >= box.x + box.width ||
      box.x >= hint.x + hint.width ||
      hint.y >= box.y + box.height ||
      box.y >= hint.y + hint.height;
    expect(apart, `The first-use layer hint must leave ${name} readable`).toBe(true);
  }
  expect(hint.x).toBeGreaterThanOrEqual(0);
  expect(hint.x + hint.width).toBeLessThanOrEqual(viewport.width);
  expect(hint.y).toBeGreaterThanOrEqual(0);
  expect(hint.y + hint.height).toBeLessThanOrEqual(viewport.height);
}

for (const variant of [
  { hand: "right", language: "en", height: 844 },
  { hand: "left", language: "ja", height: 667 },
] as const) {
  test(`first-use layer hint and Visible layers explanation stay clear on ${variant.hand} ${variant.language} phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: variant.height });
    await signIn(page, `lv-hint-${variant.hand}`, "en");
    if (variant.hand === "left") {
      const settings = await openSettings(page, "en");
      await settings
        .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, "en") })
        .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, "en") })
        .click();
      await chooseLanguage(page, "en", variant.language);
      await page
        .getByRole("button", { name: say(stickerBoard.statBoard.flipBack, variant.language) })
        .click();
    }
    await draw(page, variant.language);
    await page.getByRole("button", { name: say(creation.layers.add, variant.language) }).click();
    await expect(page.locator(".layer-options-hint")).toBeVisible();
    await expectLayerHintClearOfOpacity(page);
    await capture(page, `first-layer-hint-${variant.hand}-${variant.language}-${variant.height}`);
    await page.getByRole("button", { name: say(creation.tools.fill, variant.language) }).click();
    const bar = page.getByRole("radiogroup", {
      name: say(creation.fillReference.label, variant.language),
    });
    await bar
      .getByRole("radio", { name: say(creation.fillReference.visible, variant.language) })
      .click();
    await expect(
      bar.getByText(say(creation.fillReference.visibleHelp, variant.language)),
    ).toBeVisible();
    await selectorFits(page, variant.language);
    await expectLayerHintClearOfOpacity(page);
    await capture(page, `visible-help-${variant.hand}-${variant.language}-${variant.height}`);
  });
}

test("first-use timer help remains readable while Fill appears and after the first mark", async ({
  page,
}) => {
  const language = "en";
  await signIn(page, "lv-hint", language);
  await draw(page, language);
  await page.getByRole("button", { name: say(creation.tools.fill, language) }).click();
  await expect(page.locator(".timer-hint.is-on")).toBeVisible();
  await selectorFits(page, language);
  await expectTimerNoteClearOfSelector(page);
  await capture(page, "first-use-fill-hint");
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The first-use sheet has no box");
  const point = at(box, 0.5, 0.5);
  const pen = await pencil(page);
  await pen.down(point, 0.5);
  await pen.up(point);
  await expectTimerNoteClearOfSelector(page);
  await capture(page, "first-fill-hint-peel");
});

test("phone controls stay readable over black ink at one and ten layers and every scroll position", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const language = "en";
  await signIn(page, "layer-visual-phone", language);
  await draw(page, language);
  await chooseColor(page, language, "ink");
  await fillOnce(page, language);
  await selectorFits(page, language);
  await capture(page, "phone-black-one-layer");
  const add = page.getByRole("button", { name: say(creation.layers.add, language) });
  await add.click();
  await page
    .getByRole("button", { name: say(creation.layers.dismissOptionsHint, language) })
    .click();
  for (let number = 3; number <= 10; number++) await add.click();
  await expect(add).toBeDisabled();
  const list = page.locator(".layer-list");
  const well = page.locator(".layer-scroll-well");
  await expect(well).toHaveAttribute("data-overflow", "true");
  const scroll = async (share: number) => {
    await list.evaluate((el, position) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * position;
      el.dispatchEvent(new Event("scroll"));
    }, share);
  };
  await scroll(0);
  await expect(well).toHaveAttribute("data-more-below", "true");
  await capture(page, "phone-black-ten-start");
  await scroll(0.5);
  await expect(well).toHaveAttribute("data-more-above", "true");
  await expect(well).toHaveAttribute("data-more-below", "true");
  await capture(page, "phone-black-ten-middle");
  await scroll(1);
  await expect(well).toHaveAttribute("data-more-above", "true");
  await expect(well).not.toHaveAttribute("data-more-below");
  await capture(page, "phone-black-ten-end");
  const slider = page.getByRole("slider", { name: say(creation.opacitySlider.label, language) });
  await slider.focus();
  await expect(page.locator(".opacity-slider")).toBeVisible();
  await capture(page, "phone-black-opacity-focus");
});

test("left hand and Japanese keep the selector clear of the layer controls", async ({ page }) => {
  const language = "ja";
  await signIn(page, "layer-visual-japanese", "en");
  const settings = await openSettings(page, "en");
  await settings
    .getByRole("radiogroup", { name: say(stickerBoard.settings.drawing.hand.label, "en") })
    .getByRole("radio", { name: say(stickerBoard.settings.drawing.hand.left, "en") })
    .click();
  await chooseLanguage(page, "en", language);
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await draw(page, language);
  await fillOnce(page, language);
  await selectorFits(page, language);
  await page.getByRole("button", { name: say(creation.layers.add, language) }).click();
  await page
    .getByRole("button", { name: say(creation.layers.dismissOptionsHint, language) })
    .click();
  await expect(page.locator(".drawing-screen")).toHaveAttribute("data-hand", "left");
  await capture(page, "phone-left-japanese");
});

test("short Kyoto Seika sheet keeps its corner print and Fill choices reachable", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 667 });
  const language = "en";
  await signIn(page, "lv-kyoto", language);
  const on = await page.request.post("/api/me/kyoto-seika-practice", {
    headers: { "x-croquis-user-id": await signedInUserId(page) },
    data: { kyotoSeikaPractice: true },
  });
  expect(on.ok()).toBe(true);
  await page.reload();
  await draw(page, language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY);
  const subjects = page.getByRole("group", { name: say(kyotoSeika.balloons.label, language) });
  await subjects.locator("[aria-pressed]").nth(0).click();
  await subjects.locator("[aria-pressed]").nth(1).click();
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  await page.getByRole("button", { name: say(creation.tools.fill, language) }).click();
  await selectorFits(page, language);
  const add = page.getByRole("button", { name: say(creation.layers.add, language) });
  await add.click();
  await page
    .getByRole("button", { name: say(creation.layers.dismissOptionsHint, language) })
    .click();
  for (let number = 3; number <= 10; number++) await add.click();
  await expect(add).toBeDisabled();
  const [column, print] = await Promise.all([
    page.locator(".drawing-layer-column").boundingBox(),
    page.locator(".corner-print").boundingBox(),
  ]);
  if (!column || !print) throw new Error("The short sheet has no layer column or corner print");
  expect(column.y + column.height).toBeLessThanOrEqual(print.y - 8);
  await capture(page, "phone-short-kyoto-ten");
});

test("touch tablet keeps Fill choices and focused opacity clear with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const language = "en";
  await signIn(page, "layer-visual-tablet", language);
  await draw(page, language);
  await chooseColor(page, language, "blue");
  await fillOnce(page, language);
  await page.getByRole("button", { name: say(creation.layers.add, language) }).click();
  await page
    .getByRole("button", { name: say(creation.layers.dismissOptionsHint, language) })
    .click();
  await selectorFits(page, language);
  const slider = page.getByRole("slider", { name: say(creation.opacitySlider.label, language) });
  await slider.focus();
  await capture(page, "tablet-reduced-focus");
  const bar = page.getByRole("radiogroup", { name: say(creation.fillReference.label, language) });
  await page.getByRole("button", { name: say(creation.tools.color, language) }).click();
  await expect(bar).toBeHidden();
});
