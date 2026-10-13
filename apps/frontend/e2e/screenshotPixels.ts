import sharp from "sharp";

export interface ScreenshotPixels {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Decode outside the browser so canvas privacy protections cannot alter screenshot colors. */
export async function decodeScreenshot(png: Buffer): Promise<ScreenshotPixels> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

export function screenshotPixel(pixels: ScreenshotPixels, x: number, y: number): number[] {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= pixels.width || py >= pixels.height)
    throw new Error(`Screenshot sample (${px}, ${py}) is outside ${pixels.width}×${pixels.height}`);
  const start = (py * pixels.width + px) * 4;
  return [...pixels.data.subarray(start, start + 4)];
}
