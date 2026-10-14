import type { Explore } from "@drawing-app/api/client";
import { expect } from "@playwright/test";
import { people } from "../src/api/testFixtures.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { openExplore, say, signIn, test } from "./helpers.ts";

const language = "en";
const { explore } = strings;
const leaderboardsOnly: Explore = {
  pile: { stickers: [], before: null },
  leaderboards: {
    weekStart: "2026-10-11T15:00:00.000Z",
    mostGratitude: [{ person: people.mika, value: 1234 }],
    bestCombo: [{ person: people.ken, value: 248 }],
    longestStreak: [{ person: people.bob, value: 24 }],
  },
};

test.use({ reducedMotion: "no-preference" });

test("leaving This week during a leaderboard's fade lets later picks show their own rows", async ({
  page,
}) => {
  await page.route("**/api/explore", (route) => route.fulfill({ json: leaderboardsOnly }));
  await signIn(page, "explore-transition", language);
  await openExplore(page, language);
  const thisWeek = page.getByRole("tab", {
    name: say(explore.views.thisWeek, language),
    exact: true,
  });
  await thisWeek.click();
  await expect(thisWeek).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".leaderboard .row-names b")).toHaveText("@mika");

  // Keep the real fade pending until its list has detached, then finish it. This exercises the
  // interruption without depending on two separate browser commands fitting inside its 90 ms.
  await page.evaluate(async () => {
    const list = document.querySelector<HTMLOListElement>(".leaderboard");
    const bestCombo = document.querySelector<HTMLButtonElement>("#leaderboard-bestCombo");
    const stickers = document.querySelector<HTMLButtonElement>("#explore-view-stickers");
    if (!list || !bestCombo || !stickers) throw new Error("Explore's leaderboard tabs are missing");
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    bestCombo.click();
    await frame();
    const fade = list.getAnimations()[0];
    if (!fade) throw new Error("Picking a leaderboard did not start its fade");
    const finished = fade.finished;
    fade.pause();
    stickers.click();
    await frame();
    if (list.isConnected)
      throw new Error("The leaderboard's rows did not leave when opening Stickers");
    fade.finish();
    await finished;
  });

  await expect(thisWeek).toHaveAttribute("aria-selected", "false");
  await thisWeek.click();
  await expect(
    page.getByRole("tab", { name: say(explore.leaderboards.bestCombo, language), exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".leaderboard .row-names b")).toHaveText("@ken");
  await page
    .getByRole("tab", { name: say(explore.leaderboards.longestStreak, language), exact: true })
    .click();
  await expect(page.locator(".leaderboard .row-names b")).toHaveText("@bob");
  await expect(page.locator(".leaderboard")).toHaveCount(1);
});
