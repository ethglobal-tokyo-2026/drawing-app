import type { Op } from "./ops";

/* oxlint-disable typescript/method-signature-style -- implemented by classes; method syntax keeps unbound-method able to flag a detached call */
/** Something history can draw ops onto and snapshot for fast undo. */
export interface Surface<S> {
  apply(op: Op): void;
  /** Restore a snapshot, or blank the surface when `null`. */
  restore(snapshot: S | null): void;
  snapshot(): S;
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

/**
 * Undo and redo over ops. Undo rebuilds the surface from the nearest snapshot and replays the ops
 * after it; snapshots come often enough that an undo never replays much.
 */
export class History<S> {
  private readonly surface: Surface<S>;
  private readonly checkpointCost: number;
  private readonly maxCheckpoints: number;
  private ops: Op[] = [];
  private undone: Op[] = [];
  /** Keyed by how many ops the snapshot contains. */
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
    return this.ops.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** The ops on the surface, oldest first. */
  get committed(): readonly Op[] {
    return this.ops;
  }

  /** Records an op the surface already shows. */
  commit(op: Op): void {
    this.undone = [];
    // Snapshots past this point belong to the ops that were undone.
    for (const k of this.checkpoints.keys()) if (k > this.ops.length) this.checkpoints.delete(k);
    this.record(op);
  }

  undo(): boolean {
    const op = this.ops.pop();
    if (!op) return false;
    this.undone.push(op);
    this.rebuild();
    return true;
  }

  redo(): boolean {
    const op = this.undone.pop();
    if (!op) return false;
    this.surface.apply(op);
    this.record(op);
    return true;
  }

  /** Starts over on an empty surface with nothing to undo or redo. */
  reset(): void {
    this.ops = [];
    this.undone = [];
    this.checkpoints.clear();
    this.surface.restore(null);
  }

  /** Starts over with these ops painted on, as a drawing picked up after a reload does. */
  load(ops: readonly Op[]): void {
    this.reset();
    for (const op of ops) {
      this.surface.apply(op);
      this.record(op);
    }
  }

  /** Repaints the committed ops, dropping whatever else was painted, such as a cancelled stroke. */
  repaint(): void {
    this.rebuild();
  }

  /** Repaints every op, as after a resize, when the snapshots no longer fit. */
  invalidate(): void {
    this.checkpoints.clear();
    this.rebuild();
  }

  private latestCheckpoint(len: number): number {
    let latest = 0;
    for (const k of this.checkpoints.keys()) if (k <= len && k > latest) latest = k;
    return latest;
  }

  private rebuild(): void {
    const len = this.ops.length;
    const start = this.latestCheckpoint(len);
    this.surface.restore(this.checkpoints.get(start) ?? null);
    for (let i = start; i < len; i++) this.surface.apply(this.ops[i]);
  }

  private record(op: Op): void {
    this.ops.push(op);
    const len = this.ops.length;
    let cost = 0;
    for (let i = this.latestCheckpoint(len); i < len; i++) cost += this.surface.cost(this.ops[i]);
    if (cost < this.checkpointCost) return;
    this.checkpoints.set(len, this.surface.snapshot());
    if (this.checkpoints.size > this.maxCheckpoints)
      this.checkpoints.delete(Math.min(...this.checkpoints.keys()));
  }
}
