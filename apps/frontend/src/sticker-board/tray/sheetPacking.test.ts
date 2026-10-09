import { describe, expect, it } from "vitest";
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
const opts = {
  sheet: { w: 156, h: 364 },
  margin: { top: 30, right: 10, bottom: 24, left: 10 },
  clearance: 6,
};
/** As the sticker tray packs: a sheet with room to spare spreads its stickers over its page. */
const spread = { ...opts, spread: true };

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
    ["packed", opts],
    ["spread", spread],
  ])("keeps every cut line inside its sheet's margins, %s", (_, options) => {
    const { sheet, margin } = opts;
    for (const cuts of placedCuts(mixed(28), options))
      for (const [x, y] of cuts.flat()) {
        expect(x).toBeGreaterThanOrEqual(margin.left);
        expect(x).toBeLessThanOrEqual(sheet.w - margin.right);
        expect(y).toBeGreaterThanOrEqual(margin.top);
        expect(y).toBeLessThanOrEqual(sheet.h - margin.bottom);
      }
  });

  it.each([
    ["packed", opts],
    ["spread", spread],
  ])("keeps cut lines at least the clearance apart, %s", (_, options) => {
    for (const cuts of placedCuts(mixed(28), options))
      cuts.forEach((a, i) =>
        cuts.slice(i + 1).forEach((b) => expect(gap(a, b)).toBeGreaterThanOrEqual(opts.clearance)),
      );
  });
});

describe("packSheets, spread", () => {
  it("spreads a page's few stickers over its height, not only its lower part", () => {
    const tall = { ...spread, sheet: { ...opts.sheet, h: 600 } };
    const ys = (placedCuts(mixed(3), tall)[0] ?? []).flat().map(([, y]) => y);
    expect(Math.min(...ys)).toBeLessThan(tall.sheet.h / 2);
    expect(Math.max(...ys)).toBeGreaterThan(tall.sheet.h / 2);
  });

  it("leaves a full page as packed", () => {
    const list = mixed(12);
    const packed = packSheets(list, spread);
    expect(packed.sheets.length).toBeGreaterThan(1);
    expect(packed.sheets[0]).toEqual(packSheets(list, opts).sheets[0]);
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
