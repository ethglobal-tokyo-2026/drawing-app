/** Offline replay of one complete saved ordinary post-correction boundary. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createPostEndpointEvaluator } from "../../post-evaluator.ts";
import { decodePostEvaluatorSnapshot } from "../post-joined/evaluator.ts";
import {
  runOrdinaryPost,
  type OrdinaryPostInput,
  type PostNode,
  type PostScalars,
  type PostWorkLimits,
} from "../../post-pipeline.ts";
import { analyzeText } from "../post-replay/analyze.ts";
import { fromBits } from "../post-replay/arithmetic.ts";
import type { BoundaryRecord, CaptureHeader, CaptureRecord } from "../post-replay/schema.ts";

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function decodePostCapture(text: string) {
  const analyzed = analyzeText(text);
  ensure(analyzed.integrity.status === "valid", JSON.stringify(analyzed.integrity.errors));
  ensure(
    analyzed.calls.length === 1 && analyzed.integrity.pairs === 1,
    "Replay requires one complete correction call",
  );
  const snapshots = analyzed.calls[0].decodedSnapshots;
  ensure(snapshots, "Decoded snapshots are missing");
  ensure(
    snapshots.before.every(
      (node) => node.className === "PWVectorBezierCurve" && node.storedControls.length === 1,
    ),
    "Replay source must use quadratic nodes",
  );
  ensure(
    snapshots.after.every((node) => node.className === "PWVectorSplineCurve"),
    "Replay output must use spline nodes",
  );
  const records = text
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as CaptureRecord);
  const entry = records.find(
    (row): row is BoundaryRecord => row.kind === "boundary" && row.phase === "entry",
  )!;
  const returned = records.find(
    (row): row is BoundaryRecord => row.kind === "boundary" && row.phase === "return",
  )!;
  const header = Buffer.from(entry.path.headerHex, "hex");
  ensure(header.length >= 0xa8, "Full path header is required for the endpoint parameter");
  const captureHeader = records.find((row): row is CaptureHeader => row.kind === "header");
  ensure(captureHeader, "Capture header is missing");
  if (captureHeader.provenance === "runtime")
    for (const row of [entry, returned])
      ensure(
        row.fpcr === "00000000",
        `Native post ${row.phase} arithmetic requires observed FPCR zero`,
      );
  const captured = entry.path.endpointEvaluator !== undefined;
  ensure(
    captured === (returned.path.endpointEvaluator !== undefined),
    "Endpoint evaluator snapshots must be paired at entry and return",
  );
  const decodeEvaluator = (row: BoundaryRecord) => {
    const pointer = Buffer.from(row.path.headerHex, "hex").readBigUInt64LE(0x88);
    const snapshot = row.path.endpointEvaluator;
    if (snapshot === undefined) return pointer === 0n ? null : ("unknown" as const);
    const config = decodePostEvaluatorSnapshot(snapshot, captureHeader.imageBase);
    ensure(
      BigInt(snapshot.address) === pointer,
      "Endpoint evaluator snapshot differs from path pointer",
    );
    return config;
  };
  const evaluatorConfig = decodeEvaluator(entry);
  if (captured)
    ensure(
      isDeepStrictEqual(evaluatorConfig, decodeEvaluator(returned)),
      "Endpoint evaluator configuration changed across correction",
    );
  const evaluator =
    evaluatorConfig === null || evaluatorConfig === "unknown"
      ? evaluatorConfig
      : createPostEndpointEvaluator(evaluatorConfig);
  const input: OrdinaryPostInput = {
    nodes: snapshots.before.map((node) => {
      const data = Buffer.from(node.retainedScalarsHex, "hex");
      return {
        point: { x: node.x, y: node.y },
        flags: node.flags,
        scalars: Array.from({ length: 7 }, (_, index) =>
          data.readFloatLE(index * 4),
        ) as PostScalars,
        endpointDataHex: node.endpointDataHex,
        control: node.storedControls[0],
      };
    }),
    pathFlags: header.readUInt32LE(0x20),
    k: entry.arguments.k,
    flag480: entry.arguments.flag480 !== 0,
    closedMode: entry.arguments.closedMode,
    selector482: entry.arguments.selector482,
    tolerance: fromBits(entry.arguments.toleranceBits, 8),
    lengthScale: fromBits(entry.arguments.lengthScaleBits, 8),
  };
  return {
    analyzed,
    input,
    snapshots,
    entry,
    returned,
    pathParameter: header.readDoubleLE(0x98),
    evaluator,
    evaluatorConfig,
    evaluatorConfigurationCaptured: captured,
  };
}
function f64(value: number) {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return bytes.toString("hex");
}
function f32(value: number) {
  const bytes = Buffer.alloc(4);
  bytes.writeFloatBE(value);
  return bytes.toString("hex");
}
function serializeNode(node: PostNode) {
  return {
    id: node.id,
    className: "PWVectorSplineCurve",
    point: node.point,
    positionBits: { x: f64(node.point.x), y: f64(node.point.y) },
    flags: node.flags,
    scalarBits: node.scalars.map(f32),
    endpointDataHex: node.endpointDataHex,
    sourceIndices: node.sourceIndices,
    previousId: node.previous?.id ?? null,
    nextId: node.next?.id ?? null,
  };
}
export function replayPostCapture(text: string, work: PostWorkLimits = {}) {
  const decoded = decodePostCapture(text);
  const result = runOrdinaryPost(
    decoded.input,
    { pathParameter: decoded.pathParameter, evaluator: decoded.evaluator },
    work,
  );
  const differences: { path: string; expected: unknown; actual: unknown }[] = [];
  function compare(path: string, expected: unknown, actual: unknown) {
    if (!Object.is(expected, actual)) differences.push({ path, expected, actual });
  }
  const expectedFlags = Buffer.from(decoded.returned.path.headerHex, "hex").readUInt32LE(0x20);
  compare("pathFlags", expectedFlags, result.outputPathFlags);
  compare("nodeCount", decoded.snapshots.after.length, result.nodes.length);
  const count = Math.max(decoded.snapshots.after.length, result.nodes.length);
  for (let index = 0; index < count; index++) {
    const expected = decoded.snapshots.after[index],
      actual = result.nodes[index];
    if (expected === undefined || actual === undefined) {
      differences.push({
        path: `nodes[${index}]`,
        expected: expected ?? null,
        actual: actual ? serializeNode(actual) : null,
      });
      continue;
    }
    compare(`nodes[${index}].className`, expected.className, "PWVectorSplineCurve");
    compare(`nodes[${index}].x`, f64(expected.x), f64(actual.point.x));
    compare(`nodes[${index}].y`, f64(expected.y), f64(actual.point.y));
    compare(`nodes[${index}].flags`, expected.flags, actual.flags);
    compare(`nodes[${index}].endpointDataHex`, expected.endpointDataHex, actual.endpointDataHex);
    const expectedScalars = Buffer.from(expected.retainedScalarsHex, "hex");
    for (let field = 0; field < 7; field++)
      compare(
        `nodes[${index}].scalar+0x${(0x44 + field * 4).toString(16)}`,
        f32(expectedScalars.readFloatLE(field * 4)),
        f32(actual.scalars[field]),
      );
    compare(
      `nodes[${index}].previous`,
      result.nodes[index - 1]?.id ?? null,
      actual.previous?.id ?? null,
    );
    compare(`nodes[${index}].next`, result.nodes[index + 1]?.id ?? null, actual.next?.id ?? null);
  }
  return {
    schema: "csp-post-pipeline-replay/v1",
    stage: "complete-ordinary-open-correction",
    inputSha256: createHash("sha256").update(text).digest("hex"),
    status: differences.length ? "mismatch" : "match",
    scope:
      "Ordered positions, seven retained binary32 scalars, node flags, endpoint data, adjacency and path type flags for ordinary open quadratic input with zero node flags and zero angle scalar. Endpoint geometry with unknown evaluator requires independently established travel-limit exits. Native allocation addresses, caches, rendering and evaluator side effects are outside this comparison.",
    captureIntegrity: decoded.analyzed.integrity,
    arguments: decoded.entry.arguments,
    pathParameter: decoded.pathParameter,
    endpointEvaluator: {
      configurationCaptured: decoded.evaluatorConfigurationCaptured,
      configuration: decoded.evaluatorConfig,
    },
    limits: {
      maximumNodes: work.maximumNodes ?? 10000,
      maximumSourceChecks: work.maximumSourceChecks ?? 1000000,
      deadlineMilliseconds: work.deadlineMilliseconds ?? 60000,
    },
    sourceCount: decoded.input.nodes.length,
    subdividedSourceCount: result.sourceNodes.length,
    resultCount: result.nodes.length,
    expectedCount: decoded.snapshots.after.length,
    differenceCount: differences.length,
    differences,
    subdivision: result.subdivision,
    sourceChecks: result.sourceChecks,
    passes: result.trace,
    endpointPasses: result.endpointPasses,
    preEndpointNodes: result.preEndpointNodes,
    predictedNodes: result.nodes.map(serializeNode),
    sourceNodes: result.sourceNodes.map((node) => ({
      ...serializeNode(node),
      className: "PWVectorBezierCurve",
      control: node.control,
      controlBits: node.control ? { x: f64(node.control.x), y: f64(node.control.y) } : null,
    })),
    elapsedMilliseconds: result.elapsedMilliseconds,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputPath, outputPath, deadlineArgument] = process.argv.slice(2);
  ensure(
    inputPath && outputPath,
    "Usage: replay.ts capture.jsonl new-report.json [deadlineMilliseconds]",
  );
  const deadlineMilliseconds = deadlineArgument === undefined ? 60000 : Number(deadlineArgument);
  const completedPasses: unknown[] = [];
  const text = readFileSync(inputPath, "utf8");
  try {
    const report = replayPostCapture(text, {
      deadlineMilliseconds,
      onPass: (pass) => {
        completedPasses.push(pass);
        console.log(`${pass.stage}: ${pass.before} -> ${pass.after}`);
      },
    });
    writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    console.log(
      JSON.stringify({
        status: report.status,
        differenceCount: report.differenceCount,
        resultCount: report.resultCount,
        elapsedMilliseconds: report.elapsedMilliseconds,
      }),
    );
    if (report.status !== "match") process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          schema: "csp-post-pipeline-replay/v1",
          status: "failed",
          inputSha256: createHash("sha256").update(text).digest("hex"),
          error: message,
          deadlineMilliseconds,
          completedPasses,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    throw error;
  }
}
