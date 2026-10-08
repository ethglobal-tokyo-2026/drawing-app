import { describe, expect, it } from "vitest";
import { driftAt, FLOAT } from "./dealMotion";

const SAMPLES = 2000;
/** One loop of a drift, sampled evenly. */
const loop = (drift: ReturnType<typeof driftAt>) =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => drift(i / SAMPLES));
const reach = (values: readonly number[]) => Math.max(...values.map(Math.abs));

describe("a cloud's drift", () => {
  const upper = driftAt(FLOAT.seeds[0], FLOAT.cloud);
  const lower = driftAt(FLOAT.seeds[1], FLOAT.cloud);

  it("rises, sways and tilts no further than its few px and its fraction of a degree, and does move", () => {
    const track = loop(upper);
    expect(reach(track.map((p) => p.y))).toBeCloseTo(FLOAT.cloud.y, 2);
    expect(reach(track.map((p) => p.x))).toBeCloseTo(FLOAT.cloud.x, 2);
    expect(reach(track.map((p) => p.deg))).toBeCloseTo(FLOAT.cloud.deg, 2);
    expect(FLOAT.cloud.deg).toBeLessThan(1);
  });

  it("comes back where it began, so its loop never jumps", () => {
    expect(upper(1)).toEqual(upper(0));
  });

  it("is irregular, not a sine: its rises come at uneven gaps", () => {
    const ys = loop(upper).map((p) => p.y);
    const peaks = ys.flatMap((y, i) =>
      i > 0 && i < SAMPLES && y > ys[i - 1] && y >= ys[i + 1] ? [i] : [],
    );
    const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
    expect(gaps.length).toBeGreaterThan(1);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.3);
  });

  it("never moves in step with the other cloud", () => {
    expect(FLOAT.periodMs[0]).not.toBe(FLOAT.periodMs[1]);
    const a = loop(upper).map((p) => p.y);
    const b = loop(lower).map((p) => p.y);
    const mean = (v: readonly number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    const [ma, mb] = [mean(a), mean(b)];
    const cov = mean(a.map((x, i) => (x - ma) * (b[i] - mb)));
    const sd = (v: readonly number[], m: number) => Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
    expect(Math.abs(cov / (sd(a, ma) * sd(b, mb)))).toBeLessThan(0.5);
  });
});
