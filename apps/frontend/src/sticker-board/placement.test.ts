import { describe, expect, it } from "vitest";
import { autoPlace } from "./placement";

describe("autoPlace", () => {
  it("is stable for the same sticker", () => {
    expect(autoPlace("abc", [], 1)).toEqual(autoPlace("abc", [], 1));
  });

  it("keeps away from stickers already on the board", () => {
    const taken = [{ x: 0.3, y: 0.3, scale: 0.3, z: 1 }];
    const p = autoPlace("xyz", taken, 2);
    expect(Math.hypot(p.x - 0.3, p.y - 0.3)).toBeGreaterThan(0.2);
    expect(p.x).toBeGreaterThanOrEqual(0.2);
    expect(p.x).toBeLessThanOrEqual(0.8);
  });
});
