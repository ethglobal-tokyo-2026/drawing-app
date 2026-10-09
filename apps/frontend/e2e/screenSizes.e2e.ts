import { randomUUID } from "node:crypto";
import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { LARGE_SCREEN } from "../src/ui/largeScreen.ts";
import {
  canvas,
  checkout,
  drawKey,
  drawStroke,
  flipToStatBoard,
  openSealSheet,
  openShop,
  say,
  signIn,
  test,
} from "./helpers.ts";

const { app, explore, shop, stickerCreation, tickets, ui } = strings;
const language = "en";

/** The windows Croquis is laid out for, and whether each takes the large layout. */
const SIZES = [
  { name: "a phone", width: 390, height: 844, large: false },
  { name: "LINE's sheet on an iPad", width: 540, height: 620, large: false },
  { name: "an upright iPad", width: 820, height: 1180, large: true },
  { name: "a sideways iPad", width: 1180, height: 820, large: true },
] as const;
type Size = (typeof SIZES)[number];

/** A touch screen of that size, its motion reduced so nothing is caught mid-move. */
const touchScreen = (size: { width: number; height: number }) => ({
  viewport: { width: size.width, height: size.height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce" as const,
});

/** The color sheet's most on a short phone-layout screen: it leaves more than this of the sheet in view. */
const SHORT_SCREEN = 700;

/**
 * What on screen breaks the layout's rules: text or a control runs past the screen's sides (the page
 * clips rather than scrolls sideways); a key or tab is cut off where no scroller reaches it; on a large
 * screen, a key wider than a card (`--card-w`, a phone's width). Keys named in `known` are left out:
 * each is a `test.fixme` below.
 */
function screenProblems(page: Page, large: boolean, known: readonly string[] = []) {
  return page.evaluate(
    ({ large, known }) => {
      const problems: string[] = [];
      const cardWidth = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--card-w"),
      );
      const scrolls = (el: Element, axis: "x" | "y") => {
        for (let up = el.parentElement; up; up = up.parentElement) {
          const style = getComputedStyle(up);
          const overflow = axis === "x" ? style.overflowX : style.overflowY;
          const over =
            axis === "x"
              ? up.scrollWidth > up.clientWidth + 1
              : up.scrollHeight > up.clientHeight + 1;
          if (/auto|scroll/.test(overflow) && over) return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll(
        ".key, nav button, h1, h2, h3, p, input, [role='tab']",
      )) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest("[inert], [hidden], [aria-hidden='true']"))
          continue;
        if (getComputedStyle(el).visibility === "hidden" || el.closest(".visually-hidden"))
          continue;
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
        if (known.includes(name)) continue;
        if (!scrolls(el, "x") && (r.left < -1 || r.right > innerWidth + 1))
          problems.push(`"${name}" runs past the side`);
        if (!el.matches(".key, nav button")) continue;
        if (!scrolls(el, "y") && (r.top < -1 || r.bottom > innerHeight + 1))
          problems.push(`"${name}" is cut off at the top or foot`);
        if (large && el.matches(".key") && r.width > cardWidth + 1)
          problems.push(`"${name}" is ${Math.round(r.width)}px wide, past a card's ${cardWidth}px`);
      }
      return problems;
    },
    { large, known },
  );
}

/**
 * What breaks a dialog's rules: cut off by the screen's edges; on a large screen, wider than its
 * `--card-w` or off the middle. A dialog that's a layer over the screen is measured by what it shows.
 */
function cardProblems(dialog: Locator, large: boolean) {
  return dialog.evaluate((el, large) => {
    const problems: string[] = [];
    let box: { left: number; right: number; top: number; bottom: number } =
      el.getBoundingClientRect();
    if (box.right - box.left >= innerWidth - 1) {
      const parts = [...el.querySelectorAll("button, input, h1, h2, h3, p")]
        .map((part) => part.getBoundingClientRect())
        .filter((r) => r.width && r.height);
      box = {
        left: Math.min(...parts.map((r) => r.left)),
        right: Math.max(...parts.map((r) => r.right)),
        top: Math.min(...parts.map((r) => r.top)),
        bottom: Math.max(...parts.map((r) => r.bottom)),
      };
    }
    if (box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1)
      problems.push(`cut off: ${JSON.stringify(box)} in ${innerWidth}×${innerHeight}`);
    if (large) {
      const cardWidth = parseFloat(getComputedStyle(el).getPropertyValue("--card-w"));
      const width = box.right - box.left;
      if (width > cardWidth + 1)
        problems.push(`${Math.round(width)}px wide, past its --card-w, ${cardWidth}px`);
      const off = (box.left + box.right) / 2 - innerWidth / 2;
      if (Math.abs(off) > 2) problems.push(`${Math.round(off)}px off the middle`);
    }
    return problems;
  }, large);
}

/** Soft, so one run names every broken rule on every surface. */
async function expectFits(page: Page, size: Size, surface: string, known: readonly string[] = []) {
  expect.soft(await screenProblems(page, size.large, known), surface).toEqual([]);
}

async function expectCardFits(dialog: Locator, size: Size, surface: string) {
  await expect(dialog).toBeVisible();
  // Measured where it rests: a card still rising sits partly below the screen.
  await dialog.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
  expect.soft(await cardProblems(dialog, size.large), surface).toEqual([]);
}

/** Spends the signed-in person's daily tickets through the API, as Draw would. */
async function spendDailyTickets(page: Page) {
  for (let spent = 0; spent < DAILY_TICKETS_PER_DAY; spent++) {
    const status = await page.evaluate(
      async (idempotencyKey) =>
        (
          await fetch("/api/tickets/spend", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "daily", idempotencyKey }),
          })
        ).status,
      randomUUID(),
    );
    expect(status, "POST /api/tickets/spend").toBe(201);
  }
}

const isLarge = (page: Page) => page.evaluate((query) => matchMedia(query).matches, LARGE_SCREEN);

for (const size of SIZES) {
  test.describe(`On ${size.name}, ${size.width}×${size.height}`, () => {
    test.use(touchScreen(size));
    // The motion card asks only on a first visit; its own check is a fixme below.
    test.beforeEach(({ page }) =>
      page.addInitScript(() => localStorage.setItem("draw.motion", "denied")),
    );
    const upright = size.large && size.height > size.width;

    test("the board, stat board, Shop, checkout, Explore and out-of-tickets card fit", async ({
      page,
    }) => {
      await signIn(page, "sizes", language);
      expect(await isLarge(page), "the large layout").toBe(size.large);
      await expectFits(page, size, "the board");

      await flipToStatBoard(page, language);
      await expectFits(page, size, "the stat board");

      // The Shop's Buy key upright is a fixme below.
      const buy = say(shop.reserve.buy, language);
      const reserve = await openShop(page, language);
      await expect(reserve.getByRole("button", { name: buy })).toBeVisible();
      await expectFits(page, size, "the Shop", upright ? [buy] : []);
      await reserve.getByRole("button", { name: buy }).click();
      await expectCardFits(checkout(page, language), size, "the checkout");

      await page.goto("/explore");
      await expect(
        page.getByRole("searchbox", { name: say(explore.search.label, language) }),
      ).toBeVisible();
      await expectFits(page, size, "Explore");

      await spendDailyTickets(page);
      await page.goto("/");
      await drawKey(page, language).click();
      const outOfTickets = page.getByRole("dialog").filter({
        has: page.getByRole("heading", { name: say(tickets.outOfTickets.title, language) }),
      });
      await expectCardFits(outOfTickets, size, "the out-of-tickets card");
    });

    test("the drawing screen, its colors and the seal sheet fit", async ({ page }) => {
      await signIn(page, "sizes", language);
      await drawKey(page, language).click();
      await expect(canvas(page, language)).toBeVisible();
      await drawStroke(page, language);
      await expectFits(page, size, "the drawing screen");

      await page
        .getByRole("button", { name: say(stickerCreation.tools.color, language), exact: true })
        .click();
      const colors = page.getByRole("dialog", {
        name: say(stickerCreation.colorSheet.title, language),
      });
      await expect(colors).toBeVisible();
      await expectFits(page, size, "the colors");
      if (!size.large && size.height < SHORT_SCREEN) {
        const shown = await page.evaluate(() => {
          const sheet = document
            .querySelector(".drawing-screen .ink-sheet")
            ?.getBoundingClientRect();
          const colorSheet = document
            .querySelector(".bottom-sheet.color-sheet")
            ?.getBoundingClientRect();
          if (!sheet || !colorSheet) throw new Error("No drawing sheet or color sheet on screen");
          return (Math.min(colorSheet.top, sheet.bottom) - sheet.top) / sheet.height;
        });
        expect
          .soft(shown, "the share of the drawing sheet above the color sheet")
          .toBeGreaterThan(0.5);
      }
      const label = say(stickerCreation.colorSheet.title, language);
      await page.getByRole("button", { name: say(ui.sheet.close, language, { label }) }).focus();
      await page.keyboard.press("Enter");
      await expect(colors).toBeHidden();

      await expectCardFits(await openSealSheet(page, language), size, "the seal sheet");
    });

    if (upright) {
      test.fixme("the Shop's Buy key keeps a phone's width", async ({ page }) => {
        await signIn(page, "sizes", language);
        await page.getByRole("button", { name: say(app.tabs.shop, language), exact: true }).click();
        await expect(
          page.getByRole("button", { name: say(shop.reserve.buy, language) }),
        ).toBeVisible();
        await expectFits(page, size, "the Shop");
      });

      test.fixme("the motion card is a card in the middle", async ({ browser }) => {
        // It asks on iOS only, which Safari's user agent says.
        const context = await browser.newContext({
          ...touchScreen(size),
          userAgent:
            "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        });
        const page = await context.newPage();
        await signIn(page, "sizes", language);
        await expectCardFits(
          page.getByRole("dialog", { name: say(app.motionPermission.label, language) }),
          size,
          "the motion card",
        );
        await context.close();
      });
    }

    if (!size.large) {
      test.fixme("the seal key shows without a spring under reduced motion", async ({ page }) => {
        await signIn(page, "sizes", language);
        await drawKey(page, language).click();
        await drawStroke(page, language);
        const sealKey = page.getByRole("button", {
          name: say(stickerCreation.seal.label, language),
        });
        await expect(sealKey).toBeVisible();
        expect(await sealKey.evaluate((key) => key.getAnimations().length)).toBe(0);
      });
    }
  });
}

/** The cover over the app that asks for the phone upright again. */
const uprightCover = (page: Page) =>
  page.getByRole("dialog", { name: say(app.upright.turn, language) });

test.describe("A window wider than it's tall", () => {
  test.describe("on an iPad, dragged short, 1000×560", () => {
    // The window is short, but the device's own screen is an iPad's.
    test.use({
      ...touchScreen({ width: 1000, height: 560 }),
      screen: { width: 1180, height: 820 },
    });

    test("keeps the phone layout, with no upright cover", async ({ page }) => {
      await signIn(page, "sizes", language);
      expect(await isLarge(page), "the large layout").toBe(false);
      await expect(uprightCover(page)).toHaveCount(0);
    });
  });

  test.describe("on a phone on its side, 844×390", () => {
    test.use(touchScreen({ width: 844, height: 390 }));

    test("is covered, asking for the phone upright", async ({ page }) => {
      await page.goto(`/?as=sizes-${randomUUID().slice(0, 8)}`);
      await expect(uprightCover(page)).toBeVisible();
    });
  });
});
