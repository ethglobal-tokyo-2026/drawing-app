import { useEffect } from "react";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { deviceForLight } from "../ui/deviceForLight";
import { getMotionPermission, subscribeMotionPermission } from "../ui/motionPermission";
import {
  fallbackPose,
  FALLBACK_PERIOD_MS,
  lightMode,
  rotationInputForLight,
  relativeTiltPose,
  type LightMode,
  type RotationInput,
  type RotationOrigin,
  type LightPose,
} from "./lightMode";

export type { LightPose } from "./lightMode";
let publishedPose: LightPose = { x: 0, y: 0, rotationDegrees: 0 };
const subscribers = new Set<(pose: LightPose) => void>();
/** The held pose, or the common static pose before the first published input. */
export const currentLight = (): LightPose => ({ ...publishedPose });
/** The shared material renderer receives only published writes; new material reads currentLight. */
export function subscribeLight(listener: (pose: LightPose) => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * The app's one light: `--lx` and `--ly` (-1 to 1) follow only the device's tilt where the browser
 * shares it. An eligible no-rotation desktop may use the one shared fallback pose. Mouse, pen and
 * finger interactions never move it. Set on each moving highlight, the values only restyle those.
 * The light listens only while a visible screen with stickers holds it.
 */

/**
 * The Shop preview film and each foil's bands and glint follow the light. Setting it on their
 * highlights restyles those highlights without changing the masked layers around them.
 */
const MOVING = ".laminate-film > i > b, .sticker-foil__sheen, .sticker-foil__glint";
/** Only these highlights can continue a replay toward each new light position. */
export const movesWithLight = (target: Element): boolean => target.matches(MOVING);
/**
 * Each crease, which takes the light only once it rests: restyling every crease's layers on each write
 * drops frames while the light moves, and its fade glides it there after.
 */
const CREASES = ".sticker-crease";
/** How long the light holds still before the creases take it. */
export const CREASE_SETTLE_MS = 250;
/** A move shorter than this, on the -1 to 1 scale, isn't written, so the hand's tremor keeps still. */
const STEP = 0.02;
/** The same finite glide ignores an angular tremor smaller than a quarter degree. */
const ROTATION_STEP_DEGREES = 0.25;
/** The tilt's light glides toward where the phone points, most of the way in this long, so it never jumps. */
export const GLIDE_MS = 160;

const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** A light value as it's written: three places, with no "-0.000" for a rounding error under zero. */
const written = (v: number) => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);

/** The installed light: its listeners, on while any screen with stickers holds the light. */
let light: { on: () => void; off: () => void } | null = null;
let holders = 0;

/** The light as it's written onto what reads it. */
type Light = { lx: string; ly: string; rotation: string };

/** Where the light last was, or null before it first moves: what a newly shown highlight starts at. */
let lightNow: Light | null = null;
/** Where the light last rested, or null before it first rests: what a newly shown crease starts at. */
let creaseLightNow: Light | null = null;
/** Held material state and observed capability survive a controller reinstall in the same document. */
const documentLights = new WeakMap<
  Document,
  {
    pose: LightPose;
    light: Light | null;
    crease: Light | null;
    seenRotation: boolean;
    fallbackPhase: number;
    origin?: RotationOrigin;
    lastAlpha?: number;
  }
>();

/** Sets `light` on each of `els`, or clears it with null; returns how many. */
function setLight(els: NodeListOf<HTMLElement> | HTMLElement[], light: Light | null) {
  for (const el of els) {
    if (light) {
      el.style.setProperty("--lx", light.lx);
      el.style.setProperty("--ly", light.ly);
      el.style.setProperty("--light-rotation", light.rotation);
    } else {
      el.style.removeProperty("--lx");
      el.style.removeProperty("--ly");
      el.style.removeProperty("--light-rotation");
    }
  }
  return els.length;
}

/**
 * Highlights' glides a reorder cut short and replayed (KeepAnimations), by the property each moves.
 * A transition can't start under a replay, so each light move glides them on from where they show.
 */
const replays = new Map<Animation, string>();

/** Hands the light a replayed glide; one on a highlight the light moves glides on with its moves. */
export function glideOnWithLight(replay: Animation, property: string) {
  const target = replay.effect instanceof KeyframeEffect ? replay.effect.target : null;
  if (!target || !movesWithLight(target)) return;
  replays.set(replay, property);
  const drop = () => replays.delete(replay);
  replay.finished.then(drop, drop);
}

/** Ends a board's replays before its highlights leave the page, even if another screen holds the light. */
export function stopLightGlides(root: Element) {
  for (const replay of replays.keys()) {
    const target = replay.effect instanceof KeyframeEffect ? replay.effect.target : null;
    if (!target || !root.contains(target)) continue;
    replay.cancel();
    replays.delete(replay);
  }
}

/** A CSS property's name as a keyframe names it. */
const keyframeName = (property: string) =>
  property.startsWith("--")
    ? property
    : property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Before the light moves, starts each replay over from where it shows, at its own pace, toward an end
 * left open: wherever the light's new value puts it. Every shown value is read before any restarts,
 * so it's one style recalc. With the light cleared, they end.
 */
function glideOnReplays(win: Window, moving: boolean) {
  if (replays.size === 0) return;
  const shown = [...replays].map(([replay, property]) => {
    const effect = replay.effect instanceof KeyframeEffect ? replay.effect : null;
    const target = effect?.target;
    const value =
      moving && target?.isConnected
        ? win.getComputedStyle(target, effect?.pseudoElement).getPropertyValue(property)
        : "";
    return { replay, property, effect, value };
  });
  replays.clear();
  for (const { replay, property, effect, value } of shown) {
    replay.cancel();
    if (!effect?.target || !value) continue;
    const { duration, easing } = effect.getTiming();
    const next = effect.target.animate([{ [keyframeName(property)]: value, offset: 0 }], {
      duration,
      easing,
      pseudoElement: effect.pseudoElement ?? undefined,
    });
    glideOnWithLight(next, property);
  }
}

/** Sets the light on what reads it in `el`, newly shown, so it matches the rest at once. */
export function lightUp(el: HTMLElement) {
  const within = (selector: string) =>
    el.matches(selector) ? [el] : el.querySelectorAll<HTMLElement>(selector);
  const held = lightNow ?? {
    lx: written(publishedPose.x),
    ly: written(publishedPose.y),
    rotation: written(publishedPose.rotationDegrees),
  };
  setLight(within(MOVING), held);
  setLight(within(CREASES), creaseLightNow ?? held);
}

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
    pose: { x: 0, y: 0, rotationDegrees: 0 },
    light: null,
    crease: null,
    seenRotation: false,
    fallbackPhase: 0,
  };
  documentLights.set(doc, kept);
  publishedPose = kept.pose;
  lightNow = kept.light;
  creaseLightNow = kept.crease;
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
  let x = 0;
  let y = 0;
  let rotationDegrees = 0;
  /** Where the light was last written, or null before it first moves. */
  let lit: LightPose = { ...kept.pose };
  let frame = 0;
  let lastFrame = win.performance.now();
  let settle = 0;

  /** Lights every crease from where the light now rests. Made once, not per write. */
  const settleCreases = () => {
    creaseLightNow = lightNow;
    kept.crease = creaseLightNow;
    const count = timeOurWork("light", () => setLight(root.querySelectorAll(CREASES), lightNow));
    if (isPerformanceRecorderOn()) notePerformance("light", `settle on ${count} creases`);
  };

  /**
   * Sets the light on every highlight, and on creases once rotation settles or each fallback write;
   * returns how many highlights.
   */
  const setLightNow = (light: Light) => {
    lightNow = light;
    win.clearTimeout(settle);
    if (mode === "fallback-wave") settleCreases();
    else settle = win.setTimeout(settleCreases, CREASE_SETTLE_MS);
    glideOnReplays(win, true);
    return setLight(root.querySelectorAll<HTMLElement>(MOVING), light);
  };

  /** Sets the light from `lit` on every highlight; returns how many. Made once, not per write. */
  const writeLit = () => {
    const count = setLightNow({
      lx: written(lit.x),
      ly: written(lit.y),
      rotation: written(lit.rotationDegrees),
    });
    kept.light = lightNow;
    return count;
  };

  /** Writes the light from `lit` as our work, and notes how many it lit while recording. */
  const writeLight = () => {
    const count = timeOurWork("light", writeLit);
    if (isPerformanceRecorderOn()) notePerformance("light", `write to ${count} highlights`);
  };

  const write = (now: number) => {
    frame = 0;
    if (mode === "still" || !installed) return;
    const since = now - lastFrame;
    lastFrame = now;
    if (mode === "fallback-wave") {
      fallbackPublished = (fallbackElapsed + now - fallbackStarted) % FALLBACK_PERIOD_MS;
      kept.fallbackPhase = fallbackPublished;
      lit = fallbackPose(fallbackPublished / FALLBACK_PERIOD_MS);
    } else {
      // A low-pass on the tilt, by the time since the last write; close enough, it lands.
      const k = 1 - Math.exp(-since / GLIDE_MS);
      const next = {
        x: lit.x + (x - lit.x) * k,
        y: lit.y + (y - lit.y) * k,
        rotationDegrees: lit.rotationDegrees + (rotationDegrees - lit.rotationDegrees) * k,
      };
      const near =
        Math.abs(x - next.x) < STEP / 2 &&
        Math.abs(y - next.y) < STEP / 2 &&
        Math.abs(rotationDegrees - next.rotationDegrees) < ROTATION_STEP_DEGREES / 2;
      lit = near ? { x, y, rotationDegrees } : next;
    }
    publishedPose = { ...lit };
    kept.pose = publishedPose;
    // The coating and foil share each display frame's already-smoothed pose.
    for (const listener of subscribers) listener(currentLight());
    writeLight();
    if (
      mode === "fallback-wave" ||
      lit.x !== x ||
      lit.y !== y ||
      lit.rotationDegrees !== rotationDegrees
    )
      frame = win.requestAnimationFrame(write);
  };

  const aim = (to: LightPose) => {
    if (mode !== "device-tilt") return;
    x = clamp11(to.x);
    y = clamp11(to.y);
    const difference =
      ((((to.rotationDegrees - lit.rotationDegrees + 180) % 360) + 360) % 360) - 180;
    rotationDegrees = lit.rotationDegrees + difference;
    if (
      Math.abs(x - lit.x) < STEP &&
      Math.abs(y - lit.y) < STEP &&
      Math.abs(rotationDegrees - lit.rotationDegrees) < ROTATION_STEP_DEGREES
    )
      return;
    if (!frame) {
      // Time spent holding a pose is not interpolation time toward a newly received target.
      lastFrame = win.performance.now();
      frame = win.requestAnimationFrame(write);
    }
  };

  const pause = (cancelReplays = true) => {
    win.cancelAnimationFrame(frame);
    win.clearTimeout(settle);
    frame = 0;
    settle = 0;
    if (mode === "fallback-wave") fallbackElapsed = fallbackPublished;
    // Drop an unfinished target. A resumed rotation source waits for a fresh reading.
    x = lit.x;
    y = lit.y;
    rotationDegrees = lit.rotationDegrees;
    lastFrame = win.performance.now();
    if (cancelReplays) glideOnReplays(win, false);
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
    pause(next === "still");
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
    const angle = win.screen.orientation?.angle ?? Reflect.get(win, "orientation");
    const screenAngle = typeof angle === "number" && Number.isFinite(angle) ? angle : 0;
    // A temporarily missing heading must not become an artificial rotation back to zero.
    const acquiredHeading =
      kept.lastAlpha === undefined && e.alpha !== null && Number.isFinite(e.alpha);
    if (e.alpha !== null && Number.isFinite(e.alpha)) kept.lastAlpha = e.alpha;
    const alpha = kept.lastAlpha ?? 0;
    if (isPerformanceRecorderOn())
      notePerformance(
        "orientation",
        `alpha=${e.alpha}, beta=${e.beta}, gamma=${e.gamma}, screen=${screenAngle}; heading=${alpha}`,
      );
    if (!kept.origin || acquiredHeading) {
      // Acquire the sensor reference once. Layout rotation changes displayed axes, never this origin.
      pause(false);
      kept.origin = { alpha, beta: e.beta, gamma: e.gamma, screenAngle, pose: { ...lit } };
      if (mode === "device-tilt" && !lightNow) {
        writeLight();
      }
      return;
    }
    const to = relativeTiltPose(alpha, e.beta, e.gamma, kept.origin, screenAngle);
    aim(to);
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
    if (light === own) {
      light = null;
      glideOnReplays(win, false);
    }
    reduced.removeEventListener("change", refresh);
    doc.removeEventListener("visibilitychange", refresh);
    unsubscribePermission();
  };
}

/** Holds the light for a screen with stickers; returns what releases it. */
export function acquireLight(): () => void {
  // A screen's stickers start where the light is as they mount (lightUp), so nothing is rewritten here.
  if (holders++ === 0) light?.on();
  return () => {
    if (--holders === 0) light?.off();
  };
}

/** Holds the light while the calling screen shows its stickers. */
export function useLight(showing = true) {
  useEffect(() => (showing ? acquireLight() : undefined), [showing]);
}
