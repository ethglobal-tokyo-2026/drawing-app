import type { Method, Tier } from "./combo";
import { clamp } from "./easing";
import { focusLinesSvg, HAZE_WAVE_SVG, speedFieldSvg } from "./heartArt";

export interface TierBackground {
  setLayout: (
    width: number,
    height: number,
    heart: { x: number; y: number; height: number },
  ) => void;
  /** Stroking has its own speed lines, so the focus lines keep out of its way. */
  show: (tier: Tier | null, intensity: number, method: Method) => void;
  /** The stroke's speed lines, turned to its axis in degrees. */
  setSpeedField: (opacity: number, angle: number) => void;
  /** `real`: wall-clock seconds since the last frame. */
  step: (real: number) => void;
  /** 昇天's climax: the light beams and the white-out take the ground over. */
  ascend: (on: boolean, intensity: number) => void;
  flash: () => void;
  hideAll: () => void;
}

/** The focus lines' two drawings, which alternate so the lines flicker like a hand-drawn loop. */
const FOCUS_SEEDS = [4242, 7777];
const FOCUS_FPS = 8;
const RAYS_DEG_PER_S = 6;
const FLASH = { opacity: 0.7, seconds: 0.32 };
const SPEED_FIELD_SEED = 31;

const layer = (className: string) => {
  const el = document.createElement("div");
  el.className = className;
  return el;
};

/** Writes a layer's opacity, letting its CSS transition ease it; true if the layer shows. */
const setOpacity = (el: HTMLElement, value: number) => {
  el.style.opacity = value > 0 ? clamp(value, 0, 1).toFixed(3) : "0";
  return value > 0;
};

/**
 * The ground behind the heart, escalating with the tier: the calm liner, a warm blush, 集中線 focus
 * lines, heat haze, then 昇天's light beams and white-out. Each layer fades in and out on its own.
 */
export function createTierBackground(ground: HTMLElement, reduced: () => boolean): TierBackground {
  const blush = layer("gr-bg gr-bg-blush");
  const focus = layer("gr-focus");
  focus.dataset.v = "0";
  const speedField = layer("gr-speedfield");
  speedField.innerHTML = speedFieldSvg(SPEED_FIELD_SEED);
  const speedLines = speedField.firstElementChild;
  const haze = layer("gr-bg gr-haze");
  haze.setAttribute("aria-hidden", "true");
  // Rising puffs and two waves, as many as the stylesheet places and times.
  for (let i = 0; i < 6; i++) haze.append(document.createElement("i"));
  for (let i = 0; i < 2; i++) {
    const wave = document.createElement("span");
    wave.innerHTML = HAZE_WAVE_SVG;
    haze.append(wave);
  }
  const beam = layer("gr-beam");
  const rays = layer("gr-beam-rays");
  const shaft = layer("gr-beam-shaft");
  beam.append(rays, shaft);
  const white = layer("gr-bg gr-white");
  // The ground isn't a stacking context, so this covers the whole page: the heart and the HUD too.
  const flashCover = layer("gr-layer");
  flashCover.style.background = "#fff";
  flashCover.style.zIndex = "30";
  flashCover.style.opacity = "0";
  ground.append(blush, focus, speedField, haze, beam, white, flashCover);

  let clock = 0;
  let focusOn = false;
  let beamOn = false;
  /** Seconds of the flash still to fade. */
  let flashLeft = 0;
  let speedFieldShown = { opacity: "", angle: "" };

  return {
    setLayout(width, height, heart) {
      focus.innerHTML = FOCUS_SEEDS.map((seed) =>
        focusLinesSvg(width, height, heart.x, heart.y, seed),
      ).join("");
      // The shaft comes down past the heart's middle; the rays turn about a point above its top.
      shaft.style.left = `${heart.x}px`;
      shaft.style.setProperty("--beam-h", `${heart.y + 60}px`);
      rays.style.left = `${heart.x}px`;
      rays.style.top = `${heart.y - heart.height * 0.9}px`;
    },

    show(tier, intensity, method) {
      const t = tier ?? -1;
      const still = reduced();
      setOpacity(blush, t >= 1 ? 0.45 + 0.45 * intensity : 0);
      const focusShare = t === 2 ? 0.2 + 0.3 * intensity : t === 3 ? 0.34 + 0.36 * intensity : 0;
      focusOn = setOpacity(focus, method === "stroke" ? 0 : focusShare);
      setOpacity(haze, t >= 3 && !still ? 0.45 + 0.5 * intensity : 0);
      beamOn = setOpacity(beam, t >= 4 && !still ? 0.4 + 0.35 * intensity : 0);
      setOpacity(white, t >= 4 ? 0.3 + 0.35 * intensity : 0);
    },

    setSpeedField(opacity, angle) {
      // Written every frame of a stroke, so only a change touches the style.
      const shown = {
        opacity: opacity > 0 ? clamp(opacity, 0, 1).toFixed(3) : "0",
        angle: angle.toFixed(1),
      };
      if (shown.opacity !== speedFieldShown.opacity) speedField.style.opacity = shown.opacity;
      if (shown.angle !== speedFieldShown.angle && speedLines instanceof SVGElement) {
        speedLines.style.transform = `rotate(${shown.angle}deg)`;
      }
      speedFieldShown = shown;
    },

    step(real) {
      clock += real;
      if (focusOn && !reduced()) {
        const v = String(Math.floor(clock * FOCUS_FPS) % 2);
        if (focus.dataset.v !== v) focus.dataset.v = v;
      }
      if (beamOn)
        rays.style.transform = `rotate(${((clock * RAYS_DEG_PER_S) % 360).toFixed(2)}deg)`;
      if (flashLeft > 0) {
        flashLeft = Math.max(0, flashLeft - real);
        setOpacity(flashCover, (FLASH.opacity * flashLeft) / FLASH.seconds);
      }
    },

    ascend(on, intensity) {
      if (on) {
        focusOn = setOpacity(focus, 0);
        setOpacity(haze, 0);
        beamOn = setOpacity(beam, 0.55 + 0.45 * intensity);
        setOpacity(white, 0.55 + 0.35 * intensity);
      } else {
        beamOn = setOpacity(beam, 0);
        setOpacity(white, 0);
      }
    },

    // Faded by `step` on the frame loop, like the rest of the ground: no Animation to cancel.
    flash() {
      if (reduced()) return;
      flashLeft = FLASH.seconds;
      setOpacity(flashCover, FLASH.opacity);
    },

    hideAll() {
      for (const el of [blush, focus, speedField, haze, beam, white]) setOpacity(el, 0);
      speedFieldShown = { opacity: "0", angle: speedFieldShown.angle };
      focusOn = false;
      beamOn = false;
    },
  };
}
