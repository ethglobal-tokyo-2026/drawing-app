import { randomUUID } from "node:crypto";
import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { test as base, expect, type Locator, type Page } from "@playwright/test";
import type { Leaf } from "../src/i18n/catalog.ts";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { phone } from "./phone.ts";
import { E2E_APP_PORT } from "./ports.ts";

const {
  app,
  explore,
  giving,
  gratitude,
  receiving,
  shop,
  stickerBoard,
  stickerCreation,
  stickers,
  tickets,
  ui,
} = strings;

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

/**
 * A catalog string for `count`, in the plural form `language` gives it, as i18next picks it:
 * `<key>_one` for English's one, `<key>_other` otherwise.
 */
export function sayCount<Key extends string>(
  leaves: NoInfer<Record<`${Key}_other`, Leaf> & Partial<Record<`${Key}_one`, Leaf>>>,
  key: Key,
  language: Language,
  count: number,
) {
  const forms: Partial<Record<string, Leaf>> = leaves;
  const one = new Intl.PluralRules(language).select(count) === "one";
  const leaf = (one ? forms[`${key}_one`] : undefined) ?? forms[`${key}_other`];
  if (!leaf) throw new Error(`The catalog has no ${key}_other`);
  return say(leaf, language, { count });
}

/**
 * Matches text that starts with `prefix`, taken literally but for its spaces: a time such as
 * 8:00 AM can be written with a narrow no-break space.
 */
export const startsWith = (prefix: string) =>
  new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}`);

/** The board's Draw key, named for the tickets it would draw on: `left` of `kind`, the only kind left. */
export function drawKeyName(language: Language, left: number, kind: "daily" | "reserve" = "daily") {
  return say(stickerBoard.board.drawLabelWithTickets, language, {
    tickets: say(tickets.summary.left, language, {
      tickets: sayCount(tickets.summary, kind, language, left),
    }),
  });
}

/** The board's Draw key, whatever tickets it names. */
export const drawKey = (page: Page, language: Language) =>
  page.getByRole("button", {
    name: startsWith(say(stickerBoard.board.drawLabelWithTickets, language)),
  });

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
 * Chooses `to` as Croquis's language in the open Settings note, which reads in `from`, and waits for
 * the note to read in `to`, with that choice picked and taking picks again.
 */
export async function chooseLanguage(page: Page, from: Language, to: Language) {
  const { language } = stickerBoard.settings;
  const choices = (named: Language) =>
    page
      .getByRole("region", { name: say(stickerBoard.settings.title, named) })
      .getByRole("radiogroup", { name: say(language.title, named) });
  await choices(from)
    .getByRole("radio", { name: say(language.names[to], from) })
    .click();
  // Saved and in place: the choice is named in its own language, and takes picks again.
  await expect(
    choices(to).getByRole("radio", { name: say(language.names[to], to), checked: true }),
  ).toBeVisible();
  await expect(choices(to)).not.toHaveAttribute("aria-disabled");
}

/**
 * The drawing screen's canvas. On a begun sheet in Kyoto Seika Practice Mode its name goes on, after a
 * comma, with the pair; other names start with the word too, such as Japanese's clear tile.
 */
export const canvas = (page: Page, language: Language) =>
  page.getByLabel(
    new RegExp(`${startsWith(say(stickerCreation.canvas, language)).source}(?:$|[,、])`),
  );

/**
 * Draws one stroke across the middle of the canvas, and waits for Undo to hold it. A fresh sheet takes
 * no ink until the server answers its ticket's spend, so a stroke it refused is drawn again.
 */
export async function drawStroke(page: Page, language: Language) {
  const sheet = canvas(page, language);
  const undo = page.getByRole("button", { name: say(stickerCreation.history.undo, language) });
  await expect(async () => {
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
    await expect(undo).toBeEnabled({ timeout: 1_000 });
  }).toPass();
}

/** The seal sheet's 18+ switch, named for screen readers. */
export const nsfwSwitch = (page: Page, language: Language) =>
  page.getByRole("switch", { name: say(stickerCreation.sealSheet.nsfwLabel, language) });

/**
 * The seal sheet, in its regular or time's-up state: found by its 18+ switch, since its title's
 * Japanese carries phrase breaks.
 */
const sealSheet = (page: Page, language: Language) =>
  page.getByRole("dialog").filter({ has: nsfwSwitch(page, language) });

/**
 * Taps the seal key, which opens the seal sheet, and resolves with the sheet once it has risen. The
 * drawing screen holds still as it rises: focus moving into the sheet mustn't scroll the screen to it.
 */
export async function openSealSheet(page: Page, language: Language) {
  const screen = page.locator(".drawing-screen");
  await screen.evaluate((el) => {
    el.dataset.mostScrolled = "0";
    el.addEventListener("scroll", () => {
      el.dataset.mostScrolled = String(Math.max(Number(el.dataset.mostScrolled), el.scrollTop));
    });
  });
  await page.getByRole("button", { name: say(stickerCreation.seal.label, language) }).click();
  const sheet = sealSheet(page, language);
  await expect(sheet).toBeVisible();
  await sheet.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((rise) => rise.finished));
    // A scroll is heard at the next frame.
    await new Promise(requestAnimationFrame);
  });
  expect(await screen.getAttribute("data-most-scrolled")).toBe("0");
  return sheet;
}

/** The seal sheet's Seal, which seals. Resolves with the sealed card and the sticker's number. */
export async function sealOnSheet(page: Page, language: Language) {
  await sealSheet(page, language)
    .getByRole("button", { name: say(stickerCreation.sealSheet.seal, language), exact: true })
    .click();
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
  await openSealSheet(page, language);
  if (nsfw) await nsfwSwitch(page, language).check();
  return sealOnSheet(page, language);
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
  await drawKey(page, language).click();
  const { card, no } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
  return no;
}

/** Spends someone new's daily tickets through the app: a sticker sealed on each. */
export async function spendEveryDailyTicket(page: Page, language: Language) {
  for (let left = DAILY_TICKETS_PER_DAY; left > 0; left--) {
    await expect(page.getByRole("button", { name: drawKeyName(language, left) })).toBeVisible();
    await sealFromBoard(page, language);
  }
}

/** The signed-in person's user ID, as the API answers their own session. */
export async function signedInUserId(page: Page) {
  const body = await page.evaluate(async (): Promise<unknown> => (await fetch("/api/me")).json());
  const me = body !== null && typeof body === "object" && "me" in body ? body.me : null;
  const id = me !== null && typeof me === "object" && "id" in me ? me.id : null;
  if (typeof id !== "string") throw new Error(`GET /api/me named no one: ${JSON.stringify(body)}`);
  return id;
}

/** Opens the Shop tab. Resolves with its reserve tickets section. */
export async function openShop(page: Page, language: Language) {
  await page.getByRole("button", { name: say(app.tabs.shop, language), exact: true }).click();
  return page.getByRole("region", { name: say(shop.reserve.title, language) });
}

/** The reserve ticket checkout, over the Shop, the board or the drawing screen. */
export const checkout = (page: Page, language: Language) =>
  page.getByRole("dialog", { name: say(tickets.checkout.title, language) });

/** Opens the reserve ticket checkout from the Shop's reserve tickets section. */
export async function openCheckoutFromShop(page: Page, language: Language) {
  const reserve = await openShop(page, language);
  await reserve.getByRole("button", { name: say(shop.reserve.buy, language) }).click();
  const card = checkout(page, language);
  await expect(card).toBeVisible();
  return card;
}

/** A pack in the reserve ticket checkout, by how many tickets it holds. */
export const checkoutPack = (card: Locator, language: Language, count: number) =>
  card.getByRole("radio", {
    name: startsWith(sayCount(tickets.checkout, "pack", language, count)),
  });

/** A price as the app writes it, such as ¥1,000: the number of yen. */
export async function yenShown(price: Locator) {
  const text = (await price.textContent())?.trim() ?? "";
  const yen = /^¥(\d{1,3}(?:,\d{3})*)$/.exec(text)?.[1];
  if (yen === undefined) throw new Error(`"${text}" isn't a price in yen`);
  return Number(yen.replaceAll(",", ""));
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

/** Opens the Explore tab. */
export async function openExplore(page: Page, language: Language) {
  await page.getByRole("button", { name: say(app.tabs.explore, language), exact: true }).click();
}

/** Someone else's sticker board, opened from an Explore search for their handle. */
export async function openTheirBoard(page: Page, language: Language, handle: string) {
  await openExplore(page, language);
  await page.getByRole("searchbox", { name: say(explore.search.label, language) }).fill(handle);
  await page.getByRole("button", { name: handle }).click();
}

/** ReceiveGiftDialog, once its preview names the giver. */
export const giftFrom = (page: Page, language: Language, giverHandle: string) =>
  page.getByRole("dialog", { name: say(receiving.title, language, { name: giverHandle }) });

/** The gift bag's pull tab, a slider in ReceiveGiftDialog. */
export const pullTabIn = (gift: Locator, language: Language) =>
  gift.getByRole("slider", { name: say(giving.giftBag.pullTab, language) });

/**
 * The pull tab's middle once it holds still: an arrow key ends its looping hint, which would move it
 * out from under a finger between finding it and pressing it.
 */
async function stillTab(tab: Locator) {
  await tab.press("ArrowLeft");
  let last = await tab.boundingBox();
  await expect
    .poll(async () => {
      const box = await tab.boundingBox();
      const still = box !== null && box.x === last?.x && box.y === last.y;
      last = box;
      return still;
    })
    .toBe(true);
  if (!last) throw new Error("The pull tab isn't on screen");
  return { x: last.x + last.width / 2, y: last.y + last.height / 2 };
}

/** Drags the pull tab `distance` px along the strip, as a finger does, and lets go. */
export async function pullTabBy(tab: Locator, distance: number) {
  const { x, y } = await stillTab(tab);
  const page = tab.page();
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 16; step++) await page.mouse.move(x + (distance * step) / 16, y);
  await page.mouse.up();
}

/** Pulls the gift bag's tab to the screen's edge, as a finger does, until it tears free. */
async function pullTab(gift: Locator, language: Language) {
  const tab = pullTabIn(gift, language);
  const width = gift.page().viewportSize()?.width;
  if (!width) throw new Error("The page has no viewport");
  const { x } = await stillTab(tab);
  await pullTabBy(tab, width - 2 - x);
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

/**
 * The combo's gratitude total and hits from the app's own request to record it. Ask before the combo
 * ends, so the request isn't missed.
 */
function comboFrom(page: Page) {
  return page
    .waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/gratitude")
    .then((request) => {
      const body: unknown = request.postDataJSON();
      if (body === null || typeof body !== "object" || !("total" in body) || !("hits" in body)) {
        throw new Error("POST /api/gratitude carried no total or hits");
      }
      const { total, hits } = body;
      if (typeof total !== "number" || typeof hits !== "number") {
        throw new Error(`POST /api/gratitude carried ${JSON.stringify({ total, hits })}`);
      }
      return { total, hits };
    });
}

/**
 * Taps the heart `taps` times, as a thumb does. The heart breathes and squashes, so it's tapped where
 * it stands rather than waited on to hold still; a tap counts anywhere on its resting area.
 */
async function tapHeart(heart: Locator, taps: number) {
  const box = await heart.boundingBox();
  if (!box) throw new Error("The heart isn't on screen");
  for (let tap = 0; tap < taps; tap++) {
    await heart.page().touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
}

/**
 * From the ask to send `giverHandle` gratitude: Send, `taps` taps on the heart, and the X, which ends
 * the combo and sends it. Resolves with the combo as the app recorded it, and its receipt once it's
 * named sent, which is once the server has the combo.
 */
export async function playCombo(page: Page, language: Language, giverHandle: string, taps: number) {
  await gratitudeAsk(page, language, giverHandle)
    .getByRole("button", { name: say(receiving.sendGratitude.send, language) })
    .click();
  const combo = comboFrom(page);
  await tapHeart(
    page.getByRole("button", { name: say(gratitude.heart, language, { handle: giverHandle }) }),
    taps,
  );
  // While the combo runs, the X ends it and sends it, rather than closing the screen.
  await page.getByRole("button", { name: say(gratitude.endAndSend, language) }).click();
  const receipt = page.getByRole("region", { name: say(gratitude.receipt.label, language) });
  await expect(receipt).toBeVisible();
  return { combo: await combo, receipt };
}

/** The Transfer Trail's row for a gift you received; the day it was received ends the row. */
export const receivedRow = (detail: Locator, language: Language, giverHandle: string) =>
  detail
    .getByRole("region", { name: say(stickerBoard.transferTrail.label, language) })
    .getByText(
      startsWith(
        say(stickerBoard.transferTrail.handOff.toYou, language, { giver: giverHandle, day: "" }),
      ),
    );
