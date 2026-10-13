import type { PairLayout, Pt } from "../kyoto-seika/balloonGeometry";
import type { Box } from "./placement";

/** The final bubble stops this far short of the sticker's cut, in board pixels. */
export const THOUGHT_TIP_GAP_PX = 2;

/** Whether a segment crosses the inside of a control's clearance rectangle. */
function crosses(a: Pt, b: Pt, box: Box) {
  let from = 0;
  let to = 1;
  for (const [start, delta, low, high] of [
    [a.x, b.x - a.x, box.left + 0.001, box.right - 0.001],
    [a.y, b.y - a.y, box.top + 0.001, box.bottom - 0.001],
  ]) {
    if (delta === 0) {
      if (start < low || start > high) return false;
    } else {
      const first = (low - start) / delta;
      const last = (high - start) / delta;
      from = Math.max(from, Math.min(first, last));
      to = Math.min(to, Math.max(first, last));
      if (from > to) return false;
    }
  }
  return true;
}

const pathLength = (path: readonly Pt[]) =>
  path
    .slice(1)
    .reduce((length, point, i) => length + Math.hypot(point.x - path[i].x, point.y - path[i].y), 0);

/** Each cloud's bubbles return to the sticker's turned edge, even when its clouds move to clear controls. */
export function thoughtTrails(
  thought: PairLayout,
  spot: { left: number; top: number; toward: Pt },
  sticker: { x: number; y: number; w: number; h: number; r: number; cut?: readonly Pt[] },
  /** Control boxes already grown by the placement's clearance. */
  avoid: readonly Box[],
): PairLayout["trails"] {
  const angle = (sticker.r * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const closest = (point: Pt): Pt => {
    const dx = point.x + spot.left - sticker.x;
    const dy = point.y + spot.top - sticker.y;
    const px = dx * cos + dy * sin;
    const py = -dx * sin + dy * cos;
    let x = Math.max(-sticker.w / 2, Math.min(sticker.w / 2, px));
    let y = Math.max(-sticker.h / 2, Math.min(sticker.h / 2, py));
    if (sticker.cut && sticker.cut.length > 2) {
      let nearest = Infinity;
      sticker.cut.forEach((a, i, cut) => {
        const b = cut[(i + 1) % cut.length];
        const ax = (a.x - 0.5) * sticker.w;
        const ay = (a.y - 0.5) * sticker.h;
        const vx = (b.x - a.x) * sticker.w;
        const vy = (b.y - a.y) * sticker.h;
        const t = Math.max(
          0,
          Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)),
        );
        const atX = ax + t * vx;
        const atY = ay + t * vy;
        const distance = Math.hypot(px - atX, py - atY);
        if (distance < nearest) {
          nearest = distance;
          x = atX;
          y = atY;
        }
      });
    }
    return {
      x: sticker.x + x * cos - y * sin - spot.left,
      y: sticker.y + x * sin + y * cos - spot.top,
    };
  };
  const attach = (trail: PairLayout["trails"][number]) => {
    // Keep each cloud's clear departure; bend past both clouds before returning to the sticker.
    const first = trail[0];
    const lastRadius = trail[trail.length - 1].r;
    const edge = closest(first);
    const distance = Math.hypot(first.x - edge.x, first.y - edge.y) || 1;
    const end = {
      x: edge.x + ((first.x - edge.x) / distance) * (lastRadius + THOUGHT_TIP_GAP_PX),
      y: edge.y + ((first.y - edge.y) / distance) * (lastRadius + THOUGHT_TIP_GAP_PX),
    };
    const clearY =
      spot.toward.y > 0
        ? Math.max(first.y, thought.clouds.maxY + first.r + 3)
        : Math.min(first.y, thought.clouds.minY - first.r - 3);
    const bend = { x: first.x, y: clearY };
    const padding = first.r + 2;
    const controls = avoid.map((box) => ({
      left: box.left - spot.left - padding,
      top: box.top - spot.top - padding,
      right: box.right - spot.left + padding,
      bottom: box.bottom - spot.top + padding,
    }));
    const paths: Pt[][] = [[first, bend, end]];
    // A return beside a control can reach the sticker without running through its rotate knob.
    for (const box of controls) {
      for (const x of [box.left, box.right])
        paths.push([first, bend, { x, y: bend.y }, { x, y: end.y }, end]);
      for (const y of [box.top, box.bottom])
        if (spot.toward.y > 0 ? y >= clearY : y <= clearY)
          paths.push([first, bend, { x: bend.x, y }, { x: end.x, y }, end]);
    }
    const clear = paths.filter((path) =>
      path.slice(1).every((point, i) => controls.every((box) => !crosses(path[i], point, box))),
    );
    const path = (clear.length ? clear : paths).toSorted(
      (a, b) => pathLength(a) - pathLength(b),
    )[0];
    const length = pathLength(path);
    const count = trail.length;
    return Array.from({ length: count }, (_, i) => {
      const fraction = i / (count - 1);
      let along = length * fraction;
      let point = end;
      for (let n = 1; n < path.length; n++) {
        const a = path[n - 1];
        const b = path[n];
        const segment = Math.hypot(b.x - a.x, b.y - a.y);
        if (along <= segment) {
          const t = along / (segment || 1);
          point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          break;
        }
        along -= segment;
      }
      return { ...point, r: trail[i].r };
    });
  };
  return [attach(thought.trails[0]), attach(thought.trails[1])];
}
