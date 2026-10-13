/** Offline-only CLI. Never attaches, launches, reads a process, or supplies input. */
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readCapture, MAX_CAPTURE_BYTES } from "./reader.ts";
import { replayCapture, LIMITATIONS } from "./compare.ts";
import { ReplayError } from "./queue.ts";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  process.stdout.write(
    "Usage: node compare-capture.ts CAPTURE.jsonl [--report REPORT.json]\nReads a saved capture only. Without --report, JSON is written to stdout.\nExit 0: exact compared fields; 1: differences; 2: invalid/incomplete/unsupported capture or I/O error.\nReports use exclusive creation and never overwrite a file.\n",
  );
} else {
  let report: unknown;
  let output: string | undefined;
  let exitCode = 2;
  try {
    if (!(args.length === 1 || (args.length === 3 && args[1] === "--report")))
      throw new Error("Usage: node compare-capture.ts CAPTURE.jsonl [--report REPORT.json]");
    const input = resolve(args[0]);
    output = args.length === 3 ? resolve(args[2]) : undefined;
    if (output === input) throw new Error("Report path must differ from the read-only input file");
    const information = await stat(input);
    if (!information.isFile() || information.size > MAX_CAPTURE_BYTES)
      throw new Error(`Input must be a regular file no larger than ${MAX_CAPTURE_BYTES} bytes`);
    report = replayCapture(readCapture(await readFile(input, "utf8")));
    exitCode = (report as { status: string }).status === "exact_match" ? 0 : 1;
  } catch (error) {
    report = {
      schemaVersion: 1,
      status: error instanceof ReplayError ? error.category : "io_or_usage_error",
      nativeRuntimeValidated: false,
      error: error instanceof Error ? error.message : String(error),
      limitations: LIMITATIONS,
    };
  }
  const result = JSON.stringify(report, null, 2) + "\n";
  try {
    if (output) {
      await writeFile(output, result, { flag: "wx" });
      process.stdout.write(`Saved offline comparison report: ${output}\n`);
    } else process.stdout.write(result);
  } catch (error) {
    process.stderr.write(
      `Could not save report: ${error instanceof Error ? error.message : String(error)}\n${result}`,
    );
    exitCode = 2;
  }
  process.exitCode = exitCode;
}
