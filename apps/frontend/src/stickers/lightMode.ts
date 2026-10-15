import type { DeviceForLight } from "../ui/deviceForLight";
import type { MotionPermission } from "../ui/motionPermission";

export type RotationInput = "unknown" | "usable" | "unavailable";
export type LightMode = "still" | "device-tilt" | "fallback-wave";

export interface LightInputs {
  device: DeviceForLight;
  rotation: RotationInput;
  permission: MotionPermission;
  hasUsableReading: boolean;
  reducedMotion: boolean;
  visible: boolean;
  holders: number;
}

export interface RotationFactsForLight {
  device: DeviceForLight;
  secureContext: boolean | undefined;
  orientationApi: "present" | "absent" | "unknown";
  sensorPolicy: "allowed" | "blocked" | "unknown";
}

/** Permission and inactivity freeze the published pose; silence never establishes missing hardware. */
export function lightMode(inputs: LightInputs): LightMode {
  if (
    !inputs.visible ||
    inputs.holders <= 0 ||
    inputs.reducedMotion ||
    inputs.permission === "denied"
  )
    return "still";
  if (inputs.rotation === "usable" || inputs.hasUsableReading) return "device-tilt";
  if (inputs.permission === "unasked") return "still";
  return inputs.device === "desktop" && inputs.rotation === "unavailable"
    ? "fallback-wave"
    : "still";
}

/** An absent interface only qualifies a known desktop in an explicitly allowed secure context. */
export function rotationInputForLight(facts: RotationFactsForLight): RotationInput {
  return facts.device === "desktop" &&
    facts.secureContext === true &&
    facts.orientationApi === "absent" &&
    facts.sensorPolicy === "allowed"
    ? "unavailable"
    : "unknown";
}

/** A rotation as a unit quaternion, [w, x, y, z]. */
export type Quaternion = readonly [number, number, number, number];
type Vec3 = [number, number, number];

/**
 * DeviceOrientation beta and gamma in degrees, and the screen orientation angle they were read at.
 * `turn` is how far the device has turned since the attitude the viewer is centered on: it carries
 * vectors from that attitude's device axes into the device's axes now. Without it the viewer is
 * centered on the device as it is.
 */
export interface DevicePose {
  beta: number;
  gamma: number;
  screenAngle: number;
  turn?: Quaternion;
}

/**
 * The usual reading angle, the screen leaned back about halfway from upright toward flat, which the
 * light assumes without tilt.
 * Its screen angle of 0 makes the device's axes the screen's, so it reads the same whichever way the
 * screen is turned.
 */
export const STILL_POSE: DevicePose = { beta: 47, gamma: 0, screenAngle: 0 };

const RAD = Math.PI / 180;
const clamp11 = (v: number) => Math.max(-1, Math.min(1, v));

export const IDENTITY: Quaternion = [1, 0, 0, 0];
const about = (axis: 0 | 1 | 2, degrees: number): Quaternion => {
  const half = (degrees * RAD) / 2;
  const q: [number, number, number, number] = [Math.cos(half), 0, 0, 0];
  q[axis + 1] = Math.sin(half);
  return q;
};
export const multiply = (a: Quaternion, b: Quaternion): Quaternion => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
export const inverse = (q: Quaternion): Quaternion => [q[0], -q[1], -q[2], -q[3]];
/** `v` turned by `q`. */
export function rotate(q: Quaternion, v: readonly number[]): Vec3 {
  const [, x, y, z] = multiply(multiply(q, [0, v[0], v[1], v[2]]), inverse(q));
  return [x, y, z];
}
/** The angle, in degrees, of the turn from `a` to `b`. */
export const angleBetween = (a: Quaternion, b: Quaternion) =>
  (2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])))) /
  RAD;
/** The turn `t` of the way from `a` to `b`, the short way round. */
export function slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
  const raw = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = raw < 0 ? -1 : 1;
  const angle = Math.acos(Math.min(1, raw * sign));
  const [ka, kb] =
    angle < 1e-6
      ? [1 - t, t]
      : [Math.sin((1 - t) * angle) / Math.sin(angle), Math.sin(t * angle) / Math.sin(angle)];
  const q = a.map((v, i) => ka * v + kb * sign * b[i]);
  const length = Math.hypot(...q);
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}
/** The smallest turn that carries the unit vector `from` onto `to`. */
function arc(from: readonly number[], to: readonly number[]): Quaternion {
  const d = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  // Opposite vectors: half a turn about any axis square to `from`.
  const axis = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const q =
    d < -1 + 1e-9
      ? [
          0,
          from[1] * axis[2] - from[2] * axis[1],
          from[2] * axis[0] - from[0] * axis[2],
          from[0] * axis[1] - from[1] * axis[0],
        ]
      : [
          1 + d,
          from[1] * to[2] - from[2] * to[1],
          from[2] * to[0] - from[0] * to[2],
          from[0] * to[1] - from[1] * to[0],
        ];
  const length = Math.hypot(...q);
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/**
 * DeviceOrientation's attitude, from the device's axes to the earth's: Rz(alpha)·Rx(beta)·Ry(gamma).
 * iOS counts alpha from wherever it started, which is enough: only changes in it matter.
 */
export const attitudeOf = (alpha: number, beta: number, gamma: number): Quaternion =>
  multiply(multiply(about(2, alpha), about(0, beta)), about(1, gamma));

/** `attitude` turned the smallest way that makes gravity's up read `up` in the device's axes. */
export function withGravity(attitude: Quaternion, up: readonly number[]): Quaternion {
  return multiply(attitude, arc(up, rotate(inverse(attitude), [0, 0, 1])));
}

/** Gravity's up at `attitude`, as the beta and gamma nearest `near`'s, read at `near`'s screen angle. */
export function poseOf(attitude: Quaternion, near: DevicePose): DevicePose {
  const [x, y, z] = rotate(inverse(attitude), [0, 0, 1]);
  const { beta, gamma } = nearestAngles(near, {
    beta: Math.asin(clamp11(y)) / RAD,
    gamma: Math.atan2(-x, z) / RAD,
    screenAngle: near.screenAngle,
  });
  return { beta, gamma, screenAngle: near.screenAngle };
}

/** Gravity's up in the screen's axes: x right, y toward the top, z out of the screen. */
export function upOnScreen({ beta, gamma, screenAngle }: DevicePose): [number, number, number] {
  const b = beta * RAD,
    g = gamma * RAD,
    a = screenAngle * RAD;
  const x = -Math.cos(b) * Math.sin(g),
    y = Math.sin(b);
  return [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a),
    Math.cos(b) * Math.cos(g),
  ];
}

/** The same up on screen, as a device read at `screenAngle` reports it. */
export function readAt(pose: DevicePose, screenAngle: number): DevicePose {
  const [x, y, z] = upOnScreen(pose);
  const a = screenAngle * RAD;
  const across = x * Math.cos(a) + y * Math.sin(a),
    up = -x * Math.sin(a) + y * Math.cos(a);
  return { beta: Math.asin(clamp11(up)) / RAD, gamma: Math.atan2(-across, z) / RAD, screenAngle };
}

/** `to`'s angles nearest `from`, so a glide between them never takes the long way round. */
export function nearestAngles(from: DevicePose, to: DevicePose): DevicePose {
  const near = (v: number, ref: number) => v + 360 * Math.round((ref - v) / 360);
  const direct = {
    beta: near(to.beta, from.beta),
    gamma: near(to.gamma, from.gamma),
    screenAngle: to.screenAngle,
  };
  // Rolled past sideways, the sensor flips to its other branch, (180° − β, γ + 180°): the same up.
  const flipped = {
    beta: near(180 - to.beta, from.beta),
    gamma: near(to.gamma + 180, from.gamma),
    screenAngle: to.screenAngle,
  };
  const distance = (p: DevicePose) => Math.abs(p.beta - from.beta) + Math.abs(p.gamma - from.gamma);
  return distance(flipped) < distance(direct) ? flipped : direct;
}

const TILT_RANGE = 32;
const ACROSS_RANGE = Math.cos(STILL_POSE.beta * RAD) * Math.sin(TILT_RANGE * RAD);
const easeToEdge = (v: number) => {
  const c = clamp11(v);
  return 1.5 * c - 0.5 * c * c * c;
};
/** A rounding error under a billionth is no lean at all. */
const quiet = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);

/** How far gravity leans the screen from the still pose, across and up, eased from -1 to 1. */
export function screenLean(pose: DevicePose): { x: number; y: number } {
  const [x, y] = upOnScreen(pose);
  return {
    x: easeToEdge(quiet(-x) / ACROSS_RANGE),
    y: easeToEdge(quiet(Math.asin(clamp11(y)) / RAD - STILL_POSE.beta) / TILT_RANGE),
  };
}

/**
 * One virtual reading per cycle: a figure eight through the still pose, so it starts there, with
 * provisional excursions of 8° in beta and 10° in gamma.
 */
export function fallbackPose(phase: number): DevicePose {
  const angle = (phase - Math.floor(phase)) * 2 * Math.PI;
  const beta = STILL_POSE.beta + 8 * Math.sin(2 * angle),
    gamma = 10 * Math.sin(angle);
  // The viewer stays centered on the still pose, so the sweep reads as a sticker tilted before them.
  const turn = multiply(
    inverse(attitudeOf(0, beta, gamma)),
    attitudeOf(0, STILL_POSE.beta, STILL_POSE.gamma),
  );
  return { beta, gamma, screenAngle: 0, turn };
}

/** Qualification may tune this shared period; every presentation consumes the same phase. */
export const FALLBACK_PERIOD_MS = 14000;
