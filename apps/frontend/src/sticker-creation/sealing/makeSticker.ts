import { context2d } from "../canvas/context2d";
import { cutSticker, type CutSticker, type LayerName, type MakeCanvas } from "./cutSticker";
import type { Point } from "./dieCut";
import type { SealReply, SealRequest } from "./sealWorker";
import type { Rect } from "./stickerLayers";

/** A sealed sticker: what's stored, and what the ceremony plays with. */
export interface SealedSticker {
  /** The finished sticker, cast shadow and all. */
  png: Blob;
  /** The cut's shape (white, with the cut as alpha), the same size and place as `png`. */
  mask: Blob;
  /** The live resin's specular mask, along the top edge. */
  spec: Blob;
  /** The live resin's rim-light mask, inside the lower edge. */
  rim: Blob;
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
  /** The mask, for painting the dim and the used sticker silhouette. */
  maskImage: HTMLCanvasElement;
  /** Lets the layers' URLs and the mask's canvas go. */
  dispose: () => void;
}

/** Far longer than a slow phone takes, so only a stalled worker fails the seal, with Try again. */
const WORKER_TIMEOUT_MS = 60_000;

function blankCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, g: context2d(canvas) };
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

const elementCanvas: MakeCanvas = (width, height) => {
  const { canvas, g } = blankCanvas(width, height);
  return { g, png: () => encode(canvas).finally(() => release(canvas)) };
};

/** The sealing worker paints on OffscreenCanvas, which older iOS lacks: there the cut runs here. */
const workerCanCut = () =>
  typeof Worker === "function" &&
  typeof OffscreenCanvas === "function" &&
  new OffscreenCanvas(1, 1).getContext("2d") !== null;

/** The cut in the sealing worker: this thread only snapshots the ink and hands it over. */
async function cutInWorker(ink: HTMLCanvasElement): Promise<CutSticker | null> {
  const image = await createImageBitmap(ink);
  // A worker per seal, stopped once it answers, fails or times out, so none sits holding memory.
  const worker = new Worker(new URL("./sealWorker.ts", import.meta.url), { type: "module" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<CutSticker | null>((resolve, reject) => {
      worker.onmessage = ({ data }: MessageEvent<SealReply>) => {
        if (data.ok) resolve(data.cut);
        else reject(new Error(data.error));
      };
      // A script that didn't load reports a bare event, with no message.
      worker.onerror = (event) =>
        reject(
          new Error(`The sealing worker failed: ${event.message || "its script didn't load"}`),
        );
      worker.onmessageerror = () =>
        reject(new Error("The sealing worker's answer couldn't be read"));
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `The sealing worker didn't finish within ${WORKER_TIMEOUT_MS / 1000} s, so it was stopped`,
            ),
          ),
        WORKER_TIMEOUT_MS,
      );
      const request: SealRequest = { ink: image };
      worker.postMessage(request, [image]);
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}

/** The cut on this thread, where the sealing worker can't run. */
function cutHere(ink: HTMLCanvasElement): Promise<CutSticker | null> {
  const pixels = context2d(ink, { willReadFrequently: true }).getImageData(
    0,
    0,
    ink.width,
    ink.height,
  );
  return cutSticker({ pixels, image: ink }, elementCanvas);
}

/**
 * Cuts the sticker from a copy of the ink made for reading, which is read back once. Null when
 * there's no ink on it. The cut runs in the sealing worker where the browser can, so the screen
 * keeps moving.
 */
export async function makeSticker(ink: HTMLCanvasElement): Promise<SealedSticker | null> {
  const cut = workerCanCut() ? await cutInWorker(ink) : await cutHere(ink);
  if (!cut) return null;
  const { width, height, layers } = cut;
  const { canvas: maskImage, g } = blankCanvas(width, height);
  g.putImageData(new ImageData(cut.maskPixels, width, height), 0, 0);

  const urls: Record<LayerName, string> = {
    plain: URL.createObjectURL(layers.plain),
    tint: URL.createObjectURL(layers.tint),
    gloss: URL.createObjectURL(layers.gloss),
    shadow: URL.createObjectURL(layers.shadow),
    mask: URL.createObjectURL(layers.mask),
    spec: URL.createObjectURL(layers.spec),
    rim: URL.createObjectURL(layers.rim),
  };
  return {
    png: cut.png,
    mask: layers.mask,
    spec: layers.spec,
    rim: layers.rim,
    flat: cut.flat,
    outline: cut.outline,
    width,
    height,
    pad: cut.pad,
    inkWidth: cut.inkWidth,
    place: cut.place,
    contour: cut.contour,
    layers: urls,
    maskImage,
    dispose: () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      release(maskImage);
    },
  };
}
