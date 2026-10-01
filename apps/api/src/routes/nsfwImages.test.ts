import { stickerPlacements, stickers, stickerTimelapses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createGiftsTestApp } from "../gifts/testGifts.ts";
import { testTimelapse } from "../stickers/testPngs.ts";
import { insertSealedSticker, SPOT } from "../testing/rows.ts";

/**
 * An adult's NSFW sticker with its veiled image and timelapse, on their board and sealed today, and
 * a gift of another of theirs whose link anyone can open.
 */
async function nsfwSticker() {
  const test = await createGiftsTestApp();
  const artistId = insertUser(test.db, { ageVerifiedAt: test.clock.now() });
  const veiledHash = bytes32("veiled image");
  const stickerId = insertSealedSticker(test.db, artistId, { nsfw: true, veiledHash });
  test.db
    .update(stickerPlacements)
    .set(SPOT)
    .where(and(eq(stickerPlacements.userId, artistId), eq(stickerPlacements.stickerId, stickerId)))
    .run();
  test.db
    .insert(stickerTimelapses)
    .values({ stickerId, ops: Buffer.from(testTimelapse()) })
    .run();
  const sticker = test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
  if (!sticker) throw new Error(`Sticker ${stickerId} wasn't inserted`);
  const gift = await test.packagedGift(artistId, { nsfw: true });
  const giftSticker = test.db
    .select()
    .from(stickers)
    .where(eq(stickers.id, gift.gift.stickerId))
    .get();
  if (!giftSticker) throw new Error(`Gift ${gift.gift.id}'s sticker is missing`);

  /** Every answer that carries the stickers, as `as` gets it; signed out without `as`. */
  const answers = (as?: string) =>
    Promise.all([
      test.send("GET", `/api/sticker-boards/${artistId}`, { as }),
      test.send("GET", "/api/explore", { as }),
      test.send("GET", `/api/stickers/${stickerId}`, { as }),
      test.send("POST", "/api/gifts/preview", {
        as,
        body: { giftClaimToken: gift.giftClaimToken, liffContextType: "utou" },
      }),
    ]);
  /** The URLs of each file that shows either sticker's drawing. */
  const drawingUrls = [sticker, giftSticker].flatMap(({ contentHash }) => {
    const { png, flat, webp } = test.images.urls(contentHash);
    return [png, flat, webp.sticker];
  });
  return { test, artistId, stickerId, answers, drawingUrls, veiled: test.images.urls(veiledHash) };
}

const timelapseOf = (scene: Awaited<ReturnType<typeof nsfwSticker>>, as?: string) =>
  scene.test.send("GET", `/api/stickers/${scene.stickerId}/timelapse`, { as });

describe("an NSFW sticker's images", () => {
  it("are its veiled image to someone who isn't adult, with no URL of its drawing", async () => {
    const scene = await nsfwSticker();
    const unverifiedId = insertUser(scene.test.db);
    const bodies = await Promise.all(
      (await scene.answers(unverifiedId)).map(async (response) => {
        expect(response.status).toBe(200);
        return response.text();
      }),
    );
    for (const body of bodies) {
      for (const url of scene.drawingUrls) expect(body).not.toContain(url);
    }
    const [board, explore, detail, preview] = bodies;
    for (const body of [board, explore, detail]) expect(body).toContain(scene.veiled.webp.sticker);
    expect(JSON.parse(detail)).toMatchObject({ hasTimelapse: false });
    expect(JSON.parse(preview)).toMatchObject({ refusal: "adults_only", sticker: null });
    const timelapse = await timelapseOf(scene, unverifiedId);
    expect(timelapse.status).toBe(403);
    expect(await timelapse.json()).toMatchObject({ error: "adults_only" });
  });

  it("reach no one signed out", async () => {
    const scene = await nsfwSticker();
    for (const response of [...(await scene.answers()), await timelapseOf(scene)]) {
      expect(response.status).toBe(401);
    }
  });

  it("are whole to an adult, with its timelapse", async () => {
    const scene = await nsfwSticker();
    const adultId = insertUser(scene.test.db, { ageVerifiedAt: scene.test.clock.now() });
    const [board, explore, detail, preview] = await Promise.all(
      (await scene.answers(adultId)).map((response) => response.text()),
    );
    const [stickerWebp, giftStickerWebp] = scene.drawingUrls.filter((url) => url.endsWith(".webp"));
    for (const body of [board, explore, detail]) expect(body).toContain(stickerWebp);
    expect(preview).toContain(giftStickerWebp);
    expect(JSON.parse(detail)).toMatchObject({ hasTimelapse: true });
    expect((await timelapseOf(scene, adultId)).status).toBe(200);
  });
});
