/** Registered outer coverage; x/y are offsets in the original source image frame. */
export interface FoilCoverage {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  alpha: Uint8ClampedArray;
}

/** The source frame, grown by the radius on each side the alpha comes within it of. */
export function foilCoverageBounds(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  verticalRadius = radius,
) {
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!alpha[y * width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  const x = Math.min(0, Math.floor(left - radius));
  const y = Math.min(0, Math.floor(top - verticalRadius));
  return {
    x,
    y,
    width: Math.max(width, Math.ceil(right + radius)) - x,
    height: Math.max(height, Math.ceil(bottom + verticalRadius)) - y,
  };
}

/** Union the center and the same translated masks used by the static band and its cast. */
export function foilCoverage(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  copies: number,
  verticalRadius = radius,
): FoilCoverage {
  const {
    x,
    y,
    width: w,
    height: h,
  } = foilCoverageBounds(alpha, width, height, radius, verticalRadius);
  const output = unite(alpha, width, height, x, y, w, h, radius, copies, verticalRadius);
  return { x, y, width: w, height: h, sourceWidth: width, sourceHeight: height, alpha: output };
}

/** The same union over a grid already registered to its bounds, keeping its size. */
export function growFoilCoverage(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  copies: number,
  verticalRadius = radius,
) {
  return unite(alpha, width, height, 0, 0, width, height, radius, copies, verticalRadius);
}

function unite(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  copies: number,
  verticalRadius: number,
) {
  const output = new Uint8ClampedArray(w * h);
  const shifts = [
    [0, 0],
    ...Array.from({ length: copies }, (_, i) => [
      radius * Math.cos((i * 2 * Math.PI) / copies),
      verticalRadius * Math.sin((i * 2 * Math.PI) / copies),
    ]),
  ];
  // Exactly saturated union is terminal only when every later bilinear sample is finite.
  // Malformed storage/dimensions keep the original arithmetic (including NaN-to-zero bytes).
  const terminalUnion =
    ArrayBuffer.isView(alpha) &&
    Object.getPrototypeOf(alpha) === Uint8ClampedArray.prototype &&
    Number.isSafeInteger(width) &&
    width > 0 &&
    Number.isSafeInteger(height) &&
    height > 0 &&
    Number.isSafeInteger(width * height) &&
    alpha.length >= width * height &&
    Number.isSafeInteger(copies) &&
    copies >= 0 &&
    radius >= 0 &&
    verticalRadius >= 0 &&
    [x, y, w, h, radius, verticalRadius].every(
      (value) => Number.isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER / 4,
    );
  const at = (u: number, v: number) =>
    u < 0 || v < 0 || u >= width || v >= height ? 0 : alpha[v * width + u] / 255;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let union = 0;
      for (const [dx, dy] of shifts) {
        const u = i + x - dx,
          v = j + y - dy,
          a = Math.floor(u),
          b = Math.floor(v);
        const fx = u - a,
          fy = v - b;
        const sample =
          at(a, b) * (1 - fx) * (1 - fy) +
          at(a + 1, b) * fx * (1 - fy) +
          at(a, b + 1) * (1 - fx) * fy +
          at(a + 1, b + 1) * fx * fy;
        union += (1 - union) * sample;
        if (terminalUnion && union === 1) break;
      }
      output[j * w + i] = union * 255;
    }
  return output;
}
