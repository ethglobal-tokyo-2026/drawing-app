import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { decodePostEvaluatorSnapshot } from "./evaluator.ts";

/** Synthetic memory only: these bytes are not a native configuration observation. */
const base = 0x100004000n;
const evaluatorAddress = 0x2000n;
const curveAddress = 0x8000n;
const loaded = (fileAddress: bigint) => fileAddress + base - 0x100000000n;
const nullCurve = () => ({
  address: "0x0",
  state: "null",
  headerHex: "",
  countHex: "",
  controlsHex: "",
  complete: true,
  errors: [],
});

test("decodes the Python helper's simulated-memory snapshot without field translation", () => {
  const fixture = JSON.parse(
    readFileSync(new URL("./evaluator-memory-fixture.json", import.meta.url), "utf8"),
  );
  assert.equal(fixture.provenance, "simulated host memory; not a native observation");
  const config = decodePostEvaluatorSnapshot(fixture.snapshot, "0x100004000");
  assert.ok(config);
  assert.equal(config.main.flags, 0x800001f0);
  assert.equal(config.secondary.flags, 0x800001f0);
  assert.deepEqual(config.main.curves, [
    [
      { x: 0, y: 0 },
      { x: 0.0625, y: 0.125 },
      { x: 0.125, y: 0.25 },
    ],
    null,
    null,
  ]);
  assert.deepEqual(config.secondary.curves, [null, null, null]);
  assert.equal(config.main.minimum, 0.25);
  assert.equal(config.secondaryBase, 2.5);
  assert.equal(config.secondaryEnabled, true);
  assert.equal(config.brushFlag4, true);
  assert.equal(config.adjustmentMode, 3);
});

function fixture(count = 3) {
  const prefix = Buffer.alloc(0x630);
  prefix.writeBigUInt64LE(loaded(0x104a495f0n));
  prefix.writeUInt32LE(0x10, 0x80);
  prefix.writeUInt32LE(3, 0x198);
  prefix.writeUInt32LE(1, 0x624);
  prefix.writeDoubleLE(2.5, 0x628);
  const response = (offset: number) => {
    const bytes = Buffer.alloc(0x58);
    bytes.writeBigUInt64LE(loaded(0x104a493b0n));
    bytes.writeUInt32LE(0x800001f0, 8);
    [0.25, 0.5, 0.75, 1, 0.125, 0.625].forEach((value, i) =>
      bytes.writeFloatLE(value, 0xc + i * 4),
    );
    return {
      address: `0x${(evaluatorAddress + BigInt(offset)).toString(16)}`,
      bytesHex: bytes.toString("hex"),
      curves: [nullCurve(), nullCurve(), nullCurve()],
      complete: true,
      errors: [],
    };
  };
  const main = response(0x88),
    secondary = response(0x630);
  const mainBytes = Buffer.from(main.bytesHex, "hex");
  mainBytes.writeBigUInt64LE(curveAddress, 0x28);
  main.bytesHex = mainBytes.toString("hex");
  mainBytes.copy(prefix, 0x88);
  const header = Buffer.alloc(0x68),
    countBytes = Buffer.alloc(4),
    controls = Buffer.alloc(Math.max(0, Math.min(count, 16)) * 16);
  header.writeBigUInt64LE(loaded(0x104a491a0n));
  countBytes.writeInt32LE(count);
  for (let i = 0; i < controls.length / 16; i++) {
    controls.writeDoubleLE(i / 16, i * 16);
    controls.writeDoubleLE(i / 8, i * 16 + 8);
  }
  main.curves[0] = {
    address: "0x8000",
    state: "present",
    headerHex: header.toString("hex"),
    countHex: countBytes.toString("hex"),
    controlsHex: controls.toString("hex"),
    complete: true,
    errors: [],
  };
  return {
    schema: "csp-post-evaluator/v1",
    address: "0x2000",
    imageBase: `0x${base.toString(16)}`,
    state: "present",
    prefixHex: prefix.toString("hex"),
    main,
    secondary,
    complete: true,
    errors: [],
  };
}

test("decodes observed bytes and preserves every response flag and distinct curve state", () => {
  const config = decodePostEvaluatorSnapshot(fixture(), "0x100004000");
  assert.deepEqual(config, {
    main: {
      flags: 0x800001f0,
      minimum: 0.25,
      input1Minimum: 0.5,
      input1Maximum: 0.75,
      input2Minimum: 1,
      randomMinimum: 0.125,
      input4Minimum: 0.625,
      curves: [
        [
          { x: 0, y: 0 },
          { x: 0.0625, y: 0.125 },
          { x: 0.125, y: 0.25 },
        ],
        null,
        null,
      ],
    },
    secondary: {
      flags: 0x800001f0,
      minimum: 0.25,
      input1Minimum: 0.5,
      input1Maximum: 0.75,
      input2Minimum: 1,
      randomMinimum: 0.125,
      input4Minimum: 0.625,
      curves: [null, null, null],
    },
    secondaryEnabled: true,
    secondaryBase: 2.5,
    brushFlag4: true,
    adjustmentMode: 3,
  });
});

test("only an explicitly captured null evaluator decodes as absent", () => {
  const snap = {
    ...fixture(),
    address: "0x0",
    state: "null",
    prefixHex: "",
    main: null,
    secondary: null,
  };
  assert.equal(decodePostEvaluatorSnapshot(snap), null);
  for (const missing of [
    undefined,
    null,
    {},
    { ...snap, state: "present" },
    { ...snap, address: "0x2000" },
  ])
    assert.throws(() => decodePostEvaluatorSnapshot(missing));
});

test("present zero and one-control curves remain present", () => {
  assert.deepEqual(decodePostEvaluatorSnapshot(fixture(0))?.main.curves[0], []);
  assert.deepEqual(decodePostEvaluatorSnapshot(fixture(1))?.main.curves[0], [{ x: 0, y: 0 }]);
  assert.equal(decodePostEvaluatorSnapshot(fixture(16))?.main.curves[0]?.length, 16);
});

test("rejects incomplete, errored, missing, truncated, or contradictory evidence", () => {
  const mutations: ((snap: ReturnType<typeof fixture>) => unknown)[] = [
    (s) => ({ ...s, complete: false }),
    (s) => ({ ...s, errors: ["read failed"] }),
    (s) => ({ ...s, schema: "other" }),
    (s) => ({ ...s, prefixHex: s.prefixHex.slice(2) }),
    (s) => ({ ...s, main: undefined }),
    (s) => ({ ...s, secondary: null }),
    (s) => ({ ...s, main: { ...s.main, complete: false } }),
    (s) => ({ ...s, secondary: { ...s.secondary, bytesHex: s.secondary.bytesHex.slice(2) } }),
    (s) => ({ ...s, main: { ...s.main, bytesHex: "ff" + s.main.bytesHex.slice(2) } }),
    (s) => ({ ...s, main: { ...s.main, curves: s.main.curves.slice(1) } }),
    (s) => {
      s.main.curves[0].complete = false;
      return s;
    },
    (s) => {
      s.main.curves[0].headerHex = "";
      return s;
    },
    (s) => {
      s.main.curves[0].countHex = "";
      return s;
    },
    (s) => {
      s.main.curves[0].controlsHex = s.main.curves[0].controlsHex.slice(2);
      return s;
    },
    (s) => {
      s.main.curves[1].controlsHex = "00";
      return s;
    },
  ];
  for (const mutate of mutations)
    assert.throws(() => decodePostEvaluatorSnapshot(mutate(fixture())));
});

test("rejects unsupported vtables, parent/child pointer mismatches, and another image base", () => {
  assert.throws(() => decodePostEvaluatorSnapshot(fixture(), "0x100000000"));
  for (const target of ["evaluator", "response", "curve", "pointer", "embedded"] as const) {
    const s = fixture();
    if (target === "evaluator") s.prefixHex = "0000000000000000" + s.prefixHex.slice(16);
    if (target === "response")
      s.secondary.bytesHex = "0000000000000000" + s.secondary.bytesHex.slice(16);
    if (target === "curve")
      s.main.curves[0].headerHex = "0000000000000000" + s.main.curves[0].headerHex.slice(16);
    if (target === "pointer") s.main.curves[0].address = "0x9000";
    if (target === "embedded") s.main.address = "0x9000";
    assert.throws(() => decodePostEvaluatorSnapshot(s), target);
  }
});

test("rejects nonfinite numbers, invalid counts, and descending controls without normalizing them", () => {
  for (const count of [-1, 17, 0x7fffffff])
    assert.throws(() => decodePostEvaluatorSnapshot(fixture(count)));
  for (const field of ["float", "double", "control", "order"] as const) {
    const s = fixture();
    if (field === "float") {
      const bytes = Buffer.from(s.secondary.bytesHex, "hex");
      bytes.writeFloatLE(NaN, 0xc);
      s.secondary.bytesHex = bytes.toString("hex");
    } else if (field === "double") {
      const bytes = Buffer.from(s.prefixHex, "hex");
      bytes.writeDoubleLE(Infinity, 0x628);
      s.prefixHex = bytes.toString("hex");
    } else {
      const bytes = Buffer.from(s.main.curves[0].controlsHex, "hex");
      bytes.writeDoubleLE(field === "control" ? Infinity : 9, 0);
      s.main.curves[0].controlsHex = bytes.toString("hex");
    }
    assert.throws(() => decodePostEvaluatorSnapshot(s), field);
  }
});
