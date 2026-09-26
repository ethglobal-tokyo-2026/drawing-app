import { useEffect } from "react";
import { sheenIn, sweepSheen } from "./resinSheen";

/**
 * The app's one light: `--lx` and `--ly` (-1 to 1) on the root follow the pointer, or the phone's
 * tilt where the browser shares it. Every moving highlight reads them, and rests in the middle
 * without them. The tilt is listened for only while a screen with stickers holds the light, so the
 * motion sensor rests everywhere else.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The light is written at most this often; the highlights' transitions glide between writes. */
const BEAT_MS = 45;
/** Degrees of tilt that carry the light from the middle to an edge. */
const TILT_RANGE = 32;
/** How far back a phone leans when it's held to read, in degrees. */
const HELD_BETA = 40;
/** A tilt change this big sweeps a sheen across the stickers on screen, at most once a pause. */
const SWEEP_TILT = 9;
const SWEEP_PAUSE_MS = 1400;

const clamp11 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** The installed light's tilt listener, on while any screen with stickers holds the light. */
let tilt: { on: () => void; off: () => void } | null = null;
let holders = 0;

/** Sweeps a sheen across each live resin big enough to see on screen. */
function sweepVisible(doc: Document, win: Window) {
  for (const resin of doc.querySelectorAll(".live-resin")) {
    const r = resin.getBoundingClientRect();
    const sheen = sheenIn(resin);
    if (sheen && r.width > 30 && r.bottom > 0 && r.top < win.innerHeight) sweepSheen(sheen);
  }
}

/** Starts the light; returns what stops it. */
export function installLight(root: HTMLElement, win: typeof window = window): () => void {
  const reduced = win.matchMedia(REDUCED);
  let x = 0;
  let y = 0;
  let frame = 0;
  let lastWrite = -Infinity;

  const write = (now: number) => {
    frame = 0;
    if (now - lastWrite < BEAT_MS) {
      frame = win.requestAnimationFrame(write);
      return;
    }
    lastWrite = now;
    root.style.setProperty("--lx", x.toFixed(3));
    root.style.setProperty("--ly", y.toFixed(3));
  };

  const aim = (nx: number, ny: number) => {
    if (reduced.matches) return;
    x = clamp11(nx);
    y = clamp11(ny);
    if (!frame) frame = win.requestAnimationFrame(write);
  };

  const fromPointer = (e: PointerEvent) =>
    aim((e.clientX / win.innerWidth) * 2 - 1, (e.clientY / win.innerHeight) * 2 - 1);

  let lastGamma: number | null = null;
  let lastSweep = -Infinity;
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
      sweepVisible(root.ownerDocument, win);
    }
    lastGamma = e.gamma;
  };

  // Turning reduced motion on sets the light back in the middle.
  const onMotionSetting = () => {
    if (!reduced.matches) return;
    win.cancelAnimationFrame(frame);
    frame = 0;
    root.style.removeProperty("--lx");
    root.style.removeProperty("--ly");
  };

  // The light never asks for the tilt: where a browser wants permission first (iOS), no tilt
  // arrives until something else has asked, and the pointer alone moves the light.
  const passive = { passive: true };
  const ownTilt = {
    on: () => win.addEventListener("deviceorientation", fromTilt, passive),
    off: () => {
      win.removeEventListener("deviceorientation", fromTilt);
      // A tilt from before the sensor rested isn't a change to sweep for.
      lastGamma = null;
    },
  };
  tilt = ownTilt;
  if (holders > 0) ownTilt.on();
  win.addEventListener("pointermove", fromPointer, passive);
  win.addEventListener("pointerdown", fromPointer, passive);
  reduced.addEventListener("change", onMotionSetting);
  return () => {
    win.removeEventListener("pointermove", fromPointer);
    win.removeEventListener("pointerdown", fromPointer);
    ownTilt.off();
    if (tilt === ownTilt) tilt = null;
    reduced.removeEventListener("change", onMotionSetting);
    win.cancelAnimationFrame(frame);
  };
}

/** Holds the light for a screen with stickers; returns what releases it. */
export function acquireLight(): () => void {
  if (holders++ === 0) tilt?.on();
  return () => {
    if (--holders === 0) tilt?.off();
  };
}

/** Holds the light while the calling screen shows its stickers. */
export function useLight(showing = true) {
  useEffect(() => (showing ? acquireLight() : undefined), [showing]);
}
