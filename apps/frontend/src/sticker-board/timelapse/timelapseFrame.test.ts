import { describe, expect, it } from "vitest";
import type { Op } from "../../sticker-creation/canvas/ops";
import { addLayer, deleteLayer } from "../../sticker-creation/layers/testLayerSteps";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import {
  FRAME_MARGIN,
  STAGE_INSET,
  figureTransform,
  growFrame,
  layoutFor,
  playsInSpot,
  strokeFrame,
  type Placement,
} from "./timelapseFrame";

const sheet = { width: 374, height: 822 };
const place: Rect = { x: 60, y: 300, w: 280, h: 260 };

/** A stroke through these points, `width` units wide throughout. */
const stroke = (tool: "brush" | "eraser", width: number, ...points: [number, number][]): Op => ({
  tool,
  layer: 1,
  color: "#000000",
  T: 0,
  pts: points.flatMap(([x, y], i) => [x, y, width, i * 16]),
});

/** Where a box of the sheet lands on the stage. */
const landing = ({ left, top, scale }: Placement, r: Rect): Rect => ({
  x: left + r.x * scale,
  y: top + r.y * scale,
  w: r.w * scale,
  h: r.h * scale,
});

const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x - 1e-9 &&
  inner.y >= outer.y - 1e-9 &&
  inner.x + inner.w <= outer.x + outer.w + 1e-9 &&
  inner.y + inner.h <= outer.y + outer.h + 1e-9;

describe("the frame", () => {
  it("is the sticker's place when every mark stays well inside it", () => {
    const ops = [stroke("brush", 8, [150, 400], [250, 450])];
    expect(strokeFrame(ops, place, sheet)).toEqual(place);
  });

  it("takes in a brush stroke outside the cut on any layer, a deleted one's too, by half its width and the margin", () => {
    const outside = { ...stroke("brush", 8, [200, 100], [210, 120]), layer: 2 };
    const frame = strokeFrame([addLayer(2, 1), outside, deleteLayer(2)], place, sheet);
    expect(frame.y).toBe(100 - 4 - FRAME_MARGIN);
    expect(frame.y + frame.h).toBe(place.y + place.h);
  });

  it("leaves out eraser strokes, which show nothing on bare paper", () => {
    const ops = [stroke("eraser", 40, [20, 20], [350, 800])];
    expect(strokeFrame(ops, place, sheet)).toEqual(place);
  });

  it("stays on the sheet, but always holds the whole place", () => {
    const pastTheEdge: Rect = { x: -12, y: 300, w: 280, h: 260 };
    const ops = [stroke("brush", 20, [370, 818])];
    const frame = strokeFrame(ops, pastTheEdge, sheet);
    expect(frame.x).toBe(pastTheEdge.x);
    expect(frame.x + frame.w).toBe(sheet.width);
    expect(frame.y + frame.h).toBe(sheet.height);
  });

  it("grows to take in a fill that reached past it, and only then", () => {
    const frame = strokeFrame([], place, sheet);
    expect(growFrame(frame, { x: 100, y: 350, w: 50, h: 50 }, sheet)).toEqual(frame);
    const grown = growFrame(frame, { x: 0, y: 0, w: sheet.width, h: sheet.height }, sheet);
    expect(grown).toEqual({ x: 0, y: 0, w: sheet.width, h: sheet.height });
  });
});

describe("the layout on the stage", () => {
  const stage = { width: 304, height: 240 };
  const own = 216 / place.w;
  const figure: Rect = { x: 44, y: 12, w: 216, h: place.h * own };
  const room: Rect = {
    x: STAGE_INSET,
    y: Math.min(STAGE_INSET, figure.y),
    w: stage.width - 2 * STAGE_INSET,
    h: stage.height - 2 * Math.min(STAGE_INSET, figure.y),
  };

  it("plays a sticker drawn within its spot right there, at its own size", () => {
    const layout = layoutFor({ frame: place, place, stage, figure });
    expect(playsInSpot(layout)).toBe(true);
    expect(landing(layout.playing, place)).toEqual(figure);
    expect(figureTransform(layout, place, figure)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("keeps the sticker in its spot when the marks beside it fit the stage at its own size", () => {
    const frame = { ...place, x: place.x - 30, w: place.w + 30 };
    const layout = layoutFor({ frame, place, stage, figure });
    expect(playsInSpot(layout)).toBe(true);
    expect(inside(landing(layout.playing, frame), room)).toBe(true);
  });

  it("slides the sheet at the sticker's own size only as far as the stage needs", () => {
    const frame = { ...place, w: place.w + 60 };
    const layout = layoutFor({ frame, place, stage, figure });
    expect(layout.playing.scale).toBe(own);
    const shown = landing(layout.playing, frame);
    expect(shown.x + shown.w).toBeCloseTo(room.x + room.w);
    expect(inside(shown, room)).toBe(true);
  });

  it("shrinks a sheet drawn on top to bottom until it fits, never past its own size", () => {
    const frame = { x: 30, y: 70, w: 330, h: 680 };
    const layout = layoutFor({ frame, place, stage, figure });
    expect(layout.playing.scale).toBeLessThan(own);
    const shown = landing(layout.playing, frame);
    expect(shown.h).toBeCloseTo(room.h);
    expect(inside(shown, room)).toBe(true);
  });

  it("moves the figure from its spot exactly onto its place on the playing sheet", () => {
    const frame = { x: 30, y: 70, w: 330, h: 680 };
    const layout = layoutFor({ frame, place, stage, figure });
    const { x, y, scale } = figureTransform(layout, place, figure);
    const moved = { x: figure.x + x, y: figure.y + y, w: figure.w * scale, h: figure.h * scale };
    const target = landing(layout.playing, place);
    for (const key of ["x", "y", "w", "h"] as const) expect(moved[key]).toBeCloseTo(target[key]);
  });
});
