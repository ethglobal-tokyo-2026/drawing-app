import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { openSettings, say, signIn } from "./helpers.ts";
import { ipad } from "./ipad.ts";

test.use(ipad);

test("pointer indicators follow Settings without taking controls' input", async ({ page }) => {
  await signIn(page, "pointer-indicators", "en");
  const settings = await openSettings(page, "en");
  const choice = settings.getByRole("switch", {
    name: say(strings.stickerBoard.settings.drawing.pointerIndicators.label, "en"),
  });
  await expect(choice).not.toBeChecked();
  await choice.check();
  const overlay = page.locator(".pointer-indicators");
  await expect(overlay).toBeAttached();
  await expect(overlay).toHaveCSS("pointer-events", "none");
  await expect(overlay).toHaveAttribute("aria-hidden", "true");
  await settings.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 0,
    clientX: 100,
    clientY: 120,
  });
  await expect(page.locator(".pointer-indicators__cursor")).toBeVisible();
  await expect(page.locator(".pointer-indicators__cursor")).toHaveCSS("width", "20px");
  await settings.dispatchEvent("pointerdown", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 1,
    clientX: 100,
    clientY: 120,
  });
  await expect(page.locator(".pointer-indicators__ripple")).toHaveCount(1);
  await settings.dispatchEvent("pointerup", { pointerType: "pen", pointerId: 8, buttons: 0 });
  await expect(page.locator(".pointer-indicators__cursor")).toHaveCount(0);
  await expect(page.locator(".pointer-indicators__ripple")).toHaveCount(0);
  await page.reload();
  const again = await openSettings(page, "en");
  const kept = again.getByRole("switch", { name: /Show pointer and taps/ });
  await expect(kept).toBeChecked();
  await kept.uncheck();
  await expect(overlay).toHaveCount(0);
});
