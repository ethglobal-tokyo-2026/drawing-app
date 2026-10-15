import { createFoilSourceSamples, FOIL_ROOM } from "./foilMaterial";
import { currentLight, type DevicePose } from "./light";
import { IDENTITY, inverse, rotate, STILL_POSE, upOnScreen } from "./lightMode";
import { OVERHEAD_WINDOW, type OverheadWindow } from "./overheadWindow";

/** One room fixed in the world, seen from one eye that stays put while the hand turns the device. */

/** A room lamp: azimuth from straight ahead (beyond the device) toward the viewer's left, elevation, power. */
type RoomLamp = readonly [azimuth: number, elevation: number, power: number];

/**
 * A round light in the room, which every material mirrors. Its azimuth from straight ahead (beyond
 * the device) toward the viewer's left and its elevation, in degrees; its body's angular radius and
 * edge blur in radians, at a radiance relative to the room's light level; a small core at the
 * middle, a Gaussian of angular deviation `core`, at its own radiance, so a light can clip gloss
 * near white over a small spot without flooding the ink under its body; and its
 * halo on the surfaces around it, a Gaussian of angular scale `haloScale` at a share of the body.
 */
export interface RoomLight {
  readonly azimuth: number;
  readonly elevation: number;
  readonly radius: number;
  readonly feather: number;
  readonly radiance: number;
  readonly core: number;
  readonly coreRadiance: number;
  readonly haloLevel: number;
  readonly haloScale: number;
}

const SHOJI_RADIANCE = 1.5 * OVERHEAD_WINDOW.radiance;

/**
 * The room. The eye's distance in CSS px (an unverified guess for about 32 cm), and its elevation
 * above the bottom edge once the device lies flat. The shoji screen's elevation, 13° above the still
 * pose's screen normal so its still glare sits in the screen's upper third, and its azimuth to the
 * viewer's left, in degrees; its extent and its frame's own edge blur, a logistic scale that every
 * coat's lobe widens, on the plane one unit along it (x toward the viewer's right, y down); its halo,
 * the wall and ceiling it lights, the coat's haze and the eye's veiling glare, as the frame blurred
 * at a wide logistic scale, at a level against the washi; its kumiko grid, with more rows than columns as a
 * real shoji has, its bottom rail's height above the frame's lower edge as a share of a row (so the
 * phone's narrow still glare holds a horizontal bar), each bar's share of a column's width, and how
 * dark the bars and the washi's edges are, softened as a real gloss softens them. The round lights:
 * a ceiling lamp beyond the device, so a device lying back mirrors a light, and a marumado behind the
 * viewer, above their head as a seated person's window is, so upright poses mirror it. The
 * bounce off the ceiling, the wall the shoji lights, the other walls and the floor, which gloss and
 * foil each mirror, and how far the lit wall fades toward the ceiling. Lamps at fixed points in the
 * room, which only foil's diffraction sees.
 */
export const ROOM = {
  eyeDistance: 1900,
  flatEyeElevation: 55,
  elevation: 90 - STILL_POSE.beta + 13,
  azimuth: 6,
  shoji: {
    x: 0,
    y: 0,
    halfWidth: 0.14,
    halfHeight: 0.25,
    feather: 0.008,
    haloLevel: 0.1,
    haloScale: 0.09,
    radiance: SHOJI_RADIANCE,
    columns: 4,
    rows: 7,
    rail: 0.18,
    bar: 0.1,
    barShade: 0.45,
    glow: 0.3,
  } satisfies OverheadWindow & Record<string, number>,
  lights: [
    {
      azimuth: 0,
      elevation: 66,
      radius: 0.12,
      feather: 0.01,
      radiance: 1.1 * OVERHEAD_WINDOW.radiance,
      core: 0.012,
      coreRadiance: 8 * SHOJI_RADIANCE,
      haloLevel: 0.12,
      haloScale: 0.3,
    },
    {
      azimuth: 180,
      elevation: 20,
      radius: 0.12,
      feather: 0.05,
      radiance: 0.9 * OVERHEAD_WINDOW.radiance,
      core: 0.035,
      coreRadiance: SHOJI_RADIANCE,
      haloLevel: 0.1,
      haloScale: 0.4,
    },
  ] satisfies readonly RoomLight[],
  glossBounce: { ceiling: 0.62, litWall: 0.56, walls: 0.36, floor: 0.08, litWallFade: 0.35 },
  foilBounce: { ceiling: 0.95, litWall: 1.15, walls: 0.62, floor: 0.34, litWallFade: 0 },
  // The ceiling lamp and the marumado stand in for the lamps once here ahead and behind the viewer.
  lamps: [
    [32, 60, 0.14],
    [-30, 62, 0.14],
    [150, 10, 0.15],
    [40, 30, 0.13],
    [180, 18, 0.13],
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
 * from the screen's center. The eye and room are placed for the attitude the viewer is centered on,
 * then carried into the device's axes by the pose's turn, so they hold still in the world.
 */
export function roomFrame(pose: DevicePose = currentLight()) {
  const turn = pose.turn ?? IDENTITY;
  const a = pose.screenAngle * RAD;
  const toScreen = (v: Vec3): Vec3 => [
    v[0] * Math.cos(a) - v[1] * Math.sin(a),
    v[0] * Math.sin(a) + v[1] * Math.cos(a),
    v[2],
  ];
  const toDevice = (v: Vec3): Vec3 => [
    v[0] * Math.cos(a) + v[1] * Math.sin(a),
    -v[0] * Math.sin(a) + v[1] * Math.cos(a),
    v[2],
  ];
  const up: Vec3 = toScreen(rotate(inverse(turn), toDevice(upOnScreen(pose))));
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
  // The shoji squared to the view: rails along the level line and bars along the screen's own down
  // across that line, each seen on the plane across the light, then split evenly to a right angle,
  // so at the still pose the rails read level and the bars plumb in the mirror.
  const onShoji = (v: Vec3) => unit(add(v, scale(light, -dot(v, light))));
  const rails = onShoji(scale(left, -1));
  const bars = onShoji(cross(scale(left, -1), [0, 0, 1]));
  const skew = dot(rails, bars);
  const split = Math.abs(skew) > 1e-9 ? (1 - Math.sqrt(1 - skew * skew)) / skew : 0;
  const across = unit(add(rails, scale(bars, -split)));
  const down = unit(add(bars, scale(rails, -split)));
  const ahead = scale(h, -1);
  const lamps = ROOM.lamps.map(([azimuth, elevation, power]) => ({
    direction: toward(ahead, left, up, azimuth, elevation),
    power,
  }));
  const lights = ROOM.lights.map((source) => ({
    ...source,
    direction: toward(ahead, left, up, source.azimuth, source.elevation),
  }));
  // Carried into the device's axes now, with y turned down for the shader.
  const flip = (v: Vec3): Vec3 => {
    const [x, y, z] = toScreen(rotate(turn, toDevice(v)));
    return [x, -y, z];
  };
  return {
    up: flip(up),
    toward: flip(h),
    light: flip(light),
    across: flip(across),
    down: flip(down),
    eye: scale(flip(eye), ROOM.eyeDistance),
    lamps: lamps.map((lamp) => ({ ...lamp, direction: flip(lamp.direction) })),
    lights: lights.map((source) => ({ ...source, direction: flip(source.direction) })),
  };
}

export type RoomFrame = ReturnType<typeof roomFrame>;

const shojiSources = createFoilSourceSamples({
  window: ROOM.shoji,
  level: 1,
  grid: 3,
  lamps: [],
});

/**
 * A round light's power, its solid angle times radiance for the body and the core. The halo is the
 * room it lights, which the bounce already holds.
 */
export const lightPower = ({ radius, radiance, core, coreRadiance }: RoomLight) =>
  2 * Math.PI * (1 - Math.cos(radius)) * radiance + 2 * Math.PI * core * core * coreRadiance;

/**
 * The foil's sources in screen axes: the shoji's quadrature, laid out around the light, then the
 * round lights, then the room's lamps. Foil sees every source at the share of gloss's radiance it
 * sees the shoji at.
 */
export function roomFoilSources(frame: RoomFrame) {
  const out = new Float32Array(64);
  for (let i = 0; i < 36; i += 4) {
    const [x, y, z, w] = shojiSources.subarray(i, i + 4);
    for (let c = 0; c < 3; c++)
      out[i + c] = x * frame.across[c] + y * frame.down[c] + z * frame.light[c];
    out[i + 3] = w;
  }
  const foilShare = FOIL_ROOM.window.radiance / ROOM.shoji.radiance;
  const points = [
    ...frame.lights.map((source) => ({ ...source, power: foilShare * lightPower(source) })),
    ...frame.lamps,
  ];
  if (9 + points.length > 16)
    throw new Error(`The shoji and ${points.length} lights exceed foil's sixteen sources`);
  points.forEach(({ direction, power }, k) => out.set([...direction, power], 36 + 4 * k));
  return out;
}
