import { useEffect } from "react";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { sheenIn, sweepSheen } from "./resinSheen";

/**
 * The app's one light: `--lx` and `--ly` (-1 to 1) follow the phone's tilt where the browser shares it,
 * or a mouse or pen. A finger never moves it: a finger drags stickers, and the light sweeping with it
 * would change the gloss on every other sticker. They're set on each highlight that moves with them
 * rather than the root, so a move restyles only those; without them each rests at its own default.
 * The light listens only while a screen with stickers holds it, so the pointer and the motion sensor
 * rest everywhere else.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
/**
 * What reads the light: the resin's specular, each foil's bands and glint, and each crease. Set on them
 * rather than the resin or foil they're in, a move restyles only them, not the masked layers around them.
 */
const LIT = ".live-resin__spec > b, .sticker-foil__sheen, .sticker-foil__glint, .sticker-crease";
/** The light is written at most this often; the highlights' transitions glide between writes. */
const BEAT_MS = 45;
/** A move shorter than this, on the -1 to 1 scale, isn't written, so the hand's tremor keeps still. */
const STEP = 0.02;
/** Degrees of tilt from the reading position that carry the light from the middle to an edge. */
const TILT_RANGE = 32;
/** How far back a phone leans when it's held to read, in degrees. */
const HELD_BETA = 40;
/** A tilt change this big sweeps a sheen across the stickers on screen, at most once a pause. */
const SWEEP_TILT = 9;
const SWEEP_PAUSE_MS = 1400;
/** The tilt's light glides toward where the phone points, most of the way in this long, so it never jumps. */
export const GLIDE_MS = 160;

const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);
/** Eases into the edge rather than stopping at it: slope 0 at ±1, so a tilt past the range lands softly. */
const easeToEdge = (v: number) => {
  const c = clamp11(v);
  return 1.5 * c - 0.5 * c * c * c;
};

/** A light value as it's written: three places, with no "-0.000" for a rounding error under zero. */
const written = (v: number) => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);

const RAD = Math.PI / 180;
/** Gravity across the screen of a phone held to read and turned TILT_RANGE degrees to a side. */
const ACROSS_RANGE = Math.cos(HELD_BETA * RAD) * Math.sin(TILT_RANGE * RAD);

/**
 * The light for a tilt, from gravity's direction in the phone rather than the angles themselves, which
 * jump where a phone held upright leans sideways (gamma flips as beta passes 90°). Gravity is the same
 * however the sensor writes the tilt, so the light never jumps or wraps.
 */
function lightForTilt(beta: number, gamma: number): { x: number; y: number } {
  const b = beta * RAD;
  // Gravity across the screen, and how far the screen leans back from flat, in degrees.
  const across = Math.cos(b) * Math.sin(gamma * RAD);
  const lean = Math.asin(Math.sin(b)) / RAD;
  return {
    x: easeToEdge(across / ACROSS_RANGE),
    y: easeToEdge((lean - HELD_BETA) / TILT_RANGE),
  };
}

/** The installed light: its listeners, on while any screen with stickers holds the light. */
let light: { on: () => void; off: () => void; relight: () => void } | null = null;
let holders = 0;

/** Where the light last was, or null before it first moves: what a newly shown sticker starts at. */
let lightNow: { lx: string; ly: string } | null = null;

/** Sets the light where it is now on what reads it in `el`, newly shown, so it matches the rest at once. */
export function lightUp(el: HTMLElement) {
  if (!lightNow) return;
  for (const lit of el.matches(LIT) ? [el] : el.querySelectorAll<HTMLElement>(LIT)) {
    lit.style.setProperty("--lx", lightNow.lx);
    lit.style.setProperty("--ly", lightNow.ly);
  }
}

/** Sweeps a sheen across each live resin big enough to see on screen; returns how many it measured. */
function sweepVisible(doc: Document, win: Window): number {
  const resins = doc.querySelectorAll(".live-resin");
  for (const resin of resins) {
    const r = resin.getBoundingClientRect();
    const sheen = sheenIn(resin);
    if (sheen && r.width > 30 && r.bottom > 0 && r.top < win.innerHeight) sweepSheen(sheen);
  }
  return resins.length;
}

/** Starts the light; returns what stops it. */
export function installLight(root: HTMLElement, win: typeof window = window): () => void {
  const reduced = win.matchMedia(REDUCED);
  let x = 0;
  let y = 0;
  /** The tilt aimed it, so it glides there; a mouse or pen is followed at once. */
  let gliding = false;
  /** Where the resins were last lit from, or null before the light first moves. */
  let lit: { x: number; y: number } | null = null;
  let frame = 0;
  let lastWrite = -Infinity;

  /** Sets the light on every lit element, or clears it with null; returns how many. */
  const setOnResins = (lx: string | null, ly: string | null) => {
    lightNow = lx === null || ly === null ? null : { lx, ly };
    const resins = root.querySelectorAll<HTMLElement>(LIT);
    for (const resin of resins) {
      if (lx === null || ly === null) {
        resin.style.removeProperty("--lx");
        resin.style.removeProperty("--ly");
      } else {
        resin.style.setProperty("--lx", lx);
        resin.style.setProperty("--ly", ly);
      }
    }
    return resins.length;
  };

  /** Sets the light from `lit` on every lit element; returns how many. Made once, not per write. */
  const lightFromLit = () => (lit ? setOnResins(written(lit.x), written(lit.y)) : 0);

  /** Lights the resins from `lit` as our work, and marks how many it lit while recording. */
  const lightResins = (why: string) => {
    const count = timeOurWork("light", lightFromLit);
    if (isPerformanceRecorderOn()) notePerformance("light", `${why} ${count} highlights`);
  };

  const write = (now: number) => {
    frame = 0;
    if (now - lastWrite < BEAT_MS) {
      frame = win.requestAnimationFrame(write);
      return;
    }
    const since = now - lastWrite;
    lastWrite = now;
    if (!lit || !gliding) lit = { x, y };
    else {
      // A low-pass on the tilt, by the time since the last write; close enough, it lands.
      const k = 1 - Math.exp(-Math.min(since, 10 * GLIDE_MS) / GLIDE_MS);
      const next = { x: lit.x + (x - lit.x) * k, y: lit.y + (y - lit.y) * k };
      const near = Math.abs(x - next.x) < STEP / 2 && Math.abs(y - next.y) < STEP / 2;
      lit = near ? { x, y } : next;
    }
    lightResins("write to");
    if (lit.x !== x || lit.y !== y) frame = win.requestAnimationFrame(write);
  };

  const aim = (nx: number, ny: number, glide: boolean) => {
    if (reduced.matches) return;
    x = clamp11(nx);
    y = clamp11(ny);
    gliding = glide;
    if (lit && Math.abs(x - lit.x) < STEP && Math.abs(y - lit.y) < STEP) return;
    if (!frame) frame = win.requestAnimationFrame(write);
  };

  // A screen's resins come in at the middle; they start where the light already is.
  const relight = () => {
    if (lit && !reduced.matches) lightResins("relight");
  };

  const fromPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    aim((e.clientX / win.innerWidth) * 2 - 1, (e.clientY / win.innerHeight) * 2 - 1, false);
  };

  /** Across the screen, where the last tilt put the light. */
  let lastAcross: number | null = null;
  let lastSweep = -Infinity;
  // Made once, like lightFromLit, not per sweep.
  const sweep = () => sweepVisible(root.ownerDocument, win);
  const fromTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    const to = lightForTilt(e.beta, e.gamma);
    aim(to.x, to.y, true);
    const now = win.performance.now();
    if (
      lastAcross !== null &&
      Math.abs(to.x - lastAcross) > SWEEP_TILT / TILT_RANGE &&
      now - lastSweep > SWEEP_PAUSE_MS &&
      !reduced.matches
    ) {
      lastSweep = now;
      const measured = timeOurWork("light sweep", sweep);
      if (isPerformanceRecorderOn()) notePerformance("light", `sweep measured ${measured} resins`);
    }
    lastAcross = to.x;
  };

  // Turning reduced motion on sets the light back in the middle.
  const onMotionSetting = () => {
    if (!reduced.matches) return;
    win.cancelAnimationFrame(frame);
    frame = 0;
    lit = null;
    setOnResins(null, null);
  };

  // The light never asks for the tilt: where a browser wants permission first (iOS), no tilt
  // arrives until something else has asked, and on a phone the light rests until then.
  const passive = { passive: true };
  const own = {
    on: () => {
      win.addEventListener("deviceorientation", fromTilt, passive);
      win.addEventListener("pointermove", fromPointer, passive);
      win.addEventListener("pointerdown", fromPointer, passive);
    },
    off: () => {
      win.removeEventListener("deviceorientation", fromTilt);
      win.removeEventListener("pointermove", fromPointer);
      win.removeEventListener("pointerdown", fromPointer);
      // A tilt from before the sensor rested isn't a change to sweep for.
      lastAcross = null;
    },
    relight,
  };
  light = own;
  if (holders > 0) own.on();
  reduced.addEventListener("change", onMotionSetting);
  return () => {
    own.off();
    if (light === own) light = null;
    reduced.removeEventListener("change", onMotionSetting);
    win.cancelAnimationFrame(frame);
  };
}

/** Holds the light for a screen with stickers; returns what releases it. */
export function acquireLight(): () => void {
  if (holders++ === 0) light?.on();
  light?.relight();
  return () => {
    if (--holders === 0) light?.off();
  };
}

/** Holds the light while the calling screen shows its stickers. */
export function useLight(showing = true) {
  useEffect(() => (showing ? acquireLight() : undefined), [showing]);
}
