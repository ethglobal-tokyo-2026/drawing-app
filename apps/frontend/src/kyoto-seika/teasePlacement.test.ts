import { describe, expect, it } from "vitest";
import { pairLayout, toScreen } from "./balloonGeometry";
import type { Balloon } from "./deal";
import { countPlacement, TEASE_EDGE_PX, teasePlacement } from "./teasePlacement";

describe("a countdown's place", () => {
  const phones = [
    { width: 390, top: 142, bottom: 641 },
    { width: 375, top: 142, bottom: 437 },
  ];
  const size = { w: 34, h: 50 };

  it("keeps the number clear of its die and of both clouds' outlines, inside the screen", () => {
    for (const phone of phones) {
      const layout = pairLayout(phone);
      for (const balloon of [0, 1] as const) {
        const at = countPlacement(layout, balloon, size);
        const box = { minX: at.left, minY: at.top, maxX: at.left + size.w, maxY: at.top + size.h };
        const inBox = (p: { x: number; y: number }) =>
          p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
        const { reroll } = layout.balloons[balloon];
        const meetsReroll =
          box.minX < reroll.maxX &&
          box.maxX > reroll.minX &&
          box.minY < reroll.maxY &&
          box.maxY > reroll.minY;
        expect(meetsReroll).toBe(false);
        for (const cloud of layout.balloons)
          expect(cloud.cloud.white.some((p) => inBox(toScreen(cloud, p)))).toBe(false);
        expect(box.minX).toBeGreaterThanOrEqual(TEASE_EDGE_PX);
        expect(box.maxX).toBeLessThanOrEqual(phone.width - TEASE_EDGE_PX);
      }
    }
  });
});

describe("a teasing line's place", () => {
  const cloud = { top: 200, bottom: 330 };
  /** The reroll under the cloud's right edge. */
  const reroll = { minX: 150, minY: 334, maxX: 250, maxY: 366 };
  const at = (balloon: Balloon, w: number) =>
    teasePlacement({ balloon, cloud, reroll, size: { w, h: 26 }, screenWidth: 390 });
  const meets = (p: { left: number; top: number }, w: number) =>
    p.left < reroll.maxX &&
    p.left + w > reroll.minX &&
    p.top < reroll.maxY &&
    p.top + 26 > reroll.minY;

  it("puts the upper cloud's line above it and the lower's below, inside the screen's edges", () => {
    expect(at(0, 160).top + 26).toBeLessThanOrEqual(cloud.top);
    expect(at(1, 160).top).toBeGreaterThanOrEqual(cloud.bottom);
    for (const balloon of [0, 1] as const)
      for (const w of [60, 160, 300]) {
        const { left } = at(balloon, w);
        expect(left).toBeGreaterThanOrEqual(TEASE_EDGE_PX);
        expect(left + w).toBeLessThanOrEqual(390 - TEASE_EDGE_PX);
      }
  });

  it("keeps a line clear of its die, short or long", () => {
    for (const balloon of [0, 1] as const)
      for (const w of [60, 120, 160, 300]) expect(meets(at(balloon, w), w)).toBe(false);
  });
});
