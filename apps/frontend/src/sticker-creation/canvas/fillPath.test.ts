import { describe, expect, it } from "vitest";
import { FillPath, FillVisits, type FillSample } from "./fillPath";

function drain(path: FillPath): FillSample[] {
  const samples: FillSample[] = [];
  for (let next = path.next(); next; next = path.next()) samples.push(next);
  return samples;
}

describe("FillPath", () => {
  it("includes the first rounded sample and can resume after its queue drains", () => {
    const path = new FillPath(5, 3);
    path.append({ x: 0.1, y: 1.2, T: 10 });
    expect(drain(path)).toEqual([{ x: 0, y: 1, T: 10 }]);
    path.append({ x: 2, y: 1.2, T: 29 });
    expect(drain(path)).toEqual([
      { x: 1, y: 1, T: 14 },
      { x: 2, y: 1, T: 24 },
    ]);
  });

  it.each([
    [
      { x: 0, y: 0, T: 0 },
      { x: 2, y: 0, T: 20 },
      [
        { x: 0, y: 0, T: 0 },
        { x: 1, y: 0, T: 5 },
        { x: 2, y: 0, T: 15 },
      ],
    ],
    [
      { x: 0, y: 0, T: 0 },
      { x: 1, y: 1, T: 20 },
      [
        { x: 0, y: 0, T: 0 },
        { x: 1, y: 0, T: 10 },
        { x: 0, y: 1, T: 10 },
        { x: 1, y: 1, T: 10 },
      ],
    ],
    [
      { x: 1, y: 1, T: 0 },
      { x: 0, y: 0, T: 20 },
      [
        { x: 1, y: 1, T: 0 },
        { x: 0, y: 1, T: 10 },
        { x: 1, y: 0, T: 10 },
        { x: 0, y: 0, T: 10 },
      ],
    ],
  ])("covers each intersected cell from %j to %j", (start, end, expected) => {
    const path = new FillPath(3, 3);
    path.append(start);
    path.append(end);
    expect(drain(path)).toEqual(expected);
  });

  it("clips off-sheet exits and reentries without bridging unrelated outside segments", () => {
    const path = new FillPath(3, 3);
    path.append({ x: 1, y: 0, T: 0 });
    path.append({ x: 4, y: 0, T: 30 });
    path.append({ x: 4, y: 2, T: 50 });
    path.append({ x: 1, y: 2, T: 80 });
    expect(drain(path)).toEqual([
      { x: 1, y: 0, T: 0 },
      { x: 2, y: 0, T: 5 },
      { x: 2, y: 2, T: 65 },
      { x: 1, y: 2, T: 75 },
    ]);
  });

  it("includes a cell touched only by the final endpoint", () => {
    const path = new FillPath(3, 1);
    path.append({ x: 0, y: 0, T: 0 });
    path.append({ x: 0.5, y: 0, T: 10 });
    expect(drain(path)).toEqual([
      { x: 0, y: 0, T: 0 },
      { x: 1, y: 0, T: 10 },
    ]);
  });

  it("includes cells touched only by the initial corner endpoint", () => {
    const path = new FillPath(2, 2);
    path.append({ x: 0.5, y: 0.5, T: 0 });
    path.append({ x: 1, y: 1, T: 10 });
    expect(drain(path)).toEqual([
      { x: 1, y: 1, T: 0 },
      { x: 0, y: 1, T: 0 },
      { x: 1, y: 0, T: 0 },
      { x: 0, y: 0, T: 0 },
    ]);
  });

  it("covers a shallow diagonal without missing its short row crossings", () => {
    const path = new FillPath(4, 2);
    path.append({ x: 0, y: 0, T: 0 });
    path.append({ x: 3, y: 1, T: 30 });
    expect(drain(path)).toEqual([
      { x: 0, y: 0, T: 0 },
      { x: 1, y: 0, T: 5 },
      { x: 2, y: 0, T: 15 },
      { x: 1, y: 1, T: 15 },
      { x: 2, y: 1, T: 15 },
      { x: 3, y: 1, T: 25 },
    ]);
  });

  it("covers both sides of a segment running on a pixel boundary", () => {
    const path = new FillPath(2, 3);
    path.append({ x: 0.5, y: 0, T: 0 });
    path.append({ x: 0.5, y: 2, T: 20 });
    expect(drain(path)).toEqual([
      { x: 1, y: 0, T: 0 },
      { x: 0, y: 0, T: 0 },
      { x: 1, y: 1, T: 5 },
      { x: 0, y: 1, T: 5 },
      { x: 1, y: 2, T: 15 },
      { x: 0, y: 2, T: 15 },
    ]);
  });

  it("clips to the physical sheet and skips rounded indices beyond its edge", () => {
    const outside = new FillPath(3, 3);
    outside.append({ x: -0.1, y: 0, T: 0 });
    outside.append({ x: -0.1, y: 2, T: 20 });
    expect(drain(outside)).toEqual([]);
    outside.append({ x: 1, y: 2, T: 31 });
    expect(drain(outside)).toEqual([
      { x: 0, y: 2, T: 21 },
      { x: 1, y: 2, T: 26 },
    ]);
    const roundedOutside = new FillPath(3, 1);
    roundedOutside.append({ x: 2.8, y: 0, T: 0 });
    expect(drain(roundedOutside)).toEqual([]);
  });

  it("omits adjacent duplicates across samples and consumes long segments lazily", () => {
    const path = new FillPath(1_000_000, 1);
    path.append({ x: 0, y: 0, T: 0 });
    path.append({ x: 0.1, y: 0, T: 1 });
    path.append({ x: 999_999, y: 0, T: 999_999 });
    expect(path.next()).toEqual({ x: 0, y: 0, T: 0 });
    expect(path.next()?.x).toBe(1);
    expect(path.next()?.x).toBe(2);
  });
});

describe("FillVisits", () => {
  it("marks only the global row ranges supplied by interior spans", () => {
    const visits = new FillVisits(5, 3);
    visits.mark(new Uint32Array([0, 1, 3, 2, 0, 5]));
    expect([0, 1, 2, 3, 4].map((x) => visits.has(x, 0))).toEqual([false, true, true, false, false]);
    expect(visits.has(2, 1)).toBe(false);
    expect([0, 1, 2, 3, 4].map((x) => visits.has(x, 2))).toEqual([true, true, true, true, true]);
    expect(visits.has(-1, 0)).toBe(false);
    expect(visits.has(5, 0)).toBe(false);
  });
});
