import { expect } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  giveFromBoard,
  chooseLanguage,
  openSettings,
  say,
  sealFromBoard,
  sendPreparedGift,
  signIn,
  startsWith,
  test,
} from "./helpers.ts";

const { giving, stickerBoard, ui } = strings;

for (const language of ["en", "ja"] as const) {
  test(`A confirmed LINE send stays Sent in the tray and detail while its report fails, ${language}`, async ({
    page,
  }, testInfo) => {
    await signIn(page, "sent-report", "en");
    if (language === "ja") {
      await openSettings(page, "en");
      await chooseLanguage(page, "en", language);
      await page.goto("/");
      await expect(
        page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
      ).toBeVisible();
    }
    const no = await sealFromBoard(page, language);
    let reports = 0;
    await page.route(/\/api\/gifts\/[^/]+\/shared$/, (route) => {
      reports++;
      return route.fulfill({
        status: 503,
        json: { error: "unavailable", detail: "Gift confirmation could not be saved" },
      });
    });
    await giveFromBoard(page, language, no);
    await sendPreparedGift(page, language);
    const sent = page.getByRole("dialog", { name: say(giving.sent.title, language) });
    await expect(sent).toBeVisible();
    await expect.poll(() => reports).toBeGreaterThan(0);
    await sent.getByRole("button", { name: say(ui.backToBoard, language) }).click();
    await expect(sent).toBeHidden();

    const inspect = async () => {
      const zipper = page.getByRole("button", {
        name: startsWith(say(stickerBoard.tray.zipper, language)),
      });
      await zipper.press("ArrowDown");
      await expect(zipper).toHaveAttribute("aria-expanded", "true");
      const slot = page.locator('.tray__sheet.is-top .tray__slot[data-state="onItsWay"]');
      await expect(slot).toHaveCount(1);
      await expect(page.locator(".tray__gift-label")).toHaveText(
        say(stickerBoard.tray.giftStatus.onItsWay, language),
      );
      await testInfo.attach("sent-tray", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await slot.click();
      const detail = page.getByRole("dialog", { name: no, exact: true });
      await expect(
        detail.getByText(say(stickerBoard.detail.onItsWay, language), { exact: true }),
      ).toBeVisible();
      await expect(
        detail.getByRole("button", {
          name: say(stickerBoard.detail.continueSending, language),
          exact: true,
        }),
      ).toHaveCount(0);
      await detail
        .getByRole("button", { name: say(giving.inTheBag.takeOut, language), exact: true })
        .click();
      await expect(detail.getByText(say(stickerBoard.detail.takeOut.lead, language))).toBeVisible();
      await testInfo.attach("take-out-warning", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await detail
        .getByRole("button", {
          name: say(stickerBoard.detail.takeOut.cancel, language),
          exact: true,
        })
        .click();
      await detail
        .getByRole("button", { name: say(ui.backToBoard, language), exact: true })
        .click();
      await expect(detail).toBeHidden();
    };
    await inspect();
    // A fresh page recovers the matching local LINE outcome while the API still has its pending report.
    await page.reload();
    await inspect();
  });
}
