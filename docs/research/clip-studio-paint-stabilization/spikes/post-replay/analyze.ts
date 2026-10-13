import { isDeepStrictEqual } from "node:util";
import { bits, derivedChecks, evaluateHelper, fromBits } from "./arithmetic.ts";
import type { ArithmeticCheck } from "./arithmetic.ts";
import type {
  BoundaryRecord,
  CaptureHeader,
  HelperRecord,
  PathSnapshot,
  PostArguments,
} from "./schema.ts";

const IMAGE_SHA256 = "6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd";
const fileBase = 0x100000000n;
const nodeClasses = [
  { name: "PWVectorCurve", vtable: 0x104a52b60n, size: 0x78, type: 0, controls: [] },
  { name: "PWVectorBezierCurve", vtable: 0x104a527b0n, size: 0x88, type: 0x20, controls: [0x78] },
  {
    name: "PWVectorCubicBezierCurve",
    vtable: 0x104a52a00n,
    size: 0x98,
    type: 0x40,
    controls: [0x78, 0x88],
  },
  { name: "PWVectorSplineCurve", vtable: 0x104a53918n, size: 0x78, type: 0x80, controls: [] },
];
type Point = { x: number; y: number };
type DecodedNode = Point & {
  address: string;
  flags: number;
  scalar44: number;
  scalar4c: number;
  className: string;
  controls: Point[];
  retainedHex: string;
  endpointDataHex: string;
  cachedDataHex: string;
};
type DecodedPath = {
  flags: number;
  nodes: DecodedNode[];
  fullHeader: boolean;
  endpointHex?: string;
};
type CallState = {
  entry?: BoundaryRecord;
  returned?: BoundaryRecord;
  before?: DecodedPath;
  after?: DecodedPath;
  errors: string[];
  helpers: ArithmeticCheck[];
};

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, label: string): asserts value is string {
  ensure(typeof value === "string" && !!value.trim(), `${label} must be a nonempty string`);
}
function pointer(value: unknown, label: string, nonzero = true): bigint {
  ensure(
    typeof value === "string" && /^0x[0-9a-fA-F]{1,16}$/.test(value),
    `${label} must be a hexadecimal pointer`,
  );
  const result = BigInt(value);
  ensure(!nonzero || result !== 0n, `${label} cannot be null`);
  ensure(result % 8n === 0n, `${label} must be 8-byte aligned`);
  return result;
}
function raw(value: unknown, label: string): Buffer {
  ensure(
    typeof value === "string" && /^(?:[0-9a-fA-F]{2})+$/.test(value),
    `${label} contains invalid or incomplete hexadecimal bytes`,
  );
  return Buffer.from(value, "hex");
}
function finite(value: number, label: string): number {
  ensure(
    Number.isFinite(value),
    `${label} is nonfinite and outside the retained comparison domain`,
  );
  return value;
}
function address(value: bigint): string {
  return "0x" + value.toString(16);
}

function validateArguments(value: unknown): asserts value is PostArguments {
  ensure(object(value), "Boundary arguments are missing");
  for (const field of ["k", "closedMode"])
    ensure(
      Number.isInteger(value[field]) && value[field] >= -2147483648 && value[field] <= 2147483647,
      `${field} must be int32`,
    );
  for (const field of ["flag480", "selector482"])
    ensure(value[field] === 0 || value[field] === 1, `${field} must be 0 or 1`);
  fromBits(value.toleranceBits, 8);
  fromBits(value.lengthScaleBits, 8);
}

function decodePath(snapshot: PathSnapshot, imageBase: bigint, warnings: string[]): DecodedPath {
  ensure(object(snapshot), "Path snapshot is missing");
  const owner = pointer(snapshot.address, "Path address");
  ensure(snapshot.complete === true, "Path snapshot is incomplete");
  ensure(
    Array.isArray(snapshot.errors) && snapshot.errors.length === 0,
    `Path capture errors: ${JSON.stringify(snapshot.errors)}`,
  );
  ensure(Array.isArray(snapshot.nodes), "Path nodes are missing");
  const header = raw(snapshot.headerHex, "Path header");
  ensure(
    header.length >= 0x50,
    `Path header has ${header.length} bytes; at least 0x50 are required`,
  );
  ensure(
    header.length <= 0xa8,
    `Path header has ${header.length} bytes, exceeding the known 0xa8-byte allocation`,
  );
  ensure(
    header.readBigUInt64LE(0) === 0x104a53a78n + imageBase - fileBase,
    "Path vtable is not the analyzed PWVectorStroke",
  );
  if (header.length < 0xa8)
    warnings.push(`${snapshot.address}: path header omits endpoint context beyond +0x50`);
  const flags = header.readUInt32LE(0x20);
  const first = header.readBigUInt64LE(0x30),
    last = header.readBigUInt64LE(0x38);
  const count = header.readUInt32LE(0x40);
  ensure(
    count <= 4096,
    `Path count ${count} exceeds the v1 capture's 4096-node operational bound; no prefix is accepted`,
  );
  ensure(
    count === snapshot.nodes.length,
    `Path count ${count} differs from ${snapshot.nodes.length} captured nodes`,
  );
  const seen = new Set<bigint>();
  const nodes = snapshot.nodes.map((node, index): DecodedNode => {
    ensure(object(node), `Node ${index} is missing`);
    const ptr = pointer(node.address, `Node ${index} address`);
    ensure(!seen.has(ptr), `Node ${node.address} appears more than once`);
    seen.add(ptr);
    const data = raw(node.bytesHex, `Node ${node.address}`);
    ensure(data.length >= 8, `Node ${node.address} lacks vtable bytes`);
    const vtable = data.readBigUInt64LE(0) - imageBase + fileBase;
    const definition = nodeClasses.find((item) => item.vtable === vtable);
    ensure(definition, `Node ${node.address} has unknown vtable ${address(vtable)}`);
    ensure(
      data.length === definition.size,
      `Node ${node.address} has ${data.length} bytes; ${definition.name} requires ${definition.size}`,
    );
    const selectedType = flags & 0x20 ? 0x20 : flags & 0x40 ? 0x40 : flags & 0x80 ? 0x80 : 0;
    ensure(
      selectedType === definition.type,
      `Node ${node.address} class disagrees with path type flags`,
    );
    const expectedPrevious = index
      ? pointer(snapshot.nodes[index - 1].address, "Previous node")
      : 0n;
    const expectedNext =
      index + 1 < count ? pointer(snapshot.nodes[index + 1].address, "Next node") : 0n;
    ensure(
      data.readBigUInt64LE(0x28) === expectedNext,
      `Node ${node.address} next link disagrees with snapshot traversal`,
    );
    ensure(
      data.readBigUInt64LE(0x30) === expectedPrevious,
      `Node ${node.address} previous link disagrees with snapshot traversal`,
    );
    ensure(
      data.readBigUInt64LE(0x38) === owner,
      `Node ${node.address} owner disagrees with path address`,
    );
    return {
      address: address(ptr),
      className: definition.name,
      flags: data.readUInt32LE(0x40),
      x: finite(data.readDoubleLE(8), `Node ${node.address} x`),
      y: finite(data.readDoubleLE(0x10), `Node ${node.address} y`),
      scalar44: finite(data.readFloatLE(0x44), `Node ${node.address} scalar +0x44`),
      scalar4c: finite(data.readFloatLE(0x4c), `Node ${node.address} movement/time factor +0x4c`),
      controls: definition.controls.map((offset) => ({
        x: finite(data.readDoubleLE(offset), "Stored control x"),
        y: finite(data.readDoubleLE(offset + 8), "Stored control y"),
      })),
      // Linked addresses, allocator state and cached fields are excluded from these seven scalars.
      retainedHex: data.subarray(0x44, 0x60).toString("hex"),
      endpointDataHex: data.subarray(0x60, 0x6c).toString("hex"),
      cachedDataHex: data.subarray(0x6c, 0x78).toString("hex"),
    };
  });
  ensure(
    first === (nodes.length ? BigInt(nodes[0].address) : 0n),
    "Path first pointer disagrees with traversal",
  );
  ensure(
    last === (nodes.length ? BigInt(nodes.at(-1)!.address) : 0n),
    "Path last pointer disagrees with traversal",
  );
  return {
    flags,
    nodes,
    fullHeader: header.length >= 0xa8,
    endpointHex: header.length >= 0xa8 ? header.subarray(0x98, 0xa0).toString("hex") : undefined,
  };
}

function bounds(nodes: Point[]) {
  if (!nodes.length) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }
  return { minX, maxX, minY, maxY };
}
function range(values: number[]) {
  if (!values.length) return null;
  let min = Infinity,
    max = -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}
function histogram(values: number[]) {
  const result: Record<string, number> = {};
  for (const value of values)
    result["0x" + value.toString(16)] = (result["0x" + value.toString(16)] ?? 0) + 1;
  return result;
}
function geometryValues(nodes: DecodedNode[]) {
  return nodes.map((node) => ({ x: bits(node.x, 8), y: bits(node.y, 8) }));
}
function sequenceDelta<T>(
  before: DecodedPath,
  after: DecodedPath,
  select: (node: DecodedNode) => T,
) {
  const a = before.nodes.map(select),
    b = after.nodes.map(select);
  return { before: a, after: b, orderedEqual: isDeepStrictEqual(a, b) };
}
function comparePaths(before: DecodedPath, after: DecodedPath) {
  const geometryEqual = isDeepStrictEqual(
    geometryValues(before.nodes),
    geometryValues(after.nodes),
  );
  const controlDelta = sequenceDelta(before, after, (node) =>
    node.controls.map((control) => ({ x: bits(control.x, 8), y: bits(control.y, 8) })),
  );
  const flagsDelta = sequenceDelta(before, after, (node) => node.flags);
  const scalarDelta = (field: "scalar44" | "scalar4c") => ({
    beforeRange: range(before.nodes.map((node) => node[field])),
    afterRange: range(after.nodes.map((node) => node[field])),
    orderedEqual: isDeepStrictEqual(
      before.nodes.map((node) => bits(node[field], 4)),
      after.nodes.map((node) => bits(node[field], 4)),
    ),
  });
  const scalar44 = scalarDelta("scalar44"),
    factor4c = scalarDelta("scalar4c");
  const retainedScalarsEqual = isDeepStrictEqual(
    before.nodes.map((n) => n.retainedHex),
    after.nodes.map((n) => n.retainedHex),
  );
  const endpointDataEqual = isDeepStrictEqual(
    before.nodes.map((n) => n.endpointDataHex),
    after.nodes.map((n) => n.endpointDataHex),
  );
  const cachedDataEqual = isDeepStrictEqual(
    before.nodes.map((n) => n.cachedDataHex),
    after.nodes.map((n) => n.cachedDataHex),
  );
  const changed =
    !geometryEqual ||
    !controlDelta.orderedEqual ||
    !flagsDelta.orderedEqual ||
    !retainedScalarsEqual ||
    !endpointDataEqual ||
    before.flags !== after.flags ||
    (before.fullHeader && after.fullHeader && before.endpointHex !== after.endpointHex);
  return {
    status: "observed",
    classification: changed ? "changed" : "identity",
    basis:
      "Exact ordered positions, stored controls, node/path flags, seven float fields +0x44..+0x5c, node endpoint data +0x60..+0x68 and available path endpoint parameter; no rendering or curve sampling. Cached fields alone do not imply correction.",
    beforeNodeCount: before.nodes.length,
    afterNodeCount: after.nodes.length,
    nodeCountDelta: after.nodes.length - before.nodes.length,
    pathFlags: { before: before.flags, after: after.flags },
    geometry: {
      beforeBounds: bounds(before.nodes),
      afterBounds: bounds(after.nodes),
      orderedEqual: geometryEqual,
    },
    storedControls: {
      orderedEqual: controlDelta.orderedEqual,
      beforeCount: before.nodes.reduce((n, node) => n + node.controls.length, 0),
      afterCount: after.nodes.reduce((n, node) => n + node.controls.length, 0),
    },
    scalar44,
    factor4c,
    retainedScalarsEqual,
    endpointDataEqual,
    cachedDataEqual,
    nodeFlags: {
      orderedEqual: flagsDelta.orderedEqual,
      beforeHistogram: histogram(flagsDelta.before),
      afterHistogram: histogram(flagsDelta.after),
    },
    endpointParameterBytes: {
      available: before.fullHeader && after.fullHeader,
      before: before.endpointHex,
      after: after.endpointHex,
    },
  };
}

/** All errors are retained. Invalid captures cannot produce observed path deltas. */
export function analyzeText(input: string) {
  const errors: string[] = [],
    warnings: string[] = [];
  const calls = new Map<string, CallState>();
  const records: any[] = [];
  let header: CaptureHeader | undefined;
  let imageBase = 0n;
  let summary: any;
  let previousSequence = 0;
  for (const [index, line] of input.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      ensure(object(record), "Record must be an object");
      records.push(record);
    } catch (error) {
      errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const stateFor = (id: string) => {
    if (!calls.has(id)) calls.set(id, { errors: [], helpers: [] });
    return calls.get(id)!;
  };
  for (const [index, record] of records.entries()) {
    let state: CallState | undefined;
    try {
      if (record.kind === "header") {
        ensure(!header && index === 0, "Exactly one header must be the first record");
        ensure(record.schema === "csp-post-capture/v1", "Unsupported capture schema");
        ensure(
          record.imageSha256 === IMAGE_SHA256,
          "Image SHA256 does not match the analyzed CSP ARM64 image",
        );
        ensure(record.architecture === "arm64", "Capture architecture must be arm64");
        ensure(
          ["runtime", "synthetic"].includes(record.provenance),
          "Provenance must explicitly be runtime or synthetic",
        );
        ensure(
          ["mouse", "tablet", "unknown"].includes(record.device),
          "Device provenance is missing",
        );
        imageBase = pointer(record.imageBase, "Image base");
        header = record as CaptureHeader;
        continue;
      }
      ensure(header, "A valid header must precede capture records");
      ensure(!summary, "No records may follow the terminal summary");
      if (record.kind === "diagnostic") {
        text(record.event, "Diagnostic event");
        continue;
      }
      if (record.kind === "summary") {
        summary = record;
        continue;
      }
      ensure(
        Number.isSafeInteger(record.sequence) && record.sequence > previousSequence,
        "Record sequence must be a strictly increasing positive safe integer",
      );
      previousSequence = record.sequence;
      if (record.kind === "error") {
        text(record.message, "Capture error message");
        throw new Error(`Recorder error: ${record.message}`);
      }
      text(record.callId, "callId");
      state = stateFor(record.callId);
      if (record.kind === "helper") {
        const check = evaluateHelper(record as HelperRecord);
        if (header.provenance === "runtime" && record.fpcr !== "00000000") {
          check.status = "not-evaluated";
          check.reason =
            "Runtime helper comparison requires captured FPCR 00000000; nondefault or missing floating-point mode is outside this check.";
        }
        state.helpers.push(check);
        continue;
      }
      ensure(record.kind === "boundary", `Unknown record kind ${String(record.kind)}`);
      ensure(
        record.phase === "entry" || record.phase === "return",
        "Boundary phase must be entry or return",
      );
      ensure(
        record.boundary === (record.phase === "entry" ? "0x1028ed064" : "0x1028ed144"),
        "Boundary address disagrees with phase",
      );
      text(record.threadId, "threadId");
      pointer(record.holder, "Holder");
      validateArguments(record.arguments);
      if (record.configurationFingerprint !== undefined)
        text(record.configurationFingerprint, "Configuration fingerprint");
      if (record.phase === "entry") {
        ensure(!state.entry && !state.returned, "Duplicate or out-of-order entry");
        state.entry = record;
        state.before = decodePath(record.path, imageBase, warnings);
      } else {
        ensure(state.entry && !state.returned, "Return has no preceding entry or is duplicated");
        state.returned = record;
        ensure(
          record.threadId === state.entry.threadId &&
            BigInt(record.holder) === BigInt(state.entry.holder),
          "Return thread/holder differs from entry",
        );
        ensure(
          isDeepStrictEqual(record.arguments, state.entry.arguments),
          "Wrapper argument configuration drift between entry and return",
        );
        ensure(
          record.configurationFingerprint === state.entry.configurationFingerprint,
          "Independent configuration fingerprint drift between entry and return",
        );
        ensure(
          pointer(record.returnedPath, "Returned path") ===
            pointer(record.path?.address, "Return snapshot path"),
          "Returned path disagrees with holder path snapshot",
        );
        state.after = decodePath(record.path, imageBase, warnings);
      }
    } catch (error) {
      const message = `Record ${index + 1}${record.callId ? ` call ${record.callId}` : ""}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(message);
      state?.errors.push(message);
    }
  }
  if (!header) errors.push("No valid capture header");
  const entryCount = [...calls.values()].filter((call) => call.entry).length;
  const pairCount = [...calls.values()].filter(
    (call) => call.entry && call.returned && call.before && call.after && !call.errors.length,
  ).length;
  if (!summary) errors.push("Missing terminal capture summary");
  else {
    if (summary.captureComplete !== true)
      errors.push(`Capture incomplete: ${String(summary.stopReason)}`);
    if (typeof summary.stopReason !== "string" || !summary.stopReason.trim())
      errors.push("Summary stopReason is missing");
    if (summary.entries !== entryCount || summary.pairs !== pairCount)
      errors.push(
        `Summary counters disagree: saved entries/pairs ${String(summary.entries)}/${String(summary.pairs)}, valid observed ${entryCount}/${pairCount}`,
      );
    if (!Array.isArray(summary.cleanupErrors) || summary.cleanupErrors.length)
      errors.push(`Capture cleanup failed: ${JSON.stringify(summary.cleanupErrors)}`);
    if (summary.detachRequestSucceeded !== true || summary.detachedStateObserved !== true)
      errors.push("Clean debugger detach was not both requested and observed");
    if (summary.unmatchedEntries !== undefined && summary.unmatchedEntries !== 0)
      errors.push("Terminal summary declares unmatched entries");
    if (summary.deadlineExceeded !== undefined && summary.deadlineExceeded !== false)
      errors.push("Terminal summary declares a missed deadline");
    if (
      summary.watchdogError !== undefined &&
      summary.watchdogError !== null &&
      summary.watchdogError !== ""
    )
      errors.push(`Capture watchdog failed: ${String(summary.watchdogError)}`);
    if (Array.isArray(summary.cleanupWarnings))
      warnings.push(
        ...summary.cleanupWarnings.map(
          (warning: unknown) => `Recorder cleanup warning: ${String(warning)}`,
        ),
      );
  }
  if (!entryCount) errors.push("Capture contains no wrapper entry");
  for (const [callId, call] of calls) {
    if (!call.entry || !call.returned) {
      const message = `Call ${callId}: missing ${call.entry ? "return" : "entry"} boundary`;
      errors.push(message);
      call.errors.push(message);
    }
  }
  if (!pairCount) errors.push("Capture contains no complete valid before/after pair");
  const results = [...calls].map(([callId, call]) => {
    const valid = errors.length === 0 && call.before && call.after && call.entry;
    let arithmetic: ArithmeticCheck[] = [];
    if (valid) {
      try {
        arithmetic = derivedChecks(call.entry!.arguments, call.before!.nodes);
      } catch (error) {
        arithmetic = [
          {
            name: "ordinaryCoreParameters",
            status: "not-evaluated",
            reason: error instanceof Error ? error.message : String(error),
          },
        ];
      }
      arithmetic.push(...call.helpers);
      if (!call.entry?.configurationFingerprint)
        warnings.push(
          `Call ${callId}: no independent configuration fingerprint; unchanged copied wrapper arguments cannot establish absence of UI-setting drift`,
        );
    }
    const decoded = (path: DecodedPath) =>
      path.nodes.map((node, snapshotIndex) => ({
        snapshotIndex,
        address: node.address,
        className: node.className,
        x: node.x,
        y: node.y,
        flags: node.flags,
        scalar44: bits(node.scalar44, 4),
        factor4c: bits(node.scalar4c, 4),
        storedControls: node.controls,
        retainedScalarsHex: node.retainedHex,
        endpointDataHex: node.endpointDataHex,
        cachedDataHex: node.cachedDataHex,
      }));
    return {
      callId,
      captureIntegrity: valid ? "valid" : "invalid",
      deltas: valid
        ? comparePaths(call.before!, call.after!)
        : { status: "not-evaluated", reason: "Capture integrity failed; inspect retained errors." },
      decodedSnapshots: valid
        ? {
            before: decoded(call.before!),
            after: decoded(call.after!),
            indexMeaning:
              "Local traversal index in each snapshot only; not source-to-output correspondence.",
          }
        : undefined,
      correspondence: {
        status: "not-evaluated",
        reason:
          "Output/source multimap was not captured; ordered equality and aggregate changes do not identify which source nodes survived or merged.",
      },
      arithmetic,
      wholeCurveEquivalence: {
        status: "not-evaluated",
        reason:
          "This capture analyzer does not run a curve prediction. The separate post-pipeline replay compares the reconstructed ordinary open path against this capture; closure and alternate classes remain outside that reconstruction.",
      },
    };
  });
  return {
    schema: "csp-post-report/v1",
    provenance: header?.provenance ?? "unknown",
    device: header?.device ?? "unknown",
    integrity: {
      status: errors.length ? "invalid" : "valid",
      errors,
      warnings,
      entries: entryCount,
      pairs: pairCount,
    },
    arithmeticSummary: {
      matches: results
        .flatMap((call) => call.arithmetic)
        .filter((check) => check.status === "match").length,
      mismatches: results
        .flatMap((call) => call.arithmetic)
        .filter((check) => check.status === "mismatch").length,
      derivedOnly: results
        .flatMap((call) => call.arithmetic)
        .filter((check) => check.status === "derived").length,
    },
    calls: results,
    coverage: {
      captureIntegrity: "evaluated",
      capturedFieldDeltas: errors.length ? "not-evaluated" : "evaluated",
      helperArithmetic: "only explicitly captured helper inputs/results can match or mismatch",
      renderedOutput: "not-evaluated",
      wholeCurveEquivalence: "not-evaluated",
      tabletValidation:
        header?.device === "tablet"
          ? "device label retained; no whole-curve equivalence claim"
          : "not-evaluated",
    },
  };
}
