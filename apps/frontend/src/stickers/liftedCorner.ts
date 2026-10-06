import { useEffect, useState } from "react";
import { maskPixels } from "./maskPixels";

/** A corner folded back along a straight line, as the CSS a `StickerFigure` takes. */
export interface Fold {
  /** The side of the fold that stays stuck down. */
  clipIn: string;
  /** The side that lifts: the backing shows there, and the flap is cut from it. */
  clipOut: string;
  /** The point on the fold the flap turns about. */
  fx: string;
  fy: string;
  /** The flap's reflection across the fold. */
  refl: string;
}

type Point = readonly [number, number];

/** Alpha above this counts as the sticker. */
const SOLID = 150;
/** How far inside the silhouette the fold runs, as a share of the image's short side. */
const DEPTH = 0.14;

/**
 * Where the corner folds, from the mask's RGBA pixels: on the diagonal from the bottom-right corner
 * toward the middle, a little inside where it meets the silhouette. Null when it never does.
 */
export function foldOf(data: Uint8ClampedArray, width: number, height: number): Fold | null {
  if (!width || !height) return null;
  const start: Point = [width - 1, height - 1];
  const length = Math.hypot(width / 2 - start[0], height / 2 - start[1]);
  const dx = (width / 2 - start[0]) / length;
  const dy = (height / 2 - start[1]) / length;
  let edge: Point | null = null;
  for (let t = 0; t < length && !edge; t += 1) {
    const x = Math.round(start[0] + dx * t);
    const y = Math.round(start[1] + dy * t);
    if (data[(y * width + x) * 4 + 3] > SOLID) edge = [x, y];
  }
  if (!edge) return null;
  const depth = Math.min(width, height) * DEPTH;
  const focus: Point = [edge[0] + dx * depth, edge[1] + dy * depth];
  // The fold runs across the diagonal.
  const ux = -dy;
  const uy = dx;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
  const half = (sign: 1 | -1) => {
    const pad = Math.max(width, height) * 0.3;
    const box: Point[] = [
      [-pad, -pad],
      [width + pad, -pad],
      [width + pad, height + pad],
      [-pad, height + pad],
    ];
    const side = (p: Point) => ((p[0] - focus[0]) * dx + (p[1] - focus[1]) * dy) * sign;
    const kept: Point[] = [];
    box.forEach((p, i) => {
      const q = box[(i + 1) % box.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) kept.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        kept.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    });
    return `polygon(${kept.map((p) => `${pct(p[0], width)} ${pct(p[1], height)}`).join(",")})`;
  };
  const m = [ux * ux - uy * uy, 2 * ux * uy, 2 * ux * uy, uy * uy - ux * ux];
  return {
    clipIn: half(1),
    clipOut: half(-1),
    fx: pct(focus[0], width),
    fy: pct(focus[1], height),
    refl: `matrix(${m.map((v) => v.toFixed(4)).join(",")},0,0)`,
  };
}

async function readFold(maskUrl: string): Promise<Fold | null> {
  const { data, width, height } = await maskPixels(maskUrl);
  return foldOf(data, width, height);
}

// By sticker: a sticker's mask never changes, and its object URLs are made anew each time it's shown.
const folds = new Map<string, Promise<Fold | null>>();

function foldFor(stickerId: string, maskUrl: string): Promise<Fold | null> {
  let fold = folds.get(stickerId);
  if (!fold) {
    fold = readFold(maskUrl).catch((error: unknown) => {
      console.error(`Finding where sticker ${stickerId}'s corner folds failed`, error);
      folds.delete(stickerId);
      return null;
    });
    folds.set(stickerId, fold);
  }
  return fold;
}

/** The fold for a sticker whose corner is lifted, once it's known; null while it's stuck flat. */
export function useFold(stickerId: string, maskUrl: string, lifted: boolean) {
  const [found, setFound] = useState<{ stickerId: string; fold: Fold | null }>();
  useEffect(() => {
    if (!lifted) return;
    let current = true;
    void foldFor(stickerId, maskUrl).then((fold) => {
      if (current) setFound({ stickerId, fold });
    });
    return () => {
      current = false;
    };
  }, [stickerId, maskUrl, lifted]);
  return lifted && found?.stickerId === stickerId ? found.fold : null;
}
