/**
 * Where a timelapse plays: the part of the sheet that was drawn on (its frame), and where that sits
 * on the detail's stage while it plays and once the sticker is back in its spot. Pure numbers.
 */
import { STRIDE, type Step } from "../../sticker-creation/canvas/ops";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import { clamp } from "../../ui/easing";

/** Paper kept around the outermost marks, in sheet units, so none runs to the frame's edge. */
export const FRAME_MARGIN = 20;
/** Liner kept between the paper and the stage's edges, CSS px, where the figure leaves it spare. */
export const STAGE_INSET = 6;

type Size = { width: number; height: number };
type Edges = { x0: number; y0: number; x1: number; y1: number };

/** Where the sheet sits on the stage: sheet point (x, y) lands at (left + x·scale, top + y·scale), CSS px. */
export interface Placement {
  left: number;
  top: number;
  scale: number;
}

export interface TimelapseLayout {
  /** The part of the sheet that was drawn on, in sheet units: the paper that plays. */
  frame: Rect;
  /** The sheet while it plays. */
  playing: Placement;
  /** The sheet with the sticker's place over its figure, as when the sticker is in its spot. */
  inSpot: Placement;
}

/** A translate then scale about the figure's top left, CSS px: its spot onto the playing sheet. */
export interface FigureTransform {
  x: number;
  y: number;
  scale: number;
}

const edgesOf = ({ x, y, w, h }: Rect): Edges => ({ x0: x, y0: y, x1: x + w, y1: y + h });
const rectOf = ({ x0, y0, x1, y1 }: Edges): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
const join = (a: Edges, b: Edges): Edges => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

/** Marks' edges grown by FRAME_MARGIN and kept on the sheet. */
const onSheet = ({ x0, y0, x1, y1 }: Edges, sheet: Size): Edges => ({
  x0: Math.max(0, x0 - FRAME_MARGIN),
  y0: Math.max(0, y0 - FRAME_MARGIN),
  x1: Math.min(sheet.width, x1 + FRAME_MARGIN),
  y1: Math.min(sheet.height, y1 + FRAME_MARGIN),
});

/**
 * The frame of every brush stroke on every layer, each point grown by half its width, and the
 * sticker's place, which it always holds whole: the die-cut can reach past the sheet. A layer deleted
 * later still plays its strokes, so they count; eraser strokes show nothing on bare paper, so they don't.
 */
export function strokeFrame(steps: readonly Step[], place: Rect, sheet: Size): Rect {
  const marks: Edges = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const step of steps) {
    if (step.tool !== "brush") continue;
    const { pts } = step;
    for (let i = 0; i + STRIDE <= pts.length; i += STRIDE) {
      const r = pts[i + 2] / 2;
      marks.x0 = Math.min(marks.x0, pts[i] - r);
      marks.y0 = Math.min(marks.y0, pts[i + 1] - r);
      marks.x1 = Math.max(marks.x1, pts[i] + r);
      marks.y1 = Math.max(marks.y1, pts[i + 1] + r);
    }
  }
  const held = edgesOf(place);
  return rectOf(marks.x0 <= marks.x1 ? join(onSheet(marks, sheet), held) : held);
}

/** `frame` grown to take in `box`, such as what a fill changed, in sheet units. */
export const growFrame = (frame: Rect, box: Rect, sheet: Size): Rect =>
  rectOf(join(edgesOf(frame), onSheet(edgesOf(box), sheet)));

/**
 * Where the frame plays on the stage: at the sticker's own scale when it fits, otherwise shrunk to
 * fit, with the sticker's place as near its spot as the stage allows. `figure` is the sticker's box
 * on the stage, CSS px.
 */
export function layoutFor({
  frame,
  place,
  stage,
  figure,
}: {
  frame: Rect;
  place: Rect;
  stage: Size;
  figure: Rect;
}): TimelapseLayout {
  const own = figure.w / place.w;
  const inSpot = { left: figure.x - place.x * own, top: figure.y - place.y * own, scale: own };
  const room = {
    x0: Math.min(STAGE_INSET, figure.x),
    y0: Math.min(STAGE_INSET, figure.y),
    x1: Math.max(stage.width - STAGE_INSET, figure.x + figure.w),
    y1: Math.max(stage.height - STAGE_INSET, figure.y + figure.h),
  };
  const scale = Math.min(own, (room.x1 - room.x0) / frame.w, (room.y1 - room.y0) / frame.h);
  // Along each axis: the place's middle over the figure's, unless that puts the frame off the room.
  const along = (
    start: number,
    length: number,
    mid: number,
    figureMid: number,
    lo: number,
    hi: number,
  ) => clamp(figureMid - mid * scale, lo - start * scale, hi - (start + length) * scale);
  const left = along(
    frame.x,
    frame.w,
    place.x + place.w / 2,
    figure.x + figure.w / 2,
    room.x0,
    room.x1,
  );
  const top = along(
    frame.y,
    frame.h,
    place.y + place.h / 2,
    figure.y + figure.h / 2,
    room.y0,
    room.y1,
  );
  // Within a pixel of its spot at its own size, it plays in its spot, so the sticker never twitches.
  const stays = scale === own && Math.abs(left - inSpot.left) < 1 && Math.abs(top - inSpot.top) < 1;
  return { frame, inSpot, playing: stays ? inSpot : { left, top, scale } };
}

/** The figure's transform onto its place on the playing sheet; identity when it plays in its spot. */
export function figureTransform(
  { playing, inSpot }: TimelapseLayout,
  place: Rect,
  figure: Rect,
): FigureTransform {
  return {
    x: playing.left + place.x * playing.scale - figure.x,
    y: playing.top + place.y * playing.scale - figure.y,
    scale: playing.scale / inSpot.scale,
  };
}

/** Whether the sticker plays in its spot, with nowhere to fly. */
export const playsInSpot = ({ playing, inSpot }: TimelapseLayout) => playing === inSpot;
