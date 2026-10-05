import { context2d } from "../sticker-creation/canvas/context2d";
import { releaseCanvas } from "../ui/releaseCanvas";

/** A sticker mask's RGBA pixels, drawn at `size`, or at the image's own size. */
export async function maskPixels(
  url: string,
  size?: { width: number; height: number },
): Promise<ImageData> {
  const image = new Image();
  // Sticker images may come from the CDN, and a canvas gives back the pixels of an image from another origin only
  // when it was fetched with CORS.
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = size?.width ?? image.naturalWidth;
  canvas.height = size?.height ?? image.naturalHeight;
  try {
    const g = context2d(canvas, { willReadFrequently: true });
    g.drawImage(image, 0, 0, canvas.width, canvas.height);
    return g.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    releaseCanvas(canvas);
  }
}
