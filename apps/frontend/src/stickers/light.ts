import { useEffect } from "react";
import { isPerformanceRecorderOn, notePerformance } from "../performance/performanceRecorder";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { deviceForLight } from "../ui/deviceForLight";
import { getMotionPermission, subscribeMotionPermission } from "../ui/motionPermission";
import {
  fallbackPose,
  FALLBACK_PERIOD_MS,
  lightMode,
  nearestAngles,
  readAt,
  rotationInputForLight,
  STILL_POSE,
  type DevicePose,
  type LightMode,
  type RotationInput,
} from "./lightMode";
import { screenAngleOf } from "./screenAngle";

export type { DevicePose } from "./lightMode";

/**
 * The app's one light: the device's pose against gravity, which orients the shared room, where the
 * browser shares the tilt. Without it the light holds the still pose, or where the tilt last left
 * it; an eligible no-rotation desktop sweeps the one shared fallback around the still pose. Mouse,
 * pen and finger interactions never move it. It listens only while a visible screen with stickers
 * holds it.
 */
let publishedPose: DevicePose = { ...STILL_POSE };
const subscribers = new Set<(pose: DevicePose) => void>();
/** The held pose, or the still pose before the first published input. */
export const currentLight = (): DevicePose => ({ ...publishedPose });
/** The shared material renderer receives only published writes; new material reads currentLight. */
export function subscribeLight(listener: (pose: DevicePose) => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** A move smaller than this, in degrees, isn't written, so the hand's tremor keeps still. */
const STEP_DEGREES = 0.5;
/** The tilt's light glides toward where the phone points, most of the way in this long, so it never jumps. */
export const GLIDE_MS = 160;

/** The installed light: its listeners, on while any screen with stickers holds the light. */
let light: { on: () => void; off: () => void } | null = null;
let holders = 0;

/** Held material state and observed capability survive a controller reinstall in the same document. */
const documentLights = new WeakMap<
  Document,
  { pose: DevicePose; fromSensor: boolean; seenRotation: boolean; fallbackPhase: number }
>();

/** Policy absence is unknown: only explicit accelerometer and gyroscope allowance qualifies. */
function sensorPolicy(doc: Document): "allowed" | "blocked" | "unknown" {
  const policy: unknown =
    Reflect.get(doc, "permissionsPolicy") ?? Reflect.get(doc, "featurePolicy");
  if (!policy || typeof policy !== "object" || !("allowsFeature" in policy)) return "unknown";
  const allows = policy.allowsFeature;
  if (typeof allows !== "function") return "unknown";
  try {
    return Reflect.apply(allows, policy, ["accelerometer"]) === true &&
      Reflect.apply(allows, policy, ["gyroscope"]) === true
      ? "allowed"
      : "blocked";
  } catch (error) {
    // A failed policy check cannot establish no rotation; retain static material and surface the failure.
    console.error("Checking sticker rotation policy failed; material light stays static", error);
    return "unknown";
  }
}

/** Starts the light; returns what stops it. */
export function installLight(root: HTMLElement, win: typeof window = window): () => void {
  const doc = root.ownerDocument;
  const kept = documentLights.get(doc) ?? {
    pose: { ...STILL_POSE },
    fromSensor: false,
    seenRotation: false,
    fallbackPhase: 0,
  };
  documentLights.set(doc, kept);
  publishedPose = kept.pose;
  const reduced = win.matchMedia(REDUCED_MOTION);
  const device = deviceForLight(win.navigator);
  const orientation: unknown = Reflect.get(win, "DeviceOrientationEvent");
  let rotation: RotationInput = rotationInputForLight({
    device,
    secureContext: win.isSecureContext,
    orientationApi:
      typeof orientation === "function"
        ? "present"
        : orientation === undefined
          ? "absent"
          : "unknown",
    sensorPolicy: sensorPolicy(doc),
  });
  let hasUsableReading = kept.seenRotation;
  let mode: LightMode = "still";
  let installed = true;
  let listening = false;
  let fallbackElapsed = kept.fallbackPhase;
  let fallbackStarted = 0;
  let fallbackPublished = kept.fallbackPhase;
  /** Where the light was last written, and where the tilt last pointed it. */
  let lit: DevicePose = { ...kept.pose };
  let target: DevicePose = { ...lit };
  let frame = 0;
  let lastFrame = win.performance.now();

  const write = (now: number) => {
    frame = 0;
    if (mode === "still" || !installed) return;
    // A frame's time can precede the reading that asked for it; that frame glides nowhere.
    const since = Math.max(0, now - lastFrame);
    lastFrame = now;
    if (mode === "fallback-wave") {
      fallbackPublished = (fallbackElapsed + now - fallbackStarted) % FALLBACK_PERIOD_MS;
      kept.fallbackPhase = fallbackPublished;
      lit = fallbackPose(fallbackPublished / FALLBACK_PERIOD_MS);
    } else {
      // A low-pass on the tilt, by the time since the last write; close enough, it lands.
      const k = 1 - Math.exp(-since / GLIDE_MS);
      const next = {
        beta: lit.beta + (target.beta - lit.beta) * k,
        gamma: lit.gamma + (target.gamma - lit.gamma) * k,
        screenAngle: target.screenAngle,
      };
      const near =
        Math.abs(target.beta - next.beta) < STEP_DEGREES / 2 &&
        Math.abs(target.gamma - next.gamma) < STEP_DEGREES / 2;
      lit = near ? { ...target } : next;
    }
    publishedPose = { ...lit };
    kept.pose = publishedPose;
    // The coating and foil share each display frame's already-smoothed pose.
    for (const listener of subscribers) listener(currentLight());
    if (mode === "fallback-wave" || lit.beta !== target.beta || lit.gamma !== target.gamma)
      frame = win.requestAnimationFrame(write);
  };

  const aim = (reading: DevicePose) => {
    if (mode !== "device-tilt") return;
    // The still pose and the fallback are in the screen's own axes: the first reading glides from
    // where their light shows, whichever way the screen is turned.
    if (!kept.fromSensor) {
      lit = readAt(lit, reading.screenAngle);
      kept.pose = lit;
      kept.fromSensor = true;
    }
    target = nearestAngles(lit, reading);
    if (
      target.screenAngle === lit.screenAngle &&
      Math.abs(target.beta - lit.beta) < STEP_DEGREES &&
      Math.abs(target.gamma - lit.gamma) < STEP_DEGREES
    ) {
      target = { ...lit };
      return;
    }
    if (!frame) {
      // Time spent holding a pose is not interpolation time toward a newly received target.
      lastFrame = win.performance.now();
      frame = win.requestAnimationFrame(write);
    }
  };

  const pause = () => {
    win.cancelAnimationFrame(frame);
    frame = 0;
    if (mode === "fallback-wave") fallbackElapsed = fallbackPublished;
    // Drop an unfinished target: the light holds where it was last written.
    target = { ...lit };
    lastFrame = win.performance.now();
  };

  const refresh = () => {
    const active = installed && holders > 0 && doc.visibilityState === "visible";
    if (active && !listening) {
      win.addEventListener("deviceorientation", fromTilt, { passive: true });
      listening = true;
    } else if (!active && listening) {
      win.removeEventListener("deviceorientation", fromTilt);
      listening = false;
    }
    const next = lightMode({
      device,
      rotation,
      hasUsableReading,
      permission: getMotionPermission(),
      reducedMotion: reduced.matches,
      visible: active,
      holders,
    });
    if (next === mode) {
      if (next === "still") pause();
      return;
    }
    pause();
    mode = next;
    if (mode === "fallback-wave") {
      fallbackStarted = win.performance.now();
      lastFrame = win.performance.now();
      frame = win.requestAnimationFrame(write);
    }
  };

  const fromTilt = (e: DeviceOrientationEvent) => {
    if (
      e.gamma === null ||
      e.beta === null ||
      !Number.isFinite(e.gamma) ||
      !Number.isFinite(e.beta)
    )
      return;
    hasUsableReading = true;
    kept.seenRotation = true;
    rotation = "usable";
    refresh();
    const screenAngle = screenAngleOf(win, e.beta, e.gamma);
    // The browser's own values beside the angle read from them, so a device's report shows which it gave.
    if (isPerformanceRecorderOn())
      notePerformance(
        "orientation",
        `beta=${e.beta}, gamma=${e.gamma}, screen=${screenAngle}; window.orientation=${String(Reflect.get(win, "orientation"))}, screen.orientation=${win.screen.orientation?.type} ${win.screen.orientation?.angle}`,
      );
    aim({ beta: e.beta, gamma: e.gamma, screenAngle });
  };

  // The light never asks for the tilt: where a browser wants permission first (iOS), no tilt
  // arrives until something else has asked, and on a phone the light rests until then.
  const own = {
    on: refresh,
    off: refresh,
  };
  light = own;
  if (holders > 0) own.on();
  reduced.addEventListener("change", refresh);
  doc.addEventListener("visibilitychange", refresh);
  const unsubscribePermission = subscribeMotionPermission(refresh);
  return () => {
    installed = false;
    refresh();
    pause();
    if (light === own) light = null;
    reduced.removeEventListener("change", refresh);
    doc.removeEventListener("visibilitychange", refresh);
    unsubscribePermission();
  };
}

/** Holds the light for a screen with stickers; returns what releases it. */
export function acquireLight(): () => void {
  if (holders++ === 0) light?.on();
  return () => {
    if (--holders === 0) light?.off();
  };
}

/** Holds the light while the calling screen shows its stickers. */
export function useLight(showing = true) {
  useEffect(() => (showing ? acquireLight() : undefined), [showing]);
}
