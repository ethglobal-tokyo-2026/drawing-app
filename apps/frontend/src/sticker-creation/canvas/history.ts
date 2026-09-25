import type { Entry } from "./types";

/* oxlint-disable typescript/method-signature-style -- implemented by classes; method syntax keeps unbound-method able to flag a detached call */
/** Something history can draw entries onto and snapshot for fast undo. */
export interface Surface<S> {
  apply(entry: Entry): void;
  /** Restore a snapshot, or blank the surface when `null`. */
  restore(snapshot: S | null): void;
  snapshot(): S;
}
/* oxlint-enable typescript/method-signature-style */

export interface HistoryOptions {
  /** Take a snapshot every N entries. */
  interval?: number;
  /** Keep at most this many snapshots (they can be large bitmaps). */
  maxCheckpoints?: number;
}

/**
 * Vector undo/redo history. Undo rebuilds the surface from the nearest
 * snapshot (or last clear) and replays the remaining entries.
 */
export class History<S> {
  private surface: Surface<S>;
  private entries: Entry[] = [];
  private redoStack: Entry[] = [];
  /** Keyed by the number of entries the snapshot contains. */
  private checkpoints = new Map<number, S>();
  private interval: number;
  private maxCheckpoints: number;

  constructor(surface: Surface<S>, opts: HistoryOptions = {}) {
    this.surface = surface;
    this.interval = opts.interval ?? 25;
    this.maxCheckpoints = opts.maxCheckpoints ?? 6;
  }

  get canUndo(): boolean {
    return this.entries.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get length(): number {
    return this.entries.length;
  }

  get last(): Entry | undefined {
    return this.entries[this.entries.length - 1];
  }

  push(entry: Entry): void {
    this.redoStack = [];
    // Snapshots past the current length belong to an abandoned branch.
    for (const k of this.checkpoints.keys())
      if (k > this.entries.length) this.checkpoints.delete(k);
    this.append(entry);
  }

  undo(): boolean {
    const entry = this.entries.pop();
    if (!entry) return false;
    this.redoStack.push(entry);
    this.rebuild();
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.append(entry);
    return true;
  }

  /** Start over with an empty surface and no undo/redo. */
  reset(): void {
    this.entries = [];
    this.redoStack = [];
    this.checkpoints.clear();
    this.surface.restore(null);
  }

  /** Drop snapshots (e.g. after a resize) and redraw from entries. */
  invalidate(): void {
    this.checkpoints.clear();
    this.rebuild();
  }

  rebuild(): void {
    const len = this.entries.length;
    let start = 0;
    let snapshot: S | null = null;
    for (const [k, s] of this.checkpoints) {
      if (k <= len && k > start) {
        start = k;
        snapshot = s;
      }
    }
    let lastClear = -1;
    for (let i = len - 1; i >= start; i--) {
      if (this.entries[i].kind === "clear") {
        lastClear = i;
        break;
      }
    }
    if (lastClear >= 0) {
      start = lastClear + 1;
      snapshot = null;
    }
    this.surface.restore(snapshot);
    for (let i = start; i < len; i++) this.surface.apply(this.entries[i]);
  }

  private append(entry: Entry): void {
    this.entries.push(entry);
    this.surface.apply(entry);
    const len = this.entries.length;
    if (len % this.interval === 0 && !this.checkpoints.has(len)) {
      this.checkpoints.set(len, this.surface.snapshot());
      if (this.checkpoints.size > this.maxCheckpoints) {
        this.checkpoints.delete(Math.min(...this.checkpoints.keys()));
      }
    }
  }
}
