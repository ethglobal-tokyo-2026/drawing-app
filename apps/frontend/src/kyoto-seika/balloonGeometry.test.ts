import { describe, expect, it } from "vitest";
import {
  cloudShape,
  DEAL_AT,
  dealLayout,
  FURIGANA_WORD_MIN_PX,
  PEN,
  TIGHT_TYPE,
  toScreen,
  TYPE,
  wordSizePx,
  type Box,
  type DealLayout,
  type PlacedBalloon,
  type Pt,
} from "./balloonGeometry";
import { charCount, hasKanji, KINDS } from "./subjectList";
import { SUBJECTS } from "./subjects/subjectsModule";

/**
 * The space between the timer's label and the task line on a 390 × 844 phone, and on a 375-wide one
 * `height` tall: Begin keeps to the foot, so the space loses what the phone does. 560 is an iPhone SE
 * inside LINE.
 */
const TALL = { width: 390, top: 142, bottom: 641 };
const phone = (height: number) => ({ width: 375, top: 142, bottom: 357 - (560 - height) });
/** The pair area a large screen lays the deal out in: a phone's width, drawn larger. */
const LARGE = { width: 420, top: 120, bottom: 760 };
const SPACES = { "390 × 844": TALL, "375 × 667": phone(667), "375 × 560": phone(560), LARGE };

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

/** No two clouds meet, and none touches the reroll. */
function expectKeptApart(layout: DealLayout) {
  const outlines = layout.balloons.map(onScreen);
  outlines.forEach((outline, i) => {
    expect(outline.some((p) => inBox(p, layout.reroll))).toBe(false);
    outlines.forEach((other, j) => {
      if (i !== j)
        expect(
          outline.some((p) => inside(p, other)),
          `${i} in ${j}`,
        ).toBe(false);
    });
  });
}

/** `word` at its size, under its reading, sits inside `placed`'s lobes. */
function expectHolds(placed: PlacedBalloon, layout: DealLayout, word: string, reading: string) {
  const size = wordSizePx(word, layout.fit, placed.spec.w);
  const { readingPx } = layout.fit === "roomy" ? TYPE : TIGHT_TYPE;
  const wide = Math.max(charCount(word) * size * 1.02, charCount(reading) * readingPx);
  const half = { x: wide / 2, y: (readingPx + 4 + size * 1.05) / 2 };
  const corners = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => ({ x: sx * half.x, y: sy * half.y })),
  );
  expect(
    corners.every((c) => inside(c, placed.cloud.white)),
    `${word} at ${size}px`,
  ).toBe(true);
}

/** Each pen stroke's two ends in ink path data: the middles of its round ends' arcs. */
const strokeEnds = (ink: string): Pt[] =>
  [...ink.matchAll(/(-?[\d.]+) (-?[\d.]+)A[\d.]+ [\d.]+ 0 0 [01] (-?[\d.]+) (-?[\d.]+)/g)].map(
    ([, x0, y0, x1, y1]) => ({ x: (+x0 + +x1) / 2, y: (+y0 + +y1) / 2 }),
  );

/** The white's cusps: the corners where its outline turns in, between two lobes. */
function cusps(white: readonly Pt[]): Pt[] {
  const next = (i: number) => white[(i + 1) % white.length];
  const area = white.reduce((s, p, i) => s + p.x * next(i).y - next(i).x * p.y, 0);
  return white.filter((p, i) => {
    const [a, c] = [white[(i + white.length - 1) % white.length], next(i)];
    const turn = (p.x - a.x) * (c.y - p.y) - (p.y - a.y) * (c.x - p.x);
    return Math.sign(turn) === -Math.sign(area);
  });
}

describe("a G-pen cloud", () => {
  it("is drawn the same every time, and boils: each frame redraws the line round the same white", () => {
    const { spec } = dealLayout(TALL).balloons[0];
    expect(cloudShape(spec)).toEqual(cloudShape(spec));
    const { inks } = cloudShape(spec);
    expect(inks.length).toBeGreaterThan(1);
    expect(new Set(inks).size).toBe(inks.length);
  });

  it("runs each lobe's line a little past its cusps into the white, no further than the pen's run-on", () => {
    const reach = Math.max(PEN.before, PEN.after) + PEN.runOnJitter / 2 + PEN.wobble;
    for (const { cloud } of dealLayout(TALL).balloons) {
      const corners = cusps(cloud.white);
      for (const ink of cloud.inks) {
        const ends = strokeEnds(ink);
        expect(ends).toHaveLength(2 * corners.length);
        for (const end of ends) {
          expect(inside(end, cloud.white)).toBe(true);
          const nearest = Math.min(...corners.map((c) => Math.hypot(c.x - end.x, c.y - end.y)));
          expect(nearest).toBeLessThanOrEqual(reach);
        }
      }
    }
  });
});

describe("the deal's five clouds", () => {
  for (const [name, space] of Object.entries(SPACES))
    it(`lays out one cloud per kind, apart, holding every word in the list, on ${name}`, () => {
      const layout = dealLayout(space);
      expect(layout.balloons).toHaveLength(KINDS.length);
      expectKeptApart(layout);
      for (const placed of layout.balloons) {
        expect(placed.reach.minX).toBeGreaterThanOrEqual(0);
        expect(placed.reach.maxX).toBeLessThanOrEqual(space.width);
        expect(placed.reach.maxY).toBeLessThanOrEqual(space.bottom);
      }
      expect(layout.reroll.maxX).toBeLessThanOrEqual(space.width);
      expect(layout.reroll.maxY).toBeLessThanOrEqual(space.bottom);
      expect(inBox(layout.die, layout.reroll)).toBe(true);
      for (const { ja, reading } of SUBJECTS) expectHolds(layout.balloons[0], layout, ja, reading);
    });

  it("keeps clear of the timer's label wherever a phone has the room", () => {
    for (const space of [TALL, phone(667), LARGE]) {
      const layout = dealLayout(space);
      const top = Math.min(...layout.balloons.map((b) => b.reach.minY));
      expect(top).toBeGreaterThanOrEqual(space.top);
    }
  });

  it("stands about DEAL_AT of the way down the space when there's room", () => {
    const layout = dealLayout(TALL);
    const top = Math.min(...layout.balloons.map((b) => b.reach.minY));
    const bottom = Math.max(...layout.balloons.map((b) => b.reach.maxY), layout.reroll.maxY);
    const at = ((top + bottom) / 2 - TALL.top) / (TALL.bottom - TALL.top);
    expect(at).toBeCloseTo(DEAL_AT, 2);
  });

  it("tightens rather than scaling when the space is shorter than the deal", () => {
    expect(dealLayout(TALL).fit).toBe("roomy");
    expect(dealLayout(phone(560)).fit).not.toBe("roomy");
    // Every fit's band, sampled: each layout's apart-check is a polygon test over every cloud's outline.
    for (let height = 667; height >= 520; height -= 21) expectKeptApart(dealLayout(phone(height)));
  });
});

describe("a subject's word", () => {
  it("sets a longer word no bigger, and a word with kanji never under FURIGANA_WORD_MIN_PX", () => {
    for (const space of Object.values(SPACES)) {
      const layout = dealLayout(space);
      const w = layout.balloons[0].spec.w;
      const sizes = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "アーティスト"].map((word) =>
        wordSizePx(word, layout.fit, w),
      );
      expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
      for (const { ja } of SUBJECTS.filter((s) => hasKanji(s.ja)))
        expect(wordSizePx(ja, layout.fit, w), ja).toBeGreaterThanOrEqual(FURIGANA_WORD_MIN_PX);
    }
  });
});
