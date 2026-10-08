import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STICKER_SIZE } from "../stickers/testPngs.ts";
import { VEIL_BLUR_MAX_SIDE, VEIL_BLUR_SHARE, veiledPng } from "./veil.ts";

const RGBA = 4;
/** The test drawing's squares, in pixels: fine detail a veil must not let through. */
const CELL = 8;
/** Black and white squares' average. */
const GRAY = 128;
/** Wider than the blur works at, and short, so it's cheap to veil. */
const OVERSIZED = { width: 2 * VEIL_BLUR_MAX_SIDE, height: VEIL_BLUR_MAX_SIDE / 4 };

type Size = typeof STICKER_SIZE;

afterEach(() => {
  vi.restoreAllMocks();
});

/** A PNG of `size`'s RGBA pixels, each painted by `paint`. */
async function png(
  { width, height }: Size,
  paint: (x: number, y: number) => [number, number, number, number],
) {
  const data = Buffer.alloc(width * height * RGBA);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * RGBA);
  }
  const encoded = await sharp(data, { raw: { width, height, channels: RGBA } })
    .png()
    .toBuffer();
  return new Uint8Array(encoded);
}

/**
 * A checkerboard drawing at `size`, a mid-gray one its squares average to, and their cut: a square
 * in the middle, with the clear margin a sticker keeps around it.
 */
async function drawings(size: Size) {
  const { width, height } = size;
  const inCut = (x: number, y: number) =>
    Math.abs(x - width / 2) < height / 3 && Math.abs(y - height / 2) < height / 3;
  const alpha = (x: number, y: number) => (inCut(x, y) ? 255 : 0);
  const [checkerboard, gray, cut] = await Promise.all([
    png(size, (x, y) => {
      const ink = (Math.floor(x / CELL) + Math.floor(y / CELL)) % 2 === 0 ? 0 : 255;
      return [ink, ink, ink, alpha(x, y)];
    }),
    png(size, (x, y) => [GRAY, GRAY, GRAY, alpha(x, y)]),
    png(size, (x, y) => [255, 255, 255, alpha(x, y)]),
  ]);
  return { checkerboard, gray, cut, inCut };
}

describe("the veiled image", () => {
  it.each([
    { what: "an app-sized sticker", size: STICKER_SIZE },
    { what: "a sticker wider than the blur works at", size: OVERSIZED },
  ])(
    "blurs $what past telling it apart, at its own size, and shows nothing outside its cut",
    async ({ size }) => {
      const { width, height } = size;
      const { checkerboard, gray, cut, inCut } = await drawings(size);
      // Its squares average to mid-gray, so a veil that lets nothing through matches a gray one's.
      const [veiled, veiledGray] = await Promise.all(
        [checkerboard, gray].map(async (drawing) =>
          sharp(await veiledPng(drawing, cut))
            .raw()
            .toBuffer({ resolveWithObject: true }),
        ),
      );
      expect(veiled.info).toMatchObject({ width, height, channels: RGBA });

      let furthest = 0;
      const outsideAlpha = new Set<number>();
      for (let i = 0; i < width * height; i++) {
        const at = i * RGBA;
        if (!inCut(i % width, Math.floor(i / width))) outsideAlpha.add(veiled.data[at + 3]);
        for (let c = 0; c < RGBA; c++) {
          furthest = Math.max(furthest, Math.abs(veiled.data[at + c] - veiledGray.data[at + c]));
        }
      }
      // The drawing spans every level from black to white; its veil keeps a sliver of that.
      expect(furthest).toBeLessThan(255 / CELL);
      expect([...outsideAlpha]).toEqual([0]);
    },
  );

  it("blurs a sticker wider than VEIL_BLUR_MAX_SIDE as a copy scaled down to it, so the blur's cost stops growing with the sticker", async () => {
    const blur = vi.spyOn(sharp.prototype, "blur");
    const { checkerboard, cut } = await drawings(OVERSIZED);
    await veiledPng(checkerboard, cut);
    // The blur's radius is its share of the width it works at.
    expect(blur).toHaveBeenCalledWith(VEIL_BLUR_SHARE * VEIL_BLUR_MAX_SIDE);
  });
});
