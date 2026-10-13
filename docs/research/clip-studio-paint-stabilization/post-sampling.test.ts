import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  nearestSampleDistance,
  nearestSampleParameter,
  sampleQuadraticForCorrection,
} from "./post-sampling.ts";
import type { Point } from "./post-reference.ts";
import type { QuadraticPoints } from "./post-quadratic.ts";

const p = (x: number, y: number): Point => ({ x, y });

test("distance examines only the nearest vertex's adjacent segments", () => {
  const samples = [p(0, 2), p(0, 3), p(-100, 0), p(100, 0)];
  assert.equal(nearestSampleDistance(samples, p(0, 0)), 2);
  assert.equal(nearestSampleParameter(samples, p(0, 0)), 0);
});

test("equally near vertices keep the first vertex", () => {
  const samples = [p(0, 1), p(1, 1), p(0, -1), p(0, 10)];
  assert.equal(nearestSampleDistance(samples, p(0, 0)), 1);
  assert.equal(nearestSampleParameter(samples, p(0, 0)), 0);
});

test("projection ties retain the following segment's parameter", () => {
  const samples = [p(-2, 2), p(0, 0), p(2, 2)];
  assert.equal(nearestSampleParameter(samples, p(0, 1)), 0.625);
});

test("preceding segments can improve distance and parameter", () => {
  const samples = [p(-4, 0), p(0, 0), p(0, 10)];
  assert.equal(nearestSampleDistance(samples, p(-1, 0.5)), 0.5);
  assert.equal(nearestSampleParameter(samples, p(-1, 0.5)), 0.375);
});

test("endpoint, interior, and degenerate projection arithmetic", () => {
  const samples = [p(0, 0), p(3, 4)];
  assert.equal(nearestSampleDistance(samples, p(-3, -4)), 5);
  assert.equal(nearestSampleParameter(samples, p(-3, -4)), 0);
  assert.equal(nearestSampleDistance(samples, p(6, 8)), 5);
  assert.equal(nearestSampleParameter(samples, p(6, 8)), 1);
  assert.equal(nearestSampleDistance(samples, p(0, 5)), 3);
  assert.equal(nearestSampleParameter(samples, p(0, 5)), 0.8);
  assert.equal(nearestSampleDistance([p(2, 3), p(2, 3)], p(5, 7)), 5);
  assert.equal(nearestSampleParameter([p(2, 3), p(2, 3)], p(5, 7)), 0);
});

test("one-sample distance is DBL_MAX while its parameter is positive zero", () => {
  assert.equal(nearestSampleDistance([p(7, -3)], p(2, 1)), Number.MAX_VALUE);
  assert.equal(Object.is(nearestSampleParameter([p(7, -3)], p(2, 1)), 0), true);
  assert.equal(nearestSampleDistance([], p(2, 1)), Number.MAX_VALUE);
  assert.throws(() => nearestSampleParameter([], p(2, 1)), /at least one sample/);
});

test("quadratic correction sampling uses four minimum intervals and exact final time", () => {
  const points: QuadraticPoints = [p(0, 0), p(8, 0), p(16, 0)];
  assert.deepEqual(sampleQuadraticForCorrection(points), [
    p(0, 0),
    p(4, 0),
    p(8, 0),
    p(12, 0),
    p(16, 0),
  ]);
  assert.deepEqual(sampleQuadraticForCorrection(points, 4, 1, 0), [
    p(16, 0),
    p(12, 0),
    p(8, 0),
    p(4, 0),
    p(0, 0),
  ]);
  assert.deepEqual(
    sampleQuadraticForCorrection(points, 4, 0.5, 0.5),
    Array.from({ length: 5 }, () => p(8, 0)),
  );
});

test("sampling truncates counts and applies ARM signed conversion before the bounds", () => {
  assert.equal(sampleQuadraticForCorrection([p(0, 0), p(11, 0), p(22, 0)]).length, 6);
  const points: QuadraticPoints = [p(0, 0), p(1000, 0), p(2000, 0)];
  assert.equal(sampleQuadraticForCorrection(points).length, 256);
  assert.equal(sampleQuadraticForCorrection(points, 0).length, 256);
  assert.equal(sampleQuadraticForCorrection(points, -1).length, 5);
  assert.equal(sampleQuadraticForCorrection(points, 0, 0, 0).length, 5);
});

function fromBits(bits: string): number {
  return Buffer.from(bits, "hex").readDoubleBE();
}
function bits(value: number): string {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(value);
  return b.toString("hex");
}

test("all standalone native sampling and projection vectors match every output bit", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./spikes/post-pipeline/evidence/sampling-native-vectors.json", import.meta.url),
      "utf8",
    ),
  ) as {
    cases: {
      mode: string;
      name: string;
      inputBits: string[];
      outputBits: string[];
      count?: number;
    }[];
  };
  assert.ok(fixture.cases.length >= 700);
  for (const vector of fixture.cases) {
    const values = vector.inputBits.map(fromBits);
    const points: Point[] = [];
    const coordinateCount = vector.mode === "S" ? 6 : values.length - 2;
    for (let i = 0; i < coordinateCount; i += 2) points.push(p(values[i], values[i + 1]));
    let actual: number[];
    if (vector.mode === "S") {
      const samples = sampleQuadraticForCorrection(
        points as unknown as QuadraticPoints,
        values[6],
        values[7],
        values[8],
      );
      assert.equal(samples.length, vector.count, vector.name);
      actual = samples.flatMap((point) => [point.x, point.y]);
    } else {
      const query = p(values.at(-2)!, values.at(-1)!);
      actual = [
        vector.mode === "D"
          ? nearestSampleDistance(points, query)
          : nearestSampleParameter(points, query),
      ];
    }
    assert.deepEqual(actual.map(bits), vector.outputBits, `${vector.mode}: ${vector.name}`);
  }
});
