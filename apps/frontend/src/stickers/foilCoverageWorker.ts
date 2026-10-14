/**
 * The foil coverage worker: decodes a sticker's cut or baked foil mask, reads its alpha, grows the band
 * and encodes the static band's mask, so none of it runs on the main thread. One worker serves every
 * board; its answers carry their alpha's buffer across without a copy.
 */
import { releaseCanvas } from "../ui/releaseCanvas";
import { foilCoverageBounds, growFoilCoverage, type FoilCoverage } from "./foilCoverage";

/** One coverage to prepare: every input that decides its pixels. */
export interface FoilCoverageJob {
  id: number;
  /** Absolute URL of the cut, or of the baked mask when `grow` is zero. */
  url: string;
  /** The image already decoded, for a format only a document decodes (SVG). */
  bitmap?: ImageBitmap;
  /** The longest side, in device px, of the largest tile drawn from it. */
  side: number;
  /** Growth as a share of the source frame's width and height; zero for a baked mask. */
  grow: readonly [number, number];
  /** Translated copies in the union. */
  copies: number;
}

export type FoilCoverageRequest = { job: FoilCoverageJob } | { cancel: number };

export type FoilCoverageReply =
  | { id: number; ok: true; coverage: FoilCoverage; png?: Blob }
  | { id: number; ok: false; error: string };

// The app compiles against the DOM's types, which have no worker scope: this is the part used here.
declare const self: {
  onmessage: ((event: MessageEvent<FoilCoverageRequest>) => void) | null;
  postMessage: (reply: FoilCoverageReply, transfer?: Transferable[]) => void;
};

/** The source frame's longest side, as the renderer bounds its own textures. */
const FRAME_SIDE = 1024;
/** A fetch that stalls is given up after the same deadline as the coverage it feeds. */
const FETCH_TIMEOUT_MS = 20_000;

/** Jobs in progress, and whether each was canceled. */
const running = new Map<number, { canceled: boolean }>();

async function decode(job: FoilCoverageJob) {
  if (job.bitmap) return job.bitmap;
  const response = await fetch(job.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok)
    throw new Error(`Loading outer coverage ${job.url} answered ${response.status}`);
  return createImageBitmap(await response.blob());
}

/** The alpha of `bitmap` drawn at `x, y, w, h` into a `width`×`height` grid. */
function alphaOf(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  [x, y, w, h]: [number, number, number, number],
) {
  const canvas = new OffscreenCanvas(width, height);
  try {
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    g.drawImage(bitmap, x, y, w, h);
    const rgba = g.getImageData(0, 0, width, height).data;
    const alpha = new Uint8ClampedArray(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return alpha;
  } finally {
    releaseCanvas(canvas);
  }
}

/** The band's static mask: white, with the coverage as its alpha. */
async function maskOf({ width, height, alpha }: FoilCoverage) {
  const canvas = new OffscreenCanvas(width, height);
  try {
    const g = canvas.getContext("2d");
    if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
    const pixels = new ImageData(width, height);
    for (let i = 0; i < alpha.length; i++) {
      pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
      pixels.data[i * 4 + 3] = alpha[i];
    }
    g.putImageData(pixels, 0, 0);
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    releaseCanvas(canvas);
  }
}

/** Bounds come from the full source frame, so they register exactly as at any other resolution. */
function grown(job: FoilCoverageJob, bitmap: ImageBitmap): FoilCoverage {
  const fit = Math.min(1, FRAME_SIDE / Math.max(bitmap.width, bitmap.height));
  const frameWidth = Math.max(1, Math.round(bitmap.width * fit));
  const frameHeight = Math.max(1, Math.round(bitmap.height * fit));
  const radius = job.grow[0] * frameWidth,
    verticalRadius = job.grow[1] * frameHeight;
  const frame = alphaOf(bitmap, frameWidth, frameHeight, [0, 0, frameWidth, frameHeight]);
  const bounds = foilCoverageBounds(frame, frameWidth, frameHeight, radius, verticalRadius);
  const scale = Math.min(1, job.side / Math.max(frameWidth, frameHeight));
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const sx = width / bounds.width,
    sy = height / bounds.height;
  let grid: Uint8ClampedArray;
  if (sx === 1 && sy === 1) {
    grid = new Uint8ClampedArray(width * height);
    for (let row = 0; row < frameHeight; row++)
      grid.set(
        frame.subarray(row * frameWidth, (row + 1) * frameWidth),
        (row - bounds.y) * width - bounds.x,
      );
  } else
    grid = alphaOf(bitmap, width, height, [
      -bounds.x * sx,
      -bounds.y * sy,
      frameWidth * sx,
      frameHeight * sy,
    ]);
  return {
    x: bounds.x * sx,
    y: bounds.y * sy,
    width,
    height,
    sourceWidth: frameWidth * sx,
    sourceHeight: frameHeight * sy,
    alpha: growFoilCoverage(grid, width, height, radius * sx, job.copies, verticalRadius * sy),
  };
}

function baked(job: FoilCoverageJob, bitmap: ImageBitmap): FoilCoverage {
  const longest = Math.max(bitmap.width, bitmap.height);
  const fit = Math.min(1, FRAME_SIDE / longest, job.side / longest);
  const width = Math.max(1, Math.round(bitmap.width * fit));
  const height = Math.max(1, Math.round(bitmap.height * fit));
  const alpha = alphaOf(bitmap, width, height, [0, 0, width, height]);
  return { x: 0, y: 0, width, height, sourceWidth: width, sourceHeight: height, alpha };
}

async function prepare(job: FoilCoverageJob, state: { canceled: boolean }) {
  const bitmap = await decode(job);
  try {
    if (state.canceled) return;
    const growing = job.grow[0] > 0 || job.grow[1] > 0;
    const coverage = growing ? grown(job, bitmap) : baked(job, bitmap);
    const png = growing ? await maskOf(coverage) : undefined;
    if (state.canceled) return;
    self.postMessage({ id: job.id, ok: true, coverage, png }, [coverage.alpha.buffer]);
  } finally {
    bitmap.close();
  }
}

self.onmessage = ({ data }) => {
  if ("cancel" in data) {
    const state = running.get(data.cancel);
    if (state) state.canceled = true;
    return;
  }
  const { job } = data;
  const state = { canceled: false };
  running.set(job.id, state);
  void prepare(job, state)
    .catch((error: unknown) => {
      if (!state.canceled)
        self.postMessage({
          id: job.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
    })
    .finally(() => running.delete(job.id));
};
