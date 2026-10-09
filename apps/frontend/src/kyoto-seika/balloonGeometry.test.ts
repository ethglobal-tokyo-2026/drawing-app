import { describe, expect, it } from "vitest";
import {
  BALLOONS,
  cloudShape,
  FURIGANA_WORD_MIN_PX,
  PAIR_AT,
  pairLayout,
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
/** The space on a 375-wide phone `height` tall: Begin keeps to the foot, so the space loses what the phone does. */
const phone = (height: number) => ({ ...SE, bottom: SE.bottom - (560 - height) });
const WORDS = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "てるてる坊主"];
/** The shortest and longest words, with kanji and furigana, and in Latin letters. */
const EXTREME_WORDS = ["風", "てるてる坊主", "AI", "BGM"];

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

  it("holds a word of any length and its furigana inside its lobes, however far it tightened", () => {
    const layouts = [TALL, phone(580), SE].map(pairLayout);
    expect(layouts.map((l) => l.fit)).toEqual(["roomy", "tight", "tighter"]);
    for (const layout of layouts)
      for (const placed of layout.balloons)
        for (const word of WORDS) expectHolds(placed, word, wordSizePx(word, layout.fit));
  });
});

/** `word` at `size` px, under a line of furigana, sits inside `placed`'s lobes. */
function expectHolds(placed: PlacedBalloon, word: string, size: number) {
  // Full-width characters a little apart, under a line of furigana.
  const half = { x: (word.length * size * 1.02) / 2, y: (16 + size * 1.05) / 2 };
  const corners = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => ({ x: sx * half.x, y: sy * half.y })),
  );
  expect(
    corners.every((c) => inside(c, placed.cloud.white)),
    `${word} at ${size}px`,
  ).toBe(true);
}

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
    const [, lower] = pairLayout(SE).balloons;
    expect(lower.reroll.minX).toBeGreaterThanOrEqual(Math.max(...onScreen(lower).map((p) => p.x)));
    for (let height = 560; height >= 500; height -= 5)
      for (const { reroll } of pairLayout(phone(height)).balloons) {
        expect(reroll.maxY).toBeLessThanOrEqual(phone(height).bottom);
        expect(reroll.minX).toBeGreaterThanOrEqual(0);
        expect(reroll.maxX).toBeLessThanOrEqual(SE.width);
      }
  });

  it("on phones down to 375 × 520, keeps the pair between the label's room and the task line's, and holds its words", () => {
    for (let height = 560; height >= 520; height -= 5) {
      const space = phone(height);
      const layout = pairLayout(space);
      expectKeptApart(layout);
      const { top, bottom } = extent(layout);
      expect(top, `${height}px tall`).toBeGreaterThanOrEqual(space.top);
      expect(bottom, `${height}px tall`).toBeLessThanOrEqual(space.bottom);
      for (const placed of layout.balloons)
        for (const word of EXTREME_WORDS) expectHolds(placed, word, wordSizePx(word, layout.fit));
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
    expect(pairLayout(TALL).fit).toBe("roomy");
    const cramped = pairLayout({ ...SHORT, bottom: SHORT.top + 200 });
    expect(cramped.fit).not.toBe("roomy");
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
  it("sets a longer word smaller, never under FURIGANA_WORD_MIN_PX, and no bigger as the clouds tighten", () => {
    const fits = ["roomy", "tight", "tighter"] as const;
    for (const fit of fits) {
      const sizes = WORDS.map((w) => wordSizePx(w, fit));
      expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(FURIGANA_WORD_MIN_PX);
    }
    for (const word of [...WORDS, ...EXTREME_WORDS]) {
      const sizes = fits.map((fit) => wordSizePx(word, fit));
      expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
    }
    expect(wordSizePx("風", "tight")).toBeLessThan(wordSizePx("風", "roomy"));
  });
});
