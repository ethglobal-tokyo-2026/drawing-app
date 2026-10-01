import sharp from "sharp";

// An NSFW sticker's veiled image: what anyone whose age status isn't adult sees in place of it. It
// bakes in the veil the app drew in CSS, so the app shows it as it comes.

/** The blur's radius, as a share of the sticker's width: the CSS veil's 9cqi. */
const VEIL_BLUR_SHARE = 0.09;
/** The CSS veil's saturate(). */
const VEIL_SATURATION = 0.7;
/** The pale pink wash over the blur, inside the cut. */
const VEIL_WASH = { r: 255, g: 240, b: 246, alpha: 0.42 };
/**
 * The blur runs on a copy shrunk until its radius is this many pixels, then scaled back up: it looks
 * the same, costs a fraction, and nothing finer than the shrunk copy survives in the veil.
 */
const WORKING_BLUR_PX = 4;

const RGBA = 4;

/** CSS's saturate() matrix, rows of R, G and B weights. */
function saturation(s: number): number[][] {
  return [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
  ];
}

const raw = (width: number, height: number) =>
  ({ raw: { width, height, channels: RGBA } }) as const;

/** The sticker blurred by VEIL_BLUR_SHARE of its width, at its own size, alpha unpremultiplied. */
async function blurred(stickerPng: Uint8Array) {
  const { data, info } = await sharp(stickerPng)
    .ensureAlpha()
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const radius = Math.max(1, VEIL_BLUR_SHARE * width);
  const shrink = Math.min(1, WORKING_BLUR_PX / radius);
  const smallWidth = Math.max(1, Math.round(width * shrink));
  const smallHeight = Math.max(1, Math.round(height * shrink));
  // One step per pipeline: sharp runs a pipeline's steps in its own order, not the calls'.
  const small = await sharp(data, raw(width, height))
    .resize(smallWidth, smallHeight, { fit: "fill" })
    .raw()
    .toBuffer();
  const smallBlurred = await sharp(small, raw(smallWidth, smallHeight))
    .blur(radius * shrink)
    .raw()
    .toBuffer();
  const pixels = await sharp(smallBlurred, raw(smallWidth, smallHeight))
    .resize(width, height, { fit: "fill", kernel: "mitchell" })
    .raw()
    .toBuffer();
  return { pixels, width, height };
}

/** The cut's alpha, from the sticker's mask. */
async function cutAlpha(maskPng: Uint8Array, width: number, height: number) {
  const { data, info } = await sharp(maskPng)
    .ensureAlpha()
    .extractChannel(3)
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height) {
    throw new Error(
      `The mask is ${info.width}×${info.height} px, not the sticker's ${width}×${height}`,
    );
  }
  return data;
}

/**
 * The veiled PNG of a sticker, from its PNG and its mask: blurred and desaturated, cut to its mask,
 * under the pale pink wash, at the sticker's size. Nothing shows outside the cut.
 */
export async function veiledPng(stickerPng: Uint8Array, maskPng: Uint8Array): Promise<Uint8Array> {
  const { pixels, width, height } = await blurred(stickerPng);
  const cut = await cutAlpha(maskPng, width, height);
  const [toR, toG, toB] = saturation(VEIL_SATURATION);
  const out = new Uint8ClampedArray(width * height * RGBA);
  for (let i = 0; i < cut.length; i++) {
    const inCut = cut[i] / 255;
    if (inCut === 0) continue;
    const at = i * RGBA;
    const rgb = [pixels[at], pixels[at + 1], pixels[at + 2]];
    const weigh = (row: number[]) => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2];
    const art = (pixels[at + 3] / 255) * inCut;
    const wash = VEIL_WASH.alpha * inCut;
    const alpha = wash + art * (1 - wash);
    const over = (washed: number, color: number) =>
      (washed * wash + color * art * (1 - wash)) / alpha;
    out[at] = over(VEIL_WASH.r, weigh(toR));
    out[at + 1] = over(VEIL_WASH.g, weigh(toG));
    out[at + 2] = over(VEIL_WASH.b, weigh(toB));
    out[at + 3] = alpha * 255;
  }
  return new Uint8Array(await sharp(Buffer.from(out.buffer), raw(width, height)).png().toBuffer());
}
