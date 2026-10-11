import { expect, test } from "@playwright/test";

for (const language of ["en", "ja"] as const)
  for (const hand of ["left", "right"] as const) {
    test(`full ${language} subjects fit the ${hand} footer at narrow phone and tablet sizes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/e2e/layerSubjectFitReview.html?lang=${language}&hand=${hand}`);
      const print = page.locator(".corner-print");
      const expected =
        language === "en"
          ? "meeting with a view to marriage × senior high school student"
          : "アーティスト × 宇宙飛行士";
      await expect(print).toHaveText(expected);
      await page.evaluate(() => document.fonts.ready);
      for (const size of [
        { width: 375, height: 667 },
        { width: 390, height: 844 },
        { width: 820, height: 1180 },
      ]) {
        await page.setViewportSize(size);
        await expect
          .poll(() =>
            print.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const words = [...element.querySelectorAll(".corner-print__word")];
              return words.every((word) => {
                const r = word.getBoundingClientRect();
                return (
                  r.left >= box.left - 1 &&
                  r.right <= box.right + 1 &&
                  r.top >= box.top - 1 &&
                  r.bottom <= box.bottom + 1 &&
                  word.scrollWidth <= word.clientWidth + 1
                );
              });
            }),
          )
          .toBe(true);
        const geometry = await print.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const footer = [
            ...document.querySelectorAll(".history-buttons, .my-board-tile, .seal-key"),
          ].map((item) => item.getBoundingClientRect());
          return {
            font: getComputedStyle(element).fontSize,
            clear: footer.every(
              (r) =>
                box.right <= r.left ||
                box.left >= r.right ||
                box.bottom <= r.top ||
                box.top >= r.bottom,
            ),
          };
        });
        expect(geometry).toEqual({ font: "13px", clear: true });
      }
    });
  }
