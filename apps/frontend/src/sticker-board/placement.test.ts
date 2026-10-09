import { describe, expect, it } from "vitest";
import {
  FIRST_SPOT,
  fieldOf,
  freeSpot,
  knobHidden,
  LAID_OUT_SPOTS,
  LARGE_LANDING_GROWTH,
  maxSOf,
  nextZ,
  PHONE_BOARD,
  PHONE_UNIT_MAX,
  sizeOf,
  SPOT_BOUNDS,
  toFrac,
  toolbarSpot,
  unitOf,
  type Placement,
} from "./placement";

const at = (x: number, y: number): Placement => ({ on: true, x, y, s: 0.3, r: 0, z: 1 });

describe("placement", () => {
  it("puts a new sticker away from the ones already there", () => {
    const taken = [at(0.72, 0.8), at(0.28, 0.8)];
    const spot = freeSpot(taken, "phone");
    for (const t of taken)
      expect(Math.hypot(spot.x - t.x, (spot.y - t.y) * 1.4)).toBeGreaterThan(0.3);
  });

  it("lands the first sticker on the empty board's dashed spot", () => {
    expect(freeSpot([], "phone")).toMatchObject(FIRST_SPOT);
  });

  it("gives the same spot for the same board", () => {
    expect(freeSpot([at(0.5, 0.45)], "phone")).toEqual(freeSpot([at(0.5, 0.45)], "phone"));
  });

  it("lands a new sticker larger in the large layout, at the spot a phone gives it", () => {
    for (const taken of [[], [at(0.5, 0.45)], [at(0.72, 0.8), at(0.28, 0.8)]]) {
      const phone = freeSpot(taken, "phone");
      const large = freeSpot(taken, "large");
      expect(large).toMatchObject({ x: phone.x, y: phone.y, r: phone.r });
      expect(large.s).toBeGreaterThan(phone.s);
      expect(large.s).toBeCloseTo(phone.s * LARGE_LANDING_GROWTH);
    }
  });

  describe("a sticker's largest size", () => {
    const SMILEY = { width: 90, height: 96 };
    const FULL_SHEET = { width: 1170, height: 1953 };
    const BOARDS = [
      { layout: "phone", W: PHONE_BOARD.W, H: PHONE_BOARD.H },
      { layout: "large", W: 1024, H: 1180 },
    ] as const;
    const largest = (art: { width: number; height: number }, board: (typeof BOARDS)[number]) => {
      const field = fieldOf(board.W, board.H);
      const unit = unitOf(board.layout, board.W);
      const { w, h } = sizeOf(unit, maxSOf(art, board.layout, field, unit), art);
      return { w, h, field };
    };

    it("covers the same area for a small-drawn sticker and a full-sheet one", () => {
      for (const board of BOARDS) {
        const smiley = largest(SMILEY, board);
        const fullSheet = largest(FULL_SHEET, board);
        expect(Math.sqrt(fullSheet.w * fullSheet.h)).toBeCloseTo(Math.sqrt(smiley.w * smiley.h));
      }
    });

    it("stays inside the board's field, however thin the sticker", () => {
      for (const board of BOARDS)
        for (const art of [
          SMILEY,
          FULL_SHEET,
          { width: 1200, height: 90 },
          { width: 90, height: 1200 },
        ]) {
          const { w, h, field } = largest(art, board);
          expect(w).toBeLessThanOrEqual(field.w + 1e-9);
          expect(h).toBeLessThanOrEqual(field.h + 1e-9);
        }
    });
  });

  it("gives each sticker past the laid-out spots its own, inside their bounds, the same each time", () => {
    const fill = () => {
      const board: Placement[] = [];
      for (let z = 1; z <= LAID_OUT_SPOTS * 3; z++)
        board.push({ on: true, ...freeSpot(board, "phone"), z });
      return board;
    };
    const board = fill();
    const within = (v: number, [lo, hi]: readonly [number, number]) => {
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
    };
    for (const p of board) {
      within(p.x, SPOT_BOUNDS.x);
      within(p.y, SPOT_BOUNDS.y);
      within(p.s, SPOT_BOUNDS.s);
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
    expect(right.left + bar.w).toBeLessThanOrEqual(board.W - 40);
    // With the knob hanging below, the toolbar clears the knob's far edge.
    const knobEdge = sticker.y + sticker.h / 2 + 42.5 + 14;
    expect(toolbarSpot(sticker, board, bar, { knobBelow: true }).top).toBeGreaterThan(knobEdge);
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
        expect(top > y + 22 || top + bar.h < y - 22).toBe(true);
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
    expect(nextZ([at(0, 0), { ...at(0, 0), z: 7 }])).toBe(8);
  });
});

describe("unitOf", () => {
  it("sizes a phone layout's stickers by the board's width, up to the widest phone's", () => {
    for (const width of [375, PHONE_BOARD.W, PHONE_UNIT_MAX])
      expect(unitOf("phone", width)).toBe(width);
    expect(unitOf("phone", PHONE_UNIT_MAX + 100)).toBe(PHONE_UNIT_MAX);
  });
});
