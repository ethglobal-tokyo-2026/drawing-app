/** Deterministic native FMADD differential, with a bounded standalone process. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fma64 } from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts";

const [oraclePath, reportPath] = process.argv.slice(2);
if (!oraclePath || !reportPath)
  throw new Error("Pass the compiled ARM64 oracle and a new report path");
const bytes = new DataView(new ArrayBuffer(8));
const bits = (n: number) => {
  bytes.setFloat64(0, n);
  return bytes.getBigUint64(0).toString(16).padStart(16, "0");
};
const value = (n: bigint) => {
  bytes.setBigUint64(0, n);
  return bytes.getFloat64(0);
};
let seed = 0x19f131ad;
const random = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
};
const finite = () => value(((BigInt(random()) << 32n) | BigInt(random())) & 0xffefffffffffffffn);
const ordinary = () =>
  value(
    (BigInt(random() & 0x800fffff) << 32n) |
      BigInt(random()) |
      (BigInt(623 + (random() % 801)) << 52n),
  );
const cases: [number, number, number][] = [];
const add = (a: number, b: number, c: number) => cases.push([a, b, c]);
const boundary = [
  0,
  -0,
  Number.MIN_VALUE,
  -Number.MIN_VALUE,
  2 ** -1022,
  -(2 ** -1022),
  2 ** -400,
  2 ** 400,
  1,
  -1,
  1 + Number.EPSILON,
  1 - Number.EPSILON / 2,
  Number.MAX_VALUE,
  -Number.MAX_VALUE,
];
for (const a of boundary) for (const b of boundary) for (const c of boundary) add(a, b, c);
for (let i = 0; i < 20000; i++) {
  const a = (random() / 2 ** 31 - 1) * 2 ** ((random() % 801) - 400);
  const b = (random() / 2 ** 31 - 1) * 2 ** ((random() % 801) - 400);
  const c = (random() / 2 ** 31 - 1) * 2 ** ((random() % 801) - 400);
  add(a, b, c);
  add(a, b, -(a * b));
  add(a, a, b * b);
  add(finite(), finite(), finite());
  // Perturb the addend around cancellation and the product around rounding ties.
  add(a, b, -(a * b) * (1 + Number.EPSILON));
  add(1 + (random() % 64) * Number.EPSILON, 1 + (random() % 64) * Number.EPSILON, 2 ** -53);
  const x = ordinary(),
    y = ordinary(),
    z = ordinary();
  add(x, y, z);
  add(x, y, -(x * y));
  add(x, x, y * y);
  add(x, y, -(x * y) * (1 - Number.EPSILON / 2));
}
const input = cases.map((row) => row.map(bits).join(" ")).join("\n") + "\n";
const result = spawnSync(oraclePath, [], {
  input,
  encoding: "utf8",
  timeout: 20000,
  maxBuffer: 32 * 1024 * 1024,
});
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const expected = result.stdout.trim().split("\n");
assert.equal(expected.length, cases.length);
const failures: unknown[] = [];
const started = performance.now();
cases.forEach((row, index) => {
  const actual = bits(fma64(...row));
  if (actual !== expected[index])
    failures.push({ index, inputs: row.map(bits), expected: expected[index], actual });
});
const report = {
  seed: "19f131ad",
  cases: cases.length,
  milliseconds: performance.now() - started,
  inputSha256: createHash("sha256").update(input).digest("hex"),
  expectedSha256: createHash("sha256").update(result.stdout).digest("hex"),
  implementationSha256: createHash("sha256")
    .update(
      readFileSync(
        new URL(
          "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts",
          import.meta.url,
        ),
      ),
    )
    .digest("hex"),
  generatorSha256: createHash("sha256")
    .update(readFileSync(new URL(import.meta.url)))
    .digest("hex"),
  failures,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(report));
assert.deepEqual(failures, []);
