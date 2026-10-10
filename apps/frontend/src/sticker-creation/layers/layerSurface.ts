import type { LayerId, Step } from "../canvas/ops";
import type { LayerState } from "./layerState";

/* oxlint-disable typescript/method-signature-style -- implemented by classes; method syntax keeps unbound-method able to flag a detached call */
/**
 * What the layered undo history drives: the layers' ink. The layer ink implements it with canvases;
 * tests use a fake. A hold keeps a layer's pixels as they were, shared with the live layer until the
 * layer is next written, so a checkpoint costs a copy only for a layer written after it.
 */
export interface LayerSurface<Hold> {
  /** Paints an op on its layer, or makes a layer change, as drawn in `before`; a fill replays what it wrote when it has written before. */
  apply(step: Step, before: LayerState): void;
  /** The layers to show; set once after an undo, a redo, a load or a reset. */
  show(state: LayerState): void;
  /** Rebuilds one layer in isolation, preserving its original pixels if any write fails. */
  rebuild(layer: LayerId, write: () => void): void;
  /** Roughly what replaying the step costs, counted in strokes. */
  cost(step: Step): number;
  /** A hold on the layer's pixels as they are now: shared with the live layer until it's next written, copied then. */
  hold(layer: LayerId): Hold;
  /** Makes the layer's pixels what `hold` holds, or blank when null. */
  restore(layer: LayerId, hold: Hold | null): void;
  /** Lets go of a hold. */
  release(hold: Hold): void;
  /** Sheet-sized copies the holds own now. */
  readonly copiesHeld: number;
  /** What letting go of these holds would free, in sheet-sized copies. */
  copiesFreedBy(holds: readonly Hold[]): number;
  /** How many sheet-sized copies holds may own, with this many inked layers. */
  copyBudgetFor(inkedLayers: number): number;
}
/* oxlint-enable typescript/method-signature-style */
