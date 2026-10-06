import { describe, expect, it } from "vitest";
import { History, type Surface } from "./history";
import type { Op } from "./ops";

/** A surface whose "pixels" are the colors of the ops on it, in order. */
class FakeSurface implements Surface<string[]> {
  drawn: string[] = [];
  applied: string[] = [];
  taken: string[][] = [];
  discarded: string[][] = [];
  apply(op: Op) {
    this.drawn.push(op.color);
    this.applied.push(op.color);
  }
  restore(snapshot: string[] | null) {
    if (snapshot && this.discarded.includes(snapshot)) throw new Error("Restored a freed snapshot");
    this.drawn = snapshot ? [...snapshot] : [];
  }
  snapshot() {
    const snapshot = [...this.drawn];
    this.taken.push(snapshot);
    return snapshot;
  }
  discard(snapshot: string[]) {
    this.discarded.push(snapshot);
  }
  cost(op: Op) {
    return op.tool === "fill" ? 5 : 1;
  }
}

const stroke = (color: string): Op => ({ tool: "brush", color, pts: [], T: 0 });
const fill = (color: string): Op => ({ tool: "fill", x: 0, y: 0, color, T: 0 });

/** A history over a fake surface, with `ops` drawn on it as the ink engine draws them. */
function setup(ops: Op[], checkpointCost = 25) {
  const surface = new FakeSurface();
  const history = new History(surface, { checkpointCost });
  /** Draws an op the way the ink engine does, then commits it. */
  const draw = (op: Op) => {
    surface.apply(op);
    history.commit(op);
  };
  ops.forEach(draw);
  surface.applied = [];
  return { surface, history, draw };
}

const strokes = (n: number) => Array.from({ length: n }, (_, i) => stroke(String(i)));

describe("History", () => {
  it("undoes and redoes in order", () => {
    const { surface, history } = setup([stroke("a"), stroke("b"), stroke("c")]);
    history.undo();
    history.undo();
    expect(surface.drawn).toEqual(["a"]);
    history.redo();
    expect(surface.drawn).toEqual(["a", "b"]);
    expect(history.canRedo).toBe(true);
  });

  it("clears redo when a new op lands", () => {
    const { surface, history, draw } = setup([stroke("a")]);
    history.undo();
    draw(stroke("b"));
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBe(false);
    expect(surface.drawn).toEqual(["b"]);
  });

  it("replays an undo from the nearest checkpoint", () => {
    const { surface, history } = setup(strokes(12), 5);
    history.undo();
    // 11 ops left: restored from the checkpoint after 10, then one replayed.
    expect(surface.applied).toEqual(["10"]);
    expect(surface.drawn).toEqual(strokes(11).map((op) => op.color));
  });

  it("checkpoints right after a costly op, so undoing past it doesn't repeat it", () => {
    const { surface, history } = setup([stroke("a"), fill("b"), stroke("c"), stroke("d")], 5);
    history.undo();
    expect(surface.applied).toEqual(["c"]);
    expect(surface.drawn).toEqual(["a", "b", "c"]);
  });

  it("drops checkpoints from an abandoned branch", () => {
    const { surface, history, draw } = setup(strokes(5), 5);
    history.undo();
    history.undo();
    for (const color of ["x0", "x1", "x2"]) draw(stroke(color));
    history.undo();
    expect(surface.drawn).toEqual(["0", "1", "2", "x0", "x1"]);
  });

  it("resets to an empty surface with nothing to undo or redo", () => {
    const { surface, history } = setup([stroke("a"), stroke("b")]);
    history.undo();
    history.reset();
    expect(surface.drawn).toEqual([]);
    expect(history.canUndo || history.canRedo).toBe(false);
  });

  it("loads kept ops in place of the sheet, with nothing to redo, and undoes through them", () => {
    const { surface, history } = setup([stroke("x"), stroke("y")], 5);
    history.undo();
    history.load([stroke("a"), fill("b"), stroke("c")]);
    expect(surface.drawn).toEqual(["a", "b", "c"]);
    expect(history.canRedo).toBe(false);
    history.undo();
    expect(surface.drawn).toEqual(["a", "b"]);
  });

  it("frees each snapshot once as it drops it, and never one it still restores from", () => {
    // A snapshot every five strokes, the oldest dropped past four.
    const { surface, history, draw } = setup(strokes(30), 5);
    for (let i = 0; i < 7; i++) history.undo();
    // Drawing after an undo drops the undone strokes' snapshots.
    draw(stroke("x"));
    history.invalidate();
    history.load(strokes(6));
    history.reset();
    expect(surface.discarded).toHaveLength(surface.taken.length);
    expect(new Set(surface.discarded)).toEqual(new Set(surface.taken));
  });

  it("repaints every op after a resize", () => {
    const { surface, history } = setup(strokes(7), 5);
    surface.restore(null);
    history.invalidate();
    expect(surface.drawn).toEqual(strokes(7).map((op) => op.color));
  });

  it("sets the drawing aside on a clear, brings it back on undo and clears again on redo", () => {
    const { surface, history } = setup([stroke("a"), stroke("b")]);
    history.clear();
    expect(surface.drawn).toEqual([]);
    expect(history.committed).toEqual([]);
    expect(history.hasInk).toBe(false);
    history.undo();
    expect(surface.drawn).toEqual(["a", "b"]);
    expect(history.hasInk).toBe(true);
    history.redo();
    expect(surface.drawn).toEqual([]);
    expect(history.canUndo).toBe(true);
  });

  it("undoes what was drawn after a clear first, never replaying the drawing it set aside", () => {
    const { surface, history, draw } = setup(strokes(6), 5);
    history.clear();
    draw(stroke("x"));
    draw(stroke("y"));
    surface.applied = [];
    history.undo();
    // Rebuilt from the clear, not from the snapshot before it.
    expect(surface.applied).toEqual(["x"]);
    history.undo();
    expect(surface.drawn).toEqual([]);
    expect(history.hasInk).toBe(false);
    history.undo();
    expect(surface.drawn).toEqual(strokes(6).map((op) => op.color));
  });

  it("drops the snapshots of an abandoned branch when it clears", () => {
    const { surface, history, draw } = setup(strokes(10), 5);
    for (let i = 0; i < 3; i++) history.undo();
    history.clear();
    for (const color of ["x0", "x1", "x2"]) draw(stroke(color));
    history.undo();
    expect(surface.drawn).toEqual(["x0", "x1"]);
  });

  it("loads kept steps with their clears, so undo still brings a cleared drawing back", () => {
    const { surface, history } = setup([]);
    history.load([stroke("a"), { tool: "clear" }, stroke("b")]);
    expect(surface.drawn).toEqual(["b"]);
    expect(history.steps).toHaveLength(3);
    history.undo();
    history.undo();
    expect(surface.drawn).toEqual(["a"]);
  });
});
