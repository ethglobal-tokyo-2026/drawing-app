import { describe, expect, it } from "vitest";
import { dotSpot } from "./stickerShape";

describe("dotSpot", () => {
  const wide = (id: string, outline?: string) => ({
    id,
    no: 1,
    width: 200,
    height: 100,
    ...(outline !== undefined && { outline }),
  });

  it("sticks on the cut line where it comes nearest the top-right corner, measured in pixels", () => {
    // The image's bottom-left half: in pixels the nearest point is 4/5 along the long side, where
    // measuring in units of the image would put it halfway.
    expect(dotSpot(wide("half", "M0 0L200 100L0 100Z"))).toEqual({ x: 0.8, y: 0.8 });
  });

  it("takes the corner itself until the cut line is known", () => {
    expect(dotSpot(wide("unknown"))).toEqual({ x: 1, y: 0 });
  });
});
