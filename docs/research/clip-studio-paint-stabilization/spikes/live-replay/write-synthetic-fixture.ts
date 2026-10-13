/** Explicitly requested synthetic fixture file; never a runtime capture. */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { jsonl, syntheticRows } from "./synthetic-fixtures.ts";
if (process.argv.length !== 3)
  throw new Error("Usage: node write-synthetic-fixture.ts OUTPUT.jsonl");
const destination = resolve(process.argv[2]);
await writeFile(destination, jsonl(syntheticRows()), { flag: "wx" });
process.stdout.write(`Saved synthetic fixture, not CSP runtime evidence: ${destination}\n`);
