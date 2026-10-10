import assert from "node:assert/strict";
import test from "node:test";
import { averageFractionalHistory, adjustFastWindow } from "./live-reference.ts";
import type { Sample } from "./live-reference.ts";
import { cornerPredicate, quadraticToCubic } from "./post-reference.ts";

function close(actual: number, expected: number, tolerance = 1e-12): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

test("fractional averaging preserves a constant position and pressure with padded history", () => {
  const sample: Sample = { x: 5, y: -3, pressure: 0.5, timestamp: 100n };
  for (const window of [1, 1.25, 2, 2.75, 10, 99.5]) {
    const result = averageFractionalHistory([sample], window, 100n);
    assert.ok(result);
    close(result.x, 5);
    close(result.y, -3);
    close(result.pressure, 0.5);
  }
});

test("constant-speed lag equals the first moment of the fractional history weights", () => {
  const history: Sample[] = Array.from({ length: 30 }, (_, i) => ({
    x: 100 - 2 * i,
    y: 20 + 3 * i,
    pressure: 0.5,
    timestamp: BigInt(100 - i),
  }));
  for (const window of [1, 1.5, 2, 2.75, 5, 10.25, 29]) {
    const whole = Math.floor(window);
    const fraction = window - whole;
    // Independently derived from the arithmetic-series first moment.
    const delayInSamples = ((whole * (whole - 1)) / 2 + fraction * whole) / window;
    const result = averageFractionalHistory(history, window, 100n);
    assert.ok(result);
    close(result.x, 100 - 2 * delayInSamples);
    close(result.y, 20 + 3 * delayInSamples);
  }
});

test("fractional averaging commutes with translation and uniform coordinate scaling", () => {
  const history: Sample[] = [
    { x: 12, y: 2, pressure: 0.75, timestamp: 100n },
    { x: 8, y: -4, pressure: 0.5, timestamp: 99n },
    { x: 4, y: 8, pressure: 0.25, timestamp: 98n },
  ];
  const transformed = history.map((sample) => ({
    ...sample,
    x: sample.x * 2 + 8,
    y: sample.y * 2 - 6,
  }));
  const first = averageFractionalHistory(history, 2.5, 100n);
  const second = averageFractionalHistory(transformed, 2.5, 100n);
  assert.ok(first && second);
  close(second.x, first.x * 2 + 8);
  close(second.y, first.y * 2 - 6);
  close(second.pressure, first.pressure);
});

test("fast adjustment depends on packet distance while the stale threshold is not crossed", () => {
  const input = {
    currentWindow: 10,
    stabilization: 20,
    initialWindow: 5,
    distanceScale: 140,
    state: 1 as const,
    previousInput: { x: 0, y: 0, pressure: 1, timestamp: 0n },
    currentPosition: { x: 70, y: 0 },
  };
  const quick = adjustFastWindow({ ...input, currentTimestamp: 1n });
  const slow = adjustFastWindow({ ...input, currentTimestamp: 1000n });
  assert.deepEqual(quick, slow);
  close(quick.currentWindow, 10.25);
  assert.equal(adjustFastWindow({ ...input, currentTimestamp: 1001n }).canAverage, false);
});

test("corner classification survives rotation and translation", () => {
  const a = { x: 0, y: 0 },
    b = { x: 6, y: 0 },
    c = { x: 6, y: 8 };
  const transform = (p: { x: number; y: number }) => ({ x: -p.y + 30, y: p.x - 40 });
  for (const tolerance of [0, 4, 4.8, 5, 100]) {
    assert.equal(
      cornerPredicate(a, b, c, tolerance, 1),
      cornerPredicate(transform(a), transform(b), transform(c), tolerance, 1),
    );
  }
});

test("corner classification has the expected dimensional scaling", () => {
  const a = { x: 0, y: 0 },
    b = { x: 6, y: 0 },
    c = { x: 6, y: 8 };
  const scale = (p: { x: number; y: number }) => ({ x: p.x * 2, y: p.y * 2 });
  for (const tolerance of [1, 4, 5, 100]) {
    assert.equal(
      cornerPredicate(a, b, c, tolerance, 1),
      cornerPredicate(scale(a), scale(b), scale(c), tolerance * 2, 0.5),
    );
  }
});

test("recovered quadratic-to-cubic controls represent the same parametric curve", () => {
  const a = { x: -3, y: 2 },
    q = { x: 9, y: 11 },
    c = { x: 6, y: -4 };
  const [first, second] = quadraticToCubic(a, q, c);
  for (const t of [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]) {
    const u = 1 - t;
    for (const axis of ["x", "y"] as const) {
      const quadratic = u * u * a[axis] + 2 * u * t * q[axis] + t * t * c[axis];
      const cubic =
        u ** 3 * a[axis] +
        3 * u * u * t * first[axis] +
        3 * u * t * t * second[axis] +
        t ** 3 * c[axis];
      close(cubic, quadratic);
    }
  }
});
