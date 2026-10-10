import { describe, expect, it } from "vitest";
import type { LayerId, LayerStep, Step } from "../canvas/ops";
import {
  applyLayerStep,
  baseOf,
  FIRST_LAYER,
  FIRST_LAYERS,
  FULL_OPACITY,
  inkedAfter,
  LayerStepError,
  MAX_LAYERS,
  stateAt,
  timelapseStart,
  type LayerState,
} from "./layerState";
import {
  addLayer,
  brush,
  clearLayer,
  deleteLayer,
  eraser,
  fill,
  moveLayer,
  setClip,
  setLock,
  setOpacity,
} from "./testLayerSteps";

/** The layers' numbers, back to front. */
const idsOf = (state: LayerState) => state.layers.map((layer) => layer.id);

/** `count` layers numbered from 1 at the back, those in `clipped` clipping to the layer below. */
function stackOf(count: number, clipped: readonly LayerId[] = []): LayerState {
  return {
    layers: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      opacity: FULL_OPACITY,
      locked: false,
      clipped: clipped.includes(i + 1),
    })),
    nextId: count + 1,
  };
}

/** The state after `steps` applied one by one, without `stateAt`. */
const sheetAfter = (...steps: LayerStep[]) => steps.reduce(applyLayerStep, FIRST_LAYERS);

/** A copy that throws on any write, so a step that changes the state it's given fails its test. */
const frozen = (state: LayerState): LayerState =>
  Object.freeze({
    ...state,
    layers: Object.freeze(state.layers.map((layer) => Object.freeze({ ...layer }))),
  });

/** The error `run` throws, which must be a LayerStepError. */
function refusal(run: () => unknown): LayerStepError {
  try {
    run();
  } catch (error) {
    if (error instanceof LayerStepError) return error;
    throw error;
  }
  throw new Error("Nothing was refused");
}

describe("applyLayerStep", () => {
  it.each<[number, number[]]>([
    [0, [3, 1, 2]],
    [1, [1, 3, 2]],
    [2, [1, 2, 3]],
  ])("adds a layer %i from the back, full opacity, unlocked and unclipped", (at, ids) => {
    const added = applyLayerStep(stackOf(2), addLayer(3, at));
    expect(idsOf(added)).toEqual(ids);
    expect(added.layers[at]).toEqual({
      id: 3,
      opacity: FULL_OPACITY,
      locked: false,
      clipped: false,
    });
  });

  it("takes a deleted layer out, and a moved layer to the place it says", () => {
    const state = stackOf(3);
    expect(idsOf(applyLayerStep(state, deleteLayer(2)))).toEqual([1, 3]);
    expect(idsOf(applyLayerStep(state, moveLayer(1, 2)))).toEqual([2, 3, 1]);
    expect(idsOf(applyLayerStep(state, moveLayer(3, 0)))).toEqual([3, 1, 2]);
    expect(idsOf(applyLayerStep(state, moveLayer(2, 1)))).toEqual([1, 2, 3]);
  });

  it("sets opacity, lock and clip on the layer it names and leaves the other as it was", () => {
    const state = stackOf(2);
    const [back, front] = state.layers;
    expect(applyLayerStep(state, setOpacity(2, 40)).layers).toEqual([
      back,
      { ...front, opacity: 40 },
    ]);
    // Zero hides a layer and a full one is the most: both are opacities.
    for (const opacity of [0, FULL_OPACITY])
      expect(applyLayerStep(state, setOpacity(2, opacity)).layers[1].opacity).toBe(opacity);
    expect(applyLayerStep(state, setLock(2, true)).layers).toEqual([
      back,
      { ...front, locked: true },
    ]);
    expect(applyLayerStep(state, setClip(2, true)).layers).toEqual([
      back,
      { ...front, clipped: true },
    ]);
    // Turned on and off again, a layer is as it started.
    expect(sheetAfter(setLock(1, true), setLock(1, false))).toEqual(FIRST_LAYERS);
    expect(sheetAfter(setClip(1, true), setClip(1, false))).toEqual(FIRST_LAYERS);
  });

  it("leaves the layers as they were for a clear", () => {
    const state = stackOf(3, [2]);
    expect(applyLayerStep(state, clearLayer(2))).toEqual(state);
  });

  it("leaves the state it's given as it was", () => {
    const state = frozen(stackOf(3));
    const steps = [
      addLayer(4, 1),
      deleteLayer(2),
      moveLayer(1, 2),
      setOpacity(3, 30),
      setLock(1, true),
      setClip(3, true),
      clearLayer(1),
    ];
    // A write to the frozen state throws.
    for (const step of steps) applyLayerStep(state, step);
    expect(state).toEqual(stackOf(3));
  });

  it("never gives a deleted layer's number to a new layer", () => {
    const deleted = sheetAfter(addLayer(2, 1), deleteLayer(2));
    expect(() => applyLayerStep(deleted, addLayer(2, 1))).toThrow(LayerStepError);
    const next = applyLayerStep(deleted, addLayer(deleted.nextId, 1));
    expect(idsOf(next)).toEqual([FIRST_LAYER, deleted.nextId]);
  });

  const full = stackOf(MAX_LAYERS);
  const used = sheetAfter(addLayer(2, 1), addLayer(3, 2), deleteLayer(3));
  it.each<[string, LayerState, LayerStep]>([
    ["delete a layer the sheet hasn't got", stackOf(3), deleteLayer(9)],
    ["move a layer the sheet hasn't got", stackOf(3), moveLayer(9, 0)],
    ["lock a layer the sheet hasn't got", stackOf(3), setLock(9, true)],
    ["clear a layer the sheet hasn't got", stackOf(3), clearLayer(9)],
    ["add a layer the sheet has already", stackOf(3), addLayer(2, 0)],
    ["add a layer under a number the sheet has used", used, addLayer(3, 0)],
    ["add past the front", stackOf(3), addLayer(4, 4)],
    ["add behind the back", stackOf(3), addLayer(4, -1)],
    ["add between places", stackOf(3), addLayer(4, 1.5)],
    ["add to a sheet holding the most", full, addLayer(full.nextId, 0)],
    ["move past the front", stackOf(3), moveLayer(1, 3)],
    ["move behind the back", stackOf(3), moveLayer(1, -1)],
    ["set an opacity above full", stackOf(3), setOpacity(1, FULL_OPACITY + 1)],
    ["set an opacity below none", stackOf(3), setOpacity(1, -1)],
    ["set an opacity that isn't a whole number", stackOf(3), setOpacity(1, 40.5)],
    ["delete the last layer", FIRST_LAYERS, deleteLayer(FIRST_LAYER)],
  ])("refuses to %s", (_, state, step) => {
    expect(() => applyLayerStep(state, step)).toThrow(LayerStepError);
  });

  it("says which step it refused and why", () => {
    const error = refusal(() => applyLayerStep(stackOf(3), moveLayer(9, 0)));
    expect(error.stepIndex).toBeNull();
    // It names the step: what it does and to which layer.
    expect(error.message).toMatch(/move.*\b9\b/);
  });
});

describe("baseOf", () => {
  const baseIdOf = (state: LayerState, id: LayerId) => baseOf(state, id)?.id ?? null;

  it("gives the unclipped layer below that two clipped layers share", () => {
    const state = stackOf(3, [2, 3]);
    expect(baseIdOf(state, 2)).toBe(1);
    expect(baseIdOf(state, 3)).toBe(1);
  });

  it("skips the clipped layers between a layer and its base", () => {
    expect(baseIdOf(stackOf(4, [3, 4]), 4)).toBe(2);
  });

  it("gives null for a layer that isn't clipped or isn't there", () => {
    const state = stackOf(2, [2]);
    expect(baseIdOf(state, 1)).toBeNull();
    expect(baseIdOf(state, 9)).toBeNull();
  });

  it("gives null for a clipped layer with nothing below it", () => {
    expect(baseIdOf(stackOf(2, [1]), 1)).toBeNull();
  });

  it("gives null for a clipped layer with only clipped layers below it", () => {
    expect(baseIdOf(stackOf(3, [1, 2, 3]), 3)).toBeNull();
  });
});

describe("inkedAfter", () => {
  it("holds the layers marked since they were last emptied", () => {
    expect(inkedAfter([])).toEqual(new Set());
    // Every kind of op inks its layer.
    const layers = [addLayer(2, 1), addLayer(3, 2)];
    expect(inkedAfter([...layers, brush(1), fill(2), eraser(3)])).toEqual(new Set([1, 2, 3]));
    // A clear empties one layer, not the sheet; marks after it ink the layer again.
    const marked = [brush(1), addLayer(2, 1), brush(2)];
    expect(inkedAfter([...marked, clearLayer(1)])).toEqual(new Set([2]));
    expect(inkedAfter([...marked, clearLayer(1), brush(1)])).toEqual(new Set([1, 2]));
    // A delete takes the layer's ink with it.
    expect(inkedAfter([...marked, deleteLayer(2)])).toEqual(new Set([1]));
  });

  it("is untouched by the steps that only change how a layer looks or where it stands", () => {
    const steps = [
      brush(1),
      addLayer(2, 1),
      moveLayer(1, 1),
      setOpacity(1, 40),
      setLock(1, true),
      setClip(2, true),
    ];
    expect(inkedAfter(steps)).toEqual(new Set([1]));
  });
});

describe("timelapseStart", () => {
  it("starts just past the last step that left the sheet blank", () => {
    expect(timelapseStart([brush(1), clearLayer(1), brush(1)])).toBe(2);
    expect(timelapseStart([brush(1), brush(1), clearLayer(1), brush(1), brush(1)])).toBe(3);
  });

  it("starts at the first step when the sheet never went blank, or has no steps", () => {
    expect(timelapseStart([])).toBe(0);
    expect(timelapseStart([brush(1), brush(1)])).toBe(0);
    // Layer 1 is cleared while layer 2 keeps its ink: the sheet isn't blank.
    expect(timelapseStart([brush(1), addLayer(2, 1), brush(2), clearLayer(1)])).toBe(0);
  });

  it("calls the sheet blank only once every layer is", () => {
    const steps = [brush(1), addLayer(2, 1), brush(2), clearLayer(1), clearLayer(2), brush(2)];
    expect(timelapseStart(steps)).toBe(5);
    // Deleting the one layer with ink blanks the sheet too.
    expect(timelapseStart([addLayer(2, 1), brush(2), deleteLayer(2), brush(1)])).toBe(3);
  });

  it("starts after the layers set up before the first mark, which stateAt carries", () => {
    const steps = [addLayer(2, 1), setOpacity(2, 40), brush(2)];
    expect(timelapseStart(steps)).toBe(2);
    expect(stateAt(steps, timelapseStart(steps)).layers[1].opacity).toBe(40);
  });
});

describe("stateAt", () => {
  it("starts from the first layer and applies the layer steps among the first steps", () => {
    const steps: Step[] = [brush(1), addLayer(2, 1), brush(2), setOpacity(2, 40), deleteLayer(1)];
    expect(stateAt([], 0)).toEqual(stackOf(1));
    // Marks don't change the layers.
    expect(stateAt(steps, 1)).toEqual(stackOf(1));
    expect(idsOf(stateAt(steps, 3))).toEqual([1, 2]);
    expect(stateAt(steps, 4).layers[1].opacity).toBe(40);
    expect(idsOf(stateAt(steps, 5))).toEqual([2]);
  });

  it("gives back the state before a step after the step was applied to it", () => {
    const steps: Step[] = [addLayer(2, 1), setClip(2, true), deleteLayer(1)];
    const before = stateAt(steps, 2);
    const snapshot = structuredClone(before);
    expect(idsOf(applyLayerStep(before, deleteLayer(1)))).toEqual([2]);
    expect(before).toEqual(snapshot);
    expect(stateAt(steps, 2)).toEqual(snapshot);
  });

  it.each<[string, Step[], number]>([
    ["has deleted", [addLayer(2, 1), brush(2), deleteLayer(2), brush(2)], 3],
    ["hasn't added yet", [brush(2), addLayer(2, 1)], 0],
  ])("refuses an op on a layer the sheet %s, naming the step", (_, steps, stepIndex) => {
    expect(refusal(() => stateAt(steps, steps.length)).stepIndex).toBe(stepIndex);
    // Only the steps asked for are checked.
    expect(() => stateAt(steps, stepIndex)).not.toThrow();
  });

  it("names the step of a layer step that doesn't fit", () => {
    const error = refusal(() => stateAt([brush(1), deleteLayer(FIRST_LAYER)], 2));
    expect(error.stepIndex).toBe(1);
  });

  it("refuses an index outside the steps", () => {
    expect(() => stateAt([brush(1)], 2)).toThrow(RangeError);
    expect(() => stateAt([brush(1)], -1)).toThrow(RangeError);
  });
});
