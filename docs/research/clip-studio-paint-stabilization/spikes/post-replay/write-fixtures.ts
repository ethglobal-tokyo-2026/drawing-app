import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analyzeText } from "./analyze.ts";
import { fixtureText, syntheticCapture } from "./fixture.ts";

const directory = new URL("./fixtures/", import.meta.url);
mkdirSync(directory, { recursive: true });
for (const [name, identity] of [
  ["synthetic-correction", false],
  ["synthetic-identity", true],
] as const) {
  const input = fixtureText(syntheticCapture(identity));
  const report = analyzeText(input);
  if (report.integrity.status !== "valid") throw new Error(JSON.stringify(report.integrity.errors));
  writeFileSync(new URL(`${name}.jsonl`, directory), input);
  writeFileSync(new URL(`${name}.report.json`, directory), JSON.stringify(report, null, 2) + "\n");
}
console.log(`Wrote two explicitly synthetic fixtures and reports to ${fileURLToPath(directory)}`);
