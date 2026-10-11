import type { PostCorrectionSettings } from "./settings.ts";
import { PostCorrectionError } from "./errors.ts";
import { PostMovement, createPostInputRecord } from "./input.ts";
import { QuadraticSourceBuilder } from "./source.ts";
import { convertPostSettings, type Point } from "./reference.ts";
import { runOrdinaryPost } from "./pipeline.ts";
import { evaluatePostEndpoint } from "./evaluator.ts";
import { SELECTED_ROUND_BRUSH_PROFILE } from "./profile.ts";
import { sampleSplineNodes } from "./spline-context.ts";
import { MAX_POST_POINTS as MAX_POINTS, validatePostCorrectionPoints } from "./validation.ts";

/** Completed stabilization output in the stroke's fixed sheet coordinates. */
export interface PostCorrectionPacket {
  x: number;
  y: number;
  pressure: number;
  t: number;
  phase: 1 | 2 | 3;
}
export interface PostCorrectionInput {
  packets: readonly PostCorrectionPacket[];
  renderedPoints: readonly number[];
  settings: PostCorrectionSettings;
  magnificationFraction: number;
  brushSize: number;
  pointerType: string;
  stabilization: number;
}
export interface PostCorrectionProgress {
  stage: string;
  before: number;
  after: number;
}
export interface PostCorrectionResult {
  points: number[];
  sourceNodeCount: number;
  correctedNodeCount: number;
}

const MAX_PACKETS = 10000;
const CORE_DEADLINE_MS = 800;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new PostCorrectionError(message);
}

/** Fixed operations keep Croquis width/time transfer consistent across browser engines. */
function attributeDistance(dx: number, dy: number): number {
  const scale = Math.max(Math.abs(dx), Math.abs(dy));
  // Nonfinite differences reach the accumulated-distance check below; zero avoids 0/0.
  if (scale === 0 || !Number.isFinite(scale)) return scale;
  const x = dx / scale,
    y = dy / scale;
  // Scaling avoids overflow or underflow from squaring the original coordinates.
  return scale * Math.sqrt(x * x + y * y);
}

/** Croquis attribute transfer, separate from recovered native scalar/curve arithmetic. */
export function transferStrokeAttributes(
  geometry: readonly Point[],
  renderedPoints: readonly number[],
): number[] {
  validatePostCorrectionPoints(renderedPoints);
  ensure(
    geometry.length >= 1 &&
      geometry.length <= MAX_POINTS &&
      geometry.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    "Post correction produced invalid or excessive sampled geometry.",
  );
  // A collapsed result needs two coincident records to retain both endpoint attributes.
  const points =
    geometry.length === 1 && renderedPoints.length > 4 ? [geometry[0], geometry[0]] : geometry;
  const sourceDistance = [0],
    outputDistance = [0];
  for (let index = 4; index < renderedPoints.length; index += 4)
    sourceDistance.push(
      sourceDistance[sourceDistance.length - 1] +
        attributeDistance(
          renderedPoints[index] - renderedPoints[index - 4],
          renderedPoints[index + 1] - renderedPoints[index - 3],
        ),
    );
  for (let index = 1; index < points.length; index++)
    outputDistance.push(
      outputDistance[outputDistance.length - 1] +
        attributeDistance(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y,
        ),
    );
  const sourceLength = sourceDistance[sourceDistance.length - 1],
    outputLength = outputDistance[outputDistance.length - 1];
  ensure(
    Number.isFinite(sourceLength) && Number.isFinite(outputLength),
    "Post correction path distance exceeded its finite domain.",
  );
  const output: number[] = [];
  let segment = 0;
  for (let index = 0; index < points.length; index++) {
    let width: number, time: number;
    if (index === 0) {
      width = renderedPoints[2];
      time = renderedPoints[3];
    } else if (index === points.length - 1) {
      width = renderedPoints[renderedPoints.length - 2];
      time = renderedPoints[renderedPoints.length - 1];
    } else {
      const progress =
        outputLength > 0 ? outputDistance[index] / outputLength : index / (points.length - 1);
      let fraction: number;
      if (sourceLength > 0) {
        const target = progress * sourceLength;
        while (segment < sourceDistance.length - 2 && sourceDistance[segment + 1] <= target)
          segment++;
        const span = sourceDistance[segment + 1] - sourceDistance[segment];
        fraction = span > 0 ? (target - sourceDistance[segment]) / span : 0;
      } else {
        const parameter = progress * (sourceDistance.length - 1);
        segment = Math.floor(parameter);
        fraction = parameter - segment;
      }
      const at = segment * 4,
        next = Math.min(at + 4, renderedPoints.length - 4);
      width =
        renderedPoints[at + 2] + (renderedPoints[next + 2] - renderedPoints[at + 2]) * fraction;
      time = Math.round(
        renderedPoints[at + 3] + (renderedPoints[next + 3] - renderedPoints[at + 3]) * fraction,
      );
      time = Math.max(
        output.at(-1) ?? time,
        Math.min(time, renderedPoints[renderedPoints.length - 1]),
      );
    }
    output.push(points[index].x, points[index].y, width, time);
  }
  return output;
}

export function correctPostStroke(
  input: PostCorrectionInput,
  onProgress?: (progress: PostCorrectionProgress) => void,
): PostCorrectionResult {
  const started = performance.now();
  const checkTime = () =>
    ensure(
      performance.now() - started < CORE_DEADLINE_MS,
      "Post correction exceeded its processing deadline.",
    );
  try {
    validatePostCorrectionPoints(input.renderedPoints);
    ensure(
      input.packets.length >= 1 && input.packets.length <= MAX_PACKETS,
      "Post correction requires between 1 and 10,000 completed packets.",
    );
    ensure(
      Number.isInteger(input.settings.strength) &&
        input.settings.strength >= 0 &&
        input.settings.strength <= 40,
      "Post-correction strength must be an integer from 0 through 40.",
    );
    ensure(
      Number.isFinite(input.magnificationFraction) &&
        input.magnificationFraction > 0 &&
        Number.isFinite(input.brushSize) &&
        input.brushSize > 0 &&
        Number.isInteger(input.stabilization) &&
        input.stabilization >= 0 &&
        input.stabilization <= 100,
      "Post correction received invalid scale, brush size, or stabilization strength.",
    );
    for (const packet of input.packets)
      ensure(
        [packet.x, packet.y, packet.pressure, packet.t].every(Number.isFinite) &&
          packet.pressure >= 0 &&
          packet.pressure <= 1 &&
          Number.isSafeInteger(Math.trunc(packet.t)),
        "Post correction received an invalid completed stabilization packet.",
      );
    const groups: { start: number; end: number; correct: boolean }[] = [];
    let openStart: number | null = null;
    const phaseError =
      "Post correction requires each native group to have a start, zero or more moves, and a terminal phase sequence.";
    for (let index = 0; index < input.packets.length; index++) {
      const phase = input.packets[index].phase;
      if (phase === 2) {
        ensure(openStart === null, phaseError);
        openStart = index;
      } else {
        ensure(phase === 1 || phase === 3, phaseError);
        if (openStart === null) {
          ensure(groups.length > 0, phaseError);
          groups.push({ start: index, end: index + 1, correct: false });
        } else if (phase === 3) {
          groups.push({ start: openStart, end: index + 1, correct: true });
          openStart = null;
        }
      }
    }
    ensure(openStart === null || input.packets.length === 1, phaseError);
    const first = input.packets[0];
    if (
      input.settings.strength === 0 ||
      input.packets.length === 1 ||
      input.packets.every((packet) => packet.x === first.x && packet.y === first.y)
    )
      return {
        points: [...input.renderedPoints],
        sourceNodeCount: input.packets.length,
        correctedNodeCount: input.packets.length,
      };

    const magnificationPercent = input.magnificationFraction * 100;
    const magnificationFraction = magnificationPercent * 0.01;
    const settings = convertPostSettings({
      enabled: true,
      k: input.settings.strength,
      flag480: input.settings.adjustBySpeed,
      scaleTolerance: input.settings.adjustByScale,
      selector482: false,
      fallbackRequested: false,
      magnificationPercent,
      priorFlag480: false,
      priorSelector482: false,
    });
    ensure(settings !== null, "Post correction settings unexpectedly disabled processing.");
    const profile = SELECTED_ROUND_BRUSH_PROFILE;
    const geometry: Point[] = [];
    let sourceNodeCount = 0,
      correctedNodeCount = 0,
      expandedNodeCount = 0,
      sourceChecks = 0;
    for (const group of groups) {
      checkTime();
      const first = input.packets[group.start];
      if (!group.correct) {
        // Croquis keeps idle release output already used by its brush. It has no
        // phase-2 source path, so preserve the point without native source dispatch.
        geometry.push({ x: first.x, y: first.y });
        ensure(geometry.length <= MAX_POINTS, "Post correction exceeded its sampled-point limit.");
        continue;
      }
      // Observed ordinary brush configuration; live settings and packet acquisition are Croquis inputs.
      const movement = new PostMovement(
        {
          ...profile.movement,
          deviceType: input.pointerType === "pen" ? 4 : 1,
          window: input.stabilization,
          magnificationFraction,
        },
        first,
        BigInt(Math.trunc(first.t)),
      );
      const sourceRecord = (packet: PostCorrectionPacket, sourceIndex: number) =>
        createPostInputRecord({
          ...profile.input,
          point: packet,
          pressure: packet.pressure,
          movement:
            sourceIndex === group.start ? 0 : movement.update(packet, BigInt(Math.trunc(packet.t))),
          sourceIndex,
          startupPosition: 0,
        });
      const source = new QuadraticSourceBuilder(
        sourceRecord(first, group.start),
        profile.source,
        MAX_PACKETS,
      );
      for (let index = group.start + 1; index < group.end; index++) {
        checkTime();
        const record = sourceRecord(input.packets[index], index);
        if (input.packets[index].phase === 3) source.finish(record);
        else source.append(record, magnificationFraction);
      }
      const original = source.snapshot();
      onProgress?.({
        stage: "source",
        before: group.end - group.start,
        after: original.nodes.length,
      });
      const corrected = runOrdinaryPost(
        {
          ...settings,
          selector482: 0,
          closedMode: 0,
          nodes: original.nodes,
          pathFlags: original.pathFlags,
        },
        {
          pathParameter: input.brushSize * profile.endpointSizeFactor,
          evaluator: (node, parameter) => evaluatePostEndpoint(node, parameter, profile.evaluator),
        },
        {
          maximumNodes: MAX_PACKETS - expandedNodeCount,
          maximumSourceChecks: 1000000 - sourceChecks,
          deadlineMilliseconds: Math.max(1, CORE_DEADLINE_MS - (performance.now() - started)),
          onPass: (pass) =>
            onProgress?.({ stage: pass.stage, before: pass.before, after: pass.after }),
        },
      );
      sourceNodeCount += original.nodes.length;
      correctedNodeCount += corrected.nodes.length;
      expandedNodeCount += corrected.sourceNodes.length;
      sourceChecks += corrected.sourceChecks;
      checkTime();
      const groupGeometryStart = geometry.length;
      // Croquis rendering density: half a CSS pixel, with the recovered sampler's 256-point cap.
      const density = 0.5 / magnificationFraction;
      for (let index = 0; index + 1 < corrected.nodes.length; index++) {
        checkTime();
        const node = corrected.nodes[index];
        const samples = sampleSplineNodes(node, corrected.nodes[index + 1], 0, density, 0, 1);
        geometry.push(...(index === 0 ? samples : samples.slice(1)));
        ensure(geometry.length <= MAX_POINTS, "Post correction exceeded its sampled-point limit.");
      }
      if (geometry.length === groupGeometryStart && corrected.nodes[0])
        geometry.push(corrected.nodes[0].point);
    }
    const points = transferStrokeAttributes(geometry, input.renderedPoints);
    checkTime();
    onProgress?.({
      stage: "complete",
      before: sourceNodeCount,
      after: correctedNodeCount,
    });
    return {
      points,
      sourceNodeCount,
      correctedNodeCount,
    };
  } catch (error) {
    if (error instanceof PostCorrectionError) throw error;
    throw new PostCorrectionError(
      `Post correction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
