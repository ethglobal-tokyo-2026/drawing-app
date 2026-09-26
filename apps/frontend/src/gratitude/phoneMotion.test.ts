// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { listenToPhoneMotion } from "./phoneMotion";
import { createShakeDetector } from "./shakeDetector";

interface Vector {
  x: number;
  y: number;
  z: number;
}

const STANDARD_GRAVITY = 9.80665;
/** A phone held to read, rolled a little with its right edge up. */
const HELD = { beta: 50, gamma: -20 };
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Up, in the phone's own axes, as the spec defines the orientation's angles. */
const UP: Vector = {
  x: -Math.cos(rad(HELD.beta)) * Math.sin(rad(HELD.gamma)),
  y: Math.sin(rad(HELD.beta)),
  z: Math.cos(rad(HELD.beta)) * Math.cos(rad(HELD.gamma)),
};
/** The spec's sideways pull of gravity for the phone held so: positive, with its right edge up. */
const PULL = STANDARD_GRAVITY * UP.x;

/** The phone's own acceleration every 16 ms: still for 200 ms, then shaken sideways at 4.4 Hz. */
const MOTION: { t: number; a: Vector }[] = [];
for (let t = 1000; t <= 2800; t += 16) {
  const shaking = t >= 1200 ? 17 * Math.sin(2 * Math.PI * 4.4 * ((t - 1200) / 1000)) : 0;
  MOTION.push({ t, a: { x: shaking, y: 0, z: 0 } });
}

const times = (v: Vector, k: number) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
/** Rounds away float dust and −0, which a flipped sign leaves. */
const tidy = (v: number | null) => (v === null ? null : Math.round(v * 1e9) / 1e9 + 0);

/**
 * Plays `MOTION` through `listenToPhoneMotion` as a platform with this `sign` reports it: the
 * spec's 1, or the flipped −1. Returns what comes out.
 */
function play(sign: 1 | -1, { orientation = true, linear = true } = {}) {
  const out: { ax: number; ay: number; gx: number | null; t: number }[] = [];
  const stop = listenToPhoneMotion((ax, ay, gx, t) => {
    out.push({ ax: tidy(ax) ?? 0, ay: tidy(ay) ?? 0, gx: tidy(gx), t });
  });
  for (const { t, a } of MOTION) {
    if (orientation) window.dispatchEvent(Object.assign(new Event("deviceorientation"), HELD));
    const withGravity = {
      x: a.x + PULL,
      y: a.y + STANDARD_GRAVITY * UP.y,
      z: a.z + STANDARD_GRAVITY * UP.z,
    };
    const event = Object.assign(new Event("devicemotion"), {
      acceleration: linear ? times(a, sign) : null,
      accelerationIncludingGravity: times(withGravity, sign),
    });
    Object.defineProperty(event, "timeStamp", { value: t });
    window.dispatchEvent(event);
  }
  stop();
  return out;
}

/** The reversals a shake detector counts in the samples, each with its direction. */
function reversals(samples: { ax: number; ay: number; t: number }[]) {
  const detector = createShakeDetector({
    deadZone: 6,
    minPeak: 11,
    minGapMs: 60,
    maxGapMs: 480,
    resetMs: 650,
  });
  return samples.flatMap(({ ax, ay, t }) => {
    const reversal = detector.addMotionSample(ax, ay, t);
    return reversal ? [reversal.direction.x] : [];
  });
}

describe("listenToPhoneMotion", () => {
  it.each([
    ["with linear acceleration", true],
    ["without linear acceleration", false],
  ])("gives the same samples, %s, whichever sign the platform reports", (_, linear) => {
    const spec = play(1, { linear });
    const flipped = play(-1, { linear });
    expect(spec.length).toBeGreaterThan(100);
    expect(flipped).toEqual(spec);
  });

  it("gives the spec's sign: a push right is +x, and the right edge up pulls +x", () => {
    for (const samples of [play(1), play(-1)]) {
      const shown = new Map(samples.map((s) => [s.t, s]));
      for (const { t, a } of MOTION) {
        if (shown.has(t)) expect(shown.get(t)?.ax).toBeCloseTo(a.x, 6);
      }
      expect(samples[0]?.gx).toBeCloseTo(PULL, 6);
      expect(PULL).toBeGreaterThan(0);
    }
  });

  it("keeps a shake's jerk out of gravity's pull", () => {
    const shaken = play(-1).filter((s) => s.t >= 1200);
    const most = Math.max(...shaken.map((s) => Math.abs((s.gx ?? 0) - PULL)));
    // The reading swings 17 m/s² either way; the pull, under 3.
    expect(most).toBeLessThan(3);
  });

  it("counts the same reversals, the same way round, whichever sign the platform reports", () => {
    const spec = reversals(play(1));
    expect(spec.length).toBeGreaterThan(8);
    expect(reversals(play(-1))).toEqual(spec);
  });

  it("keeps the spec's sign where no orientation arrives, after waiting for it", () => {
    const samples = play(1, { orientation: false });
    expect(samples[0]?.t).toBe(1000 + 16 * Math.ceil(500 / 16));
    const shown = new Map(samples.map((s) => [s.t, s]));
    for (const { t, a } of MOTION) {
      if (shown.has(t)) expect(shown.get(t)?.ax).toBeCloseTo(a.x, 6);
    }
  });
});
