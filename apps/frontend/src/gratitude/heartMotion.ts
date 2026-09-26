import type { ComboPhase, Tier } from "./combo";
import { clamp, lerp } from "./easing";
import { FEEL_CONFIG } from "./gameConfig";

export interface HeartLayout {
  /** The heart's resting centre, in the stage's pixels. */
  rest: { x: number; y: number };
  width: number;
  height: number;
  /** The middle of the giver's picture, where the heart lands. */
  giver: { x: number; y: number };
  screen: { width: number; height: number };
  /** The loose heart's top edge keeps below this: the HUD's underside. */
  ceiling: number;
}

export type ScreenEdge = "left" | "right" | "top" | "bottom";

/** The loose heart hit an edge hard. */
export interface WallHit {
  edge: ScreenEdge;
  /** Where it hit, on the edge. */
  x: number;
  y: number;
  /** Pointing off the edge, into the screen. */
  normal: { x: number; y: number };
  /** px/s into the edge. */
  speed: number;
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
  /** Its size, as a share of its resting size: smaller loose and in flight. */
  scale: number;
}

export interface HeartMotionState {
  phase: ComboPhase;
  tier: Tier | null;
  intensity: number;
  reduced: boolean;
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
  /** Jiggles like jelly, by at least `amount`. */
  wobble: (amount: number) => void;
  /** A hard shake in a rhythm: the jiggle builds. */
  jiggle: () => void;
  /** The wrist: a sideways move in m/s² sways it, and gravity's sideways pull tilts it. */
  swayWith: (ax: number, gx: number | null) => void;
  /** The wrist no longer moves it: its sway and tilt ease back upright. */
  stopSway: () => void;
  /** It comes loose and ricochets off the screen's edges until an ending takes it. */
  comeLoose: () => void;
  /** A shake reversal sends the loose heart along, against the phone's move. */
  kickLoose: (direction: { x: number; y: number }, strength: number) => void;
  /** The combo is over: no pull, jiggle, sway or tilt carries on, and a loose heart stops where it is. */
  calm: () => void;
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
  /** Its size as it sets off: smaller if it was loose. */
  fromScale: number;
  startedAt: number;
  land: () => void;
}

/** Where a loose heart stopped as the combo ended, and its size there. */
interface Settled {
  x: number;
  y: number;
  scale: number;
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
/** Stroking stretches it with the thumb's speed, up to `max`, or FEEL_CONFIG's less with reduced motion. */
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
/** Jelly: its wobble's pace in radians a second, how fast it dies away, and its most. */
const JELLY = { pace: 17, decay: 2.2, most: 0.16, perShake: 0.04 };
/** The wrist: a spring the phone's sideways moves drive, in degrees, and the tilt with its roll. */
const SWAY = {
  stiffness: 60,
  damping: 5,
  drive: 40,
  most: 10,
  driveDecay: 8,
  perAccel: 1.6,
  maxDrive: 30,
};
const TILT = { perGravity: 0.9, most: 8, rate: 5 };
/** Loose: it shrinks to `scale`, slows by `drag` a second and keeps `bounce` of its speed off an edge. */
const LOOSE = { scale: 0.62, shrinkRate: 8, drag: 0.9, bounce: 0.82, launch: -420, hardHit: 150 };
/** A kick from a shake reversal, in px/s: its base, more with the shake's strength, and some scatter. */
const KICK = { base: 620, perStrength: 18, most: 500, scatterX: 320, scatterY: 560 };
/** A hard hit squashes it against the edge. */
const IMPACT = { per: 1 / 1400, least: 0.08, most: 0.32, decay: 16 };
const FADE_OUT_S = 0.3;

const degrees = (radians: number) => (radians * 180) / Math.PI;
/** A stretch looks the same turned half a turn: the way from `from` to `to`, at most 90° either way. */
const axisTurn = (from: number, to: number) => ((((to - from) % 180) + 270) % 180) - 90;
/** Starts slow and lands at speed. */
const flightEase = (t: number) => t * t * (1.6 - 0.6 * t);
const bezier = (a: number, via: number, b: number, t: number) =>
  (1 - t) ** 2 * a + 2 * (1 - t) * t * via + t ** 2 * b;
const thump = (beat: number, at: number) => Math.exp(-((beat - at) ** 2) / BEAT.sharpness);

/**
 * The heart's motion, a frame at a time. It holds its spot at every tier: only the endings move it,
 * into the giver's picture or limp where it is. The page shakes and swells around it, and the heart
 * is held out of both so its spot never moves under a thumb. `scale`: the stage's size over the live
 * game's, which the loose heart's speeds and the flight's arc shrink with.
 */
export function createHeartMotion(
  layout: HeartLayout,
  random: () => number,
  onWallHit: (hit: WallHit) => void,
  scale = 1,
): HeartMotion {
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
  const jelly = { amount: 0, phase: 0 };
  const sway = { angle: 0, speed: 0, drive: 0 };
  const tilt = { target: 0, now: 0 };
  let loose: { x: number; y: number; vx: number; vy: number; scale: number } | null = null;
  let settled: Settled | null = null;
  let impact = { angle: 0, amount: 0 };
  let flight: Flight | null = null;
  let fade: Fade | null = null;
  let landing: Promise<void> | null = null;
  let opacity = 1;
  /** As of the latest frame. */
  let reduced = false;
  /** The size it was last drawn at. */
  let drawnScale = 1;

  /** A loose heart stops where it is, at its size, and ricochets no more. */
  const settle = () => {
    if (loose) settled = { x: loose.x, y: loose.y, scale: loose.scale };
    loose = null;
  };

  /** Ricochets off the edges; a hard hit squashes it and is reported. */
  function stepLoose(
    f: { x: number; y: number; vx: number; vy: number; scale: number },
    dt: number,
  ) {
    const { width, height } = L.screen;
    f.scale += (LOOSE.scale - f.scale) * Math.min(1, dt * LOOSE.shrinkRate);
    const r = L.width * 0.5 * f.scale * 0.92;
    const drag = Math.exp(-LOOSE.drag * dt);
    f.vx *= drag;
    f.vy *= drag;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const hit = (
      edge: ScreenEdge,
      speed: number,
      x: number,
      y: number,
      angle: number,
      normal: { x: number; y: number },
    ) => {
      if (Math.abs(speed) <= LOOSE.hardHit * scale) return;
      const amount = (Math.abs(speed) / scale) * IMPACT.per;
      impact = { angle, amount: clamp(amount, IMPACT.least, IMPACT.most) };
      onWallHit({ edge, x, y, normal, speed: Math.abs(speed) });
    };
    const minX = r + 2;
    const maxX = width - r - 2;
    // The ceiling holds its top edge, so it never rises over the HUD.
    const minY = Math.max(r + 2, L.ceiling + r);
    const maxY = height - r - 2;
    if (f.x < minX) {
      f.x = minX;
      if (f.vx < 0) {
        hit("left", f.vx, 0, f.y, 0, { x: 1, y: 0 });
        f.vx = -f.vx * LOOSE.bounce;
      }
    }
    if (f.x > maxX) {
      f.x = maxX;
      if (f.vx > 0) {
        hit("right", f.vx, width, f.y, 0, { x: -1, y: 0 });
        f.vx = -f.vx * LOOSE.bounce;
      }
    }
    if (f.y < minY) {
      f.y = minY;
      if (f.vy < 0) {
        hit("top", f.vy, f.x, f.y - r, 90, { x: 0, y: 1 });
        f.vy = -f.vy * LOOSE.bounce;
      }
    }
    if (f.y > maxY) {
      f.y = maxY;
      if (f.vy > 0) {
        hit("bottom", f.vy, f.x, height, 90, { x: 0, y: -1 });
        f.vy = -f.vy * LOOSE.bounce;
      }
    }
  }

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
        settle();
        if (reduced) {
          fade = { from: opacity, seconds: REDUCED_FLIGHT_FADE_S, elapsed: 0, done: land };
          return;
        }
        const from = { x: pos.x, y: pos.y };
        const to = { ...L.giver };
        const via = {
          x: lerp(from.x, to.x, FLIGHT.along) + FLIGHT.outPx * scale,
          y: Math.min(from.y, to.y) - FLIGHT.upPx * scale,
        };
        flight = { from, via, to, fromScale: drawnScale, startedAt: play, land };
        settled = null;
      });
      return landing;
    },

    goLimp() {
      limpFrom ??= play;
      settle();
    },

    wobble(amount) {
      jelly.amount = Math.max(jelly.amount, amount);
    },

    jiggle() {
      jelly.amount = Math.min(JELLY.most, jelly.amount + JELLY.perShake);
    },

    swayWith(ax, gx) {
      if (gx !== null) tilt.target = clamp(gx * TILT.perGravity, -TILT.most, TILT.most);
      sway.drive = clamp(-ax * SWAY.perAccel, -SWAY.maxDrive, SWAY.maxDrive);
    },

    stopSway() {
      sway.drive = 0;
      tilt.target = 0;
    },

    comeLoose() {
      sway.angle = sway.speed = sway.drive = 0;
      tilt.target = tilt.now = 0;
      loose ??= { x: pos.x, y: pos.y, vx: 0, vy: LOOSE.launch * scale, scale: 1 };
    },

    kickLoose(direction, strength) {
      if (!loose) return;
      const k = (KICK.base + Math.min(KICK.most, strength * KICK.perStrength)) * scale;
      loose.vx += -direction.x * k + (random() - 0.5) * KICK.scatterX * scale;
      loose.vy += direction.y * k + (random() - 0.5) * KICK.scatterY * scale;
    },

    calm() {
      pull.target = 0;
      jelly.amount = 0;
      sway.drive = 0;
      tilt.target = 0;
      settle();
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
          const moved = Math.hypot(vx, vy) / (FLIGHT.stretchPx * scale);
          stretch.scale = 1 + Math.min(FLIGHT.maxStretch, moved);
        }
        pos.x = x;
        pos.y = y;
        scale = lerp(f.fromScale, FLIGHT.endScale, e);
        if (k >= 1) {
          flight = null;
          opacity = 0;
          f.land();
        }
      } else if (loose) {
        stepLoose(loose, dt);
        pos.x = loose.x;
        pos.y = loose.y;
        scale = loose.scale;
      } else if (settled) {
        pos.x = settled.x;
        pos.y = settled.y;
        scale = settled.scale;
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
          const most = state.reduced ? FEEL_CONFIG.stroke.reducedStretch : STROKE_STRETCH.max;
          target = 1 + Math.min(most, state.strokeStretch.speed * STROKE_STRETCH.perSpeed);
          angle = state.strokeStretch.angle;
        } else if (pulled) {
          target = 1 + (state.reduced ? PULL.reduced : PULL.stretch) * Math.tanh(pull.px / 100);
          angle = pull.angle;
        }
        // The pull's spring already carries the motion; anything else eases to its stretch, turning
        // the short way round, so a new stretch takes over from the last without a jump.
        if (pulled) {
          stretch.scale = target;
          stretch.angle = angle;
        } else {
          const k = Math.min(1, real * STRETCH_RATE);
          stretch.scale += (target - stretch.scale) * k;
          if (target !== 1) stretch.angle += axisTurn(stretch.angle, angle) * k;
        }
      }

      if (jelly.amount > 0.002) {
        jelly.phase += real * JELLY.pace;
        const w = Math.sin(jelly.phase) * jelly.amount;
        sx *= 1 + w;
        sy *= 1 - w;
        jelly.amount *= Math.exp(-real * JELLY.decay);
      }
      let impactTransform = "";
      if (impact.amount > 0.01) {
        const a = impact.angle;
        impactTransform = `rotate(${a}deg) scale(${(1 - impact.amount * 0.9).toFixed(4)}, ${(1 + impact.amount * 0.5).toFixed(4)}) rotate(${-a}deg) `;
        impact.amount *= Math.exp(-real * IMPACT.decay);
      }
      if (r > 0 && !state.reduced) {
        sway.speed +=
          (-sway.angle * SWAY.stiffness - sway.speed * SWAY.damping + sway.drive * SWAY.drive) * r;
        sway.angle = clamp(sway.angle + sway.speed * r, -SWAY.most, SWAY.most);
        sway.drive *= Math.exp(-r * SWAY.driveDecay);
        tilt.now += (tilt.target - tilt.now) * Math.min(1, r * TILT.rate);
      }
      if (!loose && !flight) rotate += sway.angle + tilt.now;

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

      drawnScale = scale;
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
        body: `${stretchTransform}${impactTransform}scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
        opacity,
        x: pos.x,
        y: pos.y,
        scale,
      };
    },
  };
}
