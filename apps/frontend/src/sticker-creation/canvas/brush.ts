import { clamp } from "../../ui/easing";
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
/** A stroke starts as a dot this fraction of its first width, then widens by `TAPER_STEP` a point. */
const FIRST_DOT = 0.6;
const TAPER_STEP = 0.08;
/**
 * Each curve's exponent on the pressure: under 1 a light touch already draws wide, over 1 full width
 * takes more force. Normal is the curve a pen has always had.
 */
const PRESSURE_EXPONENTS = {
  light: 0.5,
  normal: 0.75,
  firm: 1.25,
} as const satisfies Record<Exclude<PenPressure, "off">, number>;
/** A pen pressed halfway: what the hover ring previews, as Apple's guidance asks of a preview. */
const MID_PRESSURE = 0.5;
/** A pen's pressure moving less than this within a stroke is a pen that senses none. */
const PRESSURE_STEP = 0.01;
/** A pressing pen's width is the mean of its last this-many samples' widths: steady, and a step lands in full by then. */
export const PEN_PRESSURE_SAMPLES = 2;
/** Touch, mouse and a pen with no pressure draw between these fractions of the size: thin when quick. */
const SPEED_WIDTHS = { fast: 0.68, slow: 1.1 } as const;

/** How wide a pen draws at this pressure under `response`, as a fraction of the size; Off is the size. */
const pressureWidth = (pressure: number, response: PenPressure) =>
  response === "off" ? 1 : 0.28 + 0.72 * pressure ** PRESSURE_EXPONENTS[response];
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
 * never jumps, and tapers in from a dot. It starts from the first sample's width, so a light start stays light. The eraser
 * keeps one width, and so does a pen with its pressure Off.
 */
export class StrokeBuilder {
  readonly op: StrokeOp;
  private readonly size: number;
  private readonly t0: number;
  private lastT: number;
  private readonly pen: boolean;
  private readonly response: PenPressure;
  private readonly firstPressure: number;
  /** Pressure sets the width: this pen has shown its pressure moving, in this stroke or before. */
  private pressed: boolean;
  private smoothed: number;
  /** A pressing pen's latest widths, newest last, that its width is the mean of. */
  private readonly pressedWidths: number[] = [];
  /** The curve through the points, which adds the points the stroke paints along it. */
  private readonly curve: StrokeCurve;
  /** Points added so far, the first included: the taper counts these, not the curve's pieces between them. */
  private points = 1;

  constructor(start: StrokeStart) {
    const { tool, color, size, x, y, t, T, pressure, pointerType, pressureVaries, response } =
      start;
    this.size = size;
    this.t0 = t;
    this.lastT = t;
    this.pen = pointerType === "pen";
    this.response = response;
    this.firstPressure = pressure;
    this.pressed = this.pen && pressureVaries && pressure > 0;
    this.smoothed = this.pressed ? pressureWidth(pressure, response) : 1;
    const dot = tool === "eraser" ? 1 : FIRST_DOT * this.smoothed;
    this.op = { tool, color, pts: [x, y, size * dot, 0], T };
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

  /** Adds a point unless it's within half a unit of the last one; says whether it did. */
  add(x: number, y: number, pressure: number, t: number): boolean {
    const { tool } = this.op;
    const n = this.points;
    const dist = Math.hypot(x - this.curve.x, y - this.curve.y);
    if (dist < MIN_STEP) return false;
    const dt = Math.max(1, t - this.lastT);
    this.lastT = t;
    let width = this.size;
    if (tool === "brush") {
      if (this.pen && Math.abs(pressure - this.firstPressure) > PRESSURE_STEP) this.pressed = true;
      // Off, a pen draws the brush's size, whatever it reports.
      const off = this.pen && this.response === "off";
      if (!off && this.pressed && pressure > 0) {
        // Pressure shows at the nib at once; speed, under a finger, eases in so it never jumps.
        const widths = this.pressedWidths;
        if (widths.length === 0) widths.push(this.smoothed);
        widths.push(pressureWidth(pressure, this.response));
        if (widths.length > PEN_PRESSURE_SAMPLES)
          widths.splice(0, widths.length - PEN_PRESSURE_SAMPLES);
        this.smoothed = widths.reduce((sum, w) => sum + w, 0) / widths.length;
      } else {
        this.pressedWidths.length = 0;
        this.smoothed = 0.7 * this.smoothed + 0.3 * (off ? 1 : speedWidth(dist / dt));
      }
      width *= this.smoothed * Math.min(1, FIRST_DOT + TAPER_STEP * n);
    }
    this.curve.add(x, y, width, Math.round(t - this.t0));
    this.points++;
    return true;
  }

  /**
   * The nib paused or lifted at x, y: the line ends there, curved all the way. The point before
   * waits for the next one until then, which sets the curve's way through it.
   */
  settle(x: number, y: number): void {
    this.curve.settle(x, y);
  }
}
