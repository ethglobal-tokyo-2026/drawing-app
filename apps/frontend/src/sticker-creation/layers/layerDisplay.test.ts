// @vitest-environment happy-dom
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import {
  contextOf,
  forgetContexts,
  madeContexts,
  paintPaths,
  type FakeContext,
} from "../../sticker-board/timelapse/testCanvas";
import { ReducedMotion } from "../../ui/testing";
import { hexToRgb } from "../canvas/color";
import { blankCanvas } from "../canvas/context2d";
import { STRIDE, type LayerId, type StrokeOp } from "../canvas/ops";
import { paintStroke } from "../canvas/paintStroke";
import type { SheetFrame } from "../canvas/sheetFrame";
import type { Rect } from "../sealing/stickerPasses";
import { LayerDisplay } from "./layerDisplay";
import { FLASH_MS, GLINT_TAIL_MS } from "./layerFlash";
import { LayerInk } from "./layerInk";
import { FULL_OPACITY, type Layer, type LayerState } from "./layerState";
import { brush, clearLayer, eraser } from "./testLayerSteps";

vi.mock("../canvas/context2d", () => import("../canvas/testContext2d"));

/** 20 sheet units square at 2 device px a unit: regions are in device px, strokes in sheet units. */
const FRAME: SheetFrame = { w: 20, h: 20, density: 2 };
const SIDE = FRAME.w * FRAME.density;
const WHOLE: Rect = { x: 0, y: 0, w: SIDE, h: SIDE };
const LEFT: Rect = { x: 0, y: 0, w: SIDE / 2, h: SIDE };
const RIGHT: Rect = { x: SIDE / 2, y: 0, w: SIDE / 2, h: SIDE };

type Rgba = readonly number[];
const RED: Rgba = [255, 0, 0, 255];
const GREEN: Rgba = [0, 255, 0, 255];
const BLUE: Rgba = [0, 0, 255, 255];
const CLEAR: Rgba = [0, 0, 0, 0];
const INK: Rgba = [...hexToRgb(brush().color), 255];

/** Device px: a stroke `across` the sheet passes over the first two, and well clear of the third. */
const ON_LEFT = { x: 8, y: 20 };
const ON_RIGHT = { x: 30, y: 20 };
const OFF_LEFT = { x: 8, y: 4 };
/** A stroke across the sheet's middle, from the left half into the right. */
const across = (op: StrokeOp): StrokeOp => ({
  ...op,
  pts: [3, 10, 4, 0, 10, 10, 4, 16, 17, 10, 4, 32],
});

const layer = (id: LayerId, overrides: Partial<Layer> = {}): Layer => ({
  id,
  opacity: FULL_OPACITY,
  locked: false,
  clipped: false,
  ...overrides,
});
const stateOf = (...layers: Layer[]): LayerState => ({
  layers,
  nextId: Math.max(...layers.map((l) => l.id)) + 1,
});
const ONE = stateOf(layer(1));

function context(canvas: HTMLCanvasElement): FakeContext {
  const g = contextOf(canvas);
  if (!g) throw new Error("The canvas has no context");
  return g;
}

/** The element at `index` among `parent`'s, which must be a `kind`. */
function child<E extends Element>(parent: Element, index: number, kind: new () => E): E {
  const found = parent.children[index];
  if (!(found instanceof kind)) throw new Error(`Child ${index} isn't a ${kind.name}`);
  return found;
}

/** A display of a fresh ink at FRAME, and the canvases it shows: below, the current group and wet, above. */
function sheet() {
  const ink = new LayerInk();
  ink.setFrame(FRAME);
  const host = document.createElement("div");
  const display = new LayerDisplay(host, ink);
  const group = child(host, 1, HTMLDivElement);
  const wet = group.lastElementChild;
  if (!(wet instanceof HTMLCanvasElement)) throw new Error("The group doesn't end in wet");
  const below = child(host, 0, HTMLCanvasElement);
  const above = child(host, 2, HTMLCanvasElement);
  return { ink, host, display, below, group, wet, above };
}

/** Layer `id`'s canvas, holding `color` over `region`: a stroke with no points makes it, painting nothing. */
function inkRegion(ink: LayerInk, id: LayerId, region: Rect, color: Rgba): HTMLCanvasElement {
  ink.apply(brush(id), stateOf(layer(id)));
  const canvas = ink.layerCanvas(id);
  if (!canvas) throw new Error(`Layer ${id} has no canvas`);
  const image = new ImageData(region.w, region.h);
  for (let i = 0; i < image.data.length; i += 4) image.data.set(color, i);
  context(canvas).putImageData(image, region.x, region.y);
  return canvas;
}

const pixel = (canvas: HTMLCanvasElement, { x, y }: { x: number; y: number }) => [
  ...context(canvas).getImageData(x, y, 1, 1).data,
];
const pixelsOf = (canvas: HTMLCanvasElement) => [
  ...context(canvas).getImageData(0, 0, canvas.width, canvas.height).data,
];

/** Blending at an opacity rounds to bytes, so a channel may be one off the exact value. */
function expectPixel(canvas: HTMLCanvasElement, at: { x: number; y: number }, expected: Rgba) {
  const actual = pixel(canvas, at);
  const off = expected.map((channel, i) => Math.abs(actual[i] - channel));
  const said = `(${at.x}, ${at.y}) is ${actual.join(", ")}, not ${expected.join(", ")}`;
  expect(Math.max(...off), said).toBeLessThanOrEqual(1);
}

/** Where two sheet canvases' pixels first differ, said; null where they match. */
function firstDifference(a: HTMLCanvasElement, b: HTMLCanvasElement): string | null {
  const [pa, pb] = [pixelsOf(a), pixelsOf(b)];
  for (let i = 0; i < pa.length; i += 4) {
    const [x, y] = [(i / 4) % SIDE, Math.floor(i / 4 / SIDE)];
    const [ra, rb] = [pa.slice(i, i + 4), pb.slice(i, i + 4)];
    if (ra.some((v, k) => v !== rb[k]))
      return `(${x}, ${y}) is ${ra.join(", ")}, not ${rb.join(", ")}`;
  }
  return null;
}

const blank = (canvas: HTMLCanvasElement) => pixelsOf(canvas).every((v) => v === 0);
const sizeOf = (canvas: HTMLCanvasElement) => [canvas.width, canvas.height];
const count = ({ pts }: StrokeOp) => pts.length / STRIDE;

beforeAll(() => paintPaths(true));
afterAll(() => paintPaths(false));
afterEach(() => {
  forgetContexts();
});

describe("the sheet's display", () => {
  it("composites the layers under the current one into below and those over it into above, each at its opacity, and fades the current one's group by its own", () => {
    const { ink, display, below, group, above } = sheet();
    const state = stateOf(
      layer(1, { opacity: 50 }),
      layer(2, { opacity: 40 }),
      layer(3, { opacity: 80 }),
    );
    inkRegion(ink, 1, LEFT, RED);
    const current = inkRegion(ink, 2, WHOLE, GREEN);
    inkRegion(ink, 3, RIGHT, BLUE);
    display.show(state, 2);

    const [inLeft, inRight] = [
      { x: 4, y: 4 },
      { x: SIDE - 4, y: 4 },
    ];
    expectPixel(below, inLeft, [255, 0, 0, 255 * 0.5]);
    expectPixel(below, inRight, CLEAR);
    expectPixel(above, inRight, [0, 0, 255, 255 * 0.8]);
    expectPixel(above, inLeft, CLEAR);
    // The sides show at CSS opacity 1: the layers' opacities are in their pixels alone.
    expect([below.style.opacity, above.style.opacity]).toEqual(["", ""]);
    expect(group.firstElementChild).toBe(current);
    expect(Number(group.style.opacity)).toBe(0.4);
    expect(group.style.visibility).not.toBe("hidden");

    display.show(stateOf(layer(1), layer(2, { opacity: 0 }), layer(3)), 2);
    expect(group.style.visibility).toBe("hidden");
  });

  it("previews a clipped current layer at its base's opacity and restores its own", () => {
    const { ink, display, group } = sheet();
    const state = stateOf(layer(1, { opacity: 50 }), layer(2, { opacity: 40, clipped: true }));
    inkRegion(ink, 1, WHOLE, RED);
    inkRegion(ink, 2, WHOLE, GREEN);
    display.show(state, 2);
    expect(Number(group.style.opacity)).toBeCloseTo(0.2);
    display.previewOpacity(80);
    expect(Number(group.style.opacity)).toBeCloseTo(0.4);
    display.previewOpacity(0);
    expect(group.style.visibility).toBe("hidden");
    display.previewOpacity(null);
    expect(Number(group.style.opacity)).toBeCloseTo(0.2);
    expect(group.style.visibility).toBe("");
  });

  it("previews a base's opacity through its clipped layers without fading unrelated layers above", () => {
    const { ink, display, above } = sheet();
    const state = stateOf(layer(1), layer(2, { clipped: true }), layer(3));
    inkRegion(ink, 1, LEFT, RED);
    inkRegion(ink, 2, WHOLE, GREEN);
    inkRegion(ink, 3, RIGHT, BLUE);
    display.show(state, 1);

    for (const opacity of [50, 0, 25]) {
      display.previewOpacity(opacity);
      expectPixel(above, ON_LEFT, opacity ? [0, 255, 0, (255 * opacity) / 100] : CLEAR);
      expectPixel(above, ON_RIGHT, BLUE);
    }
    display.previewOpacity(null);
    expectPixel(above, ON_LEFT, GREEN);
    expectPixel(above, ON_RIGHT, BLUE);
    expect(state.layers[0].opacity).toBe(FULL_OPACITY);
  });

  it("masks a hidden clipped layer before an opacity preview makes its ink visible", () => {
    const { ink, display, group, wet } = sheet();
    const state = stateOf(layer(1), layer(2, { opacity: 0, clipped: true }));
    inkRegion(ink, 1, LEFT, RED);
    const current = inkRegion(ink, 2, WHOLE, GREEN);
    display.show(state, 2);

    display.previewOpacity(50);
    expect(group.style.visibility).toBe("");
    expect(Number(group.style.opacity)).toBeCloseTo(0.5);
    expect(current.style.visibility).toBe("hidden");
    expect(wet.style.visibility).toBe("hidden");
    const view = group.lastElementChild;
    if (!(view instanceof HTMLCanvasElement)) throw new Error("The preview has no clipping view");
    expectPixel(view, ON_LEFT, GREEN);
    expectPixel(view, ON_RIGHT, CLEAR);

    display.previewOpacity(null);
    expect(group.style.visibility).toBe("hidden");
    expect(sizeOf(view)).toEqual([0, 0]);
    expect(state.layers[1].opacity).toBe(0);
  });

  it("shows rebuilt ink after releasing the covered sheet and resizing it on return", () => {
    const { ink, display, host, group, wet, below, above } = sheet();
    const state = stateOf(layer(1), layer(2, { clipped: true }), layer(3));
    inkRegion(ink, 1, LEFT, RED);
    inkRegion(ink, 2, WHOLE, GREEN);
    inkRegion(ink, 3, RIGHT, BLUE);
    display.show(state, 2);
    display.release();
    expect(host.children).toHaveLength(0);
    expect([sizeOf(below), sizeOf(wet), sizeOf(above)]).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);

    display.resize();
    display.show(state, 2);
    expect([...host.children]).toEqual([below, group, above]);
    expectPixel(below, ON_LEFT, RED);
    expectPixel(above, ON_RIGHT, BLUE);
    const view = group.lastElementChild;
    if (!(view instanceof HTMLCanvasElement)) throw new Error("The restored layer has no view");
    expectPixel(view, ON_LEFT, GREEN);
    expectPixel(view, ON_RIGHT, CLEAR);
    expect(sizeOf(wet)).toEqual([SIDE, SIDE]);
  });

  it("lets go of a side's canvas while no layer there shows ink, and sizes it again once one does", () => {
    const { ink, display, below, above } = sheet();
    const state = stateOf(layer(1), layer(2), layer(3));
    inkRegion(ink, 1, WHOLE, RED);
    inkRegion(ink, 3, WHOLE, BLUE);
    display.show(state, 2);
    expect([sizeOf(below), sizeOf(above)]).toEqual([
      [SIDE, SIDE],
      [SIDE, SIDE],
    ]);
    display.show(state, 1);
    expect(sizeOf(below)).toEqual([0, 0]);
    // Above, only a blank layer and a hidden one.
    display.show(stateOf(layer(1), layer(2), layer(3, { opacity: 0 })), 1);
    expect(sizeOf(above)).toEqual([0, 0]);
    display.show(state, 3);
    expect([sizeOf(below), sizeOf(above)]).toEqual([
      [SIDE, SIDE],
      [0, 0],
    ]);
  });

  it("mounts the canvas the ink makes on the current layer's first stroke, under wet, and takes it away after a clear", () => {
    const { ink, display, group, wet } = sheet();
    display.show(ONE, 1);
    expect([...group.children]).toEqual([wet]);
    ink.apply(across(brush()), ONE);
    display.showCurrent();
    const canvas = ink.layerCanvas(1);
    expect([...group.children]).toEqual([canvas, wet]);
    expect([canvas?.className, canvas?.getAttribute("aria-hidden")]).toEqual([
      "ink-canvas",
      "true",
    ]);
    ink.apply(clearLayer(1), ONE);
    display.showCurrent();
    expect([...group.children]).toEqual([wet]);
  });

  it("paints a brush on an unlocked layer on wet alone, over the layer's canvas, until the stroke ends", () => {
    const { ink, display, wet } = sheet();
    const canvas = inkRegion(ink, 1, LEFT, RED);
    display.show(ONE, 1);
    const before = pixelsOf(canvas);
    const op = across(brush());
    display.beginStroke(op);
    display.paintStroke(0, count(op));
    expect([pixel(wet, ON_LEFT), pixel(wet, ON_RIGHT), pixel(wet, OFF_LEFT)]).toEqual([
      INK,
      INK,
      CLEAR,
    ]);
    expect(pixelsOf(canvas)).toEqual(before);
    expect(canvas.style.visibility).toBe("");
    display.endStroke();
    expect(blank(wet)).toBe(true);
  });

  it.each<[string, StrokeOp, LayerState, Rgba]>([
    ["an eraser", across(eraser()), ONE, CLEAR],
    ["a brush on a locked layer", across(brush()), stateOf(layer(1, { locked: true })), INK],
  ])(
    "previews %s over a copy of the layer, whose canvas hides until the stroke ends, untouched",
    (_, op, state, onInk) => {
      const { ink, display, wet } = sheet();
      const canvas = inkRegion(ink, 1, LEFT, RED);
      display.show(state, 1);
      const before = pixelsOf(canvas);
      display.beginStroke(op);
      display.paintStroke(0, count(op));
      expect(canvas.style.visibility).toBe("hidden");
      // The stroke changes only what the commit will: the layer's ink, never where it has none.
      expect([pixel(wet, OFF_LEFT), pixel(wet, ON_LEFT), pixel(wet, ON_RIGHT)]).toEqual([
        RED,
        onInk,
        CLEAR,
      ]);
      display.endStroke();
      expect(canvas.style.visibility).toBe("");
      expect(pixelsOf(canvas)).toEqual(before);
      expect(blank(wet)).toBe(true);
    },
  );

  describe("the tail the curve holds back", () => {
    /** The stroke's settled points, then two tails from its last: A turns up, B down. */
    const SETTLED = [3, 10, 3, 0, 7, 10, 3, 16, 11, 10, 3, 32];
    const TAIL_A = [14, 6, 3, 48, 16, 4, 3, 64];
    const TAIL_B = [14, 14, 3, 48, 16, 16, 3, 64];
    /** Device px: A's tip, beyond B; B's tip, beyond A's box; the last settled point, in A's box. */
    const A_TIP = { x: 32, y: 8 };
    const B_TIP = { x: 32, y: 32 };
    const SETTLED_END = { x: 22, y: 20 };

    /** A fresh canvas showing what wet should: `under`, the stroke over it, and `tail` from its last point. */
    function expected(op: StrokeOp, tail: readonly number[], under: HTMLCanvasElement | null) {
      const { canvas, g } = blankCanvas(SIDE, SIDE);
      if (under) g.drawImage(under, 0, 0);
      g.setTransform(FRAME.density, 0, 0, FRAME.density, 0, 0);
      paintStroke(g, op);
      if (tail.length > 0) paintStroke(g, { ...op, pts: [...op.pts.slice(-STRIDE), ...tail] }, 1);
      return canvas;
    }

    it.each<[string, StrokeOp, Rgba | null, Rgba]>([
      ["a brush's", { ...brush(), pts: SETTLED }, null, INK],
      ["an eraser's", { ...eraser(), pts: SETTLED }, RED, CLEAR],
    ])(
      "replaces %s last tail each frame, leaving the settled ink in the old one's box",
      (_, op, layerColor, stroked) => {
        const { ink, display, wet } = sheet();
        const under = layerColor ? inkRegion(ink, 1, WHOLE, layerColor) : null;
        const unstroked = layerColor ?? CLEAR;
        display.show(ONE, 1);
        display.beginStroke(op);
        display.paintStroke(0, 1);
        display.paintStroke(1, count(op));
        display.paintTail(TAIL_A);
        display.paintTail(TAIL_B);
        expect([pixel(wet, A_TIP), pixel(wet, B_TIP), pixel(wet, SETTLED_END)]).toEqual([
          unstroked,
          stroked,
          stroked,
        ]);
        expect(firstDifference(wet, expected(op, TAIL_B, under))).toBeNull();
        display.paintTail([]);
        expect(firstDifference(wet, expected(op, [], under))).toBeNull();
      },
    );
  });

  it("lets go of its own canvases and empties its host, leaving the layer's canvas to the ink", () => {
    const { ink, host, display, below, wet, above } = sheet();
    const canvas = inkRegion(ink, 1, WHOLE, RED);
    inkRegion(ink, 2, WHOLE, BLUE);
    display.show(stateOf(layer(1), layer(2)), 1);
    display.release();
    expect(host.children).toHaveLength(0);
    expect([below, wet, above].map(sizeOf)).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(sizeOf(canvas)).toEqual([SIDE, SIDE]);
  });

  it("cuts a live stroke on the current clipped layer to its base, then releases the view when moved to the bottom", () => {
    const { ink, display, group, wet } = sheet();
    inkRegion(ink, 1, LEFT, RED);
    const clipped = stateOf(layer(1), layer(2, { clipped: true }));
    display.show(clipped, 2);
    const view = group.lastElementChild;
    if (!(view instanceof HTMLCanvasElement) || view === wet)
      throw new Error("The current clipped layer has no view");
    const op = across(brush(2));
    display.beginStroke(op);
    display.paintStroke(0, count(op));
    expect([pixel(view, ON_LEFT), pixel(view, ON_RIGHT)]).toEqual([INK, CLEAR]);
    display.endStroke();
    display.show(stateOf(layer(2, { clipped: true }), layer(1)), 2);
    expect(sizeOf(view)).toEqual([0, 0]);
    expect(view.parentElement).toBeNull();
  });

  it("reveals ink clipped above a base during its brush stroke, then hides it during its eraser stroke", () => {
    const { ink, display, above } = sheet();
    inkRegion(ink, 1, LEFT, RED);
    inkRegion(ink, 2, WHOLE, BLUE);
    const clipped = stateOf(layer(1), layer(2, { clipped: true }));
    display.show(clipped, 1);
    expect(pixel(above, ON_RIGHT)).toEqual(CLEAR);

    const brushOp = across(brush(1));
    display.beginStroke(brushOp);
    display.paintStroke(0, count(brushOp));
    expect(pixel(above, ON_RIGHT)).toEqual(BLUE);
    display.endStroke();

    inkRegion(ink, 1, WHOLE, RED);
    display.show(clipped, 1);
    const eraserOp = across(eraser(1));
    display.beginStroke(eraserOp);
    display.paintStroke(0, count(eraserOp));
    expect([pixel(above, ON_LEFT), pixel(above, ON_RIGHT)]).toEqual([CLEAR, CLEAR]);
  });

  it("draws a clipped layer's own ink whole when it has no base below", () => {
    const { ink, display, group, wet } = sheet();
    const current = inkRegion(ink, 2, WHOLE, BLUE);
    display.show(stateOf(layer(2, { clipped: true }), layer(1)), 2);
    expect(group.firstElementChild).toBe(current);
    expect(group.lastElementChild).toBe(wet);
    expect(group.style.visibility).toBe("");
    expect(pixel(current, ON_RIGHT)).toEqual(BLUE);
  });

  describe("the flash as a layer is selected", () => {
    let animate: MockInstance<Element["animate"]>;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      // happy-dom's Web Animations run on their own clock; a stand-in records them instead.
      animate = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    /** Layer 1 inked across the sheet's middle and current, under layer 2 inked over `cover`; `before` counts the canvases made so far. */
    function coveredSheet(cover: Rect) {
      const parts = sheet();
      const state = stateOf(layer(1), layer(2));
      parts.ink.apply(across(brush()), state);
      inkRegion(parts.ink, 2, cover, BLUE);
      parts.display.show(state, 1);
      return { ...parts, before: madeContexts().length };
    }

    /** Every element the flash shows in the sheet. */
    const flashParts = (host: HTMLElement) => host.querySelectorAll("[class*='layer-flash']");

    it("builds nothing under reduced motion, where the chip's ring shows the current layer", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue(new ReducedMotion(true));
      const { display, host, before } = coveredSheet(RIGHT);
      display.flash();
      expect(madeContexts()).toHaveLength(before);
      expect(animate).not.toHaveBeenCalled();
      expect(flashParts(host)).toHaveLength(0);
    });

    it("builds nothing for a layer with a canvas but no ink", () => {
      const { ink, host, display } = sheet();
      // A brush with no points makes the layer's canvas, inking none of it.
      ink.apply(brush(), ONE);
      display.show(ONE, 1);
      const before = madeContexts().length;
      display.flash();
      expect(madeContexts()).toHaveLength(before);
      expect(animate).not.toHaveBeenCalled();
      expect(flashParts(host)).toHaveLength(0);
    });

    it("shows no flash when the clipped layer's base is hidden or inkless", () => {
      for (const base of [layer(1, { opacity: 0 }), layer(1)]) {
        const { ink, display, host, group } = sheet();
        const state = stateOf(base, layer(2, { clipped: true }));
        if (base.opacity === 0) inkRegion(ink, 1, LEFT, RED);
        ink.apply(across(brush(2)), state);
        display.show(state, 2);
        expect(group.style.visibility).toBe("hidden");
        display.flash();
        expect(animate).not.toHaveBeenCalled();
        expect(flashParts(host)).toHaveLength(0);
      }
    });

    it("shows no flash when a clipped layer and its base have disjoint ink", () => {
      const { ink, display, host, group } = sheet();
      const state = stateOf(layer(1), layer(2, { clipped: true }));
      inkRegion(ink, 1, LEFT, RED);
      ink.apply({ ...brush(2), pts: [14, 10, 4, 0, 17, 10, 4, 16] }, state);
      display.show(state, 2);
      expect(group.style.visibility).toBe("");
      display.flash();
      expect(animate).not.toHaveBeenCalled();
      expect(flashParts(host)).toHaveLength(0);
    });

    it.each<[string, (display: LayerDisplay) => void]>([
      ["a stroke starts", (display) => display.beginStroke(across(brush()))],
      [
        "the same layer's state changes",
        (display) => display.show(stateOf(layer(1, { opacity: 80 }), layer(2)), 1),
      ],
      ["the sheet resizes", (display) => display.resize()],
      ["the sheet closes", (display) => display.release()],
      ["it has played out", () => vi.advanceTimersByTime(FLASH_MS + GLINT_TAIL_MS)],
    ])("lets go of every canvas it made, and takes away all it showed, once %s", (_, end) => {
      const { display, host, before } = coveredSheet(RIGHT);
      display.flash();
      const made = madeContexts()
        .slice(before)
        .map(({ canvas }) => canvas);
      expect(made.length).toBeGreaterThan(0);
      expect(flashParts(host).length).toBeGreaterThan(0);
      end(display);
      expect(made.map(sizeOf)).toEqual(made.map(() => [0, 0]));
      expect(flashParts(host)).toHaveLength(0);
    });

    it("outlines the ink only where the layers above cover it", () => {
      const { display, host } = coveredSheet(RIGHT);
      display.flash();
      const outline = host.querySelector(".layer-flash__outline");
      if (!(outline instanceof HTMLCanvasElement)) throw new Error("The flash drew no outline");
      const columns = outline.width;
      const alpha = pixelsOf(outline).filter((_, i) => i % 4 === 3);
      const onLeft = alpha.filter((_, at) => at % columns < columns / 2);
      const onRight = alpha.filter((_, at) => at % columns >= columns / 2);
      expect(onLeft.every((a) => a === 0)).toBe(true);
      expect(onRight.some((a) => a > 0)).toBe(true);
    });

    it("lights only the visible ink of a clipped current layer", () => {
      const { ink, display, group } = sheet();
      const clipped = stateOf(layer(1), layer(2, { clipped: true }));
      inkRegion(ink, 1, LEFT, RED);
      ink.apply(across(brush(2)), clipped);
      inkRegion(ink, 2, WHOLE, BLUE);
      display.show(clipped, 2);
      display.flash();
      const sheen = group.querySelector(".layer-flash__sheen");
      if (!(sheen instanceof HTMLCanvasElement)) throw new Error("The flash has no sheen");
      const [left, right] = [
        { x: 2, y: 5 },
        { x: 8, y: 5 },
      ];
      expect(pixel(sheen, left)[3]).toBeGreaterThan(0);
      expect(pixel(sheen, right)[3]).toBe(0);
    });

    it("flashes a layer nothing covers without drawing from the empty side above, and outlines nothing", () => {
      const { ink, host, display, group, above } = sheet();
      ink.apply(across(brush()), ONE);
      display.show(ONE, 1);
      expect(sizeOf(above)).toEqual([0, 0]);
      display.flash();
      const drewAbove = madeContexts().some(({ calls }) =>
        calls.some(([name, source]) => name === "drawImage" && source === above),
      );
      expect(drewAbove).toBe(false);
      expect(host.querySelector(".layer-flash__outline")).toBeNull();
      expect(group.querySelector(".layer-flash__band")).not.toBeNull();
      expect(host.querySelectorAll(".layer-flash__glint").length).toBeGreaterThan(0);
    });
  });
});
