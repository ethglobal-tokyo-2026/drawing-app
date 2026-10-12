import { describe, expect, it, vi } from "vitest";
import { seededRandom } from "../../ui/seededRandom";
import { isOp, type LayerId, type LayerStep, type Op, type Step } from "../canvas/ops";
import { CHECKPOINT_COST, planCheckpoints } from "./checkpoints";
import { LayerHistory } from "./layerHistory";
import {
  applyLayerStep,
  FIRST_LAYER,
  FIRST_LAYERS,
  FULL_OPACITY,
  inkedAfter,
  LayerStepError,
  MAX_LAYERS,
  stateAt,
  type LayerState,
} from "./layerState";
import { fillRegion, inkTag, TestLayerSurface } from "./testLayerSurface";
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

/** Each layer's tags after `steps`, replayed in order on every layer from a blank sheet. */
function replayFromBlank(steps: readonly Step[]): Map<LayerId, readonly string[]> {
  const pixels = new Map<LayerId, readonly string[]>();
  const pixelsOf = (layer: LayerId) => pixels.get(layer) ?? [];
  let state = FIRST_LAYERS;
  for (const step of steps) {
    if (isOp(step)) {
      const painted = step.tool === "fill" ? fillRegion(step, state, pixelsOf) : step.color;
      pixels.set(step.layer, [...pixelsOf(step.layer), inkTag(step, painted, state)]);
      continue;
    }
    if (step.tool === "clear" || step.tool === "delete") pixels.delete(step.layer);
    if (step.tool === "merge") {
      pixels.set(step.into, [...pixelsOf(step.into), ...pixelsOf(step.layer)]);
      pixels.delete(step.layer);
    }
    state = applyLayerStep(state, step);
  }
  return pixels;
}

const pick = <T>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];

/**
 * Makes random steps that fit the sheet they're given, mostly on one layer at a time, as people
 * draw, with an added layer drawn on next. Each op's color is a tag no other op has.
 */
function stepMaker(
  rand: () => number,
  nextTag: () => string,
  { opChance, switchChance }: { opChance: number; switchChance: number },
): (state: LayerState) => Step {
  let current = FIRST_LAYER;
  return (state) => {
    const { layers } = state;
    let layer = layers.find(({ id }) => id === current);
    if (!layer || rand() < switchChance) layer = pick(rand, layers);
    current = layer.id;
    if (rand() < opChance) {
      const roll = rand();
      const op = roll < 0.75 ? brush(layer.id) : roll < 0.87 ? eraser(layer.id) : fill(layer.id);
      return { ...op, color: nextTag() };
    }
    const roll = rand();
    if (roll < 0.2 && layers.length < MAX_LAYERS) {
      current = state.nextId;
      return addLayer(state.nextId, Math.floor(rand() * (layers.length + 1)));
    }
    if (roll < 0.3 && layers.length > 1) return deleteLayer(layer.id);
    if (roll < 0.4) return moveLayer(layer.id, Math.floor(rand() * layers.length));
    if (roll < 0.55) return setOpacity(layer.id, pick(rand, [0, 50, FULL_OPACITY]));
    if (roll < 0.75) return setLock(layer.id, !layer.locked);
    if (roll < 0.88) return setClip(layer.id, !layer.clipped);
    return clearLayer(layer.id);
  };
}

/** A history over a fake surface, and the ways a person and the engine drive it. */
function setup(budget: (inkedLayers: number) => number) {
  const surface = new TestLayerSurface(budget);
  const history = new LayerHistory(surface);
  let made = 0;
  const nextTag = () => `op${made++}`;
  /** Paints an op the way the engine does, then commits it. */
  const draw = (op: Op) => {
    surface.apply(op, history.state);
    history.commit(op);
  };
  const stroke = (layer: LayerId) => draw({ ...brush(layer), color: nextTag() });
  return { surface, history, draw, stroke, nextTag };
}

type Run = ReturnType<typeof setup>;

describe("durable Merge down", () => {
  it("reconstructs repeated merges and later fills after checkpoint eviction, then branches", () => {
    const run = setup(() => 0);
    const { history, surface } = run;
    dealt(run, 3, 80);
    history.perform(moveLayer(3, 1));
    history.perform({ tool: "merge", layer: 2, into: 3, T: 0 });
    history.perform({ tool: "merge", layer: 3, into: 1, T: 0 });
    run.draw(fill(1));
    run.stroke(1);
    history.dropCheckpoints();
    const saved = [...history.steps];
    for (let i = 0; i < 4; i++) {
      history.undo();
      expectConsistent(run);
    }
    for (let i = 0; i < 4; i++) {
      history.redo();
      expectConsistent(run);
    }
    history.perform(clearLayer(1));
    history.undo();
    expectConsistent(run);
    history.perform(addLayer(4, 1));
    history.perform(deleteLayer(1));
    history.dropCheckpoints();
    history.undo();
    expectConsistent(run);
    surface.wipe();
    history.invalidate();
    expectConsistent(run);
    history.load(saved);
    expectConsistent(run);
    history.undo();
    run.stroke(1);
    expect(history.canRedo).toBe(false);
    expectConsistent(run);
  });

  it("moves source-only ink into the destination and frees a slot", () => {
    const run = setup(() => 0);
    dealt(run, 10, 0);
    run.stroke(10);
    run.history.perform({ tool: "merge", layer: 10, into: 9, T: 0 });
    expect(run.history.state.layers).toHaveLength(9);
    expect(run.history.state.nextId).toBe(11);
    expect([...run.history.inked]).toEqual([9]);
    run.history.undo();
    expectConsistent(run);
    expect(run.history.state.layers).toHaveLength(10);
  });
});

/** A sheet of `layers` layers with `strokes` strokes dealt across them in turn. */
function dealt(run: Run, layers: number, strokes: number): void {
  for (let id = 2; id <= layers; id++) run.history.perform(addLayer(id, id - 1));
  for (let i = 0; i < strokes; i++) run.stroke(1 + (i % layers));
}

/** Every shown layer holds what replaying the steps from blank gives. */
function expectReplayed({ surface, history }: Run): void {
  const expected = replayFromBlank(history.steps);
  for (const { id } of history.state.layers)
    expect(surface.pixelsOf(id), `layer ${id}`).toEqual(expected.get(id) ?? []);
}

/** Pixels, layers and copies all agree with the steps. */
function expectConsistent(run: Run): void {
  const { surface, history } = run;
  expectReplayed(run);
  expect(history.state).toEqual(stateAt(history.steps, history.steps.length));
  expect(surface.shown).toEqual(history.state);
  expect(history.inked).toEqual(inkedAfter(history.steps));
  expect(surface.copiesHeld).toBeLessThanOrEqual(surface.copyBudgetFor(history.inked.size));
}

/**
 * Plays `count` seeded actions, calling `check` after each: steps drawn or made, runs of undos and
 * redos, a resize, the sheet going and a reload.
 */
function play(run: Run, seed: number, count: number, check: (run: Run) => void): void {
  const rand = seededRandom(seed);
  const { surface, history } = run;
  const nextStep = stepMaker(rand, run.nextTag, { opChance: 0.75, switchChance: 0.15 });
  let action: () => unknown = () => undefined;
  let repeats = 0;
  for (let i = 0; i < count; i++) {
    if (repeats === 0) {
      const roll = rand();
      repeats = 1;
      if (roll < 0.55) {
        action = () => {
          const step = nextStep(history.state);
          if (isOp(step)) run.draw(step);
          else history.perform(step);
        };
        repeats = 1 + Math.floor(rand() * 10);
      } else if (roll < 0.73) {
        action = () => history.undo();
        // Mostly a few, sometimes deep enough to cross checkpoints.
        repeats = rand() < 0.8 ? 1 + Math.floor(rand() * 3) : 15 + Math.floor(rand() * 25);
      } else if (roll < 0.87) {
        action = () => history.redo();
        repeats = 1 + Math.floor(rand() * 8);
      } else if (roll < 0.94)
        action = () => {
          surface.wipe();
          history.invalidate();
        };
      else if (roll < 0.97) action = () => history.dropCheckpoints();
      else action = () => history.load(structuredClone(history.steps));
    }
    action();
    repeats--;
    check(run);
  }
}

/** A budget that shrinks as layers fill, as the device's does. */
const shrinking = (room: number) => (inkedLayers: number) => Math.max(1, room - inkedLayers);

describe("LayerHistory", () => {
  it("merges consecutive opacity changes on one layer into one undo", () => {
    const { history } = setup(shrinking(5));
    history.performOpacity(setOpacity(FIRST_LAYER, 80));
    history.performOpacity(setOpacity(FIRST_LAYER, 50));
    expect(history.steps).toEqual([setOpacity(FIRST_LAYER, 50)]);
    history.undo();
    expect(history.state.layers[0].opacity).toBe(FULL_OPACITY);
  });

  it("starts a new opacity undo step after an undo leaves a redo available", () => {
    const { history } = setup(shrinking(5));
    history.perform(addLayer(2, 1));
    history.performOpacity(setOpacity(FIRST_LAYER, 80));
    history.performOpacity(setOpacity(2, 80));
    history.undo();
    history.performOpacity(setOpacity(FIRST_LAYER, 50));
    expect(history.steps.map((step) => step.tool)).toEqual(["add", "opacity", "opacity"]);
    history.undo();
    expect(history.state.layers[0].opacity).toBe(80);
  });

  it.each([
    [1, shrinking(5)],
    [2, shrinking(5)],
    [3, shrinking(5)],
    [4, shrinking(12)],
    [5, shrinking(12)],
  ])("seed %i: matches a replay from blank after every action", (seed, budget) => {
    const run = setup(budget);
    play(run, seed, 400, expectConsistent);
    // The log reached far enough for fills on several layers, and undos rebuilt from checkpoints.
    expect(run.history.steps.some((step) => step.tool === "fill")).toBe(true);
    expect(run.history.state.layers.length).toBeGreaterThan(1);
    expect(run.surface.restored.some(({ from }) => from !== null)).toBe(true);
  });

  it.each<[string, LayerStep]>([
    ["add", addLayer(3, 2)],
    ["move", moveLayer(1, 1)],
    ["opacity", setOpacity(2, 50)],
    ["lock", setLock(2, true)],
    ["clip", setClip(2, true)],
  ])("undoing %s repaints nothing", (_, step) => {
    const run = setup(shrinking(5));
    dealt(run, 2, 30);
    run.history.perform(step);
    run.surface.resetCounts();
    run.history.undo();
    expect(run.surface.applied).toEqual([]);
    expect(run.surface.restored).toEqual([]);
    expectConsistent(run);
  });

  it("undoing a stroke replays only its own layer", () => {
    const run = setup(shrinking(8));
    dealt(run, 3, 40);
    run.stroke(2);
    run.surface.resetCounts();
    run.history.undo();
    expect(run.surface.restored.map(({ layer }) => layer)).toEqual([2]);
    expect(run.surface.applied.length).toBeGreaterThan(0);
    expect(run.surface.applied.every((step) => step.layer === 2)).toBe(true);
    expectConsistent(run);
  });

  it("keeps the checkpoint just taken after a deep undo, and undoes onto it", () => {
    let budget = 12;
    const run = setup(() => budget);
    dealt(run, 3, 90);
    for (let i = 0; i < 30; i++) run.history.undo();
    const before = run.surface.taken.length;
    // The budget shrinks, as when layers fill, so the commit's trim has checkpoints to drop.
    budget = 1;
    // A fill costs a checkpoint's worth, so it takes one.
    run.draw({ ...fill(1), color: run.nextTag() });
    const justTaken = run.surface.taken.slice(before);
    expect(justTaken.length).toBeGreaterThan(0);
    const trimmed = run.surface.taken.filter(
      ({ releasedAt }) => releasedAt !== null && releasedAt > justTaken[0].takenAt,
    );
    expect(trimmed.length).toBeGreaterThan(0);
    expect(justTaken.every(({ releasedAt }) => releasedAt === null)).toBe(true);
    run.stroke(1);
    run.surface.resetCounts();
    run.history.undo();
    expect(run.surface.restored.map(({ from }) => from)).toEqual([
      justTaken.find(({ layer }) => layer === 1),
    ]);
    expect(run.surface.applied).toEqual([]);
    expectConsistent(run);
  });

  it("keeps no hold past a trim at a budget of 0, and undoes from blank", () => {
    const run = setup(() => 0);
    play(run, 6, 200, (played) => {
      expectConsistent(played);
      expect(played.surface.holdsKept).toBe(0);
    });
    expect(run.surface.restored.length).toBeGreaterThan(0);
    expect(run.surface.restored.every(({ from }) => from === null)).toBe(true);
  });

  /** Loads `steps` and checks the load took only the planned checkpoints and released none. */
  function expectPlannedLoad(run: Run, steps: readonly Step[]): void {
    const planned = planCheckpoints(
      steps,
      (step) => run.surface.cost(step),
      (inkedLayers) => run.surface.copyBudgetFor(inkedLayers),
    );
    run.history.load(steps);
    const taken = run.surface.taken;
    expect(planned.length).toBeGreaterThan(0);
    expect(new Set(taken.map(({ afterApplies }) => afterApplies))).toEqual(new Set(planned));
    expect(taken.every(({ releasedAt }) => releasedAt === null)).toBe(true);
    // Every copy the load made is still held: it copied nothing only to drop it.
    expect(run.surface.copies).toBeLessThanOrEqual(run.surface.copiesHeld);
    expectConsistent(run);
  }

  it("loads a long log taking only the planned checkpoints, and releasing none", () => {
    const run = setup(shrinking(12));
    const nextStep = stepMaker(seededRandom(7), run.nextTag, {
      opChance: 0.95,
      switchChance: 0.02,
    });
    const steps: Step[] = [];
    let state = FIRST_LAYERS;
    for (let i = 0; i < 1500; i++) {
      const step = nextStep(state);
      steps.push(step);
      if (!isOp(step)) state = applyLayerStep(state, step);
    }
    expectPlannedLoad(run, steps);
  });

  it("plans for a held layer that's deleted, whose copy its holds then own", () => {
    const run = setup(() => 1);
    const strokes = (layer: LayerId) =>
      Array.from({ length: CHECKPOINT_COST }, () => ({ ...brush(layer), color: run.nextTag() }));
    expectPlannedLoad(run, [
      addLayer(2, 1),
      ...strokes(2),
      ...strokes(1),
      deleteLayer(2),
      ...strokes(1),
    ]);
  });

  it("replays a resized sheet with the checkpoints a load takes, so an undo restores from one, and redo still works", () => {
    const run = setup(shrinking(12));
    dealt(run, 1, CHECKPOINT_COST * 2 + 2);
    run.history.undo();
    run.surface.wipe();
    run.history.invalidate();
    expectConsistent(run);
    run.surface.resetCounts();
    run.history.undo();
    expect(run.surface.restored.map(({ from }) => from !== null)).toEqual([true]);
    expect(run.history.redo()).not.toBeNull();
    expect(run.history.redo()).not.toBeNull();
    expectConsistent(run);
  });

  it("takes a checkpoint once the steps since the last cost enough to replay", () => {
    const run = setup(shrinking(12));
    for (let i = 1; i < CHECKPOINT_COST; i++) run.stroke(1);
    expect(run.surface.taken).toEqual([]);
    run.stroke(1);
    expect(run.surface.taken.map(({ layer }) => layer)).toEqual([1]);
  });

  it("starts the timelapse where no layer last had ink, with the layers then", () => {
    const run = setup(shrinking(5));
    dealt(run, 2, 4);
    run.history.perform(clearLayer(1));
    run.history.perform(clearLayer(2));
    run.history.perform(setOpacity(2, 50));
    run.stroke(2);
    const { steps, start } = run.history.timelapse();
    expect(steps).toEqual(run.history.steps.slice(-1));
    expect(start).toEqual(stateAt(run.history.steps, run.history.steps.length - 1));
  });

  it("refuses steps that don't fit, leaving the sheet as it was", () => {
    const run = setup(shrinking(5));
    run.stroke(1);
    expect(() => run.history.commit({ ...brush(2), color: run.nextTag() })).toThrow(LayerStepError);
    expect(() => run.history.load([deleteLayer(1)])).toThrow(LayerStepError);
    expect(run.history.steps).toHaveLength(1);
    expectConsistent(run);
  });
});

describe("durable drag Fill", () => {
  const group = (): Op[] => [
    fill(1),
    { ...fill(1), x: 1, undoWithPrevious: true },
    { ...fill(1), x: 2, undoWithPrevious: true },
  ];

  it.each([1, 2])(
    "reserves %s canvas allocations from the current allowance before retrying a grouped Redo",
    (reserved) => {
      let budget = 6;
      const run = setup(() => budget);
      for (let i = 0; i <= budget; i++) run.draw(fill(1));
      const fills = group();
      fills.forEach(run.draw);
      run.history.undo();
      expect(run.surface.copiesHeld).toBe(budget);
      const steps = [...run.history.steps];
      const state = run.history.state;
      const pixels = run.surface.pixelsOf(1);
      const heldBefore = run.surface.holdsKept;
      run.surface.resetCounts();
      budget = 4;

      run.history.reserveCanvases(reserved);

      expect(run.surface.copiesHeld).toBe(budget - reserved);
      expect(run.surface.holdsKept).toBeLessThan(heldBefore);
      expect(run.surface.holdsKept).toBeGreaterThan(0);
      expect(run.surface.applied).toEqual([]);
      expect(run.surface.restored).toEqual([]);
      expect(run.history.steps).toEqual(steps);
      expect(run.history.state).toBe(state);
      expect(run.history.canUndo).toBe(true);
      expect(run.history.canRedo).toBe(true);
      expect(run.surface.pixelsOf(1)).toBe(pixels);
      expectConsistent(run);

      const holdsAfter = run.surface.taken.map((hold) => hold.releasedAt);
      const apply = run.surface.apply.bind(run.surface);
      const failure = vi.spyOn(run.surface, "apply").mockImplementation((step, before) => {
        if (step === fills[1]) throw new Error("Second fill canvas refused");
        apply(step, before);
      });
      expect(() => run.history.redo()).toThrow("Second fill canvas refused");
      expect(run.history.steps).toEqual(steps);
      expect(run.history.canRedo).toBe(true);
      expect(run.surface.pixelsOf(1)).toBe(pixels);
      expect(run.surface.taken.map((hold) => hold.releasedAt)).toEqual(holdsAfter);
      expectConsistent(run);
      failure.mockRestore();
      expect(run.history.redo()).toBe(fills[2]);
      expect(run.history.steps).toEqual([...steps, ...fills]);
      expectConsistent(run);
      expect(run.history.undo()).toBe(fills[2]);
      expect(run.history.steps).toEqual(steps);
      expect(run.surface.pixelsOf(1)).toEqual(pixels);
      expectConsistent(run);
    },
  );

  it("releases shared holds when reserved canvases leave no copy allowance", () => {
    const run = setup(() => 1);
    run.draw(fill(1));
    run.draw(fill(1));
    const shared = run.surface.taken.filter(
      (hold) => hold.releasedAt === null && hold.pixels === run.surface.pixelsOf(1),
    );
    expect(shared.length).toBeGreaterThan(0);
    expect(run.surface.copiesHeld).toBe(1);
    const steps = [...run.history.steps];
    const pixels = run.surface.pixelsOf(1);

    run.history.reserveCanvases(2);

    expect(run.surface.copiesHeld).toBe(0);
    expect(run.surface.holdsKept).toBe(0);
    expect(shared.every((hold) => hold.releasedAt !== null)).toBe(true);
    expect(run.history.steps).toEqual(steps);
    expect(run.surface.pixelsOf(1)).toBe(pixels);
    run.surface.resetCounts();
    run.stroke(1);
    expect(run.surface.copies).toBe(0);
    expectConsistent(run);
    run.history.undo();
    expect(run.history.steps).toEqual(steps);
    expect(run.surface.pixelsOf(1)).toEqual(pixels);
    expectConsistent(run);
  });

  it.each([0, 1, 12])("undoes and redoes every fill together with copy budget %s", (budget) => {
    const run = setup(() => budget);
    run.stroke(1);
    const beforeCount = run.history.steps.length;
    const fills = group();
    fills.forEach(run.draw);
    expect(run.history.steps).toHaveLength(beforeCount + 3);
    expect(run.history.undo()).toBe(fills[2]);
    expect(run.history.steps).toHaveLength(beforeCount);
    expectConsistent(run);
    expect(run.history.redo()).toBe(fills[2]);
    expect(run.history.steps).toHaveLength(beforeCount + 3);
    expectConsistent(run);
  });

  it("keeps two drags separate and branches after a grouped Undo", () => {
    const run = setup(() => 12);
    group().forEach(run.draw);
    group().forEach(run.draw);
    run.history.undo();
    expect(run.history.steps).toHaveLength(3);
    run.history.undo();
    expect(run.history.steps).toHaveLength(0);
    run.history.redo();
    run.stroke(1);
    expect(run.history.canRedo).toBe(false);
    expectConsistent(run);
  });

  it("starts a separate action when a matching fill has no continuation flag", () => {
    const run = setup(() => 12);
    const previous = fill();
    const first = fill();
    run.draw(previous);
    run.draw(first);
    expect(run.history.undo()).toBe(first);
    expect(run.history.steps).toEqual([previous]);
    expectConsistent(run);
    run.history.undo();
    expect(run.history.canUndo).toBe(false);
    expectConsistent(run);
  });

  it("preserves groups through load and invalidation with checkpoint eviction", () => {
    const run = setup(() => 1);
    run.stroke(1);
    group().forEach(run.draw);
    const saved = structuredClone(run.history.steps);
    run.history.load(saved);
    run.history.undo();
    expect(run.history.steps).toHaveLength(1);
    run.surface.wipe();
    run.history.invalidate();
    run.history.redo();
    expect(run.history.steps).toEqual(saved);
    expectConsistent(run);
    run.history.dropCheckpoints();
    run.history.undo();
    expect(run.history.steps).toHaveLength(1);
    expectConsistent(run);
  });

  it.each([brush(1), setOpacity(1, 50)])(
    "refuses joining across $tool before changing history",
    (between) => {
      const run = setup(() => 12);
      run.draw(fill(1));
      if (isOp(between)) run.draw(between);
      else run.history.perform(between);
      const before = [...run.history.steps];
      expect(() => run.history.commit({ ...fill(1), undoWithPrevious: true })).toThrow(
        LayerStepError,
      );
      expect(run.history.steps).toEqual(before);
      expectConsistent(run);
    },
  );

  it("refuses an invalid loaded group before replacing the current sheet", () => {
    const run = setup(() => 12);
    run.stroke(1);
    const before = [...run.history.steps];
    expect(() => run.history.load([{ ...fill(1), undoWithPrevious: true }])).toThrow(
      LayerStepError,
    );
    expect(run.history.steps).toEqual(before);
    expectConsistent(run);
  });

  it("keeps history, pixels and holds after the second grouped Redo fill fails", () => {
    const run = setup(() => 12);
    // A checkpoint at the current head and checkpoints inside the action must survive refusal.
    for (let i = 0; i < CHECKPOINT_COST; i++) run.stroke(1);
    const fills = group();
    fills.forEach(run.draw);
    run.history.undo();
    const beforeRedoSteps = [...run.history.steps];
    const beforeRedoPixels = run.surface.pixelsOf(1);
    const beforeHolds = run.surface.taken.map((hold) => hold.releasedAt);
    const beforeCopiesHeld = run.surface.copiesHeld;
    const apply = run.surface.apply.bind(run.surface);
    const failure = vi.spyOn(run.surface, "apply").mockImplementation((step, state) => {
      if (step === fills[1]) throw new Error("Second fill canvas refused");
      apply(step, state);
    });
    expect(() => run.history.redo()).toThrow("Second fill canvas refused");
    expect(run.history.steps).toEqual(beforeRedoSteps);
    expect(run.history.canRedo).toBe(true);
    expect(run.surface.pixelsOf(1)).toEqual(beforeRedoPixels);
    expect(run.surface.taken.map((hold) => hold.releasedAt)).toEqual(beforeHolds);
    expect(run.surface.copiesHeld).toBe(beforeCopiesHeld);
    expectConsistent(run);
    failure.mockRestore();
    run.history.redo();
    expect(run.history.steps).toHaveLength(beforeRedoSteps.length + 3);
    expectConsistent(run);
  });
});
