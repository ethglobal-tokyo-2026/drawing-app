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

const RAD = Math.PI / 180;
const TILT_RANGE = 32;
const HELD_BETA = 40;
const ACROSS_RANGE = Math.cos(HELD_BETA * RAD) * Math.sin(TILT_RANGE * RAD);
const clamp11 = (v: number) => Math.max(-1, Math.min(1, v));
const easeToEdge = (v: number) => {
  const c = clamp11(v);
  return 1.5 * c - 0.5 * c * c * c;
};

export interface RotationOrigin {
  alpha: number;
  beta: number;
  gamma: number;
  screenAngle: number;
  pose: { x: number; y: number };
}

/** Device rotations relative to the first reading, before displayed-axis easing or clamping. */
export function relativeTiltPose(
  alpha: number,
  beta: number,
  gamma: number,
  origin: RotationOrigin,
): { x: number; y: number } {
  const a = alpha * RAD,
    b = beta * RAD,
    g = gamma * RAD;
  const a0 = origin.alpha * RAD,
    b0 = origin.beta * RAD,
    g0 = origin.gamma * RAD;
  // DeviceOrientation uses Rz(alpha) * Rx(beta) * Ry(gamma). Transform its surface normal
  // back into the reference device frame; this stays signed on either side of upright.
  const nx = Math.cos(a) * Math.sin(g) + Math.sin(a) * Math.sin(b) * Math.cos(g);
  const ny = Math.sin(a) * Math.sin(g) - Math.cos(a) * Math.sin(b) * Math.cos(g);
  const nz = Math.cos(b) * Math.cos(g);
  const ax = Math.cos(a0) * nx + Math.sin(a0) * ny;
  const ay = -Math.sin(a0) * nx + Math.cos(a0) * ny;
  const by = Math.cos(b0) * ay + Math.sin(b0) * nz;
  const bz = -Math.sin(b0) * ay + Math.cos(b0) * nz;
  const cx = Math.cos(g0) * ax - Math.sin(g0) * bz;
  const cz = Math.sin(g0) * ax + Math.cos(g0) * bz;
  const across = Math.atan2(cx, cz) / RAD;
  const up = Math.atan2(-by, cz) / RAD;
  const angle = origin.screenAngle * RAD;
  const quiet = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
  return {
    x: clamp11(
      origin.pose.x +
        easeToEdge(quiet(across * Math.cos(angle) + up * Math.sin(angle)) / TILT_RANGE),
    ),
    y: clamp11(
      origin.pose.y +
        easeToEdge(quiet(up * Math.cos(angle) - across * Math.sin(angle)) / TILT_RANGE),
    ),
  };
}

/** Rotate device gravity into displayed axes before applying the established reading range. */
export function tiltPose(beta: number, gamma: number, screenAngle = 0): { x: number; y: number } {
  const b = beta * RAD;
  const angle = screenAngle * RAD;
  const gx = Math.cos(b) * Math.sin(gamma * RAD);
  const gy = Math.sin(b);
  const across = gx * Math.cos(angle) + gy * Math.sin(angle);
  const up = gy * Math.cos(angle) - gx * Math.sin(angle);
  const lean = Math.asin(clamp11(up)) / RAD;
  return {
    x: easeToEdge(across / ACROSS_RANGE),
    y: easeToEdge((lean - HELD_BETA) / TILT_RANGE),
  };
}

/** One virtual reading pose per cycle: provisional 12° horizontal and 4° vertical excursions. */
export function fallbackPose(phase: number): { x: number; y: number } {
  const angle = (phase - Math.floor(phase)) * 2 * Math.PI;
  return tiltPose(HELD_BETA + 4 * Math.cos(angle), 12 * Math.sin(angle));
}

/** Qualification may tune this shared period; every presentation consumes the same phase. */
export const FALLBACK_PERIOD_MS = 14000;
