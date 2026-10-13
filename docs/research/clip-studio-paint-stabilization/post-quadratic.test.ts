import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluateQuadratic,
  splitQuadratic,
  measureQuadratic,
  sampledQuadraticLength,
  quadraticLength,
  type QuadraticPoints,
} from "./post-quadratic.ts";

const arch: QuadraticPoints = [
  { x: 0, y: 0 },
  { x: 2, y: 4 },
  { x: 4, y: 0 },
];
const line: QuadraticPoints = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 8, y: 0 },
];

function bits(value: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value);
  return buffer.toString("hex");
}

test("quadratic evaluator preserves rational endpoints, midpoint and extrapolation", () => {
  assert.deepEqual(evaluateQuadratic(arch, 0), arch[0]);
  assert.deepEqual(evaluateQuadratic(arch, 0.5), { x: 2, y: 2 });
  assert.deepEqual(evaluateQuadratic(arch, 1), arch[2]);
  assert.deepEqual(evaluateQuadratic(arch, 2), { x: 8, y: -16 });
});

test("quadratic split returns both controls and its separately calculated point", () => {
  assert.deepEqual(splitQuadratic(arch, 0.5), {
    leftControl: { x: 1, y: 2 },
    splitPoint: { x: 2, y: 2 },
    rightControl: { x: 3, y: 2 },
  });
  assert.deepEqual(splitQuadratic(arch, 0), {
    leftControl: arch[0],
    splitPoint: arch[0],
    rightControl: arch[1],
  });
  assert.deepEqual(splitQuadratic(arch, 1), {
    leftControl: arch[1],
    splitPoint: arch[2],
    rightControl: arch[2],
  });
});

test("quadratic length uses zero samples, endpoint chords and both quality modes", () => {
  assert.equal(measureQuadratic(line), 8);
  assert.equal(sampledQuadraticLength(arch, 0), 0);
  assert.equal(sampledQuadraticLength(arch, -1), 0);
  assert.equal(sampledQuadraticLength(arch, 1), 4);
  assert.equal(sampledQuadraticLength(line, 4), 8);
  assert.equal(quadraticLength(line, false), 8);
  assert.equal(quadraticLength(line, true), 8);
  const point: QuadraticPoints = [
    { x: 3, y: 4 },
    { x: 3, y: 4 },
    { x: 3, y: 4 },
  ];
  assert.equal(quadraticLength(point, true), 0);
});

test("sampled length rejects an invalid or excessive research sample count", () => {
  for (const count of [0.5, NaN, Infinity, -2147483649, 100001]) {
    assert.throws(() => sampledQuadraticLength(arch, count), RangeError);
  }
  const longLine: QuadraticPoints = [
    { x: 0, y: 0 },
    { x: 25000.25, y: 0 },
    { x: 50000.5, y: 0 },
  ];
  assert.throws(() => quadraticLength(longLine, true), /100000/);
  assert.ok(Number.isFinite(quadraticLength(longLine, false)));
});

type NativeCase = {
  mode: string;
  name: string;
  inputBits: string[];
  outputBits: string[];
};
const native = JSON.parse(
  readFileSync(
    new URL("./spikes/post-spline/evidence/native-vectors.json", import.meta.url),
    "utf8",
  ),
) as { cases: NativeCase[] };

for (const mode of ["Q", "D", "B", "G", "L"] as const) {
  test(`native quadratic instruction ${mode} results match every saved output bit`, () => {
    const rows = native.cases.filter((row) => row.mode === mode);
    assert.ok(rows.length > 0);
    for (const row of rows) {
      const input = row.inputBits.map((value) => Buffer.from(value, "hex").readDoubleBE());
      const points: QuadraticPoints = [
        { x: input[0], y: input[1] },
        { x: input[2], y: input[3] },
        { x: input[4], y: input[5] },
      ];
      let output: number[];
      if (mode === "Q") {
        const point = evaluateQuadratic(points, input[6]);
        output = [point.x, point.y];
      } else if (mode === "D") {
        const split = splitQuadratic(points, input[6]);
        output = [
          split.leftControl.x,
          split.leftControl.y,
          split.splitPoint.x,
          split.splitPoint.y,
          split.rightControl.x,
          split.rightControl.y,
        ];
      } else if (mode === "B") {
        output = [measureQuadratic(points)];
      } else if (mode === "G") {
        output = [sampledQuadraticLength(points, input[6])];
      } else {
        output = [quadraticLength(points, input[6] !== 0)];
      }
      assert.deepEqual(output.map(bits), row.outputBits, row.name);
    }
  });
}
