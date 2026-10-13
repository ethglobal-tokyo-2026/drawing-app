import { describe, expect, it } from "vitest";
import { pairLayout, type Pt, type ThoughtWord } from "../kyoto-seika/balloonGeometry";
import { knobBox, toolbarSpot, type Box } from "./placement";
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
const JAPANESE_PAIR: [ThoughtWord, ThoughtWord] = [
  { text: "風", reading: "", english: false },
  { text: "再会", reading: "", english: false },
];
const shape = (toward: Pt) => pairLayout(PAIR, "peek", toward);
const W = 390;
const H = 700;
const board = { W, H, top: THOUGHT_INSET_PX, bottom: H - THOUGHT_INSET_PX };
const sticker = (x: number, y: number) => ({ x, y, w: 120, h: 110, r: 4 });

/** Where a spot puts the whole thought, and its clouds, on the board. */
function placed(spot: ThoughtSpot) {
  const { clouds } = shape(spot.toward);
  const bubbles = spot.trails.flat().map((bead) => ({
    left: bead.x - bead.r - 2,
    top: bead.y - bead.r - 2,
    right: bead.x + bead.r + 2,
    bottom: bead.y + bead.r + 2,
  }));
  return {
    box: {
      left: spot.left + Math.min(clouds.minX, ...bubbles.map((b) => b.left)),
      top: spot.top + Math.min(clouds.minY, ...bubbles.map((b) => b.top)),
      right: spot.left + Math.max(clouds.maxX, ...bubbles.map((b) => b.right)),
      bottom: spot.top + Math.max(clouds.maxY, ...bubbles.map((b) => b.bottom)),
    },
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
  it("uses a nearby clear side before moving the thought away from a small sticker", () => {
    const at = { x: 175, y: 350, w: 60, h: 40, r: 0 };
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [knobBox(at, false)] });
    for (const trail of spot.trails) {
      const first = trail[0];
      const last = trail[trail.length - 1];
      expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(100);
    }
  });

  it("brings both trails back to a small sticker, even when its clouds must clear controls", () => {
    const at = { x: 175, y: 350, w: 60, h: 40, r: 0 };
    const spot = thoughtPlacement({
      sticker: at,
      board,
      shape,
      avoid: [knobBox(at, false), { left: 70, top: 400, right: 280, bottom: 450 }],
    });
    for (const trail of spot.trails) {
      const bead = trail[trail.length - 1];
      const distance = Math.hypot(
        Math.max(0, Math.abs(spot.left + bead.x - at.x) - at.w / 2),
        Math.max(0, Math.abs(spot.top + bead.y - at.y) - at.h / 2),
      );
      expect(distance - bead.r).toBeCloseTo(2);
    }
  });

  it("returns to the sticker's cut rather than its image's empty corners", () => {
    const at = {
      x: 175,
      y: 350,
      w: 100,
      h: 100,
      r: 0,
      cut: [
        { x: 0.4, y: 0.4 },
        { x: 0.6, y: 0.4 },
        { x: 0.6, y: 0.6 },
        { x: 0.4, y: 0.6 },
      ],
    };
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [] });
    for (const trail of spot.trails) {
      const bead = trail[trail.length - 1];
      const distance = Math.hypot(
        Math.max(0, Math.abs(spot.left + bead.x - 175) - 10),
        Math.max(0, Math.abs(spot.top + bead.y - 350) - 10),
      );
      expect(distance - bead.r).toBeCloseTo(2);
    }
  });

  it("attaches to the turned sticker's edges across phone sizes and both languages", () => {
    const pairs = [PAIR, JAPANESE_PAIR];
    for (const pair of pairs)
      for (const width of [320, 390, 440])
        for (const r of [-40, 0, 35, 80]) {
          const at = { x: width / 2, y: 350, w: 60, h: 40, r };
          const spot = thoughtPlacement({
            sticker: at,
            board: { ...board, W: width - 40 },
            shape: (toward) => pairLayout(pair, "peek", toward),
            avoid: [knobBox(at, false)],
          });
          const angle = (r * Math.PI) / 180;
          for (const trail of spot.trails) {
            const bead = trail[trail.length - 1];
            const dx = spot.left + bead.x - at.x;
            const dy = spot.top + bead.y - at.y;
            const distance = Math.hypot(
              Math.max(0, Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)) - 30),
              Math.max(0, Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle)) - 20),
            );
            expect(distance - bead.r).toBeCloseTo(2);
          }
        }
  });

  it("keeps the attached trails clear of the rotate knob and toolbar", () => {
    const at = { x: 80, y: 350, w: 30, h: 20, r: 0 };
    const toolbar = toolbarSpot(at, { W: 390, H: 651 }, { w: 180, h: 40 });
    const avoid = [
      knobBox(at, false),
      { ...toolbar, right: toolbar.left + 180, bottom: toolbar.top + 40 },
    ];
    const spot = thoughtPlacement({
      sticker: at,
      board: { W: 350, H: 651, top: 8, bottom: 643 },
      shape: (toward) => pairLayout(JAPANESE_PAIR, "peek", toward),
      avoid,
    });
    for (const trail of spot.trails)
      for (const bead of trail)
        for (const control of avoid) {
          const distance = Math.hypot(
            Math.max(control.left - spot.left - bead.x, 0, spot.left + bead.x - control.right),
            Math.max(control.top - spot.top - bead.y, 0, spot.top + bead.y - control.bottom),
          );
          expect(distance - bead.r).toBeGreaterThanOrEqual(THOUGHT_CLEAR_PX);
        }
  });

  it("goes above inside the board, leaning inward for stickers near its edges", () => {
    for (const x of [90, W / 2 - 20, 300]) {
      const at = sticker(x, 420);
      const spot = thoughtPlacement({ sticker: at, board, shape, avoid: [] });
      const { box, middle } = placed(spot);
      expect(box.bottom).toBeLessThanOrEqual(at.y);
      expect(inside(box)).toBe(true);
      if (Math.abs(at.x - W / 2) > W / 4)
        expect(Math.sign(middle - at.x)).toBe(at.x < W / 2 ? 1 : -1);
    }
  });

  it("keeps clear of the rotate knob and the toolbar", () => {
    const at = sticker(W / 2, 400);
    const toolbar = { left: at.x - 90, top: at.y + 80, right: at.x + 90, bottom: at.y + 130 };
    const avoid = [knobBox(at, false), toolbar];
    const spot = thoughtPlacement({ sticker: at, board, shape, avoid });
    const { box } = placed(spot);
    const { clouds } = shape(spot.toward);
    const parts = [
      {
        left: spot.left + clouds.minX,
        top: spot.top + clouds.minY,
        right: spot.left + clouds.maxX,
        bottom: spot.top + clouds.maxY,
      },
      ...spot.trails.flat().map((bead) => ({
        left: spot.left + bead.x - bead.r,
        top: spot.top + bead.y - bead.r,
        right: spot.left + bead.x + bead.r,
        bottom: spot.top + bead.y + bead.r,
      })),
    ];
    for (const b of avoid) for (const part of parts) expect(meets(part, b)).toBe(false);
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
