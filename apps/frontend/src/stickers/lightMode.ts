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

/** DeviceOrientation beta and gamma in degrees, and the screen orientation angle they were read at. */
export interface DevicePose {
  beta: number;
  gamma: number;
  screenAngle: number;
}

/**
 * The usual reading angle, which the light assumes without tilt. Its screen angle of 0 makes the
 * device's axes the screen's, so it reads the same whichever way the screen is turned.
 */
export const STILL_POSE: DevicePose = { beta: 55, gamma: 0, screenAngle: 0 };

const RAD = Math.PI / 180;
const clamp11 = (v: number) => Math.max(-1, Math.min(1, v));

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
  return {
    beta: STILL_POSE.beta + 8 * Math.sin(2 * angle),
    gamma: 10 * Math.sin(angle),
    screenAngle: 0,
  };
}

/** Qualification may tune this shared period; every presentation consumes the same phase. */
export const FALLBACK_PERIOD_MS = 14000;
