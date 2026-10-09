import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  canvas,
  drawAndSeal,
  drawKeyName,
  openDetail,
  openSettings,
  say,
  signIn,
  startsWith,
} from "./helpers.ts";

const { kyotoSeika, stickerBoard, stickerCreation, ui } = strings;
const language = "ja";
test.use({ locale: "ja-JP" });

/** What a cloud's reroll is named before its subject, such as "振り直し：". */
const rollPrefix = say(kyotoSeika.balloons.roll, language).replace(/、$/, "");

/** The pair dealt to the sheet, as each cloud's reroll names it: "word、english". */
async function dealtPair(page: Page) {
  const rolls = page.getByRole("button", { name: startsWith(rollPrefix) });
  await expect(rolls).toHaveCount(2);
  const names = await rolls.evaluateAll((keys) => keys.map((key) => key.ariaLabel ?? ""));
  return names.map((name) => name.slice(rollPrefix.length));
}

const runningClock = new RegExp(
  `^${say(stickerCreation.timer.status.running, language, { time: "TIME" }).replace("TIME", "(\\d+):(\\d\\d)")}$`,
);

/** The seconds left on the timer dot while its clock runs, or null while it waits or is paused. */
async function secondsLeft(page: Page) {
  const timer = page.getByRole("button", {
    name: say(stickerCreation.timer.label, language),
    exact: true,
  });
  const said = await timer.evaluate((dot) => {
    const id = dot.getAttribute("aria-describedby");
    return id ? (document.getElementById(id)?.textContent ?? "") : "";
  });
  const match = said.match(runningClock);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

test("Kyoto Seika Practice Mode: switched on in Settings, dealt, timed and sealed with its pair", async ({
  page,
}) => {
  await signIn(page, "kyoto", language);
  const settings = await openSettings(page, language);
  const mode = settings.getByRole("switch", {
    name: say(stickerBoard.settings.kyotoSeika.spokenName, language),
  });

  // The censor bar is a sight gag over the name: a tap peels on its label and leaves the switch alone.
  // It's hidden from screen readers, so it's found by the character it hides.
  const bar = settings
    .getByText(say(stickerBoard.settings.kyotoSeika.hidden, language), { exact: true })
    .locator("xpath=..");
  await bar.tap();
  await expect(settings.getByText(say(kyotoSeika.censor.why, language))).toBeVisible();
  await expect(mode).not.toBeChecked();

  await mode.click();
  await expect(mode).toBeChecked();
  await page.getByRole("button", { name: say(stickerBoard.statBoard.flipBack, language) }).click();
  await page
    .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
    .click();

  // Two subjects; a reroll changes its own and leaves the other.
  const dealt = await dealtPair(page);
  await page.getByRole("button", { name: `${rollPrefix}${dealt[0]}` }).click();
  await expect.poll(async () => (await dealtPair(page))[0]).not.toBe(dealt[0]);
  const rerolled = await dealtPair(page);
  expect(rerolled[1]).toBe(dealt[1]);

  // A reload lands on the board, whose Draw key now continues the waiting sheet, with the same pair.
  await page.reload();
  await page
    .getByRole("button", { name: say(stickerBoard.board.continueDrawing, language) })
    .click();
  expect(await dealtPair(page)).toEqual(rerolled);

  // Begin starts the full clock at once, and a tool sheet doesn't stop it.
  await page
    .getByRole("button", {
      name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
    })
    .click();
  await expect.poll(() => secondsLeft(page)).toBeGreaterThan(KYOTO_SEIKA_TIME_USED_S - 60);
  await page
    .getByRole("button", { name: say(stickerCreation.tools.color, language), exact: true })
    .click();
  const colorSheet = page.getByRole("dialog", {
    name: say(stickerCreation.colorSheet.title, language),
  });
  await expect(colorSheet).toBeVisible();
  const atOpen = await secondsLeft(page);
  expect(atOpen).not.toBeNull();
  await expect.poll(() => secondsLeft(page)).toBeLessThan(atOpen ?? 0);
  await expect(colorSheet).toBeVisible();
  await colorSheet
    .getByRole("button", {
      name: say(ui.sheet.close, language, {
        label: say(stickerCreation.colorSheet.title, language),
      }),
    })
    .click();
  await expect(colorSheet).toBeHidden();

  // The begun canvas carries the pair, and so does the sealed sticker's detail.
  const [first, second] = rerolled.map((subject) => subject.split("、")[0]);
  await expect(canvas(page, language)).toHaveAccessibleName(
    say(kyotoSeika.print.canvas, language, { first, second }),
  );
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  await expect(
    detail.getByText(say(kyotoSeika.tag.spoken, language, { first, second })),
  ).toBeAttached();
});
