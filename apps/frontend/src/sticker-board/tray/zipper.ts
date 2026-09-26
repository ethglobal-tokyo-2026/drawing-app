/**
 * The sticker tray's Zipper, down the Sticker Board's right edge; it's the tray's alone. The slider rests
 * at the top and is pulled down to open, as real zippers open, and pushed back up to close. The left row
 * parts toward the board; the right row stays sewn to the tray.
 *
 * It's drawn from the real part: two woven tapes, molded teeth in two rows offset by half a pitch, a top
 * stop on each tape, a bottom stop across both, a slider whose wedge parts the teeth behind it, and a pull
 * hinged on the slider's bridge. Every tooth is its own element with a slice of its tape, placed each
 * frame along the mouth's curve, and the lining is a stack of slivers scaled across, so motion is
 * transform and opacity only, on one rAF loop that sleeps whenever everything is still.
 *
 * Coordinates: `a` runs along the track from the rest end at the top down to the far end at `L`; `c`
 * runs across from the chain's center line, negative toward the board.
 */
import { timeOurWork } from "../../performance/performanceRecorder";
import "./zipper.css";

type ZipperState = "rest" | "drag" | "run" | "hint";
/** Which end the pull lies toward: at rest it hangs toward the far end, ready to be pulled open. */
type Facing = "rest" | "far";

export interface ZipperOptions {
  /** From the host's left edge to the chain's center line; by default the chain runs near its right edge. */
  chainAt?: number;
  /** Space kept clear above and below the track. */
  insets?: readonly [top: number, bottom: number];
  /** Tooth to tooth along one row. */
  pitch?: number;
  /** How far the left row travels when fully open and spread flat. */
  maxGap?: number;
  /** Released past this share of the travel, the slider runs the rest of the way. */
  threshold?: number;
  /** Released faster than this toward open or shut, in travels per second, it runs that way. */
  flick?: number;
  /** The slider's accessible name. */
  label?: string;
  /** Where the slider starts, from shut to open. */
  progress?: number;
  /** A buzz for teeth and knocks, where the phone can. */
  haptics?: boolean;
  /** Phone motion swings the pull, unless reduced motion is on. */
  motion?: boolean;
}

interface RunOptions {
  /** Jump to the end at once; the default under reduced motion. */
  instant?: boolean;
}

/** A still pose; set only what should change. */
interface ZipperPose {
  progress?: number;
  open?: boolean;
  spread?: number;
  facing?: Facing;
  /** The pull's flop, in radians: zero lies toward the far end. */
  flip?: number;
  lift?: number;
  /** The pull's swing on its hinge, in degrees. */
  swing?: number;
  relax?: number;
  /** The mouth's width; by default where it would settle. */
  mouth?: number;
  /** Nothing moves, and drags, tugs and phone motion are ignored, until a pose without it. */
  freeze?: boolean;
}

/** The Zipper's live shape, in the host's pixels. */
interface ZipperGeometry {
  /** The host's width and height, and the track's length. */
  W: number;
  H: number;
  L: number;
  /** The chain's center line, from the host's left edge. */
  chainX: number;
  /** A place on the track as the host's y, and back. */
  yOf: (a: number) => number;
  aOf: (y: number) => number;
  progress: number;
  open: boolean;
  mode: ZipperState;
  /** The slider's center on the track, and where the parted rows leave its shoulders. */
  S: number;
  sM: number;
  /** How wide the mouth is, and how far its curves reach from the slider and from the top stop. */
  G: number;
  Ts: number;
  Te: number;
  /** From running open to spread flat. */
  spread: number;
  /** The mouth's hold: wide open, or sagged to a crack. */
  relax: number;
  /** How far the left row stands off the chain at a place on the track. */
  gap: (a: number) => number;
  /** The left lip's x at a place on the track. */
  lipX: (a: number) => number;
  /** The slider's center as the host's y. */
  sliderY: number;
}

interface ZipperEvents {
  grab: { progress: number };
  drag: { progress: number; velocity: number };
  release: { progress: number; open: boolean; tap: boolean };
  /** A run toward open or shut has begun. */
  commit: { open: boolean };
  /** The slider knocked the far stop, or the top one. */
  opened: void;
  closed: void;
  /** The run is over and everything is still. */
  settled: { open: boolean };
  /** A tooth pair passed through the slider. */
  tick: { n: number };
  hint: void;
  frame: ZipperGeometry;
}

type Listener<K extends keyof ZipperEvents> = (detail: ZipperEvents[K]) => void;

export interface Zipper {
  readonly el: HTMLDivElement;
  /** What the open mouth shows: over the lining, under the teeth. */
  readonly slot: HTMLDivElement;
  /** The pull, as a button. */
  readonly slider: HTMLButtonElement;
  readonly progress: number;
  /** Committed open: true from the moment a run toward open begins. */
  readonly isOpen: boolean;
  readonly state: ZipperState;
  /** Runs the slider; resolves when it knocks its stop, with whether it's open. */
  open: (opts?: RunOptions) => Promise<boolean>;
  close: (opts?: RunOptions) => Promise<boolean>;
  toggle: (opts?: RunOptions) => Promise<boolean>;
  set: (pose?: ZipperPose) => void;
  /** The mouth's hold: wide open, down to a crack. */
  relax: (k?: number) => void;
  /** One idle tug; the caller rations them. Returns whether it tugged. */
  hint: () => boolean;
  /** A burst of phone motion. */
  shake: (strength?: number) => void;
  /** One sample of phone motion in the screen's frame, in m/s². */
  nudge: (ax: number, ay: number) => void;
  /** The pip on the pull that marks something new inside. */
  badge: (on: boolean) => void;
  geometry: () => ZipperGeometry;
  on: <K extends keyof ZipperEvents>(event: K, fn: Listener<K>) => () => void;
  destroy: () => void;
}

const DEFAULTS = {
  insets: [0, 0],
  pitch: 12,
  maxGap: 170,
  threshold: 0.25,
  flick: 1.6,
  label: "Your stickers",
  progress: 0,
  haptics: true,
  motion: true,
} satisfies Required<Omit<ZipperOptions, "chainAt">>;

type ReleaseRule = Pick<Required<ZipperOptions>, "threshold" | "flick">;

/**
 * Whether a released slider runs open, the same rule both ways: a flick goes where it was flung;
 * otherwise, moved past the threshold from where it started, it runs on, and short of it springs back.
 */
export function releaseOpens(
  progress: number,
  velocity: number,
  wasOpen: boolean,
  { threshold, flick }: ReleaseRule = DEFAULTS,
): boolean {
  if (Math.abs(velocity) > flick) return velocity > 0;
  const past = (wasOpen ? 1 - progress : progress) > threshold;
  return past ? !wasOpen : wasOpen;
}

/* ---------------------------------------------------------------- the part, in px along the track */

/** A tooth's thickness. */
const TOOTH = 5.8;
/** The slider body's length. */
const SLIDER = 34;
/** A top stop's length; the bottom stop spans both tapes and is a little longer. */
const STOP = 6;
const FAR_STOP = 6.5;
/** Each top stop sits on its own tape, this far from the chain's center line. */
const STOP_SIDE = 4.5;
/** No tooth sits closer than this to a stop. */
const STOP_GAP = 1.5;
/** From the slider's center up to where the parted rows leave its shoulders. */
const SHOULDER = 12;
/** The pull's hinge on the slider's bridge, below the slider's center. */
const HINGE = 2;
/** By default the chain runs this far in from the host's right edge. */
const CHAIN_INSET = 17;
/** However short the host, the track is at least this long. */
const MIN_TRACK = 80;
/** The lining: a sliver every `step` px, `half` px either side of its place, shown once the mouth is
 * `minGap` wide; it tucks under the left lip and the right row, and its CSS box is `width` px wide. */
const LINING = { step: 4, half: 2.5, minGap: 2.5, underLip: 3, underChain: 2, width: 100 };
/** The left row's curve is sampled this often along the track, up to a fixed table. */
const SAMPLE_STEP = 2.5;
const MAX_SAMPLES = 512;

/* ---------------------------------------------------------------- the feel */

interface Spring {
  w: number;
  z: number;
}
/** Every moving part is a damped spring: `w` is how quick it is, `z` how much it rings (low rings long). */
const SPRING = {
  /** The slider under a finger. */
  finger: { w: 44, z: 1 },
  opening: { w: 17, z: 0.6 },
  /** Shutting is quicker and bouncier: it springs home and knocks the top stop. */
  shutting: { w: 23, z: 0.5 },
  /** The mouth follows a little behind the slider and overshoots when it stops. */
  mouth: { w: 24, z: 0.46 },
  spread: { w: 12, z: 0.9 },
  flop: { w: 21, z: 0.42 },
  lift: { w: 26, z: 0.7 },
  swing: { w: 9.5, z: 0.11 },
  stutter: { w: 70, z: 0.3 },
  jiggle: { w: 38, z: 0.3 },
} satisfies Record<string, Spring>;

/** Past a stop the slider sits back by this share of the overshoot, and bounces off keeping this share
 * of its speed at the far stop and at the top one. */
const STOP_GIVE = 0.3;
const BOUNCE_FAR = 0.26;
const BOUNCE_REST = 0.36;
/** A run knocks its stop once it's this close, at least this hard. */
const KNOCK_NEAR = 0.015;
const KNOCK_MIN = 0.5;
/** A knock at this speed or faster, in travels per second, lands at full strength. */
const KNOCK_FULL = 2.5;
/** A full knock: the pull swings, lifts and flops over, the slider stutters, and past `buzz` it buzzes. */
const KNOCK = { swing: 150, lift: 6, flop: 5, stutter: 30, buzz: 0.2, buzzMs: 8 };
/** Each tooth pair through the slider: a stutter, a swing that alternates, a buzz every other one. */
const TICK = { stutter: 26, swing: 9, buzzMs: 3 };
/** Once the slider is this close to the far stop, an open mouth spreads flat. */
const SPREAD_AT = 0.97;
/** Before it spreads, the mouth opens this wide for each px unzipped. */
const MOUTH_PER_PX = 0.42;
/** The mouth's hold goes a little past wide open at most. */
const RELAX_MAX = 1.2;
/** The pull's lift off the tape, held, hovered and at rest, and how far a full lift tips it, in radians. */
const LIFT = { held: 0.62, hover: 0.3, rest: 0.1, tip: 0.44 };
/** The pull bounces off lying flat keeping this share of its angle and speed. */
const FLOP_BOUNCE = 0.35;
/** The pull swings at most this many degrees either way; the slider jiggles at most this many px. */
const SWING_MAX = 34;
const JIGGLE_MAX = 2.2;
/** The chain's ripple: its wave along the track, how fast it travels and dies away, and how much each
 * motion sample adds, up to a cap. */
const RIPPLE = { wave: 0.066, speed: 13, decay: 3.2, fromX: 0.05, fromY: 0.02, max: 1.3 };
/** The pull's shadow on the tape: its offset from the light, how far a standing pull throws it, and its
 * strength, which fades as the pull lifts. */
const PULL_SHADOW = { dx: 0.8, dy: 1.4, reach: 6, opacity: 0.55, fade: 0.55 };

/** Stiction: until the finger has moved `px`, the slider moves at `share` of it; then it takes up the
 * slack and runs with the finger. */
const SLACK = { px: 5, share: 0.3, takeUp: 3.5 };
/** Past either end the slider gives at most this share of the travel, stiffening at this rate. */
const SOFT_END = { give: 0.03, stiffness: 6 };
/** How much each move counts toward the finger's speed. */
const FINGER_SMOOTHING = 0.35;
/** The fastest a release sends the slider, in travels per second. */
const RELEASE_MAX = 6;
/** A press that moves less than this and lets go sooner than this is a tap. */
const TAP = { px: 4, ms: 400 };
/** The longest frame that still moves in real time, and the substeps per second that keep the springs
 * stable. */
const MAX_FRAME_S = 0.1;
const SUBSTEPS_PER_S = 240;

/** The idle tug: the slider pulls down, the pull lifts, and it lets go. */
const TUG = { px: 11, lift: 3, ms: 190 };
/** A hand shaking the phone: side-to-side jolts, dying away, one after another. */
const SHAKE: readonly (readonly [number, number])[] = [
  [13, 3],
  [-17, -4],
  [15, 2],
  [-11, -2],
  [7, 1],
  [-4, 0],
];
const SHAKE_MS = 85;
/** One motion sample swings the pull, jiggles the slider sideways and stutters it along the track. */
const NUDGE = { swingX: 24, swingY: 4, jiggle: 4.2, stutter: 2.6 };
/** Motion under this, in m/s², is the hand's tremor and is ignored. */
const MOTION_MIN = 0.7;
/** Where the browser reports acceleration only with gravity, a slow average stands in for gravity. */
const GRAVITY_SMOOTHING = 0.9;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SVG_NS = "http://www.w3.org/2000/svg";

let uid = 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** An ease from nothing to the full span that starts at slope `m0`, in spans, and arrives flat: a gentle
 * start makes the V at the slider, a steep one the tight corner of a mouth spread flat. */
const hermite = (t: number, m0: number) => {
  const u = clamp(t, 0, 1);
  return m0 * u + (3 - 2 * m0) * u * u + (m0 - 2) * u * u * u;
};
/** One step of a damped spring toward `target`. */
function spring(x: number, v: number, target: number, s: Spring, dt: number): [number, number] {
  const nv = v + (-s.w * s.w * (x - target) - 2 * s.z * s.w * v) * dt;
  return [x + nv * dt, nv];
}
const f2 = (v: number) => v.toFixed(2);

/* ---------------------------------------------------------------- the molded parts */

function make<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  ...kids: Node[]
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  el.className = className;
  el.append(...kids);
  return el;
}

function svg(
  doc: Document,
  tag: string,
  attrs: Record<string, string | number>,
  ...kids: Node[]
): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  el.append(...kids);
  return el;
}

/** A gradient in the part's own units, its stops reading the Zipper's color variables. */
function gradient(
  doc: Document,
  id: string,
  [x1, y1, x2, y2]: readonly [number, number, number, number],
  stops: readonly (readonly [number, string])[],
): SVGElement {
  return svg(
    doc,
    "linearGradient",
    { id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 },
    ...stops.map(([offset, color]) =>
      svg(doc, "stop", { offset, style: `stop-color:var(${color})` }),
    ),
  );
}

/** The slider: its throat, where the joined chain leaves, points down toward the far end, and its
 * shoulders, where the parted rows leave, point up. Matte painted metal, lit from the top left. */
function sliderBody(doc: Document, id: number): SVGElement {
  const face = `zb${id}`;
  const grip = `zg${id}`;
  const metal: readonly (readonly [number, string])[] = [
    [0, "--zip-body-lit"],
    [0.42, "--zip-body"],
    [1, "--zip-body-deep"],
  ];
  const bridge: readonly (readonly [number, string])[] = [
    [0, "--zip-body-lit"],
    [0.5, "--zip-body"],
    [1, "--zip-body-deep"],
  ];
  return svg(
    doc,
    "svg",
    { class: "zip__body", viewBox: "-12 -17 24 34", "aria-hidden": "true", focusable: "false" },
    svg(
      doc,
      "defs",
      {},
      gradient(doc, face, [-12, -17, 12, 17], metal),
      gradient(doc, grip, [-4, -7, 4, 13], bridge),
    ),
    svg(doc, "path", {
      d: "M-5.5 17H5.5Q8 17 8.4 14.5L11.8 -7Q12.3 -10.5 10.4 -13.4L8.4 -16.2Q7.2 -17.6 5.6 -16.6L0 -10.6L-5.6 -16.6Q-7.2 -17.6 -8.4 -16.2L-10.4 -13.4Q-12.3 -10.5 -11.8 -7L-8.4 14.5Q-8 17 -5.5 17Z",
      fill: `url(#${face})`,
      style: "stroke:var(--zip-body-rim)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-11.1 -6.4L-7.9 14.1M-10.9 -9.4Q-11.5 -12.4 -9.5 -14.6L-8.5 -15.8",
      fill: "none",
      stroke: "rgba(255,255,255,.85)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M10.9 -7.2L7.6 13.6M-5 16.4H5",
      fill: "none",
      stroke: "rgba(28,24,36,.18)",
      "stroke-width": "1",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M-2.2 -11.6L0 -13.9L2.2 -11.6",
      fill: "none",
      stroke: "rgba(28,24,36,.22)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-5.7 -0.2h1.3v4.4h-1.3zM4.4 -0.2h1.3v4.4h-1.3z",
      fill: "rgba(28,24,36,.34)",
    }),
    svg(doc, "rect", {
      x: "-4.3",
      y: "-6.6",
      width: "8.6",
      height: "19.6",
      rx: "3.9",
      fill: `url(#${grip})`,
      style: "stroke:var(--zip-body-rim)",
      "stroke-width": ".6",
    }),
    svg(doc, "path", {
      d: "M-3.1 -4.8Q-3.1 -5.6 -1.9 -5.6H1.7",
      fill: "none",
      stroke: "rgba(255,255,255,.9)",
      "stroke-width": ".7",
      "stroke-linecap": "round",
    }),
  );
}

/** The pull hangs from its hinge toward the far end: a paddle with a window the tape shows through, a
 * molded lip, and the ring round the bridge. The back is the same part seen from behind once it flops
 * over, so its light is authored reversed. */
function pullFace(doc: Document, id: number, side: "front" | "back"): SVGElement {
  const back = side === "back";
  const paddle = `zt${side}${id}`;
  const ring = `zr${side}${id}`;
  const leftEdge = "M-5 6.4L-7.9 32.6";
  const rightEdge = "M5 6.4L7.9 32.6Q8.4 46.4 0 46.6";
  const plastic = (mid: number): readonly (readonly [number, string])[] => [
    [0, "--zip-slider-lit"],
    [mid, "--zip-slider"],
    [1, "--zip-slider-deep"],
  ];
  return svg(
    doc,
    "svg",
    {
      class: `zip__tab zip__tab--${side}`,
      viewBox: "-11 -5 22 55",
      "aria-hidden": "true",
      focusable: "false",
    },
    svg(
      doc,
      "defs",
      {},
      gradient(doc, paddle, back ? [11, 50, -11, -5] : [-11, -5, 11, 50], plastic(0.48)),
      gradient(doc, ring, back ? [0, 4.2, 0, -3.4] : [0, -3.4, 0, 4.2], plastic(0.5)),
    ),
    svg(doc, "path", {
      "fill-rule": "evenodd",
      d: "M-5.2 4H5.2Q6.4 4 6.7 5.6L9.6 33Q10.4 48.5 0 48.5Q-10.4 48.5 -9.6 33L-6.7 5.6Q-6.4 4 -5.2 4ZM-3 38.4A3 3 0 0 0 3 38.4V31.2A3 3 0 0 0 -3 31.2Z",
      fill: `url(#${paddle})`,
      style: "stroke:var(--zip-slider-rim)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: back ? rightEdge : leftEdge,
      fill: "none",
      stroke: "rgba(255,255,255,.55)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: back ? leftEdge : rightEdge,
      fill: "none",
      stroke: "rgba(90,8,46,.22)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M-3 31.2A3 3 0 0 1 3 31.2",
      fill: "none",
      stroke: `rgba(90,8,46,${back ? ".1" : ".28"})`,
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-5.6 4.2H5.6Q7.6 4.2 7.6 2.2V-1.4Q7.6 -3.4 5.6 -3.4H-5.6Q-7.6 -3.4 -7.6 -1.4V2.2Q-7.6 4.2 -5.6 4.2Z",
      fill: `url(#${ring})`,
      style: "stroke:var(--zip-slider-rim)",
      "stroke-width": ".6",
    }),
  );
}

/** One tooth and its slice of tape, anchored where the chain's center line runs when shut. */
interface Segment {
  el: HTMLElement;
  tape: HTMLElement;
  a: number;
  /** The transforms last written, so an unchanged part isn't written again. */
  t: string;
  ts: string;
}

interface Sliver {
  el: HTMLElement;
  a: number;
  t: string;
  on: boolean;
}

interface Grab {
  id: number;
  y0: number;
  p0: number;
  t0: number;
  moved: number;
  ly: number;
  lt: number;
  startOpen: boolean;
}

interface State {
  /** The slider's progress and speed, in travels and travels per second. */
  p: number;
  pv: number;
  mode: ZipperState;
  target: number;
  open: boolean;
  facing: Facing;
  /** The mouth's width, and how spread flat it is. */
  G: number;
  Gv: number;
  spread: number;
  sv: number;
  /** The pull: its flop in radians, its lift off the tape, its swing in degrees. */
  flip: number;
  fv: number;
  lift: number;
  lv: number;
  swing: number;
  swv: number;
  /** The slider's stutter along the track and jiggle across it, in px. */
  stut: number;
  stv: number;
  jx: number;
  jxv: number;
  /** The chain's ripple and where its wave has got to. */
  rip: number;
  ripPhase: number;
  relax: number;
  hover: boolean;
  finger: number;
  fingerV: number;
  grab: Grab | null;
  lastTick: number;
  /** The current run has knocked its stop. */
  knocked: boolean;
  frozen: boolean;
}

function windowOf(doc: Document): Window & typeof globalThis {
  const win = doc.defaultView;
  if (!win) throw new Error("The Zipper's host isn't in a document with a window to animate in");
  return win;
}

export function createZipper(host: HTMLElement, options: ZipperOptions = {}): Zipper {
  const doc = host.ownerDocument;
  const win = windowOf(doc);
  const o = { ...DEFAULTS, ...options };
  const id = ++uid;
  const reducedMotion = win.matchMedia(REDUCED_MOTION);
  const reduced = () => reducedMotion.matches;
  let destroyed = false;

  const listeners: { [K in keyof ZipperEvents]: Set<Listener<K>> } = {
    grab: new Set(),
    drag: new Set(),
    release: new Set(),
    commit: new Set(),
    opened: new Set(),
    closed: new Set(),
    settled: new Set(),
    tick: new Set(),
    hint: new Set(),
    frame: new Set(),
  };
  function emit<K extends keyof ZipperEvents>(event: K, detail: ZipperEvents[K]) {
    for (const fn of [...listeners[event]]) {
      try {
        fn(detail);
      } catch (error) {
        // One failing listener mustn't stall the loop or starve the others; it's reported instead.
        console.error(`A Zipper "${event}" listener failed`, error);
      }
    }
  }

  if (win.getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";

  const lining = make(doc, "div", "zip__layer zip__lining");
  const slot = make(doc, "div", "zip__slot");
  const rowB = make(doc, "div", "zip__layer zip__row zip__row--b");
  const rowA = make(doc, "div", "zip__layer zip__row zip__row--a");
  const stopA = make(doc, "i", "zip__stop zip__stop--top");
  const stopB = make(doc, "i", "zip__stop zip__stop--top");
  const stopFar = make(doc, "i", "zip__stop zip__stop--bottom");
  const tabShadow = make(doc, "i", "zip__tabshadow");
  const shadowPart = make(doc, "span", "zip__part zip__shadowpart", tabShadow);
  const pip = make(doc, "i", "zip__pip");
  pip.hidden = true;
  const flop = make(
    doc,
    "span",
    "zip__flop",
    pullFace(doc, id, "front"),
    pullFace(doc, id, "back"),
    pip,
  );
  const pull = make(doc, "span", "zip__pull", flop);
  pull.style.transform = `translateY(${HINGE}px)`;
  const slider = make(
    doc,
    "button",
    "zip__slider",
    shadowPart,
    sliderBody(doc, id),
    pull,
    make(doc, "i", "zip__ring"),
  );
  slider.type = "button";
  slider.setAttribute("aria-label", o.label);
  // The slider leads, so Tab goes from it into what the open mouth shows; the layers stack by z-index.
  const root = make(
    doc,
    "div",
    "zip",
    slider,
    lining,
    slot,
    rowB,
    rowA,
    make(doc, "div", "zip__layer zip__stops", stopA, stopB, stopFar),
  );
  root.style.setProperty("--zip-pitch", `${o.pitch}px`);
  host.append(root);

  /* ---------------------------------------------------------------- geometry */
  let W = 0;
  let H = 0;
  let L = 0;
  let chainX = 0;
  // The slider's center at the top stop and at the far one, and the travel between.
  let S0 = 0;
  let S1 = 0;
  let travel = 1;
  let teethA: Segment[] = [];
  let teethB: Segment[] = [];
  let slivers: Sliver[] = [];
  const yOf = (a: number) => o.insets[0] + a;
  const aOf = (y: number) => y - o.insets[0];

  function segment(row: "a" | "b", a: number): Segment {
    const tape = make(doc, "i", "zip__tape");
    const el = make(doc, "i", `zip__seg zip__seg--${row}`, tape, make(doc, "i", "zip__tooth"));
    return { el, tape, a, t: "", ts: "" };
  }
  function build(): boolean {
    W = host.clientWidth;
    H = host.clientHeight;
    if (!W || !H) return false;
    L = Math.max(MIN_TRACK, H - o.insets[0] - o.insets[1]);
    chainX = o.chainAt ?? W - CHAIN_INSET;
    const aMin = STOP + STOP_GAP;
    const aMax = L - STOP - STOP_GAP;
    const wantA: number[] = [];
    const wantB: number[] = [];
    for (let a = aMin + TOOTH / 2; a <= aMax - TOOTH / 2; a += o.pitch) wantA.push(a);
    for (let a = aMin + TOOTH / 2 + o.pitch / 2; a <= aMax - TOOTH / 2; a += o.pitch) wantB.push(a);
    teethA = wantA.map((a) => segment("a", a));
    teethB = wantB.map((a) => segment("b", a));
    rowA.replaceChildren(...teethA.map((s) => s.el));
    rowB.replaceChildren(...teethB.map((s) => s.el));
    slivers = [];
    for (let a = LINING.step / 2; a < L; a += LINING.step) {
      slivers.push({ el: make(doc, "i", "zip__sliver"), a, t: "", on: false });
    }
    lining.replaceChildren(...slivers.map((s) => s.el));
    S0 = STOP + SLIDER / 2;
    S1 = L - STOP - SLIDER / 2;
    travel = Math.max(1, S1 - S0);
    return true;
  }

  /* ---------------------------------------------------------------- state */
  const startOpen = o.progress >= 0.5;
  const st: State = {
    p: clamp(o.progress, 0, 1),
    pv: 0,
    mode: "rest",
    target: startOpen ? 1 : 0,
    open: startOpen,
    facing: startOpen ? "rest" : "far",
    G: 0,
    Gv: 0,
    spread: startOpen ? 1 : 0,
    sv: 0,
    flip: startOpen ? Math.PI : 0,
    fv: 0,
    lift: 0,
    lv: 0,
    swing: 0,
    swv: 0,
    stut: 0,
    stv: 0,
    jx: 0,
    jxv: 0,
    rip: 0,
    ripPhase: 0,
    relax: 1,
    hover: false,
    finger: 0,
    fingerV: 0,
    grab: null,
    lastTick: 0,
    knocked: true,
    frozen: false,
  };
  slider.setAttribute("aria-expanded", String(st.open));
  let waiters: ((open: boolean) => void)[] = [];
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const t = win.setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const buzz = (ms: number) => {
    if (o.haptics) win.navigator.vibrate?.(ms);
  };

  /* The mouth this frame: a V from the slider that starts gentle, and a rounder corner at the top stop;
   * spread flat, both corners square up. `Ts` and `Te` are how far each curve reaches, `ms` and `me`
   * how steeply each starts. */
  const shape = { S: 0, sM: 0, Ts: 1, Te: 1, ms: 0.8, me: 1.2, G: 0 };
  function setShape() {
    const S = S0 + st.p * travel + st.stut;
    const sM = S - SHOULDER;
    const len = Math.max(0, sM);
    let Ts = lerp(clamp(0.55 * len, 26, 150), 56, st.spread);
    let Te = lerp(clamp(0.3 * len, 12, 72), 40, st.spread);
    if (Ts + Te > len && len > 0) {
      const k = len / (Ts + Te);
      Ts *= k;
      Te *= k;
    }
    shape.S = S;
    shape.sM = sM;
    shape.Ts = Math.max(1, Ts);
    shape.Te = Math.max(1, Te);
    shape.ms = lerp(0.8, 2.4, st.spread);
    shape.me = lerp(1.2, 2.2, st.spread);
    shape.G = st.G;
  }
  const gap = (a: number) =>
    a >= shape.sM || a <= 0
      ? 0
      : shape.G * hermite((shape.sM - a) / shape.Ts, shape.ms) * hermite(a / shape.Te, shape.me);
  const gapTarget = () => {
    const len = Math.max(0, S0 + st.p * travel - SHOULDER);
    return (
      (st.p > 0.0005 ? Math.min(o.maxGap, MOUTH_PER_PX * len + st.spread * o.maxGap) : 0) * st.relax
    );
  };
  const spreadTarget = () => (st.open && st.mode !== "drag" && st.p > SPREAD_AT ? 1 : 0);
  const flipTarget = () => (st.facing === "far" ? 0 : Math.PI);
  const ripple = (a: number) =>
    st.rip > 0.01 ? st.rip * Math.sin(a * RIPPLE.wave - st.ripPhase) : 0;

  /* ---------------------------------------------------------------- the loop */
  let raf = 0;
  let last = 0;
  /** When the frame in progress began, which `advance` reads, so no frame makes a closure. */
  let frameAt = 0;
  const wake = () => {
    if (raf || destroyed) return;
    last = win.performance.now();
    raf = win.requestAnimationFrame(loop);
  };
  function loop(t: number) {
    frameAt = t;
    timeOurWork("zipper", advance);
  }
  function advance() {
    raf = 0;
    const dt = Math.min(MAX_FRAME_S, Math.max(0, (frameAt - last) / 1000));
    last = frameAt;
    const n = Math.max(1, Math.ceil(dt * SUBSTEPS_PER_S));
    for (let i = 0; i < n; i++) step(dt / n);
    render();
    if (!still()) raf = win.requestAnimationFrame(loop);
    else settle();
  }
  /** The slider hits a stop: the pull jumps and swings on its hinge. */
  function knock(v: number, atFar: boolean) {
    const k = clamp(Math.abs(v) / KNOCK_FULL, 0, 1);
    st.swv += (st.swing >= 0 ? 1 : -1) * KNOCK.swing * k;
    st.lv += KNOCK.lift * k;
    st.stv += (atFar ? 1 : -1) * KNOCK.stutter * k;
    if (k > KNOCK.buzz) buzz(KNOCK.buzzMs);
    if (st.knocked) return;
    st.knocked = true;
    if (atFar && st.open) {
      st.facing = "rest";
      st.fv += KNOCK.flop;
      emit("opened", undefined);
      flush(true);
    }
    if (!atFar && !st.open) {
      st.facing = "far";
      st.fv -= KNOCK.flop;
      emit("closed", undefined);
      flush(false);
    }
  }
  /* The slider follows the finger with a little stiction and a tick per tooth. Released, it runs to a
   * stop and knocks it; the mouth's width is a spring, so it overshoots and settles; and the pull flops
   * over at the end of a run, so it always lies toward the next pull. */
  function step(dt: number) {
    if (st.frozen) return;
    if (st.mode === "drag") [st.p, st.pv] = spring(st.p, st.pv, st.finger, SPRING.finger, dt);
    else if (st.mode === "run" || st.mode === "hint") {
      const s = st.target >= 0.5 ? SPRING.opening : SPRING.shutting;
      [st.p, st.pv] = spring(st.p, st.pv, st.target, s, dt);
    }
    if (st.mode !== "drag") {
      if (st.p > 1) {
        st.p = 1 - (st.p - 1) * STOP_GIVE;
        if (st.pv > 0) {
          knock(st.pv, true);
          st.pv = -st.pv * BOUNCE_FAR;
        }
      }
      if (st.p < 0) {
        st.p = -st.p * STOP_GIVE;
        if (st.pv < 0) {
          knock(st.pv, false);
          st.pv = -st.pv * BOUNCE_REST;
        }
      }
      if (st.mode === "run" && !st.knocked) {
        if (st.open && st.p > 1 - KNOCK_NEAR) knock(Math.max(st.pv, KNOCK_MIN), true);
        if (!st.open && st.p < KNOCK_NEAR) knock(Math.min(st.pv, -KNOCK_MIN), false);
      }
    }
    [st.G, st.Gv] = spring(st.G, st.Gv, gapTarget(), SPRING.mouth, dt);
    if (st.G < 0) {
      st.G = 0;
      st.Gv = Math.max(0, st.Gv);
    }
    [st.spread, st.sv] = spring(st.spread, st.sv, spreadTarget(), SPRING.spread, dt);
    [st.flip, st.fv] = spring(st.flip, st.fv, flipTarget(), SPRING.flop, dt);
    if (st.flip < 0) {
      st.flip = -st.flip * FLOP_BOUNCE;
      st.fv = -st.fv * FLOP_BOUNCE;
    }
    if (st.flip > Math.PI) {
      st.flip = Math.PI - (st.flip - Math.PI) * FLOP_BOUNCE;
      st.fv = -st.fv * FLOP_BOUNCE;
    }
    const lift = st.mode === "drag" ? LIFT.held : st.hover ? LIFT.hover : LIFT.rest;
    [st.lift, st.lv] = spring(st.lift, st.lv, lift, SPRING.lift, dt);
    [st.swing, st.swv] = spring(st.swing, st.swv, 0, SPRING.swing, dt);
    st.swing = clamp(st.swing, -SWING_MAX, SWING_MAX);
    [st.stut, st.stv] = spring(st.stut, st.stv, 0, SPRING.stutter, dt);
    [st.jx, st.jxv] = spring(st.jx, st.jxv, 0, SPRING.jiggle, dt);
    st.jx = clamp(st.jx, -JIGGLE_MAX, JIGGLE_MAX);
    if (st.rip > 0.005) {
      st.rip *= Math.exp(-dt * RIPPLE.decay);
      st.ripPhase += dt * RIPPLE.speed;
    } else st.rip = 0;
    if (st.mode === "drag") {
      const n = Math.floor((st.p * travel) / o.pitch);
      if (n !== st.lastTick) {
        const dir = n > st.lastTick ? 1 : -1;
        st.lastTick = n;
        st.stv += TICK.stutter * dir;
        st.swv += (n % 2 ? 1 : -1) * TICK.swing;
        if (n % 2 === 0) buzz(TICK.buzzMs);
        emit("tick", { n });
      }
    }
  }
  const near = (x: number, v: number, target: number, e: number) =>
    Math.abs(x - target) < e && Math.abs(v) < e * 20;
  /** Whether the loop can sleep: no hand on the pull, and every part at rest on its target. */
  function still(): boolean {
    if (st.mode === "drag") return false;
    if (st.frozen) return true;
    const pTarget = st.mode === "run" || st.mode === "hint" ? st.target : st.p;
    return (
      near(st.p, st.pv, pTarget, 0.0004) &&
      near(st.G, st.Gv, gapTarget(), 0.05) &&
      near(st.spread, st.sv, spreadTarget(), 0.002) &&
      near(st.flip, st.fv, flipTarget(), 0.003) &&
      Math.abs(st.lv) < 0.01 &&
      // The pull's swing rings on for seconds below anything the eye can see.
      near(st.swing, st.swv, 0, 0.5) &&
      near(st.stut, st.stv, 0, 0.02) &&
      near(st.jx, st.jxv, 0, 0.02) &&
      st.rip === 0
    );
  }
  function settle() {
    if (st.mode !== "run" && st.mode !== "hint") return;
    st.p = st.target;
    st.pv = 0;
    if (st.mode === "hint") {
      st.mode = "rest";
      return;
    }
    if (!st.knocked) {
      // It came to rest without knocking: the run ends as if it had.
      st.knocked = true;
      st.facing = st.open ? "rest" : "far";
      emit(st.open ? "opened" : "closed", undefined);
      flush(st.open);
      wake();
      return;
    }
    st.mode = "rest";
    // A run that had no stop to knock, such as opening what was already open, still answers.
    flush(st.open);
    emit("settled", { open: st.open });
  }
  function flush(open: boolean) {
    const w = waiters;
    waiters = [];
    for (const resolve of w) resolve(open);
  }

  /* ---------------------------------------------------------------- render */
  // The left row's curve, sampled from the slider back to the rest end, with its length along the way.
  const table = {
    a: new Float32Array(MAX_SAMPLES),
    c: new Float32Array(MAX_SAMPLES),
    s: new Float32Array(MAX_SAMPLES),
    n: 0,
  };
  function sample(): number {
    const sM = shape.sM;
    const n = sM <= 0 ? 0 : Math.min(MAX_SAMPLES - 1, Math.ceil(sM / SAMPLE_STEP) + 1);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, sM - i * SAMPLE_STEP);
      table.a[i] = a;
      table.c[i] = -gap(a);
      table.s[i] = i
        ? table.s[i - 1] + Math.hypot(table.a[i - 1] - a, table.c[i - 1] - table.c[i])
        : 0;
    }
    table.n = n;
    return n ? table.s[n - 1] : 0;
  }
  /** The point on the curve `s` px from the slider's shoulders, and the way the curve runs there. */
  function at(s: number): { a: number; c: number; ang: number } {
    const n = table.n;
    if (n < 2) return { a: shape.sM, c: 0, ang: 0 };
    let i = 1;
    while (i < n - 1 && table.s[i] < s) i++;
    const s0 = table.s[i - 1];
    const s1 = table.s[i];
    const k = s1 > s0 ? clamp((s - s0) / (s1 - s0), 0, 1) : 0;
    const da = table.a[i - 1] - table.a[i];
    const dc = table.c[i - 1] - table.c[i];
    return {
      a: lerp(table.a[i - 1], table.a[i], k),
      c: lerp(table.c[i - 1], table.c[i], k),
      ang: -Math.atan2(dc, da) * (180 / Math.PI),
    };
  }
  const put = (part: { el: HTMLElement; t: string }, t: string) => {
    if (part.t === t) return;
    part.el.style.transform = t;
    part.t = t;
  };
  const putTape = (s: Segment, t: string) => {
    if (s.ts === t) return;
    s.tape.style.transform = t;
    s.ts = t;
  };

  function render() {
    if (!L && !build()) return;
    setShape();
    const total = shape.G > 0.05 ? sample() : 0;
    const len = Math.max(1e-3, shape.sM);
    const stretch = total > 0 ? Math.max(1, total / len) : 1;
    // Row a: parted teeth run along the curve, spaced by their place on the tape.
    for (const s of teethA) {
      if (total > 0 && s.a < shape.sM) {
        const q = at((shape.sM - s.a) * stretch);
        put(
          s,
          `translate(${f2(chainX + q.c + ripple(q.a))}px,${f2(yOf(q.a))}px) rotate(${f2(q.ang)}deg)`,
        );
        putTape(s, stretch > 1.002 ? `scaleY(${stretch.toFixed(3)})` : "");
      } else {
        put(s, `translate(${f2(chainX + ripple(s.a))}px,${f2(yOf(s.a))}px)`);
        putTape(s, "");
      }
    }
    for (const s of teethB) put(s, `translate(${f2(chainX + ripple(s.a))}px,${f2(yOf(s.a))}px)`);
    // The lining between the rows. Each sliver reaches the lip's outermost point within its height, so on
    // a steep bend it runs a little under the tape, which covers it, instead of leaving a notch.
    for (const sl of slivers) {
      const lo = sl.a - LINING.half;
      const hi = Math.min(sl.a + LINING.half, shape.sM);
      const gIn = lo < shape.sM ? Math.min(gap(lo), gap(hi), gap(sl.a)) : 0;
      if (gIn < LINING.minGap) {
        if (sl.on) {
          sl.el.style.opacity = "0";
          sl.on = false;
        }
        continue;
      }
      if (!sl.on) {
        sl.el.style.opacity = "1";
        sl.on = true;
      }
      const g = Math.max(gap(lo), gap(hi), gap(sl.a));
      const left = -g - LINING.underLip;
      const right = LINING.underChain;
      put(
        sl,
        `translate(${f2(chainX + left)}px,${f2(yOf(sl.a))}px) scaleX(${((right - left) / LINING.width).toFixed(3)})`,
      );
    }
    // The left tape's top stop rides out with the lip.
    const topStop = STOP / 2;
    stopA.style.transform = `translate(${f2(chainX - STOP_SIDE - gap(topStop))}px,${f2(yOf(topStop))}px)`;
    stopB.style.transform = `translate(${f2(chainX + STOP_SIDE)}px,${f2(yOf(topStop))}px)`;
    stopFar.style.transform = `translate(${f2(chainX)}px,${f2(yOf(L - FAR_STOP / 2))}px)`;
    slider.style.transform = `translate(${f2(chainX + st.jx)}px,${f2(yOf(shape.S))}px)`;
    // The pull tips toward you as it lifts, whichever way it lies.
    const tip = LIFT.tip * st.lift;
    const beta = st.flip < Math.PI / 2 ? st.flip + tip : st.flip - tip;
    flop.style.transform = `rotate(${f2(st.swing)}deg) rotateX(${((beta * 180) / Math.PI).toFixed(2)}deg)`;
    const sn = Math.sin(clamp(beta, 0, Math.PI));
    const cs = Math.cos(beta);
    const cast = PULL_SHADOW.reach * sn;
    shadowPart.style.transform = `translate(${f2(PULL_SHADOW.dx + cast)}px,${f2(HINGE + PULL_SHADOW.dy + cast)}px) rotate(${f2(st.swing)}deg) scaleY(${cs.toFixed(3)})`;
    // Standing edge-on, the pull's shadow thins to a line and fades.
    const edgeOn = Math.min(1, Math.abs(cs) * 3 + 0.2);
    tabShadow.style.opacity = (PULL_SHADOW.opacity * (1 - PULL_SHADOW.fade * sn) * edgeOn).toFixed(
      3,
    );
    emit("frame", geometry());
  }

  function geometry(): ZipperGeometry {
    return {
      W,
      H,
      L,
      chainX,
      yOf,
      aOf,
      progress: st.p,
      open: st.open,
      mode: st.mode,
      S: shape.S,
      sM: shape.sM,
      G: shape.G,
      Ts: shape.Ts,
      Te: shape.Te,
      spread: st.spread,
      relax: st.relax,
      gap,
      lipX: (a) => chainX - gap(a),
      sliderY: yOf(shape.S),
    };
  }

  /* ---------------------------------------------------------------- acts */
  function run(open: boolean, { instant = reduced() }: RunOptions = {}): Promise<boolean> {
    if (destroyed) return Promise.resolve(st.open);
    const changed = open !== st.open;
    st.open = open;
    slider.setAttribute("aria-expanded", String(open));
    if (changed) emit("commit", { open });
    const done = new Promise<boolean>((resolve) => waiters.push(resolve));
    if (instant) {
      st.p = open ? 1 : 0;
      st.pv = 0;
      st.mode = "rest";
      st.target = open ? 1 : 0;
      st.spread = open ? 1 : 0;
      st.sv = 0;
      st.flip = open ? Math.PI : 0;
      st.fv = 0;
      st.facing = open ? "rest" : "far";
      st.knocked = true;
      st.G = gapTarget();
      st.Gv = 0;
      render();
      emit(open ? "opened" : "closed", undefined);
      flush(open);
      emit("settled", { open });
      return done;
    }
    st.mode = "run";
    st.target = open ? 1 : 0;
    if (Math.abs(st.p - st.target) > 0.02 || changed) st.knocked = false;
    wake();
    return done;
  }

  /* Dragging the pull */
  const localY = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    // The board may be drawn scaled; the drag works in the host's own pixels.
    const k = host.offsetHeight > 0 && r.height > 0 ? r.height / host.offsetHeight : 1;
    return (e.clientY - r.top) / k;
  };
  const softEnds = (f: number) => {
    if (f > 1) return 1 + (1 - Math.exp(-(f - 1) * SOFT_END.stiffness)) * SOFT_END.give;
    if (f < 0) return -(1 - Math.exp(f * SOFT_END.stiffness)) * SOFT_END.give;
    return f;
  };
  const onDown = (e: PointerEvent) => {
    if (e.button > 0 || st.frozen) return;
    e.preventDefault();
    try {
      slider.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events have no active pointer to capture; the drag still works.
    }
    const y = localY(e);
    const t = win.performance.now();
    st.grab = {
      id: e.pointerId,
      y0: y,
      p0: st.p,
      t0: t,
      moved: 0,
      ly: y,
      lt: t,
      startOpen: st.open,
    };
    st.mode = "drag";
    st.finger = st.p;
    st.fingerV = 0;
    st.pv = 0;
    st.lastTick = Math.floor((st.p * travel) / o.pitch);
    root.classList.add("is-dragging");
    emit("grab", { progress: st.p });
    wake();
  };
  const onMove = (e: PointerEvent) => {
    const g = st.grab;
    if (!g || g.id !== e.pointerId) return;
    const y = localY(e);
    const t = win.performance.now();
    const D = y - g.y0;
    g.moved = Math.max(g.moved, Math.abs(D));
    const Dp =
      Math.abs(D) < SLACK.px ? D * SLACK.share : Math.sign(D) * (Math.abs(D) - SLACK.takeUp);
    st.finger = softEnds(g.p0 + Dp / travel);
    const dt = Math.max(1, t - g.lt);
    st.fingerV = lerp(st.fingerV, (y - g.ly) / travel / (dt / 1000), FINGER_SMOOTHING);
    g.ly = y;
    g.lt = t;
    emit("drag", { progress: st.p, velocity: st.fingerV });
    wake();
  };
  const onUp = (e: PointerEvent) => {
    const g = st.grab;
    if (!g || g.id !== e.pointerId) return;
    st.grab = null;
    root.classList.remove("is-dragging");
    const tap = g.moved < TAP.px && win.performance.now() - g.t0 < TAP.ms;
    const open = tap ? !g.startOpen : releaseOpens(st.p, st.fingerV, g.startOpen, o);
    st.pv = clamp(st.fingerV, -RELEASE_MAX, RELEASE_MAX);
    emit("release", { progress: st.p, open, tap });
    void run(open);
  };
  const onEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    st.hover = true;
    wake();
  };
  const onLeave = () => {
    st.hover = false;
    wake();
  };
  // Enter and Space click a button with no pointer behind it; a pointer's click follows a release,
  // which has already decided.
  const onClick = (e: MouseEvent) => {
    if (e.detail === 0) void run(!st.open);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      void run(true);
    } else if (e.key === "ArrowUp" || (e.key === "Escape" && st.open)) {
      e.preventDefault();
      void run(false);
    }
  };
  slider.addEventListener("pointerdown", onDown);
  slider.addEventListener("pointermove", onMove);
  slider.addEventListener("pointerup", onUp);
  slider.addEventListener("pointercancel", onUp);
  slider.addEventListener("pointerenter", onEnter);
  slider.addEventListener("pointerleave", onLeave);
  slider.addEventListener("click", onClick);
  slider.addEventListener("keydown", onKey);

  /* Phone motion swings the pull; it never opens the tray */
  function nudge(ax: number, ay: number) {
    if (destroyed || reduced() || st.frozen) return;
    // The parts lag behind the phone.
    st.swv += -ax * NUDGE.swingX + ay * NUDGE.swingY;
    st.jxv += -ax * NUDGE.jiggle;
    st.stv += ay * NUDGE.stutter;
    st.rip = Math.min(
      RIPPLE.max,
      st.rip + Math.abs(ax) * RIPPLE.fromX + Math.abs(ay) * RIPPLE.fromY,
    );
    wake();
  }
  const gravity = { x: 0, y: 0, ready: false };
  const onMotion = (e: DeviceMotionEvent) => {
    if (st.frozen) return;
    let ax: number;
    let ay: number;
    const a = e.acceleration;
    if (a && a.x !== null && a.y !== null) {
      ax = a.x;
      ay = a.y;
    } else {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x === null || g.y === null) return;
      if (!gravity.ready) {
        gravity.x = g.x;
        gravity.y = g.y;
        gravity.ready = true;
      }
      gravity.x = gravity.x * GRAVITY_SMOOTHING + g.x * (1 - GRAVITY_SMOOTHING);
      gravity.y = gravity.y * GRAVITY_SMOOTHING + g.y * (1 - GRAVITY_SMOOTHING);
      ax = g.x - gravity.x;
      ay = g.y - gravity.y;
    }
    if (Math.hypot(ax, ay) < MOTION_MIN) return;
    nudge(ax, -ay); // the device's y points up the screen
  };
  // The Zipper listens whenever reduced motion is off and never asks for motion itself: where the
  // platform wants permission first (iOS), no events arrive until the app has been granted it.
  let listening = false;
  const listenForMotion = () => {
    const want = o.motion && !reduced();
    if (want === listening) return;
    listening = want;
    if (want) win.addEventListener("devicemotion", onMotion);
    else win.removeEventListener("devicemotion", onMotion);
  };
  listenForMotion();
  reducedMotion.addEventListener("change", listenForMotion);

  const resizes = new win.ResizeObserver(() => {
    if (host.clientWidth === W && host.clientHeight === H) return;
    L = 0;
    if (build()) render();
  });
  resizes.observe(host);

  const zipper: Zipper = {
    el: root,
    slot,
    slider,
    get progress() {
      return st.p;
    },
    get isOpen() {
      return st.open;
    },
    get state() {
      return st.mode;
    },
    open: (opts) => run(true, opts),
    close: (opts) => run(false, opts),
    toggle: (opts) => run(!st.open, opts),
    set(pose = {}) {
      if (destroyed) return;
      if (!L) build();
      if (pose.progress !== undefined) {
        st.p = clamp(pose.progress, 0, 1);
        st.pv = 0;
        st.target = st.p >= 0.5 ? 1 : 0;
      }
      if (pose.open !== undefined) {
        st.open = pose.open;
        slider.setAttribute("aria-expanded", String(st.open));
      }
      if (pose.spread !== undefined) {
        st.spread = pose.spread;
        st.sv = 0;
      }
      if (pose.facing) {
        st.facing = pose.facing;
        st.flip = flipTarget();
        st.fv = 0;
      }
      if (pose.flip !== undefined) {
        st.flip = pose.flip;
        st.fv = 0;
      }
      if (pose.lift !== undefined) {
        st.lift = pose.lift;
        st.lv = 0;
      }
      if (pose.swing !== undefined) {
        st.swing = pose.swing;
        st.swv = 0;
      }
      if (pose.relax !== undefined) st.relax = pose.relax;
      st.G = pose.mouth ?? gapTarget();
      st.Gv = 0;
      st.mode = "rest";
      st.knocked = true;
      st.frozen = pose.freeze === true;
      render();
    },
    relax(k = 1) {
      if (destroyed) return;
      st.relax = clamp(k, 0, RELAX_MAX);
      wake();
    },
    hint() {
      if (destroyed || st.open || st.mode !== "rest" || reduced() || st.frozen) return false;
      st.mode = "hint";
      st.target = TUG.px / travel;
      st.lv += TUG.lift;
      st.knocked = true;
      emit("hint", undefined);
      wake();
      later(() => {
        if (st.mode !== "hint") return;
        st.mode = "run";
        st.target = 0;
        wake();
      }, TUG.ms);
      return true;
    },
    nudge,
    shake(strength = 1) {
      if (destroyed) return;
      SHAKE.forEach(([x, y], i) => later(() => nudge(x * strength, y * strength), i * SHAKE_MS));
    },
    badge(on) {
      pip.hidden = !on;
    },
    geometry,
    on(event, fn) {
      listeners[event].add(fn);
      return () => {
        listeners[event].delete(fn);
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      win.cancelAnimationFrame(raf);
      raf = 0;
      for (const t of timers) win.clearTimeout(t);
      timers.clear();
      resizes.disconnect();
      reducedMotion.removeEventListener("change", listenForMotion);
      if (listening) win.removeEventListener("devicemotion", onMotion);
      slider.removeEventListener("pointerdown", onDown);
      slider.removeEventListener("pointermove", onMove);
      slider.removeEventListener("pointerup", onUp);
      slider.removeEventListener("pointercancel", onUp);
      slider.removeEventListener("pointerenter", onEnter);
      slider.removeEventListener("pointerleave", onLeave);
      slider.removeEventListener("click", onClick);
      slider.removeEventListener("keydown", onKey);
      root.remove();
      // Nothing moves again, so whatever waits on a run settles with the state it was left in.
      flush(st.open);
      for (const set of Object.values(listeners)) set.clear();
    },
  };

  if (build()) {
    st.G = gapTarget();
    render();
  }
  return zipper;
}
