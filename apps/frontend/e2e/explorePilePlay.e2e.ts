import type { Explore } from "@drawing-app/api/client";
import { expect, type Page } from "@playwright/test";
import { people, sticker } from "../src/api/testFixtures.ts";
import { openExplore, signIn, test } from "./helpers.ts";
import { FINGERTIP, hand, type At } from "./pen.ts";

const language = "en";
const art = "/src/shop/sample-sticker/sticker.png";
const images = {
  png: art,
  mask: "/src/shop/sample-sticker/mask.png",
  flat: art,
  webp: { sticker: art, mask: art, foil: art },
  sharp: null,
};
const DAY_MS = 86_400_000;

/** Three days of eight stickers each, enough pile to scroll. */
function pile(): Explore {
  const now = Date.now();
  const cast = [people.mika, people.ken, people.bob];
  return {
    pile: {
      stickers: Array.from({ length: 24 }, (_, i) => ({
        sticker: {
          ...sticker({
            sealedAt: new Date(now - Math.floor(i / 8) * DAY_MS - (i + 1) * 60_000).toISOString(),
            artist: cast[i % 3],
          }),
          images,
        },
        givenTo: null,
      })),
      before: null,
    },
    leaderboards: {
      weekStart: new Date(now - 2 * DAY_MS).toISOString(),
      mostGratitude: [],
      bestCombo: [],
      longestStreak: [],
    },
  };
}

/** Explore on the pile, once its stickers have fallen in. */
async function openPile(page: Page) {
  await page.route("**/api/explore", (route) => route.fulfill({ json: pile() }));
  await signIn(page, "pile-play", language);
  await openExplore(page, language);
  await expect(page.locator(".pile-sticker").first()).toBeVisible();
  await expect(page.locator(".pile-sticker[data-falling]")).toHaveCount(0);
}

/** A point on the first day where a finger lands on a sticker's own cut, in its left half. */
async function exposedSticker(page: Page): Promise<At & { id: string }> {
  return page.evaluate(() => {
    for (const hit of document.querySelectorAll<HTMLElement>(
      ".pile-day__heap[data-day] .pile-sticker__hit",
    )) {
      const box = hit.getBoundingClientRect();
      for (let y = box.top + 10; y < box.bottom - 10; y += 6) {
        for (let x = box.left + 10; x < Math.min(box.right - 10, innerWidth / 2); x += 6) {
          const id = hit.closest<HTMLElement>(".pile-sticker")?.dataset.pileId;
          if (id && document.elementFromPoint(x, y) === hit) return { id, x, y };
        }
      }
    }
    throw new Error("No sticker's cut is exposed in the pile's left half");
  });
}

/** How far play has moved a sticker, in px, from its transform. */
const moved = (page: Page, id: string) =>
  page.locator(`.pile-sticker[data-pile-id="${id}"]`).evaluate((item) => {
    const [x = 0, y = 0] = (item.style.transform.match(/-?[\d.]+/g) ?? []).map(Number);
    return { x, y, transform: item.style.transform };
  });

test.use({ reducedMotion: "no-preference" });

test("A sideways swipe throws a sticker on across its day, and doesn't lift it", async ({
  page,
}) => {
  await openPile(page);
  const { id, x, y } = await exposedSticker(page);
  const fingers = await hand(page);
  const finger = (dx: number) => [{ x: x + dx, y, id: 1, radius: FINGERTIP }];
  // Where it was as the finger let go, read in the page as it happens: the test can read it late.
  await page.evaluate((thrown) => {
    const item = document.querySelector<HTMLElement>(`.pile-sticker[data-pile-id="${thrown}"]`);
    const at = window as Window & { letGo?: string };
    addEventListener("pointerup", () => (at.letGo = item?.style.transform), {
      capture: true,
      once: true,
    });
  }, id);
  await fingers.down(finger(0));
  for (let step = 1; step <= 6; step++) {
    await page.waitForTimeout(16);
    await fingers.move(finger(step * 15));
  }
  await fingers.up();
  const letGo = await page.evaluate(() =>
    Number(((window as Window & { letGo?: string }).letGo ?? "").match(/-?[\d.]+/)?.[0] ?? 0),
  );
  // Thrown, it carries on past where the finger let go, unless it knocks another sticker first.
  await expect
    .poll(
      async () =>
        (await moved(page, id)).x > letGo + 30 ||
        (await page
          .locator(".pile-sticker")
          .evaluateAll(
            (items, thrown) =>
              items.some((item) => item.dataset.pileId !== thrown && item.style.transform !== ""),
            id,
          )),
      { timeout: 3000 },
    )
    .toBe(true);
  await expect(page.locator(".pile-sticker[data-moving]")).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("A swipe up over a sticker scrolls Explore and leaves the sticker where it lies", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Only Chromium takes trusted touches from Playwright");
  await openPile(page);
  const { id, x, y } = await exposedSticker(page);
  const scroller = page.locator(".explore");
  const before = await scroller.evaluate((el) => el.scrollTop);
  const fingers = await hand(page);
  await fingers.down([{ x, y, id: 1, radius: FINGERTIP }]);
  for (let step = 1; step <= 8; step++) {
    await fingers.move([{ x: x + 2, y: y - step * 20, id: 1, radius: FINGERTIP }]);
  }
  await fingers.up();
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before + 60);
  expect((await moved(page, id)).transform).toBe("");
});
