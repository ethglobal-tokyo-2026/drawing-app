import { TICKET_PACKS } from "@drawing-app/api/tickets";
import { expect, test } from "@playwright/test";
import type { Leaf } from "../src/i18n/catalog.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { checkoutPack, openCheckoutFromShop, openShop, say, signIn, yenShown } from "./helpers.ts";

const { shop, tickets } = strings;
const language = "en";

/** How many tickets each pack on sale holds, smallest first. */
const packSizes = TICKET_PACKS.map((pack) => pack.tickets).toSorted((a, b) => a - b);

test("the Shop: reserve tickets on sale, and coming-soon shelves with no prices and nothing to buy", async ({
  page,
}) => {
  await signIn(page, "shop", language);
  const reserve = await openShop(page, language);
  await expect(
    page.getByRole("heading", { level: 1, name: say(shop.title, language) }),
  ).toBeVisible();
  await expect(
    reserve.getByRole("button", { name: say(shop.reserve.buy, language) }),
  ).toBeVisible();

  const soon = page.getByRole("region", { name: say(shop.comingSoon, language) });
  for (const { title, items } of Object.values(shop.shelves)) {
    const shelf = soon.getByRole("region", { name: say(title, language) });
    await expect(shelf.getByRole("listitem")).toContainText(
      Object.values<Leaf>(items).map((item) => say(item, language)),
    );
  }
  await expect(soon.getByRole("button").or(soon.getByRole("link"))).toHaveCount(0);
  await expect(soon).not.toContainText(/¥|円/);
});

test("the reserve ticket checkout prices every pack in yen, a bigger pack for less per ticket", async ({
  page,
}) => {
  await signIn(page, "packs", language);
  const card = await openCheckoutFromShop(page, language);
  const shown = [];
  for (const count of packSizes) {
    const pack = checkoutPack(card, language, count);
    shown.push({ count, pack, yen: await yenShown(pack.locator("strong")) });
  }
  const [smallest, ...bigger] = shown;
  if (!smallest) throw new Error("No packs are on sale");
  const each = (pack: { count: number; yen: number }) => pack.yen / pack.count;

  // The smallest pack sells at the full price; each bigger one strikes that through for less.
  await expect(smallest.pack.locator("s")).toHaveCount(0);
  let previous = smallest;
  for (const pack of bigger) {
    expect(each(pack), `${pack.count} tickets cost less each than ${previous.count}`).toBeLessThan(
      each(previous),
    );
    const was = await yenShown(pack.pack.locator("s"));
    expect(was, `${pack.count} tickets' full price`).toBe(pack.count * each(smallest));
    await expect(pack.pack).toContainText(
      say(tickets.checkout.discount, language, {
        percent: Math.round(100 - (100 * pack.yen) / was),
      }),
    );
    previous = pack;
  }
});

test("the reserve ticket checkout opens on a pack with its price, and can't pay on the stand-in chain", async ({
  page,
}) => {
  await signIn(page, "checkout", language);
  const card = await openCheckoutFromShop(page, language);
  const payKey = (price: string | null) =>
    card.getByRole("button", {
      name: say(tickets.checkout.payPrice, language, { price: price ?? "" }),
      exact: true,
    });

  const smallest = checkoutPack(card, language, packSizes[0] ?? 0);
  await expect(smallest).toBeChecked();
  await expect(payKey(await smallest.locator("strong").textContent())).toBeVisible();

  const largest = checkoutPack(card, language, packSizes.at(-1) ?? 0);
  await largest.click();
  await expect(largest).toBeChecked();
  await expect(smallest).not.toBeChecked();
  // LIFF Mock signs in without LINE, so there's no Privy Sui account to pay from, and the card says so.
  await expect(payKey(await largest.locator("strong").textContent())).toBeDisabled();
  await expect(card.getByRole("alert")).toHaveText(say(tickets.checkout.walletNeedsLine, language));

  await card.getByRole("button", { name: say(tickets.notNow, language) }).click();
  await expect(card).toBeHidden();
});
