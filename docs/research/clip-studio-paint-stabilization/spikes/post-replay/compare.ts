import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeText } from "./analyze.ts";

try {
  const args = process.argv.slice(2);
  if (!(args.length === 1 || (args.length === 3 && args[1] === "--out"))) {
    throw new Error(
      "Usage: node --experimental-strip-types compare.ts CAPTURE.jsonl [--out REPORT.json]",
    );
  }
  const report = analyzeText(readFileSync(args[0], "utf8"));
  const serialized = JSON.stringify(report, null, 2) + "\n";
  if (args[2]) {
    if (resolve(args[0]) === resolve(args[2]))
      throw new Error("Report output must not overwrite the capture input");
    writeFileSync(args[2], serialized, { flag: "wx" });
    console.log(
      `Capture integrity: ${report.integrity.status}; valid pairs: ${report.integrity.pairs}; arithmetic matches/mismatches: ${report.arithmeticSummary.matches}/${report.arithmeticSummary.mismatches}; whole-curve equivalence: not evaluated.`,
    );
    console.log(`Report saved: ${resolve(args[2])}`);
  } else process.stdout.write(serialized);
  process.exitCode =
    report.integrity.status === "valid" && report.arithmeticSummary.mismatches === 0 ? 0 : 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
