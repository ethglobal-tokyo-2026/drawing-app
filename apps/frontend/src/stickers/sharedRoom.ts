import { createFoilDiscSamples } from "./foilMaterial";
import { currentLight, type DevicePose } from "./light";
import { IDENTITY, inverse, rotate, upOnScreen } from "./lightMode";
import { LIGHT_ASPECT, LIGHT_AZIMUTH, LIGHT_ELEVATION, LIGHT_RADIUS } from "./roomGeometry";
import { VIEWING, VIEWING_CLASS } from "./viewing";

/** One room fixed in the world, seen from one eye that stays put while the hand turns the device. */

const RAD = Math.PI / 180;

/**
 * The room. The eye's distance in CSS px for the device's class, and its elevation above the bottom
 * edge once the device lies flat. Its one light, the ceiling light roomGeometry.ts hangs: its
 * elevation and its azimuth to the viewer's left of straight behind, in degrees; its radius on the
 * plane one unit along it, and its aspect, the level disc's foreshortened height against its width;
 * and its rim's logistic blur, a diffuser's crisp edge, which every coat's lobe widens. Its radiance
 * follows the exposure, and the room's bounce is roomLight.json's solve: both are in roomIrradiance.ts.
 */
export const ROOM = {
  eyeDistance: VIEWING[VIEWING_CLASS].eyeDistance,
  flatEyeElevation: 55,
  light: {
    elevation: LIGHT_ELEVATION,
    azimuth: LIGHT_AZIMUTH,
    radius: LIGHT_RADIUS,
    aspect: LIGHT_ASPECT,
    feather: Math.tan(0.5 * RAD),
  },
} as const;

type Vec3 = [number, number, number];
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
 * viewer, the ceiling light's direction and its plane's across (level, to the viewer's right) and down
 * (the plumb line seen on the plane) axes, and the eye in CSS px from the screen's center. The eye and
 * room are placed for the attitude the viewer is centered on, then carried into the device's axes by
 * the pose's turn, so they hold still in the world.
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
  // The light's plane held in the world: the level disc keeps its width across and foreshortens down.
  const across = unit(cross(up, light));
  const down = unit(add(scale(up, -1), scale(light, dot(up, light))));
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
  };
}

export type RoomFrame = ReturnType<typeof roomFrame>;

const lightSources = createFoilDiscSamples(ROOM.light);

/** The foil's sources in screen axes: the ceiling light's quadrature over its ellipse, laid out around the light. */
export function roomFoilSources(frame: RoomFrame) {
  const out = new Float32Array(64);
  for (let i = 0; i < out.length; i += 4) {
    const [x, y, z, w] = lightSources.subarray(i, i + 4);
    for (let c = 0; c < 3; c++)
      out[i + c] = x * frame.across[c] + y * frame.down[c] + z * frame.light[c];
    out[i + 3] = w;
  }
  return out;
}
