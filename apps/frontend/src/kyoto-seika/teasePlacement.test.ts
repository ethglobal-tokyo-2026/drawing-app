import { describe, expect, it } from "vitest";
import type { Balloon } from "./deal";
import { TEASE_EDGE_PX, teasePlacement } from "./teasePlacement";

describe("a teasing line's place", () => {
  it("puts the upper balloon's line above it and the lower's below, inside the screen's edges", () => {
    const size = { w: 160, h: 26 };
    const cloud = { top: 200, bottom: 330 };
    const at = (balloon: Balloon, dieRight: number) =>
      teasePlacement({ balloon, cloud, dieRight, size, screenWidth: 390 });
    expect(at(0, 300).top + size.h).toBeLessThanOrEqual(cloud.top);
    expect(at(1, 300).top).toBeGreaterThanOrEqual(cloud.bottom);
    expect(at(0, 389).left + size.w).toBeLessThanOrEqual(390 - TEASE_EDGE_PX);
    expect(at(0, 20).left).toBeGreaterThanOrEqual(TEASE_EDGE_PX);
  });
});
