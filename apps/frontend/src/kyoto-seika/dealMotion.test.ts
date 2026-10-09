import { describe, expect, it } from "vitest";
import { cloudShape, dealLayout } from "./balloonGeometry";
import { dealKinds } from "./deal";
import { cloudPop, driftAt, FLOAT, type CloudPop, type Motion } from "./dealMotion";
import { DEAL, TEST_SUBJECTS } from "./testSubjects";

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

/** The deal's clouds, each with its seed and its white and pen line as SubjectBalloons draws them. */
const balloons = dealLayout({
  width: 390,
  top: 100,
  bottom: 700,
  kinds: dealKinds(TEST_SUBJECTS, DEAL),
  list: TEST_SUBJECTS,
  seed: 1,
}).balloons.map(({ spec }) => ({ spec, cloud: cloudShape(spec) }));
const ROLLS = [1, 2, 17, 29];
/** Every cloud's pop at a few rolls. */
const pops = balloons.flatMap(({ cloud, spec }) =>
  ROLLS.map((rolls) => {
    const pop = cloudPop(cloud, spec.seed, rolls, false);
    if (!pop) throw new Error("No pop without reduced motion");
    return pop;
  }),
);
const burst = (pop: CloudPop) => [...pop.rim, ...pop.beads].map(({ motion }) => motion);

/** Each keyframe's offset, spaced as Web Animations spaces the ones that give none. */
function offsets(keyframes: readonly Keyframe[]): number[] {
  const at = keyframes.map(
    (k, i) => k.offset ?? (i === 0 ? 0 : i === keyframes.length - 1 ? 1 : null),
  );
  return at.map((offset, i) => {
    if (offset !== null) return offset;
    const before = at.findLastIndex((o, j) => j < i && o !== null);
    const after = at.findIndex((o, j) => j > i && o !== null);
    const [from, to] = [at[before] ?? 0, at[after] ?? 1];
    return from + ((to - from) * (i - before)) / (after - before);
  });
}
/** A keyframe list's opacity `at` an offset, through the keyframes that set it. */
function opacityAt(keyframes: readonly Keyframe[], at: number): number {
  const set = offsets(keyframes).flatMap((offset, i) => {
    const opacity = keyframes[i].opacity;
    return opacity === undefined || opacity === null ? [] : [{ offset, opacity: Number(opacity) }];
  });
  const next = set.findIndex((k) => k.offset >= at);
  if (next <= 0) return set[Math.max(next, 0)].opacity;
  const [a, b] = [set[next - 1], set[next]];
  return a.opacity + ((b.opacity - a.opacity) * (at - a.offset)) / (b.offset - a.offset);
}
const start = ({ timing }: Motion) => timing.delay ?? 0;
const end = (motion: Motion) => start(motion) + Number(motion.timing.duration ?? 0);
/** Where a translate keyframe puts its piece, in px. */
const translated = (keyframe: Keyframe | undefined) => {
  const [x, y] = String(keyframe?.translate).split(" ").map(Number.parseFloat);
  return { x, y };
};

describe("a cloud the die deals again", () => {
  it("swells with its word, never fading, and is gone at the swell's end", () => {
    for (const { swell } of pops) {
      expect(opacityAt(swell.keyframes, 0)).toBe(1);
      expect(opacityAt(swell.keyframes, 0.99)).toBe(1);
      expect(opacityAt(swell.keyframes, 1)).toBe(0);
      expect(swell.timing.fill).toBe("forwards");
      const scales = swell.keyframes.map((k) => Number(k.scale));
      expect(scales).toEqual(scales.toSorted((a, b) => a - b));
      expect(scales.at(-1)).toBeGreaterThan(scales[0]);
    }
  });

  it("bursts as it goes: every rim piece and bead flies out from the cloud, holding its ink and then fading to nothing", () => {
    for (const pop of pops) {
      expect(pop.rim.length).toBeGreaterThan(0);
      expect(pop.beads.length).toBeGreaterThan(0);
      for (const motion of burst(pop)) {
        expect(start(motion)).toBe(end(pop.swell));
        expect(opacityAt(motion.keyframes, 0)).toBe(1);
        expect(opacityAt(motion.keyframes, 1)).toBe(0);
      }
      for (const { motion } of pop.rim) {
        const [from, to] = [translated(motion.keyframes[0]), translated(motion.keyframes.at(-1))];
        expect(Math.hypot(to.x, to.y)).toBeGreaterThan(Math.hypot(from.x, from.y));
      }
      for (const { at, motion } of pop.beads) {
        const to = translated(motion.keyframes.at(-1));
        expect(Math.hypot(at.x + to.x, at.y + to.y)).toBeGreaterThan(Math.hypot(at.x, at.y));
      }
    }
  });

  it("puffs the new cloud up once the old one has popped, then stamps its word in, each hidden until it starts", () => {
    for (const pop of pops) {
      expect(start(pop.cloud)).toBeGreaterThanOrEqual(end(pop.swell));
      expect(start(pop.word)).toBeGreaterThan(start(pop.cloud));
      for (const arrival of [pop.cloud, pop.word]) {
        expect(arrival.timing.fill).toBe("backwards");
        expect(opacityAt(arrival.keyframes, 0)).toBe(0);
      }
    }
  });

  it("bursts the same way for the same cloud and roll, and another way for the next roll", () => {
    const [{ cloud, spec }] = balloons;
    const at = (rolls: number) => cloudPop(cloud, spec.seed, rolls, false);
    expect(at(5)).toEqual(at(5));
    expect(at(6)?.beads).not.toEqual(at(5)?.beads);
  });

  it("under reduced motion builds no pop, so the words swap in place", () => {
    for (const { cloud, spec } of balloons) expect(cloudPop(cloud, spec.seed, 1, true)).toBeNull();
  });
});
