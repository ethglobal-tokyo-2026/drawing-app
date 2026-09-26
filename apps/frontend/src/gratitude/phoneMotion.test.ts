// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { FEEL_CONFIG } from "./gameConfig";
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
const upOf = (beta: number, gamma: number): Vector => ({
  x: -Math.cos(rad(beta)) * Math.sin(rad(gamma)),
  y: Math.sin(rad(beta)),
  z: Math.cos(rad(beta)) * Math.cos(rad(gamma)),
});
const UP = upOf(HELD.beta, HELD.gamma);
/** The spec's sideways pull of gravity for the phone held so: positive, with its right edge up. */
const PULL = STANDARD_GRAVITY * UP.x;
const STILL: Vector = { x: 0, y: 0, z: 0 };

/**
 * A moment of the phone's motion: its own acceleration, its turning rate in °/s about its x, y and
 * z, and how far it has twisted about its long axis, in degrees.
 */
interface Moment {
  t: number;
  a: Vector;
  turn: Vector;
  twisted: number;
}

/**
 * Every 16 ms from 1000: still until `from`, then moving as `at` says, `s` seconds after `from`,
 * until 2800 or `until`.
 */
function motion(at: (s: number) => Omit<Moment, "t">, { from = 1200, until = 2800 } = {}) {
  const moments: Moment[] = [];
  for (let t = 1000; t <= until; t += 16) {
    moments.push(
      t >= from ? { t, ...at((t - from) / 1000) } : { t, a: STILL, turn: STILL, twisted: 0 },
    );
  }
  return moments;
}

/** Still for 200 ms, then shaken sideways at 4.4 Hz. */
const SHAKE = motion((s) => ({
  a: { x: 17 * Math.sin(2 * Math.PI * 4.4 * s), y: 0, z: 0 },
  turn: STILL,
  twisted: 0,
}));

/**
 * A wrist twisting the phone about its long axis at `hz`, `peak` °/s at its fastest. The phone's
 * middle sits `reach` m in front of the forearm's axis, so the twist also pushes it sideways, and
 * pulls it toward the axis.
 */
const twist = (hz: number, peak: number, { reach = 0, from = 1200, until = 2800 } = {}) =>
  motion(
    (s) => {
      const w = 2 * Math.PI * hz;
      const rate = rad(peak) * Math.sin(w * s);
      return {
        a: { x: reach * rad(peak) * w * Math.cos(w * s), y: 0, z: -reach * rate ** 2 },
        turn: { x: 0, y: peak * Math.sin(w * s), z: 0 },
        twisted: (peak / w) * (1 - Math.cos(w * s)),
      };
    },
    { from, until },
  );

/** The moments the phone turns back: a twist's turning rate crossing zero, `hz` from `from`. */
const turnsOf = (hz: number, from = 1200) =>
  Array.from({ length: 40 }, (_, k) => from + ((k + 1) * 500) / hz);

const times = (v: Vector, k: number) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
/** Rounds away float dust and −0, which a flipped sign leaves. */
const tidy = (v: number | null) => (v === null ? null : Math.round(v * 1e9) / 1e9 + 0);

/**
 * Plays the moments through `listenToPhoneMotion` as a platform with this `sign` reports them: the
 * spec's 1, or the flipped −1. A phone with a gyroscope reports its turning rate, with the spec's
 * sign on every platform. Returns what comes out.
 */
function play(
  sign: 1 | -1,
  { orientation = true, linear = true, gyro = true } = {},
  moments: Moment[] = SHAKE,
) {
  const out: { ax: number; ay: number; gx: number | null; t: number }[] = [];
  const stop = listenToPhoneMotion((ax, ay, gx, t) => {
    out.push({ ax: tidy(ax) ?? 0, ay: tidy(ay) ?? 0, gx: tidy(gx), t });
  });
  for (const { t, a, turn, twisted } of moments) {
    const tilt = { beta: HELD.beta, gamma: HELD.gamma + twisted };
    if (orientation) window.dispatchEvent(Object.assign(new Event("deviceorientation"), tilt));
    const up = upOf(tilt.beta, tilt.gamma);
    const event = Object.assign(new Event("devicemotion"), {
      acceleration: linear ? times(a, sign) : null,
      accelerationIncludingGravity: times(
        {
          x: a.x + STANDARD_GRAVITY * up.x,
          y: a.y + STANDARD_GRAVITY * up.y,
          z: a.z + STANDARD_GRAVITY * up.z,
        },
        sign,
      ),
      rotationRate: gyro ? { alpha: turn.z, beta: turn.x, gamma: turn.y } : null,
    });
    Object.defineProperty(event, "timeStamp", { value: t });
    window.dispatchEvent(event);
  }
  stop();
  return out;
}

/** The reversals the game's shake detector counts in the samples. */
function reversals(samples: { ax: number; ay: number; t: number }[]) {
  const detector = createShakeDetector(FEEL_CONFIG.shake);
  return samples.flatMap(({ ax, ay, t }) => {
    const reversal = detector.addMotionSample(ax, ay, t);
    return reversal ? [{ t, run: reversal.run, direction: reversal.direction.x }] : [];
  });
}

describe("listenToPhoneMotion", () => {
  it.each([
    ["with linear acceleration", true],
    ["without linear acceleration", false],
  ])("gives the same samples, %s, whichever sign the platform reports", (_, linear) => {
    for (const gyro of [true, false]) {
      const spec = play(1, { linear, gyro });
      const flipped = play(-1, { linear, gyro });
      expect(spec.length).toBeGreaterThan(100);
      expect(flipped).toEqual(spec);
    }
  });

  it("gives the spec's sign: a push right is +x, and the right edge up pulls +x", () => {
    for (const gyro of [true, false]) {
      for (const samples of [play(1, { gyro }), play(-1, { gyro })]) {
        const shown = new Map(samples.map((s) => [s.t, s]));
        for (const { t, a } of SHAKE) {
          if (shown.has(t)) expect(shown.get(t)?.ax).toBeCloseTo(a.x, 6);
        }
        expect(samples.find((s) => s.gx !== null)?.gx).toBeCloseTo(PULL, 6);
        expect(PULL).toBeGreaterThan(0);
      }
    }
  });

  it("keeps a shake's jerk out of gravity's pull", () => {
    for (const gyro of [true, false]) {
      const shaken = play(-1, { gyro }).filter((s) => s.t >= 1200);
      const most = Math.max(...shaken.map((s) => Math.abs((s.gx ?? 0) - PULL)));
      // The reading swings 17 m/s² either way; the pull, under 3.
      expect(most).toBeLessThan(3);
    }
  });

  it("follows the phone's roll at once where it has a gyroscope", () => {
    const rolled = motion(() => ({ a: STILL, turn: STILL, twisted: 40 }));
    const samples = play(-1, {}, rolled);
    const rolledAt = rolled.find((m) => m.twisted)?.t ?? 0;
    const pull = STANDARD_GRAVITY * upOf(HELD.beta, HELD.gamma + 40).x;
    expect(samples.find((s) => s.t === rolledAt)?.gx).toBeCloseTo(pull, 6);
    // Without one, the gravity estimate low-passed twice takes about 0.3 s to get two-thirds there.
    const slow = play(-1, { gyro: false }, rolled);
    const twoThirds = slow.find((s) => (s.gx ?? PULL) - PULL < ((pull - PULL) * 2) / 3);
    expect((twoThirds?.t ?? 0) - rolledAt).toBeGreaterThan(250);
  });

  it("counts the same reversals, the same way round, whichever sign the platform reports", () => {
    const spec = reversals(play(1));
    expect(spec.length).toBeGreaterThan(8);
    expect(reversals(play(-1))).toEqual(spec);
  });

  it("sends the motion at once where no orientation arrives, and the pull after waiting for the sign", () => {
    const samples = play(1, { orientation: false });
    expect(samples[0]?.t).toBe(1000);
    expect(samples.find((s) => s.gx !== null)?.t).toBe(1000 + 16 * Math.ceil(500 / 16));
    const shown = new Map(samples.map((s) => [s.t, s]));
    for (const { t, a } of SHAKE) expect(shown.get(t)?.ax).toBeCloseTo(a.x, 6);
  });

  it("counts a shake from its first turn, however long the sign takes", () => {
    const atOnce = SHAKE.map((m) => ({ ...m, t: m.t - 200 })).filter((m) => m.t >= 1000);
    const [first] = reversals(play(1, { orientation: false }, atOnce));
    // The push flips a quarter turn after the phone turns back, 57 ms at 4.4 Hz.
    expect((first?.t ?? Infinity) - 1000).toBeLessThan(1000 / 4.4 / 2 + 1000 / 4.4 / 4 + 16);
  });
});

describe("a wrist twist", () => {
  const { keepShakingAt, unlockAt, twistPeakDegPerS } = FEEL_CONFIG.shake;

  it("reaches the tip and the unlock at 3 Hz and 500°/s, each reversal soon after its turn", () => {
    const counted = reversals(play(1, {}, twist(3, 500, { until: 4400 })));
    expect(counted.map((r) => r.run)).toEqual(counted.map((_, i) => i + 1));
    expect(counted.length).toBeGreaterThanOrEqual(unlockAt);
    expect(counted.some((r) => r.run === keepShakingAt)).toBe(true);
    // Six turns a second: the unlock comes about unlockAt / 6 seconds in.
    const unlock = counted.find((r) => r.run === unlockAt);
    expect(((unlock?.t ?? Infinity) - 1200) / 1000).toBeCloseTo(unlockAt / 6, 0);
    // Counted within 40 ms of the phone turning back: the twist's rate crossing the dead zone.
    const turns = turnsOf(3);
    for (const { t } of counted) {
      const turn = Math.max(...turns.filter((at) => at <= t));
      expect(t - turn).toBeLessThan(40);
    }
  });

  it.each([
    ["about its long axis", { x: 0, y: 1, z: 0 }],
    ["about its short axis", { x: 1, y: 0, z: 0 }],
    ["about the screen's normal", { x: 0, y: 0, z: 1 }],
    ["about a slant between the long axis and the screen's back", { x: 0, y: 0.7, z: -0.7 }],
  ])("counts %s", (_, along) => {
    const size = Math.hypot(along.x, along.y, along.z);
    const turned = twist(3, 500).map((m) => ({
      ...m,
      turn: times(along, m.turn.y / size),
      twisted: 0,
    }));
    const counted = reversals(play(1, {}, turned));
    expect(counted.map((r) => r.run)).toEqual(counted.map((_, i) => i + 1));
    expect(counted.length).toBeGreaterThanOrEqual(9);
  });

  it("never counts turning under 150°/s: tilting to read, a wiggle, or a slow wave", () => {
    for (const hz of [0.8, 1.5, 3, 4.5]) {
      expect(reversals(play(1, {}, twist(hz, 149)))).toEqual([]);
    }
    // Tilting 40° toward the eyes over half a second, and back.
    const read = motion((s) => {
      const rate = s < 1 ? 40 * Math.PI * Math.sin(2 * Math.PI * s) : 0;
      return { a: STILL, turn: { x: rate, y: 0, z: 0 }, twisted: 0 };
    });
    expect(reversals(play(1, {}, read))).toEqual([]);
    // A twist at the threshold counts: the scale ties it to the shake's peak.
    expect(reversals(play(1, {}, twist(3, twistPeakDegPerS * 1.1))).length).toBeGreaterThan(5);
  });

  it.each([
    ["in front of", 0.1],
    ["behind", -0.1],
  ])("counts once for each reversal with the phone %s the forearm's axis", (_, reach) => {
    const alone = reversals(play(1, {}, twist(3, 500)));
    const pushOnly = twist(3, 500, { reach }).map((m) => ({ ...m, turn: STILL }));
    // The push by itself is a hard enough shake to count...
    expect(reversals(play(1, {}, pushOnly)).length).toBeGreaterThan(5);
    // ...and with the twist that causes it, the motion counts as often as the twist alone.
    const both = reversals(play(1, {}, twist(3, 500, { reach })));
    expect(both.length).toBe(alone.length);
    const gaps = both.slice(1).map((r, i) => r.t - (both[i]?.t ?? 0));
    for (const gap of gaps) expect(gap).toBeGreaterThan(1000 / 3 / 2 - 40);
  });

  it("gives the same samples whichever sign the platform reports", () => {
    for (const reach of [0, 0.1]) {
      const moments = twist(3, 500, { reach });
      for (const linear of [true, false]) {
        const spec = play(1, { linear }, moments);
        expect(play(-1, { linear }, moments)).toEqual(spec);
        expect(reversals(spec).length).toBeGreaterThan(8);
      }
    }
  });
});
