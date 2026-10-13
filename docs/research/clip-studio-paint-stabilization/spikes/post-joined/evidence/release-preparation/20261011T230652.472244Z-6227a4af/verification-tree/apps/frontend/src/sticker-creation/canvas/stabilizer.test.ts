import { describe, expect, it } from "vitest";
import { FIRST_SMOOTHING, Stabilizer } from "./stabilizer";

const sample = (x: number, pressure: number, t: number) => ({ x, y: 0, pressure, t });

describe("Stabilizer", () => {
  it.each([
    ["fixed", 43.2],
    ["fast", 54],
    ["slow", 108],
  ] as const)("uses the %s pen mode's native first-move result", (mode, x) => {
    const stabilizer = new Stabilizer(sample(0, 1, 100), 4, true, 0n, mode);
    expect(stabilizer.add(sample(108, 0.5, 108))[0].x).toBe(x);
  });

  it.each(["slow", "fast"] as const)(
    "releases and restarts zero-pressure pen input in %s mode",
    (mode) => {
      for (const strength of [0, 1, 2, 3, 20, 30, 31, 100]) {
        for (const pressure of [0, 0.5]) {
          const stabilizer = new Stabilizer(sample(0, pressure, 100), strength, true, 0n, mode);
          const outputs = [stabilizer.initial];
          outputs.push(...stabilizer.add(sample(20, pressure, 108)));
          outputs.push(...stabilizer.add(sample(40, 0.7, 116)));
          outputs.push(...stabilizer.add(sample(45, 0.3, 124)));
          const release = stabilizer.finish(sample(50, 0, 132.5));
          outputs.push(...release);
          expect(release.length).toBeLessThan(2048);
          expect(release.at(-1)?.phase).toBe(3);
          expect(release.every((point) => point.t === 132.5)).toBe(true);
          expect(
            outputs.every((point) => [point.x, point.y, point.pressure].every(Number.isFinite)),
          ).toBe(true);
          expect(stabilizer.finish(sample(90, 0, 140))).toEqual([]);
          if (pressure === 0)
            expect(outputs.filter((point) => point.phase === 2).length).toBeGreaterThan(1);
        }
      }
    },
  );

  it.each(["slow", "fast"] as const)(
    "keeps non-pen contact and release fixed when %s is selected",
    (mode) => {
      const run = (selected: "fixed" | "slow" | "fast") => {
        const stabilizer = new Stabilizer(sample(0, 0, 100), 4, false, 0n, selected);
        return [
          stabilizer.initial,
          ...stabilizer.add(sample(108, 0, 108)),
          ...stabilizer.finish(sample(150, 0, 116)),
        ];
      };
      expect(run(mode)).toEqual(run("fixed"));
    },
  );

  it.each([0, 4, 20, 100])(
    "preserves native start, move, and terminal phase at strength %s",
    (strength) => {
      const stabilizer = new Stabilizer(sample(10, 0.2, 100), strength, true);
      const contact = stabilizer.add(sample(30, 0.8, 110));
      const terminal = stabilizer.finish(sample(40, 0, 120));
      expect(stabilizer.initial.phase).toBe(2);
      expect(contact.map((point) => point.phase)).toEqual([1]);
      expect(terminal.at(-1)?.phase).toBe(3);
      expect(terminal.slice(0, -1).every((point) => point.phase === 1)).toBe(true);
    },
  );
  it("maps the existing zero-to-one-hundred control directly and keeps its default", () => {
    expect(FIRST_SMOOTHING).toBe(35);
    const stabilizer = new Stabilizer(sample(0, 1, 0), 4, true);
    expect(stabilizer.initial).toEqual({ ...sample(0, 1, 0), phase: 2 });
    expect(stabilizer.add(sample(10, 0.5, 5))).toEqual([{ ...sample(4, 0.8, 5), phase: 1 }]);
    expect(stabilizer.add(sample(20, 0.25, 10))).toEqual([
      { ...sample(10, 0.5833333333333333, 10), phase: 1 },
    ]);
  });

  it("Raw retains contact coordinates, pressure, and submillisecond output timing", () => {
    const stabilizer = new Stabilizer(sample(1, 0.7, 0.125), 0, true);
    expect(stabilizer.add(sample(4, 0.2, 4.375))).toEqual([{ ...sample(4, 0.2, 4.375), phase: 1 }]);
  });

  it("can emit no point when timestamp gating suppresses a packet", () => {
    const stabilizer = new Stabilizer(sample(0, 1, 0), 0, true, 10n);
    expect(stabilizer.add(sample(10, 0.5, 5))).toEqual([]);
    expect(stabilizer.add(sample(20, 0.25, 10))).toEqual([{ ...sample(20, 0.25, 10), phase: 1 }]);
  });

  it("releases through repeated terminal packets with averaged pressure and one lift timestamp", () => {
    const stabilizer = new Stabilizer(sample(0, 1, 0), 4, true);
    stabilizer.add(sample(10, 0.5, 5));
    stabilizer.add(sample(20, 0.25, 10));
    const end = stabilizer.finish(sample(30, 0, 15.875));
    expect(end.length).toBeGreaterThan(1);
    expect(end[0].pressure).toBeGreaterThan(0);
    expect(end.at(-1)?.pressure).toBe(0);
    expect(end.every((point) => point.t === 15.875)).toBe(true);
    expect(stabilizer.position).toEqual(end.at(-1));
    expect(stabilizer.finish(sample(30, 0, 15.875))).toEqual([]);
    expect(stabilizer.add(sample(99, 1, 20))).toEqual([]);
  });

  it("finishes boundedly at every supported strength, including a stationary tap", () => {
    for (const smoothing of [0, 1, 2, 3, FIRST_SMOOTHING, 100]) {
      const stabilizer = new Stabilizer(sample(12, 0.6, 0), smoothing, true);
      const end = stabilizer.finish(sample(12, 0, 1));
      expect(end.length).toBeGreaterThan(0);
      expect(end.length).toBeLessThan(2048);
      expect(end.at(-1)?.pressure).toBe(0);
      expect(end.at(-1)?.x).toBe(12);
    }
  });

  it("uses a positive control scalar for contact without pressure sensing", () => {
    const stabilizer = new Stabilizer(sample(0, 0, 0), 4, false);
    const contact = stabilizer.add(sample(10, 0, 5));
    expect(contact).toEqual([{ ...sample(4, 1, 5), phase: 1 }]);
    const end = stabilizer.finish(sample(20, 0, 10));
    expect(end.at(-1)?.pressure).toBe(0);
  });
});
