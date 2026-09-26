import { notePerformance } from "../performance/performanceRecorder";
import type { ComboHud } from "./comboHud";
import { EASE_OUT, EASE_PEEL, clamp, easeInOutSine, lerp } from "./easing";
import { FEEL_CONFIG } from "./gameConfig";
import type { HeartFace } from "./heartFaces";
import type { HeartMotion } from "./heartMotion";
import type { MiniHeartLayer } from "./miniHeartLayer";
import type { HeartBox, MiniHeartPhysics } from "./miniHeartPhysics";
import type { ParticleEffects } from "./particleEffects";
import type { TierBackground } from "./tierBackground";
import { TIER_NAMES } from "./tierNames";
import type { Lettering } from "./tierSlamAndPopIns";

/** What the endings play on: the engine's parts, its play clock and the screen's elements. */
export interface EndingParts {
  heart: HeartMotion;
  background: TierBackground;
  lettering: Lettering;
  effects: ParticleEffects;
  physics: MiniHeartPhysics;
  miniHearts: MiniHeartLayer;
  hud: ComboHud;
  giverPhoto: HTMLElement;
  giverDot: HTMLElement;
  /** The middle of the giver's picture, in the stage's pixels. */
  giverPoint: () => { x: number; y: number };
  fuu: HTMLElement;
  soul: HTMLElement;
  /** The heart as last drawn: where it is, loose or not, at the size it's drawn. */
  heartBox: () => HeartBox;
  /** The heart's resting box. */
  restBox: () => HeartBox;
  /** The heart's middle as last drawn: in the giver's picture once it has flown there. */
  heartPoint: () => { x: number; y: number };
  screenWidth: () => number;
  /** Resolves after `ms` of play time, which stops while the screen is held. */
  wait: (ms: number) => Promise<void>;
  /** Holds the screen, play time included, for `ms`. */
  freeze: (ms: number) => void;
  /** Layers over the tier's face until called again; null shows the tier's face. */
  forceFace: (face: Partial<HeartFace> | null) => void;
  reduced: () => boolean;
  intensity: number;
  /** Announces through the screen's polite live region. */
  say: (text: string) => void;
  /** As printed: "@alice". */
  giverHandle: string;
}

/** tokens.css's --tilt, spelled out: Web Animations can't read CSS variables. */
const TILT = "rotate(-4deg)";
const SOUL_RISE_MS = 1500;
const SIGH_MS = 1000;

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

/**
 * The giver's picture squashes as the heart lands in it and takes its heart dot, and the live region
 * says the gratitude sent. With reduced motion the picture holds still and the dot fades in.
 */
function hitGiver(parts: EndingParts, total: number) {
  if (parts.reduced()) {
    animate(
      parts.giverDot,
      [
        { transform: `scale(1) ${TILT}`, opacity: 0 },
        { transform: `scale(1) ${TILT}`, opacity: 1 },
      ],
      { duration: 220, easing: EASE_OUT, fill: "forwards" },
    );
  } else {
    // Unlike the dot, the picture's holder is upright: the sticker inside it carries the tilt.
    animate(
      parts.giverPhoto,
      [
        { transform: "scale(1)" },
        { offset: 0.25, transform: "scale(1.16, .88)" },
        { offset: 0.6, transform: "scale(.96, 1.04)" },
        { transform: "scale(1)" },
      ],
      { duration: 360, easing: EASE_PEEL },
    );
    animate(
      parts.giverDot,
      [
        { transform: `scale(0) ${TILT}`, opacity: 1 },
        { offset: 0.6, transform: `scale(1.15) ${TILT}`, opacity: 1 },
        { transform: `scale(1) ${TILT}`, opacity: 1 },
      ],
      { duration: 220, easing: EASE_PEEL, fill: "forwards" },
    );
  }
  parts.effects.burst(6, parts.giverPoint());
  parts.say(`Sent ${total.toLocaleString("en-US")} gratitude to ${parts.giverHandle}.`);
}

/**
 * The heart flies into the giver's picture, or fades out with reduced motion, and the picture takes
 * it. `total`: the combo's gratitude, which the live region says.
 */
export async function flyHeartToGiver(parts: EndingParts, total: number): Promise<void> {
  notePerformance("gratitude", "ending: fly to the giver");
  // The finger stamps go with the heart, rather than hang where it was.
  parts.effects.tidy();
  await parts.heart.flyToGiver();
  hitGiver(parts, total);
}

/** The soul drifts up from the heart to the giver's picture, weaving less as it nears. */
function riseSoul(parts: EndingParts) {
  const heart = parts.heartPoint();
  const from = { x: heart.x, y: heart.y - 10 };
  const to = parts.giverPoint();
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    const e = easeInOutSine(k);
    const x = lerp(from.x, to.x, e) + Math.sin(k * Math.PI * 3) * 14 * (1 - k);
    const y = lerp(from.y, to.y, e);
    const scale = lerp(0.5, 0.9, Math.min(1, k * 3));
    frames.push({
      transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(3)})`,
      opacity: k < 0.1 ? k * 10 : k > 0.9 ? (1 - k) * 10 : 1,
    });
  }
  animate(parts.soul, frames, { duration: SOUL_RISE_MS, easing: "linear", fill: "both" });
}

/**
 * 昇天's climax: a flash, the heart goes limp and pale, 昇天 slams in, and its soul rises to the giver.
 * `total` as for flyHeartToGiver.
 */
export async function playAscension(parts: EndingParts, total: number): Promise<void> {
  notePerformance("gratitude", "ending: 昇天");
  const { background, heart, lettering } = parts;
  parts.freeze(FEEL_CONFIG.climaxFreezeMs);
  background.flash();
  // The nosebleed, if there is one, stays.
  parts.forceFace({ face: "limp", blush: 0, sweat: false, ink: false, pale: true });
  heart.goLimp();
  background.ascend(true, parts.intensity);
  await parts.wait(240);
  const { jp, en } = TIER_NAMES[4];
  lettering.slamTierName(jp, en);
  lettering.showPopInWord("climax", parts.heartBox());
  await parts.wait(380);
  lettering.showPopInWord("climax", parts.heartBox());
  riseSoul(parts);
  await parts.wait(SOUL_RISE_MS);
  hitGiver(parts, total);
  background.ascend(false, parts.intensity);
  await parts.wait(250);
}

/**
 * "fuu…" drifts up for a moment, or fades in place with reduced motion, then the stamps, the mini
 * hearts, the ground and the heart clear away.
 */
export async function sighAndTidy(parts: EndingParts): Promise<void> {
  notePerformance("gratitude", "ending: sigh");
  // Over where the heart rested, clear of its pale art and of the screen's edges.
  const box = parts.restBox();
  const width = parts.fuu.offsetWidth || 120;
  const height = parts.fuu.offsetHeight || 32;
  const x = clamp(box.x - width / 2, 16, parts.screenWidth() - width - 16);
  const y = box.y - box.height / 2 - FEEL_CONFIG.sighAboveHeartPx - height;
  const at = (dx: number, dy: number, scale: number) =>
    `translate(${(x + dx).toFixed(1)}px,${(y + dy).toFixed(1)}px) scale(${scale})`;
  const still = at(0, 0, 1);
  animate(
    parts.fuu,
    parts.reduced()
      ? [
          { transform: still, opacity: 0 },
          { offset: 0.25, transform: still, opacity: 1 },
          { offset: 0.7, transform: still, opacity: 1 },
          { transform: still, opacity: 0 },
        ]
      : [
          { transform: at(0, 0, 0.9), opacity: 0 },
          { offset: 0.25, transform: at(0, -6, 1), opacity: 1 },
          { offset: 0.7, transform: at(6, -14, 1), opacity: 1 },
          { transform: at(12, -26, 1.02), opacity: 0 },
        ],
    { duration: SIGH_MS, easing: EASE_OUT, fill: "both" },
  );
  await parts.wait(SIGH_MS);
  parts.effects.tidy();
  parts.physics.clear();
  parts.miniHearts.clear();
  parts.background.hideAll();
  parts.heart.fadeOut();
  await parts.wait(400);
}
