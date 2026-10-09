/** Every finger must lift within this long of the gesture's start… */
const TAP_MS = 420;
/** …each having moved less than this many CSS px. */
const TAP_SLOP = 14;
/** A stroke younger and shorter than this when a second finger lands was the start of a tap. */
const YOUNG_MS = 260;
const YOUNG_PX = 26;

/** What a touch that just landed should do. */
export type TouchDown =
  /** Draw with it: it's the only finger down. */
  | "draw"
  /** Take back the first finger's stroke; the fingers are tapping. */
  | "cancel-stroke"
  /** Nothing yet: it's part of a tap. */
  | "gesture"
  /** Nothing: a finger resting on the sheet while another draws. */
  | "ignore";

export type TapGesture = "undo" | "redo";

/** The stroke the first finger is drawing, if any, as a second one lands. */
interface LiveStroke {
  /** ms since it began. */
  age: number;
  /** CSS px from where it began. */
  moved: number;
}

/**
 * Multi-finger taps, fed touch pointers only: two fingers undo, three or more redo.
 * A finger that lands while another is well into a stroke is ignored, so a resting palm draws nothing
 * and undoes nothing.
 */
export class TapRecognizer {
  private readonly touches = new Map<number, { x0: number; y0: number }>();
  private gesture: { t0: number; fingers: number; moved: number } | null = null;

  down(id: number, x: number, y: number, t: number, stroke?: LiveStroke): TouchDown {
    this.touches.set(id, { x0: x, y0: y });
    if (this.touches.size < 2 && !this.gesture) return "draw";
    let result: TouchDown = "gesture";
    if (stroke) {
      if (stroke.age >= YOUNG_MS || stroke.moved >= YOUNG_PX) return "ignore";
      result = "cancel-stroke";
    }
    this.gesture ??= { t0: t, fingers: 0, moved: 0 };
    this.gesture.fingers = Math.max(this.gesture.fingers, this.touches.size);
    return result;
  }

  move(id: number, x: number, y: number): void {
    const touch = this.touches.get(id);
    if (!touch || !this.gesture) return;
    this.gesture.moved = Math.max(this.gesture.moved, Math.hypot(x - touch.x0, y - touch.y0));
  }

  /** Whether this finger belongs to a tap in progress, rather than a stroke. */
  inGesture(id: number): boolean {
    return this.gesture !== null && this.touches.has(id);
  }

  /** Whether this finger is down, as far as the recognizer has heard. */
  holds(id: number): boolean {
    return this.touches.has(id);
  }

  /** Forgets every finger and any tap in progress; returns the fingers it held. */
  clear(): number[] {
    const ids = [...this.touches.keys()];
    this.touches.clear();
    this.gesture = null;
    return ids;
  }

  /** The gesture the last lifting finger completes, if any. */
  up(id: number, t: number): TapGesture | null {
    this.touches.delete(id);
    const gesture = this.gesture;
    if (!gesture || this.touches.size > 0) return null;
    this.gesture = null;
    if (t - gesture.t0 >= TAP_MS || gesture.moved >= TAP_SLOP) return null;
    if (gesture.fingers === 2) return "undo";
    return gesture.fingers >= 3 ? "redo" : null;
  }

  /** The browser took the touch (a scroll or a system gesture): no tap. */
  cancel(id: number): void {
    this.touches.delete(id);
    if (!this.gesture) return;
    this.gesture.moved = Infinity;
    if (this.touches.size === 0) this.gesture = null;
  }
}
