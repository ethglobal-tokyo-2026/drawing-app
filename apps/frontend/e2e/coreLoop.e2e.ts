import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { boardSticker, drawAndSeal, drawKeyName, say, signIn } from "./helpers.ts";

const language = "en";

test("the core loop: Draw, one stroke, seal, and the sticker lands on the board", async ({
  page,
}) => {
  await signIn(page, "smoke", language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(strings.ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
  await expect(
    page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY - 1) }),
  ).toBeVisible();
});
