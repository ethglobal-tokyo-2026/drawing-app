/** Research arithmetic: round-to-nearest/ties-to-even and gradual underflow; no NaN payloads or flags. */

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
  // An infinite/NaN multiplicand determines the product before addition.
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a * b + c;
  // The exact product of finite operands is finite, even if rounding it alone
  // would overflow. An infinite addend therefore dominates that exact product.
  if (!Number.isFinite(c)) return c;
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
