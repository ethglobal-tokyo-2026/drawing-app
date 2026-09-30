// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import { FEEL_CONFIG } from "./gameConfig";
import type { HeartBox } from "./miniHeartPhysics";
import type { PopInBank } from "./popInWords";
import { TIER_NAMES } from "./tierNames";
import { createLettering, UNLOCK_SLAMS } from "./tierSlamAndPopIns";

/** The engine's stage and resting heart on a 390 × 741 phone. */
const SCREEN = { width: 390, height: 741, top: 256 };
const HEART: HeartBox = { x: 195, y: 440, width: 226, height: 218 };
const BANKS: readonly PopInBank[] = [0, 1, 2, 3, 4, "stroke", "shake"];

/** Each caption's latest animation: what it shows, from when, for how long, and the animation itself. */
const played = new Map<
  HTMLElement,
  { frames: Keyframe[]; at: number; duration: number; animation: Animation }
>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance"] });
  played.clear();
  vi.spyOn(Element.prototype, "animate").mockImplementation(function (
    this: Element,
    frames,
    options,
  ) {
    const animation = new Animation();
    if (this instanceof HTMLElement && Array.isArray(frames) && typeof options === "object") {
      played.set(this, {
        frames,
        at: performance.now(),
        duration: Number(options.duration),
        animation,
      });
    }
    return animation;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
});

/** The x and y each of a word's frames puts it at. */
const framePlaces = (el: Element | null) => {
  const shown = el instanceof HTMLElement ? played.get(el) : undefined;
  if (!shown) throw new Error("No word was shown");
  return shown.frames.map(({ transform }) => {
    const m = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(String(transform));
    if (!m) throw new Error(`Unexpected transform: ${String(transform)}`);
    return [Number(m[1]), Number(m[2])];
  });
};

function lettering(seed: number) {
  const layer = document.createElement("div");
  const made = createLettering(layer, {
    intensity: FEEL_CONFIG.intensity.full,
    random: seededRandom(seed),
    reduced: () => false,
  });
  made.setLayout(SCREEN.width, SCREEN.height, SCREEN.top);
  return made;
}

/** Pop-ins on screen now, as their words. */
function onScreen(): string[] {
  const now = performance.now();
  return [...played]
    .filter(([el, p]) => el.classList.contains("gr-pop") && p.at + p.duration > now)
    .map(([el]) => el.dataset.t ?? "");
}

/** Points across a word's letters, where a frame puts them: the layer's own guess at their size. */
function letterPoints(el: HTMLElement, transform: string) {
  const m = /translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\) scale\(([-\d.]+)\)/.exec(
    transform,
  );
  if (!m) throw new Error(`Unexpected transform: ${transform}`);
  const [x, y, deg, scale] = m.slice(1).map(Number);
  const px = parseFloat(el.style.fontSize);
  const w = (el.dataset.t ?? "").length * px;
  const ht = 1.4 * px;
  const cos = Math.cos((deg * Math.PI) / 180);
  const sin = Math.sin((deg * Math.PI) / 180);
  const points: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 2; j++) {
      const u = (i / 4 - 0.5) * w * scale;
      const v = (j / 2 - 0.5) * ht * scale;
      points.push([x + w / 2 + u * cos - v * sin, y + ht / 2 + u * sin + v * cos]);
    }
  }
  return points;
}

/** A word's letters as a rotated rectangle at one of its frames, by the layer's own guess at their size. */
function wordShape(el: HTMLElement, transform: string, heightGuess: number) {
  const m = /translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\) scale\(([-\d.]+)\)/.exec(
    transform,
  );
  if (!m) throw new Error(`Unexpected transform: ${transform}`);
  const [x, y, deg, scale] = m.slice(1).map(Number);
  const px = parseFloat(el.style.fontSize);
  const w = (el.dataset.t ?? "").length * px;
  const ht = heightGuess * px;
  return { cx: x + w / 2, cy: y + ht / 2, rad: (deg * Math.PI) / 180, w: w * scale, h: ht * scale };
}

/** Whether a point lies in a word's letters. */
function inLetters([x, y]: [number, number], s: ReturnType<typeof wordShape>) {
  const dx = x - s.cx;
  const dy = y - s.cy;
  const along = dx * Math.cos(s.rad) + dy * Math.sin(s.rad);
  const across = dy * Math.cos(s.rad) - dx * Math.sin(s.rad);
  return Math.abs(along) <= s.w / 2 && Math.abs(across) <= s.h / 2;
}

/** A pop-in's frames at full size: landed, and drifted before it fades. */
const restingFrames = (el: HTMLElement) =>
  (played.get(el)?.frames ?? []).filter((f) => f.opacity === 1 && f.offset !== undefined);

/** Pop-ins showing now, with their animations. */
function showing() {
  const now = performance.now();
  return [...played].filter(
    ([el, p]) => el.classList.contains("gr-pop") && p.at + p.duration > now,
  );
}

describe("pop-in words", () => {
  it("never land on each other: a word finds room, shrinks, or isn't shown", () => {
    const words = lettering(21);
    for (let i = 0; i < 400; i++) {
      words.showPopInWord(BANKS[i % BANKS.length], HEART);
      const live = showing();
      for (const [a] of live) {
        for (const [b] of live) {
          if (a === b) continue;
          for (const fb of restingFrames(b)) {
            const other = wordShape(b, String(fb.transform), 1.4);
            for (const fa of restingFrames(a)) {
              expect(
                letterPoints(a, String(fa.transform)).filter((p) => inLetters(p, other)),
              ).toEqual([]);
            }
          }
        }
      }
      vi.advanceTimersByTime(90);
    }
  });

  it("make way for a slam: words in its band play out at speed, and none lands on it while it holds", () => {
    let retired = 0;
    for (let seed = 1; seed <= 24; seed++) {
      played.clear();
      const words = lettering(seed);
      // Every place round the heart is taken, then the tier's name slams in over the band above it.
      for (let i = 0; i < 12; i++) words.showPopInWord(4, HEART);
      words.slamTierName("昇天", "ascension");
      for (let i = 0; i < 12; i++) words.showPopInWord(3, HEART);
      const slam = [...played].find(([el]) => el.classList.contains("gr-slam"));
      if (!slam) throw new Error("Nothing slammed");
      const landed = slam[1].frames[1];
      const slamLetters = wordShape(slam[0], String(landed.transform), 1.1);
      for (const [el, { animation }] of showing()) {
        if (animation.playbackRate > 1) {
          retired++;
          continue;
        }
        for (const frame of restingFrames(el)) {
          expect(
            letterPoints(el, String(frame.transform)).filter((p) => inLetters(p, slamLetters)),
          ).toEqual([]);
        }
      }
    }
    // The rule was in play: some seed had a word in the slam's band.
    expect(retired).toBeGreaterThan(0);
  });

  it("never land on the heart, with a slam holding the band above it or not", () => {
    const words = lettering(7);
    const keep = 0.5 - FEEL_CONFIG.popIns.heartInset;
    const inHeart = ([x, y]: [number, number]) =>
      Math.abs(x - HEART.x) < HEART.width * keep && Math.abs(y - HEART.y) < HEART.height * keep;
    for (let i = 0; i < 400; i++) {
      if (i % 9 === 0) words.slamTierName("オーバーヒート", "overheat");
      words.showPopInWord(BANKS[i % BANKS.length], HEART);
      for (const [el, { frames }] of played) {
        if (!el.classList.contains("gr-pop")) continue;
        // Its frames at full size: landed, and drifted before it fades.
        for (const frame of frames.filter((f) => f.opacity === 1 && f.offset !== undefined)) {
          expect(letterPoints(el, String(frame.transform)).filter(inHeart)).toEqual([]);
        }
      }
      vi.advanceTimersByTime(90);
    }
  });

  it("never show a word that's already on screen", () => {
    const words = lettering(11);
    for (let i = 0; i < 300; i++) {
      words.showPopInWord(BANKS[i % 3 === 0 ? 5 : 4], HEART);
      const shown = onScreen();
      expect(new Set(shown).size).toBe(shown.length);
      vi.advanceTimersByTime(60);
    }
  });

  it("land and drift on a smaller stage as in the live game, at its scale", () => {
    /** A stage `scale` of the live game's, as a replay's has, with no glosses. */
    const stage = (scale: number) => {
      const layer = document.createElement("div");
      const made = createLettering(layer, {
        intensity: FEEL_CONFIG.intensity.full,
        random: seededRandom(5),
        reduced: () => false,
        scale,
        glosses: false,
      });
      made.setLayout(SCREEN.width * scale, SCREEN.height * scale, SCREEN.top * scale);
      const { x, y, width, height } = HEART;
      const heart = { x: x * scale, y: y * scale, width: width * scale, height: height * scale };
      return (bank: PopInBank) => {
        made.showPopInWord(bank, heart);
        return framePlaces(layer.lastElementChild);
      };
    };
    const live = stage(1);
    const card = stage(0.5);
    for (let i = 0; i < 60; i++) {
      const bank = BANKS[i % BANKS.length];
      const full = live(bank);
      card(bank).forEach(([x, y], k) => {
        expect(x).toBeCloseTo(full[k][0] / 2, 0);
        expect(y).toBeCloseTo(full[k][1] / 2, 0);
      });
      vi.advanceTimersByTime(90);
    }
  });

  it("show only 尊い… and 天国… at the climax", () => {
    const words = lettering(3);
    words.showPopInWord("climax", HEART);
    words.showPopInWord("climax", HEART);
    expect(onScreen().sort()).toEqual(["天国…", "尊い…"].sort());
    // Both are on screen: a third would be a duplicate, so none shows.
    words.showPopInWord("climax", HEART);
    expect(onScreen()).toHaveLength(2);
  });
});

describe("slams", () => {
  it("center every word the engine slams in, as measured once the fonts load", async () => {
    // The probe lays each word out at its font size: a half-width em a character, here.
    const em = 0.55;
    const fontPx = (el: HTMLElement) => parseFloat(el.style.fontSize) || 11;
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return (this.textContent ?? "").length * em * fontPx(this);
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return 1.2 * fontPx(this);
    });
    Object.defineProperty(document, "fonts", {
      value: { ready: Promise.resolve(), status: "loaded" },
      configurable: true,
    });
    const layer = document.createElement("div");
    const words = createLettering(layer, {
      intensity: FEEL_CONFIG.intensity.full,
      random: seededRandom(1),
      reduced: () => false,
    });
    words.setLayout(SCREEN.width, SCREEN.height, SCREEN.top);
    await Promise.resolve();
    for (const { jp } of [...TIER_NAMES, ...Object.values(UNLOCK_SLAMS)]) {
      words.slamTierName(jp, "");
      const slam = layer.querySelector<HTMLElement>(".gr-slam");
      if (!slam) throw new Error(`${jp} slammed nothing`);
      const [[x]] = framePlaces(slam);
      expect(x + (jp.length * em * fontPx(slam)) / 2).toBeCloseTo(SCREEN.width / 2, 0);
    }
  });
});
