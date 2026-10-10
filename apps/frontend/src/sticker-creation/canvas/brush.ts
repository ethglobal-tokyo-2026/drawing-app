import { clamp, clamp01, lerp } from "../../ui/easing";
import { STRIDE, type StrokeOp } from "./ops";
import { StrokeCurve } from "./strokeCurve";

/**
 * The size rail's value (0–1) as a width in sheet units, the px the rail shows, squared so the
 * fine sizes get most of the travel.
 */
export const sizePx = (value: number) => 1.5 + 46.5 * value * value;

/** How a pen's pressure sets its width: not at all (Off), or along a light, normal or firm curve. */
export const PEN_PRESSURES = ["off", "light", "normal", "firm"] as const;
export type PenPressure = (typeof PEN_PRESSURES)[number];

/** Points closer than this many sheet units to the last one add cost and nothing else. */
const MIN_STEP = 0.5;
/** A stroke widens from a dot `dot` of its width to its full width `travel` sheet units from where it landed. */
interface Taper {
  dot: number;
  travel: number;
}
/**
 * A pen's taper, which it also narrows back by over its last `travel` units as it lifts. Tapers go by
 * distance, never points, so a stroke tapers alike however often it's sampled, and a tap's wobble
 * never reaches full width.
 */
export const PEN_TAPER = { dot: 0.35, travel: 8 } as const satisfies Taper;
/** A finger's or a mouse's taper: a fuller dot, widening over a longer reach. */
const TOUCH_TAPER = { dot: 0.6, travel: 23 } as const satisfies Taper;
/** A pen's width at a feather-light touch, as a fraction of the size. */
const PRESSURE_FLOOR = 0.28;
/**
 * Each curve's exponent on the pressure up to a half press: under 1 a light touch already draws
 * wide, over 1 the width takes more force; Normal, a little under 1, widens a light touch a little.
 */
const PRESSURE_EXPONENTS = {
  light: 0.5,
  normal: 0.75,
  firm: 1.25,
} as const satisfies Record<Exclude<PenPressure, "off">, number>;
/** A pen pressed halfway: the hover ring previews the stroke at this middle pressure. */
const MID_PRESSURE = 0.5;
/** A full press draws at most this many times a half press's width, which the hover ring shows. */
export const PRESSURE_CAP = 1.2;
/** A pen's pressure moving less than this within a stroke is a pen that senses none. */
const PRESSURE_STEP = 0.01;
/** Touch, mouse and a pen with no pressure draw between these fractions of the size: thin when quick. */
const SPEED_WIDTHS = { fast: 0.68, slow: 1.1 } as const;
/**
 * A width drawn by speed eases toward its speed's with this time constant, in ms: steady, yet a change
 * of pace shows within a few frames. By time, not points, so every sample rate draws it alike.
 */
const SPEED_EASE_MS = 47;

/**
 * How wide a pen draws at this pressure under `response`, as a fraction of the size; Off is the size.
 * Up to a half press it follows the curve's exponent; past it, the width eases out to `PRESSURE_CAP`
 * times a half press's, at first as steeply, so pressing harder adds less and less.
 */
const pressureWidth = (pressure: number, response: PenPressure) => {
  if (response === "off") return 1;
  const exponent = PRESSURE_EXPONENTS[response];
  const range = 1 - PRESSURE_FLOOR;
  if (pressure <= MID_PRESSURE) return PRESSURE_FLOOR + range * pressure ** exponent;
  const half = PRESSURE_FLOOR + range * MID_PRESSURE ** exponent;
  const rise = (PRESSURE_CAP - 1) * half;
  const slope = range * exponent * MID_PRESSURE ** (exponent - 1);
  const past = clamp01((pressure - MID_PRESSURE) / (1 - MID_PRESSURE));
  return half + rise * (1 - (1 - past) ** ((slope * (1 - MID_PRESSURE)) / rise));
};
/** The share of a stroke's width at `reach` units from where it lands or lifts, under its taper. */
const tapered = ({ dot, travel }: Taper, reach: number) =>
  dot + (1 - dot) * Math.min(1, reach / travel);
/** Touch, mouse and a pen with no pressure: a quick flick draws thinner, the way ink runs thin. */
const speedWidth = (speed: number) =>
  clamp(1.12 - 0.15 * speed, SPEED_WIDTHS.fast, SPEED_WIDTHS.slow);

/**
 * How wide a pen's mark will be before it lands, as a fraction of the size: a middle pressure under
 * its curve, or the speed model's middle for a pen not known to sense pressure. Off is the size.
 */
export const previewWidth = (response: PenPressure, pressureVaries: boolean) =>
  response === "off"
    ? 1
    : pressureVaries
      ? pressureWidth(MID_PRESSURE, response)
      : (SPEED_WIDTHS.fast + SPEED_WIDTHS.slow) / 2;

/** Where the pointer itself was, in sheet units, and when, in ms. */
export interface Nib {
  x: number;
  y: number;
  t: number;
}

interface StrokeStart {
  tool: StrokeOp["tool"];
  color: string;
  /** Width in sheet units. */
  size: number;
  x: number;
  y: number;
  /** When the first point landed, in ms. */
  t: number;
  /** ms into the session. */
  T: number;
  /** The first sample's pressure, and the pointer drawing. */
  pressure: number;
  pointerType: string;
  /** This pen has shown its pressure moving before, so pressure sets the width from the first sample. */
  pressureVaries: boolean;
  /** How a pen's pressure sets its width; a finger or a mouse goes by speed whatever it is. */
  response: PenPressure;
}

/**
 * Builds a stroke point by point. A brush's width follows a pen's pressure through its curve within
 * a few samples, or the speed for touch, mouse and a pen whose pressure never moves, smoothed so it
 * never jumps, and tapers in from a dot. It starts from the first sample's width, so a light start
 * stays light; a pen's also tapers out once it lifts (`taperEnd`). The eraser keeps one width, and so
 * does a pen with its pressure Off.
 */
export class StrokeBuilder {
  readonly op: StrokeOp;
  private readonly size: number;
  private readonly t0: number;
  /** The pointer's own sample as the last point went in, which a speed-drawn width measures from. */
  private nib: Nib;
  private readonly pen: boolean;
  private readonly response: PenPressure;
  /** The pen's first reading; null while it has reported none. */
  private firstPressure: number | null;
  /** Pressure sets the width: this pen has shown its pressure moving, in this stroke or before. */
  private pressed: boolean;
  /** The pen landed reporting no pressure: its first reading sets the landing's width. */
  private landedUnread: boolean;
  private smoothed: number;
  /**
   * A pressing pen's last width from its pressure: its width is the mean of that and the next, steady,
   * and a step lands in full by its second sample. Null until it presses.
   */
  private pressedWidth: number | null = null;
  /** The curve through the points, which adds the points the stroke paints along it. */
  private readonly curve: StrokeCurve;
  private readonly taper: Taper;
  /** How far the stroke has reached from where it landed, which its taper in goes by. */
  private reach = 0;

  constructor(start: StrokeStart) {
    const { tool, color, size, x, y, t, T, pressure, pointerType, pressureVaries, response } =
      start;
    this.size = size;
    this.t0 = t;
    this.nib = { x, y, t };
    this.pen = pointerType === "pen";
    this.response = response;
    // A pen landing at no pressure hasn't reported any yet, as Safari can for a Pencil. Its dot
    // starts at the lightest width, so it never shows wider than the stroke its reading sets.
    this.firstPressure = pressure > 0 ? pressure : null;
    this.pressed = this.pen && pressureVaries;
    this.landedUnread = this.pressed && pressure <= 0;
    this.smoothed = this.pressed ? pressureWidth(pressure, response) : 1;
    this.taper = this.pen ? PEN_TAPER : TOUCH_TAPER;
    const width = tool === "eraser" ? size : size * this.taper.dot * this.smoothed;
    this.op = { tool, color, pts: [x, y, width, 0], T };
    this.curve = new StrokeCurve(this.op.pts);
  }

  get count(): number {
    return this.op.pts.length / STRIDE;
  }

  /** The line reaches the newest point: nothing waits for the next one to set its curve. */
  get settled(): boolean {
    return this.curve.settled;
  }

  /** Whether pressure set this stroke's width: its pen senses pressure. */
  get pressured(): boolean {
    return this.pressed;
  }

  /**
   * Adds a point unless it's within half a unit of the last one; says whether it did. `nib` is the
   * pointer's own sample, whose motion since the last point sets a speed-drawn width, as the line
   * lags it under Smoothing; null for a point the line glides to with no new sample, which keeps
   * the width.
   */
  add(x: number, y: number, pressure: number, t: number, nib: Nib | null = { x, y, t }): boolean {
    const { tool } = this.op;
    const dist = Math.hypot(x - this.curve.x, y - this.curve.y);
    if (dist < MIN_STEP) return false;
    let width = this.size;
    if (tool === "brush") {
      if (this.pen && pressure > 0) {
        this.firstPressure ??= pressure;
        if (Math.abs(pressure - this.firstPressure) > PRESSURE_STEP) this.pressed = true;
      }
      // Off, a pen draws the brush's size, whatever it reports.
      const off = this.pen && this.response === "off";
      if (off || !this.pressed) {
        this.pressedWidth = null;
        if (nib) {
          const eased = 1 - Math.exp(-Math.max(0, nib.t - this.nib.t) / SPEED_EASE_MS);
          this.smoothed = lerp(this.smoothed, off ? 1 : speedWidth(this.speedTo(nib)), eased);
        }
      } else if (pressure > 0) {
        // Pressure shows at the nib at once; speed, under a finger, eases in so it never jumps. A
        // pressing pen that reads no pressure, as it can while lifting, keeps its width.
        const now = pressureWidth(pressure, this.response);
        if (this.landedUnread) {
          this.landedUnread = false;
          this.smoothed = now;
          this.curve.setFirstWidth(this.size * this.taper.dot * now);
        }
        this.smoothed = ((this.pressedWidth ?? this.smoothed) + now) / 2;
        this.pressedWidth = now;
      }
      const { pts } = this.op;
      this.reach = Math.max(this.reach, Math.hypot(x - pts[0], y - pts[1]));
      width *= this.smoothed * tapered(this.taper, this.reach);
    }
    if (nib) this.nib = nib;
    this.curve.add(x, y, width, Math.round(t - this.t0));
    return true;
  }

  /** How fast the pointer itself moved since the last point, in sheet units per ms. */
  private speedTo(nib: Nib): number {
    const was = this.nib;
    return Math.hypot(nib.x - was.x, nib.y - was.y) / Math.max(1, nib.t - was.t);
  }

  /**
   * The nib paused or lifted at x, y: the line ends there, curved all the way. The point before
   * waits for the next one until then, which sets the curve's way through it.
   */
  settle(x: number, y: number): void {
    this.curve.settle(x, y);
  }

  /**
   * The pen lifted and the line settled: narrows a pen's brush stroke over the last
   * `PEN_TAPER.travel` units along its curve, never past the dot it landed with. Returns the first
   * point it narrowed, the count when it narrowed none, so what was painted from there can be
   * painted again. Once per stroke.
   */
  taperEnd(): number {
    const { pts, tool } = this.op;
    const count = this.count;
    if (tool !== "brush" || !this.pen) return count;
    // Each point's share of its width from the taper in, by how far the line had reached there.
    const tapersIn: number[] = [];
    let reach = 0;
    for (let j = 0; j < pts.length; j += STRIDE) {
      reach = Math.max(reach, Math.hypot(pts[j] - pts[0], pts[j + 1] - pts[1]));
      tapersIn.push(tapered(PEN_TAPER, reach));
    }
    let from = count;
    let back = 0;
    for (let i = count - 1; i > 0 && back < PEN_TAPER.travel; i--) {
      const j = i * STRIDE;
      const out = tapered(PEN_TAPER, back);
      if (out < tapersIn[i]) {
        pts[j + 2] *= out / tapersIn[i];
        from = i;
      }
      back += Math.hypot(pts[j] - pts[j - STRIDE], pts[j + 1] - pts[j - STRIDE + 1]);
    }
    return from;
  }
}
