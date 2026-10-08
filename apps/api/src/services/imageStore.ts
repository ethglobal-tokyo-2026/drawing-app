import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { access, link, readFile, rm, writeFile } from "node:fs/promises";
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
import { veiledPng } from "./veil.ts";

// A sticker's images are small and made once, so libvips keeps no cache of them between calls.
sharp.cache(false);

const pngKinds = stickerPngsSchema.keyof().options;
const webpKinds = stickerWebpsSchema.keyof().options;

/** The sticker's WebP quality: its colors hide the loss, where the masks' edges would show it. */
const STICKER_WEBP_QUALITY = 85;

/** `{contentHash}.png` for the sticker PNG, `{contentHash}.{kind}.png` for the rest. */
export const pngName = (contentHash: string, kind: StickerPngKind) =>
  kind === "png" ? `${contentHash}.png` : `${contentHash}.${kind}.png`;

/**
 * `{contentHash}.webp` for the sticker, `{contentHash}.{kind}.webp` for the rest. Every image is
 * cached for good, so a WebP made a new way needs a new name.
 */
const webpName = (contentHash: string, kind: StickerWebpKind) =>
  kind === "sticker" ? `${contentHash}.webp` : `${contentHash}.${kind}.webp`;

/** A sticker's image URLs under `baseUrl`. */
function stickerImageUrls(baseUrl: string, contentHash: string): StickerImages {
  const base = baseUrl.replace(/\/+$/, "");
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

/** The URLs among a sticker's images that show its drawing: its PNG, its WebP and the flat sheet. */
export const drawingUrls = ({ png, flat, webp }: StickerImages) => [png, flat, webp.sticker];

/** A sticker's image URLs for each viewer, under `imageBaseUrl`. */
export function imageUrls(imageBaseUrl: string): Pick<ImageStore, "urls" | "veiledUrls"> {
  return {
    urls: (contentHash) => stickerImageUrls(imageBaseUrl, contentHash),
    veiledUrls: (contentHash, veiledHash) => {
      const shared = stickerImageUrls(imageBaseUrl, contentHash);
      const veiled = stickerImageUrls(imageBaseUrl, veiledHash);
      return {
        ...shared,
        png: veiled.png,
        flat: veiled.png,
        webp: { ...shared.webp, sticker: veiled.webp.sticker },
      };
    },
  };
}

/**
 * Writes a file unless one is already there, so what a CDN URL serves never changes. Linking a
 * finished temporary file means a crash can't leave a partial file under the real name.
 */
async function writeIfAbsent(path: string, bytes: Uint8Array) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes);
    await link(temporary, path);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  } finally {
    // force: a write that failed to open made no file, and its own error is the one to report.
    await rm(temporary, { force: true });
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

/**
 * Makes the WebP files a stored sticker lacks from its PNGs on disk, the first seal's, so a save cut
 * off before its WebPs is finished by the next one.
 */
async function writeMissingWebps(imageDir: string, contentHash: string) {
  const readPng = (kind: StickerPngKind) =>
    readFile(join(imageDir, pngName(contentHash, kind))).then((bytes) => new Uint8Array(bytes));
  await Promise.all(
    webpKinds.map(async (kind) => {
      const path = join(imageDir, webpName(contentHash, kind));
      if (!(await exists(path))) await writeIfAbsent(path, await makeWebp(kind, readPng));
    }),
  );
}

/**
 * Makes the veiled image of the sticker stored under `contentHash`, from its PNG and mask on disk, and
 * stores it with its WebP copy under its own content hash, which it answers.
 */
async function saveVeiled(imageDir: string, contentHash: string): Promise<string> {
  checkContentHash(contentHash);
  const readPng = (kind: StickerPngKind) =>
    readFile(join(imageDir, pngName(contentHash, kind))).then((bytes) => new Uint8Array(bytes));
  const veiled = await veiledPng(await readPng("png"), await readPng("mask"));
  const veiledHash = `0x${createHash("sha256").update(veiled).digest("hex")}`;
  await writeIfAbsent(join(imageDir, pngName(veiledHash, "png")), veiled);
  const webp = join(imageDir, webpName(veiledHash, "sticker"));
  if (!(await exists(webp))) {
    await writeIfAbsent(webp, await makeWebp("sticker", () => Promise.resolve(veiled)));
  }
  return veiledHash;
}

/** Writes sticker images into the folder the box serves at `imageBaseUrl`. */
export function createDiskImageStore(imageDir: string, imageBaseUrl: string): ImageStore {
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
    saveVeiled: (contentHash) => saveVeiled(imageDir, contentHash),
    ...imageUrls(imageBaseUrl),
  };
}
