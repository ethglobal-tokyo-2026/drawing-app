import { context2d } from "../canvas/context2d";
import { dieCut, type Point } from "./dieCut";
import { stickerLayers, type Rect } from "./stickerLayers";

type LayerName = "plain" | "tint" | "gloss" | "shadow" | "mask" | "spec" | "rim";

/** A sealed sticker: what's stored, and what the ceremony plays with. */
export interface SealedSticker {
  /** The finished sticker, cast shadow and all. */
  png: Blob;
  /** The cut's shape (white, with the cut as alpha), the same size and place as `png`. */
  mask: Blob;
  /** The sheet as it was drawn, on white. */
  flat: Blob;
  /** The cut line as an SVG path, in image pixels. */
  outline: string;
  width: number;
  height: number;
  /** The clear margin around the cut, in image pixels. */
  pad: number;
  /** The ink canvas's width, which `place` and `contour` are measured against. */
  inkWidth: number;
  /** Where the image sits over the ink, in ink pixels. */
  place: Rect;
  /** The cut line, closed, in ink pixels. */
  contour: Point[];
  /** The ceremony's layers, as object URLs. */
  layers: Record<LayerName, string>;
  /** The mask, for painting the dim and the hole the sticker leaves. */
  maskImage: HTMLCanvasElement;
  /** Lets the layers' URLs and the mask's canvas go. */
  dispose: () => void;
}

/** The long side of the flat sheet, at most. */
const FLAT_SIDE = 1100;
/** Image pixels between the stored outline's points: finer than a ticket stub or a sheet can show. */
const OUTLINE_STEP = 2;

function canvasOf(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  context2d(canvas).putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas;
}

const encode = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(`Encoding a ${canvas.width} × ${canvas.height} layer as PNG failed`)),
      "image/png",
    ),
  );

/** Frees a canvas's memory now: iOS counts canvases against a small budget until they're collected. */
const release = (canvas: HTMLCanvasElement) => {
  canvas.width = 0;
  canvas.height = 0;
};

/** The sheet as drawn, on white paper. */
function flatten(ink: HTMLCanvasElement): HTMLCanvasElement {
  const s = Math.min(1, FLAT_SIDE / Math.max(ink.width, ink.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ink.width * s));
  canvas.height = Math.max(1, Math.round(ink.height * s));
  const g = context2d(canvas);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingQuality = "high";
  g.drawImage(ink, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function outlinePath(points: Point[]): string {
  const kept: Point[] = [];
  for (const p of points) {
    const last = kept.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= OUTLINE_STEP) kept.push(p);
  }
  return `M${kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

/**
 * Cuts the sticker from a copy of the ink made for reading, which is read back once. Null when
 * there's no ink on it.
 */
export async function makeSticker(ink: HTMLCanvasElement): Promise<SealedSticker | null> {
  const { width: inkWidth, height: inkHeight } = ink;
  const pixels = context2d(ink, { willReadFrequently: true }).getImageData(
    0,
    0,
    inkWidth,
    inkHeight,
  );
  const cut = dieCut(pixels);
  if (!cut) return null;
  const layers = stickerLayers(pixels, cut);
  const { width, height, place, bands } = layers;

  const contour = cut.contour.map(([x, y]): Point => [
    (x - cut.pad) / cut.scale,
    (y - cut.pad) / cut.scale,
  ]);
  const inImage = contour.map(([x, y]): Point => [
    ((x - place.x) * width) / place.w,
    ((y - place.y) * height) / place.h,
  ]);

  const maskImage = canvasOf(layers.mask, width, height);
  const passing = [
    canvasOf(layers.sticker, width, height),
    flatten(ink),
    canvasOf(layers.plain, width, height),
    canvasOf(layers.tint, width, height),
    canvasOf(layers.gloss, width, height),
    canvasOf(layers.shadow, width, height),
    canvasOf(bands.spec, bands.width, bands.height),
    canvasOf(bands.rim, bands.width, bands.height),
  ];
  const [png, flat, plain, tint, gloss, shadow, spec, rim, mask] = await Promise.all(
    [...passing, maskImage].map(encode),
  ).finally(() => passing.forEach(release));

  const urls: Record<LayerName, string> = {
    plain: URL.createObjectURL(plain),
    tint: URL.createObjectURL(tint),
    gloss: URL.createObjectURL(gloss),
    shadow: URL.createObjectURL(shadow),
    mask: URL.createObjectURL(mask),
    spec: URL.createObjectURL(spec),
    rim: URL.createObjectURL(rim),
  };
  return {
    png,
    mask,
    flat,
    outline: outlinePath(inImage),
    width,
    height,
    pad: layers.pad,
    inkWidth,
    place,
    contour,
    layers: urls,
    maskImage,
    dispose: () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      release(maskImage);
    },
  };
}
