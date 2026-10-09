import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import type { Language } from "../src/i18n/language.ts";
import { chooseLanguage, drawKeyName, openSettings, say, signIn } from "./helpers.ts";

const { stickerBoard } = strings;

/** Marks the page in memory, where a page load would wipe the mark. */
const markPage = (page: Page) => page.evaluate(() => Object.assign(window, { croquisMark: true }));
const stillMarked = (page: Page) => page.evaluate(() => "croquisMark" in window);

/** Turns the stat board back over to the sticker board, and finds its Draw key in `language`. */
async function flipBackToDraw(page: Page, language: Language) {
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await expect(
    page.getByRole("button", { name: drawKeyName(language, DAILY_TICKETS_PER_DAY) }),
  ).toBeVisible();
}

test("Language: 日本語 in Settings switches Croquis in place, the account keeps it through a reload, and English switches back", async ({
  page,
}) => {
  await signIn(page, "lang", "en");
  await openSettings(page, "en");
  await markPage(page);
  await chooseLanguage(page, "en", "ja");
  expect(await stillMarked(page)).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await flipBackToDraw(page, "ja");

  // With nothing kept on this phone, only the account can start the app in Japanese.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, "ja") }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: drawKeyName("ja", DAILY_TICKETS_PER_DAY) }),
  ).toBeVisible();

  await openSettings(page, "ja");
  await markPage(page);
  await chooseLanguage(page, "ja", "en");
  expect(await stillMarked(page)).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await flipBackToDraw(page, "en");
});
