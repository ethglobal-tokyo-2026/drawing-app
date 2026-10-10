import { clamp } from "../ui/easing";

/** The room a chip takes, for keeping chips off each other. */
const CHIP_W = 156;
const CHIP_H = 44;
/** How far a chip moves down, under one in its way: its height and a hair. */
export const DROP = CHIP_H + 2;
/** A chip hangs this far out and up from its sticker's top-left corner. */
export const OVERHANG = { x: 10, y: 20 };
/**
 * Where a chip's corner may go: in from the board's left edge, under the header, room for a long
 * handle's chip before the right edge, and clear of the foot, where Draw is.
 */
export const CHIP_ROOM = { left: 8, top: 74, fromRight: 200, fromFoot: 150 };

/**
 * Where each artist chip goes, in greeting order, top to bottom: at its sticker's top-left corner,
 * kept under the header and clear of the board's right edge and foot, and under any chip already in
 * its way. `box` is the sticker's center and size, in board pixels.
 */
export function placeChips<C extends { box: { x: number; y: number; w: number; h: number } }>(
  chips: readonly C[],
  { W, H }: { W: number; H: number },
) {
  const placed: Array<{ left: number; top: number }> = [];
  const inTheWay = (left: number, top: number) =>
    placed.find(
      (q) =>
        left < q.left + CHIP_W &&
        q.left < left + CHIP_W &&
        top < q.top + CHIP_H &&
        q.top < top + CHIP_H,
    );
  return chips
    .toSorted((a, b) => a.box.y - a.box.h / 2 - (b.box.y - b.box.h / 2))
    .map((chip, i) => {
      const { x, y, w, h } = chip.box;
      const left = clamp(x - w / 2 - OVERHANG.x, CHIP_ROOM.left, W - CHIP_ROOM.fromRight);
      let top = clamp(y - h / 2 - OVERHANG.y, CHIP_ROOM.top, H - CHIP_ROOM.fromFoot);
      // Each drop takes it past the chip in its way, so it settles once it's clear of them all.
      for (let hit = inTheWay(left, top); hit; hit = inTheWay(left, top)) top = hit.top + DROP;
      placed.push({ left, top });
      return { ...chip, left, top, i };
    });
}
