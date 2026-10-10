import { isOp, type LayerId, type LayerStep, type Op, type Step } from "../canvas/ops";
import { CHECKPOINT_COST, checkpointToDrop, planCheckpoints } from "./checkpoints";
import {
  applyLayerStep,
  FIRST_LAYER,
  FIRST_LAYERS,
  indexOf,
  LayerStepError,
  stateAt,
  timelapseStart,
  type LayerState,
} from "./layerState";
import type { LayerSurface } from "./layerSurface";

const NO_INK: ReadonlySet<LayerId> = new Set();

type OpacityStep = Extract<LayerStep, { tool: "opacity" }>;

/** The inked layers after `step`, from those before it, counted as `inkedAfter` counts them. */
function inkedAfterStep(before: ReadonlySet<LayerId>, step: Step): ReadonlySet<LayerId> {
  if (isOp(step)) return before.has(step.layer) ? before : new Set(before).add(step.layer);
  const empties = step.tool === "clear" || step.tool === "delete" || step.tool === "add";
  if (!empties || !before.has(step.layer)) return before;
  const after = new Set(before);
  after.delete(step.layer);
  return after;
}

/**
 * Undo and redo over every step, ops and layer changes alike. Undo rebuilds only the layer the
 * undone step changed, from its nearest checkpoint, replaying that layer's own ops since; a
 * checkpoint holds every inked layer copy-on-write, and checkpoints thin out to fit the surface's
 * copy budget.
 */
export class LayerHistory<Hold> {
  private readonly surface: LayerSurface<Hold>;
  private done: Step[] = [];
  private undone: Step[] = [];
  /** Index n: the layers after the first n steps. */
  private states: LayerState[] = [FIRST_LAYERS];
  /** Index n: the inked layers after the first n steps. */
  private inkedSets: ReadonlySet<LayerId>[] = [NO_INK];
  /** Index n: the summed replay cost of the first n steps. */
  private costTo: number[] = [0];
  /** Each checkpoint's holds, by how many steps it holds the layers after. */
  private readonly checkpoints = new Map<number, ReadonlyMap<LayerId, Hold>>();

  constructor(surface: LayerSurface<Hold>) {
    this.surface = surface;
  }

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** The layers at the head. */
  get state(): LayerState {
    return this.states[this.done.length];
  }

  /** Some layer has ink at the head. */
  get hasInk(): boolean {
    return this.inked.size > 0;
  }

  /** Which layers have ink at the head. */
  get inked(): ReadonlySet<LayerId> {
    return this.inkedSets[this.done.length];
  }

  /** Every step, oldest first: what the drawing kept on the device holds. */
  get steps(): readonly Step[] {
    return this.done;
  }

  /** The steps the timelapse plays, from the last time no layer had ink, and the layers then. */
  timelapse(): { steps: readonly Step[]; start: LayerState } {
    const start = timelapseStart(this.done);
    return { steps: this.done.slice(start), start: this.states[start] };
  }

  /** Records an op the surface already shows: a stroke painted live, a fill already written. */
  commit(op: Op): void {
    if (indexOf(this.state, op.layer) < 0)
      throw new LayerStepError(
        `${op.tool} on layer ${op.layer}: the sheet has no such layer`,
        null,
      );
    this.branch();
    this.record(op, this.state);
    this.trim(this.checkpointIfDue());
  }

  /** Makes a layer change through the surface and records it. */
  perform(step: LayerStep): void {
    const before = this.state;
    const after = applyLayerStep(before, step);
    this.surface.apply(step, before);
    this.branch();
    this.record(step, after);
    this.trim(this.checkpointIfDue());
  }

  /**
   * Changes a layer's opacity as one step with the change just before it, when that changed the
   * same layer's opacity and nothing is undone, so back-to-back changes undo together. A change back
   * to where they began leaves no step.
   */
  performOpacity(step: OpacityStep): void {
    const last = this.done.at(-1);
    if (this.canRedo || last?.tool !== "opacity" || last.layer !== step.layer) {
      this.perform(step);
      return;
    }
    const start = this.states[this.done.length - 1];
    // Checked first, so a step that doesn't fit leaves the history as it was.
    applyLayerStep(start, step);
    // Opacity changes no pixels, so the merged step goes with its state alone.
    this.popHead();
    if (start.layers[indexOf(start, step.layer)].opacity !== step.opacity) {
      this.perform(step);
      return;
    }
    this.branch();
    this.surface.show(this.state);
  }

  /** The step it undid; null with nothing to undo. */
  undo(): Step | null {
    const step = this.done.at(-1);
    if (!step) return null;
    // Only commit the history movement after the replacement layer is complete.
    if (isOp(step) || step.tool === "clear" || step.tool === "delete")
      this.surface.rebuild(step.layer, () => this.rebuild(step.layer, this.done.length - 1));
    this.popHead();
    this.undone.push(step);
    this.surface.show(this.state);
    this.trim(null);
    return step;
  }

  /** The step it redid; null with nothing to redo. */
  redo(): Step | null {
    const step = this.undone.at(-1);
    if (!step) return null;
    const before = this.state;
    this.surface.apply(step, before);
    this.undone.pop();
    this.record(step, isOp(step) ? before : applyLayerStep(before, step));
    this.surface.show(this.state);
    this.trim(this.checkpointIfDue());
    return step;
  }

  /** Starts over with these steps, replayed in order from blank, with planned checkpoints. Throws a LayerStepError for steps that don't fit. */
  load(steps: readonly Step[], paint = true): void {
    stateAt(steps, steps.length);
    this.startOver();
    this.replay(steps, paint);
  }

  /** A blank sheet with one layer and nothing to undo or redo. */
  reset(): void {
    this.startOver();
    this.surface.show(this.state);
  }

  /**
   * Replays every step from blank, as after the surface was resized and cleared, taking the
   * checkpoints a load would; what was undone can still be redone.
   */
  invalidate(): void {
    const { done, undone } = this;
    this.startOver();
    this.undone = undone;
    this.replay(done);
  }

  /**
   * Lets go of every checkpoint's holds and keeps the steps: as the sheet goes, or to make room when
   * a canvas can't be made. Undo replays from blank until checkpoints are taken again.
   */
  dropCheckpoints(): void {
    for (const at of [...this.checkpoints.keys()]) this.drop(at);
  }

  /** A new step: what was undone can't come back, nor can the checkpoints past the head. */
  private branch(): void {
    this.undone = [];
    for (const at of [...this.checkpoints.keys()]) if (at > this.done.length) this.drop(at);
  }

  /**
   * Applies `steps` from blank in order, so each fill reads the layers as they were when it was first
   * drawn, taking only the checkpoints the eviction rule would keep after the last.
   */
  private replay(steps: readonly Step[], paint = true): void {
    const planned = new Set(
      planCheckpoints(
        steps,
        (step) => this.surface.cost(step),
        (inkedLayers) => this.surface.copyBudgetFor(inkedLayers),
      ),
    );
    // Retain the complete recording even when a browser refuses a canvas partway through replay.
    // The caller can free the partial surface and replay these same steps on the next attempt.
    for (const step of steps) {
      const before = this.state;
      this.record(step, isOp(step) ? before : applyLayerStep(before, step));
    }
    if (!paint) return;
    for (let i = 0; i < steps.length; i++) {
      this.surface.apply(steps[i], this.states[i]);
      if (planned.has(i + 1)) this.take(i + 1);
    }
    this.surface.show(this.state);
    this.trim(null);
  }

  /** Takes the last step off, with its state, inked layers and cost. */
  private popHead(): Step | undefined {
    const step = this.done.pop();
    if (!step) return undefined;
    this.states.pop();
    this.inkedSets.pop();
    this.costTo.pop();
    return step;
  }

  private record(step: Step, after: LayerState): void {
    const head = this.done.length;
    this.done.push(step);
    this.states.push(after);
    this.inkedSets.push(inkedAfterStep(this.inkedSets[head], step));
    this.costTo.push(this.costTo[head] + this.surface.cost(step));
  }

  /** The step count of the nearest checkpoint at or before `head`; 0, the blank sheet, when none is. */
  private nearestCheckpoint(head: number): number {
    let nearest = 0;
    for (const at of this.checkpoints.keys()) if (at <= head && at > nearest) nearest = at;
    return nearest;
  }

  /** Takes a checkpoint at the head once the steps since the last one cost enough; returns where. */
  private checkpointIfDue(): number | null {
    const head = this.done.length;
    if (this.costTo[head] - this.costTo[this.nearestCheckpoint(head)] < CHECKPOINT_COST)
      return null;
    this.take(head);
    return head;
  }

  private take(at: number): void {
    const holds = new Map<LayerId, Hold>();
    for (const layer of this.inkedSets[at]) holds.set(layer, this.surface.hold(layer));
    this.checkpoints.set(at, holds);
  }

  private drop(at: number): void {
    const holds = this.checkpoints.get(at);
    if (!holds) return;
    this.checkpoints.delete(at);
    for (const hold of holds.values()) this.surface.release(hold);
  }

  /** Drops checkpoints by the eviction rule until their copies fit the budget. */
  private trim(justTaken: number | null): void {
    const budget = this.surface.copyBudgetFor(this.inked.size);
    const holdsOf = (at: number) => [...(this.checkpoints.get(at)?.values() ?? [])];
    for (;;) {
      const at = checkpointToDrop({
        kept: [...this.checkpoints.keys()],
        head: this.done.length,
        costTo: (steps) => this.costTo[steps],
        copiesFreed: (k) => this.surface.copiesFreedBy(holdsOf(k)),
        copiesHeld: this.surface.copiesHeld,
        budget,
        justTaken,
      });
      if (at === null) return;
      this.drop(at);
    }
  }

  /**
   * Rebuilds `layer` at the head from its nearest checkpoint, or from blank after its last clear,
   * replaying its own ops since, each as drawn in the layers then.
   */
  private rebuild(layer: LayerId, head: number): void {
    let from = this.nearestCheckpoint(head);
    let hold = this.checkpoints.get(from)?.get(layer) ?? null;
    for (let i = head - 1; i >= from; i--) {
      const step = this.done[i];
      if (step.layer === layer && (step.tool === "clear" || step.tool === "add")) {
        from = i + 1;
        hold = null;
        break;
      }
    }
    this.surface.restore(layer, hold);
    for (let i = from; i < head; i++) {
      const step = this.done[i];
      if (isOp(step) && step.layer === layer) this.surface.apply(step, this.states[i]);
    }
  }

  /** Lets go of every hold and every step, and blanks the layers. */
  private startOver(): void {
    this.dropCheckpoints();
    this.blankLayers();
    this.done = [];
    this.undone = [];
    this.states = [FIRST_LAYERS];
    this.inkedSets = [NO_INK];
    this.costTo = [0];
  }

  /** A failed replay may still hold a layer deleted later in the recording, so clear every used ID. */
  private blankLayers(): void {
    const layers = new Set([
      FIRST_LAYER,
      ...this.done.map((step) => step.layer),
      ...this.undone.map((step) => step.layer),
    ]);
    for (const layer of layers) this.surface.restore(layer, null);
  }
}
