/** Offline queue ingestion in the order of 0x1021367c0..0x1021369a8. */
import { Buffer } from "node:buffer";
import {
  configureLiveQueue,
  type Sample,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts";
import {
  LiveQueue,
  type Ingestion,
  type IngestionResult,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts";
export type {
  Ingestion,
  IngestionResult,
} from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts";

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

/** Capture validation and byte ownership; ingestion is the production queue. */
export class QueueReplay extends LiveQueue {
  raw: Buffer;
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
    const raw = Buffer.from(initialRaw);
    super(raw, initialHistoryOldestFirst);
    this.raw = raw;
  }
  override ingest(input: Ingestion): IngestionResult {
    let result: IngestionResult;
    try {
      result = super.ingest(input);
    } catch (error) {
      if (error instanceof RangeError) throw new ReplayError("unsupported_capture", error.message);
      throw error;
    }
    for (const [name, offset] of FLOAT_FIELDS)
      supported(
        Number.isFinite(this.raw.readDoubleLE(offset)),
        `computed ${name} became nonfinite; no finite-value substitution`,
      );
    return result;
  }
}
