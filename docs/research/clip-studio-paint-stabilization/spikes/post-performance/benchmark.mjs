/** No local application servers: execute the same pure bundle in isolated test browsers. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { build } from "../../../../../apps/frontend/node_modules/vite/dist/node/index.js";
import {
  chromium,
  webkit,
} from "../../../../../apps/frontend/node_modules/@playwright/test/index.mjs";
import { benchmark, syntheticCases } from "./benchmark-core.ts";
import { decodePostCapture } from "../post-pipeline/replay.ts";

const reportPath = process.argv[2];
if (!reportPath) throw new Error("Pass a new report path");
const decoded = decodePostCapture(
  readFileSync(
    new URL(
      "../../evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl",
      import.meta.url,
    ),
    "utf8",
  ),
);
const cases = [
  {
    name: "saved-native-99",
    input: decoded.input,
    endpoint: { pathParameter: decoded.pathParameter, evaluator: decoded.evaluator },
  },
  ...syntheticCases(decoded.input),
];
const report = {
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  cpu: cpus()[0]?.model,
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
  nodeResult: benchmark(cases),
  browsers: [],
};
const output = await build({
  configFile: false,
  logLevel: "error",
  build: {
    write: false,
    minify: true,
    lib: {
      entry: fileURLToPath(new URL("./benchmark-core.ts", import.meta.url)),
      name: "PostBenchmark",
      formats: ["iife"],
    },
  },
});
const built = Array.isArray(output) ? output[0] : output;
if (!("output" in built)) throw new Error("Expected a bundled output");
const chunk = built.output.find((item) => item.type === "chunk");
if (!chunk) throw new Error("Missing benchmark bundle");
const browsers = [];
report.browsers = browsers;
let failed = false;
for (const [name, type] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  let browser;
  const timeout = setTimeout(() => {
    if (browser) void browser.close();
  }, 45000);
  try {
    browser = await type.launch({ headless: true, timeout: 15000 });
    const page = await browser.newPage();
    await page.addScriptTag({ content: chunk.code });
    const result = await page.evaluate((input) => {
      return globalThis.PostBenchmark.benchmark(input);
    }, cases);
    const expected = report.nodeResult.rows;
    result.rows.forEach((row, index) =>
      assert.deepEqual(row.outputNodes, expected[index].outputNodes),
    );
    browsers.push({ name, version: browser.version(), ...result });
  } catch (error) {
    failed = true;
    browsers.push({ name, error: String(error) });
  } finally {
    clearTimeout(timeout);
    await browser?.close();
  }
}
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    node: report.nodeResult.rows.map(({ name, milliseconds }) => ({ name, milliseconds })),
    browsers,
  }),
);
if (failed) process.exitCode = 1;
