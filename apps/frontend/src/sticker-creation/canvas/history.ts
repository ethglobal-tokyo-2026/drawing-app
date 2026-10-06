import type { Op, Step } from "./ops";

/* oxlint-disable typescript/method-signature-style -- implemented by classes; method syntax keeps unbound-method able to flag a detached call */
/** Something history can draw ops onto and snapshot for fast undo. */
export interface Surface<S> {
  apply(op: Op): void;
  /** Restore a snapshot, or blank the surface when `null`. */
  restore(snapshot: S | null): void;
  snapshot(): S;
  /** Lets go of a snapshot history has dropped. */
  discard(snapshot: S): void;
  /** Roughly what replaying the op costs, counted in strokes. */
  cost(op: Op): number;
}
/* oxlint-enable typescript/method-signature-style */

interface HistoryOptions {
  /** Snapshot once the ops since the last snapshot cost this much to replay. */
  checkpointCost?: number;
  /** Keep at most this many snapshots; each is a full copy of the ink. */
  maxCheckpoints?: number;
}

const isOp = (step: Step): step is Op => step.tool !== "clear";

/**
 * Undo and redo over steps: ops, and clears, which set the ops before them aside. Undo rebuilds the
 * surface from the nearest snapshot, or from the last clear when that's nearer, and replays the ops
 * after it; snapshots come often enough that an undo never replays much.
 */
export class History<S> {
  private readonly surface: Surface<S>;
  private readonly checkpointCost: number;
  private readonly maxCheckpoints: number;
  private done: Step[] = [];
  private undone: Step[] = [];
  /** Keyed by how many steps the snapshot contains. */
  private readonly checkpoints = new Map<number, S>();

  constructor(
    surface: Surface<S>,
    { checkpointCost = 24, maxCheckpoints = 4 }: HistoryOptions = {},
  ) {
    this.surface = surface;
    this.checkpointCost = checkpointCost;
    this.maxCheckpoints = maxCheckpoints;
  }

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** The ops on the surface, oldest first: those since the last clear. */
  get committed(): readonly Op[] {
    return this.done.slice(this.pageStart()).filter(isOp);
  }

  /** Whether there are ops on the surface. */
  get hasInk(): boolean {
    return this.pageStart() < this.done.length;
  }

  /** Every step, oldest first, clears included: what undo can walk back through. */
  get steps(): readonly Step[] {
    return this.done;
  }

  /** Records an op the surface already shows. */
  commit(op: Op): void {
    this.branch();
    this.record(op);
  }

  /** Sets the ops on the surface aside and blanks it; undo brings them back. */
  clear(): void {
    this.branch();
    this.put({ tool: "clear" });
  }

  undo(): boolean {
    const step = this.done.pop();
    if (!step) return false;
    this.undone.push(step);
    this.rebuild();
    return true;
  }

  redo(): boolean {
    const step = this.undone.pop();
    if (!step) return false;
    this.put(step);
    return true;
  }

  /** Starts over on an empty surface with nothing to undo or redo. */
  reset(): void {
    this.done = [];
    this.undone = [];
    this.release();
    this.surface.restore(null);
  }

  /** Lets go of every snapshot, as when the sheet goes; an undo after it replays from the last clear. */
  release(): void {
    this.drop(() => true);
  }

  /** Starts over with these steps, as a drawing picked up after a reload does. */
  load(steps: readonly Step[]): void {
    this.reset();
    for (const step of steps) this.put(step);
  }

  /** Repaints the ops on the surface, dropping whatever else was painted, such as a cancelled stroke. */
  repaint(): void {
    this.rebuild();
  }

  /** Repaints the ops on the surface, as after a resize, when the snapshots no longer fit. */
  invalidate(): void {
    this.release();
    this.rebuild();
  }

  /** A new step: what was undone can't come back, nor can the snapshots taken past this point. */
  private branch(): void {
    this.undone = [];
    this.drop((k) => k > this.done.length);
  }

  /** Paints an op and records it, or records a clear and blanks the surface. */
  private put(step: Step): void {
    if (isOp(step)) {
      this.surface.apply(step);
      this.record(step);
      return;
    }
    this.done.push(step);
    this.surface.restore(null);
  }

  /** Where the ops on the surface start: just past the last clear. */
  private pageStart(): number {
    return this.done.findLastIndex((step) => !isOp(step)) + 1;
  }

  /** Drops the snapshots `which` picks, and lets the surface free each. */
  private drop(which: (k: number) => boolean): void {
    for (const [k, snapshot] of this.checkpoints) {
      if (!which(k)) continue;
      this.checkpoints.delete(k);
      this.surface.discard(snapshot);
    }
  }

  private latestCheckpoint(len: number): number {
    let latest = 0;
    for (const k of this.checkpoints.keys()) if (k <= len && k > latest) latest = k;
    return latest;
  }

  private rebuild(): void {
    const len = this.done.length;
    const snapshot = this.latestCheckpoint(len);
    // The last clear left a blank surface, so nothing before it needs replaying.
    const start = Math.max(snapshot, this.pageStart());
    this.surface.restore(start === snapshot ? (this.checkpoints.get(snapshot) ?? null) : null);
    for (let i = start; i < len; i++) {
      const step = this.done[i];
      if (isOp(step)) this.surface.apply(step);
    }
  }

  private record(op: Op): void {
    this.done.push(op);
    const len = this.done.length;
    let cost = 0;
    for (let i = Math.max(this.latestCheckpoint(len), this.pageStart()); i < len; i++) {
      const step = this.done[i];
      if (isOp(step)) cost += this.surface.cost(step);
    }
    if (cost < this.checkpointCost) return;
    this.checkpoints.set(len, this.surface.snapshot());
    if (this.checkpoints.size > this.maxCheckpoints) {
      const oldest = Math.min(...this.checkpoints.keys());
      this.drop((k) => k === oldest);
    }
  }
}
