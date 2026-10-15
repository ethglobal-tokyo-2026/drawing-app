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
import { ROOM } from "./sharedRoom";

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

/**
 * The One Euro filter (Casiez et al.) on the device's attitude, one step per reading: its cutoff rises
 * with the filtered speed, so a still device's sensor noise is smoothed while the hand's tremor and
 * turns pass at once. The minimum cutoff and the speed's own cutoff in Hz, and the cutoff's rise in Hz
 * per °/s of filtered speed.
 */
const MIN_CUTOFF_HZ = 2;
const SPEED_COEFFICIENT = 10;
const SPEED_CUTOFF_HZ = 1;
/** The motion sensor's rate before two readings have measured it: WebKit reads it at 60 Hz. */
const SENSOR_HZ = 60;
/** A reading counts as held once three more were due, and the light lands on it. */
const HELD_MS = 3000 / SENSOR_HZ;
/** The light redraws once its reflection has moved this far, in CSS px. */
const PUBLISH_PX = 0.5;
/** Redraws past this many a second cost the main thread without a visible gain; tremor shows below it. */
export const MAX_PUBLISHES_PER_SECOND = 60;
/**
 * How far the reflection moves, in CSS px at the viewer's eye, for a turn of `degrees`: a mirror
 * turns the reflected ray twice as far.
 */
export const reflectionPx = (degrees: number) =>
  2 * ROOM.eyeDistance * Math.tan((degrees * Math.PI) / 180);
/**
 * The viewer re-centers on the device, since people shift in their seats. Turns up to the release,
 * in degrees from the attitude the viewer is centered on, are left alone: playful and held tilts
 * stay inside it. Past it, the viewer eases onto the device over RECENTER_MS, moving or held, and
 * lands on it, so a settled viewer's turn never depends on the poses that came before.
 */
export const RECENTER_RELEASE = 25;
export const RECENTER_MS = 1000;

const samePose = (a: DevicePose, b: DevicePose) =>
  a.beta === b.beta &&
  a.gamma === b.gamma &&
  a.screenAngle === b.screenAngle &&
  (a.turn ?? IDENTITY).every((v, i) => v === (b.turn ?? IDENTITY)[i]);

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
   * The device's attitude as the filter has it and as the light last showed it, the latest reading's
   * attitude, its pose and when it arrived, and the screen angle the light last showed.
   */
  let lit: Quaternion = kept.attitude?.lit ?? IDENTITY;
  let shownLit = lit;
  let reading = lit;
  let aimed: DevicePose = { ...kept.pose };
  let readingAt = -Infinity;
  let shownScreenAngle = kept.pose.screenAngle;
  /** The attitude the viewer is centered on, as last shown, and the ease that re-centers it. */
  let rest: Quaternion = kept.attitude?.rest ?? IDENTITY;
  let shownRest = rest;
  let recentering = kept.attitude?.recentering ?? false;
  let easeFrom = rest;
  /** When the ease started; unset, it starts from where the viewer is on the next frame. */
  let easeStarted: number | null = null;
  /** The filter's speed in °/s, the readings' rate in Hz, and when it last stepped. */
  let speed = 0;
  let rate = SENSOR_HZ;
  let stepped = -Infinity;
  /** Whether a reading arrived since the last frame, and when the light last published. */
  let freshReading = false;
  let publishedAt = -Infinity;
  /** Whether the listener has restarted since a reading. */
  let restarted = false;
  let frame = 0;

  /** One step of the filter toward `to`, in slerp form, timed by when it arrived. */
  const step = (to: Quaternion, now: number) => {
    // Readings queued behind a busy main thread arrive on the same millisecond: they keep the last rate.
    if (now > stepped) rate = 1000 / (now - stepped);
    stepped = Math.max(stepped, now);
    const smoothing = (cutoff: number) => 1 / (1 + rate / (2 * Math.PI * cutoff));
    speed += smoothing(SPEED_CUTOFF_HZ) * (angleBetween(lit, to) * rate - speed);
    lit = slerp(lit, to, smoothing(MIN_CUTOFF_HZ + SPEED_COEFFICIENT * speed));
  };
  /**
   * Eases the viewer onto the device once the device has turned past the release, and lands it there.
   * The release is measured from the reading, so the first reading, which the filter carries the
   * light to, never trips it.
   */
  const recenter = (now: number) => {
    if (!recentering && angleBetween(rest, reading) > RECENTER_RELEASE) recentering = true;
    if (!recentering) return;
    if (easeStarted === null) {
      easeFrom = rest;
      easeStarted = now;
    }
    const t = Math.max(0, (now - easeStarted) / RECENTER_MS);
    if (t < 1) {
      rest = slerp(easeFrom, lit, t * t * (3 - 2 * t));
      return;
    }
    rest = lit;
    recentering = false;
    easeStarted = null;
  };
  const publish = (pose: DevicePose) => {
    publishedPose = pose;
    kept.pose = pose;
    for (const listener of subscribers) listener(currentLight());
  };

  const write = (now: number) => {
    frame = 0;
    if (mode === "still" || !installed) return;
    if (mode === "fallback-wave") {
      fallbackPublished = (fallbackElapsed + now - fallbackStarted) % FALLBACK_PERIOD_MS;
      kept.fallbackPhase = fallbackPublished;
      publish(fallbackPose(fallbackPublished / FALLBACK_PERIOD_MS));
      frame = win.requestAnimationFrame(write);
      return;
    }
    // A frame without a new reading takes the device to hold where it last read: the filter goes on
    // toward that reading, and lands on it once it is held.
    if (lit !== reading && !freshReading) {
      step(reading, now);
      if (now - readingAt >= HELD_MS && reflectionPx(angleBetween(lit, reading)) < PUBLISH_PX)
        lit = reading;
    }
    freshReading = false;
    recenter(now);
    kept.attitude = { lit, rest, recentering };
    const landed = lit === reading && !recentering;
    const pose = {
      ...(lit === reading ? aimed : poseOf(lit, aimed)),
      turn: multiply(inverse(lit), rest),
    };
    // Each publish redraws every sticker: only once the reflection has visibly moved, or turned
    // with the screen, and once more where the light lands, so a held pose shows its own reading.
    const due =
      aimed.screenAngle !== shownScreenAngle ||
      reflectionPx(angleBetween(lit, shownLit)) >= PUBLISH_PX ||
      reflectionPx(angleBetween(rest, shownRest)) >= PUBLISH_PX ||
      (landed && !samePose(pose, publishedPose));
    // A frame a quarter short of the cap's interval still publishes, so a 60 Hz screen's jittered
    // frames all do while a 120 Hz screen publishes every other frame.
    const capped = now - publishedAt < 750 / MAX_PUBLISHES_PER_SECOND;
    if (due && !capped) {
      shownLit = lit;
      shownRest = rest;
      shownScreenAngle = aimed.screenAngle;
      publishedAt = now;
      publish(pose);
    }
    if (!landed || (due && capped)) frame = win.requestAnimationFrame(write);
  };

  const aim = (pose: DevicePose, alpha: number | null) => {
    if (mode !== "device-tilt") return;
    const now = win.performance.now();
    const up = upOnScreen({ beta: pose.beta, gamma: pose.gamma, screenAngle: 0 });
    // Without alpha, each change in gravity is the smallest turn that explains it.
    const attitude =
      alpha === null ? withGravity(reading, up) : attitudeOf(alpha, pose.beta, pose.gamma);
    if (!kept.fromSensor) {
      // The still pose and the fallback are in the screen's own axes: the light starts from where
      // theirs shows, whichever way the screen is turned. The viewer is centered on the reading.
      aimed = readAt(publishedPose, pose.screenAngle);
      lit = shownLit = shownRest = withGravity(attitude, upOnScreen({ ...aimed, screenAngle: 0 }));
      shownScreenAngle = aimed.screenAngle;
      rest = attitude;
      recentering = false;
      easeStarted = null;
      speed = 0;
      stepped = now;
      kept.fromSensor = true;
    } else if (restarted && alpha !== null) {
      // iOS counts alpha from wherever its sensor started, so a restarted listener's heading is
      // arbitrary: turn the world about vertical so the device keeps the heading it was lit at.
      const c = multiply(withGravity(attitude, rotate(inverse(lit), [0, 0, 1])), inverse(lit));
      const turned = (q: Quaternion) => multiply(c, q);
      lit = turned(lit);
      shownLit = turned(shownLit);
      rest = turned(rest);
      shownRest = turned(shownRest);
      easeFrom = turned(easeFrom);
      notePerformance(
        "orientation",
        `heading kept across a restarted listener: alpha moved ${angleBetween(c, IDENTITY).toFixed(1)}°`,
      );
    }
    restarted = false;
    reading = attitude;
    aimed = pose;
    readingAt = now;
    freshReading = true;
    step(attitude, now);
    kept.attitude = { lit, rest, recentering };
    if (!frame) frame = win.requestAnimationFrame(write);
  };

  const pause = () => {
    win.cancelAnimationFrame(frame);
    frame = 0;
    if (mode === "fallback-wave") fallbackElapsed = fallbackPublished;
    // The light holds where it was last shown, and the filter starts again from there; an
    // unfinished re-centering eases on from where the viewer is.
    lit = reading = shownLit;
    rest = shownRest;
    aimed = { ...publishedPose };
    speed = 0;
    easeStarted = null;
    if (kept.fromSensor) kept.attitude = { lit, rest, recentering };
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
    // A pending re-centering eases on while the device holds still.
    if ((mode === "device-tilt" && recentering) || mode === "fallback-wave") {
      fallbackStarted = win.performance.now();
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
