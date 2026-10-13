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
