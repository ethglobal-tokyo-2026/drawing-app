import { describe, expect, it } from "vitest";
import {
  PULL,
  atRest,
  autoTear,
  keyTear,
  snapped,
  springStep,
  tearTarget,
  ticksBetween,
} from "./pullTab";

/** Runs the spring at 60fps toward `target` for `ms`, and returns every tear it passed through. */
function spring(from: number, target: number, ms = 2000) {
  let tear = from;
  let velocity = 0;
  const path: number[] = [];
  for (let t = 0; t < ms; t += 16) {
    ({ tear, velocity } = springStep(tear, velocity, target, 16));
    path.push(tear);
  }
  return { tear, velocity, path };
}

describe("the pull tab's drag", () => {
  it("tears with resistance: the tear lags the finger by the strip's gain", () => {
    expect(tearTarget(0, PULL.travelPx)).toBeCloseTo(PULL.gain);
    expect(tearTarget(0.3, PULL.travelPx / 2)).toBeCloseTo(0.3 + PULL.gain / 2);
  });

  it("keeps the tear between sealed and all the way", () => {
    expect(tearTarget(0.5, PULL.travelPx * 4)).toBe(1);
    expect(tearTarget(0.2, -PULL.travelPx)).toBe(0);
  });
});

describe("the pull tab's spring", () => {
  it("settles on its target", () => {
    const { tear, velocity } = spring(0, 0.5);
    expect(tear).toBeCloseTo(0.5, 3);
    expect(atRest(tear, velocity, 0.5)).toBe(true);
  });

  it("stops a flung tear at the ends instead of overshooting them", () => {
    expect(springStep(0.95, 10, 1, 16)).toEqual({ tear: 1, velocity: 0 });
    expect(springStep(0.05, -10, 0, 16)).toEqual({ tear: 0, velocity: 0 });
  });

  it("settles back to sealed after a release under the snap", () => {
    expect(spring(0.6, 0).tear).toBeCloseTo(0, 3);
  });

  it("isn't at rest while it's still moving", () => {
    const { tear, velocity } = spring(0, 1, 48);
    expect(atRest(tear, velocity, 1)).toBe(false);
  });
});

describe("the pull tab's ticks", () => {
  it("ticks once per step of the strip, going forward", () => {
    expect(ticksBetween(0, 1)).toBe(PULL.ticks);
    expect(ticksBetween(0, 0.1)).toBe(PULL.ticks / 10);
    expect(ticksBetween(0.1, 0.1)).toBe(0);
  });

  it("doesn't tick as the tear springs back", () => {
    expect(ticksBetween(0.5, 0.2)).toBe(0);
  });
});

describe("the snap", () => {
  it("snaps at its threshold and not before", () => {
    expect(snapped(PULL.snapAt)).toBe(true);
    expect(snapped(PULL.snapAt - 0.01)).toBe(false);
  });

  it("snaps on the fifth arrow press from sealed", () => {
    let tear = 0;
    const snaps: boolean[] = [];
    for (let press = 0; press < 5; press++) {
      tear = keyTear(tear, press % 2 ? "ArrowUp" : "ArrowRight");
      snaps.push(snapped(tear));
    }
    expect(snaps).toEqual([false, false, false, false, true]);
  });

  it("goes back a step on the other arrows, and no further than sealed", () => {
    expect(keyTear(0.4, "ArrowLeft")).toBeCloseTo(0.4 - PULL.keyStep);
    expect(keyTear(0.1, "ArrowDown")).toBe(0);
  });
});

describe("tearing by itself", () => {
  it("runs from sealed to all the way over its time, always forward", () => {
    const steps = Array.from({ length: 13 }, (_, i) => autoTear((PULL.autoTearMs * i) / 12));
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(1);
    expect(autoTear(PULL.autoTearMs * 2)).toBe(1);
    steps.slice(1).forEach((tear, i) => expect(tear).toBeGreaterThan(steps[i] ?? 1));
  });
});
