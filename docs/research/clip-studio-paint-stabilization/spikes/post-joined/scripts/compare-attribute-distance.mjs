#!/usr/bin/env node
/** Local-only cross-engine diagnosis of the saved production width discrepancy. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), "..");
const source = "/Users/adoll/.codex/worktrees/csp-stabilization-release/drawing-app";
const inputPath = resolve(root, "evidence/production-smoke-2026-10-11T23-34-53.439Z-9573597d-730b-408d-9f4d-3029ad408111/report.json");
const output = resolve(root, "evidence/attribute-distance-20261011");
const inputBytes = await readFile(inputPath);
const smoke = JSON.parse(inputBytes);
const corePath = resolve(source, "apps/frontend/src/sticker-creation/canvas/post-correction/core.ts");
const gitRead = (path) => execFileSync("git", ["show", `${smoke.commit}:${path}`], { cwd: source, timeout: 10000 });
const coreBytes = gitRead("apps/frontend/src/sticker-creation/canvas/post-correction/core.ts");
const validationBytes = gitRead("apps/frontend/src/sticker-creation/canvas/post-correction/validation.ts");
const adapterText = coreBytes.toString().split("export function transferStrokeAttributes")[1].split("export function correctPostStroke")[0].trim();
const validationText = validationBytes.toString().split("export function validatePostCorrectionPoints")[1].trim();
const { chromium, webkit } = await import(pathToFileURL(resolve(source, "apps/frontend/node_modules/@playwright/test/index.mjs")).href);
const sha = (data) => createHash("sha256").update(data).digest("hex");
const argument = {
  adapter: stripTypeScriptTypes(`function transferStrokeAttributes${adapterText}`),
  validate: stripTypeScriptTypes(`function validatePostCorrectionPoints${validationText}`),
  cases: smoke.cases.map((test) => ({
    name: test.name,
    renderedPoints: test.input.renderedPoints,
    geometry: test.expected.flatMap((value, index, values) => index % 4 === 0 ? [{ x: value, y: values[index + 1] }] : []),
  })),
};
assert.equal((argument.adapter.match(/Math\.hypot\(/g) ?? []).length, 2);

// This exact function executes in Node and in fresh browser pages without network requests.
function inspect({ adapter, validate, cases }) {
  const bits = (value) => {
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value);
    return view.getBigUint64(0).toString(16).padStart(16, "0");
  };
  function portable(dx, dy) {
    const scale = Math.max(Math.abs(dx), Math.abs(dy));
    if (scale === 0 || !Number.isFinite(scale)) return scale;
    const x = dx / scale;
    const y = dy / scale;
    return scale * Math.sqrt(x * x + y * y);
  }
  const prelude = `const MAX_POINTS=50000, MAX_POST_POINTS=50000; class PostCorrectionError extends Error {}; function ensure(condition,message){if(!condition)throw new PostCorrectionError(message)}; ${validate}; ${portable.toString()};`;
  const oldAdapter = new Function(`${prelude};return (${adapter});`)();
  const newAdapter = new Function(`${prelude};return (${adapter.replaceAll("Math.hypot(", "portable(")});`)();
  return cases.map(({ name, geometry, renderedPoints }) => {
    const source = renderedPoints.flatMap((value, index, values) => index % 4 === 0 ? [{ x: value, y: values[index + 1] }] : []);
    const distances = (points, norm) => {
      let cumulative = 0;
      return points.slice(1).map((point, index) => {
        const dx = point.x - points[index].x;
        const dy = point.y - points[index].y;
        const value = norm(dx, dy);
        cumulative += value;
        return { index, dx, dy, dxBits: bits(dx), dyBits: bits(dy), value, bits: bits(value), cumulative, cumulativeBits: bits(cumulative) };
      });
    };
    const result = { name };
    for (const [kind, norm, evaluate] of [["hypot", Math.hypot, oldAdapter], ["portable", portable, newAdapter]]) {
      const points = evaluate(geometry, renderedPoints);
      result[kind] = { source: distances(source, norm), corrected: distances(geometry, norm), points, bits: points.map(bits) };
    }
    return result;
  });
}

const report = {
  schema: "croquis-attribute-distance-comparison/v1",
  startedAt: new Date().toISOString(),
  scope: "Saved source coordinates and corrected geometry only. Actual adapter function body evaluated without modification, then with only Math.hypot replaced. No native geometry execution or production mutation.",
  input: { path: inputPath, sha256: sha(inputBytes), commit: smoke.commit },
  core: { path: corePath, commit: smoke.commit, sha256: sha(coreBytes), readFrom: "git show at the recorded deployed commit" },
  scriptSha256: sha(await readFile(script)),
  runtimes: [{ name: "node", version: process.version, cases: inspect(argument) }],
  differences: [],
  checks: {},
};
await mkdir(output, { recursive: true });
const save = () => writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
const deadline = setTimeout(() => { report.error = "Comparison exceeded its 60-second deadline."; void save().finally(() => process.exit(1)); }, 60_000);
try {
  for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await type.launch({ headless: true, timeout: 15000 });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);
      report.runtimes.push({ name, version: browser.version(), cases: await page.evaluate(inspect, argument) });
    } finally {
      await browser.close();
    }
  }
  const baseline = report.runtimes[0];
  for (const runtime of report.runtimes.slice(1)) {
    for (let c = 0; c < baseline.cases.length; c++) {
      for (const kind of ["hypot", "portable"]) {
        const expected = baseline.cases[c][kind];
        const actual = runtime.cases[c][kind];
        for (const list of ["source", "corrected"])
          expected[list].forEach((value, index) => {
            for (const field of ["bits", "cumulativeBits"])
              if (value[field] !== actual[list][index][field]) report.differences.push({ runtime: runtime.name, case: baseline.cases[c].name, kind, list, index, field, expected: value[field], actual: actual[list][index][field] });
          });
        expected.bits.forEach((value, index) => {
          if (value !== actual.bits[index]) report.differences.push({ runtime: runtime.name, case: baseline.cases[c].name, kind, list: "output", index, field: ["x", "y", "width", "time"][index % 4], expected: value, actual: actual.bits[index] });
        });
      }
    }
  }
  report.checks.nodeOriginalMatchesSavedExpected = baseline.cases.every((test, index) => JSON.stringify(test.hypot.bits) === JSON.stringify(smoke.cases[index].expectedBits));
  const observed = smoke.browsers.find((browser) => browser.name === "webkit").cases.find((test) => test.name === "light");
  const reproduced = report.runtimes.find((runtime) => runtime.name === "webkit").cases.find((test) => test.name === "light");
  report.checks.webkitOriginalMatchesSavedActual = JSON.stringify(reproduced.hypot.bits) === JSON.stringify(observed.bits);
  report.checks.portableAllExactAcrossThreeRuntimes = !report.differences.some((difference) => difference.kind === "portable");
  assert.ok(Object.values(report.checks).every(Boolean));
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  clearTimeout(deadline);
  await save();
  console.log(JSON.stringify({ path: resolve(output, "report.json"), status: report.status, checks: report.checks, differences: report.differences }, null, 2));
}
