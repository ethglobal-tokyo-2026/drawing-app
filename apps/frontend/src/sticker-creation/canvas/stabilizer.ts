import { clamp01 } from "../../ui/easing";

/** The Smoothing a fresh sheet starts at, from 0 (Raw) to 100 (Smooth). */
export const FIRST_SMOOTHING = 30;
/**
 * How many ms of the nib's latest samples the line averages at Smooth: all of the slow span while the
 * nib moves slowly, shrinking to the fast one as it speeds up, so a quick stroke stays responsive.
 * Smoothing scales both down to nothing at Raw.
 */
export const SMOOTH_WINDOW_MS = { slow: 120, fast: 30 } as const;
/** Nib speeds, in sheet units per ms, at which the window is its slow and its fast span. */
const NIB_SPEEDS = { slow: 0.1, fast: 1 } as const;
/** Once the nib pauses or lifts, the line reaches it within this many frames. */
export const CATCH_UP_FRAMES = 2;
/** Ages within this many ms of the window's are out of it, whatever floating point makes of the steps. */
const AGE_SLACK = 1e-6;

interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Smoothing, as drawing apps' stabilizers do it: the line is a weighted average of the nib's latest
 * samples, the newest weighing most, over a window that grows with Smoothing and shrinks as the nib
 * speeds up. It starts where the nib lands, and catches up to a nib that pauses or lifts.
 */
export class Stabilizer {
  /** The samples in the window, oldest first; the last is the nib. */
  private readonly samples: Sample[];
  /** Smoothing as a share of Smooth. */
  private readonly strength: number;
  /** The window's span now, in ms. */
  private window = 0;

  /** `smoothing` runs from 0 (Raw) to 100 (Smooth). */
  constructor(x: number, y: number, t: number, smoothing: number) {
    this.samples = [{ x, y, t }];
    this.strength = clamp01(smoothing / 100);
  }

  /** Takes the nib's next sample; returns where the line is now. */
  add(x: number, y: number, t: number): [number, number] {
    const now = Math.max(t, this.nib.t);
    // Speed across the window, from its oldest sample: one jittery sample can't pass for a quick nib.
    const from = this.samples[0];
    const speed = Math.hypot(x - from.x, y - from.y) / Math.max(1, now - from.t);
    const fast = clamp01((speed - NIB_SPEEDS.slow) / (NIB_SPEEDS.fast - NIB_SPEEDS.slow));
    const { slow, fast: quick } = SMOOTH_WINDOW_MS;
    this.window = this.strength * (slow + (quick - slow) * fast);
    this.samples.push({ x, y, t: now });
    return this.average();
  }

  /**
   * A frame passed with the nib still: the samples before it age a share of the window, so the line
   * reaches the nib within `CATCH_UP_FRAMES` frames. Returns where the line is now.
   */
  hold(): [number, number] {
    const step = this.window / CATCH_UP_FRAMES;
    for (let i = 0; i < this.samples.length - 1; i++) this.samples[i].t -= step;
    return this.average();
  }

  /** The line is on the nib. */
  get settled(): boolean {
    return this.samples.length === 1;
  }

  /** The nib lifted at x, y: where the line goes on its way there, ending on it. */
  finish(x: number, y: number): [number, number][] {
    const nib = this.nib;
    const way: [number, number][] = [];
    // The lift's own position, if it moved, in the window as it stands.
    if (x !== nib.x || y !== nib.y) {
      this.samples.push({ x, y, t: nib.t });
      way.push(this.average());
    }
    for (let frame = 0; frame < CATCH_UP_FRAMES && !this.settled; frame++) way.push(this.hold());
    return way;
  }

  private get nib(): Sample {
    return this.samples[this.samples.length - 1];
  }

  /** The window's samples, each weighing less the older it is; a sample as old as the window leaves it. */
  private average(): [number, number] {
    const { samples, window } = this;
    const nib = this.nib;
    let gone = 0;
    while (gone < samples.length - 1 && nib.t - samples[gone].t >= window - AGE_SLACK) gone++;
    samples.splice(0, gone);
    if (samples.length === 1) return [nib.x, nib.y];
    let [x, y, total] = [0, 0, 0];
    for (const sample of samples) {
      const weight = 1 - (nib.t - sample.t) / window;
      x += sample.x * weight;
      y += sample.y * weight;
      total += weight;
    }
    return [x / total, y / total];
  }
}
