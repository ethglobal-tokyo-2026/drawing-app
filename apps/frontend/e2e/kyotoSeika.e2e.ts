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
} from "./helpers.ts";

const { kyotoSeika, stickerBoard, stickerCreation, ui } = strings;
const language = "ja";
test.use({ locale: "ja-JP" });

/** The deal's clouds, a group named for screen readers. */
const subjectGroup = (page: Page) =>
  page.getByRole("group", { name: say(kyotoSeika.balloons.label, language) });

/** Each cloud is a toggle, named by its word: in Japanese the word alone. */
const toggles = (page: Page) => subjectGroup(page).locator("[aria-pressed]");
const toggle = (page: Page, word: string) =>
  subjectGroup(page).getByRole("button", { name: word, exact: true });

interface Dealt {
  word: string;
  picked: boolean;
}

/**
 * The subjects dealt, in their places, each with whether it's picked. The clouds all come at once, so
 * the first one showing means they all are.
 */
async function dealt(page: Page): Promise<Dealt[]> {
  await expect(toggles(page).first()).toBeAttached();
  return toggles(page).evaluateAll((keys) =>
    keys.map((key) => ({ word: key.ariaLabel ?? "", picked: key.ariaPressed === "true" })),
  );
}

/**
 * Rolls the die and waits until every place not picked was dealt another word, and every picked one
 * kept its word and its pick. Resolves with the new deal.
 */
async function roll(page: Page) {
  const before = await dealt(page);
  await page
    .getByRole("button", { name: say(kyotoSeika.balloons.reroll, language), exact: true })
    .click();
  await expect
    .poll(async () =>
      (await dealt(page)).every(({ word, picked }, place) =>
        before[place].picked
          ? picked && word === before[place].word
          : !picked && word !== before[place].word,
      ),
    )
    .toBe(true);
  return dealt(page);
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

test("Kyoto Seika Practice Mode: switched on in Settings, dealt, picked, timed and sealed with its pair", async ({
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

  // No two subjects alike, none picked, and Begin waits for two picks.
  const pickTwo = page.getByRole("button", {
    name: say(kyotoSeika.begin.pick, language),
    exact: true,
  });
  const begin = page.getByRole("button", {
    name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
  });
  const first = await dealt(page);
  expect(first.some(({ picked }) => picked)).toBe(false);
  expect(new Set(first.map(({ word }) => word)).size).toBe(first.length);
  await expect(pickTwo).toBeDisabled();

  // With nothing picked, a roll deals every place again.
  const rolled = await roll(page);

  // Picked in this order, so the pair keeps it rather than the places'.
  const [firstPick, secondPick] = [rolled[3].word, rolled[0].word];
  await toggle(page, firstPick).click();
  await expect(toggle(page, firstPick)).toHaveAttribute("aria-pressed", "true");
  await expect(pickTwo).toBeDisabled();
  await toggle(page, secondPick).click();
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "true");
  await expect(begin).toBeEnabled();

  // With two picked, the rest refuse a tap until one is unpicked.
  const rest = rolled.map(({ word }) => word).filter((w) => w !== firstPick && w !== secondPick);
  for (const word of rest)
    await expect(toggle(page, word)).toHaveAttribute("aria-disabled", "true");
  await toggle(page, rest[0]).click({ force: true });
  await expect(toggle(page, rest[0])).toHaveAttribute("aria-pressed", "false");
  await toggle(page, secondPick).click();
  await expect(toggle(page, secondPick)).toHaveAttribute("aria-pressed", "false");
  await expect(toggle(page, rest[0])).not.toHaveAttribute("aria-disabled", "true");
  await expect(pickTwo).toBeDisabled();
  await toggle(page, secondPick).click();
  await expect(begin).toBeEnabled();

  // A roll deals the rest again and never touches a pick.
  const kept = await roll(page);

  // A reload lands on the board, whose Draw key now continues the waiting sheet, with the same five
  // and the same picks.
  await page.reload();
  await page
    .getByRole("button", { name: say(stickerBoard.board.continueDrawing, language) })
    .click();
  expect(await dealt(page)).toEqual(kept);

  // Begin starts the full clock at once, and a tool sheet doesn't stop it.
  await begin.click();
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

  // The begun canvas carries the picked pair in the order picked, and so does the sealed sticker's
  // detail.
  const pair = { first: firstPick, second: secondPick };
  await expect(canvas(page, language)).toHaveAccessibleName(
    say(kyotoSeika.print.canvas, language, pair),
  );
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  const detail = await openDetail(page, language, no);
  await expect(detail.getByText(say(kyotoSeika.tag.spoken, language, pair))).toBeAttached();
});
