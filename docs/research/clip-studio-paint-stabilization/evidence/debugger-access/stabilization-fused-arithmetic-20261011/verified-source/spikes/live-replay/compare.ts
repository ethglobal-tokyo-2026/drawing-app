import { Buffer } from "node:buffer";
import { QueueReplay, FLOAT_FIELDS, INT_FIELDS, BIGINT_FIELDS } from "./queue.ts";
import type { Capture } from "./reader.ts";

function bitPattern(value: number): bigint {
  const raw = Buffer.alloc(8);
  raw.writeDoubleLE(value);
  return raw.readBigUInt64LE();
}
const formatBits = (value: bigint) => `0x${value.toString(16).padStart(16, "0")}`;
/** Ordered-bit distance counts the two signed-zero encodings as adjacent. */
const orderedBits = (value: bigint) =>
  value & (1n << 63n) ? ((1n << 64n) - 1n) ^ value : value | (1n << 63n);
export function compareNumber(expected: number, actual: number) {
  const expectedBits = bitPattern(expected),
    actualBits = bitPattern(actual);
  const distance = orderedBits(expectedBits) - orderedBits(actualBits);
  const absoluteError = Math.abs(expected - actual);
  return {
    expected,
    actual,
    expectedBits: formatBits(expectedBits),
    actualBits: formatBits(actualBits),
    exact: expectedBits === actualBits,
    absoluteError: Number.isFinite(absoluteError) ? absoluteError : "Infinity",
    ulpDistance: (distance < 0n ? -distance : distance).toString(),
  };
}
type NumericComparison = ReturnType<typeof compareNumber>;
type Difference = {
  field: string;
  expected?: unknown;
  actual?: unknown;
  numeric?: NumericComparison;
};
export const LIMITATIONS = [
  "This is a saved-file arithmetic comparison, not validation of natural event timing, rendering, post-correction, latency, or pen feel.",
  "Recovered FMADD/FMLA/FMSUB operations use software binary64 fusion; separately rounded instructions remain separate. Input and saved queue fields must be finite; intermediate overflow follows IEEE result values. NaN payloads, alternate FPCR modes, and floating-point status flags are not reproduced.",
  "Exact match means only equality of compared captured fields to this bounded reference for this file; it does not prove native runtime equivalence.",
  "Deque allocation addresses, front index and allocator metadata at +0x08..+0x2f are observed but not predicted. Record order/count are modeled from initial history and every ingestion.",
  "Only the captured common 236-byte prefix is available; digitizer-only cached packet fields +0xec..+0xff, out-of-line history after begin, and FPSR side effects are not predicted.",
  "Wrapper changes are recorded before/after snapshots with static attribution, not independently observed individual writes. Only those explicit supported changes are applied.",
  "Saved completion, debugger cleanup, image identity and instruction-verification assertions are checked for consistency; the offline reader cannot independently authenticate them.",
  "Calls before the confirmed begin and gesture-queue calls are paired and validated, then explicitly listed as outside the digitizer fixture; their arithmetic is not replayed.",
];

function queueComparison(predicted: Buffer, captured: Buffer) {
  const differences: Difference[] = [],
    numeric: Record<string, NumericComparison> = {};
  for (const [name, offset] of FLOAT_FIELDS) {
    const comparison = compareNumber(predicted.readDoubleLE(offset), captured.readDoubleLE(offset));
    numeric[name] = comparison;
    if (!comparison.exact) differences.push({ field: `queue.${name}`, numeric: comparison });
  }
  for (const [name, offset] of INT_FIELDS) {
    const expected = predicted.readInt32LE(offset),
      actual = captured.readInt32LE(offset);
    if (expected !== actual) differences.push({ field: `queue.${name}`, expected, actual });
  }
  for (const [name, offset] of BIGINT_FIELDS) {
    const expected = predicted.readBigUInt64LE(offset).toString(),
      actual = captured.readBigUInt64LE(offset).toString();
    if (expected !== actual) differences.push({ field: `queue.${name}`, expected, actual });
  }
  for (const [start, end, name] of [
    [0, 8, "vtable"],
    [0x54, 0x58, "padding_54"],
    [0x6c, 0x70, "padding_6c"],
    [0x8c, 0x90, "padding_8c"],
  ] as const) {
    const expected = predicted.subarray(start, end).toString("hex"),
      actual = captured.subarray(start, end).toString("hex");
    if (expected !== actual) differences.push({ field: `queue.${name}`, expected, actual });
  }
  return { differences, numeric };
}

export function replayCapture(capture: Capture) {
  const first = capture.calls[0],
    replay = new QueueReplay(first.before, first.initialHistory!);
  const calls = capture.calls.map((call) => {
    for (const change of call.changes) change.after.copy(replay.raw, change.offset);
    const entry = queueComparison(replay.raw, call.before);
    let result;
    try {
      result = replay.ingest(call.input);
    } catch (error) {
      if (error instanceof Error)
        error.message = `call ${call.id}, entry line ${call.entry.line}: ${error.message}`;
      throw error;
    }
    const exit = queueComparison(replay.raw, call.after);
    const differences = [
      ...entry.differences.map((difference) => ({
        ...difference,
        field: `entry.${difference.field}`,
      })),
      ...exit.differences,
    ];
    if (result.emitted !== call.emitted)
      differences.push({ field: "emitted", expected: result.emitted, actual: call.emitted });
    const expectedReturnBits = result.emitted ? "0x00000001" : "0x00000000";
    if (call.exit.w0_bits !== expectedReturnBits)
      differences.push({
        field: "return_w0_bits",
        expected: expectedReturnBits,
        actual: call.exit.w0_bits,
      });
    if (result.phase !== call.phaseOut)
      differences.push({ field: "caller_phase", expected: result.phase, actual: call.phaseOut });
    const outputNumeric: Record<string, NumericComparison> = {};
    if (result.output && call.output)
      for (const name of ["x", "y", "pressure"] as const) {
        const comparison = compareNumber(result.output[name], call.output[name]);
        outputNumeric[name] = comparison;
        if (!comparison.exact) differences.push({ field: `output.${name}`, numeric: comparison });
      }
    return {
      callId: call.id,
      caller: call.entry.caller_family,
      entryLine: call.entry.line,
      exitLine: call.exit.line,
      input: {
        ...call.input,
        timestamp: call.input.timestamp.toString(),
        interval: call.input.interval.toString(),
      },
      wrapperMutations: call.changes.map((change) => ({
        offset: `0x${change.offset.toString(16)}`,
        beforeBytes: change.before.toString("hex"),
        afterBytes: change.after.toString("hex"),
      })),
      predicted: {
        ...result,
        state: replay.raw.readInt32LE(0x88),
        windowH: replay.raw.readDoubleLE(0x58),
      },
      captured: {
        emitted: call.emitted,
        phase: call.phaseOut,
        state: call.after.readInt32LE(0x88),
        windowH: call.after.readDoubleLE(0x58),
        ...(call.output ? { output: call.output } : {}),
      },
      numeric: { entry: entry.numeric, exit: exit.numeric, output: outputNumeric },
      differences,
      unmodeledDeque: {
        entryBytes: call.before.subarray(8, 0x30).toString("hex"),
        exitBytes: call.after.subarray(8, 0x30).toString("hex"),
      },
      floatingPointStatusObserved: {
        entryFPSR: call.entry.fpsr_bits,
        exitFPSR: call.exit.fpsr_bits,
        modeled: false,
      },
    };
  });
  const terminalComparisons = capture.terminalRecords.map((row) => {
    // The reader proves this wrapper completion belongs to the actual final
    // flush. A later idle call cannot replace the terminal arithmetic result.
    const call = calls.find((call) => call.callId === capture.summary.final_pair_id)!;
    const raw = Buffer.from(row.output_packet.bytes_le, "hex");
    const actual = {
      x: raw.readDoubleLE(8),
      y: raw.readDoubleLE(16),
      pressure: raw.readDoubleLE(24),
    };
    const numeric: Record<string, NumericComparison> = {},
      differences: Difference[] = [];
    if (!call.predicted.output)
      differences.push({
        field: "terminal.output",
        expected: "No predicted emitted output",
        actual,
      });
    else
      for (const field of ["x", "y", "pressure"] as const) {
        const result = compareNumber(call.predicted.output[field], actual[field]);
        numeric[field] = result;
        if (!result.exact) differences.push({ field: `terminal.output.${field}`, numeric: result });
      }
    return { line: row.line, callId: call.callId, numeric, differences };
  });
  const mismatchCount = [...calls, ...terminalComparisons].reduce(
    (count, call) => count + call.differences.length,
    0,
  );
  return {
    schemaVersion: 1,
    status: mismatchCount ? ("differences" as const) : ("exact_match" as const),
    fixtureOrigin: capture.origin,
    inputSha256: capture.sha256,
    nativeRuntimeValidated: false,
    arithmetic:
      "Recovered ARM binary64 operation order with software fused multiply-add where present; FPCR must be zero",
    comparisonPolicy:
      "Exact binary64 bits and exact integer/control fields; absolute and ULP errors are diagnostic, never acceptance tolerances",
    comparedQueueRanges: [
      "+0x00..+0x07 immutable vtable",
      "+0x30..+0xeb captured common arithmetic/state/configuration and padding",
    ],
    callCount: calls.length,
    mismatchCount,
    firstDifference:
      [...calls, ...terminalComparisons].flatMap((call) =>
        call.differences.map((difference) => ({ callId: call.callId, ...difference })),
      )[0] ?? null,
    captureRecordCounts: capture.recordCounts,
    excludedCalls: capture.excluded,
    observedCompletion: {
      nativeReleaseReturned: true,
      finalSourceReturned: true,
      finalPairId: capture.summary.final_pair_id,
      terminalWrapperRecords: capture.terminalRecords.length,
      sourceReturnRecords: capture.sourceReturns.length,
    },
    limitations: LIMITATIONS,
    calls,
    terminalComparisons,
  };
}
