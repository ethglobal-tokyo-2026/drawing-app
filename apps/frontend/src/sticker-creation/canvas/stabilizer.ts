import { clamp01 } from "../../ui/easing";

/** The Smoothing a fresh sheet starts at, from 0 (Raw) to 100 (Smooth). */
export const FIRST_SMOOTHING = 35;
/**
 * How many ms of the nib's latest samples the line averages at Smooth: all of the slow span while the
 * nib moves slowly, shrinking toward the fast one as it speeds up, so a quick stroke stays responsive.
 */
export const SMOOTH_WINDOW_MS = { slow: 180, fast: 90 } as const;
/** The window grows as Smoothing's share of Smooth to this power, so the low end steps finely. */
const SMOOTHING_CURVE = 1.5;
/** Nib speeds, in sheet units per ms, at which the window is its slow and its fast span. */
const NIB_SPEEDS = { slow: 0.1, fast: 1 } as const;
/** A lifted nib's line reaches it in points this many ms apart, as a steady hand's samples would come. */
export const CATCH_UP_MS = 8;
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
 * speeds up. It starts where the nib lands. Samples age with time, not with frames, so the line glides
 * to a nib that pauses over what's left of the window, and a frame with no samples moves it no further
 * than the time that passed.
 */
export class Stabilizer {
  /** The samples in the window, oldest first; the last is the nib. */
  private readonly samples: Sample[];
  /** The window's span at Smooth's slow end, scaled by Smoothing. */
  private readonly reach: number;
  /** The window's span now, in ms. */
  private window = 0;
  /** The time the line stands at: the latest sample's, or a later frame's while the nib is still. */
  private now: number;

  /** `smoothing` runs from 0 (Raw) to 100 (Smooth). */
  constructor(x: number, y: number, t: number, smoothing: number) {
    this.samples = [{ x, y, t }];
    this.now = t;
    this.reach = clamp01(smoothing / 100) ** SMOOTHING_CURVE;
  }

  /** Takes the nib's next sample; returns where the line is now. */
  add(x: number, y: number, t: number): [number, number] {
    const now = Math.max(t, this.now);
    // Speed across the window, from its oldest sample: one jittery sample can't pass for a quick nib.
    const from = this.samples[0];
    const speed = Math.hypot(x - from.x, y - from.y) / Math.max(1, now - from.t);
    const fast = clamp01((speed - NIB_SPEEDS.slow) / (NIB_SPEEDS.fast - NIB_SPEEDS.slow));
    const { slow, fast: quick } = SMOOTH_WINDOW_MS;
    // The window shrinks as 1 / (1 + k·fast), never faster than speed rises, so the line's lead on it,
    // speed × window / 3, still grows: a stroke that speeds up never lurches its line forward.
    this.window = (this.reach * slow) / (1 + (slow / quick - 1) * fast);
    this.samples.push({ x, y, t: now });
    this.now = now;
    let gone = 0;
    while (gone < this.samples.length - 1 && this.aged(this.samples[gone])) gone++;
    this.samples.splice(0, gone);
    return this.average();
  }

  /**
   * A frame at time `t` passed with no new sample: the samples age to it, so a still nib's line glides
   * the rest of the way over what's left of the window. Returns where the line is now.
   */
  hold(t: number): [number, number] {
    this.now = Math.max(this.now, t);
    return this.average();
  }

  /** The line is on the nib: every sample before it has aged out of the window. */
  get settled(): boolean {
    const { samples } = this;
    return samples.length === 1 || this.aged(samples[samples.length - 2]);
  }

  /** The nib lifted at x, y: where the line goes on its way there, `CATCH_UP_MS` apart, ending on it. */
  finish(x: number, y: number): [number, number][] {
    const nib = this.nib;
    const way: [number, number][] = [];
    // The lift's own position, if it moved, in the window as it stands.
    if (x !== nib.x || y !== nib.y) {
      this.samples.push({ x, y, t: this.now });
      way.push(this.average());
    }
    while (!this.settled) way.push(this.hold(this.now + CATCH_UP_MS));
    return way;
  }

  private get nib(): Sample {
    return this.samples[this.samples.length - 1];
  }

  /** A sample as old as the window has left it. */
  private aged(sample: Sample): boolean {
    return this.now - sample.t >= this.window - AGE_SLACK;
  }

  /** The window's samples, each weighing less the older it is now. */
  private average(): [number, number] {
    const nib = this.nib;
    if (this.settled) return [nib.x, nib.y];
    let [x, y, total] = [0, 0, 0];
    for (const sample of this.samples) {
      const weight = 1 - (this.now - sample.t) / this.window;
      if (weight <= 0) continue;
      x += sample.x * weight;
      y += sample.y * weight;
      total += weight;
    }
    return [x / total, y / total];
  }
}
