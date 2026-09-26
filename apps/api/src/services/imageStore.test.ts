import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { keccak256 } from "../keccak256.ts";
import { stickerImagesSchema } from "../shapes.ts";
import { createDiskImageStore } from "./imageStore.ts";

const CDN_FOLDER = "/stickers/";
const pngs = {
  png: new Uint8Array([1]),
  mask: new Uint8Array([2]),
  spec: new Uint8Array([3]),
  rim: new Uint8Array([4]),
  flat: new Uint8Array([5]),
};

let imageDir: string;
beforeEach(() => {
  imageDir = mkdtempSync(join(tmpdir(), "drawing-app-images-"));
});
afterEach(() => {
  rmSync(imageDir, { recursive: true });
});

describe("the disk image store", () => {
  it("writes each image where its CDN URL points, named by the content hash", async () => {
    const store = createDiskImageStore(imageDir, `https://cdn.test${CDN_FOLDER}`);
    const contentHash = keccak256(pngs.png);
    await store.save(contentHash, pngs);
    const urls = store.urls(contentHash);
    for (const kind of stickerImagesSchema.keyof().options) {
      const { pathname } = new URL(urls[kind]);
      expect(pathname.startsWith(`${CDN_FOLDER}${contentHash}.`)).toBe(true);
      const onDisk = readFileSync(join(imageDir, pathname.slice(CDN_FOLDER.length)));
      expect(new Uint8Array(onDisk)).toEqual(pngs[kind]);
    }
  });

  it("keeps the images first saved under a content hash", async () => {
    const store = createDiskImageStore(imageDir, "https://cdn.test");
    const contentHash = keccak256(pngs.png);
    await store.save(contentHash, pngs);
    await store.save(contentHash, { ...pngs, mask: new Uint8Array([9]) });
    const maskFile = new URL(store.urls(contentHash).mask).pathname.slice(1);
    expect(new Uint8Array(readFileSync(join(imageDir, maskFile)))).toEqual(pngs.mask);
    expect(readdirSync(imageDir)).toHaveLength(stickerImagesSchema.keyof().options.length);
  });

  it("refuses a name that isn't a content hash", async () => {
    const store = createDiskImageStore(imageDir, "https://cdn.test");
    await expect(store.save("../escape", pngs)).rejects.toThrow(/content hash/);
  });

  it("writes immutable NFT metadata under the sticker id", async () => {
    const store = createDiskImageStore(imageDir, "https://cdn.test");
    const stickerId = "00000000-0000-4000-8000-000000000001";
    await store.saveMetadata(stickerId, { name: "First" });
    await store.saveMetadata(stickerId, { name: "Changed" });
    expect(JSON.parse(readFileSync(join(imageDir, `${stickerId}.json`), "utf8"))).toEqual({
      name: "First",
    });
    await expect(store.saveMetadata("../escape", {})).rejects.toThrow(/sticker id/);
  });
});
