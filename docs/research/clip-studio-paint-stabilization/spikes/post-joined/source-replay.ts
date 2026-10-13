/** Join observed SVectorNode records to source construction and ordinary correction. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  QuadraticSourceBuilder,
  type SourceConfiguration,
  type SourceRecord,
} from "../../post-source.ts";
import type { PostNodeInput, PostScalars } from "../../post-pipeline.ts";
import { decodePostCapture, replayPostCapture } from "../post-pipeline/replay.ts";
import { fromBits } from "../post-replay/arithmetic.ts";
import { pointDistance } from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts";

type ObjectValue = Record<string, unknown>;
type Difference = { path: string; expected: unknown; actual: unknown };

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, label: string): ObjectValue {
  ensure(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} is missing`,
  );
  return value as ObjectValue;
}
function complete(value: ObjectValue, label: string) {
  ensure(
    value.complete === true && Array.isArray(value.errors) && value.errors.length === 0,
    `${label} is incomplete: ${JSON.stringify(value.errors)}`,
  );
}
function raw(value: unknown, length: number, label: string) {
  ensure(
    typeof value === "string" && new RegExp(`^[0-9a-fA-F]{${length * 2}}$`).test(value),
    `${label} requires exactly ${length} raw bytes`,
  );
  return Buffer.from(value, "hex");
}
function address(value: unknown, label: string) {
  ensure(
    typeof value === "string" && /^0x[0-9a-fA-F]{1,16}$/.test(value),
    `${label} is not a pointer`,
  );
  const result = BigInt(value);
  ensure(result > 0n && result % 8n === 0n, `${label} is null or unaligned`);
  return result;
}
function double(bytes: Buffer, offset: number, label: string) {
  const value = bytes.readDoubleLE(offset);
  ensure(Number.isFinite(value), `${label} must be finite`);
  return value;
}
function record(bytes: Buffer, sourceIndex: number): SourceRecord {
  return {
    point: { x: double(bytes, 0, "Source x"), y: double(bytes, 8, "Source y") },
    scalars: Array.from({ length: 7 }, (_, index) =>
      double(bytes, 0x10 + index * 8, `Source scalar ${index}`),
    ) as PostScalars,
    flags: bytes.readUInt32LE(0x50),
    sourceIndex,
  };
}
function bits(value: number, size: 4 | 8) {
  const data = Buffer.alloc(size);
  if (size === 4) data.writeFloatBE(value);
  else data.writeDoubleBE(value);
  return data.toString("hex");
}
function compareNodes(expected: readonly PostNodeInput[], actual: readonly PostNodeInput[]) {
  const differences: Difference[] = [];
  const compare = (path: string, before: unknown, after: unknown) => {
    if (!Object.is(before, after)) differences.push({ path, expected: before, actual: after });
  };
  compare("nodeCount", expected.length, actual.length);
  for (let index = 0; index < Math.max(expected.length, actual.length); index++) {
    const a = expected[index],
      b = actual[index],
      prefix = `nodes[${index}]`;
    if (!a || !b) {
      compare(prefix, a ?? null, b ?? null);
      continue;
    }
    compare(`${prefix}.x`, bits(a.point.x, 8), bits(b.point.x, 8));
    compare(`${prefix}.y`, bits(a.point.y, 8), bits(b.point.y, 8));
    compare(`${prefix}.flags`, a.flags, b.flags);
    compare(`${prefix}.endpointDataHex`, a.endpointDataHex, b.endpointDataHex);
    for (let field = 0; field < 7; field++)
      compare(`${prefix}.scalar[${field}]`, bits(a.scalars[field], 4), bits(b.scalars[field], 4));
    for (const axis of ["x", "y"] as const)
      compare(
        `${prefix}.control.${axis}`,
        a.control ? bits(a.control[axis], 8) : null,
        b.control ? bits(b.control[axis], 8) : null,
      );
  }
  return differences;
}

export function replayJoinedSourceCapture(text: string) {
  const decoded = decodePostCapture(text);
  const rows: ObjectValue[] = text
    .trim()
    .split("\n")
    .map((line) => object(JSON.parse(line), "Capture row"));
  const entryIndex = rows.findIndex((row) => row.kind === "boundary" && row.phase === "entry");
  const events = rows.flatMap((row, position) => {
    if (
      row.kind !== "diagnostic" ||
      !["source_begin", "source_append", "source_finish"].includes(String(row.event))
    )
      return [];
    ensure(
      position < entryIndex,
      "Every source event must precede the post boundary; finish must be before correction",
    );
    return [{ operation: row.event, details: object(row.details, "Source details") }];
  });
  ensure(
    events.length >= 2 && events[0].operation === "source_begin",
    "One source begin and finish are required",
  );
  ensure(events.length <= 256, "Source event limit exceeded; no prefix is accepted");
  ensure(events.at(-1)?.operation === "source_finish", "Source finish is missing");
  const sourceRecords: SourceRecord[] = [];
  let configuration: SourceConfiguration | undefined;
  let begin: Buffer | undefined;
  let configurationKey: string | undefined;
  let builder: QuadraticSourceBuilder | undefined;
  let deferred = false;
  let marker = 0;
  let distance = 0;
  let endpointResolution:
    | {
        inputBrush: string;
        observedEvaluator: string;
        status: "null-input-cleared" | "observed-resolver-output";
        cacheOrCopySelection: "not-replayed";
      }
    | undefined;
  const callers: string[] = [];
  events.forEach(({ operation, details }, index) => {
    complete(details, `Source ${index}`);
    if (decoded.analyzed.provenance === "runtime")
      ensure(details.fpcr === "00000000", "Native source arithmetic requires observed FPCR zero");
    ensure(
      details.sourceSequence === index + 1,
      "Source sequence is missing, duplicated, or out of order",
    );
    ensure(
      address(details.holder, "Source holder") === address(decoded.entry.holder, "Post holder"),
      "Source holder differs from post holder",
    );
    ensure(details.threadId === decoded.entry.threadId, "Source thread differs from post thread");
    address(details.recordAddress, "Source record address");
    const expectedBoundary =
      operation === "source_begin"
        ? "0x1028ebd40"
        : operation === "source_append"
          ? "0x1028ec548"
          : "0x1028ec8d0";
    ensure(
      details.boundary === expectedBoundary,
      "Source boundary differs from declared operation",
    );
    const allowedCallers =
      operation === "source_begin"
        ? ["0x10288ad38"]
        : operation === "source_append"
          ? ["0x10288dda0", "0x10288e2d8"]
          : ["0x102891848"];
    ensure(
      typeof details.callerReturn === "string" && allowedCallers.includes(details.callerReturn),
      "Source caller is not a verified primary path",
    );
    callers.push(details.callerReturn);
    const inputBytes = raw(details.recordHex, 0x58, "Source record");
    const input = record(inputBytes, index);
    sourceRecords.push(input);
    if (index === 0) {
      begin = raw(details.beginHex, 0x108, "Source begin configuration");
      ensure(
        begin.subarray(0x50, 0xa8).equals(inputBytes),
        "Source begin record differs from embedded input",
      );
      ensure(
        begin.readUInt32LE(0xd8) === 0,
        "Source replay only supports ordinary open quadratic construction",
      );
      const pathHeader = Buffer.from(decoded.entry.path.headerHex, "hex");
      ensure(
        begin.subarray(0x10, 0x18).equals(pathHeader.subarray(0x98, 0xa0)),
        "Source begin path parameter differs from the observed post path parameter",
      );
      const inputBrush = begin.readBigUInt64LE(0x20);
      const observedEvaluator = pathHeader.readBigUInt64LE(0x88);
      // Begin 0x1028ebd40 calls virtual +0xa0. Setter 0x1027897a0 resolves
      // non-null input through 0x1024cc404, then stores the returned shared
      // pointer at path +0x88/+0x90. Cache reuse or copying changes identity;
      // the resolver's input-to-output configuration conversion is not replayed.
      if (inputBrush === 0n)
        ensure(
          observedEvaluator === 0n && pathHeader.readBigUInt64LE(0x90) === 0n,
          "Null source brush must clear both observed post evaluator pointers",
        );
      else {
        address(`0x${inputBrush.toString(16)}`, "Source input brush");
        ensure(
          decoded.evaluatorConfigurationCaptured,
          "Non-null source brush requires the captured resolved post evaluator configuration",
        );
      }
      endpointResolution = {
        inputBrush: `0x${inputBrush.toString(16)}`,
        observedEvaluator: `0x${observedEvaluator.toString(16)}`,
        status: inputBrush === 0n ? "null-input-cleared" : "observed-resolver-output",
        cacheOrCopySelection: "not-replayed",
      };
      deferred = begin.readUInt32LE(0xdc) !== 0;
      return;
    }
    ensure(
      operation === (index === events.length - 1 ? "source_finish" : "source_append"),
      "Source sequence contains an unexpected begin or finish",
    );
    ensure(begin, "Source begin is missing");
    const observed = object(details.holderBefore, "Effective holder configuration");
    complete(observed, "Effective holder configuration");
    ensure(
      address(observed.pathAddress, "Source path") ===
        address(decoded.entry.path.address, "Post source path"),
      "Source path changed before correction",
    );
    const state = raw(observed.stateHex, 0x44, "Holder source state");
    ensure(
      state.readUInt32LE(0) === begin.readUInt32LE(0x104),
      "Source mode configuration differs from begin",
    );
    ensure(
      (state.readUInt32LE(0x40) !== 0) === deferred,
      "Native source deferred state differs from replay",
    );
    ensure(state.readUInt32LE(0x24) === marker, "Native source marker state differs from replay");
    ensure(
      bits(double(state, 0x10, "Source accumulated distance"), 8) === bits(distance, 8),
      "Native source accumulated distance differs from replay",
    );
    ensure(
      state.readUInt32LE(4) === begin.readUInt32LE(0xc0),
      "Source fade configuration differs from begin",
    );
    ensure(
      state.subarray(8, 16).equals(begin.subarray(0xc8, 0xd0)),
      "Source fade length differs from begin",
    );
    const currentConfiguration: SourceConfiguration = {
      deferFirstNode: begin.readUInt32LE(0xdc) !== 0,
      fadeScalar54: state.readUInt32LE(4) ? { length: double(state, 8, "Fade length") } : null,
      cornerDetection: state.readUInt32LE(0x20)
        ? { positionalTolerance: double(state, 0x18, "Corner tolerance") }
        : null,
    };
    const key = [state.subarray(4, 16), state.subarray(0x18, 0x24)]
      .map((part) => part.toString("hex"))
      .join(":");
    if (builder === undefined) {
      configuration = currentConfiguration;
      configurationKey = key;
      builder = new QuadraticSourceBuilder(sourceRecords[0], currentConfiguration, 4096);
    } else
      ensure(key === configurationKey, "Effective source configuration changed during the stroke");
    if (currentConfiguration.fadeScalar54 && !(operation === "source_append" && deferred))
      distance = pointDistance(input.point, sourceRecords[index - 1].point) + distance;
    if (operation === "source_append") {
      ensure(typeof details.scaleBits === "string", "Source scale bits are missing");
      const scale = fromBits(details.scaleBits, 8);
      ensure(scale > 0, "Source input scale must be positive");
      builder.append(input, scale);
      deferred = false;
      marker = input.flags & 0x10;
    } else {
      ensure(
        Number.isInteger(details.renderFlag) &&
          Number(details.renderFlag) >= 0 &&
          Number(details.renderFlag) <= 0xffffffff,
        "Source render flag must be uint32",
      );
      builder.finish(input);
    }
  });
  ensure(builder && configuration, "Source construction was not completed");
  const predicted = (builder as QuadraticSourceBuilder).snapshot();
  const differences = compareNodes(decoded.input.nodes, predicted.nodes);
  if (predicted.pathFlags !== decoded.input.pathFlags)
    differences.push({
      path: "pathFlags",
      expected: decoded.input.pathFlags,
      actual: predicted.pathFlags,
    });
  let post:
    | ReturnType<typeof replayPostCapture>
    | { status: "failed"; differenceCount: null; error: string };
  try {
    post = replayPostCapture(text);
  } catch (error) {
    post = {
      status: "failed",
      differenceCount: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    schema: "csp-joined-source-post-replay/v1",
    inputSha256: createHash("sha256").update(text).digest("hex"),
    provenance: decoded.analyzed.provenance,
    status: differences.length ? "mismatch" : post.status,
    scope:
      "Observed constructed records → quadratic source → ordinary corrected path with independently observed resolved evaluator configuration. Evaluator cache/copy selection, browser acquisition, native upstream record generation and rendered pixels are not evaluated.",
    source: {
      status: differences.length ? "mismatch" : "match",
      recordCount: sourceRecords.length,
      callers,
      configuration,
      endpointResolution,
      differenceCount: differences.length,
      differences,
      predictedNodes: predicted.nodes,
    },
    post,
    upstream: {
      status: "not-evaluated",
      reason:
        "Raw upstream snapshots are retained independently; this reader has not replayed event-to-record conversion.",
    },
    wholeFeatureEquivalence: "not-established",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  ensure(input && output, "Usage: source-replay.ts capture.jsonl new-report.json");
  const report = replayJoinedSourceCapture(readFileSync(input, "utf8"));
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      status: report.status,
      provenance: report.provenance,
      sourceDifferences: report.source.differenceCount,
      postDifferences: report.post.differenceCount,
    }),
  );
  if (report.status !== "match") process.exitCode = 1;
}
