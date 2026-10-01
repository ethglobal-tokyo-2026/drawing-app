import { mkdtempSync, readdirSync, rmSync } from "node:fs";
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
import { veilUnveiled } from "./veilCatchUp.ts";

/** A disk image store in a folder of its own, removed after the test. */
function diskStore() {
  const imageDir = mkdtempSync(join(tmpdir(), "veil-catch-up-"));
  onTestFinished(() => rmSync(imageDir, { recursive: true, force: true }));
  return { imageDir, images: createDiskImageStore(imageDir, "https://cdn.test") };
}

describe("the veil catch-up", () => {
  it("makes each NSFW sticker's veiled image once, and does nothing the second time", async () => {
    const { db } = await createTestDb();
    const { imageDir, images } = diskStore();
    const artistId = insertUser(db, { ageVerifiedAt: new Date() });
    /** A sticker whose images are stored, as Sealing leaves them. */
    const sealed = async (nsfw: boolean) => {
      const pngs = {
        ...sealImages(),
        png: testPng(STICKER_SIZE.width, STICKER_SIZE.height, `${nsfw}`),
      };
      const contentHash = keccak256(pngs.png);
      await images.save(contentHash, pngs);
      return insertSealedSticker(db, artistId, { nsfw, contentHash });
    };
    const nsfwId = await sealed(true);
    const plainId = await sealed(false);
    const veiledHashOf = (id: string) =>
      db.select({ veiledHash: stickers.veiledHash }).from(stickers).where(eq(stickers.id, id)).get()
        ?.veiledHash;

    expect(await veilUnveiled({ db, images })).toEqual({ veiled: 1, failed: 0 });
    const veiledHash = veiledHashOf(nsfwId);
    if (!veiledHash) throw new Error("The catch-up left the NSFW sticker without its veil");
    expect(readdirSync(imageDir)).toEqual(
      expect.arrayContaining([`${veiledHash}.png`, `${veiledHash}.webp`]),
    );
    expect(veiledHashOf(plainId)).toBeNull();

    const files = readdirSync(imageDir).sort();
    expect(await veilUnveiled({ db, images })).toEqual({ veiled: 0, failed: 0 });
    expect(readdirSync(imageDir).sort()).toEqual(files);
    expect(veiledHashOf(nsfwId)).toBe(veiledHash);
  });
});
