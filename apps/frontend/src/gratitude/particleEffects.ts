import { EASE_OUT, EASE_PEEL } from "./easing";
import { BEAD_SVG, GLINT_SVG, PUFF_SVG, miniHeartSvg, stampHeartSvg, svgDataUrl } from "./heartArt";
import type { HeartBox } from "./miniHeartPhysics";

export interface ParticleEffects {
  /** A finger stamp where a touch landed. */
  stamp: (x: number, y: number) => void;
  /** Hearts floating up off the heart's top. */
  rise: (count: number, heart: HeartBox) => void;
  /** A sparkle beside the heart. */
  glint: (heart: HeartBox) => void;
  /** Puffs of steam off the heart's shoulders. */
  steam: (count: number, heart: HeartBox) => void;
  /** A sweat bead flicked off the heart's side. */
  bead: (heart: HeartBox) => void;
  /** Hearts thrown out in a ring from `at`. */
  burst: (count: number, at: { x: number; y: number }) => void;
  /** Speed lines streaming past (x, y) along a thumb's velocity, in px/ms. */
  streamLines: (x: number, y: number, velocity: { x: number; y: number; speed: number }) => void;
  /** The stamps leave, one after another. */
  tidy: () => void;
}

type Kind = "rise" | "glint" | "puff" | "bead" | "burst";

const PINK = "#FF4F9A";
const HEART_URL = svgDataUrl(miniHeartSvg(PINK));
/** Each kind's art, made into a URL once, and how many of it are on screen at most. */
const SPRITES: Record<Kind, { url: string; cap: number }> = {
  rise: { url: HEART_URL, cap: 18 },
  glint: { url: svgDataUrl(GLINT_SVG), cap: 8 },
  puff: { url: svgDataUrl(PUFF_SVG), cap: 10 },
  bead: { url: svgDataUrl(BEAD_SVG), cap: 6 },
  burst: { url: HEART_URL, cap: 12 },
};
const STAMP_URL = svgDataUrl(stampHeartSvg());
/** Stamps kept on the heart's stage; past this the oldest fades. */
const STAMPS = 16;
/** Speed lines on screen at most. */
const LINES = 40;

/** A pooled sprite and the animation it was last given, cancelled when it's reused. */
interface Sprite {
  el: HTMLDivElement;
  animation: Animation | null;
}

interface Stamp extends Sprite {
  /** Where it sits: every animation starts from it. */
  base: string;
}

function makeSprite(url: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "gr-p";
  el.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  el.append(img);
  return el;
}

function makeLine(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "gr-line";
  el.setAttribute("aria-hidden", "true");
  return el;
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

const at = (x: number, y: number) => `translate(${x}px,${y}px)`;

/** The heart's small effects, each from a fixed set of elements per kind. */
export function createParticleEffects(
  layers: { stamps: HTMLElement; effects: HTMLElement; lines: HTMLElement },
  options: { reduced: () => boolean; random: () => number },
): ParticleEffects {
  const { reduced, random } = options;
  const pools: Record<Kind, Sprite[]> = { rise: [], glint: [], puff: [], bead: [], burst: [] };
  /** On screen, oldest first. */
  const stamps: Stamp[] = [];
  /** Faded out and off the page, ready for the next stamp. */
  const spareStamps: Stamp[] = [];
  const lines: Sprite[] = [];

  /** The kind's oldest sprite once it has its fill, otherwise a new one; sized `size` px square. */
  function particle(kind: Kind, size: number): Sprite {
    const { url, cap } = SPRITES[kind];
    const pool = pools[kind];
    const sprite = (pool.length >= cap ? pool.shift() : undefined) ?? {
      el: layers.effects.appendChild(makeSprite(url)),
      animation: null,
    };
    pool.push(sprite);
    sprite.el.style.width = `${size}px`;
    sprite.el.style.height = `${size}px`;
    return sprite;
  }

  function fly(sprite: Sprite, frames: Keyframe[], duration: number, easing = EASE_PEEL) {
    sprite.animation?.cancel();
    sprite.animation = animate(sprite.el, frames, { duration, easing, fill: "both" });
  }

  /** With reduced motion: the sprite fades in and out where it starts, with no travel, spin or spring. */
  function fadeInPlace(sprite: Sprite, transform: string, duration: number, peak = 1) {
    fly(
      sprite,
      [
        { transform, opacity: 0 },
        { offset: 0.3, transform, opacity: peak },
        { transform, opacity: 0 },
      ],
      duration,
      EASE_OUT,
    );
  }

  /** Plays a stamp's way out, then takes it off the page to be reused. */
  function retire(stamp: Stamp, frames: Keyframe[], timing: KeyframeAnimationOptions) {
    stamp.animation?.cancel();
    const animation = animate(stamp.el, frames, timing);
    stamp.animation = animation;
    animation.onfinish = () => {
      stamp.el.remove();
      spareStamps.push(stamp);
    };
  }

  return {
    stamp(x, y) {
      const s = 26 + random() * 10;
      const rot = -4 + (random() - 0.5) * 26;
      const stamp = spareStamps.pop() ?? { el: makeSprite(STAMP_URL), animation: null, base: "" };
      stamp.animation?.cancel();
      stamp.animation = null;
      stamp.base = `translate(${(x - s / 2).toFixed(1)}px,${(y - s / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      stamp.el.style.width = `${s}px`;
      stamp.el.style.height = `${s}px`;
      stamp.el.style.transform = stamp.base;
      layers.stamps.append(stamp.el);
      if (!reduced()) {
        stamp.animation = animate(
          stamp.el,
          [
            { transform: `${stamp.base} scale(0)` },
            { offset: 0.6, transform: `${stamp.base} scale(1.15)` },
            { transform: `${stamp.base} scale(1)` },
          ],
          { duration: 200, easing: EASE_PEEL },
        );
      }
      stamps.push(stamp);
      const oldest = stamps.length > STAMPS ? stamps.shift() : undefined;
      if (oldest) {
        const shrink = reduced() ? {} : { transform: `${oldest.base} scale(.4)` };
        retire(oldest, [{ opacity: 1 }, { opacity: 0, ...shrink }], {
          duration: 160,
          fill: "forwards",
        });
      }
    },

    rise(count, heart) {
      for (let i = 0; i < count; i++) {
        const s = 14 + random() * 14;
        const ox = heart.x + (random() - 0.5) * heart.width * 0.5;
        const oy = heart.y - heart.height * 0.38;
        const sprite = particle("rise", s);
        const dx = (random() - 0.5) * 90;
        const dy = -(90 + random() * 110);
        const r0 = (random() - 0.5) * 30;
        const r1 = r0 + (random() - 0.5) * 50;
        const x = ox - s / 2;
        const y = oy - s / 2;
        if (reduced()) {
          // A small fade-up at the heart: no travel, no spin, nothing thrown.
          fly(
            sprite,
            [
              { transform: at(x, y), opacity: 0 },
              { offset: 0.3, transform: at(x, y - 5), opacity: 1 },
              { transform: at(x, y - 14), opacity: 0 },
            ],
            600,
            EASE_OUT,
          );
          continue;
        }
        fly(
          sprite,
          [
            { transform: `${at(x, y)} scale(.3) rotate(${r0}deg)`, opacity: 0 },
            {
              offset: 0.14,
              transform: `${at(x + dx * 0.12, y + dy * 0.12)} scale(1.05) rotate(${r0}deg)`,
              opacity: 1,
            },
            { offset: 0.7, opacity: 1 },
            { transform: `${at(x + dx, y + dy)} scale(.8) rotate(${r1}deg)`, opacity: 0 },
          ],
          950 + random() * 350,
        );
      }
    },

    glint(heart) {
      const a = random() * Math.PI * 2;
      const r = 0.58 + random() * 0.2;
      const x = heart.x + Math.cos(a) * heart.width * r;
      const y = heart.y + Math.sin(a) * heart.height * r * 0.9;
      const s = 16 + random() * 14;
      const sprite = particle("glint", s);
      const spot = at(x - s / 2, y - s / 2);
      if (reduced()) {
        fadeInPlace(sprite, spot, 520);
        return;
      }
      fly(
        sprite,
        [
          { transform: `${spot} scale(0) rotate(0deg)`, opacity: 1 },
          { offset: 0.45, transform: `${spot} scale(1.1) rotate(45deg)`, opacity: 1 },
          { transform: `${spot} scale(0) rotate(90deg)`, opacity: 1 },
        ],
        520,
      );
    },

    steam(count, heart) {
      for (let i = 0; i < count; i++) {
        const side = random() < 0.5 ? -1 : 1;
        const s = 26 + random() * 20;
        const x = heart.x + side * heart.width * (0.22 + random() * 0.12) - s / 2;
        const y = heart.y - heart.height * 0.44 - s / 2;
        const sprite = particle("puff", s);
        if (reduced()) {
          fadeInPlace(sprite, at(x, y), 900, 0.95);
          continue;
        }
        const dx = side * (18 + random() * 30);
        const dy = -(50 + random() * 50);
        fly(
          sprite,
          [
            { transform: `${at(x, y)} scale(.4)`, opacity: 0 },
            {
              offset: 0.2,
              transform: `${at(x + dx * 0.2, y + dy * 0.2)} scale(.9)`,
              opacity: 0.95,
            },
            { transform: `${at(x + dx, y + dy)} scale(1.7)`, opacity: 0 },
          ],
          900,
        );
      }
    },

    bead(heart) {
      const side = random() < 0.5 ? -1 : 1;
      const x = heart.x + side * heart.width * 0.4;
      const y = heart.y - heart.height * 0.2;
      const sprite = particle("bead", 13);
      if (reduced()) {
        fadeInPlace(sprite, `${at(x, y)} rotate(${side * 30}deg)`, 700);
        return;
      }
      fly(
        sprite,
        [
          { transform: `${at(x, y)} rotate(${side * 30}deg) scale(.4)`, opacity: 0 },
          { offset: 0.2, opacity: 1 },
          {
            transform: `${at(x + side * 40, y + 50)} rotate(${side * 60}deg) scale(1)`,
            opacity: 0,
          },
        ],
        700,
        EASE_OUT,
      );
    },

    burst(count, from) {
      for (let i = 0; i < count; i++) {
        const s = 12 + random() * 10;
        const a = (i / count) * Math.PI * 2 + random();
        const sprite = particle("burst", s);
        const d = 50 + random() * 40;
        const x = from.x - s / 2;
        const y = from.y - s / 2;
        if (reduced()) {
          // The ring shows where it would have spread to halfway, and holds still.
          fadeInPlace(sprite, at(x + Math.cos(a) * d * 0.5, y + Math.sin(a) * d * 0.5), 520);
          continue;
        }
        fly(
          sprite,
          [
            { transform: `${at(x, y)} scale(.3)`, opacity: 1 },
            { transform: `${at(x + Math.cos(a) * d, y + Math.sin(a) * d)} scale(1)`, opacity: 0 },
          ],
          520,
        );
      }
    },

    streamLines(x, y, velocity) {
      if (velocity.speed < 0.2 || reduced()) return;
      const count = Math.min(3, 1 + Math.floor(velocity.speed * 2));
      const angle = Math.atan2(velocity.y, velocity.x);
      const deg = (angle * 180) / Math.PI;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      for (let i = 0; i < count; i++) {
        const line = (lines.length >= LINES ? lines.shift() : undefined) ?? {
          el: layers.lines.appendChild(makeLine()),
          animation: null,
        };
        lines.push(line);
        // Spread across the stroke, trailing behind the thumb.
        const off = (random() - 0.5) * 230;
        const length = 50 + Math.min(180, velocity.speed * 130);
        line.el.style.width = `${length.toFixed(1)}px`;
        line.el.style.height = `${(1.4 + random() * 2.4).toFixed(2)}px`;
        const sx = x - dy * off - dx * (length * 0.8 + random() * 30);
        const sy = y + dx * off - dy * (length * 0.8 + random() * 30);
        fly(
          line,
          [
            { transform: `${at(sx, sy)} rotate(${deg}deg)`, opacity: 0.9 },
            {
              transform: `${at(sx + dx * 60, sy + dy * 60)} rotate(${deg}deg) scaleX(.6)`,
              opacity: 0,
            },
          ],
          240,
          "linear",
        );
      }
    },

    tidy() {
      const leaving = stamps.splice(0);
      // A crowd of stamps takes no longer to leave than a few: the stagger tightens.
      const stagger = leaving.length > 0 ? Math.min(28, 330 / leaving.length) : 0;
      const still = reduced();
      leaving.forEach((stamp, i) =>
        retire(
          stamp,
          still
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { transform: stamp.base, opacity: 1 },
                {
                  transform: `${stamp.base} translateY(-10px) rotate(12deg) scale(.2)`,
                  opacity: 0,
                },
              ],
          { duration: 200, delay: i * stagger, fill: "forwards", easing: EASE_PEEL },
        ),
      );
    },
  };
}
