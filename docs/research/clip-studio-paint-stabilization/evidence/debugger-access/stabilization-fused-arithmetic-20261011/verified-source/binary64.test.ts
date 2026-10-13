import assert from "node:assert/strict";
import test from "node:test";
import { fma64 } from "./binary64.ts";

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
