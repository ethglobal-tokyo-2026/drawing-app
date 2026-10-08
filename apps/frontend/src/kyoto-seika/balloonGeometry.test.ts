import { describe, expect, it } from "vitest";
import {
  balloonShapes,
  BALLOONS,
  FURIGANA_WORD_MIN_PX,
  pairHeight,
  pairLayout,
  shapesBox,
  TIGHT_WORD_PX,
  wordSizePx,
} from "./balloonGeometry";

describe("a thought balloon", () => {
  it("trails its three beads toward the thinker, each farther than the last", () => {
    const { beads, rx } = balloonShapes(BALLOONS[0], [-150, 200]);
    const dist = beads.map((b) => Math.hypot(b.x, b.y));
    expect(dist).toEqual(dist.toSorted((a, b) => a - b));
    expect(dist[0]).toBeGreaterThan(rx);
    expect(beads.every((b) => b.x < 0 && b.y > 0)).toBe(true);
  });

  it("draws the same bumps for the same balloon", () => {
    expect(balloonShapes(BALLOONS[1], [-1, 1])).toEqual(balloonShapes(BALLOONS[1], [-1, 1]));
  });
});

describe("the pair's layout", () => {
  const natural = pairHeight(false);

  it("tightens rather than scaling when the space between the label and Begin is shorter than the pair", () => {
    expect(pairLayout({ width: 390, top: 0, bottom: natural }).tight).toBe(false);
    expect(pairLayout({ width: 390, top: 0, bottom: natural - 1 }).tight).toBe(true);
    expect(pairHeight(true)).toBeLessThan(natural);
  });

  it("draws the balloons closer where even the tightened pair doesn't fit, never so close their words meet", () => {
    const space = { width: 375, top: 100, bottom: 100 + pairHeight(true) - 40 };
    const { centers, specs, towards } = pairLayout(space);
    const [upper, lower] = ([0, 1] as const).map((balloon) =>
      shapesBox(balloonShapes(specs[balloon], towards[balloon]).body),
    );
    expect(centers[0][1] + upper.minY).toBeGreaterThanOrEqual(space.top - 0.5);
    expect(centers[1][1] + lower.minY + lower.height).toBeLessThanOrEqual(space.bottom + 0.5);
    expect(centers[1][1] - centers[0][1]).toBeGreaterThanOrEqual((specs[0].h + specs[1].h) / 2);
  });

  it("centers the pair in the space, the upper left of the lower", () => {
    const {
      centers: [u, l],
    } = pairLayout({ width: 390, top: 100, bottom: 700 });
    expect((u[1] + l[1]) / 2).toBeCloseTo(400, -1);
    expect(u[0]).toBeLessThan(l[0]);
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
