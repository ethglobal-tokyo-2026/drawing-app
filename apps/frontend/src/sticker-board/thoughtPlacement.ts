import type { Bead, PairLayout, Pt } from "../kyoto-seika/balloonGeometry";
import { clamp } from "../ui/easing";
import { meets, type Box } from "./placement";
import {
  closestOutlines,
  supportFace,
  supportPoint,
  turnedStickerCut,
  type ThoughtSticker,
} from "./thoughtGeometry";
import { thoughtTrail } from "./thoughtTrails";

/** Room inside the board and around its controls, in board pixels. */
export const THOUGHT_INSET_PX = 8;
export const THOUGHT_CLEAR_PX = 6;
/** Preferred white-to-cut distance: the clouds' ink and short trails sit within this gap. */
const CLOUD_GAP_PX = 32;
const INK_REACH_PX = 4;
const TOWARD = { x: 0, y: 1 };
const SIDES = Array.from({ length: 32 }, (_, i) => ({
  x: Math.cos(-Math.PI / 2 + (i * Math.PI) / 16),
  y: Math.sin(-Math.PI / 2 + (i * Math.PI) / 16),
}));
const AXES = SIDES.slice(0, 16);

export interface ThoughtSpot {
  left: number;
  top: number;
  toward: Pt;
  /** Both word clouds and their short trails, placed beside the selected cut. */
  layout: PairLayout;
}

function bounds(points: readonly Pt[], padding = 0): Box {
  return {
    left: Math.min(...points.map((p) => p.x)) - padding,
    top: Math.min(...points.map((p) => p.y)) - padding,
    right: Math.max(...points.map((p) => p.x)) + padding,
    bottom: Math.max(...points.map((p) => p.y)) + padding,
  };
}

const beadBox = (bead: Bead): Box => ({
  left: bead.x - bead.r - 2,
  top: bead.y - bead.r - 2,
  right: bead.x + bead.r + 2,
  bottom: bead.y + bead.r + 2,
});

interface Candidate {
  center: Pt;
  cloud: Box;
  dots: Box[];
  trail: Bead[];
  cost: number;
  clear: boolean;
  projections: readonly (readonly [number, number])[];
}

/** Nearby spots usually fit immediately; the denser search is reserved for a crowded sticker. */
function choosePair(candidates: readonly Candidate[][]) {
  let best: { pair: readonly [Candidate, Candidate]; cost: number; clear: boolean } | null = null;
  for (const first of candidates[0])
    for (const second of candidates[1]) {
      if (best && first.cost + second.cost >= best.cost) break;
      const crossing =
        Number(overlap(first, second)) +
        first.trail.filter((dot) => touchesCloud(dot, second)).length +
        second.trail.filter((dot) => touchesCloud(dot, first)).length +
        first.trail.filter((dot) =>
          second.trail.some(
            (other) => Math.hypot(dot.x - other.x, dot.y - other.y) < dot.r + other.r + 3,
          ),
        ).length;
      const cost =
        first.cost +
        second.cost +
        crossing * 1_000_000 +
        Number(first.center.x > second.center.x) * 100 +
        Math.hypot(first.center.x - second.center.x, first.center.y - second.center.y) * 0.01;
      if (!best || cost < best.cost)
        best = {
          pair: [first, second],
          cost,
          clear: first.clear && second.clear && crossing === 0,
        };
    }
  return best;
}

/** Separating axes follow the rounded clouds, rather than the empty corners of their boxes. */
function overlap(a: Candidate, b: Candidate) {
  return a.projections.every(
    ([low, high], i) => low < b.projections[i][1] + 8 && high > b.projections[i][0] - 8,
  );
}

function touchesCloud(dot: Bead, cloud: Candidate) {
  return cloud.projections.every(([low, high], i) => {
    const at = dot.x * AXES[i].x + dot.y * AXES[i].y;
    return at + dot.r + 6 > low && at - dot.r - 6 < high;
  });
}

/** Each cloud finds a nearby edge of the actual cut, then the pair clears the controls together. */
export function thoughtPlacement({
  sticker,
  board,
  shape,
  avoid,
}: {
  sticker: ThoughtSticker;
  board: { W: number; H: number; top: number; bottom: number };
  shape: (toward: Pt) => PairLayout;
  avoid: readonly Box[];
}): ThoughtSpot {
  const cut = turnedStickerCut(sticker);
  const natural = shape(TOWARD);
  const controls = avoid.map((b) => [
    { x: b.left, y: b.top },
    { x: b.right, y: b.top },
    { x: b.right, y: b.bottom },
    { x: b.left, y: b.bottom },
  ]);
  const candidates = (expanded: boolean) =>
    natural.balloons.map((balloon, index) => {
      const angle = (balloon.spec.tilt * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const white = balloon.white.map((p) => ({
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
      }));
      const cloud = bounds(white, INK_REACH_PX);
      const projections = AXES.map((axis) => {
        const values = white.map((p) => p.x * axis.x + p.y * axis.y);
        return [Math.min(...values), Math.max(...values)] as const;
      });
      return SIDES.flatMap((side) =>
        supportFace(cut, side).flatMap((anchor) =>
          (expanded ? [0, -24, 24, -48, 48] : [0]).flatMap((slide) =>
            // The last distance is a fallback for small stickers boxed in by controls and wide words.
            (expanded ? [18, 24, CLOUD_GAP_PX, 39, 80] : [24, CLOUD_GAP_PX, 39]).map(
              (space): Candidate => {
                const departure = supportPoint(white, { x: -side.x, y: -side.y }, { x: 0, y: 0 });
                const wanted = {
                  x: anchor.x - departure.x + side.x * space - side.y * slide,
                  y: anchor.y - departure.y + side.y * space + side.x * slide,
                };
                const center = {
                  x: clamp(
                    wanted.x,
                    THOUGHT_INSET_PX - cloud.left,
                    board.W - THOUGHT_INSET_PX - cloud.right,
                  ),
                  y: clamp(wanted.y, board.top - cloud.top, board.bottom - cloud.bottom),
                };
                const outline = white.map((p) => ({ x: center.x + p.x, y: center.y + p.y }));
                // Unconstrained support points have this exact gap; a constrained cloud needs an edge search.
                const gap =
                  slide === 0 && Math.hypot(center.x - wanted.x, center.y - wanted.y) < 0.001
                    ? {
                        from: { x: anchor.x + side.x * space, y: anchor.y + side.y * space },
                        to: anchor,
                        distance: space,
                        overlapping: false,
                      }
                    : closestOutlines(outline, cut);
                const trail = thoughtTrail(
                  gap,
                  natural.trails[index].map((bead) => bead.r),
                );
                const box = bounds(outline, INK_REACH_PX);
                const dots = trail.map(beadBox);
                const parts = [box, ...dots];
                const covered = controls.filter((control, i) => {
                  const distance = closestOutlines(outline, control);
                  return (
                    distance.overlapping ||
                    distance.distance < INK_REACH_PX + THOUGHT_CLEAR_PX ||
                    dots.some((dot) => meets(dot, avoid[i], THOUGHT_CLEAR_PX))
                  );
                }).length;
                const outside = parts.reduce(
                  (sum, part) =>
                    sum +
                    Math.max(0, THOUGHT_INSET_PX - part.left) +
                    Math.max(0, part.right - board.W + THOUGHT_INSET_PX) +
                    Math.max(0, board.top - part.top) +
                    Math.max(0, part.bottom - board.bottom),
                  0,
                );
                return {
                  center,
                  cloud: box,
                  dots,
                  trail,
                  clear:
                    covered === 0 &&
                    !gap.overlapping &&
                    trail.length > 0 &&
                    outside < 0.001 &&
                    gap.distance <= 40,
                  projections: projections.map(([low, high], i) => {
                    const shift = center.x * AXES[i].x + center.y * AXES[i].y;
                    return [low + shift, high + shift] as const;
                  }),
                  cost:
                    covered * 1_000_000 +
                    Number(gap.overlapping) * 1_000_000 +
                    Number(trail.length === 0) * 1_000_000 +
                    outside * 1000 +
                    Math.max(0, gap.distance - 40) * 1000 +
                    Math.abs(gap.distance - CLOUD_GAP_PX) * 0.01 +
                    Math.max(0, center.y - sticker.y) * 0.1,
                };
              },
            ),
          ),
        ),
      ).toSorted((a, b) => a.cost - b.cost);
    });
  const nearby = choosePair(candidates(false));
  const best = nearby?.clear ? nearby : choosePair(candidates(true));
  if (!best) throw new Error("thoughtPlacement offered no spot");
  const [first, second] = best.pair;
  const parts = best.pair.flatMap((p) => [p.cloud, ...p.dots]);
  const left = Math.min(...parts.map((part) => part.left));
  const top = Math.min(...parts.map((part) => part.top));
  const shift = (p: Pt): Pt => ({ x: p.x - left, y: p.y - top });
  const localTrail = (p: Candidate) => p.trail.map((bead) => ({ ...shift(bead), r: bead.r }));
  const trails: PairLayout["trails"] = [localTrail(first), localTrail(second)];
  const layout: PairLayout = {
    ...natural,
    balloons: [
      { ...natural.balloons[0], center: shift(first.center) },
      { ...natural.balloons[1], center: shift(second.center) },
    ],
    trails,
    w: Math.max(...parts.map((part) => part.right)) - left,
    h: Math.max(...parts.map((part) => part.bottom)) - top,
    tip: trails[0].at(-1) ?? shift(sticker),
    clouds: {
      minX: Math.min(first.cloud.left, second.cloud.left) - left,
      minY: Math.min(first.cloud.top, second.cloud.top) - top,
      maxX: Math.max(first.cloud.right, second.cloud.right) - left,
      maxY: Math.max(first.cloud.bottom, second.cloud.bottom) - top,
    },
  };
  return { left, top, toward: TOWARD, layout };
}
