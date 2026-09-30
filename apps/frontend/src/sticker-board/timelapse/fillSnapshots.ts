/**
 * The prepare pass. A fill floods whatever pixels are there, at the density it was drawn at, and
 * can read and write the whole sheet, too slow for playback. So each fill floods once, beforehand,
 * on a full sheet at that density, and what it changed in the display canvas is kept to reveal.
 */
import { context2d } from "../../sticker-creation/canvas/context2d";
import { InkSurface } from "../../sticker-creation/canvas/inkSurface";
import type { Op } from "../../sticker-creation/canvas/ops";
import type { Rect } from "../../sticker-creation/sealing/stickerLayers";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { changedArea, displayPoint, sheetCrop, type DisplayCanvas } from "./timelapseCrop";

/** Far longer than a phone takes over a sticker's fills: only a runaway pass is given up on. */
export const PREPARE_TIMEOUT_MS = 30_000;

/** A fill's reveal: the box it changed in the display canvas, px, and those pixels just after it. */
export interface FillSnapshot {
  box: Rect;
  /** How far from the tap the change reaches, display px: where the reveal's circle ends. */
  reach: number;
  canvas: HTMLCanvasElement;
}

export interface PrepareInput {
  ops: readonly Op[];
  /** The sheet, sheet px. */
  ink: { width: number; height: number };
  /** Where the sticker's image sits on the sheet, sheet px. */
  place: Rect;
  /** Device px per sheet px to flood at: the density the sticker was drawn at. */
  density: number;
  display: DisplayCanvas;
}

export interface PrepareControl {
  now: () => number;
  /** The player stopped: the pass lets go of what it made and answers null. */
  stopped: () => boolean;
  /** Lets the page paint and take input before each fill. */
  yieldToPage?: () => Promise<void>;
}

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
 * Each fill's snapshot, by its op's index; a fill that changed nothing on the display has none.
 * Null when the player stopped first. Rejects naming the fill that failed.
 */
export async function prepareFillSnapshots(
  input: PrepareInput,
  control: PrepareControl,
): Promise<Map<number, FillSnapshot> | null> {
  const { ops, ink, place, density, display } = input;
  const fills = ops.filter((op) => op.tool === "fill").length;
  const lastFill = ops.findLastIndex((op) => op.tool === "fill");
  const snapshots = new Map<number, FillSnapshot>();
  const letGoOfSnapshots = () => {
    snapshots.forEach((snapshot) => releaseCanvas(snapshot.canvas));
    snapshots.clear();
  };
  const sheetCanvas = blankCanvas(1, 1);
  const before = blankCanvas(display.width, display.height);
  const after = blankCanvas(display.width, display.height);
  const started = control.now();
  let nth = 0;
  try {
    const sheet = new InkSurface(sheetCanvas);
    sheet.resize(ink.width, ink.height, density);
    const crop = sheetCrop(
      place,
      { width: sheetCanvas.width, height: sheetCanvas.height, density: sheet.density },
      display,
    );
    const readBefore = context2d(before, { willReadFrequently: true });
    const readAfter = context2d(after, { willReadFrequently: true });
    const cropInto = (g: CanvasRenderingContext2D) => {
      g.clearRect(0, 0, display.width, display.height);
      if (!crop) return;
      const { source: s, target: t } = crop;
      g.drawImage(sheetCanvas, s.x, s.y, s.w, s.h, t.x, t.y, t.w, t.h);
    };
    const read = (g: CanvasRenderingContext2D) =>
      g.getImageData(0, 0, display.width, display.height);

    for (let i = 0; i <= lastFill; i++) {
      const op = ops[i];
      if (op.tool === "fill") {
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
        if (op.tool !== "fill") {
          sheet.apply(op);
          continue;
        }
        cropInto(readBefore);
        sheet.apply(op);
        cropInto(readAfter);
        const tap = displayPoint(place, display.scale, op);
        const changed = changedArea(read(readBefore), read(readAfter), tap);
        if (changed) snapshots.set(i, { ...changed, canvas: cut(after, changed.box) });
      } catch (error) {
        const which =
          op.tool === "fill" ? `fill ${nth} of ${fills}` : `stroke, op ${i + 1} of ${ops.length},`;
        throw new Error(`Preparing the timelapse's ${which} failed: ${messageOf(error)}`, {
          cause: error,
        });
      }
    }
    return snapshots;
  } catch (error) {
    letGoOfSnapshots();
    throw error;
  } finally {
    [sheetCanvas, before, after].forEach(releaseCanvas);
  }
}
