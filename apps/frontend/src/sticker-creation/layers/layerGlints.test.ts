import { describe, expect, it } from "vitest";
import { glintGroup, glintPath, pickInkEdges } from "./layerGlints";

function raster(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  return {
    pixels,
    fill(x: number, y: number, w: number, h: number, alpha = 255) {
      for (let row = y; row < y + h; row++)
        for (let col = x; col < x + w; col++) pixels[(row * width + col) * 4 + 3] = alpha;
    },
    edges: (sx = 1, sy = 1, random = () => 0) =>
      pickInkEdges(pixels, width, height, sx, sy, random),
  };
}

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
    const path = glintPath({ x: 370, y: 700 }, 0, 0, 374, 828, "broad");
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

  it("spreads six randomized origins over disconnected translucent ink", () => {
    const image = raster(400, 300);
    for (const y of [30, 230]) for (const x of [30, 190, 350]) image.fill(x, y, 1, 1, 1);
    const first = image.edges();
    const next = image.edges(1, 1, () => 0.9);
    expect(first).toHaveLength(6);
    expect(next[0]).not.toEqual(first[0]);
    for (const [i, a] of first.entries()) {
      expect(a.tier).toBe("tiny");
      expect(image.pixels[(a.py * 400 + a.px) * 4 + 3]).toBe(1);
      for (const b of first.slice(i + 1))
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(64);
    }
    expect(Math.hypot(first[1].x - first[0].x, first[1].y - first[0].y)).toBeGreaterThan(350);
  });

  it("measures connected local ink rather than nearby disconnected marks", () => {
    const image = raster(200, 140);
    image.fill(20, 20, 2, 2);
    image.fill(25, 20, 100, 90);
    const dot = image.edges().find((p) => p.px < 25);
    expect(dot?.tier).toBe("tiny");
    expect(image.edges().some((p) => p.tier === "broad")).toBe(true);
    const nearby = raster(100, 100);
    for (const x of [20, 30, 40]) nearby.fill(x, 20, 1, 1);
    expect(nearby.edges()).toHaveLength(1);
    expect(nearby.edges()[0].tier).toBe("tiny");
  });

  it("uses CSS extent under unequal scales, including diagonal hairlines", () => {
    const image = raster(200, 200);
    image.fill(20, 30, 12, 6);
    const dot = image.edges(1, 0.5)[0];
    expect(dot.tier).toBe("tiny");
    expect(dot.x).toBe(dot.px + 0.5);
    expect(dot.y).toBe((dot.py + 0.5) * 2);
    image.fill(20, 36, 1, 1);
    expect(image.edges(1, 0.5)[0].tier).toBe("small");
    const line = raster(180, 180);
    for (let i = 20; i < 140; i++) line.fill(i, i, 1, 1);
    expect(line.edges().every((p) => p.tier === "broad")).toBe(true);
    const small = raster(100, 100);
    small.fill(20, 20, 48, 1);
    expect(small.edges()[0].tier).toBe("small");
    small.fill(68, 20, 1, 1);
    expect(small.edges()[0].tier).toBe("broad");
  });

  it("gives tiny ink a smaller and faster flight than broad ink", () => {
    const tiny = glintPath({ x: 150, y: 150 }, 0, 0, 400, 400, "tiny");
    const broad = glintPath({ x: 150, y: 150 }, 0, 0, 400, 400, "broad");
    expect(tiny.size).toBeLessThan(broad.size);
    expect(tiny.duration).toBeLessThan(broad.duration);
    const distance = (path: typeof tiny) =>
      Math.max(
        ...path.frames.map((f) => {
          const match = f.transform.match(/translate\(([-\d.e]+)px,([-\d.e]+)px\)/);
          if (!match) throw new Error("No position in trajectory");
          return Math.hypot(Number(match[1]), Number(match[2]));
        }),
      );
    expect(distance(tiny)).toBeLessThan(distance(broad) / 2);
  });

  it("scales particle counts and shuffles balanced colors independently of size", () => {
    const point = { x: 150, y: 150, px: 150, py: 150 };
    const tiny = glintGroup({ ...point, tier: "tiny" }, 0, 400, 400, () => 0);
    const broad = glintGroup({ ...point, tier: "broad" }, 0, 400, 400, () => 0);
    const next = glintGroup({ ...point, tier: "broad" }, 0, 400, 400, () => 0.9);
    expect(tiny).toHaveLength(3);
    expect(broad).toHaveLength(5);
    expect(new Set(broad.map((p) => p.pink)).size).toBe(2);
    expect(Math.abs(broad.filter((p) => p.pink).length - broad.filter((p) => !p.pink).length)).toBe(
      1,
    );
    expect(broad.map((p) => p.size)).toEqual(next.map((p) => p.size));
    expect(broad.map((p) => p.pink)).not.toEqual(next.map((p) => p.pink));
    expect(broad[0].pink).not.toBe(next[0].pink);
  });

  it("bounds total particles and every scaled flight through its completed fade", () => {
    const image = raster(500, 500);
    image.fill(0, 0, 500, 500);
    const particles = image.edges().flatMap((p, group) => glintGroup(p, group, 500, 500, () => 0));
    expect(particles).toHaveLength(30);
    for (const tier of ["tiny", "small", "broad"] as const)
      for (const [width, height] of [
        [400, 600],
        [10, 8],
        [64, 64],
      ])
        for (const [x, y] of [
          [0, 0],
          [width, height],
          [width / 2, height / 2],
        ]) {
          const paths = glintGroup({ x, y, px: 0, py: 0, tier }, 5, width, height, () => 0.9);
          for (const path of paths) {
            expect(Number.isFinite(path.duration)).toBe(true);
            expect(path.duration).toBeGreaterThan(0);
            expect(path.delay + path.duration).toBeLessThan(900);
            expect(path.frames.at(-1)?.opacity).toBe(0);
            expect(path.frames.at(-1)?.transform).toContain("scale(0.01)");
            for (const frame of path.frames) {
              const match = frame.transform.match(/translate\(([-\d.e]+)px,([-\d.e]+)px\)/);
              if (!match) throw new Error("No finite position in trajectory");
              const at = { x: path.x + Number(match[1]), y: path.y + Number(match[2]) };
              expect(at.x).toBeGreaterThanOrEqual(path.margin - 0.001);
              expect(at.x).toBeLessThanOrEqual(width - path.margin + 0.001);
              expect(at.y).toBeGreaterThanOrEqual(path.margin - 0.001);
              expect(at.y).toBeLessThanOrEqual(height - path.margin + 0.001);
              expect(frame.opacity).toBeGreaterThanOrEqual(0);
              expect(frame.opacity).toBeLessThanOrEqual(1);
            }
          }
        }
  });
});
