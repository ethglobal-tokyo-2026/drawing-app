/**
 * The crease worker: bakes each sticker's crease off the main thread, from the silhouettes of the
 * stickers under it, drawn where they lie in its frame. One worker serves every board; a new batch
 * replaces whatever of the last one hasn't started.
 */
import { releaseCanvas } from "../ui/releaseCanvas";
import { createCreaseBatchHandler } from "./creaseBatch";
import {
  creasePixels,
  stackedSurface,
  drapeReach,
  creaseNormalReach,
  type CreaseBounds,
  type CreaseImage,
} from "./crease";
import { foilCoverage } from "./foilCoverage";
import { maskCache } from "./maskCache";

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
  /** Its own silhouette. */
  own: Silhouette;
  /**
   * Each sticker underneath, bottom to top: its silhouette, its box in CSS px, and where it lies in
   * pixels.
   */
  under: (Silhouette & { w: number; h: number; at: Affine })[];
}

/**
 * A sticker's outline as the board draws it: a mask, grown by `grow` CSS px all round when its foil
 * band is grown from the cut rather than drawn from the server's mask.
 */
export interface Silhouette {
  url: string;
  grow: number;
}

/** The ways a band is grown from the cut, as the foil's CSS does: the center and eight around it. */
const GROWN = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [-Math.SQRT1_2, -Math.SQRT1_2],
] as const;

/** How long each part of a bake took, in ms. */
export interface CreaseTimings {
  decode: number;
  draw: number;
  shade: number;
  encode: number;
  total: number;
}

/** A baked crease, its base, geometric normals and steps' height; null when nothing rises. */
export type CreaseReply =
  | {
      ok: true;
      board: string;
      id: string;
      key: string;
      crease: Record<CreaseImage, Blob> | null;
      normalBounds?: CreaseBounds;
      timings: CreaseTimings;
    }
  | { ok: false; board: string; id: string; key: string; error: string };

export interface CreaseBatch {
  /** The board it's for: a newer batch replaces only that board's. */
  board: string;
  batch: number;
  /** Record the wanted keys now, but let the board settle before starting a new bake. */
  start: boolean;
  jobs: CreaseJob[];
}

// The app compiles against the DOM's types, which have no worker scope: this is the part used here.
declare const self: {
  onmessage: ((event: MessageEvent<CreaseBatch>) => void) | null;
  postMessage: (reply: CreaseReply) => void;
};

/** Masks are kept at most this long a side: the crease is soft, and a board's worth are kept. */
const MASK_SIDE = 320;
/** How many masks are kept: about a board's worth. */
const MASKS_KEPT = 64;
/** A bake, and a mask's fetch with it, is given up after this long, so one that stalls holds up no other. */
const BAKE_TIMEOUT_MS = 20_000;

interface DecodedMask {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
  margin: number;
}

async function loadMask(url: string): Promise<DecodedMask> {
  const response = await fetch(url, { signal: AbortSignal.timeout(BAKE_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Loading the mask ${url} answered ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  // Keep exact decoded alpha before reduction: a narrow source margin must not disappear.
  const source = new OffscreenCanvas(bitmap.width, bitmap.height);
  let alpha: Uint8ClampedArray;
  let margin = Infinity;
  try {
    const g = source.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    g.drawImage(bitmap, 0, 0);
    const rgba = g.getImageData(0, 0, source.width, source.height).data;
    alpha = new Uint8ClampedArray(source.width * source.height);
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        const i = y * source.width + x;
        alpha[i] = rgba[i * 4 + 3];
        if (alpha[i])
          margin = Math.min(
            margin,
            x / source.width,
            y / source.height,
            (source.width - x - 1) / source.width,
            (source.height - y - 1) / source.height,
          );
      }
  } finally {
    releaseCanvas(source);
  }
  const metadata = { width: bitmap.width, height: bitmap.height, alpha, margin };
  const s = Math.min(1, MASK_SIDE / Math.max(bitmap.width, bitmap.height));
  if (s === 1) return { ...metadata, bitmap };
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(bitmap.width * s)),
    Math.max(1, Math.round(bitmap.height * s)),
  );
  try {
    const g = canvas.getContext("2d");
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { ...metadata, bitmap: canvas.transferToImageBitmap() };
  } finally {
    bitmap.close();
    releaseCanvas(canvas);
  }
}

const maskOf = maskCache(loadMask, MASKS_KEPT);

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
  const [own, ...under] = await Promise.all([job.own, ...job.under].map((s) => maskOf(s.url)));
  const t1 = performance.now();
  const output = overflowBounds(own, job);
  if (output) return bakeExpanded(board, job, own, under, output, t0, t1);
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
    /** A mask drawn `w`×`h` from the origin, grown as its band is; `px` per CSS px of growth. */
    const drawGrown = (mask: ImageBitmap, { grow }: Silhouette, w: number, h: number, px = 1) => {
      for (const [dx, dy] of grow > 0 ? GROWN : GROWN.slice(0, 1)) {
        g.drawImage(mask, dx * grow * px, dy * grow * px, w, h);
      }
    };
    const layers = job.under.map((u, i) =>
      silhouette(() => {
        g.setTransform(...u.at);
        drawGrown(under[i].bitmap, u, u.w, u.h);
      }),
    );
    const ownAlpha = silhouette(() =>
      drawGrown(own.bitmap, job.own, job.width, job.height, job.scale),
    );
    g.setTransform(1, 0, 0, 1, 0, 0);
    const t2 = performance.now();
    const pixels = creasePixels({
      width: job.width,
      height: job.height,
      surface: stackedSurface(layers, job.width, job.height),
      own: ownAlpha,
      scale: job.scale,
    });
    const t3 = performance.now();
    const crease = pixels && {
      base: await pngOf(canvas, pixels.base),
      normal: await pngOf(canvas, pixels.normal),
      height: await pngOf(canvas, pixels.height),
    };
    const t4 = performance.now();
    return {
      ok: true,
      board,
      id: job.id,
      key: job.key,
      crease,
      timings: { decode: t1 - t0, draw: t2 - t1, shade: t3 - t2, encode: t4 - t3, total: t4 - t0 },
    };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Only decoded, nonzero grown coverage outside the source calls for new geometry. */
function overflowBounds(own: DecodedMask, job: CreaseJob): CreaseBounds | undefined {
  const radius = job.own.grow * job.scale;
  if (!radius || own.margin >= Math.max(radius / job.width, radius / job.height)) return;
  const coverage = foilCoverage(
    own.alpha,
    own.width,
    own.height,
    (radius * own.width) / job.width,
    8,
    (radius * own.height) / job.height,
  );
  let outside = false;
  for (let y = 0; y < coverage.height && !outside; y++)
    for (let x = 0; x < coverage.width; x++) {
      const sx = x + coverage.x,
        sy = y + coverage.y;
      if (
        (sx < 0 || sy < 0 || sx >= own.width || sy >= own.height) &&
        coverage.alpha[y * coverage.width + x]
      ) {
        outside = true;
        break;
      }
    }
  if (!outside) return;
  const x = Math.floor((coverage.x * job.width) / own.width);
  const y = Math.floor((coverage.y * job.height) / own.height);
  return {
    x,
    y,
    width: Math.ceil(((coverage.x + coverage.width) * job.width) / own.width) - x,
    height: Math.ceil(((coverage.y + coverage.height) * job.height) / own.height) - y,
  };
}

/** Real lower silhouettes through the entire dependency reach; paint keeps its source frame. */
async function bakeExpanded(
  board: string,
  job: CreaseJob,
  own: DecodedMask,
  under: DecodedMask[],
  output: CreaseBounds,
  t0: number,
  t1: number,
): Promise<CreaseReply> {
  // At most one thickness per lower sticker. The height minimum also samples a rounded ramp;
  // one further pixel supplies central differences at every output edge.
  const context = drapeReach(job.scale, job.under.length) + creaseNormalReach(job.scale) + 1;
  const originX = output.x - context,
    originY = output.y - context;
  const width = output.width + 2 * context,
    height = output.height + 2 * context;
  const canvas = new OffscreenCanvas(width, height);
  const encoded = new OffscreenCanvas(job.width, job.height);
  try {
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    const silhouette = (
      mask: ImageBitmap,
      silhouette: Silhouette,
      w: number,
      h: number,
      at: Affine,
      px = 1,
    ) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, width, height);
      g.setTransform(at[0], at[1], at[2], at[3], at[4] - originX, at[5] - originY);
      for (const [dx, dy] of silhouette.grow > 0 ? GROWN : GROWN.slice(0, 1))
        g.drawImage(mask, dx * silhouette.grow * px, dy * silhouette.grow * px, w, h);
      return alphaOf(g.getImageData(0, 0, width, height).data);
    };
    const layers = job.under.map((u, i) => silhouette(under[i].bitmap, u, u.w, u.h, u.at));
    const ownAlpha = silhouette(
      own.bitmap,
      job.own,
      job.width,
      job.height,
      [1, 0, 0, 1, 0, 0],
      job.scale,
    );
    const t2 = performance.now();
    const pixels = creasePixels({
      width,
      height,
      scale: job.scale,
      surface: stackedSurface(layers, width, height, {
        x: -originX,
        y: -originY,
        width: job.width,
        height: job.height,
      }),
      own: ownAlpha,
      normalRegion: { x: context, y: context, width: output.width, height: output.height },
    });
    const t3 = performance.now();
    const crop = (image: Uint8ClampedArray, x: number, y: number, w: number, h: number) => {
      const result = new Uint8ClampedArray(w * h * 4);
      for (let row = 0; row < h; row++) {
        const start = ((y + row) * width + x) * 4;
        result.set(image.subarray(start, start + w * 4), row * w * 4);
      }
      return result;
    };
    let crease: Record<CreaseImage, Blob> | null = null;
    if (pixels) {
      const paint = async (name: CreaseImage) =>
        pngOf(encoded, crop(pixels[name], -originX, -originY, job.width, job.height));
      const painted = { base: await paint("base") };
      encoded.width = output.width;
      encoded.height = output.height;
      // The height shares the normal's registration, so the shader reads both through normalBounds.
      const registered = (name: CreaseImage) =>
        pngOf(encoded, crop(pixels[name], context, context, output.width, output.height));
      crease = {
        ...painted,
        normal: await registered("normal"),
        height: await registered("height"),
      };
    }
    const t4 = performance.now();
    return {
      ok: true,
      board,
      id: job.id,
      key: job.key,
      crease,
      ...(crease && {
        normalBounds: {
          x: output.x / job.width,
          y: output.y / job.height,
          width: output.width / job.width,
          height: output.height / job.height,
        },
      }),
      timings: { decode: t1 - t0, draw: t2 - t1, shade: t3 - t2, encode: t4 - t3, total: t4 - t0 },
    };
  } finally {
    releaseCanvas(canvas);
    releaseCanvas(encoded);
  }
}

/** `work`, or an error once it has taken longer than `ms`. */
async function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`it took over ${ms / 1000} s, so it was given up`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const receiveBatch = createCreaseBatchHandler(
  (board, job) => within(bake(board, job), BAKE_TIMEOUT_MS),
  (reply) => self.postMessage(reply),
);

self.onmessage = (event) => receiveBatch(event.data);
