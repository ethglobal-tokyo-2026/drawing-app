/** Whether the registered height image may hide any of the room's light in the sticker's plane. */
export function creaseCanShade(
  light: ArrayLike<number>,
  normalTransform: ArrayLike<number>,
  maxSlope: number | undefined,
  size: readonly number[],
  angularRadius: number,
) {
  const x =
    normalTransform[0] * light[0] + normalTransform[1] * light[1] + normalTransform[2] * light[2];
  const y =
    normalTransform[3] * light[0] + normalTransform[4] * light[1] + normalTransform[5] * light[2];
  const z =
    normalTransform[6] * light[0] + normalTransform[7] * light[1] + normalTransform[8] * light[2];
  const extent = Math.min(...size);
  // An independently supplied height image can lack a bound. Only a known conservative bound may skip.
  if (
    maxSlope === undefined ||
    !Number.isFinite(maxSlope) ||
    maxSlope < 0 ||
    !(extent > 0) ||
    !Number.isFinite(extent)
  )
    return true;
  // A tilted facet can still face a source below the flat paper's plane.
  return Math.atan2(z, Math.hypot(x, y)) < Math.atan(maxSlope / extent) + angularRadius;
}
