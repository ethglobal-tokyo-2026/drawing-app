import { useEffect } from "react";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { sheenIn, sweepSheen } from "./resinSheen";

/**
 * The app's one light: `--lx` and `--ly` (-1 to 1) follow the pointer, or the phone's tilt where the
 * browser shares it. They're set on each live resin rather than the root, so a move restyles only the
 * highlights that read them; without them a highlight rests in the middle. The light listens only
 * while a screen with stickers holds it, so the pointer and the motion sensor rest everywhere else.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The elements whose highlights read the light. */
const LIT = ".live-resin";
/** The light is written at most this often; the highlights' transitions glide between writes. */
const BEAT_MS = 45;
/** A move shorter than this, on the -1 to 1 scale, isn't written, so the hand's tremor keeps still. */
const STEP = 0.02;
/** Degrees of tilt that carry the light from the middle to an edge. */
const TILT_RANGE = 32;
/** How far back a phone leans when it's held to read, in degrees. */
const HELD_BETA = 40;
/**
 * A tilt change this big sweeps a sheen across the stickers on screen, and a glint along their foil,
 * at most once a pause.
 */
const SWEEP_TILT = 9;
const SWEEP_PAUSE_MS = 1400;

const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** The installed light: its listeners, on while any screen with stickers holds the light. */
let light: { on: () => void; off: () => void; relight: () => void } | null = null;
let holders = 0;

/** The foil whose glint a tilt sweeps; the glint rests out of sight until then. */
const FOIL = ".sticker-foil";

const onScreen = (el: Element, win: Window) => {
  const r = el.getBoundingClientRect();
  return r.width > 30 && r.bottom > 0 && r.top < win.innerHeight;
};

function sweepGlint(glint: Element) {
  glint.animate(
    [{ transform: "translateX(0) skewX(-18deg)" }, { transform: "translateX(460%) skewX(-18deg)" }],
    { duration: 2000, easing: "cubic-bezier(0.45, 0.05, 0.25, 1)" },
  );
}

/**
 * Sweeps a sheen across each live resin, and a glint along each foil, big enough to see on screen;
 * returns how many it measured.
 */
function sweepVisible(doc: Document, win: Window): number {
  const resins = doc.querySelectorAll(LIT);
  for (const resin of resins) {
    const sheen = sheenIn(resin);
    if (sheen && onScreen(resin, win)) sweepSheen(sheen);
  }
  const foils = doc.querySelectorAll(FOIL);
  for (const foil of foils) {
    const glint = foil.querySelector(".sticker-foil__glint");
    if (glint && onScreen(foil, win)) sweepGlint(glint);
  }
  return resins.length + foils.length;
}

/** Starts the light; returns what stops it. */
export function installLight(root: HTMLElement, win: typeof window = window): () => void {
  const reduced = win.matchMedia(REDUCED);
  let x = 0;
  let y = 0;
  /** Where the resins were last lit from, or null before the light first moves. */
  let lit: { x: number; y: number } | null = null;
  let frame = 0;
  let lastWrite = -Infinity;

  /** Sets the light on every live resin, or clears it with null; returns how many. */
  const setOnResins = (lx: string | null, ly: string | null) => {
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

  /** Sets the light from `lit` on every live resin; returns how many. Made once, not per write. */
  const lightFromLit = () => (lit ? setOnResins(lit.x.toFixed(3), lit.y.toFixed(3)) : 0);

  /** Lights the resins from `lit` as our work, and marks how many it lit while recording. */
  const lightResins = (why: string) => {
    const count = timeOurWork("light", lightFromLit);
    if (isPerformanceRecorderOn()) notePerformance("light", `${why} ${count} resins`);
  };

  const write = (now: number) => {
    frame = 0;
    if (now - lastWrite < BEAT_MS) {
      frame = win.requestAnimationFrame(write);
      return;
    }
    lastWrite = now;
    lit = { x, y };
    lightResins("write to");
  };

  const aim = (nx: number, ny: number) => {
    if (reduced.matches) return;
    x = clamp11(nx);
    y = clamp11(ny);
    if (lit && Math.abs(x - lit.x) < STEP && Math.abs(y - lit.y) < STEP) return;
    if (!frame) frame = win.requestAnimationFrame(write);
  };

  // A screen's resins come in at the middle; they start where the light already is.
  const relight = () => {
    if (lit && !reduced.matches) lightResins("relight");
  };

  const fromPointer = (e: PointerEvent) =>
    aim((e.clientX / win.innerWidth) * 2 - 1, (e.clientY / win.innerHeight) * 2 - 1);

  let lastGamma: number | null = null;
  let lastSweep = -Infinity;
  // Made once, like lightFromLit, not per sweep.
  const sweep = () => sweepVisible(root.ownerDocument, win);
  const fromTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    aim(e.gamma / TILT_RANGE, (e.beta - HELD_BETA) / TILT_RANGE);
    const now = win.performance.now();
    if (
      lastGamma !== null &&
      Math.abs(e.gamma - lastGamma) > SWEEP_TILT &&
      now - lastSweep > SWEEP_PAUSE_MS &&
      !reduced.matches
    ) {
      lastSweep = now;
      const measured = timeOurWork("light sweep", sweep);
      if (isPerformanceRecorderOn())
        notePerformance("light", `sweep measured ${measured} resins and foils`);
    }
    lastGamma = e.gamma;
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
  // arrives until something else has asked, and the pointer alone moves the light.
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
      lastGamma = null;
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
