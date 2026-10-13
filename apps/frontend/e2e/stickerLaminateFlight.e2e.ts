import { expect } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { openDetail, say, sealFromBoard, signIn, test } from "./helpers.ts";
import { ipad } from "./ipad.ts";

test.use(ipad);

test("a closing sticker keeps its rendered laminate pixels during the flight", async ({ page }) => {
  await signIn(page, "laminate-flight", "en");
  const no = await sealFromBoard(page, "en");
  const detail = await openDetail(page, "en", no);
  const coat = detail.locator(".sticker-detail__slide canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "ready");
  // Opening must have landed before the close constructs its separate flyer.
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
  const pixels = await detail
    .getByRole("button", { name: say(strings.ui.backToBoard, "en"), exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLElement)) throw new Error("The detail close button is missing");
      button.click();
      const canvas = document.querySelector(".detail-lift__flyer canvas.sticker-laminate");
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The closing flyer is missing");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The closing flyer context is missing");
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let channel = 3; channel < rgba.length; channel += 4) if (rgba[channel] > 0) opaque++;
      return { opaque, state: canvas.dataset.state };
    });
  expect(pixels.state).toBe("ready");
  expect(pixels.opaque, "Cloning the DOM must also copy the visible canvas bitmap").toBeGreaterThan(
    100,
  );
});
