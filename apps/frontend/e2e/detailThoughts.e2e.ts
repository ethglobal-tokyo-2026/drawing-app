import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { expect, test, type Locator } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { drawAndSeal, drawKeyName, openDetail, say, signIn, signedInUserId } from "./helpers.ts";

const { kyotoSeika, stickerBoard, ui } = strings;
const longPair = [
  { ja: "見合い", reading: "みあい", en: "meeting with a view to marriage" },
  { ja: "入院", reading: "にゅういん", en: "hospitalization" },
] as const;

/** Change only a real response's subjects, keeping its image, cut and every other field. */
function setSubjects(sticker: unknown) {
  if (!sticker || typeof sticker !== "object" || !("kyotoSeikaSubjects" in sticker))
    throw new Error("The sticker response has no Kyoto Seika Subjects field");
  sticker.kyotoSeikaSubjects = [...longPair];
}

/** Distances between the rendered cloud outlines and the real sticker's nontransparent cut. */
async function cloudGaps(detail: Locator) {
  return detail.evaluate((shown) => {
    const stage = shown.querySelector(".sticker-detail__stage")?.getBoundingClientRect();
    const image = shown.querySelector<HTMLImageElement>(
      ".sticker-detail__slide .sticker-figure__img",
    );
    if (!stage || !image?.complete) throw new Error("The sticker detail image is not ready");
    const box = image.getBoundingClientRect();
    const cut = document.createElement("canvas");
    cut.width = Math.ceil(box.width);
    cut.height = Math.ceil(box.height);
    const ink = cut.getContext("2d");
    if (!ink) throw new Error("The sticker cut could not be measured");
    ink.drawImage(image, 0, 0, cut.width, cut.height);
    const pixels = ink.getImageData(0, 0, cut.width, cut.height).data;
    const opaque = (x: number, y: number) =>
      x >= 0 &&
      x < cut.width &&
      y >= 0 &&
      y < cut.height &&
      pixels[(y * cut.width + x) * 4 + 3] > 16;
    const edges: DOMPoint[] = [];
    for (let y = 0; y < cut.height; y++)
      for (let x = 0; x < cut.width; x++)
        if (
          opaque(x, y) &&
          (!opaque(x - 1, y) || !opaque(x + 1, y) || !opaque(x, y - 1) || !opaque(x, y + 1))
        )
          edges.push(new DOMPoint(box.left + x + 0.5, box.top + y + 0.5));
    if (!edges.length) throw new Error("The sticker has no visible cut");
    return [...shown.querySelectorAll<SVGPathElement>(".subject-thought__cloud .shape-fill")].map(
      (cloud) => {
        const matrix = cloud.getScreenCTM();
        if (!matrix) throw new Error("The thought cloud has no screen position");
        const length = cloud.getTotalLength();
        let gap = Infinity;
        for (let i = 0; i < 120; i++) {
          const point = cloud.getPointAtLength((length * i) / 120).matrixTransform(matrix);
          for (const edge of edges)
            gap = Math.min(gap, Math.hypot(point.x - edge.x, point.y - edge.y));
        }
        const cloudBox = cloud.getBoundingClientRect();
        return {
          gap,
          inStage:
            cloudBox.left >= stage.left - 1 &&
            cloudBox.right <= stage.right + 1 &&
            cloudBox.top >= stage.top - 1 &&
            cloudBox.bottom <= stage.bottom + 1,
        };
      },
    );
  });
}

for (const language of ["ja", "en"] as const) {
  test.describe(`Kyoto Seika detail subjects in ${language}`, () => {
    test.use({ locale: language === "ja" ? "ja-JP" : "en-US" });
    test(`Kyoto Seika detail keeps ${language} subjects beside its sticker without pushing the actions below the fold`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page
        .context()
        .addInitScript((lang) => localStorage.setItem("draw.language", lang), language);
      await signIn(page, "detail-subjects", language);
      const headers = { "x-croquis-user-id": await signedInUserId(page) };
      const savedLanguage = await page.request.post("/api/me/language-choice", {
        headers,
        data: { language },
      });
      expect(savedLanguage.ok()).toBe(true);
      const enabled = await page.request.post("/api/me/kyoto-seika-practice", {
        headers,
        data: { kyotoSeikaPractice: true },
      });
      expect(enabled.ok()).toBe(true);
      await page.reload();
      await page
        .getByRole("button", { name: drawKeyName(language, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY) })
        .click();
      const subjects = page
        .getByRole("group", { name: say(kyotoSeika.balloons.label, language) })
        .locator("[aria-pressed]");
      await subjects.nth(0).click();
      await subjects.nth(1).click();
      await page
        .getByRole("button", {
          name: say(kyotoSeika.begin.label, language, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 }),
        })
        .click();
      const { card, no } = await drawAndSeal(page, language);
      await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();

      // Keep the real sealed image and cut, with a fixed pair that stresses English wrapping.
      await page.route(/\/api\/sticker-boards\/[^/]+$/, async (route) => {
        const response = await route.fetch();
        const board: unknown = await response.json();
        if (
          !board ||
          typeof board !== "object" ||
          !("boardStickers" in board) ||
          !Array.isArray(board.boardStickers)
        )
          throw new Error("The sticker board response has no stickers");
        board.boardStickers.forEach((placed: unknown) => {
          if (!placed || typeof placed !== "object" || !("sticker" in placed))
            throw new Error("The sticker board response has no sticker image");
          setSubjects(placed.sticker);
        });
        await route.fulfill({ response, json: board });
      });
      await page.route(/\/api\/stickers\/[^/]+$/, async (route) => {
        const response = await route.fetch();
        const detail: unknown = await response.json();
        if (!detail || typeof detail !== "object" || !("sticker" in detail))
          throw new Error("The sticker detail response has no sticker image");
        setSubjects(detail.sticker);
        await route.fulfill({ response, json: detail });
      });
      await page.reload();
      const detail = await openDetail(page, language, no);
      const thoughts = detail.locator(".sticker-detail__subjects .subject-thought");
      await expect(thoughts).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect(detail.locator(".sticker-detail__meta .subject-thought")).toHaveCount(0);
      await expect(thoughts.locator(".subject-thought__cloud")).toHaveCount(2);
      if (language === "en") {
        const sizes = await thoughts
          .locator(".subject-thought__words")
          .evaluateAll((words) => words.map((word) => parseFloat(getComputedStyle(word).fontSize)));
        for (const size of sizes) expect(size).toBeGreaterThanOrEqual(13);
      }
      const verify = async () => {
        await expect
          .poll(async () =>
            (await cloudGaps(detail)).every((cloud) => cloud.gap <= 40 && cloud.inStage),
          )
          .toBe(true);
        await expect(
          detail.getByRole("button", {
            name: say(stickerBoard.detail.give, language),
            exact: true,
          }),
        ).toBeInViewport({ ratio: 1 });
      };
      await verify();
      await page.screenshot({ path: testInfo.outputPath(`detail-subjects-phone-${language}.png`) });
      await page.setViewportSize({ width: 1024, height: 900 });
      await verify();
      await page.screenshot({ path: testInfo.outputPath(`detail-subjects-large-${language}.png`) });
    });
  });
}
