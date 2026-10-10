import { blankCanvas } from "../sticker-creation/canvas/context2d";
import { releaseCanvas } from "../ui/releaseCanvas";

/** A sticker mask's RGBA pixels, drawn at `size`, or at the image's own size. */
export async function maskPixels(
  url: string,
  size?: { width: number; height: number },
): Promise<ImageData> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const { canvas, g } = blankCanvas(
    size?.width ?? image.naturalWidth,
    size?.height ?? image.naturalHeight,
    { willReadFrequently: true },
  );
  try {
    g.drawImage(image, 0, 0, canvas.width, canvas.height);
    return g.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    releaseCanvas(canvas);
  }
}
