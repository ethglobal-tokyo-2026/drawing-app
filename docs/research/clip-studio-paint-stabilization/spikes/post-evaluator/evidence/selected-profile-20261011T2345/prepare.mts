import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const output = dirname(fileURLToPath(import.meta.url));
const load = (path: string) => import(pathToFileURL(resolve(root, path)).href);
const { SELECTED_ROUND_BRUSH_PROFILE } = await load("apps/frontend/src/sticker-creation/canvas/post-correction/profile.ts");
const { decodePostEvaluatorSnapshot } = await load("docs/research/clip-studio-paint-stabilization/spikes/post-joined/evaluator.ts");
const capturePath = "docs/research/clip-studio-paint-stabilization/evidence/debugger-access/post-joined-20261011T230556.990852Z-2249f1a0/joined.jsonl";
const capture = readFileSync(resolve(root, capturePath));
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
assert.equal(hash(capture), "b02068367c020a8fecb3266e4b1213000d3292a16d5b40966cbb6a1b6515a104");
const boundaries = capture.toString("utf8").trim().split("\n").map((line) => JSON.parse(line)).filter((row) => row.kind === "boundary");
assert.equal(boundaries.length, 2);
const config = decodePostEvaluatorSnapshot(boundaries.find((row) => row.phase === "entry").path.endpointEvaluator);
assert.deepEqual(config, decodePostEvaluatorSnapshot(boundaries.find((row) => row.phase === "return").path.endpointEvaluator));
assert.deepEqual(SELECTED_ROUND_BRUSH_PROFILE.evaluator, config);
assert.equal(config.main.flags, 17);
assert.equal(config.adjustmentMode, 1);
const float = Buffer.alloc(4);
const bits = (value: number) => { float.writeFloatBE(value); return float.readUInt32BE(); };
const fromBits = (value: number) => { float.writeUInt32BE(value); return float.readFloatBE(); };
assert.equal(bits(config.main.minimum), 0x3dcccccc);
const pressureBits = new Set<number>();
for (let i = 0; i <= 32; i++) pressureBits.add(bits(i / 32));
for (const value of [0, 1, 0.1, 0.15, 0.3, (0.3 + 0.6727272727272727) / 2, 0.6727272727272727, (0.6727272727272727 + 1) / 2]) {
  const center = bits(value);
  for (const delta of [-1, 0, 1]) {
    const candidate = center + delta;
    if (candidate >= 0 && candidate <= 0x3f800000) pressureBits.add(candidate);
  }
}
for (const value of [1, 2, 0x007fffff, 0x00800000, 0x00800001, 0x3f7ffffe, 0x3f7fffff]) pressureBits.add(value);
let seed = 0x497c;
for (let i = 0; i < 32; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  pressureBits.add(bits(seed / 0xffffffff));
}
const pressures = [...pressureBits].sort((a, b) => a - b).map(fromBits);
const parameters = [0, 2 ** -24, 1e-8, 0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2.5, 5, 7.5, 14.75, 50];
const cases = [];
for (const pressure of pressures) {
  const label = bits(pressure).toString(16).padStart(8, "0");
  cases.push({ mode: "C", name: `selected-curve-${label}`, curve: config.main.curves[0], parameter: pressure });
  for (const parameter of parameters) {
    cases.push({ mode: "E", name: `selected-endpoint-${label}-${parameter}`, parameter, node: { flags: 0, scalars: [pressure, 1, 0, 0, 1, 1, 1] }, config });
  }
}
const report = {
  schema: "croquis-selected-profile-native-input/v1",
  sourceCapture: { path: capturePath, sha256: hash(capture), entryReturnConfigEqual: true, productionProfileEqual: true },
  scope: "Standalone recovered instruction evaluator with captured configuration and synthetic retained binary32 pressures; no CSP process access and no new tablet observation.",
  pressures, parameters, caseCount: cases.length,
  sources: Object.fromEntries([
    "apps/frontend/src/sticker-creation/canvas/post-correction/profile.ts",
    "apps/frontend/src/sticker-creation/canvas/post-correction/evaluator.ts",
    "apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts",
    "docs/research/clip-studio-paint-stabilization/spikes/post-joined/evaluator.ts",
    "docs/research/clip-studio-paint-stabilization/spikes/post-evaluator/native_oracle.py",
  ].map((path) => [path, hash(readFileSync(resolve(root, path)))])),
  cases,
};
writeFileSync(resolve(output, "inputs.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ pressures: pressures.length, parameters: parameters.length, cases: cases.length, capturedConfigMatchesProduction: true }));
