import { context2d, type blankCanvas } from "../canvas/context2d";
import { squaredDistanceTransform } from "../canvas/distanceTransform";
import { MAX_DPR } from "../canvas/sheetFrame";
import type { Rect } from "../sealing/stickerPasses";

export interface LayerOutlineCrop {
  readonly source: Rect;
  readonly raster: Rect;
  readonly density: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
}

/** Padded global display pixels and the native artwork window needed to cover them. */
export function layerOutlineCrop(
  sourceWidth: number,
  sourceHeight: number,
  inked: Rect,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): LayerOutlineCrop | null {
  if (sourceWidth <= 0 || sourceHeight <= 0 || inked.w <= 0 || inked.h <= 0) return null;
  const density = Math.min(
    devicePixelRatio || 1,
    MAX_DPR,
    sourceWidth / cssWidth,
    sourceHeight / cssHeight,
  );
  const sheetWidth = cssWidth * density;
  const sheetHeight = cssHeight * density;
  const scaleX = sheetWidth / sourceWidth;
  const scaleY = sheetHeight / sourceHeight;
  const pad = Math.ceil(2.5 * density + 1);
  const x = Math.max(0, Math.floor(inked.x * scaleX) - pad);
  const y = Math.max(0, Math.floor(inked.y * scaleY) - pad);
  const right = Math.min(Math.ceil(sheetWidth), Math.ceil((inked.x + inked.w) * scaleX) + pad);
  const bottom = Math.min(Math.ceil(sheetHeight), Math.ceil((inked.y + inked.h) * scaleY) + pad);
  if (right <= x || bottom <= y) return null;
  const sx = Math.max(0, Math.floor(x / scaleX));
  const sy = Math.max(0, Math.floor(y / scaleY));
  const sr = Math.min(sourceWidth, Math.ceil(right / scaleX));
  const sb = Math.min(sourceHeight, Math.ceil(bottom / scaleY));
  return {
    source: { x: sx, y: sy, w: sr - sx, h: sb - sy },
    raster: { x, y, w: right - x, h: bottom - y },
    density,
    scaleX,
    scaleY,
    sheetWidth,
    sheetHeight,
  };
}

const coverage = (n: number) => Math.max(0, Math.min(1, n));
const overlap = (pixel: number, start: number, end: number) =>
  coverage(Math.min(pixel + 1, end) - Math.max(pixel, start));

function paintPixel(data: Uint8ClampedArray, i: number, alpha: number, dark: number) {
  if (!alpha) return;
  const share = dark / alpha;
  const p = i * 4;
  data[p] = 255 + (28 - 255) * share;
  data[p + 1] = 255 + (24 - 255) * share;
  data[p + 2] = 255 + (36 - 255) * share;
  data[p + 3] = alpha * 255;
}

/** A circular dual border over every occupied pixel; artwork alpha is read without changing it. */
export function prepareLayerOutline(
  layer: HTMLCanvasElement,
  crop: LayerOutlineCrop,
  allocate: typeof blankCanvas,
): ReturnType<typeof blankCanvas> | null {
  const { source, raster, density, scaleX, scaleY, sheetWidth, sheetHeight } = crop;
  const ink = context2d(layer).getImageData(source.x, source.y, source.w, source.h);
  const edge = 1.25 * density;
  const reach = 2 * edge + 1;
  const far = Math.ceil(reach * reach);
  const distances = new Float32Array(raster.w * raster.h).fill(far);
  const firstX = new Int32Array(source.w);
  const lastX = new Int32Array(source.w);
  for (let x = 0; x < source.w; x++) {
    firstX[x] = Math.max(0, Math.floor((source.x + x) * scaleX) - raster.x);
    lastX[x] = Math.min(raster.w, Math.ceil((source.x + x + 1) * scaleX) - raster.x);
  }
  let inkPixels = 0;
  // Occupied support is mapped conservatively so downsampling cannot round faint marks away.
  for (let y = 0; y < source.h; y++) {
    const y0 = Math.max(0, Math.floor((source.y + y) * scaleY) - raster.y);
    const y1 = Math.min(raster.h, Math.ceil((source.y + y + 1) * scaleY) - raster.y);
    for (let x = 0; x < source.w; x++) {
      if (!ink.data[(y * source.w + x) * 4 + 3]) continue;
      const x0 = firstX[x];
      const x1 = lastX[x];
      for (let cy = y0; cy < y1; cy++)
        for (let cx = x0; cx < x1; cx++) {
          const i = cy * raster.w + cx;
          if (distances[i] !== 0) {
            distances[i] = 0;
            inkPixels++;
          }
        }
    }
  }
  if (!inkPixels) return null;
  // Filled crops have no exterior pixels to measure; their sheet inset remains visible.
  if (
    inkPixels === distances.length &&
    raster.x === 0 &&
    raster.y === 0 &&
    raster.w === Math.ceil(sheetWidth) &&
    raster.h === Math.ceil(sheetHeight)
  ) {
    const made = allocate(raster.w, raster.h);
    // Keep the filled sheet's authored rectangle antialiasing, without resampling its edges.
    for (const [at, color] of [
      [edge * 5, "#FFFFFF"],
      [edge * 6, "#1C1824"],
    ] as const) {
      const width = sheetWidth - at * 2;
      const height = sheetHeight - at * 2;
      if (width <= 0 || height <= 0) continue;
      made.g.fillStyle = color;
      made.g.fillRect(at, at, width, edge);
      made.g.fillRect(at, sheetHeight - at - edge, width, edge);
      made.g.fillRect(at, at, edge, height);
      made.g.fillRect(sheetWidth - at - edge, at, edge, height);
    }
    return made;
  }
  const image = new ImageData(raster.w, raster.h);
  const { data } = image;
  if (inkPixels !== distances.length) {
    squaredDistanceTransform(distances, raster.w, raster.h);
    // Zero seeds and integer capped costs produce only integer squared distances.
    const palette = new Uint8ClampedArray((far + 1) * 4);
    for (let square = 1; square < reach * reach; square++) {
      // Centers approximate occupied pixel support by half a pixel; feather by one native pixel.
      const distance = Math.sqrt(square);
      paintPixel(palette, square, coverage(reach - distance), coverage(edge + 1 - distance));
    }
    const colors = new Uint32Array(palette.buffer);
    const pixels = new Uint32Array(data.buffer);
    for (let i = 0; i < distances.length; i++) pixels[i] = colors[distances[i]];
  }
  const left = raster.x === 0;
  const top = raster.y === 0;
  const right = raster.x + raster.w === Math.ceil(sheetWidth);
  const bottom = raster.y + raster.h === Math.ceil(sheetHeight);
  if (left || top || right || bottom) {
    const inset = edge * 5;
    const atPixel = (x: number, y: number) => {
      const i = y * raster.w + x;
      if (distances[i] !== 0) return;
      const gx = raster.x + x,
        gy = raster.y + y;
      const strip = (at: number) => {
        const across = overlap(gx, at, sheetWidth - at);
        const down = overlap(gy, at, sheetHeight - at);
        return Math.max(
          top && distances[x] === 0 ? across * overlap(gy, at, at + edge) : 0,
          bottom && distances[(raster.h - 1) * raster.w + x] === 0
            ? across * overlap(gy, sheetHeight - at - edge, sheetHeight - at)
            : 0,
          left && distances[y * raster.w] === 0 ? down * overlap(gx, at, at + edge) : 0,
          right && distances[y * raster.w + raster.w - 1] === 0
            ? down * overlap(gx, sheetWidth - at - edge, sheetWidth - at)
            : 0,
        );
      };
      const light = strip(inset);
      const dark = strip(inset + edge);
      paintPixel(data, i, Math.min(1, light + dark), dark);
    };
    const startLeft = Math.max(0, Math.floor(inset) - raster.x);
    const endLeft = Math.min(raster.w, Math.ceil(inset + 2 * edge) - raster.x);
    const startRight = Math.max(0, Math.floor(sheetWidth - inset - 2 * edge) - raster.x);
    const endRight = Math.min(raster.w, Math.ceil(sheetWidth - inset) - raster.x);
    for (let y = 0; y < raster.h; y++) {
      const gy = raster.y + y;
      if (
        (top && gy + 1 > inset && gy < inset + 2 * edge) ||
        (bottom && gy + 1 > sheetHeight - inset - 2 * edge && gy < sheetHeight - inset)
      ) {
        for (let x = 0; x < raster.w; x++) atPixel(x, y);
      } else {
        if (left) for (let x = startLeft; x < endLeft; x++) atPixel(x, y);
        if (right) for (let x = startRight; x < endRight; x++) atPixel(x, y);
      }
    }
  }
  const made = allocate(raster.w, raster.h);
  made.g.putImageData(image, 0, 0);
  return made;
}
