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

/** Draws each op the way the ink engine does, then commits it. */
function setup(ops: Op[], checkpointCost = 25) {
  const surface = new FakeSurface();
  const history = new History(surface, { checkpointCost });
  for (const op of ops) {
    surface.apply(op);
    history.commit(op);
  }
  surface.applied = [];
  return { surface, history };
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
    const { surface, history } = setup([stroke("a")]);
    history.undo();
    surface.apply(stroke("b"));
    history.commit(stroke("b"));
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
    const { surface, history } = setup(strokes(5), 5);
    history.undo();
    history.undo();
    for (const color of ["x0", "x1", "x2"]) {
      surface.apply(stroke(color));
      history.commit(stroke(color));
    }
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
    const { surface, history } = setup(strokes(30), 5);
    for (let i = 0; i < 7; i++) history.undo();
    // Drawing after an undo drops the undone strokes' snapshots.
    surface.apply(stroke("x"));
    history.commit(stroke("x"));
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
});
