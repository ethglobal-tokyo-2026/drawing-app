import { describe, expect, it } from "vitest";
import { History, type Surface } from "./history";
import type { Entry, Stroke } from "./types";

/** Surface whose "pixels" are the list of stroke colors drawn. */
class FakeSurface implements Surface<string[]> {
  drawn: string[] = [];
  applies = 0;
  apply(e: Entry) {
    this.applies++;
    if (e.kind === "clear") this.drawn = [];
    else if (e.kind === "stroke") this.drawn.push(e.stroke.color);
  }
  restore(s: string[] | null) {
    this.drawn = s ? [...s] : [];
  }
  snapshot() {
    return [...this.drawn];
  }
}

const stroke = (color: string): Entry => ({
  kind: "stroke",
  stroke: { tool: "brush", color, size: 4, usePressure: false, points: [] } satisfies Stroke,
});

describe("History", () => {
  it("undoes and redoes in order", () => {
    const s = new FakeSurface();
    const h = new History(s);
    h.push(stroke("a"));
    h.push(stroke("b"));
    h.push(stroke("c"));
    h.undo();
    h.undo();
    expect(s.drawn).toEqual(["a"]);
    h.redo();
    expect(s.drawn).toEqual(["a", "b"]);
    expect(h.canRedo).toBe(true);
  });

  it("clears the redo stack on a new entry", () => {
    const s = new FakeSurface();
    const h = new History(s);
    h.push(stroke("a"));
    h.undo();
    h.push(stroke("b"));
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBe(false);
    expect(s.drawn).toEqual(["b"]);
  });

  it("treats clear as an undoable entry", () => {
    const s = new FakeSurface();
    const h = new History(s);
    h.push(stroke("a"));
    h.push({ kind: "clear" });
    h.push(stroke("b"));
    expect(s.drawn).toEqual(["b"]);
    h.undo();
    h.undo();
    expect(s.drawn).toEqual(["a"]);
  });

  it("replays from the nearest checkpoint", () => {
    const s = new FakeSurface();
    const h = new History(s, { interval: 5 });
    for (let i = 0; i < 12; i++) h.push(stroke(String(i)));
    s.applies = 0;
    h.undo(); // 11 entries left → checkpoint at 10, replay 1
    expect(s.applies).toBe(1);
    expect(s.drawn).toEqual(Array.from({ length: 11 }, (_, i) => String(i)));
  });

  it("discards checkpoints from an abandoned branch", () => {
    const s = new FakeSurface();
    const h = new History(s, { interval: 5 });
    for (let i = 0; i < 5; i++) h.push(stroke(String(i)));
    h.undo();
    h.undo();
    for (let i = 0; i < 3; i++) h.push(stroke(`x${i}`));
    h.undo();
    expect(s.drawn).toEqual(["0", "1", "2", "x0", "x1"]);
  });

  it("resets to an empty surface", () => {
    const s = new FakeSurface();
    const h = new History(s);
    h.push(stroke("a"));
    h.undo();
    h.reset();
    expect(s.drawn).toEqual([]);
    expect(h.canUndo || h.canRedo).toBe(false);
  });
});
