import { messageOf } from "../../i18n/errorMessage";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { isOp, type FillOp, type LayerId, type Step } from "../../sticker-creation/canvas/ops";
import { LayerInk } from "../../sticker-creation/layers/layerInk";
import { applyLayerStep, type LayerState } from "../../sticker-creation/layers/layerState";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import { releaseCanvas } from "../../ui/releaseCanvas";
import {
  changedArea,
  displayBox,
  displayPoint,
  sheetCrop,
  type DisplayView,
} from "./timelapseCrop";
import { growFrame } from "./timelapseFrame";

/** Far longer than a phone takes over a sticker's fills: only a runaway pass is given up on. */
export const PREPARE_TIMEOUT_MS = 30_000;

/** A fill's reveal: the box it changed on its layer's view, display px, and those pixels just after it. */
export interface FillSnapshot {
  box: Rect;
  /** How far from the tap the change reaches, display px: where the reveal's circle ends. */
  reach: number;
  canvas: HTMLCanvasElement;
}

export interface PrepareInput {
  /** Every step of the timelapse, in order: ops and layer steps. */
  steps: readonly Step[];
  /** The layers where it starts. */
  layers: LayerState;
  /** The sheet, in sheet units. */
  ink: { width: number; height: number };
  /** Device px per sheet unit to flood at: the density the sticker was drawn at. */
  density: number;
  /** The frame the strokes and the sticker's place make, which fills may grow. */
  frame: Rect;
  /** The display that shows a frame. */
  viewOf: (frame: Rect) => DisplayView;
}

export interface PrepareControl {
  now: () => number;
  /** The player stopped: the pass lets go of what it made and answers null. */
  stopped: () => boolean;
  /** Lets the page paint and take input before each fill. */
  yieldToPage?: () => Promise<void>;
}

/** Final bounds and one borrowed snapshot, released before advancing to another fill. */
export interface PreparedFills {
  frame: Rect;
  next: (index: number) => Promise<FillSnapshot | null>;
  release: () => void;
  dispose: () => void;
}

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function blankCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** The box's pixels, on a canvas of their own. */
function cut(from: HTMLCanvasElement, box: Rect): HTMLCanvasElement {
  const canvas = blankCanvas(box.w, box.h);
  try {
    context2d(canvas).drawImage(from, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    return canvas;
  } catch (error) {
    releaseCanvas(canvas);
    throw error;
  }
}

/** Measures fill bounds, then advances a fresh layered sheet only as playback requests fills. */
export async function prepareFillSnapshots(
  input: PrepareInput,
  control: PrepareControl,
): Promise<PreparedFills | null> {
  const { steps, layers, ink, density, viewOf } = input;
  const fills = steps.filter((step) => step.tool === "fill").length;
  const lastFill = steps.findLastIndex((step) => step.tool === "fill");
  const started = control.now();
  let frame = input.frame;
  let disposed = false;
  const cancelled = () => disposed || control.stopped();
  const check = (since: number, nth: number) => {
    if (cancelled()) return false;
    if (control.now() - since > PREPARE_TIMEOUT_MS)
      throw new Error(
        `Preparing the timelapse's fills took over ${PREPARE_TIMEOUT_MS / 1000} s, so it stopped before fill ${nth} of ${fills}`,
      );
    return true;
  };
  const pause = async (since: number, nth: number) => {
    await (control.yieldToPage ?? nextTask)();
    return check(since, nth);
  };
  const failed = (error: unknown, step: Step, index: number, nth: number) => {
    const which =
      step.tool === "fill"
        ? `fill ${nth} of ${fills}`
        : `${isOp(step) ? "stroke" : "layer change"}, step ${index + 1} of ${steps.length},`;
    return new Error(`Preparing the timelapse's ${which} failed: ${messageOf(error)}`, {
      cause: error,
    });
  };
  const sheet = new LayerInk();
  const flood = (op: FillOp, state: LayerState) => {
    try {
      return sheet.flood(op, state);
    } finally {
      // The recording keeps op alive. Preparation never needs its undo replay data.
      sheet.releaseFill(op);
    }
  };
  const units = (box: Rect): Rect => ({
    x: box.x / density,
    y: box.y / density,
    w: box.w / density,
    h: box.h / density,
  });
  let state = layers;
  let nth = 0;
  try {
    sheet.setFrame({ w: ink.width, h: ink.height, density });
    for (let i = 0; i <= lastFill; i++) {
      const step = steps[i];
      if (step.tool === "fill") nth++;
      if ((step.tool === "fill" || i % 64 === 63) && !(await pause(started, nth))) return null;
      if (!check(started, nth)) return null;
      try {
        if (step.tool === "fill") {
          const box = flood(step, state);
          if (box) frame = growFrame(frame, units(box), ink);
        } else {
          sheet.apply(step, state);
          if (!isOp(step)) state = applyLayerStep(state, step);
        }
      } catch (error) {
        throw failed(error, step, i, nth);
      }
    }
    if (!check(started, nth)) return null;
  } finally {
    sheet.releaseAll();
  }

  // Only this second, sequential pass owns display reads and the active changed-area canvas.
  const view = viewOf(frame);
  let before: HTMLCanvasElement | null = null;
  let after: HTMLCanvasElement | null = null;
  let active: FillSnapshot | null = null;
  let activeIndex = -1;
  let through = -1;
  let busy = false;
  state = layers;
  nth = 0;
  const release = () => {
    if (active) releaseCanvas(active.canvas);
    active = null;
    activeIndex = -1;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    release();
    sheet.releaseAll();
    if (before) releaseCanvas(before);
    if (after) releaseCanvas(after);
  };
  try {
    sheet.setFrame({ w: ink.width, h: ink.height, density });
    before = blankCanvas(view.width, view.height);
    after = blankCanvas(view.width, view.height);
    let readBefore = context2d(before, { willReadFrequently: true });
    let readAfter = context2d(after, { willReadFrequently: true });
    let current: LayerId | null = null;
    const crop = sheetCrop(
      view.origin,
      { width: sheet.width, height: sheet.height, density },
      view,
    );
    const cropInto = (g: CanvasRenderingContext2D, layer: LayerId) => {
      g.clearRect(0, 0, view.width, view.height);
      const pixels = sheet.layerCanvas(layer);
      if (!crop || !pixels) return;
      const { source: s, target: t } = crop;
      g.drawImage(pixels, s.x, s.y, s.w, s.h, t.x, t.y, t.w, t.h);
    };
    const read = (g: CanvasRenderingContext2D, box: Rect) =>
      g.getImageData(box.x, box.y, box.w, box.h);
    return {
      frame,
      release,
      dispose,
      async next(index) {
        if (cancelled()) {
          dispose();
          return null;
        }
        if (busy) throw new Error("A fill is already being prepared");
        if (activeIndex === index) return active;
        if (active) throw new Error("Release the active fill before requesting another");
        if (!Number.isInteger(index) || index <= through || steps[index]?.tool !== "fill")
          throw new Error(`Fill indexes must increase and name a fill: ${index}`);
        busy = true;
        const since = control.now();
        try {
          for (let i = through + 1; i <= index; i++) {
            const step = steps[i];
            if (step.tool === "fill") nth++;
            if ((step.tool === "fill" || i % 64 === 63) && !(await pause(since, nth))) {
              dispose();
              return null;
            }
            if (!check(since, nth)) {
              dispose();
              return null;
            }
            try {
              if (step.tool !== "fill") {
                sheet.apply(step, state);
                if (!isOp(step)) state = applyLayerStep(state, step);
                if (step.layer === current || (step.tool === "merge" && step.into === current))
                  current = null;
              } else {
                if (i === index && current !== step.layer) cropInto(readBefore, step.layer);
                const box = flood(step, state);
                if (i !== index) {
                  current = null;
                  continue;
                }
                current = step.layer;
                const area = box && displayBox(view, units(box));
                if (area) {
                  cropInto(readAfter, step.layer);
                  const tap = displayPoint(view.origin, view.scale, step);
                  const changed = changedArea(read(readBefore, area), read(readAfter, area), {
                    x: tap.x - area.x,
                    y: tap.y - area.y,
                  });
                  if (changed) {
                    const on = {
                      ...changed.box,
                      x: changed.box.x + area.x,
                      y: changed.box.y + area.y,
                    };
                    active = { box: on, reach: changed.reach, canvas: cut(readAfter.canvas, on) };
                    activeIndex = index;
                  }
                  [readBefore, readAfter] = [readAfter, readBefore];
                }
              }
            } catch (error) {
              throw failed(error, step, i, nth);
            }
          }
          through = index;
          if (!check(since, nth)) {
            dispose();
            return null;
          }
          return active;
        } catch (error) {
          dispose();
          throw error;
        } finally {
          busy = false;
        }
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
