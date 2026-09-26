import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { link, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageStore } from "../deps.ts";
import { bytes32Schema, stickerImagesSchema, type StickerImages } from "../shapes.ts";

const kinds = stickerImagesSchema.keyof().options;

/** `{contentHash}.png` for the sticker PNG, `{contentHash}.{kind}.png` for the rest. */
const fileName = (contentHash: string, kind: keyof StickerImages) =>
  kind === "png" ? `${contentHash}.png` : `${contentHash}.${kind}.png`;

/** A sticker's image URLs on the CDN. */
export function stickerImageUrls(cdnBaseUrl: string, contentHash: string): StickerImages {
  const url = (kind: keyof StickerImages) =>
    `${cdnBaseUrl.replace(/\/+$/, "")}/${fileName(contentHash, kind)}`;
  return {
    png: url("png"),
    mask: url("mask"),
    spec: url("spec"),
    rim: url("rim"),
    flat: url("flat"),
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

/** Writes sticker images into the folder the CDN serves. */
export function createDiskImageStore(imageDir: string, cdnBaseUrl: string): ImageStore {
  mkdirSync(imageDir, { recursive: true });
  return {
    save: async (contentHash, pngs) => {
      // The hash becomes a file name, so nothing but a hash may reach the disk.
      if (!bytes32Schema.safeParse(contentHash).success) {
        throw new Error(`Not a content hash: ${contentHash}`);
      }
      await Promise.all(
        kinds.map((kind) => writeIfAbsent(join(imageDir, fileName(contentHash, kind)), pngs[kind])),
      );
    },
    urls: (contentHash) => stickerImageUrls(cdnBaseUrl, contentHash),
  };
}
