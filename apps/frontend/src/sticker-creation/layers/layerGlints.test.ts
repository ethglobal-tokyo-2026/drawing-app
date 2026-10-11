import { describe, expect, it } from "vitest";
import { glintPath, pickInkEdges } from "./layerGlints";

describe("layer glint placement and motion", () => {
  it("chooses separated real ink edges and varies the starting place", () => {
    const width = 240,
      height = 180;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (const [x, y] of [
      [20, 20],
      [180, 20],
      [20, 150],
      [180, 150],
    ]) {
      pixels[(y * width + x) * 4 + 3] = 1;
    }
    const first = pickInkEdges(pixels, width, height, 1, 1, () => 0);
    const next = pickInkEdges(pixels, width, height, 1, 1, () => 0.9);
    expect(first).toHaveLength(4);
    expect(next[0]).not.toEqual(first[0]);
    for (let i = 0; i < first.length; i++) {
      const a = first[i];
      expect(pixels[(Math.floor(a.y) * width + Math.floor(a.x)) * 4 + 3]).toBe(1);
      for (const b of first.slice(i + 1))
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(64);
    }
    expect(pickInkEdges(new Uint8ClampedArray(pixels.length), width, height, 1, 1)).toEqual([]);
  });

  it("keeps a falling star within the sheet until it dissolves, including a bounce", () => {
    const path = glintPath({ x: 370, y: 700 }, 0, 0, 374, 828);
    const frames = path.frames;
    const positions = frames
      .map((f) => f.transform.match(/translate\(([-\d.e]+)px,([-\d.e]+)px\)/))
      .map((match) => {
        if (!match) throw new Error("No position in trajectory");
        return { x: path.x + Number(match[1]), y: path.y + Number(match[2]) };
      });
    expect(positions.some((p, i) => i > 0 && p.x < positions[i - 1].x)).toBe(true);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(path.margin - 0.01);
      expect(p.x).toBeLessThanOrEqual(374 - path.margin + 0.01);
      expect(p.y).toBeGreaterThanOrEqual(path.margin - 0.01);
      expect(p.y).toBeLessThanOrEqual(828 - path.margin + 0.01);
    }
    expect(Number(frames.at(-1)?.opacity)).toBe(0);
    expect(Number(frames.find((f) => Number(f.offset) > 0.7)?.opacity)).toBeLessThan(1);
    expect(frames.at(-1)?.transform).toContain("scale(0.01)");
  });
});
