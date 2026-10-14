import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffractionReference,
  gaussianOrderIntegral,
  referenceFrame,
  reflectionMetrics,
} from "./material-reference.ts";
const base = {
  light: [0, 0, 1],
  view: [0.4, 0, Math.sqrt(0.84)],
  normal: [0, 0, 1],
  tangent: [1, 0, 0],
  sigma: 0.06,
  wavelengthStep: 5,
} as const;
await test("rejects either back-facing hemisphere and off-groove directions", () => {
  const on = diffractionReference(base);
  assert(on > 0);
  assert.equal(diffractionReference({ ...base, light: [0, 0, -1] }), 0);
  assert.equal(diffractionReference({ ...base, view: [0, 0, -1] }), 0);
  assert(diffractionReference({ ...base, view: [0, 0.4, Math.sqrt(0.84)] }) < on * 0.01);
});
await test("broader orders preserve their integrated energy", () => {
  for (const sigma of [0.035, 0.06, 0.15])
    assert(Math.abs(gaussianOrderIntegral(sigma) - 0.7) < 0.002);
});
await test("spectral summation converges before production fitting", () => {
  for (const u of [0.27, 0.38, 0.54, 0.78]) {
    const sample = { ...base, view: [u, 0, Math.sqrt(1 - u * u)] as const };
    const dense = diffractionReference({ ...sample, wavelengthStep: 1 });
    assert(Math.abs(diffractionReference(sample) - dense) / dense < 0.005);
  }
});

await test("dense angular integration converges before sparse GPU comparison", () => {
  const frame = { x: 0.6, y: 0, turn: 0, grating: 0, geometry: "flat", broad: false } as const;
  const a = reflectionMetrics(referenceFrame(frame, 32, 4), 4);
  const b = reflectionMetrics(referenceFrame(frame, 64, 4), 4);
  assert(Math.abs(a.energy / b.energy - 1) < 0.005);
});
