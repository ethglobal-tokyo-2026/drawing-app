import { expect } from "@playwright/test";
import { people } from "../src/api/testFixtures.ts";
import { signIn, test } from "./helpers.ts";

const artist = { ...people.mika, handle: "the_artist_with_a_long_handle" };
const sizes = [
  { name: "phone", width: 375, height: 812 },
  { name: "LINE iPad sheet", width: 540, height: 620 },
  { name: "upright iPad", width: 820, height: 1180 },
  { name: "sideways iPad", width: 1180, height: 820 },
] as const;

for (const size of sizes) {
  test.describe(size.name, () => {
    test.use({ viewport: size, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
    test("the full artist handle and large Gratitude amounts remain readable", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("draw.motion", "denied"));
      let amount = 2_147_483_647;
      await page.route("**/api/explore", (route) =>
        route.fulfill({
          json: {
            pile: { stickers: [], before: null },
            leaderboards: {
              weekStart: "2026-10-11T15:00:00.000Z",
              mostGratitude: [{ person: artist, value: amount }],
              bestCombo: [{ person: artist, value: 248 }],
              longestStreak: [{ person: artist, value: 24 }],
            },
          },
        }),
      );
      await signIn(page, "readability", "en");
      for (const total of [amount, Number.MAX_SAFE_INTEGER]) {
        amount = total;
        await page.goto("/explore");
        await expect(page.locator(".pile-day")).toBeVisible();
        const weekly = page.locator("#explore-view-thisWeek");
        if (await weekly.count()) {
          await weekly.click();
          await expect(weekly).toHaveAttribute("aria-selected", "true");
        }
        const row = page.locator('.leaderboard[data-board="mostGratitude"] .artist-row');
        await expect(row.locator(".row-names b")).toHaveText(`@${artist.handle}`);
        await expect(row.locator(".figure")).toContainText(total.toLocaleString("en-US"));
        await page.evaluate(() => document.fonts.ready);
        const measures = await row.evaluate((el) => {
          const name = el.querySelector<HTMLElement>(".row-names b");
          if (!name) throw new Error("The leaderboard row is missing its artist handle");
          const nameStyle = getComputedStyle(name);
          return {
            lines: name.getBoundingClientRect().height / parseFloat(nameStyle.lineHeight),
            fontSize: parseFloat(nameStyle.fontSize),
            overflow: el.scrollWidth > el.clientWidth + 1,
            rowHeight: el.getBoundingClientRect().height,
          };
        });
        expect(measures.lines, "The handle should read in at most three lines").toBeLessThanOrEqual(
          3.1,
        );
        expect(measures.fontSize).toBeGreaterThanOrEqual(11);
        expect(measures.overflow, "The complete Gratitude amount should fit the row").toBe(false);
        expect(measures.rowHeight).toBeLessThan(140);
        if (process.env.EXPLORE_CAPTURE_DIR) {
          await page.evaluate(() => {
            const explore = document.querySelector<HTMLElement>(".explore");
            if (!explore) throw new Error("Explore is missing from the capture");
            explore.scrollTop = 0;
          });
          await page.screenshot({
            path: `${process.env.EXPLORE_CAPTURE_DIR}/${size.name.replaceAll(" ", "-")}-${total}.png`,
          });
        }
      }
    });
  });
}
