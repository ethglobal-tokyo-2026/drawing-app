import { expect, type Locator, type Page } from "@playwright/test";
import { S_MIN } from "../src/sticker-board/placement.ts";
import { boardSticker, sealFromBoard, signIn, test } from "./helpers.ts";
import { FINGERTIP, hand, touchStroke, type At } from "./pen.ts";

const language = "en";

/** The middle of an element on screen. */
async function middleOf(el: Locator): Promise<At> {
  const box = await el.boundingBox();
  if (!box) throw new Error("It isn't on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The size the app saves for sticker `id` next. Ask before the gesture ends, so it isn't missed. */
function savedScale(page: Page, id: string) {
  return page
    .waitForRequest((r) => r.method() === "PATCH" && r.url().endsWith(`/sticker-placements/${id}`))
    .then((request) => {
      const body: unknown = request.postDataJSON();
      const placement =
        body !== null && typeof body === "object" && "placement" in body ? body.placement : null;
      const scale =
        placement !== null && typeof placement === "object" && "scale" in placement
          ? placement.scale
          : null;
      if (typeof scale !== "number") throw new Error(`PATCH carried ${JSON.stringify(body)}`);
      return scale;
    });
}

test("a corner handle dragged in past its sticker's center leaves the sticker at its smallest", async ({
  page,
}) => {
  await signIn(page, "corner", language);
  const sticker = boardSticker(page, language, await sealFromBoard(page, language));
  await expect(sticker).not.toHaveClass(/is-landing/);
  const id = await sticker.getAttribute("data-sticker-id");
  if (!id) throw new Error("The sticker carries no ID");
  await sticker.click();
  const corner = sticker.locator(".placed-sticker__handle--ne");
  await expect(corner).toBeVisible();

  // A finger from the top-right corner in through the center, and on past it toward the bottom-left.
  const from = await middleOf(corner);
  const center = await middleOf(sticker);
  const path = Array.from({ length: 21 }, (_, i) => {
    const k = 1 - (2.2 * i) / 20;
    return { x: center.x + (from.x - center.x) * k, y: center.y + (from.y - center.y) * k };
  });
  const saved = savedScale(page, id);
  await touchStroke(page, await hand(page), path, FINGERTIP);
  expect(await saved).toBeCloseTo(S_MIN);
});
