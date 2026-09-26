import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { access, link, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageStore } from "../deps.ts";
import {
  bytes32Schema,
  stickerPngsSchema,
  stickerWebpsSchema,
  type StickerImages,
  type StickerPngKind,
  type StickerWebpKind,
} from "../shapes.ts";
import { foilMaskAlpha } from "./foilMask.ts";

// A sticker's images are small and made once, so libvips keeps no cache of them between calls.
sharp.cache(false);

const pngKinds = stickerPngsSchema.keyof().options;
export const webpKinds = stickerWebpsSchema.keyof().options;

/** The sticker's WebP quality: its colors hide the loss, where the masks' edges would show it. */
const STICKER_WEBP_QUALITY = 85;

/** `{contentHash}.png` for the sticker PNG, `{contentHash}.{kind}.png` for the rest. */
const pngName = (contentHash: string, kind: StickerPngKind) =>
  kind === "png" ? `${contentHash}.png` : `${contentHash}.${kind}.png`;

/**
 * `{contentHash}.webp` for the sticker, `{contentHash}.{kind}.webp` for the rest. Every image is
 * cached for good, so a WebP made a new way needs a new name.
 */
const webpName = (contentHash: string, kind: StickerWebpKind) =>
  kind === "sticker" ? `${contentHash}.webp` : `${contentHash}.${kind}.webp`;

/** A sticker's image URLs on the CDN. */
export function stickerImageUrls(cdnBaseUrl: string, contentHash: string): StickerImages {
  const base = cdnBaseUrl.replace(/\/+$/, "");
  const png = (kind: StickerPngKind) => `${base}/${pngName(contentHash, kind)}`;
  const webp = (kind: StickerWebpKind) => `${base}/${webpName(contentHash, kind)}`;
  return {
    png: png("png"),
    mask: png("mask"),
    spec: png("spec"),
    rim: png("rim"),
    flat: png("flat"),
    webp: {
      sticker: webp("sticker"),
      mask: webp("mask"),
      spec: webp("spec"),
      rim: webp("rim"),
      foil: webp("foil"),
    },
  };
}

/**
 * Writes a file unless one is already there, so what a CDN URL serves never changes. Linking a
 * finished temporary file means a crash can't leave a partial file under the real name.
 */
async function writeIfAbsent(path: string, bytes: Uint8Array) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  try {
    await link(temporary, path);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  } finally {
    await unlink(temporary);
  }
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

/** The hash becomes a file name, so nothing but a hash may reach the disk. */
function checkContentHash(contentHash: string) {
  if (!bytes32Schema.safeParse(contentHash).success) {
    throw new Error(`Not a content hash: ${contentHash}`);
  }
}

/** The foil band's mask, made from the cut's mask: white, with the band as its alpha. */
async function foilWebp(maskPng: Uint8Array): Promise<Uint8Array> {
  const { data, info } = await sharp(maskPng)
    .ensureAlpha()
    .extractChannel(3)
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  const alpha = foilMaskAlpha(data, info.width, info.height);
  const rgba = Buffer.alloc(alpha.length * 4, 255);
  for (let i = 0; i < alpha.length; i++) rgba[i * 4 + 3] = alpha[i];
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ lossless: true })
    .toBuffer();
}

/** One WebP file, made from the sticker's PNGs. */
async function makeWebp(
  kind: StickerWebpKind,
  readPng: (kind: StickerPngKind) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  switch (kind) {
    case "sticker":
      return sharp(await readPng("png"))
        .webp({ quality: STICKER_WEBP_QUALITY })
        .toBuffer();
    case "mask":
    case "spec":
    case "rim":
      return sharp(await readPng(kind))
        .webp({ lossless: true })
        .toBuffer();
    case "foil":
      return foilWebp(await readPng("mask"));
  }
}

/** The WebP files a stored sticker lacks. */
export async function missingWebps(
  imageDir: string,
  contentHash: string,
): Promise<StickerWebpKind[]> {
  checkContentHash(contentHash);
  const present = await Promise.all(
    webpKinds.map((kind) => exists(join(imageDir, webpName(contentHash, kind)))),
  );
  return webpKinds.filter((_, i) => !present[i]);
}

/**
 * Makes the WebP files a stored sticker lacks from its PNGs on disk, the first seal's, and returns
 * the kinds it wrote.
 */
export async function writeMissingWebps(
  imageDir: string,
  contentHash: string,
): Promise<StickerWebpKind[]> {
  const missing = await missingWebps(imageDir, contentHash);
  const readPng = (kind: StickerPngKind) =>
    readFile(join(imageDir, pngName(contentHash, kind))).then((bytes) => new Uint8Array(bytes));
  await Promise.all(
    missing.map(async (kind) =>
      writeIfAbsent(join(imageDir, webpName(contentHash, kind)), await makeWebp(kind, readPng)),
    ),
  );
  return missing;
}

export interface DiskImageStore extends ImageStore {
  /** Writes the immutable metadata file whose URL is the NFT's tokenURI. */
  saveMetadata: (stickerId: string, metadata: object) => Promise<void>;
}

/** Writes sticker images into the folder the CDN serves. */
export function createDiskImageStore(imageDir: string, cdnBaseUrl: string): DiskImageStore {
  mkdirSync(imageDir, { recursive: true });
  return {
    save: async (contentHash, pngs) => {
      checkContentHash(contentHash);
      await Promise.all(
        pngKinds.map((kind) =>
          writeIfAbsent(join(imageDir, pngName(contentHash, kind)), pngs[kind]),
        ),
      );
      await writeMissingWebps(imageDir, contentHash);
    },
    urls: (contentHash) => stickerImageUrls(cdnBaseUrl, contentHash),
    saveMetadata: async (stickerId, metadata) => {
      if (!/^[0-9a-f-]{36}$/i.test(stickerId)) throw new Error(`Not a sticker id: ${stickerId}`);
      await writeIfAbsent(
        join(imageDir, `${stickerId}.json`),
        new TextEncoder().encode(JSON.stringify(metadata)),
      );
    },
  };
}
