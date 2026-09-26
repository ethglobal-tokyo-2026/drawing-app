import { describe, expect, it } from "vitest";
import type { SealedSticker } from "./makeSticker";
import { makeTimelapse } from "./timelapse";

const sticker: Pick<SealedSticker, "inkWidth" | "inkHeight" | "place"> = {
  inkWidth: 400,
  inkHeight: 300,
  place: { x: 10, y: 20, w: 100, h: 80 },
};

describe("sticker timelapse", () => {
  it("encodes stroke points in tenths of a pixel and as deltas", () => {
    expect(
      makeTimelapse(sticker, [
        {
          tool: "brush",
          color: "#112233",
          T: 12.4,
          pts: [1.2, 2.3, 4, 5, 2.2, 3.3, 3.5, 8],
        },
        { tool: "fill", color: "#abcdef", T: 20, x: 5.5, y: 6.6 },
      ]),
    ).toEqual({
      v: 1,
      ink: [400, 300],
      place: [10, 20, 100, 80],
      ops: [
        ["brush", "#112233", 12, [12, 23, 40, 5, 10, 10, -5, 3]],
        ["fill", "#abcdef", 20, 55, 66],
      ],
    });
  });
});
