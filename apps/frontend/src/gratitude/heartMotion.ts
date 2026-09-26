import type { ComboPhase, Tier } from "./combo";
import { clamp, easeInOutSine, lerp } from "./easing";

export interface HeartLayout {
  /** The heart's resting centre, in the stage's pixels. */
  rest: { x: number; y: number };
  width: number;
  height: number;
  /** The middle of the giver's picture, where the heart lands. */
  giver: { x: number; y: number };
  screen: { width: number; height: number };
}

/** One frame of the heart, for the engine to write. */
export interface HeartFrame {
  /** The page's shake and punch; empty while the page is still. */
  page: string;
  anchor: string;
  body: string;
  opacity: number;
  /** The heart's centre. */
  x: number;
  y: number;
}

export interface HeartMotionState {
  phase: ComboPhase;
  tier: Tier | null;
  intensity: number;
  reduced: boolean;
  /** How much of the catch window has passed, from 0 to 1. */
  sendingProgress: number;
  /** A thumb holding the heart: it leans toward the thumb's x, by up to `degrees`. */
  leanToward: { x: number; degrees: number } | null;
  /** Stroking: it stretches along the stroke, `angle` in degrees, with the thumb's speed in px/ms. */
  strokeStretch: { speed: number; angle: number } | null;
}

export interface HeartMotion {
  setLayout: (layout: HeartLayout) => void;
  /** A hit's press. */
  squash: (strength: number) => void;
  /** Shakes the page by up to `amplitude` px, dying away. */
  shake: (amplitude: number) => void;
  /** Swells the page by `amount`, dying away. */
  punch: (amount: number) => void;
  /** A drag on the heart pulls it `px` along `angle` degrees on a spring; 0 lets go. */
  pullTo: (px: number, angle: number | null) => void;
  /** Resolves as the heart lands in the giver's picture. */
  flyToGiver: () => Promise<void>;
  goLimp: () => void;
  /** Fades the heart out, unless it's already gone. */
  fadeOut: () => void;
  /** `dt` is play time, which stops while the screen is held; `real` is wall-clock time. Seconds. */
  step: (dt: number, real: number, state: HeartMotionState) => HeartFrame;
}

interface Point {
  x: number;
  y: number;
}

interface Flight {
  from: Point;
  via: Point;
  to: Point;
  startedAt: number;
  land: () => void;
}

interface Fade {
  from: number;
  seconds: number;
  elapsed: number;
  done?: () => void;
}

/** Springs the heart back to its spot, with a little overshoot. */
const HOLD = { stiffness: 260, damping: 0.62 };
/** A hit squashes the heart and it springs back past round, within these limits. */
const PRESS = { stiffness: 900, friction: 26, flattest: -0.16, tallest: 0.12, widening: 0.6 };
/** Waiting for the first tap, it breathes. */
const BREATH = { depth: 0.015, seconds: 2.6 };
/** Lub-dub: two thumps a beat, the second softer, both harder with intensity. */
const BEAT = {
  perSecond: 2.2,
  sharpness: 0.0016,
  lub: 0.06,
  dub: 0.22,
  dubShare: 0.7,
  depth: 0.03,
  depthWithIntensity: 0.02,
};
const HEARTBEAT_FROM: Tier = 2;
const TREMOR_FROM: Tier = 3;
/** Degrees either way at full intensity: the tremor turns the heart and never shifts it. */
const TREMOR_DEG = 1.4;
/** Waiting to be caught, it winds up: stretching toward the giver and leaning their way. */
const WIND_UP = { stretch: 0.07, leanDeg: 8 };
/** How fast the stretch settles on its target, a second. */
const STRETCH_RATE = 12;
/** A drag's pull: a loose spring, so letting go overshoots into a squash and wobbles out. */
const PULL = {
  stiffness: 420,
  damping: 0.3,
  reducedDamping: 1,
  maxPx: 160,
  stretch: 0.13,
  reduced: 0.05,
};
/** Stroking stretches it with the thumb's speed, up to `max`. */
const STROKE_STRETCH = { perSpeed: 0.16, max: 0.26 };
/** It leans toward a holding thumb this fast, a second. */
const LEAN_RATE = 8;
/** 昇天: it droops where it is, over play time, so the climax's freeze holds it too. */
const LIMP = { seconds: 0.5, leanDeg: 9, sag: 0.08 };
/** How fast the shake and the punch die away, a second. */
const SHAKE_DECAY = 14;
const PUNCH_DECAY = 12;
/** It arcs up and out, shrinks into the picture, and stretches along its path with its speed. */
const FLIGHT = {
  seconds: 0.38,
  endScale: 0.2,
  stretchPx: 40,
  maxStretch: 0.5,
  along: 0.2,
  outPx: 30,
  upPx: 40,
};
const REDUCED_FLIGHT_FADE_S = 0.25;
const FADE_OUT_S = 0.3;

const degrees = (radians: number) => (radians * 180) / Math.PI;
/** Starts slow and lands at speed. */
const flightEase = (t: number) => t * t * (1.6 - 0.6 * t);
const bezier = (a: number, via: number, b: number, t: number) =>
  (1 - t) ** 2 * a + 2 * (1 - t) * t * via + t ** 2 * b;
const thump = (beat: number, at: number) => Math.exp(-((beat - at) ** 2) / BEAT.sharpness);

/**
 * The heart's motion, a frame at a time. It holds its spot at every tier: only the endings move it,
 * into the giver's picture or limp where it is. The page shakes and swells around it, and the heart
 * is held out of both so its spot never moves under a thumb.
 */
export function createHeartMotion(layout: HeartLayout, random: () => number): HeartMotion {
  let L = layout;
  const pos = { x: layout.rest.x, y: layout.rest.y, vx: 0, vy: 0 };
  const press = { depth: 0, speed: 0 };
  const stretch = { scale: 1, angle: 0 };
  const pull = { px: 0, speed: 0, target: 0, angle: 90 };
  let lean = 0;
  /** Until the first frame, a new layout places the heart instead of springing it across. */
  let placed = false;
  let shakeAmplitude = 0;
  let punchAmount = 0;
  let play = 0;
  let wall = 0;
  let limpFrom: number | null = null;
  let flight: Flight | null = null;
  let fade: Fade | null = null;
  let landing: Promise<void> | null = null;
  let opacity = 1;
  /** As of the latest frame. */
  let reduced = false;

  return {
    setLayout(next) {
      L = next;
      if (!placed) {
        pos.x = next.rest.x;
        pos.y = next.rest.y;
      }
    },

    squash(strength) {
      press.speed -= strength;
    },

    shake(amplitude) {
      shakeAmplitude = Math.max(shakeAmplitude, amplitude);
    },

    punch(amount) {
      punchAmount = amount;
    },

    pullTo(px, angle) {
      pull.target = Math.min(PULL.maxPx, px);
      if (angle !== null) pull.angle = angle;
    },

    flyToGiver() {
      landing ??= new Promise<void>((land) => {
        if (reduced) {
          fade = { from: opacity, seconds: REDUCED_FLIGHT_FADE_S, elapsed: 0, done: land };
          return;
        }
        const from = { x: pos.x, y: pos.y };
        const to = { ...L.giver };
        const via = {
          x: lerp(from.x, to.x, FLIGHT.along) + FLIGHT.outPx,
          y: Math.min(from.y, to.y) - FLIGHT.upPx,
        };
        flight = { from, via, to, startedAt: play, land };
      });
      return landing;
    },

    goLimp() {
      limpFrom ??= play;
    },

    fadeOut() {
      if (opacity > 0 && !fade) fade = { from: opacity, seconds: FADE_OUT_S, elapsed: 0 };
    },

    step(dt, real, state) {
      placed = true;
      reduced = state.reduced;
      play += dt;
      wall += real;
      const tier = state.tier ?? -1;
      const h = Math.min(dt, 1 / 30);
      let rotate = 0;
      let scale = 1;

      const f = flight;
      if (f) {
        const k = clamp((play - f.startedAt) / FLIGHT.seconds, 0, 1);
        const e = flightEase(k);
        const x = bezier(f.from.x, f.via.x, f.to.x, e);
        const y = bezier(f.from.y, f.via.y, f.to.y, e);
        const vx = x - pos.x;
        const vy = y - pos.y;
        if (vx !== 0 || vy !== 0) {
          stretch.angle = degrees(Math.atan2(vy, vx));
          stretch.scale = 1 + Math.min(FLIGHT.maxStretch, Math.hypot(vx, vy) / FLIGHT.stretchPx);
        }
        pos.x = x;
        pos.y = y;
        scale = lerp(1, FLIGHT.endScale, e);
        if (k >= 1) {
          flight = null;
          opacity = 0;
          f.land();
        }
      } else {
        const damping = 2 * Math.sqrt(HOLD.stiffness) * HOLD.damping;
        pos.vx += (-(pos.x - L.rest.x) * HOLD.stiffness - pos.vx * damping) * h;
        pos.vy += (-(pos.y - L.rest.y) * HOLD.stiffness - pos.vy * damping) * h;
        pos.x += pos.vx * h;
        pos.y += pos.vy * h;
      }

      // Two half steps keep the stiff press spring steady when a frame runs long.
      for (let i = 0; i < 2; i++) {
        press.speed += (-press.depth * PRESS.stiffness - press.speed * PRESS.friction) * (h / 2);
        press.depth += press.speed * (h / 2);
      }
      press.depth = clamp(press.depth, PRESS.flattest, PRESS.tallest);
      let sx = 1 - press.depth * PRESS.widening;
      let sy = 1 + press.depth;

      if (state.phase === "ready" && !state.reduced) {
        const b = 1 + BREATH.depth * (1 - Math.cos((wall * Math.PI * 2) / BREATH.seconds));
        sx *= b;
        sy *= b;
      }
      if (state.phase === "running" && tier >= HEARTBEAT_FROM && !state.reduced) {
        const beat = (wall * BEAT.perSecond) % 1;
        const thumps = thump(beat, BEAT.lub) + BEAT.dubShare * thump(beat, BEAT.dub);
        const b = 1 + (BEAT.depth + BEAT.depthWithIntensity * state.intensity) * thumps;
        sx *= b;
        sy *= b;
      }

      const leanTarget = state.leanToward
        ? clamp((state.leanToward.x - pos.x) / 160, -1, 1) * state.leanToward.degrees
        : 0;
      lean += (leanTarget - lean) * Math.min(1, real * LEAN_RATE);
      rotate += lean;

      const r = Math.min(real, 1 / 30);
      if (r > 0) {
        const damping =
          2 * Math.sqrt(PULL.stiffness) * (state.reduced ? PULL.reducedDamping : PULL.damping);
        for (let i = 0; i < 2; i++) {
          pull.speed +=
            (-(pull.px - pull.target) * PULL.stiffness - pull.speed * damping) * (r / 2);
          pull.px += pull.speed * (r / 2);
        }
        if (!pull.target && Math.abs(pull.px) < 0.05 && Math.abs(pull.speed) < 0.5) {
          pull.px = pull.speed = 0;
        }
      }
      if (!flight) {
        const pulled = pull.px !== 0 || pull.target !== 0;
        let target = 1;
        let angle = stretch.angle;
        if (state.strokeStretch) {
          target =
            1 + Math.min(STROKE_STRETCH.max, state.strokeStretch.speed * STROKE_STRETCH.perSpeed);
          angle = state.strokeStretch.angle;
        } else if (pulled) {
          target = 1 + (state.reduced ? PULL.reduced : PULL.stretch) * Math.tanh(pull.px / 100);
          angle = pull.angle;
        } else if (state.phase === "sending") {
          const k = easeInOutSine(clamp(state.sendingProgress, 0, 1));
          target = 1 + WIND_UP.stretch * k;
          rotate -= WIND_UP.leanDeg * k;
          angle = degrees(Math.atan2(L.giver.y - L.rest.y, L.giver.x - L.rest.x));
        }
        // The pull's spring already carries the motion; anything else eases to its stretch.
        if (pulled) {
          stretch.scale = target;
          stretch.angle = angle;
        } else {
          stretch.scale += (target - stretch.scale) * Math.min(1, real * STRETCH_RATE);
          if (target !== 1) stretch.angle = angle;
        }
      }

      if (tier >= TREMOR_FROM && limpFrom === null && !state.reduced) {
        const tremor = TREMOR_DEG * state.intensity;
        if (tremor > 0.05) rotate += (random() - 0.5) * tremor * 2;
      }
      if (limpFrom !== null) {
        const limp = clamp((play - limpFrom) / LIMP.seconds, 0, 1);
        rotate += LIMP.leanDeg * limp;
        sy *= 1 - LIMP.sag * limp;
      }

      // Stretches along its angle without turning the heart; the squash and the beat stay upright.
      const { scale: s, angle: a } = stretch;
      const stretchTransform =
        Math.abs(s - 1) > 0.004
          ? `rotate(${a.toFixed(2)}deg) scale(${s.toFixed(4)}, ${(1 / Math.sqrt(s)).toFixed(4)}) rotate(${(-a).toFixed(2)}deg) `
          : "";

      let px = 0;
      let py = 0;
      let ps = 1;
      if (shakeAmplitude > 0.05 && !state.reduced) {
        px = (random() - 0.5) * 2 * shakeAmplitude;
        py = (random() - 0.5) * 2 * shakeAmplitude;
      }
      shakeAmplitude *= Math.exp(-real * SHAKE_DECAY);
      if (punchAmount > 0.001 && !state.reduced) {
        ps = 1 + punchAmount;
        punchAmount *= Math.exp(-real * PUNCH_DECAY);
      } else punchAmount = 0;
      const pageMoved = px !== 0 || py !== 0 || ps !== 1;
      // The page moves and scales about its middle; the heart takes the inverse, so it stays put.
      let hx = pos.x;
      let hy = pos.y;
      let hs = scale;
      if (pageMoved) {
        const ox = L.screen.width / 2;
        const oy = L.screen.height / 2;
        hx = ox + (pos.x - ox - px) / ps;
        hy = oy + (pos.y - oy - py) / ps;
        hs = scale / ps;
      }

      const fading = fade;
      if (fading) {
        fading.elapsed += real;
        const k = clamp(fading.elapsed / fading.seconds, 0, 1);
        opacity = fading.from * (1 - k);
        if (k >= 1) {
          fade = null;
          fading.done?.();
        }
      }

      return {
        page: pageMoved
          ? `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) scale(${ps.toFixed(4)})`
          : "",
        anchor: `translate(${(hx - L.width / 2).toFixed(2)}px, ${(hy - L.height / 2).toFixed(2)}px) rotate(${rotate.toFixed(2)}deg) scale(${hs.toFixed(4)})`,
        body: `${stretchTransform}scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
        opacity,
        x: pos.x,
        y: pos.y,
      };
    },
  };
}
