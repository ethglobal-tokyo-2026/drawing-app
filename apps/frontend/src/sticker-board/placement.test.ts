import { describe, expect, it } from "vitest";
import {
  FIRST_SPOT,
  fieldOf,
  freeSpot,
  hintSpot,
  knobHidden,
  LAID_OUT_SPOTS,
  nextZ,
  S_MAX,
  sizeOf,
  SPOT_BOUNDS,
  toFrac,
  toolbarSpot,
  toPx,
  type Box,
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

  it("gives each sticker past the laid-out spots its own, inside their bounds, the same each time", () => {
    const fill = () => {
      const board: Placement[] = [];
      for (let z = 1; z <= LAID_OUT_SPOTS * 3; z++) board.push({ on: true, ...freeSpot(board), z });
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

  describe("the first selection's hint", () => {
    const hint = { w: 321, h: 48 };
    const bar = { w: 296, h: 94 };
    const name = { left: 14, top: 12, right: 150, bottom: 68 };
    const overlap = (a: Box, b: Box) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    /** Draw sits at the board's lower left, as StickerBoard.css puts it. */
    const drawOn = (board: { W: number; H: number }): Box => ({
      left: 14,
      top: board.H - 68,
      right: 172,
      bottom: board.H - 14,
    });
    /** The sticker's toolbar and hint, placed as the toolbar places them. */
    const placed = (board: { W: number; H: number }, sticker: StickerSpot) => {
      const clearOf = drawOn(board);
      const knobBelow = knobHidden(sticker, name);
      const { left, top } = toolbarSpot(sticker, board, bar, { knobBelow, clearOf });
      const toolbar = { left, top, right: left + bar.w, bottom: top + bar.h };
      const spot = hintSpot(sticker, board, hint, toolbar, { knobBelow, clearOf });
      return { toolbar, spot, knobBelow, clearOf };
    };
    type StickerSpot = { x: number; y: number; w: number; h: number; r: number };
    const stickerAt = (
      board: { W: number; H: number },
      at: { x: number; y: number },
      s: number,
    ) => {
      const { w, h } = sizeOf(board.W, s, { width: 4, height: 3 });
      return { ...toPx(fieldOf(board.W, board.H), at), w, h, r: 0 };
    };

    it("covers none of the sticker, its handles and knob, the toolbar or Draw, wherever the sticker sits", () => {
      let shown = 0;
      for (const board of [
        { W: 375, H: 523 },
        { W: 390, H: 673 },
      ])
        for (const s of [0.2, 0.36, 0.5])
          for (let y = 0; y <= 1; y += 0.125)
            for (let x = 0; x <= 1; x += 0.25) {
              const sticker = stickerAt(board, { x, y }, s);
              const { toolbar, spot, knobBelow, clearOf } = placed(board, sticker);
              if (!spot) continue;
              shown++;
              const box = {
                left: spot.left,
                top: spot.top,
                right: spot.left + hint.w,
                bottom: spot.top + hint.h,
              };
              // The frame and its handles reach 20px past the sticker; the knob's disc stands 42.5px past it.
              const frame = {
                left: sticker.x - sticker.w / 2 - 20,
                top: sticker.y - sticker.h / 2 - 20,
                right: sticker.x + sticker.w / 2 + 20,
                bottom: sticker.y + sticker.h / 2 + 20,
              };
              const knobY = sticker.y + (knobBelow ? 1 : -1) * (sticker.h / 2 + 42.5);
              const knob = {
                left: sticker.x - 14,
                top: knobY - 14,
                right: sticker.x + 14,
                bottom: knobY + 14,
              };
              for (const covered of [frame, knob, toolbar, clearOf])
                expect(overlap(box, covered)).toBe(false);
              expect(box.left).toBeGreaterThanOrEqual(10);
              expect(box.right).toBeLessThanOrEqual(board.W - 40);
            }
      expect(shown).toBeGreaterThan(0);
    });

    it("hangs under the toolbar when the board has room, and above the knob where Draw leaves none", () => {
      const roomy = { W: 390, H: 673 };
      const first = stickerAt(roomy, FIRST_SPOT, 0.36);
      const under = placed(roomy, first);
      expect(under.toolbar.top).toBeGreaterThan(first.y);
      expect(under.spot?.top).toBeGreaterThanOrEqual(under.toolbar.bottom);
      expect(under.spot?.top).toBeLessThan(under.toolbar.bottom + hint.h);

      // On a short phone the toolbar fills the way down to Draw, so the hint goes over the sticker.
      const short = { W: 375, H: 523 };
      const centered = stickerAt(short, FIRST_SPOT, 0.36);
      const over = placed(short, centered);
      expect(over.toolbar.top).toBeGreaterThan(centered.y);
      expect(over.spot?.top).toBeLessThan(centered.y - centered.h / 2);
    });

    it("finds no spot, rather than covering something, when the sticker leaves no room", () => {
      const short = { W: 375, H: 523 };
      // The biggest sticker, mid-field: too little board is left above its knob or below it.
      expect(placed(short, stickerAt(short, { x: 0.5, y: 0.5 }, S_MAX)).spot).toBeNull();
    });
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
