// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { contextOf, forgetContexts } from "../../sticker-board/timelapse/testCanvas";
import { context2d } from "../canvas/context2d";
import type { LayerId } from "../canvas/ops";
import type { Rect } from "../sealing/stickerPasses";
import { compositeLayers } from "./composite";
import type { Layer } from "./layerState";

vi.mock("../canvas/context2d", async () => {
  const { fakeContext2d } = await import("../../sticker-board/timelapse/testCanvas");
  return { context2d: fakeContext2d };
});

const SIZE = 8;
const WHOLE: Rect = { x: 0, y: 0, w: SIZE, h: SIZE };
const LEFT: Rect = { x: 0, y: 0, w: SIZE / 2, h: SIZE };
const TOP: Rect = { x: 0, y: 0, w: SIZE, h: SIZE / 2 };
const BOTTOM: Rect = { x: 0, y: SIZE / 2, w: SIZE, h: SIZE / 2 };

type Rgba = readonly number[];
const RED: Rgba = [255, 0, 0, 255];
const GREEN: Rgba = [0, 255, 0, 255];
const BLUE: Rgba = [0, 0, 255, 255];
const CLEAR: Rgba = [0, 0, 0, 0];

const blank = (width = SIZE, height = width) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** `canvas`, a sheet-sized one by default, with `color` over `region`. */
function ink(region: Rect, color: Rgba, canvas = blank()) {
  const image = new ImageData(region.w, region.h);
  for (let i = 0; i < image.data.length; i += 4) image.data.set(color, i);
  context2d(canvas).putImageData(image, region.x, region.y);
  return canvas;
}

const pixel = (canvas: HTMLCanvasElement, x: number, y: number) => [
  ...context2d(canvas).getImageData(x, y, 1, 1).data,
];

/** Blending rounds to bytes, so a channel may differ from the exact value by one. */
function expectPixel(canvas: HTMLCanvasElement, x: number, y: number, expected: Rgba) {
  const actual = pixel(canvas, x, y);
  const off = expected.map((channel, i) => Math.abs(actual[i] - channel));
  const said = `(${x}, ${y}) is ${actual.join(", ")}, not ${expected.join(", ")}`;
  expect(Math.max(...off), said).toBeLessThanOrEqual(1);
}

const layer = (id: LayerId, overrides: Partial<Layer> = {}): Layer => ({
  id,
  opacity: 100,
  locked: false,
  clipped: false,
  ...overrides,
});

interface Run {
  /** The layers drawn; all of them by default. */
  ids?: readonly LayerId[];
  rect?: Rect;
  /** What they're drawn onto; a clear canvas by default. */
  onto?: HTMLCanvasElement;
  scratch?: HTMLCanvasElement;
}

/** Composites `layers`, each drawn from its entry in `inks` if it has one. */
function composite(
  layers: readonly Layer[],
  inks: Partial<Record<LayerId, HTMLCanvasElement>>,
  { ids = layers.map((l) => l.id), rect = WHOLE, onto = blank(), scratch = blank() }: Run = {},
) {
  const state = { layers, nextId: layers.length + 1 };
  compositeLayers(context2d(onto), state, (id) => inks[id] ?? null, ids, rect, context2d(scratch));
  return onto;
}

afterEach(() => {
  forgetContexts();
});

describe("compositing layers", () => {
  it("draws a layer at its opacity, so 50 halves its alpha", () => {
    const out = composite([layer(1, { opacity: 50 })], { 1: ink(WHOLE, RED) });
    expectPixel(out, 3, 3, [255, 0, 0, 255 / 2]);
  });

  it("draws a hidden layer not at all", () => {
    const layers = [layer(1), layer(2, { opacity: 0 })];
    const out = composite(layers, { 1: ink(LEFT, BLUE), 2: ink(WHOLE, RED) });
    expectPixel(out, 1, 3, BLUE);
    expectPixel(out, 6, 3, CLEAR);
  });

  it("draws a layer with no canvas as nothing", () => {
    const out = composite([layer(1), layer(2)], { 1: ink(LEFT, BLUE) });
    expectPixel(out, 1, 3, BLUE);
    expectPixel(out, 6, 3, CLEAR);
  });

  it("shows a clipped layer only where its base has ink", () => {
    const layers = [layer(1), layer(2, { clipped: true })];
    const out = composite(layers, { 1: ink(LEFT, BLUE), 2: ink(WHOLE, RED) });
    expectPixel(out, 1, 3, RED);
    expectPixel(out, 6, 3, CLEAR);
  });

  it("clips two clipped layers to the one base under them, not to each other", () => {
    const layers = [layer(1), layer(2, { clipped: true }), layer(3, { clipped: true })];
    const inks = { 1: ink(LEFT, BLUE), 2: ink(TOP, RED), 3: ink(BOTTOM, GREEN) };
    const out = composite(layers, inks);
    expectPixel(out, 1, 1, RED);
    expectPixel(out, 1, 6, GREEN);
    expectPixel(out, 6, 1, CLEAR);
    expectPixel(out, 6, 6, CLEAR);
  });

  it("draws clipped layers whole when no unclipped layer is below them", () => {
    const layers = [layer(1, { clipped: true }), layer(2, { clipped: true })];
    const out = composite(layers, { 1: ink(LEFT, BLUE), 2: ink(TOP, RED) });
    expectPixel(out, 1, 1, RED);
    expectPixel(out, 1, 6, BLUE);
    expectPixel(out, 6, 1, RED);
    expectPixel(out, 6, 6, CLEAR);
  });

  it("multiplies a clipped layer's opacity by its base's: 50 on 50 draws 25%", () => {
    const layers = [layer(1, { opacity: 50 }), layer(2, { opacity: 50, clipped: true })];
    // Only the clipped layer is drawn, so the base's own ink isn't in the pixel.
    const out = composite(layers, { 1: ink(WHOLE, BLUE), 2: ink(WHOLE, RED) }, { ids: [2] });
    expectPixel(out, 3, 3, [255, 0, 0, 255 / 4]);
  });

  it("clips a layer to its base when the base is below the layers drawn", () => {
    const layers = [layer(1), layer(2, { clipped: true })];
    const out = composite(layers, { 1: ink(LEFT, BLUE), 2: ink(WHOLE, RED) }, { ids: [2] });
    expectPixel(out, 1, 3, RED);
    expectPixel(out, 6, 3, CLEAR);
  });

  it("draws a clipped layer nowhere when its base has no ink", () => {
    const out = composite([layer(1), layer(2, { clipped: true })], { 2: ink(WHOLE, RED) });
    expectPixel(out, 3, 3, CLEAR);
  });

  it("draws a clipped layer nowhere when its base is hidden", () => {
    const layers = [layer(1, { opacity: 0 }), layer(2, { clipped: true })];
    const out = composite(layers, { 1: ink(WHOLE, BLUE), 2: ink(WHOLE, RED) });
    expectPixel(out, 3, 3, CLEAR);
  });

  it("changes only the pixels inside rect, the clipped layers' too", () => {
    const layers = [layer(1), layer(2, { clipped: true })];
    const rect = { x: 2, y: 2, w: 4, h: 4 };
    const onto = ink(WHOLE, GREEN);
    composite(layers, { 1: ink(WHOLE, BLUE), 2: ink(WHOLE, RED) }, { rect, onto });
    expectPixel(onto, 2, 2, RED);
    expectPixel(onto, 5, 5, RED);
    for (const [x, y] of [
      [1, 3],
      [6, 3],
      [3, 1],
      [3, 6],
      [0, 0],
      [7, 7],
    ]) {
      expectPixel(onto, x, y, GREEN);
    }
  });

  it("throws, naming the layer, for one the state doesn't have", () => {
    expect(() => composite([layer(1)], { 1: ink(WHOLE, RED) }, { ids: [2] })).toThrow("Layer 2");
  });

  it("draws at the identity transform, whatever either context held, and leaves its state alone", () => {
    const layers = [layer(1), layer(2, { clipped: true })];
    const onto = blank();
    const scratch = blank();
    for (const canvas of [onto, scratch]) {
      const g = context2d(canvas);
      g.globalAlpha = 0.3;
      g.globalCompositeOperation = "destination-out";
    }
    composite(layers, { 1: ink(LEFT, BLUE), 2: ink(WHOLE, RED) }, { onto, scratch });

    expectPixel(onto, 1, 3, RED);
    for (const canvas of [onto, scratch]) {
      const g = context2d(canvas);
      expect([g.globalAlpha, g.globalCompositeOperation]).toEqual([0.3, "destination-out"]);
      const calls = contextOf(canvas)?.calls ?? [];
      const firstDraw = calls.findIndex(([name]) => name === "drawImage");
      expect(calls.slice(0, firstDraw)).toContainEqual(["setTransform", 1, 0, 0, 1, 0, 0]);
    }
  });
});

describe("the fake canvas's blending", () => {
  // Opaque red drawn at globalAlpha 0.2 over blue at alpha 0.6, so each operator keeps a different mix.
  it.each<[mode: GlobalCompositeOperation, result: Rgba]>([
    ["source-over", [75, 0, 180, 173]],
    ["destination-over", [30, 0, 225, 173]],
    ["destination-in", [0, 0, 255, 31]],
    ["destination-out", [0, 0, 255, 122]],
    ["source-atop", [51, 0, 204, 153]],
    ["copy", [255, 0, 0, 51]],
  ])("%s gives the premultiplied blend", (mode, result) => {
    const source = ink({ x: 0, y: 0, w: 1, h: 1 }, RED, blank(1));
    const target = ink({ x: 0, y: 0, w: 1, h: 1 }, [0, 0, 255, 153], blank(1));
    const g = context2d(target);
    g.globalAlpha = 0.2;
    g.globalCompositeOperation = mode;
    g.drawImage(source, 0, 0);
    expectPixel(target, 0, 0, result);
  });

  it("counts source pixels past the source canvas as transparent", () => {
    const target = ink(WHOLE, BLUE);
    const g = context2d(target);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(ink({ x: 0, y: 0, w: 4, h: 4 }, RED, blank(4)), 0, 0, 8, 8, 0, 0, 8, 8);
    expectPixel(target, 1, 1, BLUE);
    expectPixel(target, 6, 1, CLEAR);
    expectPixel(target, 1, 6, CLEAR);
  });

  it("throws, naming it, for a composite operation it can't blend", () => {
    const g = context2d(blank(1));
    g.globalCompositeOperation = "multiply";
    expect(() => g.drawImage(blank(1), 0, 0)).toThrow("multiply");
  });

  it("saves and restores alpha and the composite operation as a stack, and ignores a restore with none saved", () => {
    const g = context2d(blank(1));
    g.globalAlpha = 0.5;
    g.save();
    g.globalAlpha = 0.25;
    g.globalCompositeOperation = "copy";
    g.save();
    g.globalAlpha = 0.1;
    g.restore();
    expect([g.globalAlpha, g.globalCompositeOperation]).toEqual([0.25, "copy"]);
    g.restore();
    g.restore();
    expect([g.globalAlpha, g.globalCompositeOperation]).toEqual([0.5, "source-over"]);
  });
});
