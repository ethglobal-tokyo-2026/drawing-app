/** Bounded full saved-case performance regression; output remains bit-exact. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { replayPostCapture } from "../post-pipeline/replay.ts";

const reportPath = process.argv[2];
if (!reportPath) throw new Error("Pass a new report path");
const text = readFileSync(
  new URL(
    "../../evidence/debugger-access/post-mouse-manual-20261010T184049Z/pid-21351.jsonl",
    import.meta.url,
  ),
  "utf8",
);
const started = performance.now();
const comparison = replayPostCapture(text, { deadlineMilliseconds: 30000 });
const milliseconds = performance.now() - started;
const report = {
  targetMilliseconds: 1000,
  milliseconds,
  withinBudget: milliseconds < 1000,
  comparison,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({ milliseconds, withinBudget: report.withinBudget, status: comparison.status }),
);
assert.equal(comparison.status, "match");
assert.ok(report.withinBudget, `Saved post case exceeded 1000 ms: ${milliseconds}`);
