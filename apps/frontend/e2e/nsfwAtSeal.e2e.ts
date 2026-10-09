import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  blurredMark,
  boardSticker,
  drawAndSeal,
  drawKeyName,
  drawStroke,
  nsfwSwitch,
  openSealSheet,
  say,
  sealOnSheet,
  signIn,
} from "./helpers.ts";

const { stickerCreation, ui } = strings;
const language = "en";

test("18+ at seal: the switch marks the sticker, and the next sheet starts with it off", async ({
  page,
}) => {
  await signIn(page, "seal18", language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  const marked = await drawAndSeal(page, language, { nsfw: true });
  await marked.card
    .getByRole("button", { name: say(stickerCreation.sealedCard.keepDrawing, language) })
    .click();

  await drawStroke(page, language);
  await openSealSheet(page, language);
  await expect(nsfwSwitch(page, language)).not.toBeChecked();
  const plain = await sealOnSheet(page, language);
  await plain.card.getByRole("button", { name: say(ui.backToBoard, language) }).click();

  // Without the NSFW opt-in, the Original Artist sees their own 18+ sticker blurred too.
  await expect(
    boardSticker(page, language, marked.no).getByRole("img", blurredMark(language)),
  ).toBeVisible();
  await expect(boardSticker(page, language, plain.no)).toBeVisible();
  await expect(
    boardSticker(page, language, plain.no).getByRole("img", blurredMark(language)),
  ).toHaveCount(0);
});
