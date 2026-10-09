/**
 * The crease worker: bakes each sticker's crease off the main thread, from the silhouettes of the
 * stickers under it, drawn where they lie in its frame. One worker serves every board; a new batch
 * replaces whatever of the last one hasn't started.
 */
import { releaseCanvas } from "../ui/releaseCanvas";
import { creasePixels, stackedSurface } from "./crease";

/** A 2D affine, as setTransform takes it. */
export type Affine = [number, number, number, number, number, number];

/** One sticker's crease to bake. */
export interface CreaseJob {
  id: string;
  /** Its layout's signature; a reply carries it back, so a stale one can be dropped. */
  key: string;
  /** In pixels: the sticker's box at `scale`. */
  width: number;
  height: number;
  /** Pixels per CSS px. */
  scale: number;
  /** Toward the light, in its frame. */
  light: [number, number];
  /** Its own silhouette's mask. */
  own: string;
  /**
   * Each sticker underneath, bottom to top: its silhouette's mask, its box in CSS px, and where it
   * lies in pixels.
   */
  under: { url: string; w: number; h: number; at: Affine }[];
}

/** How long each part of a bake took, in ms. */
export interface CreaseTimings {
  decode: number;
  draw: number;
  shade: number;
  encode: number;
  total: number;
}

/**
 * A baked crease, null when nothing underneath shows a step, and the mask of its lit side, where the
 * live resin's highlights catch it.
 */
export type CreaseReply =
  | {
      ok: true;
      board: string;
      id: string;
      key: string;
      crease: Blob | null;
      shine: Blob | null;
      timings: CreaseTimings;
    }
  | { ok: false; board: string; id: string; key: string; error: string };

export interface CreaseBatch {
  /** The board it's for: a newer batch replaces only that board's. */
  board: string;
  batch: number;
  jobs: CreaseJob[];
}

// The app compiles against the DOM's types, which have no worker scope: this is the part used here.
declare const self: {
  onmessage: ((event: MessageEvent<CreaseBatch>) => void) | null;
  postMessage: (reply: CreaseReply) => void;
};

/** Masks are kept at most this long a side: the crease is soft, and every board sticker's is kept. */
const MASK_SIDE = 320;

const masks = new Map<string, Promise<ImageBitmap>>();

async function loadMask(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Loading the mask ${url} answered ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const s = Math.min(1, MASK_SIDE / Math.max(bitmap.width, bitmap.height));
  if (s === 1) return bitmap;
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(bitmap.width * s)),
    Math.max(1, Math.round(bitmap.height * s)),
  );
  const g = canvas.getContext("2d");
  if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.transferToImageBitmap();
}

function maskOf(url: string): Promise<ImageBitmap> {
  let mask = masks.get(url);
  if (!mask) {
    mask = loadMask(url);
    masks.set(url, mask);
    mask.catch(() => masks.delete(url));
  }
  return mask;
}

/** The alpha channel, 0 to 1. */
function alphaOf(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] / 255;
  return out;
}

async function pngOf(canvas: OffscreenCanvas, pixels: Uint8ClampedArray<ArrayBuffer>) {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
  g.putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

async function bake(board: string, job: CreaseJob): Promise<CreaseReply> {
  const t0 = performance.now();
  const [own, ...under] = await Promise.all([job.own, ...job.under.map((u) => u.url)].map(maskOf));
  const t1 = performance.now();
  const canvas = new OffscreenCanvas(job.width, job.height);
  try {
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    /** One silhouette's alpha, drawn where `draw` puts it. */
    const silhouette = (draw: () => void) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, job.width, job.height);
      draw();
      return alphaOf(g.getImageData(0, 0, job.width, job.height).data);
    };
    const layers = job.under.map((u, i) =>
      silhouette(() => {
        g.setTransform(...u.at);
        g.drawImage(under[i], 0, 0, u.w, u.h);
      }),
    );
    const ownAlpha = silhouette(() => g.drawImage(own, 0, 0, job.width, job.height));
    g.setTransform(1, 0, 0, 1, 0, 0);
    const t2 = performance.now();
    const pixels = creasePixels({
      width: job.width,
      height: job.height,
      surface: stackedSurface(layers, job.width, job.height, job.scale),
      own: ownAlpha,
      scale: job.scale,
      light: job.light,
    });
    const t3 = performance.now();
    const crease = pixels && (await pngOf(canvas, pixels.crease));
    const shine = pixels && (await pngOf(canvas, pixels.shine));
    const t4 = performance.now();
    return {
      ok: true,
      board,
      id: job.id,
      key: job.key,
      crease,
      shine,
      timings: { decode: t1 - t0, draw: t2 - t1, shade: t3 - t2, encode: t4 - t3, total: t4 - t0 },
    };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Each board's latest batch. */
const current = new Map<string, number>();

self.onmessage = (event) => {
  const { board, batch, jobs } = event.data;
  current.set(board, batch);
  void (async () => {
    for (const job of jobs) {
      // A newer batch for this board has its whole stack again; this one's rest is stale.
      if (current.get(board) !== batch) return;
      try {
        self.postMessage(await bake(board, job));
      } catch (error) {
        self.postMessage({
          ok: false,
          board,
          id: job.id,
          key: job.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  })();
};
