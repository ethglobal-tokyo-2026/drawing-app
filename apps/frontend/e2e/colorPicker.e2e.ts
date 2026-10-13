import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { button, openSheet } from "./fillHelpers.ts";

const creation = strings.stickerCreation;
const colors = creation.colorSheet;

for (const control of ["huePad", "brightness"] as const) {
  test(`a custom color picked on ${control} enters Recent before drawing`, async ({ page }) => {
    await openSheet(page, "recent-colors");
    if (control === "brightness") await button(page, creation.tools.fill).click();
    await button(page, creation.tools.color).click();
    const sheet = page.getByRole("dialog", { name: colors.title.en });
    const presets = sheet.getByRole("radiogroup", { name: colors.swatches.en });
    const recent = sheet.getByRole("radiogroup", { name: colors.recentColors.en });
    await presets.getByRole("radio", { name: colors.swatchNames.white.en, exact: true }).click();

    const slider = sheet.getByRole("slider", { name: colors[control].en });
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    if (!box) throw new Error("The color control is not visible");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 4);
    await page.mouse.down();
    const hex = await page
      .locator(".drawing-screen")
      .evaluate((screen) => screen.style.getPropertyValue("--draw-color"));
    expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(hex).not.toBe("#FFFFFF");
    // A color still being adjusted is a preview; only the completed pick belongs in Recent.
    await expect(recent.getByRole("radio", { name: hex, exact: true })).toHaveCount(0);
    await page.mouse.up();

    await expect(recent.getByRole("radio").first()).toHaveAttribute("aria-label", hex);
    await expect(recent.getByRole("radio", { name: hex, exact: true })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await button(page, creation.tools.color).click();
    await expect(recent.getByRole("radio", { name: hex, exact: true })).toBeChecked();

    await presets.getByRole("radio", { name: colors.swatchNames.ink.en, exact: true }).click();
    await recent.getByRole("radio", { name: hex, exact: true }).click();
    await expect(recent.getByRole("radio").first()).toHaveAttribute("aria-label", hex);
    await expect(recent.getByRole("radio", { name: hex, exact: true })).toHaveCount(1);
    await expect(recent.getByRole("radio", { name: hex, exact: true })).toBeChecked();
    if (control === "huePad") {
      await recent.getByRole("radio", { name: hex, exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        recent.getByRole("radio", { name: colors.swatchNames.white.en, exact: true }),
      ).toBeChecked();
      await page.keyboard.press("ArrowRight");
      await expect(
        recent.getByRole("radio", { name: colors.swatchNames.navy.en, exact: true }),
      ).toBeChecked();
    }
    await expect(button(page, creation.history.undo)).toBeDisabled();
  });
}
