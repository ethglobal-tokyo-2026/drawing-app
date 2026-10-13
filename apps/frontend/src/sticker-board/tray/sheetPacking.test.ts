import { describe, expect, it } from "vitest";
import { PACK_MARGIN, SHEET } from "./trayModel";
import {
  outline,
  outlineShape,
  packSheets,
  type PackItem,
  type PackOptions,
  type Shape,
} from "./sheetPacking";

type Point = [number, number];

const square: Shape = {
  w: 100,
  h: 100,
  poly: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
};
/** A cut that doesn't fill its image, as a real sticker's doesn't: the cut is what's kept clear. */
const diamond: Shape = {
  w: 80,
  h: 120,
  poly: [
    [0.5, 0],
    [1, 0.5],
    [0.5, 1],
    [0, 0.5],
  ],
};
const items = (n: number): PackItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, shape: square }));
const mixed = (n: number): PackItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `m${i}`, shape: i % 3 === 1 ? diamond : square }));
const opts = { sheet: SHEET, margin: PACK_MARGIN, clearance: 6 };
const tall = { ...opts, sheet: { ...SHEET, h: 700 } };
const large = { ...tall, stickerScale: 1.25 };

/** Each sheet's cut lines as placed, in sheet pixels. */
function placedCuts(list: PackItem[], options: PackOptions = opts) {
  const shapes = new Map(list.map((it) => [it.id, it.shape]));
  return packSheets(list, options).sheets.map((sheet) =>
    sheet.items.flatMap((it) => {
      const shape = shapes.get(it.id);
      return shape ? [outline(shape, it)] : [];
    }),
  );
}

const crosses = (a: Point, b: Point, c: Point, d: Point) => {
  const side = (p: Point, q: Point, r: Point) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
};
const toSegment = (p: Point, a: Point, b: Point) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
/** The least distance between two closed cut lines; 0 where they cross. */
function gap(a: Point[], b: Point[]) {
  const inside = (p: Point, poly: Point[]) =>
    poly.reduce((hit, q, i) => {
      const next = poly[(i + 1) % poly.length];
      return q[1] > p[1] !== next[1] > p[1] &&
        p[0] < q[0] + ((p[1] - q[1]) * (next[0] - q[0])) / (next[1] - q[1])
        ? !hit
        : hit;
    }, false);
  if (inside(a[0], b) || inside(b[0], a)) return 0;
  let least = Infinity;
  a.forEach((a1, i) => {
    const a2 = a[(i + 1) % a.length];
    b.forEach((b1, j) => {
      const b2 = b[(j + 1) % b.length];
      least = crosses(a1, a2, b1, b2)
        ? 0
        : Math.min(least, toSegment(a1, b1, b2), toSegment(b1, a1, a2));
    });
  });
  return least;
}

describe("packSheets", () => {
  it("never moves an earlier sticker when a later one arrives", () => {
    const before = packSheets(items(7), opts);
    const after = packSheets(items(8), opts);
    for (const [id, it] of before.byId) expect(after.byId.get(id)).toEqual(it);
  });

  it("never puts a later sticker on an earlier sheet", () => {
    const { byId } = packSheets(items(20), opts);
    const sheets = [...byId.values()].sort((a, b) => a.n - b.n).map((it) => it.f);
    expect(new Set(sheets).size).toBeGreaterThan(1);
    expect(sheets).toEqual([...sheets].sort((a, b) => a - b));
  });

  it.each([
    { stickerScale: 1, w: 50.666666666666664, h: 76 },
    { stickerScale: 1.25, w: 63.33333333333333, h: 95 },
  ])(
    "keeps outgoing labels clear without enlarging sticker images at scale $stickerScale",
    ({ stickerScale, w, h }) => {
      const thin: Shape = {
        w: 80,
        h: 120,
        poly: [
          [0.46, 0],
          [0.54, 0],
          [0.54, 1],
          [0.46, 1],
        ],
      };
      const list = Array.from({ length: 8 }, (_, i) => ({
        id: `thin-${i}`,
        shape: thin,
        ...(i % 2 === 0 ? { label: { w: 100, h: 100 } } : {}),
      }));
      const packed = packSheets(list, { ...tall, stickerScale, vary: 0 });
      const byId = new Map(list.map((it) => [it.id, it]));
      for (const sheet of packed.sheets) {
        const cuts = sheet.items.map((it) => {
          expect(it.w).toBeCloseTo(w);
          expect(it.h).toBe(h);
          const cut = outline(thin, it);
          const label = byId.get(it.id)?.label;
          return label ? [cut, outline(square, { ...it, ...label })] : [cut];
        });
        for (const [x, y] of cuts.flat(2)) {
          expect(x).toBeGreaterThanOrEqual(PACK_MARGIN.left);
          expect(x).toBeLessThanOrEqual(SHEET.w - PACK_MARGIN.right);
          expect(y).toBeGreaterThanOrEqual(PACK_MARGIN.top);
          expect(y).toBeLessThanOrEqual(700 - PACK_MARGIN.bottom);
        }
        cuts.forEach((a, i) =>
          cuts
            .slice(i + 1)
            .forEach((b) =>
              a.forEach((aCut) =>
                b.forEach((bCut) => expect(gap(aCut, bCut)).toBeGreaterThanOrEqual(6)),
              ),
            ),
        );
      }
    },
  );

  it.each([
    ["short page", opts],
    ["tall page", tall],
    ["large", large],
  ])("keeps every cut line inside its sheet's margins, %s", (_, options) => {
    const { sheet, margin } = options;
    for (const cuts of placedCuts(mixed(28), options))
      for (const [x, y] of cuts.flat()) {
        expect(x).toBeGreaterThanOrEqual(margin.left);
        expect(x).toBeLessThanOrEqual(sheet.w - margin.right);
        expect(y).toBeGreaterThanOrEqual(margin.top);
        expect(y).toBeLessThanOrEqual(sheet.h - margin.bottom);
      }
  });

  it.each([
    ["short page", opts],
    ["tall page", tall],
    ["large", large],
  ])("keeps cut lines at least the clearance apart, %s", (_, options) => {
    for (const cuts of placedCuts(mixed(28), options))
      cuts.forEach((a, i) =>
        cuts.slice(i + 1).forEach((b) => expect(gap(a, b)).toBeGreaterThanOrEqual(opts.clearance)),
      );
  });
});

describe("outlineShape", () => {
  it("reads a stored outline as the same shape, in 0-1 units", () => {
    // As a sealed sticker stores it: points joined by "L", closed by "Z".
    const shape = outlineShape("M10.0 0.0L20.0 0.0L20.0 40.0L10.0 40.0Z", 20, 40);
    expect(shape.poly).toEqual([
      [0.5, 0],
      [1, 0],
      [1, 1],
      [0.5, 1],
    ]);
  });
});
