import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { PULL } from "../src/receiving/pullTab.ts";
import {
  boardSticker,
  giftClaimTokenFrom,
  giftFrom,
  giveFromBoard,
  handleOf,
  openDetail,
  openTheirBoard,
  pullTabBy,
  pullTabIn,
  say,
  sealFromBoard,
  sendInLineChat,
  signIn,
  test,
} from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { giving, receiving, stickerBoard, ui } = strings;
const language = "en";
/** The iPad of ./ipad.ts held on its side. */
const IPAD_SIDEWAYS = { width: 1180, height: 820 };
/** The same iPad on its side in Safari, under its toolbar. */
const IPAD_SIDEWAYS_IN_SAFARI = { width: 1180, height: 734 };
/** An iPhone's home indicator safe area, standing in for the one Playwright never reports. */
const HOME_INDICATOR = 34;

/** Signs someone new in and seals one sticker on their board. Resolves with its number. */
async function signInWithASticker(page: Page, who: string) {
  await signIn(page, who, language);
  return sealFromBoard(page, language);
}

/** Where `locator` comes to rest once its own animations, such as a card's rise, end. */
async function restingBox(locator: Locator) {
  await locator.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = await locator.boundingBox();
  if (!box) throw new Error("not on screen");
  return { ...box, cx: box.x + box.width / 2 };
}

/** A length custom property, such as `--card-w`, as `locator` reads it. */
const lengthOf = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name)), property);

/** A card as wide as `--card-w`, in the middle of the page. */
async function expectCardInTheMiddle(page: Page, card: Locator) {
  const box = await restingBox(card);
  expect(box.width).toBeCloseTo(await lengthOf(card, "--card-w"), 0);
  expect(Math.abs(box.cx - (page.viewportSize()?.width ?? 0) / 2)).toBeLessThanOrEqual(2);
}

/** The class of what a tap at the middle of the tab row's lead, where a board's key stands, lands on. */
const atTheLead = (page: Page) =>
  page.locator(".tabs-lead").evaluate((lead) => {
    const { x, y, width, height } = lead.getBoundingClientRect();
    return document.elementFromPoint(x + width / 2, y + height / 2)?.getAttribute("class") ?? null;
  });

test.describe("On an iPad", () => {
  test.use(ipad);

  test("Give from your board is one card in the middle, the sticker at its head, and its X closes it", async ({
    page,
  }) => {
    const no = await signInWithASticker(page, "giver");
    await giveFromBoard(page, language, no);
    const card = page.getByRole("dialog", { name: say(giving.give, language, { no }) });
    await expectCardInTheMiddle(page, card);
    const sticker = await restingBox(page.locator(".giving__figure"));
    const cardBox = await restingBox(card);
    expect(sticker.y + sticker.height).toBeLessThanOrEqual(cardBox.y);
    // The sticker, its fine print and the card stand in the middle as one group.
    const group = await restingBox(page.locator(".giving__sticker"));
    const view = page.viewportSize()?.height ?? 0;
    expect(Math.abs((group.y + cardBox.y + cardBox.height) / 2 - view / 2)).toBeLessThanOrEqual(2);
    const label = say(giving.give, language, { no });
    await card
      .getByRole("button", { name: say(ui.sheet.close, language, { label }), exact: true })
      .tap();
    await expect(card).toBeHidden();
  });

  test("Give on someone's board opens the picker as a card, its scrim over the tab row's Give", async ({
    page,
    friend,
  }) => {
    const handle = handleOf(await signIn(friend, "artist", language));
    await signInWithASticker(page, "visitor");
    await openTheirBoard(page, language, handle);
    await page
      .getByRole("button", { name: say(stickerBoard.artistBoard.give, language), exact: true })
      .tap();
    const card = page.getByRole("dialog", {
      name: say(giving.giveSheet.title, language, { name: handle }),
    });
    await expectCardInTheMiddle(page, card);
    expect(await atTheLead(page)).toContain("giving__scrim");
  });

  test("the sticker detail splits sideways, and is one phone-width column upright", async ({
    page,
  }) => {
    const no = await signInWithASticker(page, "artist");
    const detail = await openDetail(page, language, no);
    const columnW = await lengthOf(detail, "--column-w");
    const column = detail.locator(".sticker-detail__column");
    const upright = await restingBox(column);
    expect(upright.width).toBeCloseTo(columnW, 0);
    const main = await restingBox(detail.locator(".sticker-detail__main"));
    expect(Math.abs(upright.cx - main.cx)).toBeLessThanOrEqual(2);
    await page.setViewportSize(IPAD_SIDEWAYS);
    const stage = await restingBox(detail.locator(".sticker-detail__stage"));
    const sideways = await restingBox(column);
    expect(sideways.x).toBeGreaterThanOrEqual(stage.x + stage.width);
    expect(sideways.width).toBeCloseTo(columnW, 0);
  });

  for (const viewport of [IPAD_SIDEWAYS_IN_SAFARI, ipad.viewport]) {
    test(`at ${viewport.width} × ${viewport.height} the gift unwrap grows, centered above the home indicator, and its tab tears at a finger's pull`, async ({
      page,
      friend,
    }) => {
      const giver = handleOf(await signIn(friend, "giver", language));
      const no = await sealFromBoard(friend, language);
      await giveFromBoard(friend, language, no);
      const giftClaimToken = giftClaimTokenFrom(friend);
      await sendInLineChat(friend, language, no);
      await page.setViewportSize(viewport);
      await signIn(page, "receiver", language);
      await page.goto(`/g/${await giftClaimToken}`);
      const gift = giftFrom(page, language, giver);
      const tab = pullTabIn(gift, language);
      await expect(tab).toBeVisible();
      await page.evaluate((inset) => {
        document.documentElement.style.setProperty("--foot-inset", `${inset}px`);
        return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      }, HOME_INDICATOR);

      // The bag is drawn larger than its phone's size.
      const sleeve = gift.locator(".gift-bag__back");
      const scale = (await restingBox(sleeve)).width / (await lengthOf(sleeve, "--sw"));
      expect(scale).toBeGreaterThan(1);
      // The giver down to the hint stand in the middle of the room above the home indicator.
      const group = await restingBox(gift.locator(".receive-gift__unwrap"));
      const hint = await restingBox(gift.locator(".receive-gift__hint"));
      const room = viewport.height - HOME_INDICATOR;
      expect(Math.abs(group.cx - viewport.width / 2)).toBeLessThanOrEqual(2);
      expect(Math.abs((group.y + hint.y + hint.height) / 2 - room / 2)).toBeLessThanOrEqual(2);
      expect(hint.y + hint.height).toBeLessThanOrEqual(room);

      // A pull is as long on screen as the bag is drawn: just short of the snap springs back, just
      // past it tears the bag, and Accept shows.
      const toSnap = (PULL.snapAt / PULL.gain) * PULL.travelPx * scale;
      await pullTabBy(tab, toSnap * 0.9);
      await expect(tab).toHaveAttribute("aria-valuenow", "0");
      await pullTabBy(tab, toSnap * 1.1);
      await expect(tab).toHaveCount(0);
      await expect(
        gift.getByRole("button", { name: say(receiving.gift.accept, language), exact: true }),
      ).toBeVisible();
    });
  }
});

test("a sent gift's detail says it's on its way, and Take it out asks before it puts Give back", async ({
  page,
}) => {
  const no = await signInWithASticker(page, "giver");
  const other = await sealFromBoard(page, language);
  await giveFromBoard(page, language, no);
  await sendInLineChat(page, language, no);
  await (
    await openDetail(page, language, other)
  )
    .getByRole("navigation", { name: say(stickerBoard.detail.yourStickers, language) })
    .getByRole("button", { name: no, exact: true })
    .click();
  // The detail is named for the sticker it shows.
  const detail = page.getByRole("dialog", { name: no });
  await expect(detail.getByText(say(stickerBoard.detail.onItsWay, language))).toBeVisible();
  await detail.getByRole("button", { name: say(giving.inTheBag.takeOut, language) }).click();
  const ask = detail.getByRole("group", {
    name: say(stickerBoard.detail.takeOut.title, language, { no }),
  });
  await expect(
    ask.getByRole("button", { name: say(stickerBoard.detail.takeOut.cancel, language) }),
  ).toBeFocused();
  await ask.getByRole("button", { name: say(giving.inTheBag.takeOut, language) }).click();
  await expect(
    detail.getByRole("button", { name: say(stickerBoard.detail.give, language), exact: true }),
  ).toBeFocused();
  await detail.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
});

test("a sheet over the tabs pads the home indicator", async ({ page }) => {
  const no = await signInWithASticker(page, "giver");
  await giveFromBoard(page, language, no);
  const sheet = page.getByRole("dialog", { name: say(giving.give, language, { no }) });
  const footPadding = () => sheet.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
  const unpadded = await footPadding();
  await page.evaluate(
    (inset) => document.documentElement.style.setProperty("--foot-inset", `${inset}px`),
    HOME_INDICATOR,
  );
  expect(await footPadding()).toBe(unpadded + HOME_INDICATOR);
});
