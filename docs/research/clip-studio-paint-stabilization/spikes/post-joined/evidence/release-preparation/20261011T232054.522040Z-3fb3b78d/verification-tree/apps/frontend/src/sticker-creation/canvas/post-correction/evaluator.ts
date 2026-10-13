/** Endpoint evaluator 0x1024c497c and its deterministic response dependencies. */
import { fma64 } from "../stabilization/binary64.ts";
import type { PostScalars } from "./pipeline.ts";
import type { Point } from "./reference.ts";

/** Decoded 0x58-byte response object; float fields are imported as binary32. */
export interface PostResponseConfig {
  flags: number;
  minimum: number;
  input1Minimum: number;
  input1Maximum: number;
  input2Minimum: number;
  randomMinimum: number;
  input4Minimum: number;
  curves: [readonly Point[] | null, readonly Point[] | null, readonly Point[] | null];
}
export interface PostEvaluatorConfig {
  main: PostResponseConfig;
  secondary: PostResponseConfig;
  secondaryEnabled: boolean;
  secondaryBase: number;
  /** Brush +0x80 bit4; its wider UI meaning is not inferred here. */
  brushFlag4: boolean;
  /** Unsigned field +0x198. Values outside 1..3 have zero adjustment. */
  adjustmentMode: number;
}
export interface PostEndpointAttributes {
  scalars: Readonly<PostScalars>;
  flags: number;
}

/** 0x1024af65c and 0x1024c0dc0 defaults, before brush settings are loaded. */
export function createPostEvaluatorConstructorConfig(): PostEvaluatorConfig {
  const response = (): PostResponseConfig => ({
    flags: 0,
    minimum: 0,
    input1Minimum: 0,
    input1Maximum: 1,
    input2Minimum: 0,
    randomMinimum: 0,
    input4Minimum: 0,
    curves: [null, null, null],
  });
  return {
    main: response(),
    secondary: response(),
    secondaryEnabled: false,
    secondaryBase: 1,
    brushFlag4: false,
    adjustmentMode: 2,
  };
}

/** 0x10219455c: a nearly vertical line returns the first y; otherwise extrapolate. */
function lineValue(a: Point, b: Point, input: number): number {
  if (b.x - 1e-8 <= a.x && b.x + 1e-8 >= a.x) return a.y;
  return fma64((b.y - a.y) / (b.x - a.x), input - a.x, a.y);
}

/** 0x10359b494 preserves the native root order and duplicate near-zero root. */
function roots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) <= 1e-8) return Math.abs(b) <= 1e-8 ? [] : [-c / b];
  const discriminant = fma64(b, b, a * -4 * c);
  if (discriminant < -1e-8) return [];
  if (discriminant <= 1e-8) {
    const root = -b / (a + a);
    return [root, root];
  }
  const squareRoot = Math.sqrt(discriminant);
  const factor = -0.5 / a;
  return [factor * (squareRoot + b), factor * (b - squareRoot)];
}

/** 0x10359cf18 accepts t in [0,1), then 0x10359de0c takes its first y. */
function quadraticValue(a: Point, b: Point, c: Point, input: number): number {
  const candidates = roots(fma64(b.x, -2, a.x) + c.x, fma64(a.x, -2, b.x + b.x), a.x - input);
  for (const t of candidates) {
    if (t >= 0 && t < 1) {
      const u = 1 - t;
      const aa = u * u;
      const bb = t * (u + u);
      const cc = t * t;
      return fma64(cc, c.y, fma64(aa, a.y, b.y * bb));
    }
  }
  return lineValue(a, c, input);
}
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });

/**
 * 0x1024a9bb4 → 0x10359de0c. Supported decoded curves have 0..16 finite,
 * nondecreasing-x controls (the native object reserves 16). No [0,1] clamp.
 */
export function evaluatePostResponseCurve(points: readonly Point[], input: number): number {
  if (
    !Number.isFinite(input) ||
    points.length > 16 ||
    points.some(
      (p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || (i > 0 && p.x < points[i - 1].x),
    )
  ) {
    throw new RangeError(
      "Response curve requires at most 16 finite controls in nondecreasing x order and a finite input",
    );
  }
  const n = points.length;
  if (n < 2) return 0;
  if (n === 2) return lineValue(points[0], points[1], input);
  if (n === 3) return quadraticValue(points[0], points[1], points[2], input);
  if (points[1].x > input)
    return quadraticValue(points[0], points[1], midpoint(points[1], points[2]), input);
  if (points[n - 2].x <= input)
    return quadraticValue(
      midpoint(points[n - 3], points[n - 2]),
      points[n - 2],
      points[n - 1],
      input,
    );
  let i = 1;
  while (points[i + 1].x <= input) i++;
  const middle = midpoint(points[i], points[i + 1]);
  if (middle.x > input)
    return quadraticValue(
      i >= 2 ? midpoint(points[i - 1], points[i]) : points[0],
      points[i],
      middle,
      input,
    );
  return quadraticValue(
    middle,
    points[i + 1],
    i < n - 3 ? midpoint(points[i + 1], points[i + 2]) : points[n - 1],
    input,
  );
}

/** 0x1024aff24 with w1=0: random state is not advanced at this call site. */
function responseValue(
  base: number,
  node: PostEndpointAttributes,
  config: PostResponseConfig,
): number {
  let value = base;
  for (let i = 0; i < 3; i++) {
    const curve = config.curves[i];
    if (!(config.flags & (16 << i)) || curve === null) continue;
    const result = evaluatePostResponseCurve(curve, node.scalars[i]);
    const minimum = Math.fround(
      i === 0 ? config.minimum : i === 1 ? config.input1Minimum : config.input2Minimum,
    );
    const span = i === 1 ? Math.fround(Math.fround(config.input1Maximum) - minimum) : 1 - minimum;
    value = value * fma64(span, result, minimum);
  }
  if (config.flags & 256) {
    const minimum = Math.fround(config.input4Minimum);
    value = value * fma64(1 - minimum, node.scalars[4], minimum);
  }
  return value;
}

/**
 * Exact finite arithmetic branch of 0x1024c497c. Attributes must already be
 * retained binary32 node fields, widened to doubles by 0x10276b138. This is not
 * raw device pressure. The endpoint caller applies its separate lower clamp.
 */
export function evaluatePostEndpoint(
  node: PostEndpointAttributes,
  pathParameter: number,
  config: PostEvaluatorConfig,
): number {
  if (
    !Number.isFinite(pathParameter) ||
    node.scalars.length !== 7 ||
    node.scalars.some((v) => !Number.isFinite(v) || !Object.is(Math.fround(v), v))
  ) {
    throw new RangeError(
      "Endpoint evaluator requires finite parameter and retained binary32 scalars",
    );
  }
  for (const flags of [
    node.flags,
    config.main.flags,
    config.secondary.flags,
    config.adjustmentMode,
  ]) {
    if (!Number.isInteger(flags) || flags < 0 || flags > 0xffffffff)
      throw new RangeError("Endpoint evaluator flags must be unsigned 32-bit integers");
  }
  let primary = pathParameter;
  if (config.main.flags !== 1 && !(node.flags & 0x1000)) {
    primary = responseValue(primary, node, config.main);
    if (config.main.flags & 128)
      primary *= fma64(1 - Math.fround(config.main.randomMinimum), -0.3, 1);
  }
  primary *= node.scalars[5];
  if (primary < 1) primary = 1;
  let secondary = 0;
  if (config.secondaryEnabled) {
    secondary = config.secondaryBase;
    if (config.secondary.flags !== 1) {
      secondary = responseValue(secondary, node, config.secondary);
      primary *= 0.7;
    }
    secondary *= node.scalars[5];
  }
  if (config.adjustmentMode !== 0) {
    if (config.brushFlag4) {
      if (config.secondaryEnabled) secondary *= 0.7;
      else primary *= 0.7;
    }
    const amount =
      config.adjustmentMode <= 3 ? Math.min([0, 1.5, 2.5, 3.5][config.adjustmentMode], primary) : 0;
    primary = fma64(amount, -0.25, primary);
  }
  const result = secondary + primary;
  if (!Number.isFinite(result))
    throw new RangeError("Endpoint evaluator produced a nonfinite result");
  return result;
}

export function createPostEndpointEvaluator(config: PostEvaluatorConfig) {
  return (node: PostEndpointAttributes, parameter: number) =>
    evaluatePostEndpoint(node, parameter, config);
}
