/**
 * Reconstructed ordinary open quadratic-to-spline post correction.
 * Source node flags must be zero and angle scalar +0x50 must be zero.
 * Region restrictions, closed paths, alternate selectors and other source classes
 * are rejected rather than approximated. Native addresses are in post-analysis.md.
 */
import { fma64 } from "../stabilization/binary64.ts";
import { evaluateQuadratic, quadraticLength, splitQuadratic } from "./quadratic.ts";
import {
  nearestSampleDistance,
  nearestSampleParameter,
  sampleQuadraticForCorrection,
} from "./sampling.ts";
import { sampleSplineNodes, type SplineNode } from "./spline-context.ts";
import { processPostEndpoints } from "./endpoints.ts";
import {
  classifiedCornerFlags,
  cornerPredicate,
  endpointParameter,
  nearCoincidentRemovalAccepted,
  removalPassSchedule,
  removalScalarAccepted,
  scalarBounds,
  scalarLimits,
  scalarWithinBounds,
  sourceSegmentTolerance,
  type Point,
} from "./reference.ts";

/** In order: binary32 fields +0x44, +0x48, +0x4c, +0x50, +0x54, +0x58, +0x5c. */
export type PostScalars = [number, number, number, number, number, number, number];
export interface PostNodeInput {
  point: Point;
  flags: number;
  scalars: PostScalars;
  endpointDataHex: string;
  control: Point;
}
export interface PostNode extends SplineNode {
  id: number;
  previous: PostNode | null;
  next: PostNode | null;
  scalars: PostScalars;
  endpointDataHex: string;
  sourceIndices: number[];
  control?: Point;
}
export interface OrdinaryPostInput {
  nodes: readonly PostNodeInput[];
  pathFlags: number;
  k: number;
  tolerance: number;
  lengthScale: number;
  flag480: boolean;
  selector482: number;
  closedMode: number;
}
export type CandidateDecision = {
  candidateId: number;
  accepted: boolean;
  reason: string;
  sourceIndex?: number;
  mode?: number;
  distance?: number;
  effectiveTolerance?: number;
};
export type PostPassTrace = {
  stage: string;
  tolerance?: number;
  before: number;
  after: number;
  remainingIds: number[];
  flags: number[];
  decisions: CandidateDecision[];
};
export interface PostWorkLimits {
  maximumNodes?: number;
  maximumSourceChecks?: number;
  deadlineMilliseconds?: number;
  onPass?: (pass: PostPassTrace) => void;
}
export interface PostEndpointContext {
  pathParameter: number;
  evaluator: ((node: PostNode, parameter: number) => number) | null | "unknown";
}
const zeroEndpointData = "000000000000000000000000";
const copyPoint = (point: Point): Point => ({ x: point.x, y: point.y });
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function finitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
function link(nodes: PostNode[]) {
  nodes.forEach((node, index) => {
    node.previous = nodes[index - 1] ?? null;
    node.next = nodes[index + 1] ?? null;
  });
}
function squaredSeparation(endpoint: Point, point: Point) {
  const dx = endpoint.x - point.x,
    dy = endpoint.y - point.y;
  return fma64(dx, dx, dy * dy);
}

export function runOrdinaryPostBeforeEndpoints(
  input: OrdinaryPostInput,
  work: PostWorkLimits = {},
) {
  ensure(
    input.selector482 === 0 && input.closedMode === 0,
    "Only the ordinary open correction branch is supported",
  );
  ensure(
    Number.isInteger(input.pathFlags) &&
      (input.pathFlags & 0xf0) === 0x20 &&
      (input.pathFlags & 0x100) === 0,
    "Only an open quadratic source path is supported",
  );
  ensure(input.nodes.length >= 2, "Ordinary post correction requires at least two source nodes");
  ensure(
    Number.isFinite(input.tolerance) && Number.isFinite(input.lengthScale) && input.lengthScale > 0,
    "Post tolerance must be finite and length scale positive and finite",
  );
  const limits = scalarLimits(input.k);
  const schedule = removalPassSchedule(input.k, input.tolerance);
  const maximumNodes = work.maximumNodes ?? 10000;
  const maximumSourceChecks = work.maximumSourceChecks ?? 1000000;
  const deadlineMilliseconds = work.deadlineMilliseconds ?? 60000;
  ensure(
    Number.isInteger(maximumNodes) &&
      maximumNodes >= 2 &&
      Number.isInteger(maximumSourceChecks) &&
      maximumSourceChecks > 0 &&
      Number.isFinite(deadlineMilliseconds) &&
      deadlineMilliseconds > 0,
    "Research work limits must be positive and finite",
  );
  ensure(input.nodes.length <= maximumNodes, "Input exceeds post node work limit");
  const started = performance.now();
  let sourceChecks = 0;
  const checkDeadline = () =>
    ensure(
      performance.now() - started < deadlineMilliseconds,
      "Post correction exceeded its research deadline",
    );
  const sourceNodes: PostNode[] = input.nodes.map((node, id) => {
    ensure(node.flags === 0, "Source node flags must be zero in this reconstruction");
    ensure(
      node.scalars.length === 7 &&
        node.scalars.every(
          (value) => Number.isFinite(value) && Object.is(value, Math.fround(value)),
        ),
      "Source scalars must be seven finite binary32 values",
    );
    ensure(node.scalars[3] === 0, "Nonzero source angle scalar +0x50 is unsupported");
    ensure(
      finitePoint(node.point) && finitePoint(node.control),
      "Source positions and controls must be finite",
    );
    ensure(
      /^[0-9a-fA-F]{24}$/.test(node.endpointDataHex),
      "Source endpoint data must contain all twelve bytes",
    );
    return {
      id,
      point: copyPoint(node.point),
      flags: node.flags,
      scalars: [...node.scalars],
      endpointDataHex: node.endpointDataHex.toLowerCase(),
      control: copyPoint(node.control),
      sourceIndices: [],
      previous: null,
      next: null,
    };
  });
  const threshold = 10 * input.lengthScale;
  ensure(Number.isFinite(threshold), "Subdivision threshold overflowed");
  let subdivisionLengthCalls = 0;
  const subdivisionRejections: {
    index: number;
    length: number;
    startSquared: number;
    endSquared: number;
  }[] = [];
  for (let index = 0; index + 1 < sourceNodes.length;) {
    checkDeadline();
    const current = sourceNodes[index],
      next = sourceNodes[index + 1];
    ensure(current.control !== undefined, "Quadratic source control is absent");
    const points = [current.point, current.control, next.point] as const;
    const length = quadraticLength(points, true);
    subdivisionLengthCalls++;
    checkDeadline();
    if (length > threshold) {
      const point = evaluateQuadratic(points, 0.5);
      const endSquared = squaredSeparation(next.point, point);
      const startSquared = squaredSeparation(current.point, point);
      if (endSquared < 0.25 || startSquared < 0.25) {
        subdivisionRejections.push({ index, length, startSquared, endSquared });
      } else {
        ensure(sourceNodes.length < maximumNodes, "Subdivision exceeds post node work limit");
        const controls = splitQuadratic(points, 0.5);
        const midpointScalar = (field: number) =>
          Math.fround(fma64(current.scalars[field], 0.5, next.scalars[field] * 0.5));
        const scalars: PostScalars = [
          midpointScalar(0),
          midpointScalar(1),
          midpointScalar(2),
          0,
          midpointScalar(4),
          midpointScalar(5),
          midpointScalar(6),
        ];
        // Both source and result constructors call 0x10276ae48, which zeros +60..68.
        sourceNodes.splice(index + 1, 0, {
          id: -1,
          point,
          flags: 0,
          scalars,
          endpointDataHex: zeroEndpointData,
          control: controls.rightControl,
          sourceIndices: [],
          previous: null,
          next: null,
        });
        current.control = controls.leftControl;
        continue;
      }
    }
    index++;
  }
  sourceNodes.forEach((node, index) => {
    node.id = index;
    node.sourceIndices = [index];
  });
  link(sourceNodes);
  const nodes: PostNode[] = sourceNodes.map((source) => ({
    id: source.id,
    point: copyPoint(source.point),
    flags: (source.flags & ~0xc00) >>> 0,
    scalars: [...source.scalars],
    endpointDataHex: zeroEndpointData,
    sourceIndices: [source.id],
    previous: null,
    next: null,
  }));
  link(nodes);
  const outputPathFlags = ((input.pathFlags & ~0x10f0) | 0x80) >>> 0;
  const trace: PostPassTrace[] = [];
  const snapshot = (
    stage: string,
    before: number,
    decisions: CandidateDecision[],
    tolerance?: number,
  ) => {
    const pass = {
      stage,
      tolerance,
      before,
      after: nodes.length,
      remainingIds: nodes.map((node) => node.id),
      flags: nodes.map((node) => node.flags),
      decisions,
    };
    trace.push(pass);
    work.onPass?.(pass);
  };
  snapshot("source-subdivision-and-clone", input.nodes.length, []);
  const sourceSampleCache = new Map<number, Point[]>();
  function sourceSamples(source: PostNode) {
    let samples = sourceSampleCache.get(source.id);
    if (samples === undefined) {
      ensure(source.control !== undefined, "Quadratic source sample control is absent");
      samples =
        source.next === null
          ? [copyPoint(source.point)]
          : sampleQuadraticForCorrection(
              [source.point, source.control, source.next.point],
              4,
              0,
              1,
            );
      sourceSampleCache.set(source.id, samples);
    }
    return samples;
  }
  function deleteWithAssociations(candidate: PostNode) {
    const previous = candidate.previous;
    ensure(
      previous !== null && candidate.next !== null,
      "Removal tried to delete an open endpoint",
    );
    previous.sourceIndices.push(...candidate.sourceIndices);
    candidate.sourceIndices = [];
    previous.next = candidate.next;
    candidate.next.previous = previous;
    const index = nodes.indexOf(candidate);
    ensure(index >= 0, "Removal candidate is absent from the active path");
    nodes.splice(index, 1);
    candidate.previous = candidate.next = null;
  }
  function candidateDecision(candidate: PostNode, tolerance: number): CandidateDecision {
    const decision = { candidateId: candidate.id, accepted: false };
    if ((candidate.flags & 1) !== 0) return { ...decision, reason: "protected-corner" };
    const previous = candidate.previous,
      following = candidate.next;
    if (previous === null || following === null) return { ...decision, reason: "open-endpoint" };
    const groups: { owner: PostNode; anchor: PostNode; mode: number }[] = [
      { owner: previous, anchor: previous, mode: 1 },
      { owner: candidate, anchor: previous, mode: 1 },
    ];
    if (following.next !== null) groups.push({ owner: following, anchor: following, mode: 2 });
    if (previous.previous !== null)
      groups.push({ owner: previous.previous, anchor: previous.previous, mode: 3 });
    // Pure replacement sampling is identical for all associations of a group.
    // Reuse does not alter operation order inside any native numeric helper.
    const replacementCache = new Map<string, Point[]>();
    for (const { owner, anchor, mode } of groups) {
      const cacheKey = `${anchor.id}:${mode}`;
      let replacement = replacementCache.get(cacheKey);
      if (replacement === undefined) {
        ensure(anchor.next !== null, "Replacement anchor has no following node");
        replacement = sampleSplineNodes(anchor, anchor.next, mode, 4, 0, 1);
        replacementCache.set(cacheKey, replacement);
      }
      for (const sourceIndex of owner.sourceIndices) {
        checkDeadline();
        ensure(
          ++sourceChecks <= maximumSourceChecks,
          "Post correction exceeded its source comparison work limit",
        );
        const source = sourceNodes[sourceIndex];
        const samples = sourceSamples(source);
        const effectiveTolerance = sourceSegmentTolerance(
          tolerance,
          input.flag480,
          source.scalars[2],
        );
        for (const point of samples) {
          const distance = nearestSampleDistance(replacement, point);
          if (distance > effectiveTolerance)
            return {
              ...decision,
              reason: "source-distance",
              sourceIndex,
              mode,
              distance,
              effectiveTolerance,
            };
        }
        if (mode === 1) {
          const bounds = scalarBounds(source.scalars[0], limits);
          const a = anchor.scalars[0],
            b = following.scalars[0];
          if (
            !(
              scalarWithinBounds(a, bounds.lower, bounds.upper) &&
              scalarWithinBounds(b, bounds.lower, bounds.upper)
            )
          ) {
            const t = nearestSampleParameter(replacement, samples[0]);
            if (!removalScalarAccepted(source.scalars[0], a, b, limits, t))
              return { ...decision, reason: "source-scalar", sourceIndex, mode };
          }
        }
      }
    }
    return { candidateId: candidate.id, accepted: true, reason: "all-source-checks-accepted" };
  }
  function removalPass(stage: string, tolerance: number): boolean {
    const before = nodes.length;
    const decisions: CandidateDecision[] = [];
    let candidate = nodes[0].next;
    while (candidate !== null) {
      checkDeadline();
      let next = candidate.next;
      const decision = candidateDecision(candidate, tolerance);
      decisions.push(decision);
      if (decision.accepted) {
        deleteWithAssociations(candidate);
        next = next?.next ?? null;
      }
      candidate = next;
    }
    snapshot(stage, before, decisions, tolerance);
    return nodes.length !== before;
  }
  removalPass("initial-removal-1", input.tolerance);
  removalPass("initial-removal-2", input.tolerance);
  for (let index = 1; index + 1 < nodes.length; index++) {
    const node = nodes[index];
    if ((node.flags & 4) === 0)
      node.flags = classifiedCornerFlags(
        node.flags,
        cornerPredicate(
          nodes[index - 1].point,
          node.point,
          nodes[index + 1].point,
          input.tolerance * 0.3,
          input.lengthScale,
        ),
      );
  }
  snapshot("corner-classification", nodes.length, [], input.tolerance);
  for (const [index, tolerance] of schedule.additionalTolerances.entries()) {
    if (!removalPass(`additional-removal-${index + 1}`, tolerance)) break;
  }
  const beforeNear = nodes.length;
  const nearDecisions: CandidateDecision[] = [];
  let candidate: PostNode | null = nodes[0];
  while (candidate !== null) {
    checkDeadline();
    const next: PostNode | null = candidate.next;
    if (
      (candidate.flags & 1) !== 0 &&
      next !== null &&
      candidate.previous !== null &&
      (candidate.previous.flags & 1) !== 0
    ) {
      const accepted = nearCoincidentRemovalAccepted(
        candidate.point,
        candidate.previous.point,
        candidate.scalars[0],
        candidate.previous.scalars[0],
        limits,
      );
      nearDecisions.push({
        candidateId: candidate.id,
        accepted,
        reason: accepted
          ? "near-coincident-scalar-accepted"
          : "near-coincident-distance-or-scalar-rejected",
      });
      if (accepted) deleteWithAssociations(candidate);
    }
    candidate = next;
  }
  snapshot("near-coincident-cleanup", beforeNear, nearDecisions);
  checkDeadline();
  return {
    nodes,
    sourceNodes,
    trace,
    outputPathFlags,
    subdivision: {
      threshold,
      lengthCalls: subdivisionLengthCalls,
      insertedNodes: sourceNodes.length - input.nodes.length,
      rejections: subdivisionRejections,
    },
    sourceChecks,
    elapsedMilliseconds: performance.now() - started,
  };
}

/** Ordinary open spline output skips control cleanup and closed-path operations. */
export function runOrdinaryPost(
  input: OrdinaryPostInput,
  endpoint: PostEndpointContext,
  work: PostWorkLimits = {},
) {
  const started = performance.now();
  const result = runOrdinaryPostBeforeEndpoints(input, work);
  const preEndpointNodes = result.nodes.map((node) => ({
    id: node.id,
    point: copyPoint(node.point),
    flags: node.flags,
    scalars: [...node.scalars] as PostScalars,
    endpointDataHex: node.endpointDataHex,
    sourceIndices: [...node.sourceIndices],
  }));
  const endpoints = processPostEndpoints(
    result.nodes,
    endpointParameter(input.k),
    endpoint.pathParameter,
    endpoint.evaluator,
  );
  ensure(
    performance.now() - started < (work.deadlineMilliseconds ?? 60000),
    "Post correction exceeded its research deadline during endpoint processing",
  );
  return {
    ...result,
    nodes: endpoints.nodes,
    preEndpointNodes,
    endpointPasses: endpoints.passes,
    elapsedMilliseconds: performance.now() - started,
  };
}
