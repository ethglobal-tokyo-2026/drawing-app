import { describe, expect, it } from "vitest";
import { outline, type Shape } from "../sticker-board/tray/sheetPacking";
import { seededRandom } from "../ui/seededRandom";
import {
  PILE_WIDTH,
  pileStickers,
  tagGroup,
  tagLines,
  TAG_H,
  TAG_LINE,
  TAG_LINE_MAX,
  TAG_MAX_W,
  textWidth,
  type Box,
  type PileItem,
  type PiledSticker,
} from "./pileLayout";

type Point = [number, number];

/** A lumpy cut line of `points` corners inside a padded image, as the seal makes them. */
function blob(rnd: () => number, points = 28): Shape {
  const w = 420 + Math.round(rnd() * 300);
  const h = 380 + Math.round(rnd() * 320);
  const squash = 0.6 + rnd() * 0.4;
  const poly: Point[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 0.3 + rnd() * 0.12;
    poly.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r * squash]);
  }
  return { w, h, poly };
}

/** Handles from two letters to the longest a handle can be, 32, and in Japanese. */
const HANDLES = [
  "mika",
  "ken",
  "sakura_mochi_doodles",
  "riku",
  "Crit-tap-700-90",
  "aoi",
  "Wm".repeat(16),
  "kaito",
  "さくらもちのおえかきちょうとまいにちのらくがき",
  "yuzuriha_long",
];

/** "to @x" in English, and "@xさんへ" in Japanese, as the aqua tag reads. */
const toLabel = (i: number, handle: string) => (i % 2 ? `to @${handle}` : `@${handle}さんへ`);

function itemsOf(count: number, seed = 1, givenEvery = 5): PileItem[] {
  const rnd = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `sticker-${seed}-${i}`,
    shape: blob(rnd),
    tag: tagGroup(
      `@${HANDLES[i % HANDLES.length]}`,
      i % givenEvery === 3 ? toLabel(i, HANDLES[(i * 7) % HANDLES.length]) : null,
    ),
  }));
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Whether `p` lies inside the polygon. */
function inside([x, y]: Point, poly: Point[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

/** Whether a placed cut line covers any of a box: exact, from the polygon itself. */
function cutCovers(poly: Point[], box: Box) {
  const corners: Point[] = [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x1, box.y1],
    [box.x0, box.y1],
  ];
  if (poly.some(([x, y]) => x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1)) return true;
  if (corners.some((corner) => inside(corner, poly))) return true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    for (let k = 0; k < 4; k++)
      if (segmentsCross(a, b, corners[k], corners[(k + 1) % 4])) return true;
  }
  return false;
}

const placedCut = (item: PileItem, spot: PiledSticker) => outline(item.shape, spot);

describe("pileStickers", () => {
  it("lays out the same day the same way every time", () => {
    const items = itemsOf(30);
    expect(pileStickers(items, { seed: "2026-09-26" })).toEqual(
      pileStickers(items, { seed: "2026-09-26" }),
    );
  });

  it("heaps another day differently", () => {
    const items = itemsOf(12);
    const a = pileStickers(items, { seed: "2026-09-26" }).items.map(({ x, r }) => [x, r]);
    const b = pileStickers(items, { seed: "2026-09-25" }).items.map(({ x, r }) => [x, r]);
    expect(a).not.toEqual(b);
  });

  it("moves nothing already there when a sticker lands on top", () => {
    const items = itemsOf(40);
    const all = pileStickers(items, { seed: "d" }).items;
    for (const count of [1, 7, 23, 39]) {
      expect(pileStickers(items.slice(0, count), { seed: "d" }).items).toEqual(all.slice(0, count));
    }
  });

  it("never covers an earlier name tag, with a later sticker or its tag", () => {
    for (const seed of [1, 2, 3]) {
      const items = itemsOf(60, seed, 4);
      const { items: pile } = pileStickers(items, { seed: `day-${seed}` });
      for (let later = 1; later < pile.length; later++) {
        const cut = placedCut(items[later], pile[later]);
        for (let earlier = 0; earlier < later; earlier++) {
          const tag = pile[earlier].tagClear;
          expect(cutCovers(cut, tag), `No.${later}'s cut over No.${earlier}'s tag`).toBe(false);
          expect(
            overlaps(pile[later].tagClear, tag),
            `No.${later}'s tag over No.${earlier}'s tag`,
          ).toBe(false);
        }
      }
    }
  });

  it("keeps every cut line and tag on the floor and inside the sides", () => {
    const items = itemsOf(50);
    const { items: pile, top } = pileStickers(items, { seed: "d" });
    pile.forEach((spot, i) => {
      for (const [x, y] of placedCut(items[i], spot)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(PILE_WIDTH);
        expect(y).toBeLessThanOrEqual(1e-6);
        expect(y).toBeGreaterThanOrEqual(top - 1e-6);
      }
      expect(spot.tagClear.x0).toBeGreaterThanOrEqual(0);
      expect(spot.tagClear.x1).toBeLessThanOrEqual(PILE_WIDTH);
      expect(spot.tagClear.y1).toBeLessThanOrEqual(1e-6);
      expect(spot.tagClear.y0).toBeGreaterThanOrEqual(top - 1e-6);
    });
  });

  it("overlaps stickers into a heap, turned up to 17° either way", () => {
    const items = itemsOf(30);
    const { items: pile, top } = pileStickers(items, { seed: "d" });
    const turns = pile.map((spot) => spot.r);
    expect(Math.max(...turns.map(Math.abs))).toBeLessThanOrEqual(17);
    expect(turns.some((r) => r > 8) && turns.some((r) => r < -8)).toBe(true);
    // Laid side by side without touching, 30 stickers of about 92 units would stand far taller.
    const area = pile.reduce((sum, spot) => sum + spot.w * spot.h * 0.5, 0);
    expect(-top).toBeLessThan((area / PILE_WIDTH) * 1.6);
  });

  it("keeps a sticker its size however many share its day", () => {
    const items = itemsOf(30);
    const few = pileStickers(items.slice(0, 3), { seed: "d" }).items;
    const many = pileStickers(items, { seed: "d" }).items;
    expect(many.slice(0, 3).map((spot) => spot.s)).toEqual(few.map((spot) => spot.s));
  });

  it("lays out 300 stickers quickly", () => {
    const items = itemsOf(300);
    const started = performance.now();
    const { items: pile } = pileStickers(items, { seed: "d" });
    expect(pile).toHaveLength(300);
    expect(performance.now() - started).toBeLessThan(1500);
  });

  it("lays out a sticker whose cut line can't be read as its whole image", () => {
    const { items: pile } = pileStickers(
      [{ id: "a", shape: { w: 300, h: 300, poly: [] }, tag: tagGroup("@a", null) }],
      { seed: "d" },
    );
    expect(pile[0].w).toBeGreaterThan(0);
  });
});

describe("tagGroup", () => {
  it("fits a longer name in a wider tag, up to its widest", () => {
    expect(tagGroup("@mika", null).w).toBeLessThan(tagGroup("@mikamikamika", null).w);
    expect(tagGroup(`@${"m".repeat(32)}`, null).w).toBeLessThanOrEqual(TAG_MAX_W);
  });

  it("measures the aqua tag round its whole label, not just the handle", () => {
    const to = (label: string) => tagGroup("@Crit-rich", label).to?.w ?? 0;
    expect(to("to @Kenji")).toBeGreaterThan(to("@Kenji"));
    expect(to("@Kenjiさんへ")).toBeGreaterThan(to("to @Kenji"));
    expect(tagGroup("@Crit-rich", "to @Kenji").to?.lines).toEqual(["to @Kenji"]);
  });

  it("gives Japanese names the room of full-width letters", () => {
    expect(tagGroup("@さくら", null).w).toBeGreaterThan(tagGroup("@abc", null).w);
  });

  it("stacks the tag of a given sticker under its name tag", () => {
    const group = tagGroup("@mika", "to @ken");
    expect(group.h).toBeGreaterThan(tagGroup("@mika", null).h);
    expect(group.to?.y).toBeGreaterThanOrEqual(group.name.h);
  });

  it("runs a long handle onto more lines, taller, rather than cutting it short", () => {
    const one = tagGroup("@mika", null).name;
    const two = tagGroup("@sakura_mochi_doodles", null).name;
    expect(one.h).toBe(TAG_H);
    expect(two.lines).toEqual(["@sakura_mochi_", "doodles"]);
    expect(two.h).toBe(TAG_H + TAG_LINE);
  });
});

describe("tagLines", () => {
  it.each([
    "@sakura_mochi_doodles",
    `@${"a".repeat(32)}`,
    `@${"Wm".repeat(16)}`,
    "@さくらもちのおえかきちょうとまいにちのらくがき",
    "to @sakura_mochi_doodles",
    "@sakura_mochi_doodlesさんへ",
    "@🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸",
  ])("shows %s whole, no line wider than a tag's", (text) => {
    const lines = tagLines(text);
    // Only a space a line breaks at goes.
    const letters = (s: string) => s.replaceAll(" ", "");
    expect(letters(lines.join(""))).toBe(letters(text));
    for (const line of lines) expect(textWidth(line)).toBeLessThanOrEqual(TAG_LINE_MAX);
  });

  it("breaks after an underscore, a dot or a hyphen when that fills the line well", () => {
    expect(tagLines("@mika.draws.every.single.day")).toEqual(["@mika.draws.", "every.single.day"]);
    expect(tagLines("to @sakura_mochi_doodles")).toEqual(["to @sakura_", "mochi_doodles"]);
    expect(tagLines("@Crit-tap-700-90")).toEqual(["@Crit-tap-700-90"]);
    // Without a break that fills the line well, it breaks between letters instead.
    expect(tagLines("@ab_cdefghijklmnopqrstuvwxyz")).toEqual(["@ab_cdefghijklmn", "opqrstuvwxyz"]);
  });
});
