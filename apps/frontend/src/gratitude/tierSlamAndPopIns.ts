import { isPerformanceRecorderOn, notePerformance } from "../performance/performanceRecorder";
import type { Tier } from "./combo";
import { EASE_SPRING, clamp } from "../ui/easing";
import { FEEL_CONFIG } from "./gameConfig";
import type { HeartBox } from "./miniHeartPhysics";
import { POP_IN_WORDS, createPopInPicker, type PopInBank } from "./popInWords";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { shownGloss, TIER_NAMES, type TierName } from "./tierNames";
import { animate } from "./webAnimations";

export interface Lettering {
  /** The screen's size, and `top`, where the stage starts under the HUD. */
  setLayout: (width: number, height: number, top: number) => void;
  /** A tier's name, slammed in over the heart and gone within a second. Words in its band make way. */
  slamTierName: (text: string, gloss: string) => void;
  /**
   * An onomatopoeia round the heart, never on it, another word or a slam: it scales in at a slant,
   * drifts and fades. Never a word already on screen, and none at all when there's no room for it.
   * `"climax"` is 昇天's.
   */
  showPopInWord: (bank: PopInBank, heart: HeartBox) => void;
  clear: () => void;
}

/** What an unlock slams in over the heart, with its English: stroke's, and shake's. */
export const UNLOCK_SLAMS = {
  stroke: { jp: "!?", en: "" },
  shake: { jp: "ポンッ", en: "*pop*" },
} as const satisfies Record<"stroke" | "shake", TierName>;

/** Every word the lettering shows, with its English: what's slammed in, then the pop-in words. */
export const LETTERING_WORDS: readonly TierName[] = [
  ...TIER_NAMES,
  ...Object.values(UNLOCK_SLAMS),
  ...Object.values(POP_IN_WORDS).flatMap((bank) =>
    bank.map(({ jp, gloss }) => ({ jp, en: gloss })),
  ),
];

/** Where pop-ins land, in heart widths and heights from its middle: clear of the face. */
const SLOTS: readonly (readonly [x: number, y: number])[] = [
  [-0.8, -0.52],
  [0.8, -0.52],
  [-1.02, 0.08],
  [1.02, 0.08],
  [-0.6, 0.74],
  [0.6, 0.74],
];
/** The slots before this one are above the heart, in the band a slam holds. */
const FIRST_LOW_SLOT = 2;
const LOW_SLOTS = SLOTS.length - FIRST_LOW_SLOT;
/** Slots above the heart, beside it and below it, left then right. */
const ABOVE: readonly [number, number] = [0, 1];
const BESIDE: readonly number[] = [2, 3];
const BELOW: readonly [number, number] = [4, 5];
/** A pop-in's outline reaches this far past its letters, in px per px of font size. */
const OUTLINE = 0.14;
/** The spring's peak scale, which a word must fit on screen at too. */
const SPRING_PEAK = 1.14;
/** px a word keeps from the screen's sides, and from its foot. */
const EDGE_PX = 8;
const FOOT_PX = 16;
/** A pop-in's gloss: its gap under the word, as `.gr-pop .gr-cap-gloss` sets it, and its height. */
const GLOSS_GAP_PX = 3;
const GLOSS_HEIGHT_PX = 17;
/** Shares of a word's drift at which it's checked against the heart, from its start to its end. */
const DRIFT_CHECKS = [0, 0.25, 0.5, 0.75, 1];
/** A pop-in's font size in px by tier, before intensity. */
const POP_PX: readonly [number, number, number, number, number] = [26, 28, 31, 33, 35];
const SLAM_PX = 58;
const SLAM_MS = 950;
/** px a slam keeps from each side of the screen, with room for the tier's screen shake. */
const SLAM_MARGIN = 20;
const POP_INS = 5;
/** Heights per px of font size, until the fonts are measured. */
const SLAM_HEIGHT_GUESS = 1.1;
const POP_HEIGHT_GUESS = 1.4;
/** Until the fonts are measured, a word's width is guessed at one em a character. */
const WORD_EM_GUESS = 1;
/** And a gloss's, in px a character at the gloss's fixed size. */
const GLOSS_PX_GUESS = 0.56 * 11;
/** A pop-in's gloss starts this share of the word's width in, as `.gr-pop .gr-cap-gloss` puts it. */
const POP_GLOSS_LEFT = 0.08;
/** The font size the probe measures at: large, so whole-pixel widths stay precise. */
const PROBE_PX = 100;
/** Measures to try, since a measure can start a font loading. */
const MEASURE_TRIES = 3;
/** Until the engine lays the screen out: a phone's. */
const FALLBACK_SCREEN = { width: 390, height: 741, top: 256 };
/** With reduced motion a word fades in over this share of its life, where it lands, and holds still. */
const STILL_FADE_IN = 0.15;
/** A word a slam pushes out plays out the rest of its life this many times as fast. */
const RETIRE_SPEED = 6;
/** px a pop-in keeps clear of another word. */
const WORD_GAP_PX = 4;

/** A rectangle in px, edges along the screen's. */
interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A word in outlined bag letters (袋文字), and the animation it was last given. */
interface Caption {
  el: HTMLDivElement;
  word: Text;
  gloss: HTMLSpanElement;
  animation: Animation | null;
  /** A pop-in's slot, and the clock's time it's gone by. */
  slot: number | null;
  until: number;
  /** Where the word reaches over its life, drift and spring included. */
  zone: Box | null;
}

/** A word's box about its middle in px, its outline and gloss included, before its tilt. */
interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A pop-in word's size in px: its letters, their font size and its gloss's width, if it has one. */
interface PopSize {
  w: number;
  ht: number;
  px: number;
  glossWidth: number | null;
}

/** Where a pop-in lands: its slot, its shrink, its middle as it starts, and its drift over its life. */
interface Placement {
  slot: number;
  shrink: number;
  edges: Edges;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
}

/** A word's edges at `scale`. Its gloss keeps its fine-print size as the word shrinks. */
function popEdges({ w, ht, px, glossWidth }: PopSize, scale: number): Edges {
  const ring = px * OUTLINE * scale;
  const edges = {
    left: (-w / 2) * scale - ring,
    right: (w / 2) * scale + ring,
    top: (-ht / 2) * scale - ring,
    bottom: (ht / 2) * scale + ring,
  };
  if (glossWidth !== null) {
    edges.right = Math.max(edges.right, (POP_GLOSS_LEFT * w - w / 2) * scale + glossWidth + 6);
    edges.bottom = Math.max(edges.bottom, (ht / 2 + GLOSS_GAP_PX) * scale + GLOSS_HEIGHT_PX);
  }
  return edges;
}

/** How far edges turned by `rad` about the middle reach from it. */
function turnedReach(e: Edges, rad: number) {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xs = [e.left, e.right].flatMap((x) => [x * cos - e.top * sin, x * cos - e.bottom * sin]);
  const ys = [e.left, e.right].flatMap((x) => [x * sin + e.top * cos, x * sin + e.bottom * cos]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Whether edges turned by `rad` about (cx, cy) overlap `box`: separating axes, the word's two and the box's two. */
function overlaps(
  e: Edges,
  rad: number,
  cx: number,
  cy: number,
  box: { x0: number; x1: number; y0: number; y1: number },
): boolean {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ac = Math.abs(cos);
  const as = Math.abs(sin);
  const mx = (e.left + e.right) / 2;
  const my = (e.top + e.bottom) / 2;
  const a = (e.right - e.left) / 2;
  const b = (e.bottom - e.top) / 2;
  const h = (box.x1 - box.x0) / 2;
  const v = (box.y1 - box.y0) / 2;
  const ox = cx + mx * cos - my * sin - (box.x0 + box.x1) / 2;
  const oy = cy + mx * sin + my * cos - (box.y0 + box.y1) / 2;
  return (
    Math.abs(ox) <= h + a * ac + b * as &&
    Math.abs(oy) <= v + a * as + b * ac &&
    Math.abs(ox * cos + oy * sin) <= a + h * ac + v * as &&
    Math.abs(oy * cos - ox * sin) <= b + h * as + v * ac
  );
}

/** Whether two boxes come within `gap` px of each other. */
const near = (a: Box, b: Box, gap: number) =>
  a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;

/**
 * Where a word with `edges`, turned by `rad`, reaches as its middle drifts from (cx, cy) by (dx, dy),
 * at the spring's peak size: the drift is a straight line, so its two ends bound it.
 */
function lifeZone(edges: Edges, rad: number, cx: number, cy: number, dx: number, dy: number): Box {
  const peak = turnedReach(
    {
      left: edges.left * SPRING_PEAK,
      right: edges.right * SPRING_PEAK,
      top: edges.top * SPRING_PEAK,
      bottom: edges.bottom * SPRING_PEAK,
    },
    rad,
  );
  return {
    x0: cx + Math.min(0, dx) + peak.minX,
    x1: cx + Math.max(0, dx) + peak.maxX,
    y0: cy + Math.min(0, dy) + peak.minY,
    y1: cy + Math.max(0, dy) + peak.maxY,
  };
}

/** A pair of slots, the one on `side` first. */
const sideFirst = (pair: readonly [number, number], side: number): readonly number[] =>
  SLOTS[pair[0]][0] * side > 0 ? pair : [pair[1], pair[0]];

/** Per px of font size. */
interface WordSize {
  width: number;
  height: number;
}

function makeCaption(kind: "gr-slam" | "gr-pop"): Caption {
  const el = document.createElement("div");
  el.className = `gr-cap ${kind}`;
  // Its outline repeats the word twice over, from `data-t`.
  el.setAttribute("aria-hidden", "true");
  const word = document.createTextNode("");
  const gloss = document.createElement("span");
  gloss.className = "gr-cap-gloss";
  el.append(word, gloss);
  return { el, word, gloss, animation: null, slot: null, until: 0, zone: null };
}

/** The system's reduced-motion setting, followed live: until the engine passes its own. */
function systemReduced(): () => boolean {
  const query = typeof matchMedia === "function" ? matchMedia(REDUCED_MOTION) : null;
  return () => query?.matches ?? false;
}

/** A word that fades in and out at `transform`, with no spring, drift or scale. */
function stillFrames(transform: string): Keyframe[] {
  return [
    { transform, opacity: 0 },
    { offset: STILL_FADE_IN, transform, opacity: 1 },
    { offset: 0.72, transform, opacity: 1 },
    { transform, opacity: 0 },
  ];
}

/**
 * The tier slams and pop-in words. Placing one never reads layout: every word, gloss and slam text
 * is measured once in a hidden probe after the fonts load, and guessed from its length until then.
 * With reduced motion each one fades in and out where it lands. `words` picks the words, `random`
 * where they go; `now` is the engine's clock, ms; `rate` how fast the words play, a replay's clock's
 * speed; `scale` the stage's size over the live game's. Without `glosses`, no word shows its English.
 */
export function createLettering(
  layer: HTMLElement,
  options: {
    intensity: number;
    random: () => number;
    words?: () => number;
    reduced?: () => boolean;
    now?: () => number;
    rate?: number;
    scale?: number;
    glosses?: boolean;
  },
): Lettering {
  const { random, rate = 1, scale = 1, glosses = true } = options;
  const reduced = options.reduced ?? systemReduced();
  const clock = options.now ?? (() => performance.now());
  const pick = createPopInPicker(options.words ?? random);
  /** Words grow with the intensity, and shrink with a smaller stage. */
  const grow = (0.86 + 0.28 * options.intensity) * scale;
  let screen = FALLBACK_SCREEN;

  const wordSizes = new Map<string, WordSize>();
  const glossWidths = new Map<string, number>();
  const wordSize = (text: string, heightGuess: number): WordSize =>
    wordSizes.get(text) ?? { width: text.length * WORD_EM_GUESS, height: heightGuess };
  const glossWidth = (text: string) => glossWidths.get(text) ?? text.length * GLOSS_PX_GUESS;

  function measure() {
    const words = new Set(LETTERING_WORDS.map(({ jp }) => jp));
    const glosses = new Set(LETTERING_WORDS.map(({ en }) => en).filter(Boolean));
    const probe = document.createElement("div");
    probe.style.visibility = "hidden";
    const wordEls = [...words].map((text) => {
      const el = document.createElement("div");
      el.className = "gr-cap";
      el.style.fontSize = `${PROBE_PX}px`;
      el.textContent = text;
      probe.append(el);
      return { text, el };
    });
    const glossEls = [...glosses].map((text) => {
      // Inside a word, as on screen, so the gloss keeps to one line.
      const holder = document.createElement("div");
      holder.className = "gr-cap";
      const el = document.createElement("span");
      el.className = "gr-cap-gloss";
      el.textContent = text;
      holder.append(el);
      probe.append(holder);
      return { text, el };
    });
    // One layout for the lot; the probe goes before it's ever painted.
    layer.append(probe);
    for (const { text, el } of wordEls) {
      if (el.offsetWidth > 0) {
        wordSizes.set(text, {
          width: el.offsetWidth / PROBE_PX,
          height: el.offsetHeight / PROBE_PX,
        });
      }
    }
    for (const { text, el } of glossEls)
      if (el.offsetWidth > 0) glossWidths.set(text, el.offsetWidth);
    probe.remove();
  }

  /** Laying the probe out can start loading a face it needs; a load still running means measuring again. */
  function measureOnceFontsLoad(fonts: FontFaceSet, tries: number) {
    void fonts.ready.then(() => {
      measure();
      if (fonts.status === "loading" && tries > 1) measureOnceFontsLoad(fonts, tries - 1);
    });
  }
  // Absent where there's no layout to measure, as in happy-dom.
  const fonts: FontFaceSet | undefined = document.fonts;
  if (fonts) measureOnceFontsLoad(fonts, MEASURE_TRIES);

  let slam: Caption | null = null;
  /** The clock's time until which a slam holds the band above the heart, and where it reaches. */
  let slamUntil = 0;
  let slamZone: Box | null = null;
  const pops: Caption[] = [];
  /** The latest tier shown, which sizes the stroke and shake words. */
  let tierShown: Tier = 0;
  let slotBag: number[] = [];
  let lowSlot: number | null = null;

  function dress(caption: Caption, text: string, gloss: string, px: number) {
    caption.animation?.cancel();
    caption.el.dataset.t = text;
    caption.word.data = text;
    const shown = glosses ? gloss : "";
    caption.gloss.textContent = shown;
    caption.gloss.hidden = !shown;
    caption.el.style.fontSize = `${px.toFixed(1)}px`;
    // Last in the layer, so the newest word is on top.
    layer.append(caption.el);
  }

  function nextSlot(avoidTop: boolean): number {
    if (avoidTop) {
      lowSlot = ((lowSlot ?? Math.floor(random() * LOW_SLOTS)) + 1) % LOW_SLOTS;
      return FIRST_LOW_SLOT + lowSlot;
    }
    if (slotBag.length === 0) {
      slotBag = SLOTS.map((_, i) => i);
      for (let i = slotBag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [slotBag[i], slotBag[j]] = [slotBag[j], slotBag[i]];
      }
    }
    return slotBag.pop() ?? 0;
  }

  /**
   * Where a word lands from `slot`, shrunk to `shrink`: kept on screen at the spring's peak, tilt
   * and outline included, and drifting along an edge rather than off it. Its margins and drift keep
   * to the stage's scale, whatever its shrink.
   */
  function place(
    slot: number,
    shrink: number,
    size: PopSize,
    heart: HeartBox,
    draw: { jx: number; jy: number; rad: number; dxJitter: number; dy: number },
  ): Placement {
    const [sx, sy] = SLOTS[slot];
    const edges = popEdges(size, shrink);
    const rest = turnedReach(edges, draw.rad);
    const peak = turnedReach(
      {
        left: edges.left * SPRING_PEAK,
        right: edges.right * SPRING_PEAK,
        top: edges.top * SPRING_PEAK,
        bottom: edges.bottom * SPRING_PEAK,
      },
      draw.rad,
    );
    const xMin = EDGE_PX * scale - peak.minX;
    const xMax = Math.max(xMin, screen.width - EDGE_PX * scale - peak.maxX);
    const yMin = screen.top + 2 * scale - peak.minY;
    const yMax = Math.max(yMin, screen.height - FOOT_PX * scale - peak.maxY);
    const drawn = drawnHeart(heart);
    let cy = heart.y + sy * heart.height + draw.jy;
    // Above the heart a word starts clear of it and rises away; below it, it rises to just short of it.
    if (ABOVE.includes(slot)) cy = Math.min(cy, drawn.y0 - rest.maxY);
    else if (BELOW.includes(slot)) cy = Math.max(cy, drawn.y1 - rest.minY - draw.dy);
    cy = clamp(cy, yMin, yMax);
    const cx = clamp(heart.x + sx * heart.width + draw.jx, xMin, xMax);
    const dx = clamp(sx * 26 * scale + draw.dxJitter, xMin - cx, xMax - cx);
    // And it never rises out of the stage, under the HUD.
    const dy = Math.min(0, Math.max(draw.dy, yMin - cy));
    return { slot, shrink, edges, cx, cy, dx, dy };
  }

  /** The drawn heart: its box drawn in at each side. */
  function drawnHeart(heart: HeartBox) {
    const keep = 0.5 - FEEL_CONFIG.popIns.heartInset;
    return {
      x0: heart.x - heart.width * keep,
      x1: heart.x + heart.width * keep,
      y0: heart.y - heart.height * keep,
      y1: heart.y + heart.height * keep,
    };
  }

  /** Whether a word reaches into the drawn heart anywhere along its drift. */
  function coversHeart(p: Placement, heart: HeartBox, rad: number) {
    const box = drawnHeart(heart);
    return DRIFT_CHECKS.some((k) => overlaps(p.edges, rad, p.cx + p.dx * k, p.cy + p.dy * k, box));
  }

  /** Lets a word play out the rest of its life at speed, so it fades out where it stands. */
  function retire(caption: Caption, now: number) {
    if (caption.animation) caption.animation.playbackRate = rate * RETIRE_SPEED;
    caption.until = now + (caption.until - now) / RETIRE_SPEED;
  }

  return {
    setLayout(width, height, top) {
      screen = { width, height, top };
    },

    slamTierName(text, gloss) {
      if (isPerformanceRecorderOn()) notePerformance("gratitude", `slam ${text}`);
      const px = SLAM_PX * grow;
      const caption = (slam ??= makeCaption("gr-slam"));
      dress(caption, text, gloss, px);
      const size = wordSize(text, SLAM_HEIGHT_GUESS);
      const w = size.width * px;
      const ht = size.height * px;
      // A long name scales down to fit the screen, tilt, outline and the spring's peak included.
      // The slam keeps its energy in the tilt and the overshoot, not in its size.
      const tilt = (5 * Math.PI) / 180;
      const reach = (w * Math.cos(tilt) + ht * Math.sin(tilt) + px * 0.3) * 1.06;
      const fit = Math.min(1, (screen.width - SLAM_MARGIN * scale * 2) / reach);
      // The gloss stays at its fine-print size.
      caption.gloss.style.transformOrigin = fit < 1 ? "0 0" : "";
      caption.gloss.style.transform = fit < 1 ? `rotate(3deg) scale(${(1 / fit).toFixed(3)})` : "";
      // Centered on the screen, its top on the band above the heart.
      const x = (screen.width - w) / 2;
      const y = screen.top + 4 * scale - (ht * (1 - fit)) / 2;
      const base = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(-5deg) scale(${fit.toFixed(3)})`;
      const now = clock();
      slamUntil = now + SLAM_MS;
      // The band it takes is cleared: a pop-in already there plays out its life at speed.
      const edges = popEdges(
        { w, ht, px, glossWidth: glosses && gloss ? glossWidth(gloss) : null },
        fit,
      );
      slamZone = lifeZone(edges, -tilt, x + w / 2, y + ht / 2, 0, -8);
      for (const c of pops)
        if (c.until > now && c.zone && near(c.zone, slamZone, 0)) retire(c, now);
      // In small and tilted hard, springing to its slant: it never leaves the screen.
      caption.animation = animate(
        caption.el,
        reduced()
          ? stillFrames(base)
          : [
              { transform: `${base} rotate(-11deg) scale(.55)`, opacity: 0, easing: EASE_SPRING },
              { offset: 0.18, transform: `${base} rotate(0deg) scale(1)`, opacity: 1 },
              { offset: 0.72, transform: `${base} rotate(0deg) scale(1)`, opacity: 1 },
              { transform: `${base} translateY(-8px) rotate(0deg) scale(1.02)`, opacity: 0 },
            ],
        { duration: SLAM_MS, easing: "linear", fill: "both" },
        rate,
      );
    },

    showPopInWord(bank, heart) {
      if (isPerformanceRecorderOn()) notePerformance("gratitude", `pop-in ${bank}`);
      const now = clock();
      // A word that has gone gives its element to the next; with every one still showing, there's
      // no room for another.
      const spare = pops.find((c) => c.until <= now);
      if (!spare && pops.length >= POP_INS) return;
      const showing = pops.filter((c) => c.until > now);
      const onScreen = new Set(showing.map((c) => c.word.data));
      if (slam && now < slamUntil) onScreen.add(slam.word.data);
      const word = pick(bank, onScreen);
      if (!word) return;
      const { jp } = word;
      const gloss = shownGloss(word.gloss);
      if (typeof bank === "number") tierShown = bank;
      else if (bank === "climax") tierShown = 4;
      const px = POP_PX[tierShown] * grow;

      const measured = wordSize(jp, POP_HEIGHT_GUESS);
      const size: PopSize = {
        w: measured.width * px,
        ht: measured.height * px,
        px,
        glossWidth: glosses && gloss ? glossWidth(gloss) : null,
      };
      const avoidTop = now < slamUntil;
      const preferred = nextSlot(avoidTop);
      const draw = {
        jx: (random() - 0.5) * 26 * scale,
        jy: (random() - 0.5) * 18 * scale,
        rad: ((random() - 0.5) * 44 * Math.PI) / 180,
        dy: -(16 + random() * 22) * scale,
        dxJitter: (random() - 0.5) * 14 * scale,
      };
      const duration = 620 + random() * 560;

      // Never on the heart, a word still showing or a slam: a word takes a free slot below the
      // heart, or above it while no slam holds that band, and shrinks only when none will do. Beside
      // the heart only if it fits. With no room at all, the word isn't shown.
      const full = popEdges(size, 1);
      const fitsBeside = (screen.width - heart.width) / 2 >= full.right - full.left;
      const side = Math.sign(SLOTS[preferred][0]) || 1;
      const slots = [
        ...new Set([
          preferred,
          ...sideFirst(BELOW, side),
          ...(avoidTop ? [] : sideFirst(ABOVE, side)),
        ]),
      ].filter((slot) => fitsBeside || !BESIDE.includes(slot));
      const free = slots.filter((slot) => !showing.some((c) => c.slot === slot));
      const { minScale, scaleStep } = FEEL_CONFIG.popIns;
      const roomFor = (reach: Box) =>
        !showing.some((c) => c.zone && near(c.zone, reach, WORD_GAP_PX * scale)) &&
        !(slamZone && now < slamUntil && near(slamZone, reach, WORD_GAP_PX * scale));
      let p: Placement | null = null;
      let zone: Box | null = null;
      for (let shrink = 1; !p && shrink > minScale - 1e-6; shrink -= scaleStep) {
        for (const slot of free) {
          const candidate = place(slot, Math.max(minScale, shrink), size, heart, draw);
          if (coversHeart(candidate, heart, draw.rad)) continue;
          const reach = lifeZone(
            candidate.edges,
            draw.rad,
            candidate.cx,
            candidate.cy,
            candidate.dx,
            candidate.dy,
          );
          if (!roomFor(reach)) continue;
          p = candidate;
          zone = reach;
          break;
        }
      }
      if (!p || !zone) return;

      if (spare) pops.splice(pops.indexOf(spare), 1);
      const caption = spare ?? makeCaption("gr-pop");
      pops.push(caption);
      dress(caption, jp, gloss, px);
      caption.slot = p.slot;
      caption.zone = zone;
      caption.until = now + duration;
      // The gloss stays at its fine-print size as the word shrinks.
      caption.gloss.style.transformOrigin = p.shrink < 1 ? "0 0" : "";
      caption.gloss.style.transform =
        p.shrink < 1 ? `rotate(3deg) scale(${(1 / p.shrink).toFixed(3)})` : "";

      const { cx, cy, dx, dy } = p;
      const rot = (draw.rad * 180) / Math.PI;
      const fit = p.shrink;
      const at = (k: number, spring: number) =>
        `translate(${(cx - size.w / 2 + dx * k).toFixed(1)}px,${(cy - size.ht / 2 + dy * k).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(spring * fit).toFixed(3)})`;
      caption.animation = animate(
        caption.el,
        reduced()
          ? stillFrames(at(0, 1))
          : [
              { transform: at(0, 0), opacity: 1, easing: EASE_SPRING },
              { offset: 0.2, transform: at(0.1, 1), opacity: 1 },
              { offset: 0.64, transform: at(0.6, 1), opacity: 1 },
              { transform: at(1, 0.96), opacity: 0 },
            ],
        { duration, easing: "linear", fill: "both" },
        rate,
      );
    },

    clear() {
      for (const caption of slam ? [slam, ...pops] : pops) {
        caption.animation?.cancel();
        caption.el.remove();
      }
      slam = null;
      pops.length = 0;
      slamUntil = 0;
      slamZone = null;
    },
  };
}
