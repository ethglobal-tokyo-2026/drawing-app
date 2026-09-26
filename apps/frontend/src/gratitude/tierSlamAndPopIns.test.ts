// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import { FEEL_CONFIG } from "./gameConfig";
import type { HeartBox } from "./miniHeartPhysics";
import type { PopInBank } from "./popInWords";
import { createLettering } from "./tierSlamAndPopIns";

/** The engine's stage and resting heart on a 390 × 741 phone. */
const SCREEN = { width: 390, height: 741, top: 256 };
const HEART: HeartBox = { x: 195, y: 440, width: 226, height: 218 };
const BANKS: readonly PopInBank[] = [0, 1, 2, 3, 4, "stroke", "shake"];

/** Each caption's latest animation: what it shows, from when, for how long. */
const played = new Map<HTMLElement, { frames: Keyframe[]; at: number; duration: number }>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance"] });
  played.clear();
  vi.spyOn(Element.prototype, "animate").mockImplementation(function (
    this: Element,
    frames,
    options,
  ) {
    if (this instanceof HTMLElement && Array.isArray(frames) && typeof options === "object") {
      played.set(this, { frames, at: performance.now(), duration: Number(options.duration) });
    }
    return new Animation();
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

describe("pop-in words", () => {
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
