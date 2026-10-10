import { describe, expect, it } from "vitest";
import { pairLayout, type Pt, type ThoughtWord } from "../kyoto-seika/balloonGeometry";
import { knobBox, type Box } from "./placement";
import {
  THOUGHT_CLEAR_PX,
  THOUGHT_INSET_PX,
  thoughtPlacement,
  type ThoughtSpot,
} from "./thoughtPlacement";

const PAIR: [ThoughtWord, ThoughtWord] = [
  { text: "graduation ceremony", reading: "", english: true },
  { text: "wind", reading: "", english: true },
];
const shape = (toward: Pt) => pairLayout(PAIR, "peek", toward);
const W = 390;
const H = 700;
const board = { W, H, top: THOUGHT_INSET_PX, bottom: H - THOUGHT_INSET_PX };
const sticker = (x: number, y: number) => ({ x, y, w: 120, h: 110, r: 4 });

/** Where a spot puts the whole thought, and its clouds, on the board. */
function placed(spot: ThoughtSpot) {
  const { w, h, clouds } = shape(spot.toward);
  return {
    box: { left: spot.left, top: spot.top, right: spot.left + w, bottom: spot.top + h },
    middle: spot.left + (clouds.minX + clouds.maxX) / 2,
  };
}
const inside = ({ left, top, right, bottom }: Box) =>
  left >= THOUGHT_INSET_PX &&
  right <= W - THOUGHT_INSET_PX &&
  top >= board.top &&
  bottom <= board.bottom;
const meets = (a: Box, b: Box) =>
  a.left < b.right + THOUGHT_CLEAR_PX &&
  a.right > b.left - THOUGHT_CLEAR_PX &&
  a.top < b.bottom + THOUGHT_CLEAR_PX &&
  a.bottom > b.top - THOUGHT_CLEAR_PX;

describe("where a peek at a sticker's subjects goes", () => {
  it("goes above the sticker, leaning toward the board's middle, inside the board", () => {
    for (const x of [90, W / 2 - 20, 300]) {
      const at = sticker(x, 420);
      const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [] });
      const { box, middle } = placed(spot);
      expect(box.bottom).toBeLessThanOrEqual(at.y);
      expect(inside(box)).toBe(true);
      expect(Math.sign(middle - at.x)).toBe(at.x < W / 2 ? 1 : -1);
    }
  });

  it("keeps clear of the rotate knob and the toolbar", () => {
    const at = sticker(W / 2, 400);
    const toolbar = { left: at.x - 90, top: at.y + 80, right: at.x + 90, bottom: at.y + 130 };
    const avoid = [knobBox(at, false), toolbar];
    const { box } = placed(thoughtPlacement({ sticker: at, board, shape, avoid }));
    for (const b of avoid) expect(meets(box, b)).toBe(false);
    expect(inside(box)).toBe(true);
  });

  it("goes below a sticker near the board's top, under its toolbar's way", () => {
    const at = sticker(150, 110);
    const header = { left: 10, top: 10, right: 200, bottom: 60 };
    const spot = thoughtPlacement({
      sticker: at,
      board,
      shape,
      avoid: [header, knobBox(at, true)],
    });
    const { box } = placed(spot);
    expect(box.top).toBeGreaterThanOrEqual(at.y);
    expect(inside(box)).toBe(true);
  });
});
