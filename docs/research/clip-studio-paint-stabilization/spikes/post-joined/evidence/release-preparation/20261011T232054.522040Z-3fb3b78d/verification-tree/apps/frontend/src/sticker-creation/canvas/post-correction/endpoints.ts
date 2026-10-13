/** Geometry of ordinary open-path endpoint processing at 0x102787db0. */
import { fma64 } from "../stabilization/binary64.ts";
import { buildSplineContext, type SplineNode } from "./spline-context.ts";
import { splineLength } from "./spline-length.ts";

export type EndpointPassReport = {
  direction: "head" | "tail";
  reason: "travel-limit" | "end";
  firstSegmentLength?: number;
  cumulativeLength: number;
  travelLimit: number;
  removed: number;
  evaluatorGeometryIndependent: boolean;
  decisions: {
    x: number;
    y: number;
    segmentLength: number;
    cumulativeLength: number;
    threshold: number;
    removed: boolean;
  }[];
};

function segmentLength(a: SplineNode, b: SplineNode): number {
  const context = buildSplineContext(a, b, 0);
  if (context === null) throw new Error("Endpoint spline context is absent");
  const length = splineLength(context, false);
  if (!Number.isFinite(length)) throw new RangeError("Endpoint segment length is nonfinite");
  return length;
}

/**
 * Null means the native evaluator pointer is absent; its value is then 1.
 * Unknown configuration is accepted only when geometry exits before a decision.
 * That proves retained geometry only: native initial evaluator side effects and
 * floating-point status flags are not executed or claimed by this reference.
 */
export function processPostEndpoints<T extends SplineNode>(
  input: readonly T[],
  amount: number,
  pathParameter: number,
  evaluator: ((node: T, parameter: number) => number) | null | "unknown",
): { nodes: T[]; passes: EndpointPassReport[] } {
  if (!Number.isFinite(amount) || !Number.isFinite(pathParameter)) {
    throw new RangeError("Endpoint amount and path parameter must be finite");
  }
  if (input.length === 0) throw new RangeError("Endpoint reference requires a nonempty path");
  for (let index = 0; index < input.length; index++) {
    if (
      input[index].previous !== (input[index - 1] ?? null) ||
      input[index].next !== (input[index + 1] ?? null)
    ) {
      throw new Error("Endpoint reference requires resolved linear open-path links");
    }
  }
  const travelLimit = pathParameter < 2 ? 2 : pathParameter;
  // Check both ends before any mutation if their evaluator configuration is absent.
  if (evaluator === "unknown" && input.length > 1) {
    const head = segmentLength(input[0], input[1]);
    const tail = segmentLength(input[input.length - 2], input[input.length - 1]);
    if (!(head > travelLimit && tail > travelLimit)) {
      throw new Error(
        "Missing endpoint evaluator configuration affects a possible geometry decision",
      );
    }
  }
  const nodes = [...input];
  const originals = new Set<SplineNode>(input);
  const isOriginal = (node: SplineNode): node is T => originals.has(node);
  const value = (node: T): number => {
    if (evaluator === "unknown")
      throw new Error("Unknown endpoint evaluator must not be substituted");
    const result = evaluator === null ? 1 : evaluator(node, pathParameter);
    if (!Number.isFinite(result))
      throw new RangeError("Endpoint evaluator returned a nonfinite value");
    return result < 1 ? 1 : result;
  };
  const passes: EndpointPassReport[] = [];
  for (const direction of ["head", "tail"] as const) {
    const fromHead = direction === "head";
    let anchor = nodes[fromHead ? 0 : nodes.length - 1];
    const report: EndpointPassReport = {
      direction,
      reason: "end",
      cumulativeLength: 0,
      travelLimit,
      removed: 0,
      evaluatorGeometryIndependent: evaluator === "unknown",
      decisions: [],
    };
    passes.push(report);
    let anchorValue = evaluator === "unknown" ? undefined : value(anchor);
    let kept = false;
    const remaining = 1 - amount;
    while (true) {
      const next = fromHead ? anchor.next : anchor.previous;
      if (next === null) break;
      if (!isOriginal(next)) throw new Error("Endpoint link left its original path");
      const length = fromHead ? segmentLength(anchor, next) : segmentLength(next, anchor);
      if (report.firstSegmentLength === undefined) report.firstSegmentLength = length;
      report.cumulativeLength = report.cumulativeLength + length;
      if (report.cumulativeLength > travelLimit) {
        report.reason = "travel-limit";
        break;
      }
      const nextValue = value(next);
      if (anchorValue === undefined) throw new Error("Endpoint anchor evaluator is unknown");
      const threshold = fma64(-anchorValue, remaining, nextValue);
      const remove =
        length < threshold && (kept || report.cumulativeLength < 0.5 || (next.flags & 1) !== 0);
      report.decisions.push({
        x: anchor.point.x,
        y: anchor.point.y,
        segmentLength: length,
        cumulativeLength: report.cumulativeLength,
        threshold,
        removed: remove,
      });
      if (remove) {
        // Spline virtual deletion callback 0x10276e704 is a return; repair links.
        if (anchor.previous !== null) anchor.previous.next = anchor.next;
        if (anchor.next !== null) anchor.next.previous = anchor.previous;
        const index = nodes.indexOf(anchor);
        if (index < 0) throw new Error("Endpoint node disappeared from the retained path");
        nodes.splice(index, 1);
        anchor.previous = null;
        anchor.next = null;
        report.removed++;
      } else {
        kept = true;
      }
      anchor = next;
      anchorValue = nextValue;
    }
  }
  return { nodes, passes };
}
