import { blankCanvas, context2d } from "../canvas/context2d";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { cutSticker, type CutSticker, type MakeCanvas, type PassName } from "./cutSticker";
import type { SealReply, SealRequest } from "./sealWorker";

/** A sealed sticker: the cut sticker as it's stored, and as the ceremony plays with it. */
export type SealedSticker = Omit<CutSticker, "passes" | "maskPixels"> & {
  /** The cut's shape (white, with the cut as alpha), the same size and place as `png`. */
  mask: Blob;
  /** The ceremony's passes, as object URLs. */
  passes: Record<PassName, string>;
  /** The mask, for painting the dim and the used sticker silhouette. */
  maskImage: HTMLCanvasElement;
  /** Lets the passes' URLs and the mask's canvas go. */
  dispose: () => void;
};

/** Far longer than a slow phone takes, so only a stalled worker fails the seal, with Try again. */
const WORKER_TIMEOUT_MS = 60_000;

const encode = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(`Encoding a ${canvas.width} × ${canvas.height} image as PNG failed`)),
      "image/png",
    ),
  );

const elementCanvas: MakeCanvas = (width, height) => {
  const { canvas, g } = blankCanvas(width, height);
  return { g, png: () => encode(canvas).finally(() => releaseCanvas(canvas)) };
};

/** The sealing worker paints on OffscreenCanvas, which older iOS lacks: there the cut runs here. */
const workerCanCut = () =>
  typeof Worker === "function" &&
  typeof OffscreenCanvas === "function" &&
  new OffscreenCanvas(1, 1).getContext("2d") !== null;

/** The sealing worker's script didn't load. */
class WorkerDidNotStart extends Error {}

/** The cut in the sealing worker: this thread only snapshots the ink and hands it over. */
async function cutInWorker(ink: HTMLCanvasElement, density: number): Promise<CutSticker | null> {
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
          event.message
            ? new Error(`The sealing worker failed: ${event.message}`)
            : new WorkerDidNotStart("The sealing worker's script didn't load"),
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
      const request: SealRequest = { ink: image, density };
      worker.postMessage(request, [image]);
    });
  } finally {
    clearTimeout(timer);
    worker.terminate();
  }
}

/** The cut on this thread, where the sealing worker can't run. */
function cutHere(ink: HTMLCanvasElement, density: number): Promise<CutSticker | null> {
  const pixels = context2d(ink, { willReadFrequently: true }).getImageData(
    0,
    0,
    ink.width,
    ink.height,
  );
  return cutSticker({ pixels, image: ink, density }, elementCanvas);
}

/**
 * The cut in the sealing worker, or on this thread when the worker's script won't load: a page open
 * since before a deploy asks for the old build's worker, which the deploy removed. The seal goes on
 * rather than failing, and the console says why it held the screen.
 */
async function cutInWorkerOrHere(
  ink: HTMLCanvasElement,
  density: number,
): Promise<CutSticker | null> {
  try {
    return await cutInWorker(ink, density);
  } catch (error) {
    if (!(error instanceof WorkerDidNotStart)) throw error;
    console.error("The sticker is cut on the main thread instead", error);
    return cutHere(ink, density);
  }
}

/**
 * Cuts the sticker from a copy of the ink made for reading, `density` pixels to the sheet unit,
 * which is read back once. Null when there's no ink on it. The cut runs in the sealing worker where
 * the browser can, so the screen keeps moving.
 */
export async function makeSticker(
  ink: HTMLCanvasElement,
  density: number,
): Promise<SealedSticker | null> {
  const cut = workerCanCut() ? await cutInWorkerOrHere(ink, density) : await cutHere(ink, density);
  if (!cut) return null;
  const { passes, maskPixels, ...rest } = cut;
  const { width, height } = rest;
  const { canvas: maskImage, g } = blankCanvas(width, height);
  g.putImageData(new ImageData(maskPixels, width, height), 0, 0);

  const urls: Record<PassName, string> = {
    plain: URL.createObjectURL(passes.plain),
    gloss: URL.createObjectURL(passes.gloss),
    shadow: URL.createObjectURL(passes.shadow),
    mask: URL.createObjectURL(passes.mask),
  };
  return {
    ...rest,
    mask: passes.mask,
    passes: urls,
    maskImage,
    dispose: () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      releaseCanvas(maskImage);
    },
  };
}
