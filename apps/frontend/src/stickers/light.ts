import { useEffect } from "react";
import { isPerformanceRecorderOn, notePerformance } from "../performance/performanceRecorder";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { deviceForLight } from "../ui/deviceForLight";
import { getMotionPermission, subscribeMotionPermission } from "../ui/motionPermission";
import {
  angleBetween,
  attitudeOf,
  fallbackPose,
  FALLBACK_PERIOD_MS,
  IDENTITY,
  inverse,
  lightMode,
  multiply,
  poseOf,
  readAt,
  rotate,
  rotationInputForLight,
  slerp,
  STILL_POSE,
  upOnScreen,
  withGravity,
  type DevicePose,
  type LightMode,
  type Quaternion,
  type RotationInput,
} from "./lightMode";
import { screenAngleOf } from "./screenAngle";

export type { DevicePose } from "./lightMode";

/**
 * The app's one light: the device's attitude, where the browser shares the tilt, seen by a viewer
 * and a room that hold still in the world while the hand turns the device. Without it the light
 * holds the still pose, or where the tilt last left it; an eligible no-rotation desktop sweeps the
 * one shared fallback around the still pose. Mouse, pen and finger interactions never move it. It
 * listens only while a visible screen with stickers holds it.
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

/** A turn smaller than this, in degrees, isn't written, so the hand's tremor keeps still. */
export const STEP_DEGREES = 0.5;
/** The tilt's light glides toward where the phone points, most of the way in this long, so it never jumps. */
export const GLIDE_MS = 160;
/**
 * The viewer re-centers on the device, since people shift in their seats. Turns up to the release,
 * in degrees from the attitude the viewer is centered on, are left alone: playful and held tilts
 * stay inside it. Past it, the viewer glides toward the device, the rest of the way falling to 1/e
 * every RECENTER_MS, moving or held, and lands on it, so a settled viewer's turn never depends on
 * the poses that came before.
 */
export const RECENTER_RELEASE = 25;
export const RECENTER_MS = 2000;

/** The installed light: its listeners, on while any screen with stickers holds the light. */
let light: { on: () => void; off: () => void } | null = null;
let holders = 0;

/** Held material state and observed capability survive a controller reinstall in the same document. */
const documentLights = new WeakMap<
  Document,
  {
    pose: DevicePose;
    /** The device's attitude as last written, and the one the viewer is centered on. */
    attitude: { lit: Quaternion; rest: Quaternion; recentering: boolean } | null;
    fromSensor: boolean;
    seenRotation: boolean;
    fallbackPhase: number;
  }
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
    attitude: null,
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
  /**
   * The device's attitude where the light was last written and where the tilt last pointed it, the
   * reading that pointed it, and the attitude the viewer is centered on and where it is settling.
   */
  let lit: Quaternion = kept.attitude?.lit ?? IDENTITY;
  let target = lit;
  let aimed: DevicePose = { ...kept.pose };
  let rest: Quaternion = kept.attitude?.rest ?? IDENTITY;
  let restAim = rest;
  let recentering = kept.attitude?.recentering ?? false;
  /** The viewer's attitude as last published, and whether the listener has restarted since a reading. */
  let shownRest = rest;
  let restarted = false;
  let frame = 0;
  let lastFrame = win.performance.now();

  /**
   * Glides the viewer toward the device once it has turned past the release, and lands it there.
   * The release is measured from where the device points, not where the light has glided to, so the
   * first reading's glide never trips it.
   */
  const recenter = (since: number) => {
    if (angleBetween(restAim, target) > RECENTER_RELEASE) recentering = true;
    if (!recentering) return;
    const next = slerp(restAim, target, 1 - Math.exp(-since / RECENTER_MS));
    restAim = angleBetween(next, target) < STEP_DEGREES ? target : next;
    if (restAim === target) recentering = false;
  };
  /** Keeps a pending re-centering gliding while the light itself holds still. */
  const continueRecentering = () => {
    if (!recentering || frame) return;
    lastFrame = win.performance.now();
    frame = win.requestAnimationFrame(write);
  };
  const publish = (pose: DevicePose) => {
    publishedPose = pose;
    kept.pose = pose;
    // The coating and foil share each display frame's already-smoothed pose.
    for (const listener of subscribers) listener(currentLight());
  };

  const write = (now: number) => {
    frame = 0;
    if (mode === "still" || !installed) return;
    // A frame's time can precede the reading that asked for it; that frame glides nowhere.
    const since = Math.max(0, now - lastFrame);
    lastFrame = now;
    if (mode === "fallback-wave") {
      fallbackPublished = (fallbackElapsed + now - fallbackStarted) % FALLBACK_PERIOD_MS;
      kept.fallbackPhase = fallbackPublished;
      publish(fallbackPose(fallbackPublished / FALLBACK_PERIOD_MS));
      frame = win.requestAnimationFrame(write);
    } else {
      // A low-pass on the attitude, by the time since the last write; close enough, it lands.
      const k = 1 - Math.exp(-since / GLIDE_MS);
      const before = lit;
      const next = slerp(lit, target, k);
      lit = angleBetween(next, target) < STEP_DEGREES / 2 ? target : next;
      recenter(since);
      const nextRest = slerp(rest, restAim, k);
      rest = angleBetween(nextRest, restAim) < STEP_DEGREES / 2 ? restAim : nextRest;
      kept.attitude = { lit, rest, recentering };
      const settled = lit === target && rest === restAim && !recentering;
      // Re-centering alone redraws every sticker only in steps the size of the tremor the light
      // ignores, and once more where it lands.
      const restMoved =
        rest !== shownRest && (settled || angleBetween(rest, shownRest) >= STEP_DEGREES / 2);
      if (lit !== before || restMoved) {
        shownRest = rest;
        publish({
          ...(lit === target ? aimed : poseOf(lit, aimed)),
          turn: multiply(inverse(lit), rest),
        });
      }
      if (!settled) frame = win.requestAnimationFrame(write);
    }
  };

  const aim = (reading: DevicePose, alpha: number | null) => {
    if (mode !== "device-tilt") return;
    const up = upOnScreen({ beta: reading.beta, gamma: reading.gamma, screenAngle: 0 });
    // Without alpha, each change in gravity is the smallest turn that explains it.
    const attitude =
      alpha === null ? withGravity(target, up) : attitudeOf(alpha, reading.beta, reading.gamma);
    // The still pose and the fallback are in the screen's own axes: the first reading glides from
    // where their light shows, whichever way the screen is turned.
    const first = !kept.fromSensor;
    if (first) {
      aimed = readAt(publishedPose, reading.screenAngle);
      lit = target = withGravity(attitude, upOnScreen({ ...aimed, screenAngle: 0 }));
      rest = restAim = shownRest = lit;
      recentering = false;
      kept.attitude = { lit, rest, recentering };
      kept.fromSensor = true;
    } else if (restarted && alpha !== null) {
      // iOS counts alpha from wherever its sensor started, so a restarted listener's heading is
      // arbitrary: turn the world about vertical so the device keeps the heading it was lit at.
      const c = multiply(withGravity(attitude, rotate(inverse(lit), [0, 0, 1])), inverse(lit));
      const turned = (q: Quaternion) => multiply(c, q);
      const landed = target === lit;
      const settled = restAim === rest;
      lit = turned(lit);
      target = landed ? lit : turned(target);
      rest = turned(rest);
      restAim = settled ? rest : turned(restAim);
      shownRest = turned(shownRest);
      kept.attitude = { lit, rest, recentering };
      notePerformance(
        "orientation",
        `heading kept across a restarted listener: alpha moved ${angleBetween(c, IDENTITY).toFixed(1)}°`,
      );
    }
    restarted = false;
    if (reading.screenAngle === aimed.screenAngle && angleBetween(attitude, lit) < STEP_DEGREES) {
      if (target !== lit) aimed = poseOf(lit, aimed);
      target = lit;
      continueRecentering();
      return;
    }
    target = attitude;
    aimed = reading;
    // The viewer is centered on the first reading, and glides there with the light.
    if (first) restAim = attitude;
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
    target = lit;
    restAim = rest;
    aimed = { ...publishedPose };
    lastFrame = win.performance.now();
  };

  const refresh = () => {
    const active = installed && holders > 0 && doc.visibilityState === "visible";
    if (active && !listening) {
      win.addEventListener("deviceorientation", fromTilt, { passive: true });
      listening = true;
      restarted = true;
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
    if (mode === "device-tilt") continueRecentering();
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
    const alpha = e.alpha !== null && Number.isFinite(e.alpha) ? e.alpha : null;
    // The browser's own values beside the angle read from them, so a device's report shows which it gave.
    if (isPerformanceRecorderOn())
      notePerformance(
        "orientation",
        `alpha=${alpha}, beta=${e.beta}, gamma=${e.gamma}, screen=${screenAngle}; window.orientation=${String(Reflect.get(win, "orientation"))}, screen.orientation=${win.screen.orientation?.type} ${win.screen.orientation?.angle}`,
      );
    aim({ beta: e.beta, gamma: e.gamma, screenAngle }, alpha);
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
