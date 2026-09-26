import { context2d } from "../../sticker-creation/canvas/context2d";
import type { StickerRecord } from "../../stickers/stickerStorage";
import type { StickerUrls } from "../../stickers/stickerUrls";
import { boxShape, outlineShape, shapeFromMask, type Shape } from "./sheetPacking";

/** A traced mask's long side, in cells: fine enough for a sticker sheet, quick to trace. */
const TRACE_SIDE = 120;
/** Even a tiny or very long sticker gets this many cells across. */
const TRACE_MIN = 8;
/** The alpha at which a mask cell counts as inside the cut. */
const INSIDE = 128;

type ShapeSource = Pick<StickerRecord, "id" | "no" | "width" | "height" | "outline">;

// By sticker: a sealed sticker's cut never changes.
const known = new Map<string, Shape>();
const tracing = new Map<string, Promise<Shape>>();

/** A sticker's shape if it's known now: a stored outline always is, and a mask once it's traced. */
export function knownShape(sticker: ShapeSource): Shape | undefined {
  let shape = known.get(sticker.id);
  if (!shape && sticker.outline !== undefined) {
    shape = outlineShape(sticker.outline, sticker.width, sticker.height);
    if (shape.poly.length < 3)
      console.error(`No.${sticker.no}'s stored cut line is unreadable, so its sheet packs its box`);
    known.set(sticker.id, shape);
  }
  return shape;
}

/** A sticker's shape: its stored outline, or else its mask, traced once. */
export function stickerShape(
  sticker: ShapeSource,
  urls: Pick<StickerUrls, "png" | "mask">,
): Promise<Shape> {
  const shape = knownShape(sticker);
  if (shape) return Promise.resolve(shape);
  let trace = tracing.get(sticker.id);
  if (!trace) {
    trace = traceMask(urls.mask ?? urls.png, sticker.width, sticker.height).then(
      (traced) => {
        known.set(sticker.id, traced);
        tracing.delete(sticker.id);
        return traced;
      },
      (error: unknown) => {
        // Not kept, so the next call tries again.
        tracing.delete(sticker.id);
        console.error(`Tracing No.${sticker.no}'s cut failed, so its sheet packs its box`, error);
        return boxShape(sticker.width, sticker.height);
      },
    );
    tracing.set(sticker.id, trace);
  }
  return trace;
}

async function traceMask(url: string, width: number, height: number): Promise<Shape> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const k = TRACE_SIDE / Math.max(width, height);
  const cols = Math.max(TRACE_MIN, Math.round(width * k));
  const rows = Math.max(TRACE_MIN, Math.round(height * k));
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  try {
    const g = context2d(canvas, { willReadFrequently: true });
    g.drawImage(image, 0, 0, cols, rows);
    const alpha = g.getImageData(0, 0, cols, rows).data;
    const bits = new Uint8Array(cols * rows);
    for (let i = 0; i < bits.length; i++) bits[i] = alpha[i * 4 + 3] >= INSIDE ? 1 : 0;
    return shapeFromMask(bits, cols, rows, width, height);
  } finally {
    // iOS counts canvases against a small budget until they're collected.
    canvas.width = 0;
    canvas.height = 0;
  }
}
