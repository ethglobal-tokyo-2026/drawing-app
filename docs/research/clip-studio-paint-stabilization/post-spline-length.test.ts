import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sampledSplineLength, splineLength } from "./post-spline-length.ts";
import type { SixPoints } from "./post-spline.ts";

test("spline length matches every retained standalone instruction output bit", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./spikes/post-pipeline/evidence/endpoint-native.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.cases.length, 110);
  for (const row of fixture.cases) {
    const values: number[] = row.inputBits.map((bits: string) =>
      Buffer.from(bits, "hex").readDoubleBE(),
    );
    const points = Array.from({ length: 6 }, (_, index) => ({
      x: values[index * 2],
      y: values[index * 2 + 1],
    })) as unknown as SixPoints;
    const actual =
      row.mode === "X"
        ? splineLength(points, values[12] !== 0)
        : sampledSplineLength(points, values[12]);
    const bytes = Buffer.alloc(8);
    bytes.writeDoubleBE(actual);
    assert.equal(bytes.toString("hex"), row.outputBits[0], row.name);
  }
});

test("sampled spline length enforces the explicit research work bound", () => {
  const points = Array.from({ length: 6 }, (_, x) => ({ x, y: 0 })) as unknown as SixPoints;
  assert.equal(sampledSplineLength(points, 0), 0);
  assert.throws(() => sampledSplineLength(points, 100001), /research limit/);
  assert.throws(() => sampledSplineLength(points, 0.5), /signed 32-bit/);
});
