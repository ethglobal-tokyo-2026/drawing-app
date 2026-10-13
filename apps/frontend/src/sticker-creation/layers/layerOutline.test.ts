// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { contextOf, forgetContexts } from "../../sticker-board/timelapse/testCanvas";
import { blankCanvas } from "../canvas/context2d";
import { layerOutlineCrop, prepareLayerOutline } from "./layerOutline";

vi.mock("../canvas/context2d", () => import("../canvas/testContext2d"));
afterEach(forgetContexts);

function artwork(width: number, height: number, fill = false) {
  const made = blankCanvas(width, height);
  const image = new ImageData(width, height);
  if (fill) for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
  return {
    ...made,
    image,
    ink(x: number, y: number, alpha = 255) {
      image.data[(y * width + x) * 4 + 3] = alpha;
    },
    outline(
      inked = { x: 0, y: 0, w: width, h: height },
      cssWidth = width,
      cssHeight = height,
      dpr = 1,
    ) {
      made.g.putImageData(image, 0, 0);
      const crop = layerOutlineCrop(width, height, inked, cssWidth, cssHeight, dpr);
      if (!crop) throw new Error("Missing outline crop");
      const result = prepareLayerOutline(made.canvas, crop, blankCanvas);
      if (!result) throw new Error("Missing outline");
      const g = contextOf(result.canvas);
      if (!g) throw new Error("Missing outline context");
      const pixels = g.getImageData(0, 0, result.canvas.width, result.canvas.height).data;
      const pixel = (x: number, y: number) => [
        ...pixels.slice(
          ((y - crop.raster.y) * crop.raster.w + x - crop.raster.x) * 4,
          ((y - crop.raster.y) * crop.raster.w + x - crop.raster.x) * 4 + 4,
        ),
      ];
      return { ...result, crop, pixels, pixel };
    },
  };
}

describe("layer outline geometry", () => {
  it("pads sparse ink at screen density without stretching the crop", () => {
    const crop = layerOutlineCrop(160, 120, { x: 40, y: 30, w: 20, h: 20 }, 80, 60, 2);
    expect(crop?.raster).toEqual({ x: 34, y: 24, w: 32, h: 32 });
    expect(crop?.density).toBe(2);
    expect(crop?.source).toEqual({ x: 34, y: 24, w: 32, h: 32 });
  });

  it("bounds enlarged and fractional sheets by source resolution and DPR", () => {
    const enlarged = layerOutlineCrop(100, 80, { x: 0, y: 0, w: 100, h: 80 }, 200, 160, 3);
    expect(enlarged?.density).toBe(0.5);
    expect(enlarged?.raster).toEqual({ x: 0, y: 0, w: 100, h: 80 });
    const resized = layerOutlineCrop(400, 320, { x: 200, y: 160, w: 1, h: 1 }, 150.5, 120.4, 8);
    expect(resized?.density).toBeCloseTo(400 / 150.5);
    expect(resized?.raster.x).toBe(192);
    expect(resized?.raster.y).toBe(152);
  });

  it("expands an alpha-1 mark in a circle with fractional edge coverage", () => {
    const ink = artwork(80, 60);
    ink.ink(40, 30, 1);
    const outline = ink.outline({ x: 40, y: 30, w: 1, h: 1 });
    expect(outline.pixel(40, 30)[3]).toBe(0);
    expect(outline.pixel(42, 30)[3]).toBe(255);
    expect(outline.pixel(42, 32)[3]).toBeGreaterThan(0);
    expect(outline.pixel(42, 32)[3]).toBeLessThan(255);
    expect(outline.pixel(43, 33)[3]).toBe(0);
    expect(outline.pixel(43, 30)[3]).toBe(128);
    expect([...ink.g.getImageData(40, 30, 1, 1).data]).toEqual([0, 0, 0, 1]);
  });

  it("keeps isolated faint source pixels when a saved sheet is shown smaller", () => {
    const ink = artwork(160, 120);
    ink.ink(80, 60, 1);
    const outline = ink.outline({ x: 80, y: 60, w: 1, h: 1 }, 80, 60, 1);
    expect(outline.pixel(40, 30)[3]).toBe(0);
    expect(outline.pixel(42, 30)[3]).toBe(255);
    expect(ink.image.data[(60 * 160 + 80) * 4 + 3]).toBe(1);
  });

  it("adds the inset only at occupied sheet edges, leaving erased notches and holes clear", () => {
    const ink = artwork(40, 40, true);
    for (let y = 0; y < 12; y++) for (let x = 8; x < 18; x++) ink.ink(x, y, 0);
    for (let y = 0; y < 2; y++) for (let x = 25; x < 28; x++) ink.ink(x, y, 0);
    for (let y = 15; y < 25; y++) for (let x = 15; x < 25; x++) ink.ink(x, y, 0);
    const outline = ink.outline();
    expect(outline.pixel(20, 7)[3]).toBeGreaterThan(0);
    expect(outline.pixel(13, 7)[3]).toBe(0);
    expect(outline.pixel(26, 7)[3]).toBe(0);
    expect(outline.pixel(20, 20)[3]).toBe(0);
    expect(outline.pixel(15, 20)[3]).toBeGreaterThan(0);
    expect(outline.pixel(20, 12)[3]).toBe(0);
  });

  it("does not mistake a sparse crop boundary for the sheet edge", () => {
    const ink = artwork(80, 60);
    for (let y = 20; y < 40; y++) for (let x = 30; x < 50; x++) ink.ink(x, y);
    const outline = ink.outline({ x: 30, y: 20, w: 20, h: 20 });
    expect(outline.pixel(40, 25)[3]).toBe(0);
    expect(outline.pixel(35, 30)[3]).toBe(0);
    expect(outline.pixel(40, 19)[3]).toBe(255);
  });
});
