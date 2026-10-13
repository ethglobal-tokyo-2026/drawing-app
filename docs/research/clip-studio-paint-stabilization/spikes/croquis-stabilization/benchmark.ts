/** Bounded host measurement of the actual production adapter at 240 samples/second. */
import { writeFileSync } from "node:fs";
import { arch, cpus, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import { Stabilizer } from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilizer.ts";

const deadline = performance.now() + 30_000;
const rate = 240;
const count = 2400;
const packet = (index: number) => ({
  x: 200 + index * 0.35,
  y: 200 + Math.sin(index * 0.07) * 25 + Math.sin(index * 1.7),
  pressure: 0.4 + Math.sin(index * 0.05) * 0.2,
  t: (index * 1000) / rate,
});
function statistics(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (share: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * share) - 1)];
  return {
    count: sorted.length,
    meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: sorted.at(-1),
  };
}

const measurements = [0, 20, 35, 100].map((strength) => {
  const warm = new Stabilizer(packet(0), strength, true);
  for (let index = 1; index <= 480; index++) warm.add(packet(index));
  warm.finish({ ...packet(481), pressure: 0 });
  const adapter = new Stabilizer(packet(0), strength, true);
  const samples: number[] = [];
  const frames: number[] = [];
  let emitted = 1;
  let frameCost = 0;
  const started = performance.now();
  for (let index = 1; index <= count; index++) {
    if (performance.now() > deadline)
      throw new Error("The 240 Hz adapter benchmark exceeded 30 seconds");
    const input = packet(index);
    const before = performance.now();
    emitted += adapter.add(input).length;
    const elapsed = performance.now() - before;
    samples.push(elapsed);
    frameCost += elapsed;
    if (index % 4 === 0) {
      frames.push(frameCost);
      frameCost = 0;
    }
  }
  const releaseStarted = performance.now();
  const terminal = adapter.finish({ ...packet(count + 1), pressure: 0 });
  const releaseMs = performance.now() - releaseStarted;
  return {
    strength,
    samplesPerSecond: rate,
    inputCount: count,
    simulatedSeconds: count / rate,
    sample: statistics(samples),
    fourSampleFrame: statistics(frames),
    releaseMs,
    terminalOutputs: terminal.length,
    emitted: emitted + terminal.length,
    totalWallMs: performance.now() - started,
  };
});
const report = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  host: { architecture: arch(), platform: platform(), release: release(), cpu: cpus()[0]?.model },
  scope:
    "Actual production Stabilizer and BigInt binary64 fusion. Host Node measurement excludes rendering, browser event delivery, and device latency; it is not an iPad or Safari benchmark.",
  logicalSampleBudgetMs: 1000 / rate,
  logicalFourSampleFrameBudgetMs: 1000 / 60,
  measurements,
};
const json = JSON.stringify(report, null, 2) + "\n";
if (process.argv[2]) writeFileSync(process.argv[2], json, { flag: "wx" });
process.stdout.write(json);
