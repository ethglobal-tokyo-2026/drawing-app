import { describe, expect, it } from "vitest";
import {
  BALLOONS,
  cloudShape,
  FURIGANA_WORD_MIN_PX,
  PAIR_AT,
  pairLayout,
  ROOM_PX,
  TIGHT_WORD_PX,
  toScreen,
  wordSizePx,
  type Box,
  type PairLayout,
  type PlacedBalloon,
  type Pt,
} from "./balloonGeometry";

/**
 * The space between the timer's label and the task line on a 390 × 844 phone, a 375 × 640 one, and a
 * 375 × 560 one: an iPhone SE inside LINE.
 */
const TALL = { width: 390, top: 142, bottom: 641 };
const SHORT = { width: 375, top: 142, bottom: 437 };
const SE = { width: 375, top: 142, bottom: 357 };

/** Whether `p` lies inside the closed outline `poly` (even-odd). */
function inside(p: Pt, poly: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      hit = !hit;
  }
  return hit;
}
const inBox = (p: Pt, box: Box) =>
  p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
const onScreen = (b: PlacedBalloon) => b.cloud.white.map((p) => toScreen(b, p));
const beadBoxes = (b: PlacedBalloon) =>
  b.beads.map(({ at, r }) => {
    const c = toScreen(b, at);
    return { minX: c.x - r, minY: c.y - r, maxX: c.x + r, maxY: c.y + r };
  });
/** Everything the pair draws or lets you press, as boxes and outlines on the screen. */
function extent(layout: PairLayout) {
  const points = layout.balloons.flatMap((b) => [
    ...onScreen(b),
    ...[b.reroll, ...beadBoxes(b)].flatMap((box) => [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.maxY },
    ]),
  ]);
  return {
    top: Math.min(...points.map((p) => p.y)),
    bottom: Math.max(...points.map((p) => p.y)),
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
  };
}

describe("a G-pen cloud", () => {
  it("is drawn the same every time", () => {
    expect(cloudShape(BALLOONS[0])).toEqual(cloudShape(BALLOONS[0]));
  });

  it("boils: each frame redraws the line a little differently round the same white", () => {
    const { inks } = cloudShape(BALLOONS[1]);
    expect(new Set(inks).size).toBe(inks.length);
    expect(inks.length).toBeGreaterThan(1);
    for (const b of pairLayout(TALL).balloons) expect(new Set(b.beadsInks).size).toBe(inks.length);
  });

  it("holds a word of any length and its furigana inside its lobes, tightened or not", () => {
    const words = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "てるてる坊主"];
    for (const tight of [false, true])
      for (const placed of pairLayout(tight ? { ...SHORT, bottom: SHORT.top + 200 } : TALL)
        .balloons)
        for (const word of words) {
          const size = wordSizePx(word, tight);
          // Full-width characters a little apart, under a line of furigana.
          const half = { x: (word.length * size * 1.02) / 2, y: (16 + size * 1.05) / 2 };
          const corners = [-1, 1].flatMap((sx) =>
            [-1, 1].map((sy) => ({ x: sx * half.x, y: sy * half.y })),
          );
          expect(corners.every((c) => inside(c, placed.cloud.white))).toBe(true);
        }
  });
});

/** The two clouds never meet, and neither cloud's bubbles nor either reroll touch a cloud. */
function expectKeptApart(layout: PairLayout) {
  const [upper, lower] = layout.balloons.map(onScreen);
  expect(upper.some((p) => inside(p, lower))).toBe(false);
  expect(lower.some((p) => inside(p, upper))).toBe(false);
  for (const b of layout.balloons)
    for (const other of layout.balloons) {
      expect(onScreen(other).some((p) => inBox(p, b.reroll))).toBe(false);
      if (other !== b)
        for (const bead of beadBoxes(b))
          expect(onScreen(other).some((p) => inBox(p, bead))).toBe(false);
    }
}

describe("the pair", () => {
  for (const [phone, space] of [
    ["390 × 844", TALL],
    ["375 × 640", SHORT],
  ] as const)
    it(`keeps the clouds, their bubbles and their rerolls apart and inside the space on a ${phone} phone`, () => {
      const layout = pairLayout(space);
      expectKeptApart(layout);
      const { top, bottom, left, right } = extent(layout);
      expect(top).toBeGreaterThanOrEqual(space.top);
      expect(bottom).toBeLessThanOrEqual(space.bottom);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(space.width);
    });

  it("on a phone too short for the lower reroll under its cloud, sets it beside the cloud's right side, and never puts a reroll on the task line or past the screen's sides", () => {
    const layout = pairLayout(SE);
    const [, lower] = layout.balloons;
    expectKeptApart(layout);
    expect(lower.reroll.minX).toBeGreaterThanOrEqual(Math.max(...onScreen(lower).map((p) => p.x)));
    // It may take some of the room kept under the timer's label, never the label itself.
    const { top, bottom } = extent(layout);
    expect(top).toBeGreaterThanOrEqual(SE.top - ROOM_PX);
    expect(bottom).toBeLessThanOrEqual(SE.bottom);
    for (let foot = SE.bottom; foot >= SE.bottom - 60; foot -= 5)
      for (const { reroll } of pairLayout({ ...SE, bottom: foot }).balloons) {
        expect(reroll.maxY).toBeLessThanOrEqual(foot);
        expect(reroll.minX).toBeGreaterThanOrEqual(0);
        expect(reroll.maxX).toBeLessThanOrEqual(SE.width);
      }
  });

  it("sets each reroll just under its own cloud's right edge where there's room", () => {
    for (const b of [TALL, SHORT].flatMap((space) => pairLayout(space).balloons)) {
      const cloud = onScreen(b);
      const rightmost = Math.max(...cloud.map((p) => p.x));
      const foot = Math.max(...cloud.map((p) => p.y));
      expect(b.reroll.maxX).toBeLessThanOrEqual(rightmost);
      expect(b.reroll.maxX).toBeGreaterThan(rightmost - 24);
      expect(b.reroll.minY).toBeGreaterThan(b.center.y);
      expect(b.reroll.minY).toBeLessThanOrEqual(foot + 8);
      expect(inBox(b.die, b.reroll)).toBe(true);
    }
  });

  it("stands about PAIR_AT of the way down the space when there's room", () => {
    const { top, bottom } = extent(pairLayout(TALL));
    const at = ((top + bottom) / 2 - TALL.top) / (TALL.bottom - TALL.top);
    expect(at).toBeCloseTo(PAIR_AT, 2);
  });

  it("tightens rather than scaling when the space is shorter than the pair, and never lets the clouds meet", () => {
    expect(pairLayout(TALL).tight).toBe(false);
    const cramped = pairLayout({ ...SHORT, bottom: SHORT.top + 200 });
    expect(cramped.tight).toBe(true);
    const [upper, lower] = cramped.balloons.map(onScreen);
    expect(upper.some((p) => inside(p, lower))).toBe(false);
    expect(lower.some((p) => inside(p, upper))).toBe(false);
  });

  it("trails each cloud's bubbles off toward the thinker at the left, each smaller and farther out", () => {
    for (const b of pairLayout(TALL).balloons) {
      const out = b.beads.map(({ at }) => Math.hypot(at.x, at.y));
      expect(out).toEqual(out.toSorted((x, y) => x - y));
      expect(b.beads.map((d) => d.r)).toEqual(b.beads.map((d) => d.r).toSorted((x, y) => y - x));
      expect(b.beads.every(({ at }) => toScreen(b, at).x < b.center.x)).toBe(true);
    }
  });
});

describe("a subject's word", () => {
  it("sets a longer word smaller, never under FURIGANA_WORD_MIN_PX, and no bigger than TIGHT_WORD_PX when tight", () => {
    const sizes = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "てるてる坊主"].map((w) =>
      wordSizePx(w, false),
    );
    expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(FURIGANA_WORD_MIN_PX);
    expect(wordSizePx("風", true)).toBeLessThanOrEqual(TIGHT_WORD_PX);
  });
});
