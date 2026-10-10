/**
 * Recovered arithmetic from Clip Studio Paint 5.1.4 ARM64.
 * This is not a stroke simplifier or a complete CSP post-correction implementation.
 * Addresses and the missing path operations are documented in post-analysis.md.
 * Domain: finite inputs and finite intermediates, IEEE round-to-nearest/ties-to-even,
 * no flush-to-zero. Math.sqrt must implement correctly rounded binary64 square root.
 * ARM NaN payloads, floating-point exception flags, and other FPCR modes are excluded.
 */
export type Point = Readonly<{ x: number; y: number }>;
export type ScalarLimits = Readonly<{ ratio: number; floor: number }>;
const f32 = Math.fround;

function signed32(value: number): number {
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
    throw new RangeError("k must be a signed 32-bit integer");
  }
  return value;
}

/** Decode a finite binary64 number into a signed integer times a power of two. */
function decode(value: number): { mantissa: bigint; exponent: number } {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value, false);
  const bits = bytes.getBigUint64(0, false);
  const exponent = Number((bits >> 52n) & 2047n);
  const fraction = bits & ((1n << 52n) - 1n);
  const mantissa = exponent === 0 ? fraction : (1n << 52n) | fraction;
  return {
    mantissa: bits >> 63n ? -mantissa : mantissa,
    exponent: exponent === 0 ? -1074 : exponent - 1075,
  };
}

/** Software FMADD: one binary64 rounding after the exact product plus addend. */
export function fma64(a: number, b: number, c: number): number {
  if (![a, b, c].every(Number.isFinite)) {
    throw new RangeError("fma64 requires finite operands");
  }
  const da = decode(a),
    db = decode(b),
    dc = decode(c);
  const product = da.mantissa * db.mantissa;
  if (product === 0n && dc.mantissa === 0n) return a * b + c;
  const productExponent = da.exponent + db.exponent;
  const exponent = Math.min(productExponent, dc.exponent);
  let sum =
    (product << BigInt(productExponent - exponent)) +
    (dc.mantissa << BigInt(dc.exponent - exponent));
  if (sum === 0n) return 0;
  const negative = sum < 0n;
  if (negative) sum = -sum;
  const bits = sum.toString(2).length;
  const shift = Math.max(0, bits - 53, -1074 - exponent);
  let rounded = sum >> BigInt(shift);
  if (shift > 0) {
    const remainder = sum - (rounded << BigInt(shift));
    const half = 1n << BigInt(shift - 1);
    if (remainder > half || (remainder === half && (rounded & 1n) !== 0n)) rounded++;
  }
  const value = Number(rounded) * 2 ** (exponent + shift);
  return negative ? -value : value;
}

export type PostSettingsInput = Readonly<{
  enabled: boolean; // Setting 0x47e, default false in this reader.
  k: number; // Setting 0x47f, default 1 in this reader.
  flag480: boolean; // Setting 0x480. Its initialized caller value is false.
  scaleTolerance: boolean; // Setting 0x481, default true in this reader.
  selector482: boolean; // Setting 0x482. Its initialized caller value is false.
  fallbackRequested: boolean; // The reader's w3, not an established UI label.
  magnificationPercent: number; // The double returned by 0x102992930.
  priorFlag480: boolean; // Preserved when disabled with fallbackRequested.
  priorSelector482: boolean; // Preserved when disabled with fallbackRequested.
}>;

export type ConvertedPostSettings = Readonly<{
  k: number;
  tolerance: number;
  lengthScale: number;
  flag480: boolean;
  selector482: boolean;
}>;

/** 0x1028e1308. null means false return and no output writes. */
export function convertPostSettings(input: PostSettingsInput): ConvertedPostSettings | null {
  if (!input.enabled && !input.fallbackRequested) return null;
  const k = input.enabled ? signed32(input.k) : 1;
  let tolerance = input.enabled ? (Math.imul(k, k) >>> 0) * 0.1 : 0.2;
  if (tolerance < 0.2 && input.fallbackRequested) tolerance = 0.2;
  // Preserve both instructions. Replacing this with 100 / M changes rounding.
  const lengthScale = 1 / (input.magnificationPercent * 0.01);
  if (!input.enabled || input.scaleTolerance) tolerance = lengthScale * tolerance;
  return {
    k,
    tolerance,
    lengthScale,
    flag480: input.enabled ? input.flag480 : input.priorFlag480,
    selector482: input.enabled ? input.selector482 : input.priorSelector482,
  };
}

/** 0x102891cfc–0x102891d24; caller must determine the preceding object condition. */
export function applyCallerCap(k: number, tolerance: number, capApplies: boolean) {
  signed32(k);
  return capApplies
    ? { k: k >= 5 ? 4 : k, tolerance: tolerance > 1.5 ? 1.5 : tolerance }
    : { k, tolerance };
}

/** 0x102787204–0x102787230: fused double arithmetic, then float conversion and cap. */
export function scalarLimits(k: number): ScalarLimits {
  signed32(k);
  const ratio = f32(fma64(0.1, k, 1.2));
  const floor = f32(fma64(0.01, k, 0.05));
  return { ratio: ratio > f32(3) ? f32(3) : ratio, floor: floor > f32(0.3) ? f32(0.3) : floor };
}

/**
 * 0x102787234–0x1027872c4. Maximum schedule; execution stops at the first
 * additional pass that removes no node. The two initial passes always execute.
 */
export function removalPassSchedule(k: number, initialTolerance: number) {
  signed32(k);
  const raw = Math.trunc(k * 0.2);
  const n = Math.min(raw, 7);
  const additionalPassLimit = raw < -2 ? 0 : n + 3;
  const decrement = additionalPassLimit === 0 ? 0 : Math.trunc(k / (n + 4));
  let tolerance = initialTolerance;
  const additionalTolerances: number[] = [];
  for (let i = 0; i < additionalPassLimit; i++) {
    tolerance = tolerance - decrement;
    additionalTolerances.push(tolerance);
  }
  return {
    initialTolerances: [initialTolerance, initialTolerance],
    raw,
    n,
    decrement,
    additionalPassLimit,
    additionalTolerances,
  };
}

/** 0x1027884d8–0x102788508. The float is source node +0x4c, not node +0x44. */
export function sourceSegmentTolerance(
  tolerance: number,
  flag480: boolean,
  node4c: number,
): number {
  if (!flag480) return tolerance;
  const widened = f32(node4c);
  const factor = widened < 0.1 ? 0.1 : widened;
  const scaled = tolerance * factor;
  return scaled < 0.1 ? 0.1 : scaled;
}

/** 0x1027872d4–0x1027872ec: parameter passed to each endpoint pass. */
export function endpointParameter(k: number): number {
  signed32(k);
  const value = k * 0.05;
  return value > 1 ? 1 : value;
}

function squareLength(x: number, y: number): number {
  return fma64(x, x, y * y);
}

/** 0x1027878ec. The caller 0x102787bb0 supplies tolerance * 0.3. */
export function cornerPredicate(
  a: Point,
  b: Point,
  c: Point,
  positionalTolerance: number,
  lengthScale: number,
): boolean {
  const ux = b.x - a.x,
    uy = b.y - a.y;
  const u2 = squareLength(ux, uy);
  if (u2 < 1e-8) return true;
  const vx = c.x - b.x,
    vy = c.y - b.y;
  const v2 = squareLength(vx, vy);
  if (v2 < 1e-8) return true;
  const lu = Math.sqrt(u2),
    lv = Math.sqrt(v2);
  const unx = ux / lu,
    uny = uy / lu,
    vnx = vx / lv,
    vny = vy / lv;
  const sum = lu + lv;
  const scaledLength = sum * lengthScale;
  const limit =
    scaledLength < 1
      ? 0.8
      : scaledLength < 3
        ? 0.7
        : scaledLength < 10
          ? 0.6
          : scaledLength < 30
            ? 0.5
            : 0.4;
  const cosine = fma64(unx, vnx, uny * vny);
  if (cosine > limit) return false;
  if (cosine < 0) return true;
  const dx = c.x - a.x,
    dy = c.y - a.y;
  const chord2 = squareLength(dx, dy);
  if (chord2 === 0) return true;
  const chord = Math.sqrt(chord2);
  if (chord + chord < sum) return true;
  const deviationNumerator = Math.abs(fma64(uy, dx, -(ux * dy)));
  // PL after FCMP is true on equality (also unordered, outside this finite domain).
  return !(deviationNumerator < chord * positionalTolerance);
}

/** 0x102787c18–0x102787c54; eligibility restrictions must be handled by the caller. */
export function classifiedCornerFlags(flags: number, isCorner: boolean): number {
  return (isCorner ? flags | 1 : flags & ~0x43) >>> 0;
}

/** Exact float bounds at 0x1027885b8–0x1027885dc. */
export function scalarBounds(sourceScalar: number, limits: ScalarLimits) {
  const q = f32(sourceScalar),
    ratio = f32(limits.ratio),
    floor = f32(limits.floor);
  const product = f32(q * ratio);
  return { lower: q < floor ? 0 : f32(q / ratio), upper: product < floor ? floor : product };
}

/** Inclusive float slack interval used by 0x102217d1c and 0x102217d7c. */
function inScalarSlack(value: number, bound: number): boolean {
  const lower = f32(bound + f32(-0.0001));
  const upper = f32(bound + f32(0.0001));
  return upper >= value && lower <= value;
}

export function scalarAtLeast(value: number, bound: number): boolean {
  value = f32(value);
  bound = f32(bound);
  return value > bound || inScalarSlack(value, bound);
}

export function scalarAtMost(value: number, bound: number): boolean {
  value = f32(value);
  bound = f32(bound);
  return value < bound || inScalarSlack(value, bound);
}

export function scalarWithinBounds(value: number, lower: number, upper: number): boolean {
  return scalarAtMost(value, upper) && scalarAtLeast(value, lower);
}

/** 0x102788638–0x102788650: float endpoints, double interpolation with one FMA. */
export function interpolateScalar(a: number, b: number, replacementParameter: number): number {
  const t = replacementParameter;
  return f32(fma64(f32(a), 1 - t, t * f32(b)));
}

/**
 * Scalar portion of 0x1027885b0–0x102788670. The caller supplies the replacement
 * parameter from 0x10359b240, not arc length or a time ratio. Only mode 1 uses this.
 */
export function removalScalarAccepted(
  sourceScalar: number,
  a: number,
  b: number,
  limits: ScalarLimits,
  replacementParameter: number,
): boolean {
  const { lower, upper } = scalarBounds(sourceScalar, limits);
  if (scalarWithinBounds(a, lower, upper) && scalarWithinBounds(b, lower, upper)) return true;
  return scalarWithinBounds(interpolateScalar(a, b, replacementParameter), lower, upper);
}

/** Numeric portion of 0x102787d04–0x102787d68, after flag and adjacency checks. */
export function nearCoincidentRemovalAccepted(
  candidate: Point,
  previous: Point,
  candidateScalar: number,
  previousScalar: number,
  limits: ScalarLimits,
): boolean {
  if (!(squareLength(previous.x - candidate.x, previous.y - candidate.y) < 1)) return false;
  const { lower, upper } = scalarBounds(previousScalar, limits);
  return scalarAtLeast(candidateScalar, lower) && scalarAtMost(candidateScalar, upper);
}

/** 0x102787818–0x102787838: preserve add/add/divide order. */
export function quadraticToCubic(a: Point, q: Point, c: Point): readonly [Point, Point] {
  const twiceX = q.x + q.x,
    twiceY = q.y + q.y;
  return [
    { x: (twiceX + a.x) / 3, y: (twiceY + a.y) / 3 },
    { x: (twiceX + c.x) / 3, y: (twiceY + c.y) / 3 },
  ];
}

/**
 * 0x102787760–0x102787784 after chord distance has been obtained.
 * Tangents are passed through unchanged; their normalization is not established.
 */
export function tangentCubicControls(
  a: Point,
  c: Point,
  startTangent: Point,
  endTangent: Point,
  chordLength: number,
): readonly [Point, Point] {
  const third = chordLength / 3;
  return [
    { x: a.x + startTangent.x * third, y: a.y + startTangent.y * third },
    { x: c.x - endTangent.x * third, y: c.y - endTangent.y * third },
  ];
}
