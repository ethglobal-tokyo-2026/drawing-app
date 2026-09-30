/**
 * The seal ceremony as numbers: where every part stands at time t. The cut runs, the resin pours,
 * rises and forms, the sticker peels off its backing and flies onto the card, then the card's lines
 * fade up. SealCeremony writes one frame to the page per animation frame.
 */
import { clamp01, easeOutCubic as easeOut } from "../../ui/easing";

export const TOTAL = 2580;

/** How long the ceremony takes to fade when the drawing screen comes back. */
export const LEAVE_MS = 260;

/** When each part starts and ends, in ms. */
export const T = {
  cut0: 110,
  cut1: 760,
  dim0: 160,
  dim1: 650,
  flow0: 780,
  flow1: 1180,
  rise0: 1000,
  rise1: 1320,
  form0: 1180,
  form1: 1500,
  peel0: 1440,
  peel1: 1820,
  card0: 1860,
  card1: 2220,
  move0: 1860,
  move1: 2280,
  land: 2200,
  txt0: 2080,
};

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the sticker goes: up off its backing, then across to the card's slot. */
export interface Flight {
  /** The peel's lift, in px. */
  peel: { x: number; y: number };
  /** From its place on the sheet to the slot's middle, in px. */
  dx: number;
  dy: number;
  /** The size that fits its body in the slot. */
  scale: number;
}

/** `box` is the sticker image, `body` the cut inside its margin, and `slot` the card's sticker slot. */
export function flight(box: Box, body: { w: number; h: number }, slot: Box): Flight {
  return {
    peel: { x: -14, y: -Math.min(120, body.h * 0.55) },
    dx: slot.x + slot.w / 2 - (box.x + box.w / 2),
    dy: slot.y + slot.h / 2 - (box.y + box.h / 2),
    scale: Math.min((slot.w * 0.9) / body.w, (slot.h * 0.94) / body.h, 1.15),
  };
}

export interface SealFrame {
  /** How far the cut line has run around the contour (0–1), and its opacity. */
  cut: { progress: number; alpha: number };
  /** The dim over the paper outside the cut. */
  dim: number;
  /** The card's scrim. */
  veil: number;
  /** The print, which stands in for the ink once the cut is made. */
  plain: number;
  /** The resin's wet front. */
  pour: { scale: number; turn: number; opacity: number };
  tint: number;
  lens: number;
  gloss: number;
  spec: { opacity: number; scale: number };
  rim: number;
  sticker: {
    x: number;
    y: number;
    rotate: number;
    rotateX: number;
    rotateY: number;
    scale: number;
  };
  /** The cast shadow stays flat on the sheet: it moves with the sticker but never tilts. */
  shadow: { opacity: number; x: number; y: number; rotate: number; scale: number };
  /** Off its backing: the ink it was cut from is gone from the sheet. */
  lifted: boolean;
  /** The used sticker silhouette it leaves in the sheet. */
  usedStickerSilhouette: number;
  card: { opacity: number; y: number };
  /** The card's lines, each fading up in turn. */
  items: { opacity: number; y: number }[];
  done: boolean;
}

export function sealFrame(t: number, path: Flight, items: number): SealFrame {
  const span = (a: number, b: number) => clamp01((t - a) / (b - a));

  const pf = span(T.flow0, T.flow1);
  const risen = easeOut(span(T.rise0, T.rise1));
  const puff = 1 + 0.024 * Math.sin(Math.PI * span(T.rise0, T.rise1 + 60));
  const formed = easeOut(span(T.form0, T.form1));

  // Peel: up off the backing, tilted as if held by a corner. Place: across to the card, then stick.
  const peeled = easeOut(span(T.peel0, T.peel1));
  const pm = span(T.move0, T.move1);
  const moved = easeInOut(pm);
  const up = peeled * (1 - moved);
  const x = path.peel.x * up + path.dx * moved;
  const y = path.peel.y * up + path.dy * moved;
  const rotate = -6 * up - 2 * moved;
  const land =
    pm <= 0 ? 1 : pm < 0.72 ? 1 + 0.05 * (pm / 0.72) : 1 + 0.05 * (1 - easeOut((pm - 0.72) / 0.28));
  const scale = (1 + 0.03 * peeled + (path.scale - 1 - 0.03 * peeled) * moved) * land * puff;
  const height = Math.min(1, up + (land - 1) * 8);
  const card = easeOut(span(T.card0, T.card1));

  return {
    cut: { progress: easeInOut(span(T.cut0, T.cut1)), alpha: 1 - span(T.peel0, T.peel0 + 220) },
    // The paper dims for the cut, then turns back into white kiss-cut paper for the peel.
    dim: 0.66 * easeOut(span(T.dim0, T.dim1)) * (1 - easeOut(span(T.peel0, T.peel0 + 320))),
    veil: card,
    plain: t >= T.cut1 ? 1 : 0,
    pour: {
      scale: 0.02 + 0.98 * easeOut(pf),
      turn: -10 + 22 * pf,
      opacity: pf <= 0 ? 0 : 1 - span(T.flow1 - 40, T.flow1 + 220),
    },
    tint: risen,
    lens: risen,
    gloss: easeOut(span(T.rise0 + 80, T.rise1 + 80)),
    spec: { opacity: formed, scale: 1.8 - 0.8 * formed },
    rim: easeOut(span(T.form0 + 90, T.form1 + 40)),
    sticker: { x, y, rotate, rotateX: -11 * up, rotateY: 9 * up, scale },
    shadow: {
      opacity: t < T.peel0 ? 0 : 0.45 + 0.25 * height,
      x: x + 3 + 11 * height,
      y: y + 5 + 20 * height,
      rotate,
      scale: scale * (1 + 0.03 * height),
    },
    lifted: t >= T.peel0,
    usedStickerSilhouette: t >= T.peel0 ? 1 - span(T.card1, T.card1 + 260) : 0,
    card: { opacity: Math.min(1, card * 1.8), y: (1 - card) * 60 },
    items: Array.from({ length: items }, (_, i) => {
      const u = easeOut(span(T.txt0 + i * 40, T.txt0 + i * 40 + 240));
      return { opacity: u, y: (1 - u) * 6 };
    }),
    done: t >= TOTAL,
  };
}

/**
 * Where the ceremony waits while the server seals the sticker: the cut is made and the paper around it
 * dimmed. The resin, the peel and the card all say it's sealed, so none of them starts before it is.
 */
export const HOLD = T.cut1;

/** Where the ceremony runs to: the wait until the seal is recorded, then the end. */
export const stopAt = (recorded: boolean) => (recorded ? TOTAL : HOLD);

/**
 * How far into the ceremony it is, `dt` ms after `t`. It waits at HOLD until the seal is recorded;
 * under reduced motion it goes straight to the wait, and on to the end once recorded.
 */
export function ceremonyTime(
  t: number,
  dt: number,
  { recorded, reduced }: { recorded: boolean; reduced: boolean },
): number {
  const stop = stopAt(recorded);
  return reduced ? stop : Math.min(stop, t + Math.max(0, dt));
}

/** While it waits, the cutter keeps running round the cut: this fast, in px per ms… */
const CUTTER_SPEED = 0.42;
/** …but a lap never takes less or more than these, however short or long the line. */
const LAP_MIN = 1300;
const LAP_MAX = 2600;
/** The cut leaves it at rest, and it gets up to speed over this long. */
const CUTTER_RAMP = 500;

/**
 * Where the cutter is `ms` into the wait, as a share (0–1) of a cut line `length` px long: it keeps
 * running round the cut, pass after pass, from where the cut ended.
 */
export function cutterAt(ms: number, length: number): number {
  const lap = Math.min(LAP_MAX, Math.max(LAP_MIN, length / CUTTER_SPEED));
  const run = ms < CUTTER_RAMP ? (ms * ms) / (2 * CUTTER_RAMP) : ms - CUTTER_RAMP / 2;
  return (Math.max(0, run) / lap) % 1;
}
