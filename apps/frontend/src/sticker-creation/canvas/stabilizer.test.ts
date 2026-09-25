import { describe, expect, it } from "vitest";
import { ExpStabilizer, smoothingFactor } from "./stabilizer";
import type { Point } from "./types";

const pt = (x: number, y: number, t: number): Point => ({ x, y, pressure: 0.5, t });

function run(level: number, raw: Point[], withTail = true): Point[] {
  const s = new ExpStabilizer(level);
  const out = s.begin(raw[0]);
  for (const p of raw.slice(1)) out.push(...s.push(p));
  if (withTail) out.push(...s.end());
  return out;
}

// A horizontal line with alternating ±3px vertical jitter, 4ms apart.
const jittered = Array.from({ length: 400 }, (_, i) => pt(i * 2, i % 2 ? 3 : -3, i * 4));

const yVariance = (pts: Point[]) => {
  const mean = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  return pts.reduce((a, p) => a + (p.y - mean) ** 2, 0) / pts.length;
};

describe("ExpStabilizer", () => {
  it("passes input through at level 0", () => {
    const raw = [pt(0, 0, 0), pt(10, 5, 4), pt(20, -3, 8)];
    expect(run(0, raw).map((p) => [p.x, p.y])).toEqual(raw.map((p) => [p.x, p.y]));
  });

  it("reduces jitter as the level increases", () => {
    // Steady state only: skip the start-up transient and the catch-up tail.
    const steady = (level: number) => run(level, jittered, false).filter((p) => p.x > 100);
    const v0 = yVariance(steady(0));
    const v50 = yVariance(steady(50));
    const v100 = yVariance(steady(100));
    expect(v50).toBeLessThan(v0);
    expect(v100).toBeLessThan(v50);
  });

  it("ends exactly at the last raw point", () => {
    const out = run(100, jittered);
    const last = jittered[jittered.length - 1];
    expect(out[out.length - 1].x).toBeCloseTo(last.x);
    expect(out[out.length - 1].y).toBeCloseTo(last.y);
  });

  it("catches up over time while the pen rests", () => {
    const s = new ExpStabilizer(80);
    s.begin(pt(0, 0, 0));
    s.push(pt(100, 0, 16));
    const later = s.tick(2000);
    expect(later[later.length - 1].x).toBeGreaterThan(99);
  });

  it("maps the slider monotonically into [0, 0.93]", () => {
    expect(smoothingFactor(0)).toBe(0);
    expect(smoothingFactor(100)).toBeCloseTo(0.93);
    expect(smoothingFactor(30)).toBeLessThan(smoothingFactor(60));
  });
});
