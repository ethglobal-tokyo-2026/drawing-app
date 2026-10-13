/** Offline queue ingestion in the order of 0x1021367c0..0x1021369a8. */
import { Buffer } from "node:buffer";
import {
  adjustFastWindow,
  adjustFixedWindow,
  adjustSlowWindow,
  averageFractionalHistory,
  adjustOutputPhase,
  evaluateOutputGate,
  extrapolateNonpositivePressure,
  configureLiveQueue,
  type Sample,
  type Phase,
  type QueueState,
} from "../../live-reference.ts";

export class ReplayError extends Error {
  category: "invalid_capture" | "unsupported_capture" | "incomplete_capture";
  constructor(category: ReplayError["category"], message: string) {
    super(message);
    this.name = "ReplayError";
    this.category = category;
  }
}
export function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ReplayError("invalid_capture", message);
}
export function supported(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ReplayError("unsupported_capture", message);
}
export const FLOAT_FIELDS = [
  ["window_H", 0x58],
  ["distance_scale", 0x60],
  ["maximum_pressure_decline", 0x70],
  ["processed_x", 0x90],
  ["processed_y", 0x98],
  ["previous_processed_x", 0xa0],
  ["previous_processed_y", 0xa8],
  ["processed_pressure", 0xb0],
  ["input_x", 0xb8],
  ["input_y", 0xc0],
  ["stored_input_pressure", 0xc8],
  ["older_stored_input_pressure", 0xd0],
] as const;
export const INT_FIELDS = [
  ["collected_count", 0x38],
  ["stabilization", 0x3c],
  ["fast_motion", 0x40],
  ["slow_motion", 0x44],
  ["slow_numerator", 0x48],
  ["slow_threshold", 0x4c],
  ["initial_window", 0x50],
  ["taper", 0x68],
  ["state", 0x88],
  ["limit_decline", 0xd8],
  ["retain_at_zero", 0xdc],
  ["timestamp_gate", 0xe0],
  ["suppressed_count", 0xe4],
  ["remembered_suppressed_count", 0xe8],
] as const;
export const BIGINT_FIELDS = [
  ["available_count", 0x30],
  ["last_emitted_timestamp", 0x78],
  ["oldest_whole_timestamp", 0x80],
] as const;

export function validateQueue(raw: Buffer, label: string): void {
  requireValid(raw.length === 236, `${label}: expected 236 common queue bytes`);
  const count = raw.readBigUInt64LE(0x30);
  requireValid(
    count <= 1000n && count === BigInt(raw.readInt32LE(0x38)),
    `${label}: history counts disagree or exceed 1000`,
  );
  requireValid([0, 1, 2].includes(raw.readInt32LE(0x88)), `${label}: unsupported queue state`);
  for (const [name, offset] of FLOAT_FIELDS)
    supported(Number.isFinite(raw.readDoubleLE(offset)), `${label}.${name}: nonfinite queue value`);
  for (const offset of [0x40, 0x44, 0xd8, 0xdc, 0xe0])
    supported(
      [0, 1].includes(raw.readInt32LE(offset)),
      `${label}: unsupported flag at +0x${offset.toString(16)}`,
    );
  const stabilization = raw.readInt32LE(0x3c),
    taper = raw.readInt32LE(0x68);
  supported(
    stabilization >= 0 && stabilization <= 1000 && taper >= 0 && taper <= 1000,
    `${label}: supported configuration requires 0 <= S,T <= 1000; no substitute settings applied`,
  );
  const config = configureLiveQueue(
    stabilization,
    taper,
    raw.readInt32LE(0x40) !== 0,
    raw.readInt32LE(0x44) !== 0,
  );
  supported(
    raw.readInt32LE(0x50) === config.initialWindow &&
      raw.readInt32LE(0x48) === 200 &&
      raw.readInt32LE(0x4c) === 25 &&
      raw.readInt32LE(0x40) === Number(config.fastMotion) &&
      raw.readInt32LE(0x44) === Number(config.slowMotion) &&
      Object.is(raw.readDoubleLE(0x60), config.distanceScale) &&
      Object.is(raw.readDoubleLE(0x70), config.maximumPressureDecline),
    `${label}: configuration differs from recovered configureLiveQueue constants/formulas`,
  );
  supported(
    raw.readDoubleLE(0x58) >= 0 && raw.readDoubleLE(0x58) <= 1000,
    `${label}: H outside bounded [0,1000] reference domain`,
  );
}

export type Ingestion = Sample & {
  phase: Phase;
  catchUp: boolean;
  gating: boolean;
  interval: bigint;
  bypass: boolean;
};
export type IngestionResult = {
  emitted: boolean;
  phase: Phase;
  output?: { x: number; y: number; pressure: number };
};

export class QueueReplay {
  raw: Buffer;
  history: Sample[];
  constructor(initialRaw: Buffer, initialHistoryOldestFirst: readonly Sample[]) {
    validateQueue(initialRaw, "initial queue");
    requireValid(
      initialHistoryOldestFirst.length === Number(initialRaw.readBigUInt64LE(0x30)),
      "initial history does not match queue count",
    );
    for (const sample of initialHistoryOldestFirst)
      requireValid(
        [sample.x, sample.y, sample.pressure].every(Number.isFinite),
        "initial history contains nonfinite sample",
      );
    this.raw = Buffer.from(initialRaw);
    this.history = initialHistoryOldestFirst.map((sample) => ({ ...sample }));
  }
  ingest(input: Ingestion): IngestionResult {
    const raw = this.raw;
    if (input.bypass)
      return {
        emitted: true,
        phase: input.phase,
        output: { x: input.x, y: input.y, pressure: input.pressure },
      };
    const state = raw.readInt32LE(0x88) as QueueState;
    const pressure = extrapolateNonpositivePressure(
      input.pressure,
      state,
      raw.readDoubleLE(0xc8),
      raw.readDoubleLE(0xd0),
    );
    this.history.push({ x: input.x, y: input.y, pressure, timestamp: input.timestamp });
    if (this.history.length > 1000) this.history.shift();
    // Native deque pointers/front can change during allocation. The portable
    // history models record order/count, not allocator addresses or its index.
    raw.writeBigUInt64LE(BigInt(this.history.length), 0x30);
    raw.writeInt32LE(this.history.length, 0x38);
    let current = { x: input.x, y: input.y, pressure };
    let oldest = input.timestamp;
    const stabilization = raw.readInt32LE(0x3c),
      initialWindow = raw.readInt32LE(0x50);
    const slow = raw.readInt32LE(0x44) !== 0;
    if (stabilization > 0 || slow) {
      let currentWindow = raw.readDoubleLE(0x58),
        canAverage = true;
      const newestFirst = [...this.history].reverse();
      if (raw.readInt32LE(0x40) !== 0 && this.history.length >= 2) {
        ({ currentWindow, canAverage } = adjustFastWindow({
          currentWindow,
          stabilization,
          initialWindow,
          distanceScale: raw.readDoubleLE(0x60),
          state,
          previousInput: newestFirst[1],
          currentPosition: input,
          currentTimestamp: input.timestamp,
        }));
      } else if (slow && stabilization <= 30) {
        ({ currentWindow, canAverage } = adjustSlowWindow({
          currentWindow,
          stabilization,
          initialWindow,
          state,
          catchUpArgument: input.catchUp,
          collectedCount: this.history.length,
          historyNewestFirst: newestFirst,
          slowNumerator: raw.readInt32LE(0x48),
          slowThreshold: raw.readInt32LE(0x4c),
        }));
      } else currentWindow = adjustFixedWindow(currentWindow, stabilization, initialWindow, state);
      supported(
        Number.isFinite(currentWindow) && currentWindow >= 0 && currentWindow <= 1000,
        "computed H is outside bounded [0,1000] reference domain",
      );
      raw.writeDoubleLE(currentWindow, 0x58);
      if (canAverage) {
        supported(
          currentWindow >= 1,
          "fixed/fast subunit-window arithmetic is outside the existing reference helper domain",
        );
        const averaged = averageFractionalHistory(newestFirst, currentWindow, input.timestamp);
        if (averaged) {
          current = { x: averaged.x, y: averaged.y, pressure: averaged.pressure };
          oldest = averaged.oldestWholeSampleTimestamp;
        }
      }
    }
    raw.writeBigUInt64LE(BigInt.asUintN(64, oldest), 0x80);
    const previous = { x: raw.readDoubleLE(0x90), y: raw.readDoubleLE(0x98) };
    const adjusted = adjustOutputPhase({
      phase: input.phase,
      state,
      timestampGate: raw.readInt32LE(0xe0) !== 0,
      current,
      pressure: current.pressure,
      previous,
      previousPrevious: { x: raw.readDoubleLE(0xa0), y: raw.readDoubleLE(0xa8) },
      previousPressure: raw.readDoubleLE(0xb0),
      limitDecline: raw.readInt32LE(0xd8) !== 0,
      retainAtZero: raw.readInt32LE(0xdc) !== 0,
      maximumDecline: raw.readDoubleLE(0x70),
      taper: raw.readInt32LE(0x68),
      currentWindow: raw.readDoubleLE(0x58),
    });
    raw.writeInt32LE(adjusted.state, 0x88);
    raw.writeInt32LE(Number(adjusted.timestampGate), 0xe0);
    const gate = evaluateOutputGate({
      gatingRequested: input.gating,
      phase: adjusted.phase,
      timestampGate: adjusted.timestampGate,
      currentTimestamp: input.timestamp,
      previousEmittedTimestamp: raw.readBigInt64LE(0x78),
      interval: input.interval,
      skippedCount: raw.readInt32LE(0xe4),
      rememberedSkippedCount: raw.readInt32LE(0xe8),
    });
    raw.writeInt32LE(gate.skippedCount, 0xe4);
    raw.writeInt32LE(gate.rememberedSkippedCount, 0xe8);
    raw.writeBigUInt64LE(BigInt.asUintN(64, gate.previousEmittedTimestamp), 0x78);
    raw.writeDoubleLE(previous.x, 0xa0);
    raw.writeDoubleLE(previous.y, 0xa8);
    raw.writeDoubleLE(adjusted.x, 0x90);
    raw.writeDoubleLE(adjusted.y, 0x98);
    raw.writeDoubleLE(raw.readDoubleLE(0xc8), 0xd0);
    raw.writeDoubleLE(pressure, 0xc8);
    raw.writeDoubleLE(input.x, 0xb8);
    raw.writeDoubleLE(input.y, 0xc0);
    raw.writeDoubleLE(adjusted.pressure, 0xb0);
    for (const [name, offset] of FLOAT_FIELDS)
      supported(
        Number.isFinite(raw.readDoubleLE(offset)),
        `computed ${name} became nonfinite; no finite-value substitution`,
      );
    return {
      emitted: gate.emit,
      phase: gate.emit ? adjusted.phase : input.phase,
      ...(gate.emit
        ? { output: { x: adjusted.x, y: adjusted.y, pressure: adjusted.pressure } }
        : {}),
    };
  }
}
