import { describe, expect, it } from "vitest";
import { seededRandom } from "../ui/seededRandom";
import {
  cloudShape,
  DEAL_AT,
  DIE_CLEAR_PX,
  dealLayout,
  FURIGANA_WORD_MIN_PX,
  PEN,
  TIGHT_TYPE,
  toScreen,
  TYPE,
  WIDE_DEAL_PX,
  widestWordArea,
  wordSizePx,
  type Box,
  type DealLayout,
  type PlacedBalloon,
  type Pt,
} from "./balloonGeometry";
import { dealKinds, firstDeal, rollDie, togglePick, type Deal } from "./deal";
import { charCount, hasKanji, KINDS } from "./subjectList";
import { SUBJECTS } from "./subjects/subjectsModule";

/**
 * The space between the timer's label and the task line on a 390 × 844 phone, and on a 375-wide one
 * `height` tall: Begin keeps to the foot, so the space loses what the phone does. 560 is an iPhone SE
 * inside LINE.
 */
const TALL = { width: 390, top: 142, bottom: 641 };
const phone = (height: number) => ({ width: 375, top: 142, bottom: 357 - (560 - height) });
/** LINE's iPad sheet, and the pair area a large screen lays the deal out in. */
const IPAD_SHEET = { width: 540, top: 142, bottom: 497 };
const LARGE = { width: 500, top: 120, bottom: 760 };
type Space = typeof TALL;

/** A fresh deal from the list, by `seed`. */
const dealOf = (seed: number) => firstDeal(SUBJECTS, { recent: [], random: seededRandom(seed) });
const lay = (space: Space, deal: Deal, seed: number) =>
  dealLayout({ ...space, kinds: dealKinds(SUBJECTS, deal), list: SUBJECTS, seed });
/** A few seeded deals per space, each dealt and seated differently, laid out once for every test. */
const SEEDS = [3, 11, 29, 47, 83, 131];
const SWEPT = [TALL, phone(667), IPAD_SHEET, LARGE].flatMap((space) =>
  SEEDS.map((seed) => ({ space, deal: dealOf(seed), layout: lay(space, dealOf(seed), seed) })),
);
const tall = SWEPT[0].layout;

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
const near = (p: Pt, box: Box, by: number) =>
  p.x >= box.minX - by && p.x <= box.maxX + by && p.y >= box.minY - by && p.y <= box.maxY + by;
const onScreen = (b: PlacedBalloon) => b.white.map((p) => toScreen(b, p));
/** `p` in `placed`'s own frame. */
function local(placed: PlacedBalloon, p: Pt): Pt {
  const r = (-placed.spec.tilt * Math.PI) / 180;
  const x = p.x - placed.center.x;
  const y = p.y - placed.center.y;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

/** No cloud's outline reaches into another's word area, and the die and the trail keep clear of all. */
function expectClear(layout: DealLayout, space: Space) {
  const outlines = layout.balloons.map(onScreen);
  layout.balloons.forEach((placed, i) =>
    outlines.forEach((outline, j) => {
      if (i === j) return;
      const intruding = outline
        .map((p) => local(placed, p))
        .some((q) => Math.abs(q.x) < placed.spec.w / 2 && Math.abs(q.y) < placed.spec.h / 2);
      expect(intruding, `${j}'s outline in ${i}'s word area`).toBe(false);
    }),
  );
  const points = outlines.flat();
  expect(points.some((p) => near(p, layout.reroll, DIE_CLEAR_PX))).toBe(false);
  expect(layout.trail).toHaveLength(3);
  for (const bead of layout.trail) {
    const box = {
      minX: bead.x - bead.r,
      minY: bead.y - bead.r,
      maxX: bead.x + bead.r,
      maxY: bead.y + bead.r,
    };
    expect(points.some((p) => near(p, box, 0))).toBe(false);
    expect(outlines.some((o) => inside(bead, o))).toBe(false);
    expect(near(bead, layout.reroll, DIE_CLEAR_PX)).toBe(false);
  }
  for (const box of [...layout.balloons.map((b) => b.reach), layout.reroll]) {
    expect(box.minX).toBeGreaterThanOrEqual(0);
    expect(box.maxX).toBeLessThanOrEqual(space.width);
    expect(box.maxY).toBeLessThanOrEqual(space.bottom);
  }
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
    corners.every((c) => inside(c, placed.white)),
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
    const { spec, white } = tall.balloons[0];
    const cloud = cloudShape(spec);
    expect(cloud).toEqual(cloudShape(spec));
    expect(cloud.white).toEqual(white);
    expect(cloud.inks.length).toBeGreaterThan(1);
    expect(new Set(cloud.inks).size).toBe(cloud.inks.length);
  });

  it("runs each lobe's line a little past its cusps into the white, no further than the pen's run-on", () => {
    const reach = Math.max(PEN.before, PEN.after) + PEN.runOnJitter / 2 + PEN.wobble;
    for (const { spec } of tall.balloons) {
      const cloud = cloudShape(spec);
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

describe("the deal's thought cluster", () => {
  it("seats one cloud per place, no outline in another's words, the die and the trail clear", () => {
    for (const { space, layout } of SWEPT) {
      expect(layout.balloons).toHaveLength(KINDS.length);
      expect(layout.fit).toBe("roomy");
      expectClear(layout, space);
    }
  });

  it("stands two, one and two under WIDE_DEAL_PX, and three over two from it", () => {
    const deal = dealOf(5);
    const plan = (width: number) => lay({ ...TALL, width }, deal, 5).plan;
    expect(plan(390)).toBe("2-1-2");
    expect(plan(WIDE_DEAL_PX - 1)).toBe("2-1-2");
    expect(plan(WIDE_DEAL_PX)).toBe("3-over-2");
    expect(plan(540)).toBe("3-over-2");
  });

  it("lays a seed out the same every time, and another seed otherwise", () => {
    const deal = dealOf(9);
    expect(lay(TALL, deal, 9)).toEqual(lay(TALL, deal, 9));
    const centers = (seed: number) => lay(TALL, deal, seed).balloons.map((b) => b.center);
    expect(centers(9)).not.toEqual(centers(10));
  });

  it("keeps every cloud where it sat through a roll, picked ones included", () => {
    const fresh = dealOf(13);
    const deal = togglePick(togglePick(fresh, 1) ?? fresh, 3) ?? fresh;
    const rolled = rollDie(SUBJECTS, deal, { recent: [], random: seededRandom(14) });
    expect(rolled?.subjects).not.toEqual(deal.subjects);
    const centers = (d: Deal) => lay(TALL, d, 13).balloons.map((b) => b.center);
    expect(rolled && centers(rolled)).toEqual(centers(deal));
  });

  it("sets every word as large as the widest word area does, each seat holding its kind's words", () => {
    for (const { deal, layout } of SWEPT.filter((s) => s.space === TALL).slice(0, 2)) {
      const area = widestWordArea(TALL.width, layout.fit);
      const kinds = dealKinds(SUBJECTS, deal);
      layout.balloons.forEach((placed, place) => {
        expect(placed.spec.w).toBeLessThanOrEqual(area);
        for (const { ja, reading } of SUBJECTS.filter((s) => s.kind === kinds[place])) {
          expect(wordSizePx(ja, layout.fit, placed.spec.w), ja).toBe(
            wordSizePx(ja, layout.fit, area),
          );
          expectHolds(placed, layout, ja, reading);
        }
      });
    }
  });

  it("keeps clear of the timer's label where a phone has the room, about DEAL_AT of the way down", () => {
    for (const { space, layout } of SWEPT) {
      const top = Math.min(...layout.balloons.map((b) => b.reach.minY));
      expect(top).toBeGreaterThanOrEqual(space.top);
    }
    const reaches = [...tall.balloons.map((b) => b.reach), tall.reroll];
    const top = Math.min(...reaches.map((b) => b.minY));
    const bottom = Math.max(...reaches.map((b) => b.maxY), ...tall.trail.map((b) => b.y + b.r));
    const at = ((top + bottom) / 2 - TALL.top) / (TALL.bottom - TALL.top);
    expect(at).toBeCloseTo(DEAL_AT, 2);
  });

  it("tightens rather than scaling when the space is shorter than the deal", () => {
    const deal = dealOf(17);
    expect(lay(phone(560), deal, 17).fit).not.toBe("roomy");
    for (let height = 667; height >= 520; height -= 21) {
      const space = phone(height);
      expectClear(lay(space, deal, 17), space);
    }
  });
});

describe("a subject's word", () => {
  it("sets a longer word no bigger, and a word with kanji never under FURIGANA_WORD_MIN_PX", () => {
    const w = Math.max(...tall.balloons.map((b) => b.spec.w));
    const sizes = ["風", "地図", "小学生", "鬼ごっこ", "宇宙飛行士", "アーティスト"].map((word) =>
      wordSizePx(word, tall.fit, w),
    );
    expect(sizes).toEqual(sizes.toSorted((a, b) => b - a));
    for (const { ja } of SUBJECTS.filter((s) => hasKanji(s.ja)))
      expect(wordSizePx(ja, tall.fit, w), ja).toBeGreaterThanOrEqual(FURIGANA_WORD_MIN_PX);
  });
});
