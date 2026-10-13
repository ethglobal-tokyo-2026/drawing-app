/** Offline position/control-only reconstruction of the captured open quadratic subdivision. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fma64 } from "../../../../../apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts";
import { evaluateQuadratic, quadraticLength, splitQuadratic } from "../../post-quadratic.ts";
import type { Point } from "../../post-reference.ts";
import { analyzeText } from "../post-replay/analyze.ts";
import { fromBits } from "../post-replay/arithmetic.ts";
import type { BoundaryRecord } from "../post-replay/schema.ts";

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error("Usage: analyze-quadratic-subdivision.ts capture.jsonl report.json");
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const input = readFileSync(inputPath);
const started = performance.now();
const maximumNodes = 10000;
const deadlineMilliseconds = 30000;
const evidence = {
  inputPath,
  inputSha256: createHash("sha256").update(input).digest("hex"),
  scope:
    "Positions and stored quadratic controls only; no scalar import, source/output associations, removal, endpoints, closure, rendering, or complete correction claim.",
  sourceFunctions: ["0x102787500", "0x10277f8c8", "0x10276dec8", "0x102765694"],
  bounds: { maximumNodes, deadlineMilliseconds, maximumLengthSampleIntervals: 100000 },
};
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function checkDeadline() {
  ensure(
    performance.now() - started < deadlineMilliseconds,
    "Subdivision exceeded its 30000 ms research deadline",
  );
}
function bits(value: number) {
  ensure(Number.isFinite(value), "Subdivision produced a nonfinite coordinate");
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return bytes.toString("hex");
}
function pointBits(point: Point) {
  return { x: bits(point.x), y: bits(point.y) };
}
function equalPoint(a: Point, b: Point) {
  return bits(a.x) === bits(b.x) && bits(a.y) === bits(b.y);
}
function squaredSeparation(endpoint: Point, point: Point) {
  const dx = endpoint.x - point.x;
  const dy = endpoint.y - point.y;
  return fma64(dx, dx, dy * dy);
}
type Node = Point & { control: Point; originalIndex: number | null; originalSegmentIndex: number };

try {
  const decoded = analyzeText(input.toString("utf8"));
  ensure(decoded.integrity.status === "valid", JSON.stringify(decoded.integrity.errors));
  ensure(
    decoded.calls.length === 1 && decoded.integrity.pairs === 1,
    "Expected exactly one complete captured correction call",
  );
  const snapshots = decoded.calls[0].decodedSnapshots;
  ensure(snapshots, "Validated decoded snapshots are absent");
  const entries = input
    .toString("utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { kind: string; phase?: string })
    .filter((row) => row.kind === "boundary" && row.phase === "entry") as BoundaryRecord[];
  ensure(entries.length === 1, "Expected one entry record");
  const entry = entries[0];
  const flags = Buffer.from(entry.path.headerHex, "hex").readUInt32LE(0x20);
  ensure(
    (flags & 0xf0) === 0x20 && (flags & 0x100) === 0,
    "Expected an open quadratic source path",
  );
  ensure(
    entry.arguments.flag480 === 0 &&
      entry.arguments.selector482 === 0 &&
      entry.arguments.closedMode === 0,
    "Expected the captured ordinary open spline-output branch",
  );
  ensure(
    snapshots.before.every(
      (node) =>
        node.className === "PWVectorBezierCurve" &&
        node.flags === 0 &&
        node.storedControls.length === 1,
    ),
    "Source is outside the zero-flag quadratic node scope",
  );
  const lengthScale = fromBits(entry.arguments.lengthScaleBits, 8);
  const threshold = 10 * lengthScale;
  ensure(
    threshold > 0 && Number.isFinite(threshold),
    "Subdivision threshold must be positive and finite",
  );
  const nodes: Node[] = snapshots.before.map((node, index) => ({
    x: node.x,
    y: node.y,
    control: { ...node.storedControls[0] },
    originalIndex: index,
    originalSegmentIndex: index,
  }));
  let lengthCalls = 0;
  let insertedNodes = 0;
  let rejectedSplits = 0;
  let maximumAcceptedLength = 0;
  const rejections: { index: number; length: number; startSquared: number; endSquared: number }[] =
    [];
  for (let index = 0; index + 1 < nodes.length;) {
    checkDeadline();
    const current = nodes[index];
    const next = nodes[index + 1];
    const points = [current, current.control, next] as const;
    const length = quadraticLength(points, true);
    lengthCalls++;
    checkDeadline();
    if (length > threshold) {
      const proposed = evaluateQuadratic(points, 0.5);
      const endSquared = squaredSeparation(next, proposed);
      const startSquared = squaredSeparation(current, proposed);
      if (endSquared < 0.25 || startSquared < 0.25) {
        rejections.push({ index, length, startSquared, endSquared });
        rejectedSplits++;
      } else {
        ensure(nodes.length < maximumNodes, "Subdivision exceeds the 10000-node research limit");
        const controls = splitQuadratic(points, 0.5);
        current.control = controls.leftControl;
        nodes.splice(index + 1, 0, {
          ...proposed,
          control: controls.rightControl,
          originalIndex: null,
          originalSegmentIndex: current.originalSegmentIndex,
        });
        insertedNodes++;
        continue;
      }
    } else {
      maximumAcceptedLength = Math.max(maximumAcceptedLength, length);
    }
    index++;
  }
  checkDeadline();
  const originals = nodes.filter((node) => node.originalIndex !== null);
  ensure(
    originals.length === snapshots.before.length &&
      originals.every(
        (node, index) => node.originalIndex === index && equalPoint(node, snapshots.before[index]),
      ),
    "Subdivision changed original point order or coordinates",
  );
  const matches = snapshots.after.map((point, outputIndex) => ({
    outputIndex,
    point: { x: point.x, y: point.y },
    bits: pointBits(point),
    originalIndices: snapshots.before.flatMap((source, index) =>
      equalPoint(source, point) ? [index] : [],
    ),
    subdividedIndices: nodes.flatMap((source, index) => (equalPoint(source, point) ? [index] : [])),
  }));
  const absentFromOriginal = matches.filter((match) => match.originalIndices.length === 0);
  const report = {
    schema: "csp-post-quadratic-subdivision/v1",
    status: "complete",
    ...evidence,
    captureIntegrity: decoded.integrity,
    arguments: entry.arguments,
    sourceFlags: "0x" + flags.toString(16),
    lengthScale,
    threshold,
    sourceNodes: snapshots.before.length,
    subdividedNodes: nodes.length,
    insertedNodes,
    lengthCalls,
    rejectedSplits,
    rejections,
    maximumAcceptedLength,
    outputPositions: matches,
    outputPositionsAbsentFromOriginal: absentFromOriginal.length,
    newlyExplainedPositions: absentFromOriginal.filter(
      (match) => match.subdividedIndices.length > 0,
    ).length,
    unmatchedOutputPositions: matches.filter((match) => match.subdividedIndices.length === 0)
      .length,
    qualification:
      "Bit-exact final-position membership is evidence for the position subdivision stage, not an independent observation of native intermediate nodes or proof of the complete correction pass.",
    nodes: nodes.map((node, index) => ({
      index,
      ...node,
      bits: pointBits(node),
      controlBits: pointBits(node.control),
    })),
    elapsedMilliseconds: performance.now() - started,
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      status: report.status,
      sourceNodes: report.sourceNodes,
      subdividedNodes: report.subdividedNodes,
      insertedNodes,
      rejectedSplits,
      newlyExplainedPositions: report.newlyExplainedPositions,
      unmatchedOutputPositions: report.unmatchedOutputPositions,
      elapsedMilliseconds: report.elapsedMilliseconds,
    }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        schema: "csp-post-quadratic-subdivision/v1",
        status: "failed",
        ...evidence,
        error: message,
        elapsedMilliseconds: performance.now() - started,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  throw error;
}
