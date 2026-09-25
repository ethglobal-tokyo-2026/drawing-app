import type { Point } from "./types";

/* oxlint-disable typescript/method-signature-style -- implemented by classes; method syntax keeps unbound-method able to flag a detached call */
/**
 * Turns raw input samples into the points actually drawn. Kept as a small
 * interface so a WASM implementation can be swapped in later.
 */
export interface Stabilizer {
  begin(p: Point): Point[];
  push(p: Point): Point[];
  /** Called every frame so the line keeps catching up while the pen rests. */
  tick(t: number): Point[];
  /** Catch-up tail so the stroke ends where the pen lifted. */
  end(): Point[];
}
/* oxlint-enable typescript/method-signature-style */

/** Maps the 0–100 slider to a per-16ms retention factor in [0, 0.93] (≈200ms lag at max). */
export function smoothingFactor(level: number): number {
  const l = Math.min(100, Math.max(0, level)) / 100;
  return Math.pow(l, 0.6) * 0.93;
}

const FRAME_MS = 16;
const MIN_DIST = 0.5;
const TAIL_STEP = 2;

/**
 * Frame-rate independent exponential smoothing ("pulled string"): each
 * sample moves the output a fraction of the way toward the raw input.
 * Higher levels give smoother lines with more lag.
 */
export class ExpStabilizer implements Stabilizer {
  private s: number;
  private out: Point | null = null;
  private raw: Point | null = null;
  private lastEmitted: Point | null = null;

  constructor(level: number) {
    this.s = smoothingFactor(level);
  }

  begin(p: Point): Point[] {
    this.out = { ...p };
    this.raw = p;
    return this.emit(this.out, true);
  }

  push(p: Point): Point[] {
    if (!this.out) return this.begin(p);
    this.raw = p;
    return this.step(p, p.t);
  }

  tick(t: number): Point[] {
    if (!this.out || !this.raw || this.s === 0) return [];
    return this.step(this.raw, t);
  }

  end(): Point[] {
    const out = this.out;
    const raw = this.raw;
    if (!out || !raw) return [];
    const dist = Math.hypot(raw.x - out.x, raw.y - out.y);
    const steps = Math.min(24, Math.ceil(dist / TAIL_STEP));
    const tail: Point[] = [];
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      tail.push({
        x: out.x + (raw.x - out.x) * k,
        y: out.y + (raw.y - out.y) * k,
        pressure: out.pressure + (raw.pressure - out.pressure) * k,
        t: raw.t,
      });
    }
    this.out = null;
    this.raw = null;
    this.lastEmitted = null;
    return tail;
  }

  private step(target: Point, t: number): Point[] {
    const out = this.out;
    if (!out) return [];
    if (this.s === 0) {
      this.out = { ...target, t };
      return this.emit(this.out, false);
    }
    const dt = Math.max(0, t - out.t);
    const alpha = 1 - Math.pow(this.s, dt / FRAME_MS);
    this.out = {
      x: out.x + (target.x - out.x) * alpha,
      y: out.y + (target.y - out.y) * alpha,
      pressure: out.pressure + (target.pressure - out.pressure) * alpha,
      t: Math.max(out.t, t),
    };
    return this.emit(this.out, false);
  }

  private emit(p: Point, force: boolean): Point[] {
    const last = this.lastEmitted;
    if (!force && last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_DIST) return [];
    this.lastEmitted = p;
    return [p];
  }
}
