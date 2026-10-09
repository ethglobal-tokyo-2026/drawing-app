import { describe, expect, it } from "vitest";
import { penStroke, type Pt } from "./pen";

/** Points along each line and curve of path data `d`, its round ends' arcs left out. */
function along(d: string): Pt[] {
  const tokens = d.match(/[A-Z]|-?[\d.]+/g) ?? [];
  const out: Pt[] = [];
  let i = 0;
  let at: Pt = { x: 0, y: 0 };
  let handle: Pt | null = null;
  const point = () => ({ x: Number(tokens[i++]), y: Number(tokens[i++]) });
  const bezier = (c1: Pt, c2: Pt, to: Pt, t: number) => {
    const u = 1 - t;
    const mix = (k: "x" | "y") =>
      u * u * u * at[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * to[k];
    return { x: mix("x"), y: mix("y") };
  };
  while (i < tokens.length) {
    const command = tokens[i++];
    const from = at;
    if (command === "A") i += 5;
    if (command === "M" || command === "A") at = point();
    if (command === "L") {
      at = point();
      out.push({ x: (from.x + at.x) / 2, y: (from.y + at.y) / 2 });
    }
    if (command === "C" || command === "S") {
      const c1 =
        command === "C"
          ? point()
          : { x: 2 * at.x - (handle ?? at).x, y: 2 * at.y - (handle ?? at).y };
      handle = point();
      const to = point();
      for (const t of [0.25, 0.5, 0.75]) out.push(bezier(c1, handle, to, t));
      at = to;
    }
  }
  return out;
}

describe("a pen stroke", () => {
  it("keeps to the true curve between its points, even half a circle drawn in eight steps", () => {
    const radius = 15;
    const w = 2;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI;
      return { x: radius * Math.cos(a), y: radius * Math.sin(a), w };
    });
    const points = along(penStroke(pts));
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      const r = Math.hypot(p.x, p.y);
      const off = Math.min(Math.abs(r - (radius + w / 2)), Math.abs(r - (radius - w / 2)));
      expect(off).toBeLessThan(0.05);
    }
  });
});
