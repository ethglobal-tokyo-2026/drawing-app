/**
 * The sealing worker: cuts the sticker off the main thread, so the screen keeps moving while the
 * layers are worked out and encoded. Each worker cuts one sticker; the main thread stops it after.
 */
import { cutSticker, type CutSticker, type MakeCanvas } from "./cutSticker";

/** The ink to cut, handed over rather than copied. */
export interface SealRequest {
  ink: ImageBitmap;
}

/** The cut, null when the ink was empty, or what went wrong. */
export type SealReply = { ok: true; cut: CutSticker | null } | { ok: false; error: string };

// The app compiles against the DOM's types, which have no worker scope: this is the part used here.
declare const self: {
  onmessage: ((event: MessageEvent<SealRequest>) => void) | null;
  postMessage: (reply: SealReply, transfer: Transferable[]) => void;
};

function blankCanvas(width: number, height: number, settings?: CanvasRenderingContext2DSettings) {
  const canvas = new OffscreenCanvas(width, height);
  const g = canvas.getContext("2d", settings);
  if (!g) throw new Error("OffscreenCanvas 2D context unavailable");
  return { canvas, g };
}

const release = (canvas: OffscreenCanvas) => {
  canvas.width = 0;
  canvas.height = 0;
};

const offscreenCanvas: MakeCanvas = (width, height) => {
  const { canvas, g } = blankCanvas(width, height);
  return {
    g,
    png: () => canvas.convertToBlob({ type: "image/png" }).finally(() => release(canvas)),
  };
};

function pixelsOf(ink: ImageBitmap): ImageData {
  const { canvas, g } = blankCanvas(ink.width, ink.height, { willReadFrequently: true });
  g.drawImage(ink, 0, 0);
  const pixels = g.getImageData(0, 0, ink.width, ink.height);
  release(canvas);
  return pixels;
}

async function answer(ink: ImageBitmap) {
  try {
    const cut = await cutSticker({ pixels: pixelsOf(ink), image: ink }, offscreenCanvas);
    self.postMessage({ ok: true, cut }, cut ? [cut.maskPixels.buffer] : []);
  } catch (error) {
    self.postMessage(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      [],
    );
  } finally {
    ink.close();
  }
}

self.onmessage = ({ data }) => void answer(data.ink);
