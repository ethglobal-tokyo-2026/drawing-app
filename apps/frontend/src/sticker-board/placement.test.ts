import { describe, expect, it } from "vitest";
import {
  FIRST_SPOT,
  fieldOf,
  footprintOf,
  freeSpot,
  knobBox,
  knobHidden,
  LAID_OUT_SPOTS,
  LARGE_LANDING_GROWTH,
  meets,
  MIDDLE_CLEAR,
  NATURAL_SCALE,
  nextZ,
  PHONE_BOARD,
  PHONE_BOARD_SIZE,
  PHONE_UNIT_MAX,
  RESIZE_REACH,
  sizeOf,
  SPOT_BOUNDS,
  sRangeOf,
  toFrac,
  toolbarSpot,
  TRAY_EDGE,
  unitOf,
  type Art,
  type BoardSize,
  type Placement,
  type Taken,
} from "./placement";

/** A sticker drawn `long` units on its long side, its image twice that in px, in this shape. */
const drawn = (long: number, shape = { w: 3, h: 4 }): Art => {
  const k = long / Math.max(shape.w, shape.h);
  return {
    width: 2 * k * shape.w,
    height: 2 * k * shape.h,
    drawnWidth: k * shape.w,
    drawnHeight: k * shape.h,
  };
};
const USUAL = drawn(480);
const LARGE_BOARD: BoardSize = { W: 1180, H: 740, U: unitOf("large", 1180) };

/** The long side, in board px, a sticker with this art lands at on this board. */
const landedLong = (art: Art, layout: "phone" | "large", board: BoardSize) => {
  const { w, h } = sizeOf(board.U, freeSpot([], art, layout, board).s, art);
  return Math.max(w, h);
};

/** Stickers on the board at these spots, each the usual size. */
const stuck = (...spots: [number, number][]): Taken[] =>
  spots.map(([x, y], i) => ({
    placement: { on: true, x, y, s: 0.3, r: 0, z: i + 1 },
    art: USUAL,
  }));

describe("placement", () => {
  it("lands a sticker at the size it was drawn, times NATURAL_SCALE, on a phone board", () => {
    for (const long of [120, 480, 900])
      expect(landedLong(drawn(long), "phone", PHONE_BOARD_SIZE)).toBeCloseTo(
        long * NATURAL_SCALE,
        1,
      );
    // A wider phone scales every sticker alike.
    const wide = { W: PHONE_UNIT_MAX, H: 760, U: unitOf("phone", PHONE_UNIT_MAX) };
    expect(
      landedLong(drawn(900), "phone", wide) / landedLong(drawn(300), "phone", wide),
    ).toBeCloseTo(3);
  });

  it("lands a sticker a size larger in the large layout", () => {
    for (const art of [drawn(200), USUAL])
      expect(landedLong(art, "large", LARGE_BOARD)).toBeCloseTo(
        landedLong(art, "phone", PHONE_BOARD_SIZE) * LARGE_LANDING_GROWTH,
        1,
      );
  });

  describe("a sticker's sizes", () => {
    const BOARDS = [
      { layout: "phone", W: PHONE_BOARD.W, H: PHONE_BOARD.H },
      { layout: "large", W: 1024, H: 1180 },
    ] as const;
    const rangeOn = (art: Art, board: (typeof BOARDS)[number]) => {
      const field = fieldOf(board.W, board.H);
      const unit = unitOf(board.layout, board.W);
      const range = sRangeOf(art, board.layout, field, unit);
      return {
        range,
        field,
        unit,
        natural: freeSpot([], art, board.layout, { ...board, U: unit }).s,
      };
    };

    it("run from half to twice its natural size", () => {
      for (const board of BOARDS)
        for (const art of [drawn(160), USUAL]) {
          const { range, natural } = rangeOn(art, board);
          expect(range.min).toBeCloseTo(natural / RESIZE_REACH);
          expect(range.max).toBeCloseTo(natural * RESIZE_REACH);
        }
    });

    it("stay inside the board's field, however big or thin the sticker", () => {
      for (const board of BOARDS)
        for (const art of [drawn(900), drawn(900, { w: 1, h: 12 }), drawn(900, { w: 12, h: 1 })]) {
          const { range, field, unit } = rangeOn(art, board);
          const { w, h } = sizeOf(unit, range.max, art);
          expect(w).toBeLessThanOrEqual(field.w + 1e-9);
          expect(h).toBeLessThanOrEqual(field.h + 1e-9);
        }
    });
  });

  it("lands the first sticker on the empty board's dashed spot", () => {
    expect(freeSpot([], USUAL, "phone", PHONE_BOARD_SIZE)).toMatchObject(FIRST_SPOT);
  });

  it("lands a sticker clear of the ones already there, with room for its size", () => {
    const field = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
    const footprint = (p: Pick<Placement, "x" | "y" | "s" | "r">, art: Taken["art"]) =>
      footprintOf(field, PHONE_BOARD_SIZE.U, p, art);
    const taken = stuck([0.5, 0.42], [0.72, 0.8]);
    for (const art of [drawn(200), USUAL, drawn(700)]) {
      const at = footprint(freeSpot(taken, art, "phone", PHONE_BOARD_SIZE), art);
      for (const t of taken) {
        const other = footprint(t.placement, t.art);
        const apart = Math.max(
          Math.abs(at.x - other.x) - at.ex - other.ex,
          Math.abs(at.y - other.y) - at.ey - other.ey,
        );
        expect(apart).toBeGreaterThanOrEqual(0);
      }
    }
    // With only the top spot left, a sticker drawn large moves down from it to stay on the field.
    const big = drawn(900);
    const full = stuck([0.5, 0.42], [0.72, 0.8], [0.28, 0.8], [0.26, 0.4], [0.75, 0.3]);
    const at = footprint(freeSpot(full, big, "phone", PHONE_BOARD_SIZE), big);
    expect(at.y - at.ey).toBeGreaterThanOrEqual(field.top - 1e-9);
    expect(at.y + at.ey).toBeLessThanOrEqual(field.top + field.h + 1e-9);
  });

  it("gives each sticker past the laid-out spots its own, inside their bounds, the same each time", () => {
    const fill = () => {
      const board: Taken[] = [];
      for (let z = 1; z <= LAID_OUT_SPOTS * 3; z++) {
        const spot = freeSpot(board, drawn(240), "phone", PHONE_BOARD_SIZE);
        board.push({ placement: { on: true, ...spot, z }, art: drawn(240) });
      }
      return board.map((t) => t.placement);
    };
    const board = fill();
    const within = (v: number, [lo, hi]: readonly [number, number]) => {
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
    };
    for (const p of board) {
      within(p.x, SPOT_BOUNDS.x);
      within(p.y, SPOT_BOUNDS.y);
      within(p.r, SPOT_BOUNDS.r);
    }
    expect(new Set(board.map((p) => `${p.x},${p.y}`)).size).toBe(board.length);
    expect(fill()).toEqual(board);
  });

  it("sizes the long side as a share of the board's width, keeping the art's shape", () => {
    expect(sizeOf(400, 0.5, { width: 200, height: 100 })).toEqual({ w: 200, h: 100 });
    expect(sizeOf(400, 0.5, { width: 100, height: 200 })).toEqual({ w: 100, h: 200 });
  });

  it("keeps a point dropped past the field's edge on the field", () => {
    const field = fieldOf(390, 700);
    expect(toFrac(field, { x: 1000, y: -50 })).toEqual({ x: 1, y: 0 });
  });

  it("puts the toolbar under a sticker, or over it near the foot, clear of the tray's edge", () => {
    const board = { W: 390, H: 657 };
    const bar = { w: 180, h: 46 };
    const sticker = { x: 150, y: 300, w: 120, h: 100, r: 0 };
    expect(toolbarSpot(sticker, board, bar).top).toBeGreaterThan(sticker.y + sticker.h / 2);
    const low = toolbarSpot({ ...sticker, y: 560 }, board, bar);
    expect(low.top + bar.h).toBeLessThan(560 - sticker.h / 2);
    const right = toolbarSpot({ ...sticker, x: 370 }, board, bar);
    expect(right.left + bar.w).toBeLessThanOrEqual(board.W - TRAY_EDGE);
  });

  it("keeps the toolbar off the knob's touch area on either side, turned or near the board's edges", () => {
    const board = { W: PHONE_BOARD.W, H: PHONE_BOARD.H };
    // One row, and with Arrange's step tiles out.
    for (const bar of [
      { w: 180, h: 46 },
      { w: 296, h: 94 },
    ])
      for (const knobBelow of [false, true])
        for (const r of [0, 25, 90, 160, 180, 300])
          for (const x of [40, board.W / 2, 330])
            for (const y of [110, board.H / 2, 590]) {
              const sticker = { x, y, w: 120, h: 90, r };
              const { left, top } = toolbarSpot(sticker, board, bar, { knobBelow });
              const toolbar = { left, top, right: left + bar.w, bottom: top + bar.h };
              expect(meets(toolbar, knobBox(sticker, knobBelow))).toBe(false);
            }
  });

  it("keeps the toolbar clear of Draw wherever the sticker sits, however big it is", () => {
    const board = { W: 390, H: 776 };
    const bar = { w: 290, h: 46 };
    const draw = { left: 14, top: 708, right: 132, bottom: 762 };
    const meetsDraw = ({ left, top }: { left: number; top: number }) =>
      left < draw.right && left + bar.w > draw.left && top < draw.bottom && top + bar.h > draw.top;
    for (const size of [60, 130, 260])
      for (let y = 100; y <= 740; y += 20)
        for (let x = 40; x <= 340; x += 30) {
          const sticker = { x, y, w: size, h: size * 0.8, r: 0 };
          expect(meetsDraw(toolbarSpot(sticker, board, bar, { clearOf: draw }))).toBe(false);
        }
    // Low on the board, it goes over the sticker rather than onto Draw.
    const low = { x: 250, y: 600, w: 130, h: 100, r: 0 };
    expect(toolbarSpot(low, board, bar, { clearOf: draw }).top + bar.h).toBeLessThan(
      low.y - low.h / 2,
    );
  });

  it("keeps the sticker's middle free for the tap that opens it when neither side has room", () => {
    const board = { W: 375, H: 523 };
    const bar = { w: 296, h: 94 };
    const draw = { left: 14, top: board.H - 68, right: 172, bottom: board.H - 14 };
    for (const h of [80, 116, 150])
      for (let y = 120; y <= 480; y += 10) {
        const sticker = { x: 180, y, w: h * (4 / 3), h, r: 0 };
        const { top } = toolbarSpot(sticker, board, bar, { clearOf: draw });
        expect(top > y + MIDDLE_CLEAR || top + bar.h < y - MIDDLE_CLEAR).toBe(true);
      }
  });

  it("finds the knob out of reach off the board's top or under the name, and nowhere else", () => {
    const name = { left: 14, top: 12, right: 150, bottom: 68 };
    const knobOff = (x: number, y: number, r = 0) => knobHidden({ x, y, h: 100, r }, name);
    expect(knobOff(250, 300)).toBe(false);
    expect(knobOff(250, 80)).toBe(true);
    expect(knobOff(80, 150)).toBe(true);
    expect(knobOff(250, 150)).toBe(false);
    expect(knobOff(250, 80, 180)).toBe(false);
    // Its disc clears the name here, but its touch area doesn't, so a tap would turn the board over.
    expect(knobOff(80, 178)).toBe(true);
  });

  it("stacks a raised sticker above all the others", () => {
    const [low] = stuck([0, 0]).map((t) => t.placement);
    expect(nextZ([low, { ...low, z: 7 }])).toBe(8);
  });
});

describe("unitOf", () => {
  it("sizes a phone layout's stickers by the board's width, up to the widest phone's", () => {
    for (const width of [375, PHONE_BOARD.W, PHONE_UNIT_MAX])
      expect(unitOf("phone", width)).toBe(width);
    expect(unitOf("phone", PHONE_UNIT_MAX + 100)).toBe(PHONE_UNIT_MAX);
  });
});
