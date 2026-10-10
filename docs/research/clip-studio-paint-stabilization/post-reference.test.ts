import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  fma64,
  convertPostSettings,
  applyCallerCap,
  scalarLimits,
  removalPassSchedule,
  sourceSegmentTolerance,
  endpointParameter,
  cornerPredicate,
  classifiedCornerFlags,
  scalarAtLeast,
  scalarAtMost,
  scalarBounds,
  removalScalarAccepted,
  nearCoincidentRemovalAccepted,
  quadraticToCubic,
  tangentCubicControls,
} from "./post-reference.ts";

const oracle = JSON.parse(
  execFileSync("python3", [new URL("./verify-post.py", import.meta.url).pathname], {
    encoding: "utf8",
    timeout: 10000,
  }),
);
const fromBits = (hex: string) => Buffer.from(hex, "hex").readDoubleBE(0);
const toBits = (value: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return bytes.toString("hex");
};
for (const row of oracle)
  assert.equal(toBits(fma64(fromBits(row.a), fromBits(row.b), fromBits(row.c))), row.expected);
console.log(`FMA: ${oracle.length} binary64 cases agree bit-for-bit with Python math.fma.`);

const basic = {
  enabled: true,
  k: 10,
  flag480: true,
  scaleTolerance: true,
  selector482: false,
  fallbackRequested: false,
  magnificationPercent: 200,
  priorFlag480: false,
  priorSelector482: false,
};
assert.deepEqual(convertPostSettings(basic), {
  k: 10,
  tolerance: 5,
  lengthScale: 0.5,
  flag480: true,
  selector482: false,
});
assert.equal(convertPostSettings({ ...basic, enabled: false }), null);
assert.equal(convertPostSettings({ ...basic, k: 1 })!.tolerance, 0.05);
assert.equal(convertPostSettings({ ...basic, k: 1, fallbackRequested: true })!.tolerance, 0.1);
assert.deepEqual(
  convertPostSettings({
    ...basic,
    enabled: false,
    fallbackRequested: true,
    scaleTolerance: false,
    priorFlag480: true,
    priorSelector482: true,
  }),
  { k: 1, tolerance: 0.1, lengthScale: 0.5, flag480: true, selector482: true },
);
assert.equal(convertPostSettings({ ...basic, k: 65536 })!.tolerance, 0);
assert.equal(convertPostSettings({ ...basic, k: 65537 })!.tolerance, 6553.650000000001);
assert.deepEqual(applyCallerCap(20, 40, true), { k: 4, tolerance: 1.5 });
assert.deepEqual(scalarLimits(10), { ratio: Math.fround(2.2), floor: Math.fround(0.15) });
assert.deepEqual(scalarLimits(100), { ratio: 3, floor: Math.fround(0.3) });
assert.deepEqual(removalPassSchedule(1, 0.1).additionalTolerances, [0.1, 0.1, 0.1]);
assert.deepEqual(removalPassSchedule(10, 5).additionalTolerances, [4, 3, 2, 1, 0]);
assert.deepEqual(removalPassSchedule(10, 2.5).additionalTolerances, [1.5, 0.5, -0.5, -1.5, -2.5]);
assert.equal(removalPassSchedule(40, 160).additionalPassLimit, 10);
assert.equal(removalPassSchedule(40, 160).decrement, 3);
assert.equal(removalPassSchedule(-15, 0).additionalPassLimit, 0);
assert.deepEqual(removalPassSchedule(-10, 0).additionalTolerances, [5]);
assert.equal(sourceSegmentTolerance(10, true, 0.5), 5);
assert.equal(sourceSegmentTolerance(-1, true, 4), 0.1);
assert.equal(sourceSegmentTolerance(10, true, 0), 1);
assert.equal(sourceSegmentTolerance(10, false, 0), 10);
assert.equal(endpointParameter(10), 0.5);
assert.equal(endpointParameter(40), 1);
console.log(
  "Settings, uint32 square overflow, f32 limits, pass schedule, caller cap, and segment tolerance cases pass.",
);

const a = { x: 0, y: 0 },
  b = { x: 1, y: 0 },
  c = { x: 1, y: 1 };
assert.equal(cornerPredicate(a, a, c, 100, 1), true);
assert.equal(cornerPredicate(a, b, { x: 2, y: 0 }, 0, 1), false);
assert.equal(cornerPredicate(a, b, { x: 0.5, y: 1 }, 100, 1), true);
assert.equal(cornerPredicate(a, b, c, 0.7, 1), true);
assert.equal(cornerPredicate(a, b, c, 0.8, 1), false);
assert.equal(cornerPredicate(a, { x: 5, y: 0 }, { x: 8, y: 4 }, 0, 0.999), true);
assert.equal(cornerPredicate(a, { x: 5, y: 0 }, { x: 8, y: 4 }, 0, 1), false);
const e = { x: 6, y: 0 },
  f = { x: 6, y: 8 };
assert.equal(cornerPredicate(a, e, f, 4.8, 1), true); // abs(cross)=48, chord*tolerance=48.
assert.equal(cornerPredicate(a, e, f, 4.800000000000001, 1), false);
assert.equal(classifiedCornerFlags(0xff, false), 0xbc);
assert.equal(classifiedCornerFlags(0, true), 1);
console.log(
  "Corner degeneracy, straight, obtuse, deviation threshold, and inclusive boundary cases pass.",
);

const epsilon = Math.fround(0.0001);
assert.equal(scalarAtLeast(-epsilon, 0), true);
assert.equal(scalarAtLeast(Math.fround(-epsilon - 2 ** -37), 0), false);
assert.equal(scalarAtMost(epsilon, 0), true);
assert.equal(scalarAtMost(Math.fround(epsilon + 2 ** -37), 0), false);
assert.deepEqual(scalarBounds(0.5, { ratio: 2, floor: 0.25 }), { lower: 0.25, upper: 1 });
assert.deepEqual(scalarBounds(0.125, { ratio: 2, floor: 0.25 }), { lower: 0, upper: 0.25 });
assert.equal(removalScalarAccepted(0.5, 0, 1.5, { ratio: 2, floor: 0.25 }, 0.5), true);
assert.equal(removalScalarAccepted(0.5, 0, 1.5, { ratio: 2, floor: 0.25 }, 0), false);
assert.equal(nearCoincidentRemovalAccepted(a, b, 0.5, 0.5, { ratio: 2, floor: 0.25 }), false);
assert.equal(
  nearCoincidentRemovalAccepted(a, { x: 0.5, y: 0 }, 0.5, 0.5, { ratio: 2, floor: 0.25 }),
  true,
);
assert.deepEqual(quadraticToCubic(a, { x: 3, y: 3 }, { x: 6, y: 0 }), [
  { x: 2, y: 2 },
  { x: 4, y: 2 },
]);
assert.deepEqual(tangentCubicControls(a, { x: 6, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 6), [
  { x: 2, y: 0 },
  { x: 6, y: 2 },
]);
console.log(
  "Scalar float-slack boundaries, interpolation acceptance, strict distance boundary, and cubic control cases pass.",
);
