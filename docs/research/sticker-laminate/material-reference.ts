/**
 * Research-only thin dielectric reference over display-referred sticker print.
 * Exact interface Fresnel, finite view directions, geometric slope normals, and sRGB decoding are
 * combined with an explicitly approximate nine-tap angular environment filter. Its tent width is
 * an appearance parameter, not a measured microfacet roughness or a full layered-material BSDF.
 * Outgoing Fresnel attenuates the calibrated print; adhesive transport and internal returns are not
 * reconstructed. Parameters describe a virtual scene, not manufacturer measurements.
 */
export type Vec3 = readonly [number, number, number];
export type Rgb = readonly [number, number, number];
export type Point = readonly [number, number];
export interface Material {
  ior: number;
  roughness: number;
}
export interface Pose {
  x: number;
  y: number;
  rotationDegrees: number;
}
export type Environment = (direction: Vec3) => number;

export const MATERIAL_GLOSS: Material = { ior: 1.5, roughness: 0.016 };
export const MATERIAL_MATTE: Material = { ior: 1.5, roughness: 0.16 };
export const CAMERA_DISTANCE = 2.4;
export const POSE_RADIANS = 0.38;
export const STICKER_THICKNESS = 0.35;
/** A calibrated diffuse-print illumination proxy, not an integral of the analytic environment. */
export const BASE_ILLUMINATION = 0.9;
export const ENVIRONMENT = {
  ambient: 0.14,
  peak: 3.2,
  centerX: 0.02,
  centerY: -0.025,
  halfWidth: 0.1,
  halfHeight: 0.145,
  edge: 0.015,
};

const bound = (v: number) => Math.max(0, Math.min(1, v));
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(...v);
  if (!(length > 0) || !Number.isFinite(length)) throw new Error("Invalid surface direction");
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** v points from the surface toward the viewer; the result points toward the reflected scene. */
export function reflect(v: Vec3, n: Vec3): Vec3 {
  const twice = 2 * dot(v, n);
  return normalize([twice * n[0] - v[0], twice * n[1] - v[1], twice * n[2] - v[2]]);
}

/** Unpolarized air-to-film Fresnel; no fitted reflection-strength value. */
export function dielectricFresnel(cosine: number, ior: number): number {
  if (!Number.isFinite(cosine) || !Number.isFinite(ior) || ior <= 1)
    throw new Error("A finite air-to-film index above one is required");
  const c = bound(cosine);
  const transmitted = Math.sqrt(1 - (1 - c * c) / (ior * ior));
  const perpendicular = (c - ior * transmitted) / (c + ior * transmitted);
  const parallel = (ior * c - transmitted) / (ior * c + transmitted);
  return (perpendicular * perpendicular + parallel * parallel) / 2;
}

export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
export function linearToSrgb(value: number): number {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}
export function printToLinear(rgb: Rgb): Rgb {
  return [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
}
export function linearToPrint(rgb: Rgb): Rgb {
  return [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])];
}

/** Coordinates are centered, in short-side units; y grows down consistently throughout the scene. */
export function screenPoint(u: number, v: number, width: number, height: number, turn = 0): Point {
  if (!(width > 0 && height > 0)) throw new Error("Positive sticker dimensions are required");
  const short = Math.min(width, height);
  const x = ((u - 0.5) * width) / short;
  const y = ((v - 0.5) * height) / short;
  const a = (turn * Math.PI) / 180;
  return [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
}

export function normalFromSlope(dx: number, dy: number): Vec3 {
  return normalize([-dx, -dy, 1]);
}

/** Raw height is in sticker levels; spacing and thickness are in CSS px. Never pass masked alpha. */
export function normalFromHeight(
  field: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  spacingX = 1,
  spacingY = 1,
  thickness = STICKER_THICKNESS,
): Vec3 {
  const left = Math.max(0, x - 1),
    right = Math.min(width - 1, x + 1);
  const top = Math.max(0, y - 1),
    bottom = Math.min(height - 1, y + 1);
  const dx =
    right === left
      ? 0
      : ((field[y * width + right] - field[y * width + left]) * thickness) /
        ((right - left) * spacingX);
  const dy =
    bottom === top
      ? 0
      : ((field[bottom * width + x] - field[top * width + x]) * thickness) /
        ((bottom - top) * spacingY);
  return normalFromSlope(dx, dy);
}

/** CSS flight matrix Rz·Rx·Ry, followed by the foil's reflected-light travel pose. */
export function orientNormal(n: Vec3, turn: number, pose: Pose, flight = { x: 0, y: 0 }): Vec3 {
  const z = ((turn + pose.rotationDegrees) * Math.PI) / 180,
    x = pose.y * POSE_RADIANS,
    y = -pose.x * POSE_RADIANS;
  const fx = (flight.x * Math.PI) / 180,
    fy = (flight.y * Math.PI) / 180;
  const ax = Math.cos(fy) * n[0] + Math.sin(fy) * n[2];
  const az = -Math.sin(fy) * n[0] + Math.cos(fy) * n[2];
  const by = Math.cos(fx) * n[1] - Math.sin(fx) * az;
  const bz = Math.sin(fx) * n[1] + Math.cos(fx) * az;
  const nx = Math.cos(z) * ax - Math.sin(z) * by;
  const ny = Math.sin(z) * ax + Math.cos(z) * by;
  const ry = Math.cos(x) * ny - Math.sin(x) * bz;
  const rz = Math.sin(x) * ny + Math.cos(x) * bz;
  return normalize([Math.cos(y) * nx + Math.sin(y) * rz, ry, -Math.sin(y) * nx + Math.cos(y) * rz]);
}

export function viewDirection(point: Point, height = 0): Vec3 {
  return normalize([-point[0], -point[1], CAMERA_DISTANCE - height]);
}

const smooth = (lo: number, hi: number, value: number) => {
  const t = bound((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

/** An off-axis soft rectangular source in angular coordinates, with neutral surrounding radiance. */
export function environment(direction: Vec3): number {
  if (direction[2] <= 0) return ENVIRONMENT.ambient;
  const u = direction[0] / direction[2],
    v = direction[1] / direction[2];
  const horizontal =
    1 -
    smooth(
      ENVIRONMENT.halfWidth - ENVIRONMENT.edge,
      ENVIRONMENT.halfWidth + ENVIRONMENT.edge,
      Math.abs(u - ENVIRONMENT.centerX),
    );
  const vertical =
    1 -
    smooth(
      ENVIRONMENT.halfHeight - ENVIRONMENT.edge,
      ENVIRONMENT.halfHeight + ENVIRONMENT.edge,
      Math.abs(v - ENVIRONMENT.centerY),
    );
  return ENVIRONMENT.ambient + (ENVIRONMENT.peak - ENVIRONMENT.ambient) * horizontal * vertical;
}

/** Nine positive tent weights (1,2,1)x(1,2,1)/16 preserve a uniform environment exactly. */
export function reflectedEnvironment(
  direction: Vec3,
  roughness: number,
  source: Environment = environment,
): number {
  if (direction[2] <= 0) return source(direction);
  const u = direction[0] / direction[2],
    v = direction[1] / direction[2];
  let sum = 0;
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      const value = source(normalize([u + x * roughness, v + y * roughness, 1]));
      if (!Number.isFinite(value) || value < 0 || value > ENVIRONMENT.peak + 1e-12)
        throw new Error(
          "The reference environment must have radiance between zero and its declared peak",
        );
      sum += (value * (x === 0 ? 2 : 1) * (y === 0 ? 2 : 1)) / 16;
    }
  return sum;
}

export interface CoatField {
  reflection: number;
  transmission: number;
  environment: number;
  color: Rgb;
}
export function coatField(input: {
  point: Point;
  normal: Vec3;
  material: Material;
  height?: number;
  environment?: Environment;
}): CoatField {
  const v = viewDirection(input.point, input.height);
  const n = normalize(input.normal);
  const reflection = dielectricFresnel(dot(n, v), input.material.ior);
  const reflected = reflectedEnvironment(
    reflect(v, n),
    input.material.roughness,
    input.environment,
  );
  const value = reflection * reflected;
  return {
    reflection,
    transmission: 1 - reflection,
    environment: reflected,
    color: [value, value, value],
  };
}

/** SDR display transform clips the combined linear result, after HDR reflection and transmission. */
export function compositePrint(
  print: Rgb,
  coat: CoatField,
  baseIllumination = BASE_ILLUMINATION,
): Rgb {
  const base = printToLinear(print);
  return linearToPrint([
    bound(base[0] * baseIllumination * coat.transmission + coat.color[0]),
    bound(base[1] * baseIllumination * coat.transmission + coat.color[1]),
    bound(base[2] * baseIllumination * coat.transmission + coat.color[2]),
  ]);
}

export interface MaterialReference {
  width: number;
  height: number;
  print: Uint8ClampedArray;
  cut: Float32Array;
  material: Material;
  pose: Pose;
  turn?: number;
  drapedHeight?: Float32Array;
  displayWidth?: number;
  displayHeight?: number;
  thickness?: number;
  heightParallax?: boolean;
  environment?: Environment;
  baseIllumination?: number;
}
export interface MaterialFrame {
  /** Premultiplied linear RGB contributions; these remain separate from display encoding. */
  coat: Float32Array;
  transmitted: Float32Array;
  coverage: Float32Array;
  display: Uint8ClampedArray;
  clippedPixels: number;
}

export function renderMaterialReference(input: MaterialReference): MaterialFrame {
  const { width, height } = input;
  const count = width * height;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    input.print.length !== count * 4 ||
    input.cut.length !== count ||
    (input.drapedHeight && input.drapedHeight.length !== count)
  )
    throw new Error("Reference dimensions and print, cut, or height lengths disagree");
  const frame: MaterialFrame = {
    coat: new Float32Array(count * 3),
    transmitted: new Float32Array(count * 3),
    coverage: new Float32Array(input.cut),
    display: new Uint8ClampedArray(count * 4),
    clippedPixels: 0,
  };
  const dw = input.displayWidth ?? width,
    dh = input.displayHeight ?? height;
  const thickness = input.thickness ?? STICKER_THICKNESS,
    turn = input.turn ?? 0;
  const baseIllumination = input.baseIllumination ?? BASE_ILLUMINATION;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        coverage = input.cut[i];
      if (!Number.isFinite(coverage) || coverage < 0 || coverage > 1)
        throw new Error("Cut coverage must be between zero and one");
      if (coverage === 0) continue;
      const n = input.drapedHeight
        ? normalFromHeight(
            input.drapedHeight,
            width,
            height,
            x,
            y,
            dw / width,
            dh / height,
            thickness,
          )
        : ([0, 0, 1] as const);
      const coat = coatField({
        point: screenPoint(
          (x + 0.5) / width,
          (y + 0.5) / height,
          dw,
          dh,
          turn + input.pose.rotationDegrees,
        ),
        normal: orientNormal(n, turn, input.pose),
        material: input.material,
        environment: input.environment,
        height:
          input.heightParallax && input.drapedHeight
            ? (input.drapedHeight[i] * thickness) / Math.min(dw, dh)
            : 0,
      });
      const print: Rgb = [
        input.print[i * 4] / 255,
        input.print[i * 4 + 1] / 255,
        input.print[i * 4 + 2] / 255,
      ];
      const linear = printToLinear(print),
        displayed = compositePrint(print, coat, baseIllumination);
      let clipped = false;
      for (let c = 0; c < 3; c++) {
        frame.coat[i * 3 + c] = coat.color[c] * coverage;
        frame.transmitted[i * 3 + c] = linear[c] * baseIllumination * coat.transmission * coverage;
        if (linear[c] * baseIllumination * coat.transmission + coat.color[c] > 1) clipped = true;
        frame.display[i * 4 + c] = Math.round(displayed[c] * 255);
      }
      if (clipped) frame.clippedPixels++;
      frame.display[i * 4 + 3] = Math.round(coverage * 255);
    }
  return frame;
}
