import { expect, type Locator } from "@playwright/test";
import { people, sticker } from "../src/api/testFixtures.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { chooseLanguage, giftFrom, openSettings, pullTabIn, say, signIn, test } from "./helpers.ts";

const { receiving } = strings;
const longName = "W".repeat(48);
const stickerImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"><rect width="224" height="224" fill="white"/><path d="M30 30L194 194" stroke="black" stroke-width="12"/></svg>')}`;
const stickerMask = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"><rect width="224" height="224" fill="white"/></svg>')}`;

/** Text and actions outside the viewport must have an actual user-scrollable ancestor. */
async function expectReachable(part: Locator) {
  expect(
    await part.evaluate((el) => {
      const box = el.getBoundingClientRect();
      if (box.top >= 0 && box.bottom <= innerHeight) return true;
      for (let up = el.parentElement; up; up = up.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(up).overflowY) && up.scrollHeight > up.clientHeight)
          return true;
      }
      return false;
    }),
    "clipped content has a scrollable path",
  ).toBe(true);
  await part.scrollIntoViewIfNeeded();
  const box = await part.boundingBox();
  if (!box) throw new Error("The receiving content has no visible box");
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height).toBeLessThanOrEqual(await part.page().evaluate(() => innerHeight + 1));
}

for (const size of [
  { name: "a short phone", width: 320, height: 568 },
  { name: "a tablet", width: 820, height: 1180 },
] as const) {
  test.describe(`Receiving on ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, reducedMotion: "reduce" });
    for (const language of ["en", "ja"] as const) {
      for (const enlarged of [false, true]) {
        test(`in ${language}, ${enlarged ? "enlarged text and a long name" : "normal text"}`, async ({
          page,
        }, testInfo) => {
          await page.addInitScript(() => localStorage.setItem("draw.motion", "denied"));
          await signIn(page, "receiving-layout", "en");
          if (language === "ja") {
            await openSettings(page, "en");
            await chooseLanguage(page, "en", language);
          }
          const giver = {
            ...people.mika,
            lineDisplayName: enlarged ? longName : people.mika.lineDisplayName,
          };
          const gifted = sticker({
            images: {
              png: stickerImage,
              flat: stickerImage,
              mask: stickerMask,
              webp: { sticker: stickerImage, foil: stickerImage, mask: stickerMask },
              sharp: null,
            },
          });
          await page.route("**/api/gifts/preview", (route) =>
            route.fulfill({
              json: {
                giver,
                expiresAt: "2026-10-20T12:00:00.000Z",
                receivable: true,
                refusal: null,
                sticker: gifted,
              },
            }),
          );
          await page.goto(`/g/0x${"1".repeat(64)}`);
          const dialog = giftFrom(page, language, "@mika");
          await expect(dialog).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          if (enlarged) {
            await page.addStyleTag({
              content: `
          .receive-gift__title { font-size: 52px !important; }
          .receive-gift__hint b { font-size: 30px !important; }
          .receive-gift__hint span, .receive-gift__terms { font-size: 26px !important; }
          .receive-gift__for { font-size: 40px !important; }
          .receive-gift__fine { font-size: 24px !important; }
        `,
            });
          }
          const heading = dialog.getByRole("heading");
          expect
            .soft(
              await heading.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
              "giver heading wraps without overflow",
            )
            .toBe(true);
          const headingBox = await heading.boundingBox();
          if (!headingBox) throw new Error("The giver heading has no visible box");
          expect
            .soft(headingBox.x + headingBox.width, "heading stays inside the viewport")
            .toBeLessThanOrEqual(size.width);
          const hint = dialog.locator(".receive-gift__hint");
          if (!enlarged) {
            const hintBox = await hint.boundingBox();
            if (!hintBox) throw new Error("The opening instructions have no visible box");
            expect
              .soft(hintBox.y + hintBox.height, "normal opening instructions fit without scrolling")
              .toBeLessThanOrEqual(size.height);
          }
          await testInfo.attach("closed-gift", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await expectReachable(hint);
          await pullTabIn(dialog, language).press("End");
          const accept = dialog.getByRole("button", {
            name: say(receiving.gift.accept, language),
            exact: true,
          });
          await expect(accept).toBeVisible();
          await page.evaluate(() =>
            Promise.all(
              document
                .getAnimations()
                .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
                .map((animation) => animation.finished),
            ),
          );
          await expectReachable(accept);
          await expectReachable(dialog.locator(".receive-gift__terms"));
          await testInfo.attach("opened-gift", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          const notNow = dialog.getByRole("button", {
            name: say(receiving.gift.notNow, language),
            exact: true,
          });
          await notNow.click();
          await expect(dialog).toBeHidden();
        });
      }
    }
  });
}
