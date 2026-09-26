import type { Tier } from "./combo";
import { EASE_SPRING, clamp } from "./easing";
import type { HeartBox } from "./miniHeartPhysics";
import { POP_IN_WORDS, createPopInPicker, type PopInBank } from "./popInWords";
import { TIER_NAMES } from "./tierNames";

export interface Lettering {
  /** The screen's size, and `top`, where the stage starts under the HUD. */
  setLayout: (width: number, height: number, top: number) => void;
  /** A tier's name, slammed in over the heart and gone within a second. */
  slamTierName: (text: string, gloss: string) => void;
  /** An onomatopoeia beside the heart: it scales in at a slant, drifts and fades. */
  showPopInWord: (bank: PopInBank, heart: HeartBox) => void;
  clear: () => void;
}

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

/** A word in outlined bag letters (袋文字), and the animation it was last given. */
interface Caption {
  el: HTMLDivElement;
  word: Text;
  gloss: HTMLSpanElement;
  animation: Animation | null;
}

/** Per px of font size. */
interface WordSize {
  width: number;
  height: number;
}

/** Cancelling an animation rejects its `finished`: browsers mark that handled, happy-dom doesn't. */
function animate(
  el: HTMLElement,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation {
  const animation = el.animate(frames, options);
  void animation.finished.catch(rethrowUnlessCancelled);
  return animation;
}

function rethrowUnlessCancelled(error: unknown) {
  if (!(error instanceof Error && error.name === "AbortError")) throw error;
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
  return { el, word, gloss, animation: null };
}

/**
 * The tier slams and pop-in words. Placing one never reads layout: every word, gloss and slam text
 * is measured once in a hidden probe after the fonts load, and guessed from its length until then.
 */
export function createLettering(
  layer: HTMLElement,
  options: { intensity: number; random: () => number },
): Lettering {
  const { random } = options;
  const pick = createPopInPicker(random);
  const grow = 0.86 + 0.28 * options.intensity;
  let screen = FALLBACK_SCREEN;

  const wordSizes = new Map<string, WordSize>();
  const glossWidths = new Map<string, number>();
  const wordSize = (text: string, heightGuess: number): WordSize =>
    wordSizes.get(text) ?? { width: text.length * WORD_EM_GUESS, height: heightGuess };
  const glossWidth = (text: string) => glossWidths.get(text) ?? text.length * GLOSS_PX_GUESS;

  function measure() {
    const words = new Set<string>();
    const glosses = new Set<string>();
    for (const bank of Object.values(POP_IN_WORDS)) {
      for (const { jp, gloss } of bank) {
        words.add(jp);
        glosses.add(gloss);
      }
    }
    for (const { jp, en } of TIER_NAMES) {
      words.add(jp);
      glosses.add(en);
    }
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
  /** performance.now() until which a slam holds the band above the heart. */
  let slamUntil = 0;
  const pops: Caption[] = [];
  /** The latest tier shown, which sizes the stroke and shake words. */
  let tierShown: Tier = 0;
  let slotBag: number[] = [];
  let lowSlot: number | null = null;

  function dress(caption: Caption, text: string, gloss: string, px: number) {
    caption.animation?.cancel();
    caption.el.dataset.t = text;
    caption.word.data = text;
    caption.gloss.textContent = gloss;
    caption.gloss.hidden = !gloss;
    caption.el.style.fontSize = `${px.toFixed(1)}px`;
    // Last in the layer, so the newest word is on top.
    layer.append(caption.el);
  }

  function nextSlot(avoidTop: boolean): readonly [number, number] {
    if (avoidTop) {
      lowSlot = ((lowSlot ?? Math.floor(random() * LOW_SLOTS)) + 1) % LOW_SLOTS;
      return SLOTS[FIRST_LOW_SLOT + lowSlot];
    }
    if (slotBag.length === 0) {
      slotBag = SLOTS.map((_, i) => i);
      for (let i = slotBag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [slotBag[i], slotBag[j]] = [slotBag[j], slotBag[i]];
      }
    }
    return SLOTS[slotBag.pop() ?? 0];
  }

  return {
    setLayout(width, height, top) {
      screen = { width, height, top };
    },

    slamTierName(text, gloss) {
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
      const fit = Math.min(1, (screen.width - SLAM_MARGIN * 2) / reach);
      // The gloss stays at its fine-print size.
      caption.gloss.style.transformOrigin = fit < 1 ? "0 0" : "";
      caption.gloss.style.transform = fit < 1 ? `rotate(3deg) scale(${(1 / fit).toFixed(3)})` : "";
      // Centered on the screen, its top on the band above the heart.
      const x = (screen.width - w) / 2;
      const y = screen.top + 4 - (ht * (1 - fit)) / 2;
      const base = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(-5deg) scale(${fit.toFixed(3)})`;
      slamUntil = performance.now() + SLAM_MS;
      // In small and tilted hard, springing to its slant: it never leaves the screen.
      caption.animation = animate(
        caption.el,
        [
          { transform: `${base} rotate(-11deg) scale(.55)`, opacity: 0, easing: EASE_SPRING },
          { offset: 0.18, transform: `${base} rotate(0deg) scale(1)`, opacity: 1 },
          { offset: 0.72, transform: `${base} rotate(0deg) scale(1)`, opacity: 1 },
          { transform: `${base} translateY(-8px) rotate(0deg) scale(1.02)`, opacity: 0 },
        ],
        { duration: SLAM_MS, easing: "linear", fill: "both" },
      );
    },

    showPopInWord(bank, heart) {
      const { jp, gloss } = pick(bank);
      if (typeof bank === "number") tierShown = bank;
      const px = POP_PX[tierShown] * grow;
      const caption = (pops.length >= POP_INS ? pops.shift() : undefined) ?? makeCaption("gr-pop");
      pops.push(caption);
      dress(caption, jp, gloss, px);

      const size = wordSize(jp, POP_HEIGHT_GUESS);
      const w = size.width * px;
      const ht = size.height * px;
      // Room for a gloss that reaches past its word.
      const withGloss = Math.max(w, POP_GLOSS_LEFT * w + glossWidth(gloss) + 6);
      const [sx, sy] = nextSlot(performance.now() < slamUntil);
      const cx = heart.x + sx * heart.width + (random() - 0.5) * 26;
      const cy = heart.y + sy * heart.height + (random() - 0.5) * 18;
      const rot = (random() - 0.5) * 44;
      const dy = -(16 + random() * 22);
      let dx = sx * 26 + (random() - 0.5) * 14;
      const duration = 620 + random() * 560;
      // The whole word stays on screen for its whole life: its tilt, the spring's peak and the
      // outline reach past its box, and at an edge it drifts along the edge instead of off it.
      const rad = (Math.abs(rot) * Math.PI) / 180;
      const ring = px * 0.14;
      const ex = ((w * Math.cos(rad) + ht * Math.sin(rad)) * 1.14 - w) / 2 + ring;
      const xMin = 8 + ex;
      const xMax = Math.max(xMin, screen.width - 8 - ex - withGloss);
      const x = clamp(cx - w / 2, xMin, xMax);
      const yMin = screen.top + 2;
      const y = clamp(cy - ht / 2, yMin, Math.max(yMin, screen.height - ht - 36));
      dx = clamp(dx, xMin - x, xMax - x);
      const at = (k: number, scale: number) =>
        `translate(${(x + dx * k).toFixed(1)}px,${(y + dy * k).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale})`;
      caption.animation = animate(
        caption.el,
        [
          { transform: at(0, 0), opacity: 1, easing: EASE_SPRING },
          { offset: 0.2, transform: at(0.1, 1), opacity: 1 },
          { offset: 0.64, transform: at(0.6, 1), opacity: 1 },
          { transform: at(1, 0.96), opacity: 0 },
        ],
        { duration, easing: "linear", fill: "both" },
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
    },
  };
}
