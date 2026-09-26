import type { Method, Tier } from "./combo";
import { EASE_PEEL, clamp } from "./easing";
import { DENT_SVG, focusLinesSvg, HAZE_WAVE_SVG, speedFieldSvg, VIBRATE_SVG } from "./heartArt";
import type { ScreenEdge } from "./heartMotion";
import { animate } from "./webAnimations";

export interface TierBackground {
  setLayout: (
    width: number,
    height: number,
    heart: { x: number; y: number; height: number },
  ) => void;
  /** Stroking has its own speed lines, so the focus lines keep out of its way. */
  show: (tier: Tier | null, intensity: number, method: Method) => void;
  /** The stroke's speed lines, turned to its axis in degrees; unseen changes aren't written. */
  setSpeedField: (opacity: number, angle: number) => void;
  /** `real`: wall-clock seconds since the last frame. */
  step: (real: number) => void;
  /** 昇天's climax: the light beams and the white-out take the ground over. */
  ascend: (on: boolean, intensity: number) => void;
  flash: () => void;
  hideAll: () => void;
  /** The screen's corner peels up by `amount`, 0–1: a hard shake could shake the heart loose. */
  liftCorner: (amount: number) => void;
  /**
   * Where the loose heart hit an edge, `along` px along it, the edge dents in. `across` is the
   * hit's place on the other axis, so a dent in the top wall, the HUD's underside, shows where the
   * heart hit it; without it, the dent sits on the screen's own edge.
   */
  dent: (edge: ScreenEdge, along: number, across?: number) => void;
  /** Takes what it put in `front` away; the engine empties the ground. */
  destroy: () => void;
}

/** The focus lines' two drawings, which alternate so the lines flicker like a hand-drawn loop. */
const FOCUS_SEEDS = [4242, 7777];
const FOCUS_FPS = 8;
const RAYS_DEG_PER_S = 6;
const FLASH = { opacity: 0.7, seconds: 0.32 };
const SPEED_FIELD_SEED = 31;
/** The least change in the speed lines' opacity or angle, in degrees, worth writing. */
const SPEED_FIELD_STEP = { opacity: 0.02, degrees: 1 };
/** Dents on screen at most; past this the oldest is reused. */
const DENTS = 6;
/** How fast the corner follows its lift, a second. */
const CORNER_RATE = 10;

/** A decorative layer: none of it is for screen readers. */
const layer = (className: string) => {
  const el = document.createElement("div");
  el.className = className;
  el.setAttribute("aria-hidden", "true");
  return el;
};

/** Writes a layer's opacity, letting its CSS transition ease it; true if the layer shows. */
const setOpacity = (el: HTMLElement, value: number) => {
  el.style.opacity = value > 0 ? clamp(value, 0, 1).toFixed(3) : "0";
  return value > 0;
};

/** How far apart two angles are, in degrees, the short way round: 179° and −179° are 2° apart. */
const degreesApart = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * The ground behind the heart, escalating with the tier: the calm liner, a warm blush, 集中線 focus
 * lines, heat haze, then 昇天's light beams and white-out. Each layer fades in and out on its own,
 * and the stylesheet keeps them all out of the header's band.
 *
 * `front` takes what sits over the heart: the peeling corner, the dents, the shake marks, which the
 * stylesheet shows while the screen's `data-shaking` is on, and 昇天's flash.
 */
export function createTierBackground(
  ground: HTMLElement,
  front: HTMLElement,
  reduced: () => boolean,
  /** How fast the dents play: a replay's clock's speed. */
  rate = 1,
): TierBackground {
  const blush = layer("gr-bg gr-bg-blush");
  const focus = layer("gr-focus");
  focus.dataset.v = "0";
  const speedField = layer("gr-speedfield");
  speedField.innerHTML = speedFieldSvg(SPEED_FIELD_SEED);
  const speedLines = speedField.firstElementChild;
  const haze = layer("gr-bg gr-haze");
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
  ground.append(blush, focus, speedField, haze, beam, white);
  // In front, not in the ground, whose mask would keep it under the header: it covers the whole
  // page, the heart and the HUD too.
  const flashCover = layer("gr-flash");

  const cornerUnder = layer("gr-corner-under");
  const cornerFlap = layer("gr-corner-flapwrap");
  cornerFlap.append(layer("gr-corner-flap"));
  const corner = layer("gr-corner");
  corner.append(cornerUnder, cornerFlap);
  // The stylesheet peels the top right, where the close button sits over the lifted corner and
  // hides nearly all of it. Mirrored, it peels the bottom right, where nothing covers it.
  Object.assign(corner.style, { top: "auto", bottom: "0", transform: "scaleY(-1)" });
  const dentLayer = layer("gr-layer");
  const shakeMarks = layer("gr-shakemarks");
  shakeMarks.innerHTML = VIBRATE_SVG + VIBRATE_SVG;
  front.append(corner, dentLayer, shakeMarks, flashCover);
  const dents: { el: HTMLElement; animation: Animation | null }[] = [];
  let screen = { width: 390, height: 741 };
  let cornerLift = 0;
  let cornerShown = 0;

  let clock = 0;
  let focusOn = false;
  let beamOn = false;
  /** Seconds of the flash still to fade. */
  let flashLeft = 0;
  /** What the speed lines last had written; `angle` is null until one is. */
  const speedFieldShown: { opacity: number; angle: number | null } = { opacity: 0, angle: null };

  return {
    setLayout(width, height, heart) {
      screen = { width, height };
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
      // Called nearly every frame of a stroke, and the layer covers the screen, so only a change
      // you'd see is written. Hiding is always written, so no faint field is left to composite.
      const next = opacity > 0 ? clamp(opacity, 0, 1) : 0;
      const change = Math.abs(next - speedFieldShown.opacity);
      if (next === 0 ? speedFieldShown.opacity !== 0 : change >= SPEED_FIELD_STEP.opacity) {
        setOpacity(speedField, next);
        speedFieldShown.opacity = next;
      }
      // Hidden lines needn't turn; they turn as they show again.
      if (speedFieldShown.opacity === 0 || !(speedLines instanceof SVGElement)) return;
      const last = speedFieldShown.angle;
      if (last !== null && degreesApart(angle, last) < SPEED_FIELD_STEP.degrees) return;
      speedLines.style.transform = `rotate(${angle.toFixed(1)}deg)`;
      speedFieldShown.angle = angle;
    },

    step(real) {
      clock += real;
      if (cornerShown !== cornerLift) {
        cornerShown += (cornerLift - cornerShown) * Math.min(1, real * CORNER_RATE);
        if (Math.abs(cornerLift - cornerShown) < 0.005) cornerShown = cornerLift;
        const scale = `scale(${(cornerShown < 0.005 ? 0 : cornerShown).toFixed(3)})`;
        cornerUnder.style.transform = scale;
        cornerFlap.style.transform = scale;
      }
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
      speedFieldShown.opacity = 0;
      cornerLift = 0;
      focusOn = false;
      beamOn = false;
    },

    destroy() {
      for (const dent of dents) dent.animation?.cancel();
      for (const el of [corner, dentLayer, shakeMarks, flashCover]) el.remove();
    },

    liftCorner(amount) {
      cornerLift = clamp(amount, 0, 1);
    },

    dent(edge, along, across) {
      const { width, height } = screen;
      const at =
        edge === "top"
          ? `translate(${along}px,${across ?? 0}px) rotate(0deg)`
          : edge === "bottom"
            ? `translate(${along}px,${across ?? height}px) rotate(180deg)`
            : edge === "left"
              ? `translate(${across ?? 0}px,${along}px) rotate(-90deg)`
              : `translate(${across ?? width}px,${along}px) rotate(90deg)`;
      const dent = (dents.length >= DENTS ? dents.shift() : undefined) ?? {
        el: Object.assign(dentLayer.appendChild(layer("gr-dent")), { innerHTML: DENT_SVG }),
        animation: null,
      };
      dents.push(dent);
      dent.animation?.cancel();
      dent.animation = animate(
        dent.el,
        [
          { transform: `${at} scale(1.3, 1.6)`, opacity: 1 },
          { offset: 0.12, transform: `${at} scale(1, 1)`, opacity: 1 },
          { offset: 0.6, transform: `${at} scale(.9, .7)`, opacity: 0.9 },
          { transform: `${at} scale(.7, .2)`, opacity: 0 },
        ],
        { duration: 1500, easing: EASE_PEEL, fill: "both" },
        rate,
      );
    },
  };
}
