import { toScreen, type Box, type PairLayout, type Pt } from "./balloonGeometry";
import type { Balloon } from "./deal";

/** Room kept round the countdown's number, from its die and the clouds' outlines, in px. */
const COUNT_GAP_PX = 6;

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

/**
 * Where a die's countdown number goes: under the die, or else beside it or over it, wherever it first
 * keeps clear of the die and of both clouds' outlines, inside the screen's sides.
 */
export function countPlacement(
  layout: PairLayout,
  balloon: Balloon,
  size: { w: number; h: number },
) {
  const { reroll, die } = layout.balloons[balloon];
  const gap = COUNT_GAP_PX;
  const middle = die.y - size.h / 2;
  const candidates = [
    { left: die.x - size.w / 2, top: reroll.maxY + gap },
    { left: reroll.maxX + gap, top: middle },
    { left: reroll.minX - gap - size.w, top: middle },
    { left: die.x - size.w / 2, top: reroll.minY - gap - size.h },
  ];
  const outlines = layout.balloons.map((b) => b.cloud.white.map((p) => toScreen(b, p)));
  const clear = ({ left, top }: { left: number; top: number }) => {
    const box = { minX: left, minY: top, maxX: left + size.w, maxY: top + size.h };
    const near = {
      minX: box.minX - gap,
      minY: box.minY - gap,
      maxX: box.maxX + gap,
      maxY: box.maxY + gap,
    };
    const holds = (p: Pt) =>
      p.x >= near.minX && p.x <= near.maxX && p.y >= near.minY && p.y <= near.maxY;
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

/** A teasing line keeps at least this far inside the screen's edges, in px. */
export const TEASE_EDGE_PX = 10;
/** Room between a line and its cloud, above the upper or below the lower, and round its reroll, in px. */
const CLOUD_GAP_PX = { above: 10, below: 8 };
const REROLL_GAP_PX = 8;

interface Placement {
  balloon: Balloon;
  /** The cloud on the screen. */
  cloud: { top: number; bottom: number };
  /** The cloud's reroll on the screen: its die and lettering. */
  reroll: Box;
  /** The line's own size. */
  size: { w: number; h: number };
  screenWidth: number;
}

/**
 * Where a die's teasing line goes, inside the screen and clear of the die: above the upper cloud, its
 * die being under it, ending over the die; below the lower cloud, before its die where the line fits
 * there, and under the die where it doesn't.
 */
export function teasePlacement({ balloon, cloud, reroll, size, screenWidth }: Placement) {
  const inside = (left: number) =>
    Math.max(TEASE_EDGE_PX, Math.min(screenWidth - size.w - TEASE_EDGE_PX, left));
  if (balloon === 0)
    return { left: inside(reroll.maxX - size.w), top: cloud.top - size.h - CLOUD_GAP_PX.above };
  const before = reroll.minX - REROLL_GAP_PX - size.w;
  if (before >= TEASE_EDGE_PX) return { left: before, top: cloud.bottom + CLOUD_GAP_PX.below };
  return {
    left: inside(reroll.maxX - size.w),
    top: Math.max(cloud.bottom, reroll.maxY) + REROLL_GAP_PX,
  };
}
