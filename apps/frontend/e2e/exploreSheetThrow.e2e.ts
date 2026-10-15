import type { Explore } from "@drawing-app/api/client";
import { expect, type Page } from "@playwright/test";
import { people, sticker } from "../src/api/testFixtures.ts";
import { openExplore, signIn, test } from "./helpers.ts";
import { FINGERTIP, hand } from "./pen.ts";

const art = "/src/shop/sample-sticker/sticker.png";
const images = {
  png: art,
  mask: "/src/shop/sample-sticker/mask.png",
  flat: art,
  webp: { sticker: art, mask: art, foil: art },
  sharp: null,
};

/** Today's pile of six stickers. */
function pile(): Explore {
  const now = Date.now();
  const cast = [people.mika, people.ken, people.bob];
  return {
    pile: {
      stickers: Array.from({ length: 6 }, (_, i) => ({
        sticker: {
          ...sticker({
            sealedAt: new Date(now - (i + 1) * 60_000).toISOString(),
            artist: cast[i % 3],
          }),
          images,
        },
        givenTo: null,
      })),
      before: null,
    },
    leaderboards: {
      weekStart: new Date(now).toISOString(),
      mostGratitude: [],
      bestCombo: [],
      longestStreak: [],
    },
  };
}

/** A sticker on the pile lifted into its sheet with a tap, once the flight in has landed. */
async function liftOne(page: Page) {
  await page.route("**/api/explore", (route) => route.fulfill({ json: pile() }));
  await signIn(page, "sheet-throw", "en");
  await openExplore(page, "en");
  await expect(page.locator(".pile-sticker").first()).toBeVisible();
  await expect(page.locator(".pile-sticker[data-falling]")).toHaveCount(0);
  const at = await page.evaluate(() => {
    for (const hit of document.querySelectorAll<HTMLElement>(".pile-sticker__hit")) {
      const box = hit.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const id = hit.closest<HTMLElement>(".pile-sticker")?.dataset.pileId;
      if (id && document.elementFromPoint(x, y) === hit) return { id, x, y };
    }
    throw new Error("No sticker's middle is exposed on the pile");
  });
  await page.touchscreen.tap(at.x, at.y);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
  return at.id;
}

test.use({ reducedMotion: "no-preference" });

test("Thrown up out of its sheet, a lifted sticker drops back onto its spot on the pile", async ({
  page,
}) => {
  const id = await liftOne(page);
  const sticker = page.locator(".lifted-sticker__slide .sticker-figure");
  const box = await sticker.boundingBox();
  if (!box) throw new Error("The lifted sticker has no box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // Where the flyer goes, frame by frame, from the moment it leaves.
  await page.evaluate(() => {
    const seen: { top: number; at: number }[] = [];
    (window as Window & { flyerSeen?: typeof seen }).flyerSeen = seen;
    const watch = () => {
      const flyer = document.querySelector(".detail-lift__flyer");
      if (flyer) seen.push({ top: flyer.getBoundingClientRect().top, at: performance.now() });
      if (seen.length < 120) requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });
  const fingers = await hand(page);
  const finger = (dy: number) => [{ x, y: y + dy, id: 1, radius: FINGERTIP }];
  await fingers.down(finger(0));
  for (let step = 1; step <= 5; step++) {
    await page.waitForTimeout(16);
    await fingers.move(finger(-step * 24));
  }
  await fingers.up();

  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".detail-lift__flyer")).toHaveCount(0);
  const seen = await page.evaluate(
    () => (window as Window & { flyerSeen?: { top: number }[] }).flyerSeen ?? [],
  );
  expect(seen.length, "The sticker never left the sheet as a flyer").toBeGreaterThan(5);
  // Up past where the finger let go of it, before it comes down onto the pile.
  expect(Math.min(...seen.map((s) => s.top))).toBeLessThan(seen[0].top - 40);
  // Back on its spot, whole: nothing else was lifted, and its spot shows it again.
  await expect
    .poll(() =>
      page
        .locator(`.pile-sticker[data-pile-id="${id}"] .pile-sticker__drop`)
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
});

test("A sideways swipe across the lifted sticker still lifts the next one", async ({ page }) => {
  await liftOne(page);
  const dialog = page.getByRole("dialog");
  const before = await dialog.getAttribute("aria-label");
  const box = await page.locator(".lifted-sticker__slide .sticker-figure").boundingBox();
  if (!box) throw new Error("The lifted sticker has no box");
  const y = box.y + box.height / 2;
  const fingers = await hand(page);
  const finger = (x: number) => [{ x, y, id: 1, radius: FINGERTIP }];
  await fingers.down(finger(box.x + box.width * 0.8));
  for (let step = 1; step <= 5; step++) {
    await page.waitForTimeout(16);
    await fingers.move(finger(box.x + box.width * 0.8 - step * 30));
  }
  await fingers.up();
  await expect(dialog).not.toHaveAttribute("aria-label", before ?? "");
  await expect(dialog).toBeVisible();
});
