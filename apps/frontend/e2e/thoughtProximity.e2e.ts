import { expect, test } from "@playwright/test";

/** The reported cut and angle, rendered by the production board thought layer in both languages. */
for (const width of [320, 390, 1024])
  for (const language of ["ja", "en"])
    test(`subject clouds stay beside the reported cut at ${width}px in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(`/e2e/thoughtReview.html?width=${width}&lang=${language}&long=1`);
      await expect(page.locator(".subject-thought__cloud")).toHaveCount(2);
      await page.evaluate(() =>
        document.getAnimations().forEach((motion) => {
          motion.pause();
          motion.currentTime = 150;
        }),
      );
      const measured = await page.evaluate(() => {
        const cut = document.querySelector<SVGPathElement>(".review-cut");
        const cutMatrix = cut?.getScreenCTM();
        if (!cut || !cutMatrix) throw new Error("The reported sticker has no rendered cut");
        const samples = (path: SVGPathElement, matrix: DOMMatrix) => {
          const length = path.getTotalLength();
          return Array.from({ length: Math.ceil(length / 2) }, (_, i) =>
            path.getPointAtLength(i * 2).matrixTransform(matrix),
          );
        };
        const edge = samples(cut, cutMatrix);
        const gaps = [
          ...document.querySelectorAll<SVGPathElement>(".subject-thought__cloud .shape-fill"),
        ].map((path) => {
          const matrix = path.getScreenCTM();
          if (!matrix) throw new Error("A subject cloud has no rendered white");
          return Math.min(
            ...samples(path, matrix).map((point) =>
              Math.min(...edge.map((p) => Math.hypot(point.x - p.x, point.y - p.y))),
            ),
          );
        });
        const trails = [...document.querySelectorAll(".subject-trail")].map((trail) =>
          [...trail.children].map((dot) => {
            if (!(dot instanceof SVGGraphicsElement))
              throw new Error("A thought dot has no geometry");
            const matrix = dot.getScreenCTM();
            if (!matrix) throw new Error("A thought dot has no rendered position");
            return new DOMPoint().matrixTransform(matrix);
          }),
        );
        return {
          gaps,
          trails: trails.map((dots) => ({
            count: dots.length,
            spacing: dots
              .slice(1)
              .map((dot, i) => Math.hypot(dot.x - dots[i].x, dot.y - dots[i].y)),
          })),
        };
      });
      expect(measured.gaps).toHaveLength(2);
      for (const gap of measured.gaps) {
        expect(gap).toBeGreaterThan(10);
        expect(gap).toBeLessThanOrEqual(41);
      }
      for (const trail of measured.trails) {
        expect(trail.count).toBeGreaterThan(0);
        for (const spacing of trail.spacing) expect(spacing).toBeLessThanOrEqual(16);
      }
      await page.screenshot({ path: testInfo.outputPath(`thought-cut-${width}-${language}.png`) });
    });
