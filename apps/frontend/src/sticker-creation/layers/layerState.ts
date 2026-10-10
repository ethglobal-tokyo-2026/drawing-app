import { MAX_LAYERS } from "@drawing-app/api/client";
import { isOp, type LayerId, type LayerStep, type Step } from "../canvas/ops";

/** The most layers a sheet holds; the API bounds a timelapse's layers by it too. */
export { MAX_LAYERS };

/** A layer as its steps leave it: its ink lives in its own canvas, which `LayerInk` keeps. */
export interface Layer {
  id: LayerId;
  /** 0 to 100; at 0 the layer is hidden and takes no ink. */
  opacity: number;
  /** Lock transparent pixels: brush and fill change only pixels already on the layer. */
  locked: boolean;
  /** Clip to layer below: it shows only where its base has ink. */
  clipped: boolean;
}

/** The layers, back to front. `nextId` is one more than the highest number the sheet has used. */
export interface LayerState {
  layers: readonly Layer[];
  nextId: LayerId;
}

/** The layer every sheet starts with. */
export const FIRST_LAYER: LayerId = 1;

/** A layer's opacity when it's added, and the most it takes. */
export const FULL_OPACITY = 100;

/** A fresh sheet: one layer at full opacity. */
export const FIRST_LAYERS: LayerState = {
  layers: [{ id: FIRST_LAYER, opacity: FULL_OPACITY, locked: false, clipped: false }],
  nextId: FIRST_LAYER + 1,
};

/**
 * A step that doesn't fit the layers it meets. `stepIndex` is its place among the steps, null when
 * it was checked alone.
 */
export class LayerStepError extends Error {
  readonly stepIndex: number | null;

  constructor(message: string, stepIndex: number | null) {
    super(message);
    this.name = "LayerStepError";
    this.stepIndex = stepIndex;
  }
}

const NO_SUCH_LAYER = "the sheet has no such layer";

/** What a step does, for the error that refuses it. */
function describeStep(step: Step): string {
  switch (step.tool) {
    case "add":
      return `add layer ${step.layer} at ${step.at}`;
    case "delete":
      return `delete layer ${step.layer}`;
    case "move":
      return `move layer ${step.layer} to ${step.to}`;
    case "opacity":
      return `set layer ${step.layer}'s opacity to ${step.opacity}`;
    case "lock":
    case "clip":
      return `turn ${step.tool} ${step.on ? "on" : "off"} for layer ${step.layer}`;
    case "clear":
      return `clear layer ${step.layer}`;
    default:
      return `${step.tool} on layer ${step.layer}`;
  }
}

/** Whether `v` is a whole number from 0 to `max`. */
const isCountUpTo = (v: number, max: number): boolean => Number.isInteger(v) && v >= 0 && v <= max;

const withLayer = (state: LayerState, at: number, change: Partial<Layer>): LayerState => ({
  ...state,
  layers: state.layers.map((layer, i) => (i === at ? { ...layer, ...change } : layer)),
});

function applyStep(state: LayerState, step: LayerStep, stepIndex: number | null): LayerState {
  const refuse = (reason: string) =>
    new LayerStepError(`${describeStep(step)}: ${reason}`, stepIndex);
  const { layers } = state;
  const at = indexOf(state, step.layer);
  if (step.tool === "add") {
    if (at >= 0) throw refuse("the sheet has that layer already");
    if (step.layer < state.nextId)
      throw refuse(`the sheet has used numbers up to ${state.nextId - 1}`);
    if (layers.length >= MAX_LAYERS) throw refuse(`a sheet holds ${MAX_LAYERS} layers at most`);
    if (!isCountUpTo(step.at, layers.length)) throw refuse(`the sheet has ${layers.length} layers`);
    const added: Layer = { id: step.layer, opacity: FULL_OPACITY, locked: false, clipped: false };
    return {
      layers: [...layers.slice(0, step.at), added, ...layers.slice(step.at)],
      // Above every number used, so a layer a delete took out never has its number given again.
      nextId: step.layer + 1,
    };
  }
  if (at < 0) throw refuse(NO_SUCH_LAYER);
  switch (step.tool) {
    case "delete":
      if (layers.length === 1) throw refuse("the last layer can't be deleted");
      return { ...state, layers: layers.filter((layer) => layer.id !== step.layer) };
    case "move": {
      if (!isCountUpTo(step.to, layers.length - 1))
        throw refuse(`the sheet has ${layers.length} layers`);
      const rest = layers.filter((layer) => layer.id !== step.layer);
      return { ...state, layers: [...rest.slice(0, step.to), layers[at], ...rest.slice(step.to)] };
    }
    case "opacity":
      if (!isCountUpTo(step.opacity, FULL_OPACITY))
        throw refuse(`opacity is a whole number from 0 to ${FULL_OPACITY}`);
      return withLayer(state, at, { opacity: step.opacity });
    case "lock":
      return withLayer(state, at, { locked: step.on });
    case "clip":
      return withLayer(state, at, { clipped: step.on });
    case "clear":
      return state;
  }
}

/**
 * The state after `step`, a new object; a clear leaves the state as it was. A step that doesn't
 * fit the state throws a LayerStepError.
 */
export function applyLayerStep(state: LayerState, step: LayerStep): LayerState {
  return applyStep(state, step, null);
}

/** The nearest unclipped layer below a clipped one; null when it isn't clipped or nothing is below. */
export function baseOf(state: LayerState, id: LayerId): Layer | null {
  const at = indexOf(state, id);
  if (at < 0 || !state.layers[at].clipped) return null;
  for (let i = at - 1; i >= 0; i--) if (!state.layers[i].clipped) return state.layers[i];
  return null;
}

export const isHidden = (layer: Layer): boolean => layer.opacity === 0;

/** The layer's index from the back; -1 when the sheet has no such layer. */
export function indexOf(state: LayerState, id: LayerId): number {
  return state.layers.findIndex((layer) => layer.id === id);
}

/** Updates `inked` for `step`. It doesn't check that the step fits the layers; `stateAt` does. */
function inkAfter(inked: Set<LayerId>, step: Step): void {
  if (isOp(step)) inked.add(step.layer);
  else if (step.tool === "clear" || step.tool === "delete" || step.tool === "add")
    inked.delete(step.layer);
}

/**
 * Which layers hold ink after `steps`, from a blank sheet: an op inks its layer; clear and delete
 * empty it, and an added layer starts empty.
 */
export function inkedAfter(steps: readonly Step[]): ReadonlySet<LayerId> {
  const inked = new Set<LayerId>();
  for (const step of steps) inkAfter(inked, step);
  return inked;
}

/**
 * Where a timelapse starts: just past the last step after which no layer had ink. What the steps
 * before it set up, such as a layer or its opacity, is in the state `stateAt` gives there.
 */
export function timelapseStart(steps: readonly Step[]): number {
  const inked = new Set<LayerId>();
  let start = 0;
  for (let i = 0; i < steps.length; i++) {
    inkAfter(inked, steps[i]);
    if (inked.size === 0) start = i + 1;
  }
  return start;
}

/**
 * The layers after the first `index` steps, from FIRST_LAYERS. It also checks the steps fit: an op
 * names a layer the sheet has by then, and a layer step passes `applyLayerStep`. One that doesn't
 * throws a LayerStepError carrying its place among `steps`.
 */
export function stateAt(steps: readonly Step[], index: number): LayerState {
  if (!isCountUpTo(index, steps.length))
    throw new RangeError(`There is no state after ${index} of ${steps.length} steps`);
  let state = FIRST_LAYERS;
  for (let i = 0; i < index; i++) {
    const step = steps[i];
    if (!isOp(step)) state = applyStep(state, step, i);
    else if (indexOf(state, step.layer) < 0)
      throw new LayerStepError(`${describeStep(step)}: ${NO_SUCH_LAYER}`, i);
  }
  return state;
}
