import { clamp01 } from "../../ui/easing";

/**
 * The Smoothing a fresh sheet starts at, from 0 (Raw) to 100 (Smooth): a light touch, as artists keep
 * Clip Studio's Stabilization low.
 */
export const FIRST_SMOOTHING = 35;
/** How long the line trails a slow nib at Smooth, in ms. */
const SLOW_LAG_MS = 170;
/**
 * Smoothing's share of Smooth to this power scales the slow lag and the half-lag speed, so the low
 * end, where artists draw, steps finely.
 */
const SMOOTHING_CURVE = 2;
/**
 * The nib speed at Smooth, in sheet units per second, at which the line trails by half a slow nib's
 * lag, and less the quicker it goes: jitter shows on a slow stroke, and lag on a quick one. It
 * scales down with Smoothing, so a light one gives way to speed soonest, as Clip Studio's speed
 * options apply only at its low Stabilization.
 */
const HALF_LAG_SPEED = 2000;
/** The nib's speed is smoothed at this cutoff, in Hz, before it sets the line's: quick enough to follow a stroke that speeds up. */
const SPEED_CUTOFF_HZ = 4;
/** A nib that has sent no sample for this many ms has stopped, and its line glides the rest of the way to it. */
export const PAUSE_MS = 40;
/** A held nib's line moves at most this many ms a frame, so its glide starts where it stopped. */
const HOLD_STEP_MS = 1000 / 60;
/** A held nib's line is on it once this close, in sheet units. */
const ON_NIB = 0.1;
/** A lifted nib's line reaches it in steps this many ms apart. */
const CATCH_UP_MS = 8;
/** A lifted nib's line is put on it after this many steps, should it not have arrived. */
const MAX_CATCH_UP_STEPS = 1000;
/** The interval between samples, in ms, until two have come: a display frame's. */
const FIRST_INTERVAL_MS = 1000 / 60;

/** The filter at a Smoothing: its cutoff for a still nib, in Hz, and the Hz each unit per second of speed adds. */
export interface FilterTuning {
  minCutoff: number;
  beta: number;
}

/** The filter's tuning at a Smoothing from 0 (Raw) to 100 (Smooth); null at Raw, which leaves the nib's samples as they are. */
export function filterTuning(smoothing: number): FilterTuning | null {
  const share = clamp01(smoothing / 100) ** SMOOTHING_CURVE;
  if (share === 0) return null;
  const minCutoff = 1000 / (2 * Math.PI * SLOW_LAG_MS * share);
  return { minCutoff, beta: minCutoff / (HALF_LAG_SPEED * share) };
}

/** A low-pass step's weight on the new value, for a cutoff in Hz over `dt` seconds. */
const weight = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

/**
 * Smoothing, as a One Euro filter (Casiez, Roussel and Vogel, 2012) on the nib's samples, run on their
 * timestamps: a low-pass whose cutoff rises with the nib's speed, so a slow nib's jitter goes and a
 * quick nib's line keeps up. One cutoff from the speed in the plane serves both axes, so a stroke
 * smooths alike in every direction. The line starts where the nib lands; at Raw it is the nib.
 */
export class Stabilizer {
  /** Where the line is. */
  private x: number;
  private y: number;
  /** The nib's latest sample. */
  private nibX: number;
  private nibY: number;
  /** The time the line stands at: the latest sample's, or a later frame's while the nib is held. */
  private t: number;
  /** The nib's velocity, smoothed, in sheet units per second. */
  private vx = 0;
  private vy = 0;
  /** The latest interval between samples, in ms, which a sample stamped no later than the last takes. */
  private interval = FIRST_INTERVAL_MS;
  private readonly tuning: FilterTuning | null;

  /** `smoothing` runs from 0 (Raw) to 100 (Smooth). */
  constructor(x: number, y: number, t: number, smoothing: number) {
    [this.x, this.y, this.nibX, this.nibY, this.t] = [x, y, x, y, t];
    this.tuning = filterTuning(smoothing);
  }

  /** The time the line stands at, in the samples' ms. */
  get time(): number {
    return this.t;
  }

  /** The line is on the nib. */
  get settled(): boolean {
    return this.x === this.nibX && this.y === this.nibY;
  }

  /** Takes the nib's next sample; returns where the line is now. */
  add(x: number, y: number, t: number): [number, number] {
    if (t > this.t) [this.interval, this.t] = [t - this.t, t];
    this.step(x, y, this.interval / 1000);
    return [this.x, this.y];
  }

  /**
   * A frame at time `t` passed with no sample from a nib that has stopped: the line glides toward it,
   * a frame's time at a time, and lands on it once close. Returns where the line is now.
   */
  hold(t: number): [number, number] {
    if (t <= this.t || this.settled) return [this.x, this.y];
    this.step(this.nibX, this.nibY, Math.min(t - this.t, HOLD_STEP_MS) / 1000);
    this.t = t;
    if (Math.hypot(this.nibX - this.x, this.nibY - this.y) < ON_NIB)
      [this.x, this.y] = [this.nibX, this.nibY];
    return [this.x, this.y];
  }

  /** The nib lifted at x, y: where the line goes on its way there, and when, ending on it. */
  finish(x: number, y: number): [x: number, y: number, t: number][] {
    const way: [number, number, number][] = [];
    if (x !== this.nibX || y !== this.nibY) way.push([...this.add(x, y, this.t), this.t]);
    for (let steps = 0; !this.settled && steps < MAX_CATCH_UP_STEPS; steps++)
      way.push([...this.hold(this.t + CATCH_UP_MS), this.t]);
    if (!this.settled) {
      [this.x, this.y] = [x, y];
      way.push([x, y, this.t]);
    }
    return way;
  }

  /** One step of the filter toward x, y over `dt` seconds. */
  private step(x: number, y: number, dt: number): void {
    const { tuning } = this;
    if (tuning) {
      const toward = weight(SPEED_CUTOFF_HZ, dt);
      this.vx += toward * ((x - this.nibX) / dt - this.vx);
      this.vy += toward * ((y - this.nibY) / dt - this.vy);
      const share = weight(tuning.minCutoff + tuning.beta * Math.hypot(this.vx, this.vy), dt);
      this.x += share * (x - this.x);
      this.y += share * (y - this.y);
    } else [this.x, this.y] = [x, y];
    [this.nibX, this.nibY] = [x, y];
  }
}
