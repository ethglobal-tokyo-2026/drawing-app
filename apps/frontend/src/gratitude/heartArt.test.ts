import { describe, expect, it } from "vitest";
import { heartOutline } from "./heartArt";

describe("heartOutline", () => {
  it("goes all the way round the heart, with outward normals at its edges", () => {
    const points = heartOutline(144);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(22, 0);
    expect(Math.max(...xs)).toBeCloseTo(218, 0);
    expect(Math.min(...ys)).toBeCloseTo(22, 0);
    expect(Math.max(...ys)).toBeCloseTo(212, 0);
    const left = points.reduce((a, p) => (p.x < a.x ? p : a));
    const right = points.reduce((a, p) => (p.x > a.x ? p : a));
    expect(left.nx).toBeLessThan(-0.9);
    expect(right.nx).toBeGreaterThan(0.9);
    for (const p of points) expect(Math.hypot(p.nx, p.ny)).toBeCloseTo(1, 5);
    for (let i = 1; i < points.length; i++) {
      const gap = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      expect(gap).toBeLessThan(12);
    }
  });

  it("spaces its points evenly along the outline", () => {
    const points = heartOutline(72);
    const gaps = points.map((p, i) => {
      const next = points[(i + 1) % points.length];
      return Math.hypot(next.x - p.x, next.y - p.y);
    });
    expect(Math.max(...gaps)).toBeLessThan(Math.min(...gaps) * 1.1);
  });
});
