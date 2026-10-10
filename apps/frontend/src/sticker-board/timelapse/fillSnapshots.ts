/**
 * The prepare pass. A fill finds its region on what every visible layer shows, at the density it was
 * drawn at, and can read and write the whole sheet, too slow for playback. So every step plays once,
 * beforehand, on full sheets at that density, and what each fill changed on its own layer's view is
 * kept to reveal there. A fill can reach past the frame its strokes make, which is known only once it
 * floods: the frame then grows, and the pass runs again in it.
 */
import { messageOf } from "../../i18n/errorMessage";
import { context2d } from "../../sticker-creation/canvas/context2d";
import { isOp, type LayerId, type Step } from "../../sticker-creation/canvas/ops";
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

/** The frame every fill fits in, each fill's snapshot by its step's index, and how many passes it took. */
export interface Prepared {
  frame: Rect;
  snapshots: Map<number, FillSnapshot>;
  passes: number;
}

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const sameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

function blankCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** The box's pixels, on a canvas of their own. */
function cut(from: HTMLCanvasElement, box: Rect): HTMLCanvasElement {
  const canvas = blankCanvas(box.w, box.h);
  context2d(canvas).drawImage(from, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return canvas;
}

/**
 * Each fill's snapshot in the frame every fill fits in; a fill that changed nothing on the display has
 * none. Null when the player stopped first. Rejects naming the step that failed.
 */
export async function prepareFillSnapshots(
  input: PrepareInput,
  control: PrepareControl,
): Promise<Prepared | null> {
  const started = control.now();
  const first = await preparePass(input, input.frame, control, started);
  if (!first || first.grown === null)
    return first && { snapshots: first.snapshots, frame: input.frame, passes: 1 };
  const second = await preparePass(input, first.grown, control, started);
  if (!second) return null;
  if (second.grown !== null) {
    second.snapshots.forEach((snapshot) => releaseCanvas(snapshot.canvas));
    throw new Error("A fill reached past the frame its own first flood measured");
  }
  return { snapshots: second.snapshots, frame: first.grown, passes: 2 };
}

/**
 * One pass in `frame`. Once a fill reaches past it, the pass only floods on, to grow the frame by
 * every fill, and answers the grown frame with no snapshots.
 */
async function preparePass(
  { steps, layers, ink, density, viewOf }: PrepareInput,
  frame: Rect,
  control: PrepareControl,
  started: number,
): Promise<{ snapshots: Map<number, FillSnapshot>; grown: Rect | null } | null> {
  const fills = steps.filter((step) => step.tool === "fill").length;
  const lastFill = steps.findLastIndex((step) => step.tool === "fill");
  const view = viewOf(frame);
  const snapshots = new Map<number, FillSnapshot>();
  const letGoOfSnapshots = () => {
    snapshots.forEach((snapshot) => releaseCanvas(snapshot.canvas));
    snapshots.clear();
  };
  const sheet = new LayerInk();
  const before = blankCanvas(view.width, view.height);
  const after = blankCanvas(view.width, view.height);
  let grown: Rect | null = null;
  let nth = 0;
  try {
    sheet.setFrame({ w: ink.width, h: ink.height, density });
    const crop = sheetCrop(
      view.origin,
      { width: sheet.width, height: sheet.height, density: sheet.density },
      view,
    );
    // A layer's view before and after each fill on it. One fill's view after is the next one's
    // before, unless a step on that layer lands between them, so a run of fills on one layer reads
    // it once each.
    let readBefore = context2d(before, { willReadFrequently: true });
    let readAfter = context2d(after, { willReadFrequently: true });
    /** The layer whose view `readBefore` holds as the layer is now. */
    let current: LayerId | null = null;
    const cropInto = (g: CanvasRenderingContext2D, layer: LayerId) => {
      g.clearRect(0, 0, view.width, view.height);
      const pixels = sheet.layerCanvas(layer);
      if (!crop || !pixels) return;
      const { source: s, target: t } = crop;
      g.drawImage(pixels, s.x, s.y, s.w, s.h, t.x, t.y, t.w, t.h);
    };
    const read = (g: CanvasRenderingContext2D, box: Rect) =>
      g.getImageData(box.x, box.y, box.w, box.h);

    let state = layers;
    for (let i = 0; i <= lastFill; i++) {
      const step = steps[i];
      if (step.tool === "fill") {
        nth++;
        await (control.yieldToPage ?? nextTask)();
        if (control.stopped()) {
          letGoOfSnapshots();
          return null;
        }
        if (control.now() - started > PREPARE_TIMEOUT_MS) {
          throw new Error(
            `Preparing the timelapse's fills took over ${PREPARE_TIMEOUT_MS / 1000} s, so it stopped before fill ${nth} of ${fills}`,
          );
        }
      }
      try {
        if (step.tool !== "fill") {
          sheet.apply(step, state);
          if (!isOp(step)) state = applyLayerStep(state, step);
          if (step.layer === current) current = null;
          continue;
        }
        if (!grown && current !== step.layer) cropInto(readBefore, step.layer);
        current = grown ? null : step.layer;
        const flooded = sheet.flood(step, state);
        if (!flooded) continue;
        const d = sheet.density;
        const box = { x: flooded.x / d, y: flooded.y / d, w: flooded.w / d, h: flooded.h / d };
        const reaching = growFrame(grown ?? frame, box, ink);
        if (!sameRect(reaching, grown ?? frame)) grown = reaching;
        // Snapshots cut in a frame that grew would sit wrong in the grown one.
        if (grown) {
          letGoOfSnapshots();
          continue;
        }
        const area = displayBox(view, box);
        if (!area) continue;
        cropInto(readAfter, step.layer);
        const tap = displayPoint(view.origin, view.scale, step);
        const changed = changedArea(read(readBefore, area), read(readAfter, area), {
          x: tap.x - area.x,
          y: tap.y - area.y,
        });
        if (changed) {
          const on = { ...changed.box, x: changed.box.x + area.x, y: changed.box.y + area.y };
          snapshots.set(i, { box: on, reach: changed.reach, canvas: cut(readAfter.canvas, on) });
        }
        [readBefore, readAfter] = [readAfter, readBefore];
      } catch (error) {
        const which =
          step.tool === "fill"
            ? `fill ${nth} of ${fills}`
            : `${isOp(step) ? "stroke" : "layer change"}, step ${i + 1} of ${steps.length},`;
        throw new Error(`Preparing the timelapse's ${which} failed: ${messageOf(error)}`, {
          cause: error,
        });
      }
    }
    return { snapshots, grown };
  } catch (error) {
    letGoOfSnapshots();
    throw error;
  } finally {
    sheet.releaseAll();
    [before, after].forEach(releaseCanvas);
  }
}
