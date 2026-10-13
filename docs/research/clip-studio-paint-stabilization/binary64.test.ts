import assert from "node:assert/strict";
import test from "node:test";
import { fma64 } from "../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts";

test("an infinite addend dominates finite multiplicands before product rounding", () => {
  assert.equal(fma64(1e308, 2, -Infinity), -Infinity);
  assert.equal(fma64(-1e308, 2, Infinity), Infinity);
  assert.equal(fma64(2, 3, Infinity), Infinity);
});

test("nonfinite intermediate operands preserve IEEE results without modeling NaN payloads", () => {
  assert.equal(fma64(Infinity, 2, 1), Infinity);
  assert.equal(fma64(-Infinity, 2, 1), -Infinity);
  assert.ok(Number.isNaN(fma64(Infinity, 0, 1)));
  assert.ok(Number.isNaN(fma64(Infinity, 2, -Infinity)));
  assert.ok(Number.isNaN(fma64(NaN, 2, 1)));
  assert.ok(Number.isNaN(fma64(2, NaN, 1)));
  assert.ok(Number.isNaN(fma64(2, 3, NaN)));
});

test("fusion retains the low product through cancellation and rounds halfway sums to even", () => {
  const epsilon = Number.EPSILON;
  assert.equal(fma64(1 + epsilon, 1 - epsilon, -1), -(2 ** -104));
  assert.equal(fma64(1 + epsilon, 1 + epsilon, -(1 + 2 * epsilon)), 2 ** -104);
  assert.equal(fma64(1, 1, 2 ** -53), 1);
  assert.equal(fma64(1 + epsilon, 1, 2 ** -53), 1 + 2 * epsilon);
  assert.equal(fma64(-1, 1, -(2 ** -53)), -1);
  assert.equal(fma64(-1 - epsilon, 1, -(2 ** -53)), -1 - 2 * epsilon);
});

test("fusion preserves exponent boundaries, gradual underflow, and signed zero", () => {
  assert.equal(fma64(2 ** 400, 2 ** 400, 1), 2 ** 800);
  assert.equal(fma64(1 + Number.EPSILON, 2 ** -400, -(2 ** -400)), 2 ** -452);
  assert.equal(fma64(2 ** -400, 2 ** -400, -(2 ** -800)), 0);
  assert.equal(fma64(Number.MIN_VALUE, 0.5, Number.MIN_VALUE), 2 * Number.MIN_VALUE);
  assert.equal(fma64(-Number.MIN_VALUE, 0.5, -Number.MIN_VALUE), -2 * Number.MIN_VALUE);
  assert.ok(Object.is(fma64(-0, 1, -0), -0));
  assert.ok(Object.is(fma64(-Number.MIN_VALUE, 0.5, 0), -0));
  assert.ok(Object.is(fma64(1, 1, -1), 0));
});
