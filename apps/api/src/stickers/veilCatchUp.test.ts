import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stickers } from "@drawing-app/db";
import { createTestDb, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { keccak256 } from "viem";
import { describe, expect, it, onTestFinished } from "vitest";
import { createDiskImageStore } from "../services/imageStore.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { sealImages, testPng, STICKER_SIZE } from "./testPngs.ts";
import { veilNsfwStickers } from "./veilCatchUp.ts";

/** Every file in the folder, by name, with its bytes. */
const filesIn = (imageDir: string) =>
  Object.fromEntries(
    readdirSync(imageDir)
      .sort()
      .map((name) => [name, readFileSync(join(imageDir, name))]),
  );

/** The catch-up's test: a disk image store in a folder of its own, and stickers sealed into it. */
async function catchUpTest() {
  const { db } = await createTestDb();
  const imageDir = mkdtempSync(join(tmpdir(), "veil-catch-up-"));
  onTestFinished(() => rmSync(imageDir, { recursive: true, force: true }));
  const images = createDiskImageStore(imageDir, "https://cdn.test");
  const artistId = insertUser(db, { nsfwOptedInAt: new Date() });
  let sealedCount = 0;

  /**
   * A sticker whose images are stored as Sealing leaves them, minted with metadata naming `image`:
   * its sticker PNG unless a function picks another of its URLs.
   */
  const sealed = async (
    { nsfw = false, veiled = false } = {},
    image = (urls: ReturnType<typeof images.urls>) => urls.png,
  ) => {
    const { width, height } = STICKER_SIZE;
    const pngs = { ...sealImages(), png: testPng(width, height, `sticker ${++sealedCount}`) };
    const contentHash = keccak256(pngs.png);
    await images.save(contentHash, pngs);
    const veiledHash = veiled ? await images.saveVeiled(contentHash) : null;
    // The metadata file is named by the sticker id, which Sealing makes as a UUID.
    const id = insertSealedSticker(db, artistId, {
      id: randomUUID(),
      nsfw,
      contentHash,
      veiledHash,
    });
    const named = image(images.urls(contentHash));
    await images.saveMetadata(id, { name: `Sticker ${id}`, image: named, external_url: named });
    return id;
  };
  const row = (id: string) => {
    const sticker = db.select().from(stickers).where(eq(stickers.id, id)).get();
    if (!sticker) throw new Error(`Sticker ${id} is missing`);
    return sticker;
  };
  const metadataOf = (id: string): unknown =>
    JSON.parse(readFileSync(join(imageDir, `${id}.json`), "utf8"));
  const catchUp = () => veilNsfwStickers({ db, images });
  return { images, imageDir, sealed, row, metadataOf, catchUp };
}

describe("the veil catch-up", () => {
  it("veils each NSFW sticker once, points its metadata at the veil, and then writes nothing", async () => {
    const test = await catchUpTest();
    // Minted before Sealing veiled anything, and minted before its own veil existed.
    const unveiledId = await test.sealed({ nsfw: true });
    const lateVeilId = await test.sealed({ nsfw: true, veiled: true }, (urls) => urls.mask);
    const plainId = await test.sealed();
    const plainMetadata = test.metadataOf(plainId);

    expect(await test.catchUp()).toEqual({ veiled: 1, rewritten: 2, failed: 0 });
    for (const id of [unveiledId, lateVeilId]) {
      const { veiledHash, contentHash } = test.row(id);
      if (!veiledHash) throw new Error(`The catch-up left sticker ${id} without its veil`);
      const veiled = test.images.urls(veiledHash);
      expect(readdirSync(test.imageDir)).toEqual(
        expect.arrayContaining([`${veiledHash}.png`, `${veiledHash}.webp`]),
      );
      expect(test.metadataOf(id)).toEqual({
        name: `Sticker ${id}`,
        image: veiled.png,
        external_url: veiled.png,
      });
      expect(JSON.stringify(test.metadataOf(id))).not.toContain(contentHash);
    }
    expect(test.row(plainId).veiledHash).toBeNull();
    expect(test.metadataOf(plainId)).toEqual(plainMetadata);

    const files = filesIn(test.imageDir);
    expect(await test.catchUp()).toEqual({ veiled: 0, rewritten: 0, failed: 0 });
    expect(filesIn(test.imageDir)).toEqual(files);
  });
});
