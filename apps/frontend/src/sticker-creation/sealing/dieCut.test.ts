import { describe, expect, it } from "vitest";
import { dieCut, type DieCut } from "./dieCut";
import type { Pixels } from "./pixels";

type Shape = (x: number, y: number) => boolean;

/** A transparent sheet with opaque ink wherever `inked` says. */
function sheet(width: number, height: number, inked: Shape, alpha = 255): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (inked(x, y)) data.set([28, 24, 36, alpha], (y * width + x) * 4);
  return { data, width, height };
}

const disk =
  (cx: number, cy: number, r: number): Shape =>
  (x, y) =>
    (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const rect =
  (x0: number, y0: number, x1: number, y1: number): Shape =>
  (x, y) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;
const union =
  (...shapes: Shape[]): Shape =>
  (x, y) =>
    shapes.some((s) => s(x, y));

function cutOf(ink: Pixels): DieCut {
  const cut = dieCut(ink);
  if (!cut) throw new Error("expected a cut");
  return cut;
}

/** The grid cell an ink pixel lands in. */
const cell = (cut: DieCut, x: number, y: number) =>
  (Math.floor(y * cut.scale) + cut.pad) * cut.width + Math.floor(x * cut.scale) + cut.pad;

/** Every inked pixel of the sheet. */
function* inkPixels({ data, width, height }: Pixels) {
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 0) yield [x, y] as const;
}

/** Whether every inked pixel sits inside the cut, inside its smoothed edge too. */
function holdsAllInk(cut: DieCut, ink: Pixels) {
  for (const [x, y] of inkPixels(ink)) {
    const i = cell(cut, x, y);
    if (!cut.mask[i] || cut.soft[i] < 0.5) return false;
  }
  return true;
}

describe("dieCut", () => {
  it("finds nothing to cut on a blank sheet, or one with only ink too faint to show", () => {
    expect(dieCut(sheet(80, 60, () => false))).toBeNull();
    expect(dieCut(sheet(80, 60, disk(40, 30, 10), 12))).toBeNull();
  });

  it("cuts the same shape wherever the ink sits on the sheet", () => {
    const shape = (dx: number, dy: number) =>
      union(disk(70 + dx, 60 + dy, 18), rect(60 + dx, 70 + dy, 130 + dx, 84 + dy));
    const a = cutOf(sheet(240, 200, shape(0, 0)));
    const b = cutOf(sheet(240, 200, shape(17, 23)));
    for (let y = 0; y < b.height; y++)
      for (let x = 0; x < b.width; x++) {
        const from = x < 17 || y < 23 ? 0 : a.mask[(y - 23) * a.width + x - 17];
        expect(b.mask[y * b.width + x]).toBe(from);
      }
    expect(b.contour).toEqual(a.contour.map(([x, y]) => [x + 17, y + 23]));
  });

  it("never crops the ink, however thin, on a sheet scaled down to measure", () => {
    const ink = sheet(
      1000,
      700,
      union(
        (x, y) => Math.abs(y - (200 + x * 0.3)) <= 1.5 && x > 250 && x < 700,
        (x, y) => Math.abs(Math.hypot(x - 520, y - 420) - 60) <= 2,
        disk(760, 330, 3),
      ),
    );
    const cut = cutOf(ink);
    expect(cut.scale).toBeLessThan(1);
    expect(holdsAllInk(cut, ink)).toBe(true);
  });

  it("joins nearby parts into one piece", () => {
    // Too far apart to meet at the first dilation, near enough for a wider one.
    const cut = cutOf(sheet(200, 120, union(disk(80, 60, 3), disk(108, 60, 3))));
    expect(cut.square).toBe(false);
    expect(cut.mask[cell(cut, 94, 60)]).toBe(1);
  });

  it("fills the holes inside the cut", () => {
    const ring: Shape = (x, y) => Math.abs(Math.hypot(x - 110, y - 90) - 28) <= 2;
    const cut = cutOf(sheet(220, 180, ring));
    expect(cut.square).toBe(false);
    expect(cut.mask[cell(cut, 110, 90)]).toBe(1);
  });

  it.each<[string, Pixels]>([
    ["covers most of the sheet", sheet(100, 100, rect(10, 10, 90, 90))],
    [
      "touches three edges",
      sheet(120, 100, union(rect(0, 20, 2, 99), rect(0, 97, 119, 99), rect(117, 20, 119, 99))),
    ],
    ["won't join into one piece", sheet(200, 100, union(disk(15, 50, 4), disk(185, 50, 4)))],
  ])("cuts a rounded square when the ink %s", (_, ink) => {
    const cut = cutOf(ink);
    expect(cut.square).toBe(true);
    expect(holdsAllInk(cut, ink)).toBe(true);
  });

  it("traces a closed contour along the cut's edge", () => {
    const cut = cutOf(sheet(200, 160, union(disk(80, 70, 22), rect(90, 60, 150, 100))));
    const { contour, soft, width, bounds } = cut;
    const first = contour[0];
    const last = contour[contour.length - 1];
    expect(Math.hypot(first[0] - last[0], first[1] - last[1])).toBeLessThan(2);
    // Points are pixel centers; the soft field's half level is the cut line.
    const softAt = (px: number, py: number) => {
      const x = px - 0.5;
      const y = py - 0.5;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const v = (xx: number, yy: number) => soft[yy * width + xx];
      return (
        (v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx) * (1 - fy) +
        (v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx) * fy
      );
    };
    for (const [x, y] of contour) expect(Math.abs(softAt(x, y) - 0.5)).toBeLessThan(0.35);
    // It goes all the way around: its extent is the cut's.
    const xs = contour.map(([x]) => x);
    const ys = contour.map(([, y]) => y);
    const spans = [
      [Math.min(...xs), bounds.x0],
      [Math.max(...xs), bounds.x1],
      [Math.min(...ys), bounds.y0],
      [Math.max(...ys), bounds.y1],
    ];
    for (const [traced, edge] of spans) expect(Math.abs(traced - (edge + 0.5))).toBeLessThan(2);
  });
});
