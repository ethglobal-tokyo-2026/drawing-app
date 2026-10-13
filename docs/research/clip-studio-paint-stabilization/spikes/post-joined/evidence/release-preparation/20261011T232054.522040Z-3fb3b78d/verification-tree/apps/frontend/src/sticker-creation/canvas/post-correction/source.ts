/** Ordinary open PWVectorBezierCurve construction before post correction. */
import { cornerPredicate, type Point } from "./reference.ts";
import type { PostNodeInput, PostScalars } from "./pipeline.ts";
import { fma64 } from "../stabilization/binary64.ts";
import { pointDistance } from "../stabilization/arithmetic.ts";

export interface SourceRecord {
  point: Point;
  /** SVectorNode doubles +10..40; no binary32 conversion before node import. */
  scalars: PostScalars;
  /** SVectorNode +50 flags, distinct from imported node flags at +40. */
  flags: number;
  /** Caller provenance only; this value is not a native geometric input. */
  sourceIndex: number;
}
export interface SourceConfiguration {
  /** Begin input +dc; delayed first-node allocation. */
  deferFirstNode: boolean;
  /** Begin +c0 enables, +c8 sets length; null disables the +54 distance fade. */
  fadeScalar54: { length: number } | null;
  /** Explicit state +138 and +130. Native +130 is 0.05 / begin input +d0. */
  cornerDetection: { positionalTolerance: number } | null;
}
export type SourceConstruction = "import" | "midpoint" | "terminal" | "corner" | "after-corner";

const copyPoint = (point: Point): Point => ({ ...point });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });
const copyRecord = (record: SourceRecord): SourceRecord => ({
  ...record,
  point: copyPoint(record.point),
  scalars: [...record.scalars],
});
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RangeError(message);
}
function validate(record: SourceRecord): void {
  ensure(
    Number.isFinite(record.point.x) && Number.isFinite(record.point.y),
    "Source position must be finite",
  );
  ensure(
    record.scalars.length === 7 && record.scalars.every(Number.isFinite),
    "Source scalars must be seven finite doubles",
  );
  // This explicit research domain bounds the native repeated-turn normalization.
  ensure(
    record.scalars[3] >= -360 && record.scalars[3] <= 720,
    "Source angle is outside the bounded [-360,720] degree research domain",
  );
  ensure(
    Number.isInteger(record.flags) && record.flags >= 0 && record.flags <= 0xffffffff,
    "Source record flags must be uint32",
  );
  ensure(
    Number.isSafeInteger(record.sourceIndex) && record.sourceIndex >= 0,
    "Source index must be a nonnegative safe integer",
  );
}

/** 0x102217f00 with d2=0.5; degrees, one initial difference wrap, then result wrap. */
function midpointAngle(a: number, b: number): number {
  let difference = b - a;
  if (difference > 180) difference += -360;
  else if (difference < -180) difference += 360;
  let result = fma64(difference, 0.5, a);
  while (result > 360) result += -360;
  while (result < 0) result += 360;
  return Math.fround(result);
}

/** Exact import/virtual construction arithmetic; a supplied preceding node is quadratic. */
export function constructQuadraticSourceNode(
  mode: SourceConstruction,
  previous: SourceRecord,
  current: SourceRecord,
  previousNode: Point | null,
): { node: PostNodeInput; previousControl: Point | null } {
  validate(previous);
  validate(current);
  const usesMidpoint = mode === "midpoint" || mode === "after-corner";
  const source = mode === "corner" ? previous : current;
  const point = usesMidpoint ? midpoint(previous.point, current.point) : copyPoint(source.point);
  const scalars: PostScalars = [
    Math.fround(source.scalars[0]),
    Math.fround(source.scalars[1]),
    Math.fround(source.scalars[2]),
    Math.fround(source.scalars[3]),
    Math.fround(source.scalars[4]),
    Math.fround(source.scalars[5]),
    Math.fround(source.scalars[6]),
  ];
  if (usesMidpoint) {
    for (const index of [0, 1, 2, 5, 6])
      scalars[index] = Math.fround(
        Math.fround(previous.scalars[index] + current.scalars[index]) * 0.5,
      );
    scalars[3] = midpointAngle(previous.scalars[3], current.scalars[3]);
    scalars[4] = Math.fround(current.scalars[4]);
  }
  const node: PostNodeInput = {
    point,
    scalars,
    flags: usesMidpoint ? 0 : ((source.flags & 3) << 12) | (mode === "corner" ? 1 : 0),
    control: { x: 0, y: 0 },
    endpointDataHex: "000000000000000000000000",
  };
  let previousControl: Point | null = null;
  if (previousNode && mode !== "import") {
    if (mode === "corner") previousControl = midpoint(previousNode, previous.point);
    else if (mode === "after-corner") {
      // 0x102764a68 overwrites v1 with 0.5 BEFORE storing it for the later reload.
      previousControl = midpoint(previous.point, point);
    } else previousControl = copyPoint(previous.point);
  }
  ensure(
    [
      point.x,
      point.y,
      ...scalars,
      ...(previousControl ? [previousControl.x, previousControl.y] : []),
    ].every(Number.isFinite),
    "Source construction exceeded its finite arithmetic domain",
  );
  return { node, previousControl };
}

/**
 * Geometry of begin 0x1028ebd40, append 0x1028ec548 and finish 0x1028ec8d0.
 * Scope: open path flags 0x2021. Renderer callbacks, bounds/caches, alternate path
 * 0x3021 corner filtering and upstream record generation are not simulated.
 */
export class QuadraticSourceBuilder {
  private readonly nodes: PostNodeInput[] = [];
  private readonly sourceIndices: number[][] = [];
  private readonly configuration: SourceConfiguration;
  private previous: SourceRecord;
  private beforePrevious: SourceRecord;
  private deferred: boolean;
  private markedCorner = false;
  private distance = 0;
  private finished = false;
  private readonly maximumNodes: number;

  constructor(first: SourceRecord, configuration: SourceConfiguration, maximumNodes = 10000) {
    validate(first);
    ensure(
      Number.isInteger(maximumNodes) && maximumNodes >= 1,
      "Source node work limit must be a positive integer",
    );
    ensure(
      configuration.fadeScalar54 === null ||
        (Number.isFinite(configuration.fadeScalar54.length) &&
          configuration.fadeScalar54.length > 0),
      "Source scalar fade length must be positive and finite",
    );
    ensure(
      configuration.cornerDetection === null ||
        Number.isFinite(configuration.cornerDetection.positionalTolerance),
      "Source corner tolerance must be finite",
    );
    this.maximumNodes = maximumNodes;
    this.configuration = structuredClone(configuration);
    this.previous = copyRecord(first);
    this.beforePrevious = copyRecord(first);
    this.deferred = configuration.deferFirstNode;
    if (!this.deferred) this.addNode("import", first);
  }

  append(record: SourceRecord, inputScale: number): void {
    ensure(!this.finished, "Source stroke is already finished");
    validate(record);
    ensure(
      Number.isFinite(inputScale) && inputScale > 0,
      "Source input scale must be positive and finite",
    );
    const current = copyRecord(record);
    if (this.deferred) {
      this.addNode("import", current);
      this.previous = copyRecord(current);
      this.deferred = false;
    } else {
      this.fade(current);
      const corner =
        this.markedCorner ||
        (this.nodes.length > 1 &&
          this.configuration.cornerDetection !== null &&
          cornerPredicate(
            this.beforePrevious.point,
            this.previous.point,
            current.point,
            this.configuration.cornerDetection.positionalTolerance,
            1 / inputScale,
          ));
      if (corner) {
        ensure(this.nodes.length + 2 <= this.maximumNodes, "Source node work limit exceeded");
        this.addNode("corner", current);
        if (this.markedCorner) this.nodes[this.nodes.length - 1].flags |= 4;
        this.addNode("after-corner", current);
      } else this.addNode("midpoint", current);
    }
    this.beforePrevious = this.previous;
    this.previous = current;
    this.markedCorner = (record.flags & 0x10) !== 0;
  }

  finish(record: SourceRecord): void {
    ensure(!this.finished, "Source stroke is already finished");
    validate(record);
    const current = copyRecord(record);
    this.fade(current);
    this.addNode("terminal", current);
    this.previous = current;
    this.finished = true;
  }

  private fade(record: SourceRecord): void {
    if (!this.configuration.fadeScalar54) return;
    this.distance = pointDistance(record.point, this.previous.point) + this.distance;
    ensure(Number.isFinite(this.distance), "Source accumulated distance must be finite");
    const length = this.configuration.fadeScalar54.length;
    record.scalars[4] =
      this.distance < length ? (1 - this.distance / length) * record.scalars[4] : 0;
  }

  private addNode(mode: SourceConstruction, current: SourceRecord): void {
    ensure(this.nodes.length < this.maximumNodes, "Source node work limit exceeded");
    const previousNode = this.nodes.at(-1);
    const { node, previousControl } = constructQuadraticSourceNode(
      mode,
      this.previous,
      current,
      previousNode?.point ?? null,
    );
    if (previousNode && previousControl) previousNode.control = previousControl;
    const indices =
      mode === "corner"
        ? [this.previous.sourceIndex]
        : mode === "midpoint" || mode === "after-corner"
          ? [...new Set([this.previous.sourceIndex, current.sourceIndex])]
          : [current.sourceIndex];
    if (mode === "after-corner") {
      const previousIndices = this.sourceIndices[this.sourceIndices.length - 1];
      if (!previousIndices.includes(current.sourceIndex)) previousIndices.push(current.sourceIndex);
    }
    this.nodes.push(node);
    this.sourceIndices.push(indices);
  }

  snapshot(): { nodes: PostNodeInput[]; pathFlags: number; sourceIndices: number[][] } {
    return structuredClone({
      nodes: this.nodes,
      pathFlags: 0x2021,
      sourceIndices: this.sourceIndices,
    });
  }
}
