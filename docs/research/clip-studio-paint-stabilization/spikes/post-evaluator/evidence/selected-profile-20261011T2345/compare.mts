import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const output = dirname(fileURLToPath(import.meta.url));
const load = (path: string) => import(pathToFileURL(resolve(root, path)).href);
const { evaluatePostEndpoint, evaluatePostResponseCurve } = await load("apps/frontend/src/sticker-creation/canvas/post-correction/evaluator.ts");
const { SELECTED_ROUND_BRUSH_PROFILE } = await load("apps/frontend/src/sticker-creation/canvas/post-correction/profile.ts");
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const inputBytes = readFileSync(resolve(output, "inputs.json"));
const nativeBytes = readFileSync(resolve(output, "native-vectors.json"));
const inputs = JSON.parse(inputBytes.toString("utf8"));
const native = JSON.parse(nativeBytes.toString("utf8"));
for (const [path, expected] of Object.entries(inputs.sources)) assert.equal(hash(readFileSync(resolve(root, path))), expected, path);
assert.equal(native.fpcr, "0x0");
assert.equal(native.binarySha256, "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd");
assert.equal(native.unchangedInstructionsChecked, 364);
assert.equal(native.relocatedInstructionsChecked, 84);
assert.equal(native.cases.length, inputs.caseCount);
const bits = (value: number) => { const bytes = Buffer.alloc(8); bytes.writeDoubleBE(value); return bytes.toString("hex"); };
const failures = [];
const outputs = [];
for (let i = 0; i < native.cases.length; i++) {
  const { outputBits, ...c } = native.cases[i];
  assert.deepEqual(c, inputs.cases[i], `native case input ${i}`);
  if (c.mode === "E") assert.deepEqual(c.config, SELECTED_ROUND_BRUSH_PROFILE.evaluator);
  const actual = c.mode === "C"
    ? evaluatePostResponseCurve(SELECTED_ROUND_BRUSH_PROFILE.evaluator.main.curves[0], c.parameter)
    : evaluatePostEndpoint(c.node, c.parameter, SELECTED_ROUND_BRUSH_PROFILE.evaluator);
  const result = { name: c.name, mode: c.mode, nativeBits: outputBits, productionBits: bits(actual), exact: bits(actual) === outputBits };
  outputs.push(result);
  if (!result.exact) failures.push(result);
}
const report = {
  schema: "croquis-selected-profile-native-comparison/v1", checkedAt: new Date().toISOString(),
  inputSha256: hash(inputBytes), nativeSha256: hash(nativeBytes), sources: inputs.sources,
  scope: inputs.scope, sourceCapture: inputs.sourceCapture,
  fpcr: native.fpcr, unchangedInstructionsChecked: native.unchangedInstructionsChecked,
  relocatedInstructionsChecked: native.relocatedInstructionsChecked,
  pressureCount: inputs.pressures.length, parameters: inputs.parameters,
  caseCount: outputs.length, curveCount: outputs.filter((c) => c.mode === "C").length,
  endpointCount: outputs.filter((c) => c.mode === "E").length,
  exactMatches: outputs.length - failures.length, failures, outputs,
};
writeFileSync(resolve(output, "comparison.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ caseCount: report.caseCount, curveCount: report.curveCount, endpointCount: report.endpointCount, exactMatches: report.exactMatches, failures: failures.length }));
assert.equal(failures.length, 0, "Standalone selected-profile native mismatches");
