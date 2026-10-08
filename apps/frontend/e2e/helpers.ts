import { randomUUID } from "node:crypto";
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import type { Leaf } from "../src/i18n/catalog.ts";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { phone } from "./phone.ts";
import { E2E_APP_PORT } from "./ports.ts";

const { app, explore, giving, receiving, stickerBoard, stickerCreation, stickers, tickets, ui } =
  strings;

/**
 * The suite's test, with a LINE friend's phone beside `page`: a browser context of its own, so its
 * own cookies and its own session.
 */
export const test = base.extend<{ friend: Page }>({
  // Not `use`: the React hooks lint would take Playwright's fixture callback for React's hook.
  friend: async ({ browser }, provide) => {
    const context = await browser.newContext({
      ...phone,
      baseURL: `http://localhost:${E2E_APP_PORT}`,
    });
    await provide(await context.newPage());
    await context.close();
  },
});

/**
 * A catalog string as the app shows it: its {{variables}} and <name/> components filled from `vars`,
 * other tags' words kept, and Japanese phrase breaks dropped.
 */
export function say(leaf: Leaf, language: Language, vars: Record<string, string | number> = {}) {
  const text = (language === "ja" ? leaf.ja : undefined) ?? leaf.en;
  const fill = (_: string, key: string) => String(vars[key] ?? "");
  return text
    .replaceAll("<wbr/>", "")
    .replace(/\{\{(\w+)\}\}/g, fill)
    .replace(/<(\w+)\/>/g, fill)
    .replace(/<\/?\w+>/g, "");
}

/** Matches text that starts with `prefix`, taken literally. */
export const startsWith = (prefix: string) =>
  new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

/** The board's Draw key, named for the daily tickets it would draw on. */
export function drawKeyName(language: Language, dailyTickets: number) {
  const daily = say(tickets.summary.daily_other, language, { count: dailyTickets });
  return say(stickerBoard.board.drawLabelWithTickets, language, {
    tickets: say(tickets.summary.left, language, { tickets: daily }),
  });
}

/**
 * Opens Croquis on a phone as someone new: LIFF Mock signs them in with a dev ID token for `?as=`,
 * which the API trusts under DEV_SIGN_IN. Resolves once their board is up.
 */
export async function signIn(page: Page, who: string, language: Language) {
  const name = `${who}-${randomUUID().slice(0, 8)}`;
  await page.goto(`/?as=${name}`);
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
  ).toBeVisible();
  return name;
}

/** Someone's handle as Croquis prints it: it starts as the LINE name LIFF Mock gives their `?as=` name. */
export const handleOf = (name: string) => `@${name.charAt(0).toUpperCase()}${name.slice(1)}`;

/** Flips your own sticker board over to its stat board. */
export async function flipToStatBoard(page: Page, language: Language) {
  const yourStats = say(stickerBoard.board.yourStats, language, { name: "" });
  await page.getByRole("button", { name: new RegExp(`${yourStats}$`) }).click();
}

/** Your stat board's Settings note: flips the board over and brings the note into view. */
export async function openSettings(page: Page, language: Language) {
  await flipToStatBoard(page, language);
  const settings = page.getByRole("region", { name: say(stickerBoard.settings.title, language) });
  await settings.scrollIntoViewIfNeeded();
  return settings;
}

/**
 * The drawing screen's canvas. On a begun sheet in Kyoto Seika Practice Mode its name goes on, after a
 * comma, with the pair; other names start with the word too, such as Japanese's clear tile.
 */
export const canvas = (page: Page, language: Language) =>
  page.getByLabel(
    new RegExp(`${startsWith(say(stickerCreation.canvas, language)).source}(?:$|[,、])`),
  );

/** Draws one stroke across the middle of the canvas, and waits for Undo to hold it. */
export async function drawStroke(page: Page, language: Language) {
  const sheet = canvas(page, language);
  // Waits until nothing, such as the last sealed card on its way out, covers the canvas.
  await sheet.hover();
  const box = await sheet.boundingBox();
  if (!box) throw new Error("The canvas isn't on screen");
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step++) await page.mouse.move(x + step * 12, y + step * 8);
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: say(stickerCreation.history.undo, language) }),
  ).toBeEnabled();
}

/** Taps the seal key once, which arms it and shows the chip with its 18+ box. */
export async function armSeal(page: Page, language: Language) {
  await page.getByRole("button", { name: say(stickerCreation.seal.label, language) }).click();
  return page.getByRole("checkbox", { name: say(stickerCreation.nsfw.label, language) });
}

/**
 * The armed key's second tap, which seals. Resolves with the sticker's number from the sealed card.
 * The armed key keeps moving, so it's tapped where it stands rather than waited on to hold still.
 */
export async function sealArmed(page: Page, language: Language) {
  const armed = page.getByRole("button", { name: say(stickerCreation.seal.tapAgain, language) });
  const box = await armed.boundingBox();
  if (!box) throw new Error("The armed seal key isn't on screen");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const card = page.getByRole("dialog", {
    name: startsWith(say(stickerCreation.sealedCard.title, language)),
  });
  const finePrint = card.getByText(/No\.\d+/);
  await expect(finePrint).toBeVisible();
  const no = (await finePrint.textContent())?.match(/No\.\d+/)?.[0];
  if (!no) throw new Error("The sealed card names no sticker number");
  return { card, no };
}

/** Draws a stroke and seals it, 18+ or not. Resolves with the sealed card and the sticker's number. */
export async function drawAndSeal(page: Page, language: Language, { nsfw = false } = {}) {
  await drawStroke(page, language);
  const nsfwBox = await armSeal(page, language);
  if (nsfw) await nsfwBox.check();
  return sealArmed(page, language);
}

/**
 * A sticker on your own board, found by its number. Only the board's own stickers count: the sticker
 * tray's slots are named by number too.
 */
export const boardSticker = (page: Page, language: Language, no: string) => {
  const board = page.getByRole("region", { name: say(stickerBoard.board.label, language) });
  return board
    .getByRole("button", { name: startsWith(`${no}、`) })
    .or(board.getByRole("button", { name: startsWith(`${no},`) }));
};

/** The mark over an 18+ sticker that's blurred for this viewer. */
export const blurredMark = (language: Language) => ({
  role: "img" as const,
  name: say(stickers.nsfw.veiled, language),
});

/** Opens a sticker on your own board in its sticker detail: a tap selects it, View opens it. */
export async function openDetail(page: Page, language: Language, no: string) {
  await boardSticker(page, language, no).click();
  await page.getByRole("button", { name: say(stickerBoard.toolbar.view, language) }).click();
  const detail = page.getByRole("dialog", { name: no });
  await expect(detail).toBeVisible();
  return detail;
}

/** Draw from the board, one stroke, seal, and back to the board. Resolves with the sticker's number. */
export async function sealFromBoard(page: Page, language: Language) {
  await page
    .getByRole("button", {
      name: startsWith(say(stickerBoard.board.drawLabelWithTickets, language)),
    })
    .click();
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
  return no;
}

/** Opens Giving for a sticker on your own board: a tap selects it, its toolbar's Give opens Giving. */
export async function giveFromBoard(page: Page, language: Language, no: string) {
  await boardSticker(page, language, no).click();
  await page
    .getByRole("toolbar", { name: no })
    .getByRole("button", { name: say(stickerBoard.toolbar.give, language) })
    .click();
}

/**
 * The Gift Claim Token from the app's own answer to packaging the gift, which the Gift Message's link
 * ends in. Ask before Giving packs, so the answer isn't missed.
 */
export function giftClaimTokenFrom(page: Page) {
  return page
    .waitForResponse(
      (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/gifts",
    )
    .then(async (response) => {
      const body: unknown = await response.json();
      const token =
        body !== null && typeof body === "object" && "giftClaimToken" in body
          ? body.giftClaimToken
          : null;
      if (typeof token !== "string") {
        throw new Error(`POST /api/gifts answered ${response.status()} with no Gift Claim Token`);
      }
      return token;
    });
}

/**
 * Giving, from its first screen: Send in a LINE chat drops the sticker in the open gift bag, and
 * LIFF Mock's friend picker sends the Gift Message; the bag closes, and Giving goes back to the board.
 */
export async function sendInLineChat(page: Page, language: Language, no: string) {
  const sheet = page.getByRole("dialog", { name: say(giving.give, language, { no }) });
  await sheet.getByRole("button", { name: say(giving.sheet.sendInChat, language) }).click();
  const bag = (state: "open" | "closed") =>
    page.getByRole("img", { name: startsWith(say(giving.giftBag.pictured[state], language)) });
  await expect(bag("open")).toBeVisible();
  const sent = page.getByRole("dialog", { name: say(giving.sent.title, language) });
  await expect(bag("closed")).toBeVisible();
  await sent.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(sent).toBeHidden();
}

/** Someone else's sticker board, opened from an Explore search for their handle. */
export async function openTheirBoard(page: Page, language: Language, handle: string) {
  await page.getByRole("button", { name: say(app.tabs.explore, language), exact: true }).click();
  await page.getByRole("searchbox", { name: say(explore.search.label, language) }).fill(handle);
  await page.getByRole("button", { name: handle }).click();
}

/** ReceiveGiftDialog, once its preview names the giver. */
const giftFrom = (page: Page, language: Language, giverHandle: string) =>
  page.getByRole("dialog", { name: say(receiving.title, language, { name: giverHandle }) });

/**
 * Pulls the gift bag's tab along the strip, as a finger does, until it tears free. The tab loops a
 * hint, so it's grabbed where it stands rather than waited on to hold still.
 */
async function pullTab(gift: Locator, language: Language) {
  const tab = gift.getByRole("slider", { name: say(giving.giftBag.pullTab, language) });
  await expect(tab).toBeVisible();
  const box = await tab.boundingBox();
  const page = gift.page();
  const width = page.viewportSize()?.width;
  if (!box || !width) throw new Error("The pull tab isn't on screen");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 16; step++)
    await page.mouse.move(x + ((width - 2 - x) * step) / 16, y);
  await page.mouse.up();
  await expect(tab).toHaveCount(0);
}

/** Pulls the tab and accepts the gift; the dialog closes onto the board. */
export async function unpackageAndAccept(page: Page, language: Language, giverHandle: string) {
  const gift = giftFrom(page, language, giverHandle);
  await pullTab(gift, language);
  await gift
    .getByRole("button", { name: say(receiving.gift.accept, language), exact: true })
    .click();
  await expect(gift).toBeHidden();
}

/** The sheet that asks, once a received sticker is on the board, to send its giver gratitude. */
export const gratitudeAsk = (page: Page, language: Language, giverHandle: string) =>
  page.getByRole("dialog", {
    name: say(receiving.sendGratitude.title, language, { name: giverHandle }),
  });

/** The Transfer Trail's row for a gift you received; the day it was received ends the row. */
export const receivedRow = (detail: Locator, language: Language, giverHandle: string) =>
  detail
    .getByRole("region", { name: say(stickerBoard.transferTrail.label, language) })
    .getByText(
      startsWith(
        say(stickerBoard.transferTrail.handOff.toYou, language, { giver: giverHandle, day: "" }),
      ),
    );
