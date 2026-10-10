/**
 * The sealing worker: cuts the sticker off the main thread, so the screen keeps moving while the
 * passes are worked out and encoded. Each worker cuts one sticker; the main thread stops it after.
 */
import { blankOffscreenCanvas } from "../canvas/context2d";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { cutSticker, type CutSticker, type MakeCanvas } from "./cutSticker";

/** The ink to cut, handed over rather than copied, and its pixels per sheet unit. */
export interface CutRequest {
  ink: ImageBitmap;
  density: number;
}

/** The cut, null when the ink was empty, or what went wrong. */
export type CutReply = { ok: true; cut: CutSticker | null } | { ok: false; error: string };

// The app compiles against the DOM's types, which have no worker scope: this is the part used here.
declare const self: {
  onmessage: ((event: MessageEvent<CutRequest>) => void) | null;
  postMessage: (reply: CutReply, transfer: Transferable[]) => void;
};

const offscreenCanvas: MakeCanvas = (width, height) => {
  const { canvas, g } = blankOffscreenCanvas(width, height);
  return {
    g,
    png: () => canvas.convertToBlob({ type: "image/png" }).finally(() => releaseCanvas(canvas)),
    bitmap: () => {
      const bitmap = canvas.transferToImageBitmap();
      releaseCanvas(canvas);
      return Promise.resolve(bitmap);
    },
  };
};

function pixelsOf(ink: ImageBitmap): ImageData {
  const { canvas, g } = blankOffscreenCanvas(ink.width, ink.height, { willReadFrequently: true });
  g.drawImage(ink, 0, 0);
  const pixels = g.getImageData(0, 0, ink.width, ink.height);
  releaseCanvas(canvas);
  return pixels;
}

async function answer({ ink, density }: CutRequest) {
  try {
    const cut = await cutSticker({ pixels: pixelsOf(ink), image: ink, density }, offscreenCanvas);
    self.postMessage(
      { ok: true, cut },
      cut ? [cut.maskPixels.buffer, ...Object.values(cut.passes)] : [],
    );
  } catch (error) {
    self.postMessage(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      [],
    );
  } finally {
    ink.close();
  }
}

self.onmessage = ({ data }) => void answer(data);
