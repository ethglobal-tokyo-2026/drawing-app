import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { STICKER_SIZE } from "../stickers/testPngs.ts";
import { veiledPng } from "./veil.ts";

const { width, height } = STICKER_SIZE;
const RGBA = 4;
/** The test drawing's squares, in pixels: fine detail a veil must not let through. */
const CELL = 8;
/** Black and white squares' average. */
const GRAY = 128;

/** A PNG of `width` × `height` RGBA pixels, each painted by `paint`. */
async function png(paint: (x: number, y: number) => [number, number, number, number]) {
  const data = Buffer.alloc(width * height * RGBA);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * RGBA);
  }
  const encoded = await sharp(data, { raw: { width, height, channels: RGBA } })
    .png()
    .toBuffer();
  return new Uint8Array(encoded);
}

/** The cut: a square in the middle, with the clear margin a sticker keeps around it. */
const inCut = (x: number, y: number) =>
  Math.abs(x - width / 2) < height / 3 && Math.abs(y - height / 2) < height / 3;

describe("the veiled image", () => {
  it("blurs a drawing past telling it apart, and shows nothing outside its cut", async () => {
    const checkerboard = await png((x, y) => {
      const ink = (Math.floor(x / CELL) + Math.floor(y / CELL)) % 2 === 0 ? 0 : 255;
      return [ink, ink, ink, inCut(x, y) ? 255 : 0];
    });
    // Its squares average to mid-gray, so a veil that lets nothing through matches a gray one's.
    const gray = await png((x, y) => [GRAY, GRAY, GRAY, inCut(x, y) ? 255 : 0]);
    const cut = await png((x, y) => [255, 255, 255, inCut(x, y) ? 255 : 0]);
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
  });
});
