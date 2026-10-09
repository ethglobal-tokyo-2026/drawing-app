import { describe, expect, it } from "vitest";
import { dealLayout, toScreen, type DealLayout } from "./balloonGeometry";
import { dealKinds } from "./deal";
import { DEAL, TEST_SUBJECTS } from "./testSubjects";
import { countPlacement, TEASE_EDGE_PX, teasePlacement } from "./teasePlacement";

const PHONES = [
  { width: 390, top: 142, bottom: 641 },
  { width: 375, top: 142, bottom: 464 },
];

/** The box at `at`, `size` big, keeps clear of the die and of every cloud's outline, inside the screen. */
function expectClear(
  layout: DealLayout,
  at: { left: number; top: number },
  size: { w: number; h: number },
) {
  const box = { minX: at.left, minY: at.top, maxX: at.left + size.w, maxY: at.top + size.h };
  const inBox = (p: { x: number; y: number }) =>
    p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
  const { reroll } = layout;
  expect(
    box.minX < reroll.maxX &&
      box.maxX > reroll.minX &&
      box.minY < reroll.maxY &&
      box.maxY > reroll.minY,
  ).toBe(false);
  for (const cloud of layout.balloons)
    expect(cloud.white.some((p) => inBox(toScreen(cloud, p)))).toBe(false);
  expect(box.minX).toBeGreaterThanOrEqual(TEASE_EDGE_PX);
  expect(box.maxX).toBeLessThanOrEqual(layout.width - TEASE_EDGE_PX);
}

describe("the die's countdown and teasing lines", () => {
  it("keep clear of the die and of every cloud, inside the screen, short or long", () => {
    for (const phone of PHONES) {
      const layout = dealLayout({
        ...phone,
        kinds: dealKinds(TEST_SUBJECTS, DEAL),
        list: TEST_SUBJECTS,
        seed: 1,
      });
      const count = { w: 34, h: 50 };
      expectClear(layout, countPlacement(layout, count), count);
      for (const w of [60, 160, 300]) {
        const line = { w, h: 26 };
        expectClear(layout, teasePlacement(layout, line), line);
      }
    }
  });
});
