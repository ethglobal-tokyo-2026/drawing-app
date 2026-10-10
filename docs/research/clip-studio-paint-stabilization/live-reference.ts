/**
 * Descriptive reconstruction of selected Clip Studio Paint 5.1.4 ARM64 routines.
 * This is a mathematical reference, not a complete event queue or a claim of
 * bit-for-bit equivalence. The original uses fused multiply-add instructions;
 * JavaScript evaluates the written multiplication and addition separately.
 * Addresses refer to the image identified in live-analysis.md.
 * Inputs must be finite drawing coordinates and consistent queue state.
 * Timestamp units and device-type meanings are intentionally caller supplied.
 */

export type Point = Readonly<{ x: number; y: number }>;
export type Sample = Readonly<Point & { pressure: number; timestamp: bigint }>;
export type QueueState = 0 | 1 | 2;
export type Phase = 1 | 2 | 3;

export type Configuration = Readonly<{
  stabilization: number;
  taper: number;
  initialWindow: number;
  currentWindow: number;
  fastMotion: boolean;
  slowMotion: boolean;
  distanceScale: number;
  maximumPressureDecline: number;
  slowNumerator: 200;
  slowThreshold: 25;
}>;

/** FCVTZS Wd, Dn: toward zero with signed 32-bit saturation; NaN becomes zero. */
export function truncateToSignedInt32(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(-2147483648, Math.min(2147483647, Math.trunc(value)));
}

/** 0x102ad8170..0x102ad8190; property availability is resolved by the caller. */
export function motionFlags(enabled: boolean, modeInteger: number) {
  return {
    fastMotionRequested: enabled && modeInteger === 0,
    slowMotionRequested: enabled && modeInteger !== 0,
  };
}

/** 0x102e18e68..0x102e18f30; the other queue explicitly gets slow=false. */
export function scaleSettingIntegers(
  stabilization: number,
  taper: number,
  deviceType: number,
  queue: "digitizer" | "other",
) {
  const scale = deviceType === 4 ? (queue === "digitizer" ? 1.3 : 0.4) : 1;
  const convert = (value: number) => {
    if (deviceType !== 4) return value;
    const product = value * scale;
    return truncateToSignedInt32(product + (product < 0 ? -0.50000001 : 0.50000001));
  };
  return { stabilization: convert(stabilization), taper: convert(taper) };
}

/** 0x1021366bc..0x102136768; inputs are signed 32-bit configuration integers. */
export function configureLiveQueue(
  stabilization: number,
  taper: number,
  fastMotionRequested: boolean,
  slowMotionRequested: boolean,
): Configuration {
  const initialWindow =
    stabilization < 3
      ? stabilization
      : Math.max(2, Math.min(15, Math.min(stabilization, taper) >> 1));
  const fastMotion = !slowMotionRequested && stabilization >= 3 && fastMotionRequested;
  return {
    stabilization,
    taper,
    initialWindow,
    currentWindow: initialWindow,
    fastMotion,
    slowMotion: slowMotionRequested,
    // LSL/ADD use W registers; UCVTF interprets the result as unsigned.
    distanceScale: fastMotion ? ((stabilization << 1) + 100) >>> 0 : 0,
    maximumPressureDecline: taper !== 0 ? 1 / taper : 1,
    slowNumerator: 200,
    slowThreshold: 25,
  };
}

/** 0x102136b2c..0x102136b68, 0x102136cf8, 0x102136e1c..0x102136e2c. */
export function adjustFixedWindow(
  currentWindow: number,
  stabilization: number,
  initialWindow: number,
  state: QueueState,
): number {
  if (state === 0) return initialWindow;
  if (currentWindow < stabilization) {
    currentWindow += Math.min(0.5, (stabilization - currentWindow + 1) / stabilization);
  }
  return Math.min(currentWindow, stabilization);
}

/** ARM64 subtraction followed by a signed comparison of X-register values. */
function timestampDifference(newer: bigint, older: bigint): bigint {
  return BigInt.asIntN(64, newer - older);
}

/** 0x102193618..0x102193640; original sum of squares includes an FMADD. */
export function pointDistance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  return squared === 0 ? 0 : Math.sqrt(squared);
}

/**
 * 0x102136a98..0x102136b18 and 0x102136e14..0x102136e2c.
 * Called only with at least two collected samples; otherwise the dispatcher
 * falls through to the slow/fixed selection, not to this calculation.
 */
export function adjustFastWindow(input: {
  currentWindow: number;
  stabilization: number;
  initialWindow: number;
  distanceScale: number;
  state: QueueState;
  previousInput: Sample;
  currentPosition: Point;
  currentTimestamp: bigint;
}): { currentWindow: number; canAverage: boolean } {
  if (timestampDifference(input.currentTimestamp, input.previousInput.timestamp) > 1000n) {
    return { currentWindow: input.currentWindow, canAverage: false };
  }
  const distance = pointDistance(input.previousInput, input.currentPosition);
  const ratio = (input.distanceScale - distance) / input.distanceScale;
  const changed = input.currentWindow + (ratio > 0 ? 0.5 * ratio : ratio);
  // The lower-bound branch goes directly to averaging, bypassing the upper bound.
  const currentWindow =
    changed < 2
      ? 2
      : Math.min(changed, input.state === 0 ? input.initialWindow : input.stabilization);
  return { currentWindow, canAverage: true };
}

type Bounds = { left: number; top: number; right: number; bottom: number };

/** 0x10221b72c..0x10221b7b8; maximum edges are extended by exactly 1e-8. */
function includePoint(bounds: Bounds, point: Point): void {
  if (!(bounds.left < bounds.right && bounds.top < bounds.bottom)) {
    bounds.left = point.x;
    bounds.top = point.y;
    bounds.right = point.x + 1e-8;
    bounds.bottom = point.y + 1e-8;
    return;
  }
  if (point.x < bounds.left) bounds.left = point.x;
  else if (point.x >= bounds.right) bounds.right = point.x + 1e-8;
  if (point.y < bounds.top) bounds.top = point.y;
  else if (point.y >= bounds.bottom) bounds.bottom = point.y + 1e-8;
}

/**
 * 0x102136b6c..0x102136ee0. Requires slow flag != 0 and S <= 30.
 * Pass the queue's collected count separately from its available history.
 * Samples are newest first; no time-gap test is present in this scan.
 */
export function adjustSlowWindow(input: {
  currentWindow: number;
  stabilization: number;
  initialWindow: number;
  state: QueueState;
  catchUpArgument: boolean;
  collectedCount: number;
  historyNewestFirst: readonly Sample[];
  slowNumerator: number;
  slowThreshold: number;
}) {
  const available = Math.min(input.collectedCount, input.historyNewestFirst.length);
  const catchUp = input.catchUpArgument && input.currentWindow < input.stabilization;
  if (available < 1) {
    return {
      currentWindow: input.currentWindow,
      canAverage: false,
      catchUp,
      totalLength: 0,
      positiveSegmentCount: 0,
      scannedCount: 0,
      boundaryAtFirstSegment: false,
      adjusted: false,
      candidate: null,
      target: null,
    };
  }
  const limit = Math.min(available, 30);
  let scannedCount = 1;
  let totalLength = 0;
  let positiveSegmentCount = 0;
  let seenPositiveOlderPressure = false;
  let boundaryAtFirstSegment = false;
  const bounds = { left: 0, top: 0, right: 0, bottom: 0 };
  includePoint(bounds, input.historyNewestFirst[0]);
  for (let i = 1; i < limit; i++) {
    const older = input.historyNewestFirst[i];
    const distance = pointDistance(input.historyNewestFirst[i - 1], older);
    scannedCount = i + 1;
    if (distance > 0) {
      totalLength += distance;
      positiveSegmentCount++;
      includePoint(bounds, older);
    }
    // The newest sample's pressure does not initialize this flag.
    // A segment is counted before checking its older endpoint's pressure.
    if (older.pressure > 0) seenPositiveOlderPressure = true;
    else if (seenPositiveOlderPressure || input.state === 0) {
      boundaryAtFirstSegment = scannedCount === 2;
      break;
    }
  }
  let currentWindow = input.currentWindow;
  if (boundaryAtFirstSegment) currentWindow = catchUp ? input.initialWindow : 0;
  const meanLength = positiveSegmentCount >= 1 ? totalLength / positiveSegmentCount : 0;
  // 0x102136d58..0x102136d60 and 0x102136e0c: this skips ALL three caps.
  if (!(meanLength > 0 || catchUp)) {
    return {
      currentWindow,
      canAverage: Math.trunc(currentWindow) > 0,
      catchUp,
      totalLength,
      positiveSegmentCount,
      scannedCount,
      boundaryAtFirstSegment,
      adjusted: false,
      candidate: null,
      target: null,
    };
  }
  const difference = input.slowThreshold / 10 - meanLength;
  let candidate = input.stabilization;
  if (difference > 0) {
    const dx = bounds.right - bounds.left;
    const dy = bounds.bottom - bounds.top;
    const diagonal = Math.sqrt(dx * dx + dy * dy);
    // Preserve the multiplication/division order at 0x102136da8..0x102136db4.
    // Zero length during catch-up can produce Infinity, which FCVTZS saturates.
    candidate = truncateToSignedInt32(
      (input.slowNumerator / 10) * difference * (diagonal / totalLength),
    );
  }
  const target = Math.max(candidate, input.state === 0 ? input.initialWindow : input.stabilization);
  const step = catchUp ? 0.5 : 0.25;
  if (step > Math.abs(currentWindow - target)) currentWindow = target;
  else if (currentWindow > target) currentWindow -= step;
  else if (currentWindow < target) currentWindow += step;
  currentWindow = Math.min(currentWindow, scannedCount);
  if (!catchUp) currentWindow = Math.min(currentWindow, available - 1);
  currentWindow = Math.min(currentWindow, 100);
  return {
    currentWindow,
    canAverage: Math.trunc(currentWindow) > 0,
    catchUp,
    totalLength,
    positiveSegmentCount,
    scannedCount,
    boundaryAtFirstSegment,
    adjusted: true,
    candidate,
    target,
  };
}

/**
 * 0x102136ef0..0x102137024. Windows H >= 1 only; normal successful queue
 * paths have this domain. Invalid/smaller windows are outside this helper.
 * Running out of recent history repeats the last usable sample.
 */
export function averageFractionalHistory(
  historyNewestFirst: readonly Sample[],
  currentWindow: number,
  currentTimestamp: bigint,
): (Point & { pressure: number; oldestWholeSampleTimestamp: bigint }) | null {
  if (!(currentWindow >= 1) || !Number.isFinite(currentWindow)) {
    throw new RangeError("The averaging helper requires a finite window of at least one.");
  }
  const whole = Math.trunc(currentWindow);
  const fraction = currentWindow - whole;
  let last: Sample | undefined;
  let repeated = false;
  let x = 0;
  let y = 0;
  let pressure = 0;
  for (let i = 0; i < whole; i++) {
    const candidate = historyNewestFirst[i];
    if (
      !repeated &&
      candidate &&
      timestampDifference(currentTimestamp, candidate.timestamp) <= 1000n
    ) {
      last = candidate;
    } else {
      repeated = true;
    }
    if (!last) return null;
    x += last.x;
    y += last.y;
    pressure += last.pressure;
  }
  // +0x80 is assigned before selecting the fractional older sample.
  const oldestWholeSampleTimestamp = last?.timestamp ?? historyNewestFirst[0]?.timestamp;
  if (oldestWholeSampleTimestamp === undefined) return null;
  if (fraction !== 0) {
    const candidate = historyNewestFirst[whole];
    if (
      !repeated &&
      candidate &&
      timestampDifference(currentTimestamp, candidate.timestamp) <= 1000n
    ) {
      last = candidate;
    }
    if (!last) return null;
    x += last.x * fraction;
    y += last.y * fraction;
    pressure += last.pressure * fraction;
  }
  const reciprocal = 1 / currentWindow;
  return {
    x: x * reciprocal,
    y: y * reciprocal,
    pressure: pressure * reciprocal,
    oldestWholeSampleTimestamp,
  };
}

/**
 * 0x102136824..0x10213686c. Previous values are +0xc8/+0xd0, which store
 * earlier pressures AFTER this same extrapolation, not untouched raw values.
 */
export function extrapolateNonpositivePressure(
  incomingPressure: number,
  state: QueueState,
  previousStoredInputPressure: number,
  previousPreviousStoredInputPressure: number,
): number {
  if (
    incomingPressure > 0 ||
    state === 0 ||
    previousPreviousStoredInputPressure <= previousStoredInputPressure + 0.02
  ) {
    return incomingPressure;
  }
  const decline = previousPreviousStoredInputPressure - previousStoredInputPressure;
  return Math.max(-0.2, Math.min(0, previousStoredInputPressure - decline));
}

/** 0x1021370e4..0x102137104; call only when +0xd8 != 0 and state != 0. */
export function limitPressureDecline(
  pressure: number,
  previousOutputPressure: number,
  maximumDecline: number,
): number {
  return previousOutputPressure - pressure > maximumDecline
    ? previousOutputPressure - maximumDecline
    : pressure;
}

/** 0x102137194..0x1021371cc; call on pressure <= 0 with +0xdc == 0. */
export function interpolatePressureZero(
  current: Point,
  pressure: number,
  previous: Point,
  previousPressure: number,
): Point & { pressure: 0 } {
  if (previousPressure > pressure + 1e-8) {
    const fraction = previousPressure / (previousPressure - pressure);
    return {
      x: previous.x + (current.x - previous.x) * fraction,
      y: previous.y + (current.y - previous.y) * fraction,
      pressure: 0,
    };
  }
  return { x: current.x, y: current.y, pressure: 0 };
}

/** 0x10213715c..0x102137190; FMSUB subtracts the product from the addend. */
export function endingMovementThreshold(taper: number, currentWindow: number): number {
  if (taper === 0) return 2;
  return Math.max(0.5, 2 - taper * 0.04 - currentWindow * 0.04);
}

/** 0x102137130..0x1021371f4; the second length comparison is strictly less. */
export function shouldEndForMovement(
  current: Point,
  previous: Point,
  previousPrevious: Point,
  taper: number,
  currentWindow: number,
): boolean {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const px = previous.x - previousPrevious.x;
  const py = previous.y - previousPrevious.y;
  if (dx * px + dy * py < 0) return true;
  const squared = dx * dx + dy * dy;
  const previousSquared = px * px + py * py;
  const threshold = endingMovementThreshold(taper, currentWindow);
  return squared <= threshold * threshold && squared < previousSquared;
}

/**
 * 0x102137058..0x10213720c, excluding unrelated event/queue bookkeeping.
 * Every persistent input field and both behavior flags are explicit.
 */
export function adjustOutputPhase(input: {
  phase: Phase;
  state: QueueState;
  timestampGate: boolean;
  current: Point;
  pressure: number;
  previous: Point;
  previousPrevious: Point;
  previousPressure: number;
  limitDecline: boolean;
  retainAtZero: boolean;
  maximumDecline: number;
  taper: number;
  currentWindow: number;
}) {
  let { phase, state, timestampGate, pressure } = input;
  let current = { ...input.current };
  let firstEndingPacket = false;
  const result = () => ({ phase, state, timestampGate, ...current, pressure });
  const finish = () => {
    phase = 3;
    state = 0;
    timestampGate = true;
    return result();
  };
  if (phase === 2) {
    if (state === 0) {
      state = 1;
      return result();
    }
    phase = 1;
  } else if (phase === 3) {
    if (state === 0) {
      pressure = 0;
      timestampGate = true;
      return result();
    }
    if (state === 1) {
      state = 2;
      timestampGate = false;
    }
    phase = 1;
    firstEndingPacket = true;
  }
  if (state === 0) return result();
  if (input.limitDecline) {
    pressure = limitPressureDecline(pressure, input.previousPressure, input.maximumDecline);
  }
  if (pressure <= 0) {
    if (!input.retainAtZero) {
      const zero = interpolatePressureZero(
        current,
        pressure,
        input.previous,
        input.previousPressure,
      );
      current = { x: zero.x, y: zero.y };
      pressure = 0;
      return finish();
    }
    pressure = 0;
  }
  if (
    state === 2 &&
    !firstEndingPacket &&
    shouldEndForMovement(
      current,
      input.previous,
      input.previousPrevious,
      input.taper,
      input.currentWindow,
    )
  )
    return finish();
  return result();
}

/** 0x102136920..0x102136988; suppression does not undo filter/state updates. */
export function evaluateOutputGate(input: {
  gatingRequested: boolean;
  phase: Phase;
  timestampGate: boolean;
  currentTimestamp: bigint;
  previousEmittedTimestamp: bigint;
  interval: bigint;
  skippedCount: number;
  rememberedSkippedCount: number;
}) {
  let rememberedSkippedCount = input.rememberedSkippedCount;
  let suppress = false;
  if (input.gatingRequested && input.phase === 1) {
    if (input.timestampGate) {
      suppress =
        timestampDifference(input.currentTimestamp, input.previousEmittedTimestamp) <
        input.interval;
      if (!suppress) rememberedSkippedCount = input.skippedCount;
    } else suppress = input.skippedCount < rememberedSkippedCount;
  }
  return {
    emit: !suppress,
    skippedCount: suppress ? (input.skippedCount + 1) | 0 : 0,
    rememberedSkippedCount,
    previousEmittedTimestamp: suppress ? input.previousEmittedTimestamp : input.currentTimestamp,
  };
}

/** 0x1020bdfb8..0x1020bdfd8; table at 0x104513b10. */
export function inputEventPhase(event: number): Phase {
  if (event >= 4 && event <= 9) return event === 6 || event === 9 ? 3 : 2;
  return 1;
}

/** 0x1020bdef4..0x1020bdf18 and 0x1020be044..0x1020be074. */
export function canonicalOutputEvent(phase: Phase, packetTypeAt40: number): number {
  if (phase === 1) return 1;
  if (phase === 2) return packetTypeAt40 === 3 ? 7 : 4;
  return packetTypeAt40 === 3 ? 9 : 6;
}

/** 0x1020bdc60..0x1020bdcac; the loop can stop early when queue state is zero. */
export function terminalPrefeedCount(currentWindow: number, taper: number): number {
  return Math.max(0, (truncateToSignedInt32(currentWindow) - taper) | 0);
}
