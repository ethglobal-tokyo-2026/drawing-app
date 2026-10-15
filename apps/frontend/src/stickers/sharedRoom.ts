import { createFoilSourceSamples } from "./foilMaterial";
import { currentLight, type DevicePose } from "./light";
import { upOnScreen } from "./lightMode";
import { OVERHEAD_WINDOW, type OverheadWindow } from "./overheadWindow";

/** One room fixed to gravity, seen from one eye in front of the screen; the light's pose orients it. */

/** A room lamp: azimuth from straight ahead (beyond the device) toward the viewer's left, elevation, power. */
type RoomLamp = readonly [azimuth: number, elevation: number, power: number];

/**
 * The room. The eye's distance in CSS px (an unverified guess for about 32 cm), and its elevation
 * above the bottom edge once the device lies flat. The shoji screen's elevation and azimuth to the
 * viewer's left, in degrees; its extent and frame feather on the plane one unit along it (x toward
 * the viewer's right, y down), its kumiko grid, with more rows than columns as a real shoji has, its
 * bottom rail's height above the frame's lower edge as a share of a row (so the phone's narrow still
 * glare holds a horizontal bar), each bar's share of a column's width, and how dark the bars and the
 * washi's edges are. The bounce off the ceiling, the wall the shoji lights, the other walls and the
 * floor, which gloss and foil each mirror, and how far the lit wall fades toward the ceiling. Lamps
 * at fixed points in the room, which only foil's diffraction sees.
 */
export const ROOM = {
  eyeDistance: 1900,
  flatEyeElevation: 55,
  elevation: 48,
  azimuth: 6,
  shoji: {
    x: 0,
    y: 0,
    halfWidth: 0.13,
    halfHeight: 0.16,
    feather: 0.004,
    radiance: 1.5 * OVERHEAD_WINDOW.radiance,
    columns: 4,
    rows: 7,
    rail: 0.18,
    bar: 0.07,
    barShade: 0.9,
    glow: 0.3,
  } satisfies OverheadWindow & Record<string, number>,
  glossBounce: { ceiling: 0.36, litWall: 0.34, walls: 0.2, floor: 0.06, litWallFade: 0.7 },
  foilBounce: { ceiling: 0.95, litWall: 1.15, walls: 0.62, floor: 0.34, litWallFade: 0 },
  lamps: [
    [0, 70, 0.16],
    [32, 60, 0.14],
    [-30, 62, 0.14],
    [150, 10, 0.15],
    [40, 30, 0.13],
    [180, 18, 0.13],
    [-150, 10, 0.15],
  ] satisfies readonly RoomLamp[],
} as const;

type Vec3 = [number, number, number];
const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3): Vec3 => {
  const length = Math.hypot(...a);
  return length > 1e-9 ? scale(a, 1 / length) : a;
};
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** A direction at an azimuth toward `left` from `ahead` and an elevation above `up`. */
const toward = (ahead: Vec3, left: Vec3, up: Vec3, azimuth: number, elevation: number) =>
  unit(
    add(
      scale(
        add(scale(ahead, Math.cos(azimuth * RAD)), scale(left, Math.sin(azimuth * RAD))),
        Math.cos(elevation * RAD),
      ),
      scale(up, Math.sin(elevation * RAD)),
    ),
  );

/**
 * The room's frame in the shader's screen axes (x right, y down, z toward the viewer): up, toward the
 * viewer, the shoji's direction and its across (viewer's right) and down axes, and the eye in CSS px
 * from the screen's center.
 */
export function roomFrame(pose: DevicePose = currentLight()) {
  const up: Vec3 = upOnScreen(pose);
  // The eye sits on the screen's axis from about 45° up; as the device lies flat it moves toward the
  // bottom edge, where people look from, at the same distance.
  const flat = smoothstep(Math.SQRT1_2, 1, up[2]);
  const eye = unit([0, -flat / Math.tan(ROOM.flatEyeElevation * RAD), 1]);
  // Toward the viewer, horizontally: the eye's own direction, level.
  const horizontal = (v: Vec3) => add(v, scale(up, -dot(v, up)));
  let level = horizontal(eye);
  if (Math.hypot(...level) < 1e-4) level = horizontal([0, -1, 0]);
  const h = unit(level);
  const left = cross(h, up);
  const light = toward(h, left, up, ROOM.azimuth, ROOM.elevation);
  const across = unit(add(scale(left, -1), scale(light, dot(left, light))));
  const down = unit(add(scale(up, -1), scale(light, dot(up, light))));
  const ahead = scale(h, -1);
  const lamps = ROOM.lamps.map(([azimuth, elevation, power]) => ({
    direction: toward(ahead, left, up, azimuth, elevation),
    power,
  }));
  const flip = (v: Vec3): Vec3 => [v[0], -v[1], v[2]];
  return {
    up: flip(up),
    toward: flip(h),
    light: flip(light),
    across: flip(across),
    down: flip(down),
    eye: scale(flip(eye), ROOM.eyeDistance),
    lamps: lamps.map((lamp) => ({ ...lamp, direction: flip(lamp.direction) })),
  };
}

export type RoomFrame = ReturnType<typeof roomFrame>;

const shojiSources = createFoilSourceSamples({
  window: ROOM.shoji,
  level: 1,
  grid: 3,
  lamps: [],
});

/** The foil's shoji quadrature, laid out around the light, then the room's lamps, in screen axes. */
export function roomFoilSources(frame: RoomFrame) {
  const out = new Float32Array(64);
  for (let i = 0; i < 36; i += 4) {
    const [x, y, z, w] = shojiSources.subarray(i, i + 4);
    for (let c = 0; c < 3; c++)
      out[i + c] = x * frame.across[c] + y * frame.down[c] + z * frame.light[c];
    out[i + 3] = w;
  }
  frame.lamps.forEach(({ direction, power }, k) => out.set([...direction, power], 36 + 4 * k));
  return out;
}
