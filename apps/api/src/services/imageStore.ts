import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { access, link, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageStore } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import {
  bytes32Schema,
  stickerPngsSchema,
  stickerWebpsSchema,
  type StickerImages,
  type StickerPngKind,
  type StickerWebpKind,
} from "../shapes.ts";
import {
  domedPaper,
  flatPaper,
  flattenDomedSeal,
  liftPaper,
  paperOnly,
  type Pixels,
} from "../stickers/flattenDomedSeal.ts";
import { foilMaskAlpha } from "./foilMask.ts";
import { cutAlpha, veiledPng } from "./veil.ts";

// A sticker's images are small and made once, so libvips keeps no cache of them between calls.
sharp.cache(false);

const pngKinds = stickerPngsSchema.keyof().options;
const webpKinds = stickerWebpsSchema.keyof().options;

/** The sticker's WebP quality: its colors hide the loss, where the masks' edges would show it. */
const STICKER_WEBP_QUALITY = 85;

/** How many stickers a run of writeMissingStickerWebps logs its progress after. */
const WEBP_PROGRESS_EVERY = 100;

/** `{contentHash}.png` for the sticker PNG, `{contentHash}.{kind}.png` for the rest. */
export const pngName = (contentHash: string, kind: StickerPngKind) =>
  kind === "png" ? `${contentHash}.png` : `${contentHash}.${kind}.png`;

/**
 * `{contentHash}.display.webp` for the sticker, `{contentHash}.{kind}.webp` for the rest. Every image
 * is cached for good, so a WebP made a new way needs a new name: the sticker's was
 * `{contentHash}.webp` while it showed the resin dome sealed into its PNG.
 */
const webpName = (contentHash: string, kind: StickerWebpKind) =>
  kind === "sticker" ? `${contentHash}.display.webp` : `${contentHash}.${kind}.webp`;

/** The sharp copy: `{contentHash}.sharp.png`, and its WebP copy `{contentHash}.sharp.webp`. */
const sharpNames = (contentHash: string) => ({
  png: `${contentHash}.sharp.png`,
  webp: `${contentHash}.sharp.webp`,
});

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
    sharp: {
      png: `${base}/${sharpNames(contentHash).png}`,
      webp: `${base}/${sharpNames(contentHash).webp}`,
    },
  };
}

/**
 * The URLs among a sticker's images that show its drawing: its PNG, its WebP, the flat sheet, its
 * sharp copy's PNG and WebP, and the WebP that showed the resin dome, still on the box and maybe in
 * the CDN.
 */
export const drawingUrls = ({ png, flat, webp, sharp }: StickerImages) => [
  png,
  flat,
  webp.sticker,
  png.replace(/\.png$/, ".webp"),
  ...(sharp ? [sharp.png, sharp.webp] : []),
];

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
        sharp: null,
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

/** A PNG's pixels, RGBA. */
async function pixelsOf(png: Uint8Array): Promise<Pixels> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

const rawOf = ({ width, height }: Pixels) => ({ raw: { width, height, channels: 4 } }) as const;

const stickerWebpOf = (image: Uint8Array | Pixels) =>
  (image instanceof Uint8Array ? sharp(image) : sharp(image.data, rawOf(image)))
    .webp({ quality: STICKER_WEBP_QUALITY })
    .toBuffer();

/** The sticker's WebP: its PNG, with the paper flat where it was sealed under the resin dome. */
async function stickerWebp(png: Uint8Array, maskPng: Uint8Array): Promise<Uint8Array> {
  const sticker = await pixelsOf(png);
  const flat = flattenDomedSeal(sticker, await cutAlpha(maskPng, sticker.width, sticker.height));
  return stickerWebpOf(flat ? { ...sticker, data: flat } : png);
}

/**
 * The veiled image's WebP. Where the sticker was sealed under the resin dome, its paper is lifted the
 * same way, from the dome's paper as the veil shows it to white paper as the veil shows it.
 */
async function veiledWebp(veiled: Uint8Array, png: Uint8Array, maskPng: Uint8Array) {
  const sticker = await pixelsOf(png);
  const cut = await cutAlpha(maskPng, sticker.width, sticker.height);
  const paper = domedPaper(sticker, cut);
  if (!paper) return stickerWebpOf(veiled);
  const veiledPaper = async (color: ArrayLike<number>) => {
    const alone = await sharp(paperOnly(sticker, cut, color), rawOf(sticker))
      .png()
      .toBuffer();
    return (await pixelsOf(await veiledPng(alone, maskPng))).data;
  };
  const [sealedPaper, whitePaper, shown] = await Promise.all([
    veiledPaper(paper),
    veiledPaper(flatPaper(cut.length)),
    pixelsOf(veiled),
  ]);
  return stickerWebpOf({ ...shown, data: liftPaper(shown.data, cut, sealedPaper, whitePaper) });
}

/** One WebP file, made from the sticker's PNGs. */
async function makeWebp(
  kind: StickerWebpKind,
  readPng: (kind: StickerPngKind) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  switch (kind) {
    case "sticker":
      return stickerWebp(await readPng("png"), await readPng("mask"));
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

const pngReader = (imageDir: string, contentHash: string) => (kind: StickerPngKind) =>
  readFile(join(imageDir, pngName(contentHash, kind))).then((bytes) => new Uint8Array(bytes));

/**
 * Makes the WebP files a stored sticker lacks from its PNGs on disk, the first seal's, so a save cut
 * off before its WebPs is finished by the next one.
 */
async function writeMissingWebps(imageDir: string, contentHash: string) {
  const readPng = pngReader(imageDir, contentHash);
  await Promise.all(
    webpKinds.map(async (kind) => {
      const path = join(imageDir, webpName(contentHash, kind));
      if (!(await exists(path))) await writeIfAbsent(path, await makeWebp(kind, readPng));
    }),
  );
}

/** Makes the veiled image's WebP, unless it's there, from its PNG and the sticker's on disk. */
async function writeVeiledWebp(imageDir: string, contentHash: string, veiledHash: string) {
  checkContentHash(veiledHash);
  const path = join(imageDir, webpName(veiledHash, "sticker"));
  if (await exists(path)) return;
  const readPng = pngReader(imageDir, contentHash);
  const [veiled, png, mask] = await Promise.all([
    pngReader(imageDir, veiledHash)("png"),
    readPng("png"),
    readPng("mask"),
  ]);
  await writeIfAbsent(path, await veiledWebp(veiled, png, mask));
}

/**
 * Makes the veiled image of the sticker stored under `contentHash`, from its PNG and mask on disk, and
 * stores it with its WebP copy under its own content hash, which it answers.
 */
async function saveVeiled(imageDir: string, contentHash: string): Promise<string> {
  checkContentHash(contentHash);
  const readPng = pngReader(imageDir, contentHash);
  const veiled = await veiledPng(await readPng("png"), await readPng("mask"));
  const veiledHash = `0x${createHash("sha256").update(veiled).digest("hex")}`;
  await writeIfAbsent(join(imageDir, pngName(veiledHash, "png")), veiled);
  await writeVeiledWebp(imageDir, contentHash, veiledHash);
  return veiledHash;
}

/** The sharp copy and its WebP, made from the PNG on disk, the first seal's, as writeMissingWebps does. */
async function saveSharp(imageDir: string, contentHash: string, sharpPng: Uint8Array) {
  const names = sharpNames(contentHash);
  await writeIfAbsent(join(imageDir, names.png), sharpPng);
  const webp = join(imageDir, names.webp);
  if (await exists(webp)) return;
  const stored = await readFile(join(imageDir, names.png));
  await writeIfAbsent(webp, await sharp(stored).webp({ quality: STICKER_WEBP_QUALITY }).toBuffer());
}

/** A stored sticker's content hash, and its veiled image's when it's NSFW. */
interface StoredSticker {
  contentHash: string;
  veiledHash: string | null;
}

/**
 * Makes the WebP files stored stickers lack from their PNGs on disk, one sticker at a time: each
 * display WebP, when its name changes. A sticker whose files can't be made is logged and skipped.
 */
export async function writeMissingStickerWebps(imageDir: string, stored: StoredSticker[]) {
  logInfo("images.webp.start", { count: stored.length });
  let done = 0;
  let failed = 0;
  for (const { contentHash, veiledHash } of stored) {
    try {
      checkContentHash(contentHash);
      await writeMissingWebps(imageDir, contentHash);
      if (veiledHash) await writeVeiledWebp(imageDir, contentHash, veiledHash);
    } catch (error) {
      failed++;
      const which = veiledHash ? `${contentHash}, veiled as ${veiledHash}` : contentHash;
      logFailure("images.webp.failed", error, { reason: `The WebPs of ${which} failed` });
    }
    done++;
    if (done % WEBP_PROGRESS_EVERY === 0) {
      logInfo("images.webp.progress", { count: done, left: stored.length - done, failed });
    }
  }
  logInfo("images.webp.done", { count: done, failed });
}

/** Writes sticker images into the folder the box serves at `imageBaseUrl`. */
export function createDiskImageStore(imageDir: string, imageBaseUrl: string): ImageStore {
  mkdirSync(imageDir, { recursive: true });
  return {
    save: async (contentHash, pngs, sharp) => {
      checkContentHash(contentHash);
      await Promise.all(
        pngKinds.map((kind) =>
          writeIfAbsent(join(imageDir, pngName(contentHash, kind)), pngs[kind]),
        ),
      );
      await writeMissingWebps(imageDir, contentHash);
      if (sharp) await saveSharp(imageDir, contentHash, sharp);
    },
    saveVeiled: (contentHash) => saveVeiled(imageDir, contentHash),
    ...imageUrls(imageBaseUrl),
  };
}
