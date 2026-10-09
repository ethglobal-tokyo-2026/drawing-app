import { toScreen, type DealLayout, type Pt } from "./balloonGeometry";

/** Room kept round a line or number, from the die and the clouds' outlines, in px. */
const GAP_PX = 6;
/** A teasing line keeps at least this far inside the screen's edges, in px. */
export const TEASE_EDGE_PX = 10;

/** Whether `p` lies inside the closed outline `poly` (even-odd). */
function inside(p: Pt, poly: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      hit = !hit;
  }
  return hit;
}

/** The first of `candidates` that keeps clear of the die and of every cloud's outline, inside the screen's sides. */
function firstClear(
  layout: DealLayout,
  size: { w: number; h: number },
  candidates: readonly { left: number; top: number }[],
) {
  const { reroll } = layout;
  const outlines = layout.balloons.map((b) => b.white.map((p) => toScreen(b, p)));
  const clear = ({ left, top }: { left: number; top: number }) => {
    const box = { minX: left, minY: top, maxX: left + size.w, maxY: top + size.h };
    const holds = (p: Pt) =>
      p.x >= box.minX - GAP_PX &&
      p.x <= box.maxX + GAP_PX &&
      p.y >= box.minY - GAP_PX &&
      p.y <= box.maxY + GAP_PX;
    const corners = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.minX, y: box.maxY },
      { x: box.maxX, y: box.maxY },
    ];
    const meetsReroll =
      box.minX < reroll.maxX &&
      box.maxX > reroll.minX &&
      box.minY < reroll.maxY &&
      box.maxY > reroll.minY;
    return (
      box.minX >= TEASE_EDGE_PX &&
      box.maxX <= layout.width - TEASE_EDGE_PX &&
      !meetsReroll &&
      outlines.every((poly) => !poly.some(holds) && !corners.some((c) => inside(c, poly)))
    );
  };
  return candidates.find(clear) ?? candidates[0];
}

/**
 * Where the die's countdown number goes: under the die, or else beside it or over it, wherever it
 * first keeps clear of the die and of the clouds.
 */
export function countPlacement(layout: DealLayout, size: { w: number; h: number }) {
  const { reroll, die } = layout;
  const middle = die.y - size.h / 2;
  return firstClear(layout, size, [
    { left: die.x - size.w / 2, top: reroll.maxY + GAP_PX },
    { left: reroll.maxX + GAP_PX, top: middle },
    { left: die.x - size.w / 2, top: reroll.minY - GAP_PX - size.h },
    { left: reroll.minX - GAP_PX - size.w, top: middle },
  ]);
}

/**
 * Where the die's teasing line goes, inside the screen and clear of the die: over the die, ending at
 * its right, or else under it, wherever it keeps clear of the clouds; a line too long for either goes
 * under the whole deal.
 */
export function teasePlacement(layout: DealLayout, size: { w: number; h: number }) {
  const { reroll } = layout;
  const left = Math.max(
    TEASE_EDGE_PX,
    Math.min(layout.width - size.w - TEASE_EDGE_PX, reroll.maxX - size.w),
  );
  const foot = Math.max(reroll.maxY, ...layout.balloons.map((b) => b.reach.maxY));
  return firstClear(layout, size, [
    { left, top: reroll.minY - GAP_PX - size.h },
    { left, top: reroll.maxY + GAP_PX },
    { left, top: foot + 2 * GAP_PX },
  ]);
}
