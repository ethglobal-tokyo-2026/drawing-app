/** One reversal of a rhythmic shake. */
export interface ShakeReversal {
  /** Rhythmic reversals in a row, this one included. */
  run: number;
  /** The way the phone moved, along its dominant axis. */
  direction: { x: number; y: number };
  /** The peak acceleration since the last reversal, in m/s². */
  strength: number;
}

export interface ShakeRules {
  /** Below this the hand's tremor is ignored, in m/s². */
  deadZone: number;
  /** A reversal counts only after a peak this hard. */
  minPeak: number;
  /** Reversals this far apart, in ms, are a rhythm. */
  minGapMs: number;
  maxGapMs: number;
  /** Calm this long breaks the run. */
  resetMs: number;
}

export interface ShakeDetector {
  /** One sample, gravity taken out, in m/s². */
  addMotionSample: (ax: number, ay: number, t: number) => ShakeReversal | null;
}

/** Rhythmic shaking: alternating peaks at a shaking pace, so one jolt from a train never counts. */
export function createShakeDetector(rules: ShakeRules): ShakeDetector {
  let sign = 0;
  let peak = 0;
  let lastFlip = -Infinity;
  let run = 0;
  return {
    addMotionSample(ax, ay, t) {
      const sideways = Math.abs(ax) >= Math.abs(ay);
      const a = sideways ? ax : ay;
      const size = Math.abs(a);
      peak = Math.max(peak, size);
      if (t - lastFlip > rules.resetMs) run = 0;
      const s = Math.sign(a);
      if (size <= rules.deadZone || s === 0 || s === sign) return null;
      const gap = t - lastFlip;
      const strength = peak;
      sign = s;
      lastFlip = t;
      peak = 0;
      if (strength < rules.minPeak || gap <= rules.minGapMs || gap >= rules.maxGapMs) return null;
      run++;
      return { run, direction: sideways ? { x: s, y: 0 } : { x: 0, y: s }, strength };
    },
  };
}
