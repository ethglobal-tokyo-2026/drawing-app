import type { PairLayout, Pt } from "../kyoto-seika/balloonGeometry";
import { clamp } from "../ui/easing";
import { extentsOf, meets, type Box } from "./placement";
import { THOUGHT_TIP_GAP_PX, thoughtTrails } from "./thoughtTrails";

/** Ways a trail runs from the clouds down or up to the sticker, leaning back toward it. */
const LEAN = { x: 0.62, y: 0.78 };
/** The thought keeps this far inside the board's edges, and from what it stays clear of, in px. */
export const THOUGHT_INSET_PX = 8;
export const THOUGHT_CLEAR_PX = 6;
/** How far the tip may slide along the sticker's edge, as shares of its width, nearest the middle first. */
const ALONG = [0.25, 0.1, 0.4, 0, -0.15, 0.55, -0.3];
/** How far the thought may rise off the sticker to clear the knob or the toolbar, in px. */
const RISE_STEP_PX = 12;
const RISES = 8;

export interface ThoughtSpot {
  left: number;
  top: number;
  /** The way the trail runs, from the clouds to the sticker. */
  toward: Pt;
  /** Both clouds' trails, attached to the sticker's turned edge. */
  trails: PairLayout["trails"];
}

/** What costs a spot most: covering controls, then spilling past the board, then longer trails. */
const COST = { covered: 1000, outsidePx: 10, trailPx: 0.01, below: 0.8, outward: 0.1 };

/**
 * Where a peek at a sticker's subjects goes on the board: above the sticker toward the board's middle,
 * its trail's tip at the sticker's edge, or below it when there's no room above; always inside the
 * board, `top` and `bottom` keeping it off the header and the foot, and clear of `avoid` (the rotate
 * knob, the toolbar, the header's controls and the board's key). With no clear spot, the one that
 * covers the least of them.
 */
export function thoughtPlacement({
  sticker,
  board,
  shape,
  avoid,
}: {
  /** The sticker's center, size and turn, in board pixels. */
  sticker: { x: number; y: number; w: number; h: number; r: number; cut?: readonly Pt[] };
  board: { W: number; H: number; top: number; bottom: number };
  /** The thought laid out with its trail running `toward`. */
  shape: (toward: Pt) => PairLayout;
  avoid: readonly Box[];
}): ThoughtSpot {
  const { ex: halfW, ey: halfH } = extentsOf(sticker.w, sticker.h, sticker.r);
  const own: Box = {
    left: sticker.x - halfW,
    top: sticker.y - halfH,
    right: sticker.x + halfW,
    bottom: sticker.y + halfH,
  };
  // The middle is the way the clouds lean, so the trail leans back from it to the sticker.
  const middle = sticker.x <= board.W / 2 ? 1 : -1;
  const clearOf = avoid.map((b) => ({
    left: b.left - THOUGHT_CLEAR_PX,
    top: b.top - THOUGHT_CLEAR_PX,
    right: b.right + THOUGHT_CLEAR_PX,
    bottom: b.bottom + THOUGHT_CLEAR_PX,
  }));
  let best: { spot: ThoughtSpot; cost: number } | null = null;
  for (const above of [true, false])
    for (const side of [middle, -middle]) {
      const toward = { x: -side * LEAN.x, y: above ? LEAN.y : -LEAN.y };
      const thought = shape(toward);
      const lefts = [
        ...ALONG.map((along) => sticker.x + side * along * sticker.w - thought.tip.x),
        THOUGHT_INSET_PX - thought.clouds.minX,
        board.W - THOUGHT_INSET_PX - thought.clouds.maxX,
      ];
      for (let rise = 0; rise < RISES; rise++)
        for (const desiredLeft of lefts) {
          const tipY = above
            ? own.top - THOUGHT_TIP_GAP_PX - rise * RISE_STEP_PX
            : own.bottom + THOUGHT_TIP_GAP_PX + rise * RISE_STEP_PX;
          const left = clamp(
            desiredLeft,
            THOUGHT_INSET_PX - thought.clouds.minX,
            board.W - THOUGHT_INSET_PX - thought.clouds.maxX,
          );
          const top = clamp(
            tipY - thought.tip.y,
            board.top - thought.clouds.minY,
            board.bottom - thought.clouds.maxY,
          );
          const clouds = {
            left: left + thought.clouds.minX,
            top: top + thought.clouds.minY,
            right: left + thought.clouds.maxX,
            bottom: top + thought.clouds.maxY,
          };
          const trails = thoughtTrails(thought, { left, top, toward }, sticker, clearOf);
          const bubbles = trails.flatMap((trail) =>
            trail.map((bead) => ({
              left: left + bead.x - bead.r - 2,
              top: top + bead.y - bead.r - 2,
              right: left + bead.x + bead.r + 2,
              bottom: top + bead.y + bead.r + 2,
            })),
          );
          const parts = [clouds, ...bubbles];
          const box = {
            left: Math.min(...parts.map((b) => b.left)),
            top: Math.min(...parts.map((b) => b.top)),
            right: Math.max(...parts.map((b) => b.right)),
            bottom: Math.max(...parts.map((b) => b.bottom)),
          };
          const outside =
            Math.max(0, THOUGHT_INSET_PX - box.left) +
            Math.max(0, box.right - (board.W - THOUGHT_INSET_PX)) +
            Math.max(0, board.top - box.top) +
            Math.max(0, box.bottom - board.bottom);
          const covered =
            avoid.filter((b) => parts.some((part) => meets(part, b, THOUGHT_CLEAR_PX))).length +
            Number(meets(clouds, own)) +
            Number(
              trails.some((trail) =>
                trail
                  .slice(1)
                  .some(
                    (bead, i) =>
                      Math.hypot(bead.x - trail[i].x, bead.y - trail[i].y) <
                      bead.r + trail[i].r + 3,
                  ),
              ),
            );
          const spot = { left, top, toward, trails };
          const trailLength = trails.reduce(
            (total, trail) =>
              total +
              trail
                .slice(1)
                .reduce(
                  (distance, bead, i) =>
                    distance + Math.hypot(bead.x - trail[i].x, bead.y - trail[i].y),
                  0,
                ),
            0,
          );
          const cost =
            outside * COST.outsidePx +
            covered * COST.covered +
            trailLength * COST.trailPx +
            (above ? 0 : COST.below) +
            (side === middle ? 0 : COST.outward);
          if (!best || cost < best.cost) best = { spot, cost };
        }
    }
  if (!best) throw new Error("thoughtPlacement offered no spot");
  return best.spot;
}
