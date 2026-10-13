import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluateSpline,
  adjustSplineOuterNeighbor,
  measureSpline,
  sampleSpline,
  type SixPoints,
} from "./post-spline.ts";

const basis = (index: number, x = 99, y = 0): SixPoints =>
  Array.from({ length: 6 }, (_, i) => ({
    x: i === index ? x : 0,
    y: i === index ? y : 0,
  })) as unknown as SixPoints;
const bits = (value: number) => {
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value);
  return buffer.toString("hex");
};

test("six-point evaluator preserves point ordering and both branch coefficient sets", () => {
  const rows = [
    [0, [0, 0, 99, 0, 0, 0]],
    [0.25, [1.625, -11, 88.75, 23, -4, 0.625]],
    [0.5, [1.5, -10, 58, 58, -10, 1.5]],
    [0.75, [0.625, -4, 23, 88.75, -11, 1.625]],
    [1, [0, 0, 0, 99, 0, 0]],
  ] as const;
  for (const [t, weights] of rows)
    for (let index = 0; index < 6; index++) {
      const point = evaluateSpline(basis(index, 99, 198), t);
      assert.equal(point.x, weights[index], `P${index}.x at t=${t}`);
      assert.equal(point.y, 2 * weights[index], `P${index}.y at t=${t}`);
    }
});

test("evaluator endpoints retain multiply-then-divide rounding", () => {
  const coordinate = 368.6172768546371;
  assert.equal(bits(evaluateSpline(basis(2, coordinate), 0).x), "407709e05db1f3e7");
  assert.equal(bits(evaluateSpline(basis(3, coordinate), 1).x), "407709e05db1f3e7");
});

test("evaluator does not clamp an out-of-range parameter", () => {
  assert.deepEqual(evaluateSpline(basis(2), -1), { x: -65, y: 0 });
  assert.deepEqual(evaluateSpline(basis(2), 2), { x: 28, y: 0 });
});

test("outer neighbor uses the greater of ten and 2.5 times the opposite distance", () => {
  const anchor = { x: 0, y: 0 };
  assert.deepEqual(adjustSplineOuterNeighbor(anchor, { x: 2, y: 0 }, { x: 9, y: 0 }), {
    x: 9,
    y: 0,
  });
  assert.deepEqual(adjustSplineOuterNeighbor(anchor, { x: 2, y: 0 }, { x: 20, y: 0 }), {
    x: 10,
    y: 0,
  });
  assert.deepEqual(adjustSplineOuterNeighbor(anchor, { x: 8, y: 0 }, { x: 30, y: 0 }), {
    x: 20,
    y: 0,
  });
});

test("outer-neighbor equality still recomputes coordinates", () => {
  assert.deepEqual(
    adjustSplineOuterNeighbor({ x: 1e16, y: 7 }, { x: 6e15, y: 7 }, { x: 1, y: 7 }),
    { x: 0, y: 7 },
  );
});

test("spline measure includes all four quarter chords with direct segment endpoints", () => {
  assert.equal(measureSpline(basis(0)), 3.25);
  assert.equal(measureSpline(basis(1)), 22);
  assert.equal(measureSpline(basis(2)), 99);
});

test("sampler truncates its interval count and emits both endpoints", () => {
  assert.deepEqual(
    sampleSpline(basis(0), 1),
    [0, 1.625, 1.5, 0.625, 0].map((x) => ({ x, y: 0 })),
  );
  assert.deepEqual(
    sampleSpline(basis(0), 0.40625),
    [0, 1.03125, 1.625, 1.78125, 1.5, 1.03125, 0.625, 0.28125, 0].map((x) => ({ x, y: 0 })),
  );
});

test("sampler preserves reversed and out-of-range intervals", () => {
  assert.deepEqual(
    sampleSpline(basis(0), 1, 1, 0),
    [0, 0.625, 1.5, 1.625, 0].map((x) => ({ x, y: 0 })),
  );
  assert.deepEqual(
    sampleSpline(basis(0), 1, 1, 2),
    [0, -0.375, -0.5, -0.375, 0].map((x) => ({ x, y: 0 })),
  );
});

test("sampler bounds allocation even when density causes infinity or NaN", () => {
  assert.equal(sampleSpline(basis(0), Number.MIN_VALUE).length, 256);
  assert.equal(sampleSpline(basis(0), -1).length, 5);
  assert.deepEqual(
    sampleSpline(basis(0, 0), 0),
    Array.from({ length: 5 }, () => ({ x: 0, y: 0 })),
  );
  assert.deepEqual(
    sampleSpline(basis(0), 1, 0.5, 0.5),
    Array.from({ length: 5 }, () => ({ x: 1.5, y: 0 })),
  );
});

type NativeCase = {
  mode: "E" | "M" | "N" | "S";
  name: string;
  inputBits: string[];
  outputBits: string[];
  count?: number;
};
const native = JSON.parse(
  readFileSync(
    new URL("./spikes/post-spline/evidence/native-vectors.json", import.meta.url),
    "utf8",
  ),
) as { cases: NativeCase[] };
for (const mode of ["E", "M", "N", "S"] as const) {
  test(`native instruction ${mode} results match every saved output bit`, () => {
    const rows = native.cases.filter((row) => row.mode === mode);
    assert.ok(rows.length > 0);
    for (const row of rows) {
      const input = row.inputBits.map((value) => Buffer.from(value, "hex").readDoubleBE());
      const points = Array.from({ length: 6 }, (_, i) => ({
        x: input[i * 2],
        y: input[i * 2 + 1],
      })) as unknown as SixPoints;
      let output: number[];
      if (mode === "E") {
        const point = evaluateSpline(points, input[12]);
        output = [point.x, point.y];
      } else if (mode === "M") {
        output = [measureSpline(points)];
      } else if (mode === "N") {
        const point = adjustSplineOuterNeighbor(points[0], points[1], points[2]);
        output = [point.x, point.y];
      } else {
        const samples = sampleSpline(points, input[12], input[13], input[14]);
        assert.equal(samples.length, row.count, row.name);
        output = samples.flatMap((point) => [point.x, point.y]);
      }
      assert.deepEqual(output.map(bits), row.outputBits, row.name);
    }
  });
}
