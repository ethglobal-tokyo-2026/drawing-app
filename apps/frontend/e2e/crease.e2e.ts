import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  boardSticker,
  flipToStatBoard,
  handleOf,
  openTheirBoard,
  say,
  sealFromBoard,
  signIn,
  test,
} from "./helpers.ts";

const language = "en";
const { developer, statBoard } = strings.stickerBoard;

/** The middle of a sticker on screen. */
async function middleOf(sticker: Locator) {
  const box = await sticker.boundingBox();
  if (!box) throw new Error("The sticker isn't on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A sticker's crease, by the sticker's ID, on whichever board `page` shows. */
const creaseOf = (page: Page, id: string) =>
  page.locator(`[data-sticker-id="${id}"] .sticker-crease`);

/** A sticker once it has landed and stuck, with its ID. */
async function stuck(page: Page, no: string) {
  const sticker = boardSticker(page, language, no);
  await expect(sticker).not.toHaveClass(/is-landing/);
  const id = await sticker.getAttribute("data-sticker-id");
  if (!id) throw new Error(`${no} carries no sticker ID`);
  return { sticker, id };
}

/** Switches creases on or off for `page`'s device on its developer slip, and flips back to the board. */
async function setCreases(page: Page, on: boolean) {
  await flipToStatBoard(page, language);
  const slip = page.getByRole("button", { name: say(developer.label, language) });
  const show = page.getByRole("checkbox", { name: say(developer.creases.show, language) });
  // The slip opens from a button only keyboards and screen readers find, so it's worked by keyboard.
  // Opened before the board comes to rest it goes back under, and the turn and the slip each move
  // focus as they settle, which can take a key press with them: so each step goes again until it holds.
  await expect(async () => {
    if (await slip.isVisible()) await slip.press("Enter");
    if ((await show.isChecked()) !== on) await show.press("Space");
    await expect(show).toBeChecked({ checked: on, timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: say(statBoard.flipBack, language) }).click();
}

test("a sticker over another shows the crease of the edge beneath, on your board and to a visitor, none while it's in hand, and none on a device that switches creases off", async ({
  page,
  friend,
}) => {
  const me = await signIn(page, "crease", language);
  await setCreases(page, true);
  const under = await stuck(page, await sealFromBoard(page, language));
  const over = await stuck(page, await sealFromBoard(page, language));
  // A new sticker lands clear of the others, so nothing has a crease yet.
  await expect(page.locator(".sticker-crease")).toHaveCount(0);

  // Dragged over the first sticker's edge, the second sticker shows a crease once it's down; the
  // one beneath shows none.
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

  // Switched off on this device's developer slip, the crease goes.
  await setCreases(page, false);
  await expect(creaseOf(page, over.id)).toHaveCount(0);

  // Someone else looking at the board, with creases on, sees the same crease.
  await signIn(friend, "visitor", language);
  await setCreases(friend, true);
  await openTheirBoard(friend, language, handleOf(me));
  await expect(creaseOf(friend, over.id)).toHaveCount(1);
  await expect(creaseOf(friend, under.id)).toHaveCount(0);
});
