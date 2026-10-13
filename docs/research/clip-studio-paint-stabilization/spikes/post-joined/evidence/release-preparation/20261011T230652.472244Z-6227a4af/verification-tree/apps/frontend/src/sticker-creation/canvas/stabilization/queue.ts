/**
 * Shared ingestion order from CSP 0x1021367c0..0x1021369a8.
 * DataView retains the captured queue layout so this implementation runs in the
 * browser and against saved native fixture bytes without another arithmetic copy.
 */
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
} from "./arithmetic.ts";

function supported(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RangeError(message);
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

export class LiveQueue {
  readonly data: DataView;
  readonly history: Sample[];
  constructor(bytes: Uint8Array, initialHistoryOldestFirst: readonly Sample[] = []) {
    supported(bytes.byteLength === 236, "Live queue requires 236 state bytes");
    this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.history = initialHistoryOldestFirst.map((sample) => ({ ...sample }));
  }
  ingest(input: Ingestion): IngestionResult {
    const raw = this.data;
    if (input.bypass)
      return {
        emitted: true,
        phase: input.phase,
        output: { x: input.x, y: input.y, pressure: input.pressure },
      };
    const state = raw.getInt32(0x88, true);
    supported(state === 0 || state === 1 || state === 2, "Live queue state must be 0, 1, or 2");
    const pressure = extrapolateNonpositivePressure(
      input.pressure,
      state,
      raw.getFloat64(0xc8, true),
      raw.getFloat64(0xd0, true),
    );
    this.history.push({ x: input.x, y: input.y, pressure, timestamp: input.timestamp });
    if (this.history.length > 1000) this.history.shift();
    // Native deque pointers/front can change during allocation. The portable
    // history models record order/count, not allocator addresses or its index.
    raw.setBigUint64(0x30, BigInt(this.history.length), true);
    raw.setInt32(0x38, this.history.length, true);
    let current = { x: input.x, y: input.y, pressure };
    let oldest = input.timestamp;
    const stabilization = raw.getInt32(0x3c, true),
      initialWindow = raw.getInt32(0x50, true);
    const slow = raw.getInt32(0x44, true) !== 0;
    if (stabilization > 0 || slow) {
      let currentWindow = raw.getFloat64(0x58, true),
        canAverage = true;
      const newestFirst = [...this.history].reverse();
      if (raw.getInt32(0x40, true) !== 0 && this.history.length >= 2) {
        ({ currentWindow, canAverage } = adjustFastWindow({
          currentWindow,
          stabilization,
          initialWindow,
          distanceScale: raw.getFloat64(0x60, true),
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
          slowNumerator: raw.getInt32(0x48, true),
          slowThreshold: raw.getInt32(0x4c, true),
        }));
      } else currentWindow = adjustFixedWindow(currentWindow, stabilization, initialWindow, state);
      supported(
        Number.isFinite(currentWindow) && currentWindow >= 0 && currentWindow <= 1000,
        "computed H is outside bounded [0,1000] reference domain",
      );
      raw.setFloat64(0x58, currentWindow, true);
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
    raw.setBigUint64(0x80, BigInt.asUintN(64, oldest), true);
    const previous = { x: raw.getFloat64(0x90, true), y: raw.getFloat64(0x98, true) };
    const adjusted = adjustOutputPhase({
      phase: input.phase,
      state,
      timestampGate: raw.getInt32(0xe0, true) !== 0,
      current,
      pressure: current.pressure,
      previous,
      previousPrevious: { x: raw.getFloat64(0xa0, true), y: raw.getFloat64(0xa8, true) },
      previousPressure: raw.getFloat64(0xb0, true),
      limitDecline: raw.getInt32(0xd8, true) !== 0,
      retainAtZero: raw.getInt32(0xdc, true) !== 0,
      maximumDecline: raw.getFloat64(0x70, true),
      taper: raw.getInt32(0x68, true),
      currentWindow: raw.getFloat64(0x58, true),
    });
    raw.setInt32(0x88, adjusted.state, true);
    raw.setInt32(0xe0, Number(adjusted.timestampGate), true);
    const gate = evaluateOutputGate({
      gatingRequested: input.gating,
      phase: adjusted.phase,
      timestampGate: adjusted.timestampGate,
      currentTimestamp: input.timestamp,
      previousEmittedTimestamp: raw.getBigInt64(0x78, true),
      interval: input.interval,
      skippedCount: raw.getInt32(0xe4, true),
      rememberedSkippedCount: raw.getInt32(0xe8, true),
    });
    raw.setInt32(0xe4, gate.skippedCount, true);
    raw.setInt32(0xe8, gate.rememberedSkippedCount, true);
    raw.setBigUint64(0x78, BigInt.asUintN(64, gate.previousEmittedTimestamp), true);
    raw.setFloat64(0xa0, previous.x, true);
    raw.setFloat64(0xa8, previous.y, true);
    raw.setFloat64(0x90, adjusted.x, true);
    raw.setFloat64(0x98, adjusted.y, true);
    raw.setFloat64(0xd0, raw.getFloat64(0xc8, true), true);
    raw.setFloat64(0xc8, pressure, true);
    raw.setFloat64(0xb8, input.x, true);
    raw.setFloat64(0xc0, input.y, true);
    raw.setFloat64(0xb0, adjusted.pressure, true);
    return {
      emitted: gate.emit,
      phase: gate.emit ? adjusted.phase : input.phase,
      ...(gate.emit
        ? { output: { x: adjusted.x, y: adjusted.y, pressure: adjusted.pressure } }
        : {}),
    };
  }
}

/** Fresh native constructor/configuration state; history starts empty. */
export function createLiveQueue(
  stabilization: number,
  taper = 0,
  fast = false,
  slow = false,
): LiveQueue {
  supported(
    Number.isInteger(stabilization) && stabilization >= 0 && stabilization <= 1000,
    "Stabilization must be an integer from 0 through 1000",
  );
  supported(
    Number.isInteger(taper) && taper >= 0 && taper <= 1000,
    "Taper must be an integer from 0 through 1000",
  );
  const queue = new LiveQueue(new Uint8Array(236));
  const raw = queue.data;
  const config = configureLiveQueue(stabilization, taper, fast, slow);
  raw.setInt32(0x3c, stabilization, true);
  raw.setInt32(0x40, Number(config.fastMotion), true);
  raw.setInt32(0x44, Number(config.slowMotion), true);
  raw.setInt32(0x48, config.slowNumerator, true);
  raw.setInt32(0x4c, config.slowThreshold, true);
  raw.setInt32(0x50, config.initialWindow, true);
  raw.setFloat64(0x58, config.currentWindow, true);
  raw.setFloat64(0x60, config.distanceScale, true);
  raw.setInt32(0x68, taper, true);
  raw.setFloat64(0x70, config.maximumPressureDecline, true);
  raw.setInt32(0xe0, 1, true);
  return queue;
}
