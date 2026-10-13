/** Compare saved standalone native window results with authoritative arithmetic. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  adjustFastWindow,
  adjustFixedWindow,
  adjustSlowWindow,
  averageFractionalHistory,
  configureLiveQueue,
  type QueueState,
  type Sample,
} from "../../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts";
import { createLiveQueue } from "../../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts";

const path = new URL("./live-modes-native.json", import.meta.url);
const bytes = readFileSync(path);
interface Case {
  mode: "fixed" | "fast" | "slow";
  stabilization: number;
  taper: number;
  state: QueueState;
  catchUp: boolean;
  currentWindow: number;
  timestamp: string;
  history: { x: number; y: number; pressure: number; timestamp: string }[];
  native: string[];
}
const saved = JSON.parse(bytes.toString()) as { cases: Case[] };
const bits = (value: number) => {
  const data = Buffer.alloc(8);
  data.writeDoubleBE(value);
  return data.toString("hex");
};
const differences: { index: number; mode: string; expected: string[]; actual: string[] }[] = [];
const modes = { fixed: 0, fast: 0, slow: 0 };
let subunitSlow = 0;
for (const [index, entry] of saved.cases.entries()) {
  modes[entry.mode]++;
  const config = configureLiveQueue(
    entry.stabilization,
    entry.taper,
    entry.mode === "fast",
    entry.mode === "slow",
  );
  const history: Sample[] = entry.history.map((p) => ({ ...p, timestamp: BigInt(p.timestamp) }));
  const newestFirst = history.toReversed();
  const input = newestFirst[0];
  const timestamp = BigInt(entry.timestamp);
  let currentWindow = entry.currentWindow;
  let canAverage = true;
  if (config.fastMotion && history.length >= 2) {
    ({ currentWindow, canAverage } = adjustFastWindow({
      ...entry,
      initialWindow: config.initialWindow,
      distanceScale: config.distanceScale,
      previousInput: newestFirst[1],
      currentPosition: input,
      currentTimestamp: timestamp,
    }));
  } else if (config.slowMotion && entry.stabilization <= 30) {
    ({ currentWindow, canAverage } = adjustSlowWindow({
      ...entry,
      initialWindow: config.initialWindow,
      catchUpArgument: entry.catchUp,
      collectedCount: history.length,
      historyNewestFirst: newestFirst,
      slowNumerator: config.slowNumerator,
      slowThreshold: config.slowThreshold,
    }));
    if (currentWindow < 1) subunitSlow++;
  } else {
    currentWindow = adjustFixedWindow(
      currentWindow,
      entry.stabilization,
      config.initialWindow,
      entry.state,
    );
  }
  const average = canAverage
    ? averageFractionalHistory(newestFirst, currentWindow, timestamp)
    : null;
  const output = average ?? input;
  const oldest = average?.oldestWholeSampleTimestamp ?? timestamp;
  const actual = [
    String(Number(average !== null)),
    bits(currentWindow),
    BigInt.asUintN(64, oldest).toString(16).padStart(16, "0"),
    bits(output.x),
    bits(output.y),
    bits(output.pressure),
  ];
  if (actual.some((value, field) => value !== entry.native[field]))
    differences.push({ index, mode: entry.mode, expected: entry.native, actual });
}

// Fresh production queues across every supported UI strength. The native
// comparison above proves only the window stage; this checks adapter reachability.
const started = performance.now();
let sequences = 0;
let ingestions = 0;
let belowOne = 0;
const failures: { mode: string; strength: number; pattern: number; message: string }[] = [];
for (const mode of ["fixed", "fast", "slow"] as const) {
  for (let strength = 0; strength <= 100; strength++) {
    for (let pattern = 0; pattern < 3; pattern++) {
      if (performance.now() - started > 30000)
        throw new Error("Live mode probe exceeded 30 seconds");
      sequences++;
      const queue = createLiveQueue(strength, 0, mode === "fast", mode === "slow");
      try {
        for (let i = 0; i < 48; i++) {
          const point = {
            x: pattern === 0 ? 0 : pattern === 1 ? i * 0.125 : (i % 9) * 500,
            y: pattern === 2 ? (i % 7) * 50 : 0,
            pressure: pattern === 2 && i % 13 < 3 ? 0 : 0.5,
            timestamp: BigInt(100 + i * (pattern === 2 ? 1001 : 8)),
          };
          queue.ingest({
            ...point,
            phase: 2,
            catchUp: false,
            gating: true,
            interval: 0n,
            bypass: false,
          });
          ingestions++;
          if (queue.data.getFloat64(0x58, true) < 1) belowOne++;
        }
      } catch (error) {
        failures.push({ mode, strength, pattern, message: String(error) });
      }
    }
  }
}
const report = {
  nativeFixtureSha256: createHash("sha256").update(bytes).digest("hex"),
  sourceSha256: Object.fromEntries(
    ["arithmetic.ts", "queue.ts"].map((name) => [
      name,
      createHash("sha256")
        .update(
          readFileSync(
            new URL(
              `../../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/${name}`,
              import.meta.url,
            ),
          ),
        )
        .digest("hex"),
    ]),
  ),
  nativeComparison: { cases: saved.cases.length, modes, subunitSlow, differences },
  productionReachability: {
    sequences,
    ingestions,
    belowOne,
    failures,
    elapsedMilliseconds: performance.now() - started,
  },
  scope:
    "Original native window/configuration instructions only, with synthetic deque storage. Production probe exercises contact ingestion, not a native capture or browser release test.",
};
writeFileSync(
  new URL("./live-modes-comparison.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (differences.length || failures.length) process.exitCode = 1;
