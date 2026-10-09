import { expect, type Locator, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import {
  handleOf,
  openDetail,
  openTheirBoard,
  say,
  sealFromBoard,
  signIn,
  test,
} from "./helpers.ts";
import { ipad } from "./ipad.ts";

const { app, stickerBoard } = strings;
const language = "en";

/** The tab bar's tab of that name. */
const tab = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: say(app.tabs.sections, language) })
    .getByRole("button", { name, exact: true });

/** The button with their photo and name, which only their sticker board has. */
const theirStats = (page: Page) =>
  page.getByRole("button", {
    name: new RegExp(`${say(stickerBoard.artistBoard.theirStats, language, { name: "" })}$`),
  });

/** Signs an artist in on the friend's phone and the visitor on `page`, and opens the artist's board. */
async function visitTheArtist(page: Page, friend: Page) {
  const handle = handleOf(await signIn(friend, "artist", language));
  await signIn(page, "visitor", language);
  await openTheirBoard(page, language, handle);
  await expect(theirStats(page)).toBeVisible();
}

/** A Stage Manager window held upright, too short for the sticker's share of the width. */
const SHORT_UPRIGHT_WINDOW = { width: 680, height: 720 };

/**
 * The long side of the sticker in its detail, and the phone's box for it (sticker-detail.css). Laid
 * out sizes, so a sticker still flying in from the board measures where it lands.
 */
const stickerSides = (detail: Locator) =>
  detail.evaluate((el) => {
    const figure = el.querySelector<HTMLElement>(".sticker-detail__slide .sticker-figure");
    if (!figure) throw new Error("No sticker in the sticker detail");
    return {
      long: Math.max(figure.offsetWidth, figure.offsetHeight),
      phone: parseFloat(getComputedStyle(el).getPropertyValue("--figure-phone")),
    };
  });

test.describe("On an iPad", () => {
  test.use(ipad);

  test("the sticker detail gives the room to the sticker, and Give shows without a scroll", async ({
    page,
  }) => {
    await signIn(page, "detail", language);
    const detail = await openDetail(page, language, await sealFromBoard(page, language));
    const give = detail.getByRole("button", {
      name: say(stickerBoard.detail.give, language),
      exact: true,
    });
    const expectGrown = async (held: string) => {
      const { long, phone } = await stickerSides(detail);
      expect.soft(long, `the sticker's long side, ${held}`).toBeGreaterThan(phone);
    };

    await expectGrown("upright");
    await expect.soft(give, "Give, upright").toBeInViewport({ ratio: 1 });

    await page.setViewportSize({ width: ipad.viewport.height, height: ipad.viewport.width });
    await expectGrown("sideways");

    await page.setViewportSize(SHORT_UPRIGHT_WINDOW);
    await expect.soft(give, "Give, in a short upright window").toBeInViewport({ ratio: 1 });
  });

  test("the lit Explore tab leads back from someone's board", async ({ page, friend }) => {
    await visitTheArtist(page, friend);

    await tab(page, say(app.tabs.backToExplore, language)).tap();
    await expect(theirStats(page)).toHaveCount(0);
    await expect(tab(page, say(app.tabs.explore, language))).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("On a desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("the app keeps its phone frame, and no tab leads back", async ({ page, friend }) => {
    await visitTheArtist(page, friend);

    const strip = await page
      .getByRole("navigation", { name: say(app.tabs.sections, language) })
      .boundingBox();
    expect(strip?.width).toBeLessThan(page.viewportSize()?.width ?? 0);
    await expect(tab(page, say(app.tabs.backToExplore, language))).toHaveCount(0);
  });
});
