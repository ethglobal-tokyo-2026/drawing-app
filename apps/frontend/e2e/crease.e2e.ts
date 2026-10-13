import { expect, type Locator, type Page } from "@playwright/test";
import type { CreaseSide } from "../src/stickers/crease.ts";
import { boardSticker, handleOf, openTheirBoard, sealFromBoard, signIn, test } from "./helpers.ts";
import { tiltScreen } from "./screenTilt.ts";

const language = "en";

/** The middle of a sticker on screen. */
async function middleOf(sticker: Locator) {
  const box = await sticker.boundingBox();
  if (!box) throw new Error("The sticker isn't on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A sticker's crease, by the sticker's ID, on whichever board `page` shows. */
const creaseOf = (page: Page, id: string) =>
  page.locator(`[data-sticker-id="${id}"] .sticker-crease`);

/** How much of a crease's image lit from `side` shows now. */
const opacityOf = (crease: Locator, side: CreaseSide) =>
  crease
    .locator(`[data-side="${side}"]`)
    .evaluate((layer) => Number(getComputedStyle(layer).opacity));

/** A sticker once it has landed and stuck, with its ID. */
async function stuck(page: Page, no: string) {
  const sticker = boardSticker(page, language, no);
  await expect(sticker).not.toHaveClass(/is-landing/);
  const id = await sticker.getAttribute("data-sticker-id");
  if (!id) throw new Error(`${no} carries no sticker ID`);
  return { sticker, id };
}

test("a sticker over another shows the crease of the edge beneath, lit as the one light falls, on your board and to a visitor, none while it's in hand", async ({
  page,
  friend,
}) => {
  const me = await signIn(page, "crease", language);
  const under = await stuck(page, await sealFromBoard(page, language));
  const over = await stuck(page, await sealFromBoard(page, language));

  // Dragged over the first sticker's edge, the second sticker shows a crease once it's down; the
  // one beneath, baked in the same batch before it, shows none.
  const from = await middleOf(over.sticker);
  const onto = await middleOf(under.sticker);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(onto.x + 24, onto.y + 24, { steps: 12 });
  await page.mouse.up();
  await expect(creaseOf(page, over.id)).toHaveCount(1);
  await expect(creaseOf(page, under.id)).toHaveCount(0);

  // Picked up again, it leaves the edge beneath, and its crease comes back once it's put down.
  const held = await middleOf(over.sticker);
  await page.mouse.move(held.x, held.y);
  await page.mouse.down();
  await page.mouse.move(held.x + 16, held.y + 10, { steps: 8 });
  await expect(creaseOf(page, over.id)).toHaveCount(0);
  await page.mouse.up();
  await expect(creaseOf(page, over.id)).toHaveCount(1);

  // Device tilt moves the one light, and the crease's lit side follows it: with the light at the
  // screen's top left, the side it rests on; swung to the bottom right, the opposite side.
  const crease = creaseOf(page, over.id);
  await tiltScreen(page, 8, -32);
  await expect(crease).toHaveCSS("--lx", "-1.000");
  await expect(crease).toHaveCSS("--ly", "-1.000");
  await expect.poll(() => opacityOf(crease, "topLeft")).toBeCloseTo(1, 1);
  await expect.poll(() => opacityOf(crease, "bottomRight")).toBe(0);
  await tiltScreen(page, 72, 90);
  await expect(crease).toHaveCSS("--ly", "1.000");
  await expect.poll(() => opacityOf(crease, "bottomRight")).toBeGreaterThan(0.3);
  await expect.poll(() => opacityOf(crease, "topLeft")).toBeLessThan(0.3);

  // Someone else looking at the board sees the same crease.
  await signIn(friend, "visitor", language);
  await openTheirBoard(friend, language, handleOf(me));
  await expect(creaseOf(friend, over.id)).toHaveCount(1);
  await expect(creaseOf(friend, under.id)).toHaveCount(0);
});
