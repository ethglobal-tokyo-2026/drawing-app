/**
 * Where a timelapse's ink lands on the display: the density it was drawn at, the window of the full
 * sheet the display shows, and what a fill changed there. Pure numbers and pixel arrays.
 */
import type { Pixels } from "../../sticker-creation/canvas/fill";
import { MAX_DPR } from "../../sticker-creation/canvas/sheetFrame";
import type { DecodedTimelapse } from "../../sticker-creation/sealing/timelapse";
import type { Rect } from "../../sticker-creation/sealing/stickerPasses";
import type { Placement } from "./timelapseFrame";

/**
 * Device pixels per sheet unit where the sticker was drawn, which its fills flood at, kept up to the
 * densest any sheet that size was backed at, so a replay floods as the drawing did.
 */
export function drawingDensity(timelapse: Pick<DecodedTimelapse, "density" | "ink">): number {
  // Existing stickers used the earlier sheet limit. Their fills must keep that raster density,
  // even though new and resumed drawings use a smaller backing canvas.
  const recordedPixelLimit = 4_200_000;
  const most =
    Math.floor(
      Math.sqrt(recordedPixelLimit / (timelapse.ink.width * timelapse.ink.height)) * 1000,
    ) / 1000;
  return Math.min(timelapse.density, Math.max(MAX_DPR, most));
}

/** The full sheet as its canvas holds it: device px, and device px per sheet unit. */
interface SheetCanvas {
  width: number;
  height: number;
  density: number;
}

/** The display canvas: px, px per sheet unit, and the sheet point at its top left. */
export interface DisplayView {
  width: number;
  height: number;
  scale: number;
  origin: { x: number; y: number };
}

/** The display canvas over the stage, at `density` px per CSS px, showing the sheet where `at` puts it. */
export const displayView = (
  stage: { width: number; height: number },
  at: Placement,
  density: number,
): DisplayView => ({
  width: Math.max(1, Math.round(stage.width * density)),
  height: Math.max(1, Math.round(stage.height * density)),
  scale: at.scale * density,
  origin: { x: -at.left / at.scale, y: -at.top / at.scale },
});

/**
 * The window of the sheet's canvas the display shows from `origin`, and where it lands, clipped to the
 * sheet: older Safari draws nothing for a source rectangle reaching past its image. Null off the sheet.
 */
export function sheetCrop(
  origin: { x: number; y: number },
  sheet: SheetCanvas,
  display: Pick<DisplayView, "width" | "height" | "scale">,
): { source: Rect; target: Rect } | null {
  const perSheetPixel = display.scale / sheet.density;
  const x0 = origin.x * sheet.density;
  const y0 = origin.y * sheet.density;
  const left = Math.max(0, x0);
  const top = Math.max(0, y0);
  const right = Math.min(sheet.width, x0 + display.width / perSheetPixel);
  const bottom = Math.min(sheet.height, y0 + display.height / perSheetPixel);
  if (right <= left || bottom <= top) return null;
  return {
    source: { x: left, y: top, w: right - left, h: bottom - top },
    target: {
      x: (left - x0) * perSheetPixel,
      y: (top - y0) * perSheetPixel,
      w: (right - left) * perSheetPixel,
      h: (bottom - top) * perSheetPixel,
    },
  };
}

/** A point of the sheet on the display, px, where the crop from `origin` at `scale` puts it. */
export const displayPoint = (
  origin: { x: number; y: number },
  scale: number,
  point: { x: number; y: number },
) => ({ x: (point.x - origin.x) * scale, y: (point.y - origin.y) * scale });

/**
 * A box of the sheet on the display, px, grown a pixel for what scaling spreads and clipped to the
 * display; null off it.
 */
export function displayBox(view: DisplayView, box: Rect): Rect | null {
  const from = displayPoint(view.origin, view.scale, box);
  const to = displayPoint(view.origin, view.scale, { x: box.x + box.w, y: box.y + box.h });
  const x0 = Math.max(0, Math.floor(from.x) - 1);
  const y0 = Math.max(0, Math.floor(from.y) - 1);
  const x1 = Math.min(view.width, Math.ceil(to.x) + 1);
  const y1 = Math.min(view.height, Math.ceil(to.y) + 1);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/**
 * What a fill changed between two same-sized images: the box around every pixel that differs, and
 * how far from `tap` the farthest of them reaches, to its far corner. Null when nothing differs.
 */
export function changedArea(
  before: Pixels,
  after: Pixels,
  tap: { x: number; y: number },
): { box: Rect; reach: number } | null {
  const { width, height } = after;
  const a = pixelWords(before);
  const b = pixelWords(after);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  let farthest = 0;
  const reachTo = (x: number, y: number) => {
    const dx = Math.max(Math.abs(x - tap.x), Math.abs(x + 1 - tap.x));
    const dy = Math.max(Math.abs(y - tap.y), Math.abs(y + 1 - tap.y));
    farthest = Math.max(farthest, dx * dx + dy * dy);
  };
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x++) {
      if (a[row + x] === b[row + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first < 0) continue;
    x0 = Math.min(x0, first);
    x1 = Math.max(x1, last);
    y0 = Math.min(y0, y);
    y1 = y;
    // A row's changed pixel farthest from the tap is one of its two outermost.
    reachTo(first, y);
    reachTo(last, y);
  }
  if (x1 < 0) return null;
  return { box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, reach: Math.sqrt(farthest) };
}

/** An image's pixels as one number each, to compare whole pixels at once. */
function pixelWords({ data, width, height }: Pixels): Uint32Array {
  const aligned = data.byteOffset % 4 === 0 ? data : data.slice();
  return new Uint32Array(aligned.buffer, aligned.byteOffset, width * height);
}

/**
 * How far a fill's reveal has spread from its tap, `progress` of the way to what the fill reached,
 * easing out. Reaching the fill's own farthest pixel, a round region fills over the whole beat.
 */
export const revealRadius = (reach: number, progress: number) => reach * (1 - (1 - progress) ** 3);
