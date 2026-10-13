import type { Pt } from "../kyoto-seika/balloonGeometry";

export interface ThoughtSticker {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  cut?: readonly Pt[];
}

/** The visible cut, turned into board pixels; an unread cut uses the image's rectangle. */
export function turnedStickerCut(sticker: ThoughtSticker): Pt[] {
  const angle = (sticker.r * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cut =
    sticker.cut && sticker.cut.length > 2
      ? sticker.cut
      : [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ];
  return cut.map((point) => {
    const x = (point.x - 0.5) * sticker.w;
    const y = (point.y - 0.5) * sticker.h;
    return { x: sticker.x + x * cos - y * sin, y: sticker.y + x * sin + y * cos };
  });
}

/** A point on the outline furthest in a direction, favoring the middle of an actual straight edge. */
export function supportPoint(points: readonly Pt[], toward: Pt, middle: Pt): Pt {
  const projection = (p: Pt) => p.x * toward.x + p.y * toward.y;
  const furthest = Math.max(...points.map(projection));
  const across = (p: Pt) => Math.abs((p.x - middle.x) * toward.y - (p.y - middle.y) * toward.x);
  let best = points[0];
  let nearest = Infinity;
  points.forEach((a, i) => {
    if (furthest - projection(a) > 0.001) return;
    const b = points[(i + 1) % points.length];
    const point =
      furthest - projection(b) <= 0.001 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    const distance = across(point);
    if (distance < nearest) {
      nearest = distance;
      best = point;
    }
  });
  return best;
}

/** A flat edge offers its whole length, so two clouds need not compete for its middle. */
export function supportFace(points: readonly Pt[], toward: Pt): Pt[] {
  const projection = (p: Pt) => p.x * toward.x + p.y * toward.y;
  const furthest = Math.max(...points.map(projection));
  return points.flatMap((a, i) => {
    if (furthest - projection(a) > 0.001) return [];
    const b = points[(i + 1) % points.length];
    if (furthest - projection(b) > 0.001) return [a];
    return [
      a,
      ...[0.25, 0.5, 0.75].map((t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })),
    ];
  });
}

function inside(point: Pt, polygon: readonly Pt[]) {
  let included = false;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y)
    )
      included = !included;
  });
  return included;
}

export interface ThoughtEdgeGap {
  /** Nearest point on the cloud's white. */
  from: Pt;
  /** Nearest point on the sticker's cut. */
  to: Pt;
  distance: number;
  overlapping: boolean;
}

/** The actual edge gap after a cloud has been constrained by the board's sides. */
export function closestOutlines(cloud: readonly Pt[], cut: readonly Pt[]): ThoughtEdgeGap {
  let from = cloud[0];
  let to = cut[0];
  let squared = Infinity;
  let overlapping = inside(from, cut) || inside(to, cloud);
  const compare = (p: Pt, a: Pt, b: Pt, reversed: boolean) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    const x = a.x + t * dx;
    const y = a.y + t * dy;
    const distance = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (distance < squared) {
      squared = distance;
      from = reversed ? { x, y } : p;
      to = reversed ? p : { x, y };
    }
  };
  for (let i = 0; i < cloud.length; i++) {
    const a = cloud[i];
    const b = cloud[(i + 1) % cloud.length];
    for (let j = 0; j < cut.length; j++) {
      const c = cut[j];
      const d = cut[(j + 1) % cut.length];
      compare(a, c, d, false);
      compare(c, a, b, true);
      const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      if (Math.abs(denominator) > 0.000001) {
        const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
        const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) overlapping = true;
      }
    }
  }
  return { from, to, distance: Math.sqrt(squared), overlapping };
}
