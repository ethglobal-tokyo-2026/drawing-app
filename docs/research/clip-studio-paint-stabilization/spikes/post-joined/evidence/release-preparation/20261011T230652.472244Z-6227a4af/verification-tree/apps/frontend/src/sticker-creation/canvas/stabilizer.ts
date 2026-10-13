import { terminalPrefeedCount, type Phase } from "./stabilization/arithmetic.ts";
import { createLiveQueue, type LiveQueue } from "./stabilization/queue.ts";

/** The existing Smoothing control and saved sessions use integer strength 0 through 100. */
export const FIRST_SMOOTHING = 35;
export const SMOOTHING_MODES = ["fixed", "slow", "fast"] as const;
export type SmoothingMode = (typeof SMOOTHING_MODES)[number];
export const FIRST_SMOOTHING_MODE: SmoothingMode = "fixed";
/** Browser safety bound, not a recovered CSP constant. No endpoint is fabricated on failure. */
const MAX_RELEASE_PACKETS = 2048;

/** Local CSS coordinates, reported pressure, and the original browser timestamp in milliseconds. */
export interface StabilizerSample {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

/** The queue's emitted phase, distinct from the acquisition packet's phase. */
export interface StabilizerOutput extends StabilizerSample {
  phase: Phase;
}

export class StabilizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StabilizationError";
  }
}

function validate(sample: StabilizerSample): void {
  if (
    ![sample.x, sample.y, sample.pressure, sample.t].every(Number.isFinite) ||
    sample.pressure < 0 ||
    sample.pressure > 1 ||
    !Number.isSafeInteger(Math.trunc(sample.t))
  )
    throw new StabilizationError(
      "The pointer supplied an invalid position, pressure, or timestamp.",
    );
}

/**
 * Browser adapter around the reconstructed native packet queue. Contact packets
 * average position and pressure together; display frames never invent packets.
 * Pen input can select the native fixed, slow, or fast window. Mouse and touch
 * retain fixed mode; their native producer routes differ from the digitizer.
 * Taper and the captured interval are zero. Browser acquisition and empty initial hover history are
 * application choices, not a claim of identical CSP input or pen feel.
 */
export class Stabilizer {
  readonly initial: StabilizerOutput;
  private readonly queue: LiveQueue;
  private readonly pen: boolean;
  private readonly interval: bigint;
  private latest: StabilizerOutput;
  private closed = false;

  constructor(
    first: StabilizerSample,
    smoothing: number,
    pen: boolean,
    interval = 0n,
    mode: SmoothingMode = FIRST_SMOOTHING_MODE,
  ) {
    validate(first);
    if (!Number.isFinite(smoothing))
      throw new StabilizationError("The stabilization strength is not finite.");
    if (!SMOOTHING_MODES.includes(mode))
      throw new StabilizationError("The stabilization speed mode is invalid.");
    this.queue = createLiveQueue(
      Math.round(Math.max(0, Math.min(100, smoothing))),
      0,
      pen && mode === "fast",
      pen && mode === "slow",
    );
    this.queue.data.setInt32(0xd8, 1, true);
    this.pen = pen;
    this.interval = interval;
    this.latest = { ...first, phase: 2 };
    const initial = this.ingest({ ...first, pressure: pen ? first.pressure : 1 }, 2, true);
    if (!initial) throw new StabilizationError("The initial stabilization packet was suppressed.");
    this.initial = initial;
  }

  /** Latest emitted point; the curve must end here rather than at the unfiltered pointer. */
  get position(): StabilizerOutput {
    return this.latest;
  }

  /** A native-style contact packet may be suppressed while still advancing queue state. */
  add(sample: StabilizerSample): StabilizerOutput[] {
    if (this.closed) return [];
    validate(sample);
    const output = this.ingest({ ...sample, pressure: this.pen ? sample.pressure : 1 }, 2, true);
    return output ? [output] : [];
  }

  /**
   * Recovered release prefeed, then an explicit zero-pressure flush when needed.
   * All generated outputs retain the actual lift's time. Browser input ends at
   * pointerup, so a pending native ending is completed synchronously here.
   */
  finish(sample: StabilizerSample): StabilizerOutput[] {
    if (this.closed) return [];
    validate(sample);
    this.closed = true;
    const raw = this.queue.data;
    raw.setInt32(0xe0, 0, true);
    const outputs: StabilizerOutput[] = [];
    const count = terminalPrefeedCount(raw.getFloat64(0x58, true), raw.getInt32(0x68, true));
    for (let index = 0; index < count; index++) {
      const output = this.ingest(sample, 1, true);
      if (output) outputs.push(output);
      if (raw.getInt32(0x88, true) === 0) return outputs;
    }
    const released = this.ingest(sample, 3, true);
    if (released) outputs.push(released);
    if (raw.getInt32(0x88, true) === 0) return outputs;
    raw.setInt32(0x88, 2, true);
    raw.setInt32(0xe0, 0, true);
    for (let index = outputs.length; index < MAX_RELEASE_PACKETS; index++) {
      const output = this.ingest({ ...sample, pressure: 0 }, 1, false);
      if (output) outputs.push(output);
      if (raw.getInt32(0x88, true) === 0) return outputs;
    }
    throw new StabilizationError(
      "Stabilization could not complete this stroke within its release limit.",
    );
  }

  private ingest(sample: StabilizerSample, phase: Phase, gating: boolean): StabilizerOutput | null {
    let result;
    try {
      result = this.queue.ingest({
        x: sample.x,
        y: sample.y,
        pressure: sample.pressure,
        timestamp: BigInt(Math.trunc(sample.t)),
        phase,
        catchUp: false,
        gating,
        interval: this.interval,
        bypass: false,
      });
    } catch (error) {
      throw new StabilizationError(
        `Stabilization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!result.output) return null;
    const output = { ...result.output, t: sample.t, phase: result.phase };
    if (![output.x, output.y, output.pressure].every(Number.isFinite))
      throw new StabilizationError("Stabilization produced a nonfinite point or pressure.");
    this.latest = output;
    return output;
  }
}
