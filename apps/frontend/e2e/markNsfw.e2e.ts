import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { blurredMark, drawAndSeal, drawKeyName, openDetail, say, signIn } from "./helpers.ts";

const { stickerBoard, ui } = strings;
const { markNsfw } = stickerBoard.detail;
const language = "en";

test("Mark 18+ after seal: the Original Artist marks it from its detail, behind its confirm", async ({
  page,
}) => {
  await signIn(page, "artist", language);
  await page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }).click();
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();

  // The Original Artist marks it from its detail, only once the confirm is answered.
  const detail = await openDetail(page, language, no);
  await expect(detail.getByRole("img", blurredMark(language))).toHaveCount(0);
  await detail.getByRole("button", { name: say(markNsfw.open, language) }).click();
  const confirm = detail.getByRole("group", { name: say(markNsfw.title, language, { no }) });
  await expect(detail.getByRole("img", blurredMark(language))).toHaveCount(0);
  await confirm.getByRole("button", { name: say(markNsfw.confirm, language), exact: true }).click();
  await expect(detail.getByText(say(markNsfw.doneBlurred, language, { no }))).toBeVisible();
  await expect(detail.getByRole("img", blurredMark(language)).first()).toBeVisible();
  await expect(detail.getByRole("button", { name: say(markNsfw.open, language) })).toHaveCount(0);
});
