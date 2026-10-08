import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import type { Leaf } from "../src/i18n/catalog.ts";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";

const { stickerBoard, stickerCreation, stickers, tickets } = strings;

/** A catalog string as the app shows it: its {{variables}} filled, and Japanese phrase breaks dropped. */
export function say(leaf: Leaf, language: Language, vars: Record<string, string | number> = {}) {
  const text = (language === "ja" ? leaf.ja : undefined) ?? leaf.en;
  return text
    .replaceAll("<wbr/>", "")
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
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

/** Your stat board's Settings note: flips the board over and brings the note into view. */
export async function openSettings(page: Page, language: Language) {
  const yourStats = say(stickerBoard.board.yourStats, language, { name: "" });
  await page.getByRole("button", { name: new RegExp(`${yourStats}$`) }).click();
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

/** A sticker on the board you're looking at, found by its number. */
export const boardSticker = (page: Page, no: string) =>
  page
    .getByRole("button", { name: startsWith(`${no}、`) })
    .or(page.getByRole("button", { name: startsWith(`${no},`) }));

/** The mark over an 18+ sticker that's blurred for this viewer. */
export const blurredMark = (language: Language) => ({
  role: "img" as const,
  name: say(stickers.nsfw.veiled, language),
});

/** Opens a sticker on your own board in its sticker detail: a tap selects it, View opens it. */
export async function openDetail(page: Page, language: Language, no: string) {
  await boardSticker(page, no).click();
  await page.getByRole("button", { name: say(stickerBoard.toolbar.view, language) }).click();
  const detail = page.getByRole("dialog", { name: no });
  await expect(detail).toBeVisible();
  return detail;
}
