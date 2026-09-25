export type TouchDownResult = "draw" | "cancel-stroke" | "ignore";
export type TapGesture = "undo" | "redo" | null;

export interface TapConfig {
  /** Extra fingers must land within this long of the first to count. */
  multiWindow: number;
  /** All fingers must lift within this long of the first touch. */
  maxDuration: number;
  /** Any finger moving further than this cancels the tap. */
  maxMove: number;
}

const DEFAULTS: TapConfig = { multiWindow: 250, maxDuration: 350, maxMove: 12 };

/**
 * Procreate-style multi-finger taps: two fingers = undo, three = redo.
 * Feed it touch pointer events only; pen input never forms a gesture.
 */
export class TapRecognizer {
  private cfg: TapConfig;
  private touches = new Map<number, { x: number; y: number }>();
  private startT = 0;
  private maxCount = 0;
  private failed = false;

  constructor(cfg: Partial<TapConfig> = {}) {
    this.cfg = { ...DEFAULTS, ...cfg };
  }

  /** True once a second finger has joined in time, i.e. this is not a stroke. */
  get isGesture(): boolean {
    return this.maxCount >= 2;
  }

  down(id: number, x: number, y: number, t: number): TouchDownResult {
    if (this.touches.size === 0) {
      this.touches.set(id, { x, y });
      this.startT = t;
      this.maxCount = 1;
      this.failed = false;
      return "draw";
    }
    this.touches.set(id, { x, y });
    if (this.maxCount === 1 && t - this.startT > this.cfg.multiWindow) {
      // A late second finger (e.g. a resting palm) while drawing: ignore it.
      this.failed = true;
      return "ignore";
    }
    const wasSingle = this.maxCount === 1;
    this.maxCount = Math.max(this.maxCount, this.touches.size);
    return wasSingle && !this.failed ? "cancel-stroke" : "ignore";
  }

  move(id: number, x: number, y: number): void {
    const start = this.touches.get(id);
    if (start && Math.hypot(x - start.x, y - start.y) > this.cfg.maxMove) this.failed = true;
  }

  up(id: number, t: number): TapGesture {
    if (!this.touches.delete(id) || this.touches.size > 0) return null;
    if (this.failed || t - this.startT > this.cfg.maxDuration) return null;
    if (this.maxCount === 2) return "undo";
    if (this.maxCount === 3) return "redo";
    return null;
  }

  cancel(id: number): void {
    this.touches.delete(id);
    this.failed = true;
  }
}
