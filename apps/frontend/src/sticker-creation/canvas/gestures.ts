/** A multi-finger tap: every finger lifts within this many ms of the tap's start… */
export const MULTI_FINGER_TAP_MS = 420;
/** …each having moved less than this many CSS px. */
export const MULTI_FINGER_TAP_SLOP = 14;
/**
 * A stroke younger and shorter than this when a second finger lands was the start of a tap. A touch
 * down this long when a tap begins was there before it, and rests.
 */
export const YOUNG_MS = 260;
export const YOUNG_PX = 26;
/** A contact this wide on its longer side, in CSS px, is a palm, never a fingertip. */
export const PALM_CONTACT_PX = 80;

/** Whether a contact this size, in CSS px, is a palm. */
export const isPalm = (width: number, height: number) => Math.max(width, height) >= PALM_CONTACT_PX;

/** What a touch that just landed should do. */
export type TouchDown =
  /** Draw with it: it's the only finger down. */
  | "draw"
  /** Take back the first finger's stroke; the fingers are tapping. */
  | "cancel-stroke"
  /** Nothing yet: it's part of a tap. */
  | "gesture"
  /** Nothing: a palm, or a finger resting on the sheet while another draws. */
  | "ignore";

export type TapGesture = "undo" | "redo";

/** The stroke the first finger is drawing, if any, as a second one lands. */
interface LiveStroke {
  /** ms since it began. */
  age: number;
  /** CSS px from where it began. */
  moved: number;
}

/** Where a touch is, when it landed, and whether it rests: a resting touch counts toward no tap. */
interface HeldTouch {
  /** Where it was as the tap began, or where it landed after: a tap measures its movement from here. */
  x0: number;
  y0: number;
  x: number;
  y: number;
  t0: number;
  resting: boolean;
}

/**
 * Multi-finger taps, fed touch pointers only: two fingers undo, three or more redo. A palm-sized
 * contact, or a touch already down when a tap begins, rests and counts toward nothing, so a palm on
 * the sheet never holds a tap up. A finger that lands while another is well into a stroke is ignored.
 */
export class TapRecognizer {
  private readonly touches = new Map<number, HeldTouch>();
  private gesture: { t0: number; fingers: number; moved: number } | null = null;

  down(id: number, x: number, y: number, t: number, stroke?: LiveStroke, palm = false): TouchDown {
    // A tap begins with this touch: whatever has been down a while was there before it.
    if (!this.gesture)
      for (const touch of this.touches.values()) if (t - touch.t0 >= YOUNG_MS) touch.resting = true;
    this.touches.set(id, { x0: x, y0: y, x, y, t0: t, resting: palm });
    if (palm) return "ignore";
    const fingers = this.fingers();
    if (fingers < 2 && !this.gesture) return "draw";
    let result: TouchDown = "gesture";
    if (stroke) {
      if (stroke.age >= YOUNG_MS || stroke.moved >= YOUNG_PX) return "ignore";
      result = "cancel-stroke";
    }
    if (!this.gesture) {
      // A finger already down may have drawn the dash the tap takes back: only its moves from here count.
      for (const touch of this.touches.values()) {
        touch.x0 = touch.x;
        touch.y0 = touch.y;
      }
      this.gesture = { t0: t, fingers: 0, moved: 0 };
    }
    this.gesture.fingers = Math.max(this.gesture.fingers, fingers);
    return result;
  }

  move(id: number, x: number, y: number, palm = false): void {
    const touch = this.touches.get(id);
    if (!touch) return;
    touch.x = x;
    touch.y = y;
    // A fingertip that spreads into a palm rests from then on.
    if (palm) touch.resting = true;
    if (!this.gesture || touch.resting) return;
    this.gesture.moved = Math.max(this.gesture.moved, Math.hypot(x - touch.x0, y - touch.y0));
  }

  /** Forgets every finger and any tap in progress. */
  clear(): void {
    this.touches.clear();
    this.gesture = null;
  }

  /** The gesture the last counted finger's lift completes, if any. */
  up(id: number, t: number): TapGesture | null {
    this.touches.delete(id);
    const gesture = this.gesture;
    if (!gesture || this.fingers() > 0) return null;
    this.gesture = null;
    if (t - gesture.t0 >= MULTI_FINGER_TAP_MS || gesture.moved >= MULTI_FINGER_TAP_SLOP)
      return null;
    if (gesture.fingers === 2) return "undo";
    return gesture.fingers >= 3 ? "redo" : null;
  }

  /** The browser took the touch (a scroll or a system gesture): no tap. */
  cancel(id: number): void {
    this.touches.delete(id);
    if (!this.gesture) return;
    this.gesture.moved = Infinity;
    if (this.fingers() === 0) this.gesture = null;
  }

  /** Touches down that count toward a tap. */
  private fingers(): number {
    let count = 0;
    for (const touch of this.touches.values()) if (!touch.resting) count++;
    return count;
  }
}
