import { TOKYO_UTC_OFFSET_MS, tokyoTicketDay } from "@drawing-app/api/client";
import { TICKET_PACKS } from "@drawing-app/api/tickets";
import { expect, test, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { buyPackOnFakeSui } from "./fakeSuiPurchase.ts";
import {
  canvas,
  checkout,
  drawAndSeal,
  drawKey,
  drawKeyName,
  openShop,
  say,
  sayCount,
  signIn,
  spendEveryDailyTicket,
  startsWith,
} from "./helpers.ts";

const { app, shop, stickerBoard, tickets, ui } = strings;
const language = "en";
// Away from Tokyo, so the refill shows in the phone's own time rather than the ticket day's.
test.use({ timezoneId: "America/Los_Angeles" });

const DAY_MS = 24 * 60 * 60_000;

/** When the daily tickets come back, as the phone writes the time: the next midnight in Tokyo. */
async function refillTimeShown(page: Page) {
  const today = Date.parse(`${tokyoTicketDay(new Date())}T00:00:00Z`) - TOKYO_UTC_OFFSET_MS;
  return page.evaluate(
    ([at, lang]) => new Date(at).toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit" }),
    [today + DAY_MS, language] as const,
  );
}

test("out of tickets: Draw raises the out-of-tickets card over the board, which says when daily tickets come back and leads to reserve tickets", async ({
  page,
}) => {
  await signIn(page, "out", language);
  await spendEveryDailyTicket(page, language);

  await drawKey(page, language).click();
  const card = page.getByRole("dialog", { name: say(tickets.outOfTickets.title, language) });
  await expect(card).toBeVisible();
  // The board stays, rather than giving way to the drawing screen and its own out-of-tickets card.
  await expect(
    page.getByRole("region", { name: say(stickerBoard.board.label, language) }),
  ).toBeVisible();
  const refillLine = say(tickets.outOfTickets.refillLine, language, {
    time: await refillTimeShown(page),
    countdown: "",
  });
  await expect(card).toHaveAccessibleDescription(startsWith(refillLine.trim()));

  await card.getByRole("button", { name: say(tickets.buyReserveTickets, language) }).click();
  const packs = checkout(page, language);
  await expect(packs.getByRole("radiogroup")).toBeVisible();
  // Leaving the checkout with no tickets brings the card back.
  await packs.getByRole("button", { name: say(tickets.notNow, language) }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(card).toBeHidden();
});

test("spending a reserve ticket: with no daily ticket left Draw asks first; Not now spends nothing, and using one opens the canvas", async ({
  page,
}) => {
  await signIn(page, "reserve", language);
  await spendEveryDailyTicket(page, language);
  // A pack of more than one, so a count is left to show once one is spent.
  const pack = TICKET_PACKS.find((offer) => offer.tickets > 1);
  if (!pack) throw new Error("No pack holds more than one ticket");
  await buyPackOnFakeSui(page, pack.tickets);
  await page.reload();

  const reserve = await openShop(page, language);
  await expect(
    reserve.getByText(sayCount(shop.reserve, "heldSpoken", language, pack.tickets)),
  ).toBeAttached();
  await page.getByRole("button", { name: say(app.tabs.myBoard, language), exact: true }).click();

  // Draw is tapped once the drawing screen has loaded under the board, as it does a moment after the
  // board, so the board knows the sheet is fresh and decides itself whether to spend.
  const drawOnReserve = async (left: number) => {
    await expect(canvas(page, language)).toBeAttached();
    await page.getByRole("button", { name: drawKeyName(language, left, "reserve") }).click();
  };
  const ask = page.getByRole("dialog", { name: say(tickets.startDrawing.reserve.title, language) });
  await drawOnReserve(pack.tickets);
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: say(tickets.notNow, language) }).click();
  await expect(ask).toBeHidden();
  // The server still counts every one.
  await page.reload();
  await drawOnReserve(pack.tickets);

  await ask.getByRole("button", { name: say(tickets.startDrawing.reserve.use, language) }).click();
  await expect(ask).toBeHidden();
  const { card } = await drawAndSeal(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(
    page.getByRole("button", { name: drawKeyName(language, pack.tickets - 1, "reserve") }),
  ).toBeVisible();
});
