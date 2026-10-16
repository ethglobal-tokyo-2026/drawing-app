import { createFoilSourceSamples } from "./foilMaterial";
import { currentLight, type DevicePose } from "./light";
import { IDENTITY, inverse, rotate, STILL_POSE, upOnScreen } from "./lightMode";
import { OVERHEAD_WINDOW } from "./overheadWindow";

/** One room fixed in the world, seen from one eye that stays put while the hand turns the device. */

/** A room lamp: azimuth from straight ahead (beyond the device) toward the viewer's left, elevation, power. */
type RoomLamp = readonly [azimuth: number, elevation: number, power: number];

/**
 * The room. The eye's distance in CSS px (an unverified guess for about 32 cm), and its elevation
 * above the bottom edge once the device lies flat. Its one light, a round, soft ceiling light above
 * and behind the viewer: its elevation above the still pose's screen normal, so only a band of tilts
 * mirrors it, as a real one does, and its azimuth to the viewer's left, in degrees; its radius on the
 * plane one unit along it, and its edge blur, a logistic scale every coat's lobe widens; its halo, the
 * ceiling it lights, the coat's haze and the eye's veiling glare, as the disc blurred at a wide
 * logistic scale, at a level against its body; and its radiance. The bounce off the ceiling, the
 * wall beyond the device, the other walls and the floor, which gloss and foil each mirror, and how far
 * the lit wall fades toward the ceiling: gloss's is the fill a real room gives under one light, its
 * floor lit as its walls are. Lamps at fixed points in the room, which only foil's diffraction sees.
 */
export const ROOM = {
  eyeDistance: 1900,
  flatEyeElevation: 55,
  light: {
    elevation: 90 - STILL_POSE.beta + 17,
    azimuth: 6,
    radius: 0.19,
    feather: 0.045,
    haloLevel: 0.12,
    haloScale: 0.12,
    radiance: 1.5 * OVERHEAD_WINDOW.radiance,
  },
  glossBounce: { ceiling: 0.124, litWall: 0.112, walls: 0.072, floor: 0.072, litWallFade: 0.35 },
  foilBounce: { ceiling: 0.95, litWall: 1.15, walls: 0.62, floor: 0.34, litWallFade: 0 },
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
 * viewer, the ceiling light's direction and its plane's across (viewer's right) and down axes, and the
 * eye in CSS px from the screen's center. The eye and room are placed for the attitude the viewer is
 * centered on, then carried into the device's axes by the pose's turn, so they hold still in the world.
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
  const light = toward(h, left, up, ROOM.light.azimuth, ROOM.light.elevation);
  // The light's plane squared to the view, where foil places its panels and samples: across along the
  // level line and down along the screen's own down across that line, each seen on the plane, then
  // split evenly to a right angle, so at the still pose across reads level and down plumb in the mirror.
  const onPlane = (v: Vec3) => unit(add(v, scale(light, -dot(v, light))));
  const levelAxis = onPlane(scale(left, -1));
  const plumbAxis = onPlane(cross(scale(left, -1), [0, 0, 1]));
  const skew = dot(levelAxis, plumbAxis);
  const split = Math.abs(skew) > 1e-9 ? (1 - Math.sqrt(1 - skew * skew)) / skew : 0;
  const across = unit(add(levelAxis, scale(plumbAxis, -split)));
  const down = unit(add(plumbAxis, scale(levelAxis, -split)));
  const ahead = scale(h, -1);
  const lamps = ROOM.lamps.map(([azimuth, elevation, power]) => ({
    direction: toward(ahead, left, up, azimuth, elevation),
    power,
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
  };
}

export type RoomFrame = ReturnType<typeof roomFrame>;

// Foil's quadrature takes the ceiling light as a square of the disc's area, at its middle.
const lightHalfSide = (ROOM.light.radius * Math.sqrt(Math.PI)) / 2;
const lightSources = createFoilSourceSamples({
  window: {
    x: 0,
    y: 0,
    halfWidth: lightHalfSide,
    halfHeight: lightHalfSide,
    feather: ROOM.light.feather,
    radiance: ROOM.light.radiance,
  },
  level: 1,
  grid: 3,
  lamps: [],
});

/**
 * The foil's sources in screen axes: the ceiling light's quadrature, laid out around the light, then
 * the room's lamps.
 */
export function roomFoilSources(frame: RoomFrame) {
  const out = new Float32Array(64);
  for (let i = 0; i < 36; i += 4) {
    const [x, y, z, w] = lightSources.subarray(i, i + 4);
    for (let c = 0; c < 3; c++)
      out[i + c] = x * frame.across[c] + y * frame.down[c] + z * frame.light[c];
    out[i + 3] = w;
  }
  if (9 + frame.lamps.length > 16)
    throw new Error(
      `The ceiling light and ${frame.lamps.length} lamps exceed foil's sixteen sources`,
    );
  frame.lamps.forEach(({ direction, power }, k) => out.set([...direction, power], 36 + 4 * k));
  return out;
}
