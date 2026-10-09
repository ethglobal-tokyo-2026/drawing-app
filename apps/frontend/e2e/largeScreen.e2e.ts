import { expect, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { handleOf, openTheirBoard, say, signIn, test } from "./helpers.ts";
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

test.describe("On an iPad", () => {
  test.use(ipad);

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
