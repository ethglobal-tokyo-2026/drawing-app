import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stickerPngsSchema, stickerWebpsSchema, type StickerImages } from "../shapes.ts";
import { sealImages, STICKER_SIZE } from "../stickers/testPngs.ts";
import { foilMaskAlpha } from "./foilMask.ts";
import { createDiskImageStore, pngName, storedImageFile } from "./imageStore.ts";

const sha256Hex = (bytes: Uint8Array) => `0x${createHash("sha256").update(bytes).digest("hex")}`;

const IMAGE_FOLDER = "/stickers/";
/** Where the box serves the image folder. */
const IMAGE_BASE_URL = `https://box.test${IMAGE_FOLDER}`;
const pngKinds = stickerPngsSchema.keyof().options;
const webpKinds = stickerWebpsSchema.keyof().options;

/** The cut as a mask: white, opaque inside a `side` px square in the middle, clear elsewhere. */
async function squareMask(side: number) {
  const { width, height } = STICKER_SIZE;
  const white = { r: 255, g: 255, b: 255 };
  const square = { create: { width: side, height: side, channels: 4, background: white } } as const;
  const png = await sharp({
    create: { width, height, channels: 4, background: { ...white, alpha: 0 } },
  })
    .composite([{ input: square, left: (width - side) / 2, top: (height - side) / 2 }])
    .png()
    .toBuffer();
  return new Uint8Array(png);
}

let imageDir: string;
beforeEach(() => {
  imageDir = mkdtempSync(join(tmpdir(), "drawing-app-images-"));
});
afterEach(() => {
  rmSync(imageDir, { recursive: true });
});

/** The file a CDN URL points at, in the image folder the store writes. */
const fileAt = (url: string) => join(imageDir, new URL(url).pathname.slice(IMAGE_FOLDER.length));

/** A disk image store with `pngs` saved in it under their content hash. */
async function savedSticker(pngs = sealImages()) {
  const store = createDiskImageStore(imageDir, IMAGE_BASE_URL);
  const contentHash = sha256Hex(pngs.png);
  await store.save(contentHash, pngs);
  return { store, pngs, contentHash };
}

/** An image's alpha channel, a byte a pixel, and its size. */
async function alphaOf(image: string | Uint8Array) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { alpha: new Uint8Array(data), width: info.width, height: info.height };
}

describe("the disk image store", () => {
  it("writes each PNG and each WebP made from them where its CDN URL points", async () => {
    const { store, pngs, contentHash } = await savedSticker();
    const { webp, ...pngUrls } = store.urls(contentHash);
    for (const kind of pngKinds) {
      expect(new URL(pngUrls[kind]).pathname).toMatch(`${IMAGE_FOLDER}${contentHash}.`);
      expect(new Uint8Array(readFileSync(fileAt(pngUrls[kind])))).toEqual(pngs[kind]);
    }
    for (const kind of webpKinds) {
      expect(new URL(webp[kind]).pathname).toMatch(`${IMAGE_FOLDER}${contentHash}.`);
      const { format, width } = await sharp(fileAt(webp[kind])).metadata();
      expect(format).toBe("webp");
      // The sticker, its mask and the foil band's mask are all the sticker's size.
      const from = kind === "sticker" ? "png" : kind === "foil" ? "mask" : kind;
      expect(width).toBe((await sharp(pngs[from]).metadata()).width);
    }
  });

  it("keeps the images first saved under a content hash", async () => {
    const { store, pngs, contentHash } = await savedSticker();
    await store.save(contentHash, { ...pngs, mask: await squareMask(40) });
    expect(new Uint8Array(readFileSync(fileAt(store.urls(contentHash).mask)))).toEqual(pngs.mask);
    expect(readdirSync(imageDir)).toHaveLength(pngKinds.length + webpKinds.length);
  });

  it("makes the foil band's mask from the cut's alpha", async () => {
    const { store, pngs, contentHash } = await savedSticker({
      ...sealImages(),
      mask: await squareMask(60),
    });
    const cut = await alphaOf(pngs.mask);
    const foil = await alphaOf(fileAt(store.urls(contentHash).webp.foil));
    const band = foilMaskAlpha(cut.alpha, cut.width, cut.height);
    expect([foil.width, foil.height]).toEqual([cut.width, cut.height]);
    // The first pixel that differs, as a whole image's diff takes too long to print.
    expect(foil.alpha.findIndex((alpha, i) => alpha !== band[i])).toBe(-1);
  });

  it("makes a WebP file a stored sticker lacks from its stored PNGs on a later save", async () => {
    const { store, pngs, contentHash } = await savedSticker();
    const foil = fileAt(store.urls(contentHash).webp.foil);
    const made = readFileSync(foil);
    unlinkSync(foil);
    await store.save(contentHash, { ...pngs, mask: await squareMask(40) });
    expect(readFileSync(foil)).toEqual(made);
  });

  it("refuses a name that isn't a content hash", async () => {
    const store = createDiskImageStore(imageDir, IMAGE_BASE_URL);
    await expect(store.save("../escape", sealImages())).rejects.toThrow(/content hash/);
  });

  it("hands out only names the image routes serve, the image each sticker is minted with too", () => {
    const store = createDiskImageStore(imageDir, IMAGE_BASE_URL);
    const contentHash = sha256Hex(new Uint8Array([1]));
    const veiledHash = sha256Hex(new Uint8Array([2]));
    const everyUrl = ({ webp, sharp, ...pngs }: StickerImages) => [
      ...Object.values(pngs),
      ...Object.values(webp),
      ...(sharp ? [sharp.png, sharp.webp] : []),
    ];
    const handedOut = [
      ...everyUrl(store.urls(contentHash)),
      ...everyUrl(store.veiledUrls(contentHash, veiledHash)),
      ...store.drawingUrls(contentHash),
    ].map((url) => new URL(url).pathname.slice(IMAGE_FOLDER.length));
    // Sui's Display joins the minted name to IMAGE_BASE_URL, so it's each sticker's picture on chain.
    const minted = [contentHash, veiledHash].map((hash) => pngName(hash, "png"));
    for (const name of [...handedOut, ...minted])
      expect(storedImageFile(name), name).not.toBeNull();
  });
});
