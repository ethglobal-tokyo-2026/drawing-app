export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Point = [number, number];

/** Splits an outline made of M, L and Z commands into its loops. */
function loopsOf(d: string): { points: Point[]; closed: boolean }[] {
  return d.split(/[Mm]/).flatMap((part) => {
    const nums = (part.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    const points: Point[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
    return points.length ? [{ points, closed: /z\s*$/i.test(part) }] : [];
  });
}

/**
 * Scales a sticker's cut outline to fit `box`, centered at its own aspect ratio,
 * keeping a point only every half unit so a detailed cut stays light in a small stub.
 */
export function fitOutline(d: string, box: Box): string {
  const loops = loopsOf(d);
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { points } of loops)
    for (const [x, y] of points) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  if (!loops.length) return "";
  const k = Math.min(box.w / (x1 - x0 || 1), box.h / (y1 - y0 || 1));
  const ox = box.x + (box.w - (x1 - x0) * k) / 2;
  const oy = box.y + (box.h - (y1 - y0) * k) / 2;
  return loops
    .map(({ points, closed }) => {
      const kept: Point[] = [];
      for (const [x, y] of points) {
        const p: Point = [ox + (x - x0) * k, oy + (y - y0) * k];
        const last = kept.at(-1);
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.5) kept.push(p);
      }
      const path = kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");
      return `M${path}${closed ? "Z" : ""}`;
    })
    .join("");
}
