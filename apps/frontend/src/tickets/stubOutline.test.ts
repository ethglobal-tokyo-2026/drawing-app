import { describe, expect, it } from "vitest";
import { fitOutline } from "./stubOutline";

const points = (d: string) =>
  [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);

const bounds = (d: string) => {
  const xs = points(d).map(([x]) => x);
  const ys = points(d).map(([, y]) => y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

const box = { x: 10, y: 0, w: 40, h: 40 };

describe("fitOutline", () => {
  it("centers the outline in the box at its own aspect ratio", () => {
    const d = fitOutline("M100 100L300 100L300 200L100 200Z", box);
    expect(bounds(d)).toEqual({ x0: 10, x1: 50, y0: 10, y1: 30 });
  });

  it("keeps every piece of a sticker cut in several pieces", () => {
    const d = fitOutline("M0 0L10 0L10 10ZM30 0L40 0L40 10Z", box);
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it("thins a dense outline to the stub's resolution", () => {
    const n = 5000;
    const circle = `M${Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 2 * Math.PI;
      return `${(1000 + 1000 * Math.cos(a)).toFixed(1)} ${(1000 + 1000 * Math.sin(a)).toFixed(1)}`;
    }).join("L")}Z`;
    // The fitted circle is about 126px round, so a point per half pixel stays under 300.
    expect(points(fitOutline(circle, box)).length).toBeLessThan(300);
  });

  it("draws nothing for an outline without points", () => {
    expect(fitOutline("", box)).toBe("");
  });
});
