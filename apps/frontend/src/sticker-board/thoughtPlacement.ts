import type { PairLayout, Pt } from "../kyoto-seika/balloonGeometry";
import { extentsOf, meets, type Box } from "./placement";

/** A thought laid out for one way its trail runs: its size, its trail's tip and its clouds, from its top-left. */
type ThoughtShape = Pick<PairLayout, "w" | "h" | "tip" | "clouds">;

/** Ways a trail runs from the clouds down or up to the sticker, leaning back toward it. */
const LEAN = { x: 0.62, y: 0.78 };
/** The thought keeps this far inside the board's edges, and from what it stays clear of, in px. */
export const THOUGHT_INSET_PX = 8;
export const THOUGHT_CLEAR_PX = 6;
/** The trail's tip stops this far short of the sticker's edge, in px. */
const TIP_GAP_PX = 2;
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
}

/** What costs a spot most: covering what it must clear, then spilling past the board, then rising. */
const COST = { covered: 1000, outsidePx: 10, risePerStep: 1 };

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
  sticker: { x: number; y: number; w: number; h: number; r: number };
  board: { W: number; H: number; top: number; bottom: number };
  /** The thought laid out with its trail running `toward`. */
  shape: (toward: Pt) => ThoughtShape;
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
  let best: { spot: ThoughtSpot; cost: number } | null = null;
  for (const above of [true, false])
    for (const side of [middle, -middle]) {
      const toward = { x: -side * LEAN.x, y: above ? LEAN.y : -LEAN.y };
      const thought = shape(toward);
      for (let rise = 0; rise < RISES; rise++)
        for (const along of ALONG) {
          const tip = {
            x: sticker.x + side * along * sticker.w,
            y: above
              ? own.top - TIP_GAP_PX - rise * RISE_STEP_PX
              : own.bottom + TIP_GAP_PX + rise * RISE_STEP_PX,
          };
          const left = tip.x - thought.tip.x;
          const top = tip.y - thought.tip.y;
          const box = { left, top, right: left + thought.w, bottom: top + thought.h };
          const clouds = {
            left: left + thought.clouds.minX,
            top: top + thought.clouds.minY,
            right: left + thought.clouds.maxX,
            bottom: top + thought.clouds.maxY,
          };
          const outside =
            Math.max(0, THOUGHT_INSET_PX - box.left) +
            Math.max(0, box.right - (board.W - THOUGHT_INSET_PX)) +
            Math.max(0, board.top - box.top) +
            Math.max(0, box.bottom - board.bottom);
          const covered = [...avoid, own].filter((b, i) =>
            i < avoid.length ? meets(box, b, THOUGHT_CLEAR_PX) : meets(clouds, b, 0),
          ).length;
          const spot = { left, top, toward };
          if (outside === 0 && covered === 0) return spot;
          const cost = outside * COST.outsidePx + covered * COST.covered + rise * COST.risePerStep;
          if (!best || cost < best.cost) best = { spot, cost };
        }
    }
  if (!best) throw new Error("thoughtPlacement offered no spot");
  return best.spot;
}
