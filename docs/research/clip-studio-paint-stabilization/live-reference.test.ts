import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustFastWindow,
  adjustFixedWindow,
  adjustOutputPhase,
  adjustSlowWindow,
  averageFractionalHistory,
  canonicalOutputEvent,
  configureLiveQueue,
  endingMovementThreshold,
  evaluateOutputGate,
  extrapolateNonpositivePressure,
  inputEventPhase,
  interpolatePressureZero,
  limitPressureDecline,
  motionFlags,
  scaleSettingIntegers,
  shouldEndForMovement,
  terminalPrefeedCount,
  truncateToSignedInt32,
} from "./live-reference.ts";

const near = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
};
const sample = (x: number, pressure: number, timestamp: bigint) => ({
  x,
  y: 0,
  pressure,
  timestamp,
});

test("configuration recovers initial window, flag precedence, reciprocal, and scales", () => {
  assert.equal(configureLiveQueue(100, 0, false, false).initialWindow, 2);
  assert.equal(configureLiveQueue(100, 100, false, false).initialWindow, 15);
  assert.equal(configureLiveQueue(9, 9, false, false).initialWindow, 4);
  assert.equal(configureLiveQueue(2, 0, true, false).fastMotion, false);
  const config = configureLiveQueue(10, 5, true, true);
  assert.equal(config.initialWindow, 2);
  assert.equal(config.fastMotion, false);
  assert.equal(config.slowMotion, true);
  near(config.maximumPressureDecline, 0.2);
  assert.equal(configureLiveQueue(10, 0, true, false).distanceScale, 120);
  assert.equal(configureLiveQueue(10, 0, true, false).maximumPressureDecline, 1);
  assert.deepEqual(motionFlags(true, 0), { fastMotionRequested: true, slowMotionRequested: false });
  assert.deepEqual(motionFlags(true, 1), { fastMotionRequested: false, slowMotionRequested: true });
  assert.deepEqual(scaleSettingIntegers(5, -5, 4, "digitizer"), { stabilization: 7, taper: -7 });
  assert.deepEqual(scaleSettingIntegers(5, -5, 4, "other"), { stabilization: 2, taper: -2 });
  assert.deepEqual(scaleSettingIntegers(5, -5, 3, "digitizer"), { stabilization: 5, taper: -5 });
});

test("fixed growth includes +1 in its numerator and clamps excess H", () => {
  near(adjustFixedWindow(9, 10, 2, 1), 9.2);
  near(adjustFixedWindow(9.8, 10, 2, 1), 9.92);
  near(adjustFixedWindow(2, 100, 2, 2), 2.5);
  assert.equal(adjustFixedWindow(9.99, 10, 2, 1), 10);
  assert.equal(adjustFixedWindow(12, 10, 2, 1), 10);
  assert.equal(adjustFixedWindow(9, 10, 2, 0), 2);
});

test("fast reduction uses packet distance, with a separate timestamp rejection", () => {
  const base = {
    currentWindow: 5,
    stabilization: 10,
    initialWindow: 2,
    distanceScale: 120,
    state: 1 as const,
    previousInput: sample(0, 1, 100n),
    currentTimestamp: 101n,
  };
  near(adjustFastWindow({ ...base, currentPosition: { x: 60, y: 0 } }).currentWindow, 5.25);
  near(adjustFastWindow({ ...base, currentPosition: { x: 240, y: 0 } }).currentWindow, 4);
  assert.equal(adjustFastWindow({ ...base, currentPosition: { x: 1000, y: 0 } }).currentWindow, 2);
  assert.equal(
    adjustFastWindow({ ...base, currentPosition: { x: 60, y: 0 }, currentTimestamp: 1100n })
      .canAverage,
    true,
  );
  assert.deepEqual(
    adjustFastWindow({ ...base, currentPosition: { x: 60, y: 0 }, currentTimestamp: 1101n }),
    { currentWindow: 5, canAverage: false },
  );
});

test("uniform average gives only the oldest selected sample fractional weight", () => {
  const history = [sample(0, 1, 30n), sample(10, 0.5, 20n), sample(20, 0, 10n)];
  const result = averageFractionalHistory(history, 2.5, 30n)!;
  near(result.x, 8);
  near(result.pressure, 0.6);
  assert.equal(result.oldestWholeSampleTimestamp, 20n);
});

test("history pads the last recent sample, accepts age 1000, and freezes at a gap", () => {
  const history = [sample(0, 1, 2000n), sample(10, 0.5, 1000n), sample(999, 0, 999n)];
  const padded = averageFractionalHistory(history, 4, 2000n)!;
  near(padded.x, 7.5);
  near(padded.pressure, 0.625);
  assert.equal(padded.oldestWholeSampleTimestamp, 1000n);
  near(averageFractionalHistory(history, 2.5, 2000n)!.x, 6);
  near(averageFractionalHistory([history[0]], 5.25, 2000n)!.pressure, 1);
  assert.equal(averageFractionalHistory([sample(0, 1, 0n)], 2, 1001n), null);
  assert.equal(averageFractionalHistory([], 2, 0n), null);
  assert.throws(() => averageFractionalHistory(history, 0, 2000n), RangeError);
  assert.throws(() => averageFractionalHistory(history, 0.5, 2000n), RangeError);
});

test("slow mode uses positive segments, quarter steps, and catch-up half steps", () => {
  const history = [0, 1, 2, 3].map((x) => sample(x, 1, 0n));
  const base = {
    currentWindow: 2,
    stabilization: 10,
    initialWindow: 2,
    state: 1 as const,
    collectedCount: 4,
    historyNewestFirst: history,
    slowNumerator: 200,
    slowThreshold: 25,
  };
  const ordinary = adjustSlowWindow({ ...base, catchUpArgument: false });
  assert.equal(ordinary.totalLength, 3);
  assert.equal(ordinary.positiveSegmentCount, 3);
  assert.equal(ordinary.scannedCount, 4);
  assert.equal(ordinary.candidate, 30);
  assert.equal(ordinary.currentWindow, 2.25);
  assert.equal(adjustSlowWindow({ ...base, catchUpArgument: true }).currentWindow, 2.5);
});

test("slow mode's history-minus-one cap is skipped in catch-up", () => {
  const base = {
    currentWindow: 1,
    stabilization: 10,
    initialWindow: 2,
    state: 1 as const,
    collectedCount: 2,
    historyNewestFirst: [sample(0, 1, 0n), sample(1, 1, 0n)],
    slowNumerator: 200,
    slowThreshold: 25,
  };
  assert.equal(adjustSlowWindow({ ...base, catchUpArgument: false }).currentWindow, 1);
  assert.equal(adjustSlowWindow({ ...base, catchUpArgument: true }).currentWindow, 1.5);
});

test("stationary ordinary slow mode skips all caps; stationary catch-up still adjusts", () => {
  const base = {
    stabilization: 10,
    initialWindow: 2,
    state: 1 as const,
    collectedCount: 2,
    historyNewestFirst: [sample(0, 1, 0n), sample(0, 1, 0n)],
    slowNumerator: 200,
    slowThreshold: 25,
  };
  const ordinary = adjustSlowWindow({ ...base, currentWindow: 50, catchUpArgument: false });
  assert.equal(ordinary.currentWindow, 50);
  assert.equal(ordinary.adjusted, false);
  const catchUp = adjustSlowWindow({ ...base, currentWindow: 1, catchUpArgument: true });
  assert.equal(catchUp.currentWindow, 1.5);
  assert.equal(catchUp.candidate, 2147483647);
});

test("first-segment pressure boundary resets H before slow adjustment", () => {
  const base = {
    currentWindow: 1,
    stabilization: 10,
    initialWindow: 5,
    state: 0 as const,
    collectedCount: 3,
    historyNewestFirst: [sample(0, 1, 0n), sample(1, 0, 0n), sample(2, 1, 0n)],
    slowNumerator: 200,
    slowThreshold: 25,
  };
  const ordinary = adjustSlowWindow({ ...base, catchUpArgument: false });
  assert.equal(ordinary.currentWindow, 0.25);
  assert.equal(ordinary.canAverage, false);
  assert.equal(ordinary.boundaryAtFirstSegment, true);
  assert.equal(ordinary.totalLength, 1);
  assert.equal(adjustSlowWindow({ ...base, catchUpArgument: true }).currentWindow, 2);
});

test("slow scan includes the boundary segment and does not seed from newest pressure", () => {
  const base = {
    currentWindow: 2,
    stabilization: 10,
    initialWindow: 2,
    state: 1 as const,
    collectedCount: 4,
    catchUpArgument: false,
    slowNumerator: 200,
    slowThreshold: 25,
  };
  const result = adjustSlowWindow({
    ...base,
    historyNewestFirst: [sample(0, 1, 0n), sample(1, 0, 0n), sample(2, 1, 0n), sample(3, 0, 0n)],
  });
  assert.equal(result.scannedCount, 4);
  assert.equal(result.totalLength, 3);
  assert.equal(result.boundaryAtFirstSegment, false);
});

test("pressure extrapolation clips to [-0.2, 0] and is conditional", () => {
  near(extrapolateNonpositivePressure(0, 1, 0.1, 0.3), -0.1);
  assert.equal(extrapolateNonpositivePressure(0, 1, 0.1, 0.5), -0.2);
  assert.equal(extrapolateNonpositivePressure(0, 1, 0.5, 0.6), 0);
  assert.equal(extrapolateNonpositivePressure(-0.4, 0, 0.1, 0.5), -0.4);
  assert.equal(extrapolateNonpositivePressure(0.1, 1, 0.1, 0.5), 0.1);
  near(limitPressureDecline(0.1, 0.8, 0.2), 0.6);
  near(limitPressureDecline(0.7, 0.8, 0.2), 0.7);
  near(interpolatePressureZero({ x: 10, y: 0 }, -0.25, { x: 0, y: 0 }, 0.75).x, 7.5);
});

test("ending threshold subtracts both products; equality of motion lengths continues", () => {
  near(endingMovementThreshold(10, 10), 1.2);
  assert.equal(endingMovementThreshold(30, 20), 0.5);
  assert.equal(endingMovementThreshold(0, 100), 2);
  assert.equal(shouldEndForMovement({ x: 1.5, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, 0, 0), true);
  assert.equal(shouldEndForMovement({ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, 0, 0), false);
  assert.equal(shouldEndForMovement({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, 0, 0), true);
});

test("phase-3 transition defers geometry, but zero pressure can terminate immediately", () => {
  const base = {
    phase: 3 as const,
    state: 1 as const,
    timestampGate: true,
    current: { x: 0, y: 0 },
    pressure: 0.5,
    previous: { x: 1, y: 0 },
    previousPrevious: { x: 0, y: 0 },
    previousPressure: 0.75,
    limitDecline: false,
    retainAtZero: false,
    maximumDecline: 1,
    taper: 0,
    currentWindow: 2,
  };
  assert.deepEqual(adjustOutputPhase(base), {
    phase: 1,
    state: 2,
    timestampGate: false,
    x: 0,
    y: 0,
    pressure: 0.5,
  });
  const geometricEnd = adjustOutputPhase({ ...base, phase: 1, state: 2 });
  assert.equal(geometricEnd.phase, 3);
  assert.equal(geometricEnd.pressure, 0.5);
  const pressureEnd = adjustOutputPhase({ ...base, pressure: -0.25 });
  assert.equal(pressureEnd.phase, 3);
  near(pressureEnd.x, 0.25);
  assert.equal(pressureEnd.pressure, 0);
  assert.equal(adjustOutputPhase({ ...base, phase: 2, state: 0, pressure: -0.25 }).pressure, -0.25);
});

test("output gate distinguishes timestamp and remembered skip-count conditions", () => {
  const base = {
    gatingRequested: true,
    phase: 1 as const,
    timestampGate: true,
    currentTimestamp: 105n,
    previousEmittedTimestamp: 100n,
    interval: 10n,
    skippedCount: 2,
    rememberedSkippedCount: 4,
  };
  assert.deepEqual(evaluateOutputGate(base), {
    emit: false,
    skippedCount: 3,
    rememberedSkippedCount: 4,
    previousEmittedTimestamp: 100n,
  });
  assert.deepEqual(evaluateOutputGate({ ...base, currentTimestamp: 110n }), {
    emit: true,
    skippedCount: 0,
    rememberedSkippedCount: 2,
    previousEmittedTimestamp: 110n,
  });
  assert.equal(evaluateOutputGate({ ...base, timestampGate: false }).emit, false);
  assert.equal(evaluateOutputGate({ ...base, gatingRequested: false }).emit, true);
});

test("event mapping and terminal count use numeric evidence without event-name guesses", () => {
  assert.deepEqual([1, 4, 5, 6, 7, 8, 9].map(inputEventPhase), [1, 2, 2, 3, 2, 2, 3]);
  assert.equal(canonicalOutputEvent(3, 3), 9);
  assert.equal(canonicalOutputEvent(2, 2), 4);
  assert.equal(terminalPrefeedCount(12.9, 5), 7);
  assert.equal(terminalPrefeedCount(2, 5), 0);
  assert.equal(truncateToSignedInt32(Infinity), 2147483647);
  assert.equal(truncateToSignedInt32(-Infinity), -2147483648);
  assert.equal(truncateToSignedInt32(NaN), 0);
});
