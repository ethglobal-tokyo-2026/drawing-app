/**
 * Writes src/stickers/roomLight.json, the room's bounce as the device sees it, per unit of the ceiling
 * light's radiance. Run it after changing roomGeometry.ts: pnpm --filter frontend room-light
 *
 * Radiosity over the box roomGeometry.ts describes, in patches of about 0.1 m, lit by the diffuser as a
 * Lambertian disc facing down at the ceiling's center; then the room's radiance seen from the device, on
 * a 64×32 equirectangular map in the room's axes: x the viewer's left, y toward the viewer, z up. Column
 * j spans azimuths 2πj/64 to 2π(j+1)/64 from x toward y; row i spans polar angles πi/32 to π(i+1)/32
 * down from z. The disc itself is left out, since the shader draws it: the map shows the ceiling there.
 */
import { writeFile } from "node:fs/promises";
import {
  CEILING_ABOVE_DEVICE,
  DEVICE_HEIGHT,
  DIFFUSER_RADIUS,
  LIGHT_AZIMUTH,
  LIGHT_ELEVATION,
  REFLECTANCE,
  ROOM_SIZE,
} from "../src/stickers/roomGeometry";

type Vec3 = readonly [number, number, number];

const PATCH_SIZE = 0.1;
const MAP = { width: 64, height: 32 } as const;
/** Each texel's radiance is the mean of this many by this many rays, spread evenly over its solid angle. */
const RAYS_PER_SIDE = 8;
const MAX_ITERATIONS = 500;
/** The solve stops once no patch changes by more than this share of the brightest. */
const CONVERGED = 1e-7;

const RAD = Math.PI / 180;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const { width: W, depth: D, height: H } = ROOM_SIZE;
const light: Vec3 = [W / 2, D / 2, H];
const run = CEILING_ABOVE_DEVICE / Math.tan(LIGHT_ELEVATION * RAD);
// The light is toward the viewer (+y) and to their left (+x) of the device.
const device: Vec3 = [
  light[0] - run * Math.sin(LIGHT_AZIMUTH * RAD),
  light[1] - run * Math.cos(LIGHT_AZIMUTH * RAD),
  DEVICE_HEIGHT,
];
/** The disc's intensity per unit radiance along its axis: radiance times its area. */
const AXIAL_INTENSITY = Math.PI * DIFFUSER_RADIUS * DIFFUSER_RADIUS;

/** One face of the box, cut into nu × nv patches; patch (i, j) is first + i·nv + j. */
interface Face {
  name: string;
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  nu: number;
  nv: number;
  normal: Vec3;
  reflectance: number;
  first: number;
}
interface Patch {
  center: Vec3;
  normal: Vec3;
  area: number;
  reflectance: number;
}
const faces: Face[] = [];
const patches: Patch[] = [];
const cells = (length: number) => Math.max(1, Math.round(length / PATCH_SIZE));
function addFace(name: string, origin: Vec3, u: Vec3, v: Vec3, normal: Vec3, reflectance: number) {
  const [nu, nv] = [cells(Math.hypot(...u)), cells(Math.hypot(...v))];
  const area = (Math.hypot(...u) / nu) * (Math.hypot(...v) / nv);
  faces.push({ name, origin, u, v, nu, nv, normal, reflectance, first: patches.length });
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const [s, t] = [(i + 0.5) / nu, (j + 0.5) / nv];
      const center: Vec3 = [
        origin[0] + u[0] * s + v[0] * t,
        origin[1] + u[1] * s + v[1] * t,
        origin[2] + u[2] * s + v[2] * t,
      ];
      patches.push({ center, normal, area, reflectance });
    }
}
const FLOOR = 0,
  CEILING = 1,
  AHEAD = 2,
  BEHIND = 3,
  RIGHT = 4,
  LEFT = 5;
addFace("floor", [0, 0, 0], [W, 0, 0], [0, D, 0], [0, 0, 1], REFLECTANCE.floor);
addFace("ceiling", [0, 0, H], [W, 0, 0], [0, D, 0], [0, 0, -1], REFLECTANCE.ceiling);
addFace("wall ahead", [0, 0, 0], [W, 0, 0], [0, 0, H], [0, 1, 0], REFLECTANCE.walls);
addFace("wall behind", [0, D, 0], [W, 0, 0], [0, 0, H], [0, -1, 0], REFLECTANCE.walls);
addFace("wall to the right", [0, 0, 0], [0, D, 0], [0, 0, H], [1, 0, 0], REFLECTANCE.walls);
addFace("wall to the left", [W, 0, 0], [0, D, 0], [0, 0, H], [-1, 0, 0], REFLECTANCE.walls);
const N = patches.length;
console.log(
  `Room ${W}×${D}×${H} m, reflectances ${JSON.stringify(REFLECTANCE)}, ${N} patches of about ${PATCH_SIZE} m`,
);
console.log(
  `Device at ${device.map((v) => v.toFixed(3)).join(", ")} m, the light ${Math.hypot(...sub(light, device)).toFixed(3)} m away at ${LIGHT_ELEVATION}° up, ${LIGHT_AZIMUTH}° left of straight behind`,
);

/** Irradiance from the disc, as a point facing down, per unit radiance. */
function directAt(p: Vec3, n: Vec3) {
  const d = sub(light, p);
  const r2 = dot(d, d);
  const r = Math.sqrt(r2);
  const atLight = d[2] / r;
  const atSurface = dot(d, n) / r;
  return atLight > 0 && atSurface > 0 ? (AXIAL_INTENSITY * atLight * atSurface) / r2 : 0;
}

// Form factors from patch center to patch, softened by the patch's own area so neighbors stay finite;
// each row is scaled to 1, since a closed box loses no light.
let started = performance.now();
const F = new Float32Array(N * N);
for (let i = 0; i < N; i++) {
  const a = patches[i];
  let sum = 0;
  for (let j = 0; j < N; j++) {
    if (i === j) continue;
    const b = patches[j];
    const d = sub(b.center, a.center);
    const r2 = dot(d, d);
    const r = Math.sqrt(r2);
    const cosA = dot(d, a.normal) / r;
    const cosB = -dot(d, b.normal) / r;
    if (cosA <= 0 || cosB <= 0) continue;
    const f = (cosA * cosB * b.area) / (Math.PI * r2 + b.area);
    F[i * N + j] = f;
    sum += f;
  }
  for (let j = 0; j < N; j++) F[i * N + j] /= sum;
  if ((i + 1) % 1000 === 0 || i + 1 === N) console.log(`Form factors: ${i + 1}/${N} rows`);
}
console.log(`Form factors took ${((performance.now() - started) / 1000).toFixed(1)} s`);

// Radiosity B = ρ(E + Σ F·B), by Jacobi iteration.
started = performance.now();
const E0 = Float64Array.from(patches, (p) => directAt(p.center, p.normal));
let B = Float64Array.from(patches, (p, i) => p.reflectance * E0[i]);
let iterations = 0;
for (let change = Infinity; ; iterations++) {
  if (iterations === MAX_ITERATIONS)
    throw new Error(
      `Radiosity did not converge in ${MAX_ITERATIONS} iterations (last change ${change})`,
    );
  const next = new Float64Array(N);
  change = 0;
  for (let i = 0; i < N; i++) {
    let gathered = 0;
    const row = i * N;
    for (let j = 0; j < N; j++) gathered += F[row + j] * B[j];
    next[i] = patches[i].reflectance * (E0[i] + gathered);
    change = Math.max(change, Math.abs(next[i] - B[i]));
  }
  B = next;
  const brightest = B.reduce((m, b) => Math.max(m, b), 0);
  if ((iterations + 1) % 10 === 0)
    console.log(
      `Radiosity iteration ${iterations + 1}: largest change ${(change / brightest).toExponential(2)} of the brightest`,
    );
  if (change < CONVERGED * brightest) break;
}
console.log(
  `Radiosity converged after ${iterations + 1} iterations in ${((performance.now() - started) / 1000).toFixed(1)} s`,
);

/** A face's radiosity at a point on it, bilinear between its patch centers. */
function radiosityOn(face: Face, p: Vec3) {
  const local = sub(p, face.origin);
  const along = (axis: Vec3, count: number) => {
    const at = (dot(local, axis) / dot(axis, axis)) * count - 0.5;
    return Math.min(count - 1, Math.max(0, at));
  };
  const s = along(face.u, face.nu);
  const t = along(face.v, face.nv);
  const [i0, j0] = [Math.floor(s), Math.floor(t)];
  const [i1, j1] = [Math.min(i0 + 1, face.nu - 1), Math.min(j0 + 1, face.nv - 1)];
  const [fs, ft] = [s - i0, t - j0];
  const at = (i: number, j: number) => B[face.first + i * face.nv + j];
  return (
    (1 - fs) * ((1 - ft) * at(i0, j0) + ft * at(i0, j1)) +
    fs * ((1 - ft) * at(i1, j0) + ft * at(i1, j1))
  );
}

/** Along each axis: the box's far side, and the faces met moving down and up that axis. */
const AXES = [
  { far: W, down: RIGHT, up: LEFT },
  { far: D, down: AHEAD, up: BEHIND },
  { far: H, down: FLOOR, up: CEILING },
] as const;

/** The room's radiance seen from the device along a unit direction: the face it meets, its B/π. */
function radianceAlong(d: Vec3) {
  let nearest = Infinity;
  let face: number = FLOOR;
  AXES.forEach(({ far, down, up }, axis) => {
    if (d[axis] === 0) return;
    const t = ((d[axis] > 0 ? far : 0) - device[axis]) / d[axis];
    if (t < nearest) {
      nearest = t;
      face = d[axis] > 0 ? up : down;
    }
  });
  const p: Vec3 = [
    device[0] + nearest * d[0],
    device[1] + nearest * d[1],
    device[2] + nearest * d[2],
  ];
  return radiosityOn(faces[face], p) / Math.PI;
}

started = performance.now();
const radiance = new Float64Array(MAP.width * MAP.height);
for (let row = 0; row < MAP.height; row++) {
  const [top, bottom] = [
    Math.cos((Math.PI * row) / MAP.height),
    Math.cos((Math.PI * (row + 1)) / MAP.height),
  ];
  for (let column = 0; column < MAP.width; column++) {
    let sum = 0;
    for (let a = 0; a < RAYS_PER_SIDE; a++)
      for (let b = 0; b < RAYS_PER_SIDE; b++) {
        // Even in cos θ and in azimuth, so every ray stands for the same solid angle.
        const z = top + ((bottom - top) * (a + 0.5)) / RAYS_PER_SIDE;
        const phi = (2 * Math.PI * (column + (b + 0.5) / RAYS_PER_SIDE)) / MAP.width;
        const s = Math.sqrt(Math.max(0, 1 - z * z));
        sum += radianceAlong([s * Math.cos(phi), s * Math.sin(phi), z]);
      }
    radiance[row * MAP.width + column] = sum / RAYS_PER_SIDE ** 2;
  }
}
const scale = radiance.reduce((m, v) => Math.max(m, v), 0);
const pixels = Buffer.alloc(MAP.width * MAP.height * 4);
radiance.forEach((v, i) => {
  const value = Math.round((255 * v) / scale);
  pixels.set([value, value, value, 255], i * 4);
});
console.log(
  `Map ${MAP.width}×${MAP.height} from ${RAYS_PER_SIDE ** 2} rays a texel in ${((performance.now() - started) / 1000).toFixed(1)} s; its brightest radiance ${scale.toExponential(4)} of the light's`,
);

/** The irradiance on paper at the device facing n, from the map as stored and from the patches. */
function roomOnPaper(n: Vec3) {
  let fromMap = 0;
  for (let row = 0; row < MAP.height; row++) {
    const [top, bottom] = [Math.PI * row, Math.PI * (row + 1)].map((t) => Math.cos(t / MAP.height));
    const solidAngle = ((2 * Math.PI) / MAP.width) * (top - bottom);
    const theta = (Math.PI * (row + 0.5)) / MAP.height;
    for (let column = 0; column < MAP.width; column++) {
      const phi = (2 * Math.PI * (column + 0.5)) / MAP.width;
      const d: Vec3 = [
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
      ];
      const value = (pixels[(row * MAP.width + column) * 4] / 255) * scale;
      fromMap += value * Math.max(0, dot(n, d)) * solidAngle;
    }
  }
  let fromPatches = 0;
  patches.forEach((q, i) => {
    const d = sub(q.center, device);
    const r2 = dot(d, d);
    const r = Math.sqrt(r2);
    const cosPaper = dot(d, n) / r;
    const cosPatch = -dot(d, q.normal) / r;
    if (cosPaper > 0 && cosPatch > 0)
      fromPatches += (B[i] * cosPaper * cosPatch * q.area) / (Math.PI * r2);
  });
  return { fromMap, fromPatches };
}

/** Paper's normal at an elevation above level, toward the viewer. */
const towardViewer = (degrees: number): Vec3 => [
  0,
  Math.cos(degrees * RAD),
  Math.sin(degrees * RAD),
];
const stillDirect = directAt(device, towardViewer(54));
console.log(
  "Each surface's mean radiance against the tablet's still pose's direct irradiance / π:",
);
for (const face of faces) {
  let sum = 0;
  for (let k = 0; k < face.nu * face.nv; k++) sum += B[face.first + k];
  console.log(`  ${face.name.padEnd(18)} ${(sum / (face.nu * face.nv) / stillDirect).toFixed(3)}`);
}
console.log("The room's share of the light on paper, by its normal's elevation toward the viewer:");
for (const [degrees, label] of [
  [90, "flat"],
  [54, "tablet still"],
  [43, "phone still"],
  [0, "upright"],
  [-20, "past upright"],
] as const) {
  const n = towardViewer(degrees);
  const direct = directAt(device, n);
  const { fromMap, fromPatches } = roomOnPaper(n);
  const share = (room: number) => `${((100 * room) / (room + direct)).toFixed(1)}%`;
  console.log(
    `  ${String(degrees).padStart(3)}° ${label.padEnd(13)} map ${share(fromMap)}, patches ${share(fromPatches)}`,
  );
}

await writeFile(
  new URL("../src/stickers/roomLight.json", import.meta.url),
  JSON.stringify(
    { width: MAP.width, height: MAP.height, scale, pixels: pixels.toString("base64") },
    null,
    2,
  ) + "\n",
);
console.log("Saved src/stickers/roomLight.json");
