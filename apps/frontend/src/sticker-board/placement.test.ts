import { describe, expect, it } from "vitest";
import {
  FIRST_SPOT,
  fieldOf,
  freeSpot,
  knobHidden,
  nextZ,
  sizeOf,
  toFrac,
  toolbarSpot,
  type Placement,
} from "./placement";

const at = (x: number, y: number): Placement => ({ on: true, x, y, s: 0.3, r: 0, z: 1 });

describe("placement", () => {
  it("puts a new sticker away from the ones already there", () => {
    const taken = [at(0.72, 0.8), at(0.28, 0.8)];
    const spot = freeSpot(taken);
    for (const t of taken)
      expect(Math.hypot(spot.x - t.x, (spot.y - t.y) * 1.4)).toBeGreaterThan(0.3);
  });

  it("lands the first sticker on the empty board's dashed spot", () => {
    expect(freeSpot([])).toMatchObject(FIRST_SPOT);
  });

  it("gives the same spot for the same board", () => {
    expect(freeSpot([at(0.5, 0.45)])).toEqual(freeSpot([at(0.5, 0.45)]));
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

  it("finds the knob out of reach off the board's top or under the name, and nowhere else", () => {
    const name = { left: 14, top: 12, right: 150, bottom: 68 };
    const knobOff = (x: number, y: number, r = 0) => knobHidden({ x, y, h: 100, r }, name);
    expect(knobOff(250, 300)).toBe(false);
    expect(knobOff(250, 80)).toBe(true);
    expect(knobOff(80, 150)).toBe(true);
    expect(knobOff(250, 150)).toBe(false);
    expect(knobOff(250, 80, 180)).toBe(false);
  });

  it("stacks a raised sticker above all the others", () => {
    expect(nextZ([at(0, 0), { ...at(0, 0), z: 7 }])).toBe(8);
  });
});
