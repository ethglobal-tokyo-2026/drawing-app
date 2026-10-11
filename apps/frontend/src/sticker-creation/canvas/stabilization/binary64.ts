/** Binary64 fusion: round-to-nearest/ties-to-even and gradual underflow; no NaN payloads or flags. */

// Calls are synchronous and nonrecursive; this scratch view holds no returned state.
const scratch = new DataView(new ArrayBuffer(8));
const splitter = 134217729;
const small = 2 ** -400;
const large = 2 ** 400;

/** Knuth TwoSum's exact residual, provided the sum and residual do not overflow/underflow. */
function sumError(a: number, b: number, sum: number): number {
  const bVirtual = sum - a;
  return a - (sum - bVirtual) + (b - bVirtual);
}

/**
 * Error-free product and sums prove a rounded result for ordinary exponents.
 * Dekker splitting and Knuth TwoSum preserve every low bit. If the rounded
 * residual is strictly inside the candidate's rounding interval, the exact
 * residual is too: its boundary is itself representable. Midpoints, zero,
 * subnormal results and extreme inputs use the integer path below.
 */
function ordinaryFma(a: number, b: number, c: number): number | undefined {
  const aa = Math.abs(a),
    bb = Math.abs(b),
    cc = Math.abs(c);
  if (
    aa < small ||
    aa > large ||
    bb < small ||
    bb > large ||
    (cc !== 0 && (cc < small || cc > large))
  )
    return undefined;
  // This domain keeps split products and all residuals normal (or exact zero).
  const aSplit = splitter * a,
    bSplit = splitter * b;
  const aHigh = aSplit - (aSplit - a),
    bHigh = bSplit - (bSplit - b);
  const aLow = a - aHigh,
    bLow = b - bHigh;
  const product = a * b;
  const first = product - aHigh * bHigh;
  const second = first - aLow * bHigh;
  const third = second - aHigh * bLow;
  const productError = aLow * bLow - third;
  const sum = product + c;
  const additionError = sumError(product, c, sum);
  const correction = additionError + productError;
  const correctionError = sumError(additionError, productError, correction);
  const candidate = sum + correction;
  if (candidate === 0) return undefined;
  const candidateError = sumError(sum, correction, candidate);
  const residual = candidateError + correctionError;
  scratch.setFloat64(0, candidate, false);
  const high = scratch.getUint32(0, false),
    low = scratch.getUint32(4, false);
  const exponent = (high >>> 20) & 2047;
  if (exponent === 0 || exponent === 2047) return undefined;
  // At an exact power of two, the neighbor toward zero is half as far away.
  const powerOfTwo = (high & 0xfffff) === 0 && low === 0;
  const halfGap = 2 ** (exponent - (powerOfTwo ? 1077 : 1076));
  return Math.abs(residual) < halfGap ? candidate : undefined;
}

/** Decode a finite binary64 number into a signed integer times a power of two. */
function decode(value: number): { mantissa: bigint; exponent: number } {
  const bytes = scratch;
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
  // An infinite/NaN multiplicand determines the product before addition.
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a * b + c;
  // The exact product of finite operands is finite, even if rounding it alone
  // would overflow. An infinite addend therefore dominates that exact product.
  if (!Number.isFinite(c)) return c;
  const ordinary = ordinaryFma(a, b, c);
  if (ordinary !== undefined) return ordinary;
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
