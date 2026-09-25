import { context2d } from "../canvas/renderer";
import { makeStickerPixels } from "./stickerPixels";

export interface StickerImages {
  /** The bare ink, cropped (transparent background). */
  inkUrl: string;
  /** Paper + ink cut to shape. */
  cutUrl: string;
  /** Finished sticker with the clear dome. */
  domeUrl: string;
  domeBlob: Blob;
  /** SVG path of the cut line, in image pixels. */
  outline: string;
  width: number;
  height: number;
}

/** Largest side of the sticker image, in pixels. */
const MAX_SIDE = 560;

function contentBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function hasContent(source: HTMLCanvasElement): boolean {
  return contentBounds(context2d(source), source.width, source.height) !== null;
}

function toCanvas(pixels: Uint8ClampedArray<ArrayBuffer>, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  context2d(c).putImageData(new ImageData(pixels, w, h), 0, 0);
  return c;
}

/** Crops the ink to its content and builds every stage of the sticker. */
export async function makeSticker(source: HTMLCanvasElement): Promise<StickerImages | null> {
  const bounds = contentBounds(context2d(source), source.width, source.height);
  if (!bounds) return null;

  const scale = Math.min(1, MAX_SIDE / Math.max(bounds.w, bounds.h));
  const cw = Math.max(1, Math.round(bounds.w * scale));
  const ch = Math.max(1, Math.round(bounds.h * scale));
  const border = Math.round(Math.max(8, Math.max(cw, ch) * 0.045));
  // Parts closer than ~2 × bridge merge into one sticker.
  const bridge = Math.round(Math.max(cw, ch) * 0.07);
  // Room for the full growth before it shrinks back, so nothing is clipped.
  const pad = border + bridge + 4;
  const w = cw + pad * 2;
  const h = ch + pad * 2;

  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = context2d(work);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, bounds.x, bounds.y, bounds.w, bounds.h, pad, pad, cw, ch);
  const ink = ctx.getImageData(0, 0, w, h).data;

  const { cut, dome, outline } = makeStickerPixels(ink, w, h, border, bridge);
  const domeCanvas = toCanvas(dome, w, h);
  const domeBlob = await new Promise<Blob>((resolve, reject) =>
    domeCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
      "image/png",
    ),
  );
  return {
    inkUrl: work.toDataURL("image/png"),
    cutUrl: toCanvas(cut, w, h).toDataURL("image/png"),
    domeUrl: domeCanvas.toDataURL("image/png"),
    domeBlob,
    outline,
    width: w,
    height: h,
  };
}
