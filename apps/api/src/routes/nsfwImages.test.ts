import { stickerPlacements, stickers, stickerTimelapses } from "@drawing-app/db";
import { bytes32, insertTicketUse, insertUser } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createGiftsTestApp } from "../gifts/testGifts.ts";
import {
  pngFile,
  sealFormData,
  sealParts,
  STICKER_SIZE,
  testPng,
  testTimelapse,
} from "../stickers/testPngs.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeSuiWallets } from "../testing/fakes.ts";
import { fakeSui, type FakeSui } from "../testing/fakeSui.ts";
import { insertSealedSticker, SPOT } from "../testing/rows.ts";

/**
 * An opted-in artist's NSFW sticker with its veiled image and timelapse, on their board and sealed today, and
 * a gift of another of theirs whose link anyone can open.
 */
async function nsfwSticker() {
  const test = await createGiftsTestApp();
  const artistId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
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
  const drawings = [sticker, giftSticker].map(({ contentHash }) => contentHash);
  /** The URLs of each file that shows either sticker's drawing. */
  const drawingUrls = drawings.flatMap((contentHash) => {
    const { png, flat, webp } = test.images.urls(contentHash);
    return [png, flat, webp.sticker];
  });
  /** Each sticker's WebP as the NSFW opt-in gets it. */
  const optedInWebps = drawings.map((contentHash) => test.images.urls(contentHash).webp.sticker);
  const veiled = test.images.urls(veiledHash);
  return { test, artistId, stickerId, answers, drawingUrls, optedInWebps, veiled };
}

const timelapseOf = (scene: Awaited<ReturnType<typeof nsfwSticker>>, as?: string) =>
  scene.test.send("GET", `/api/stickers/${scene.stickerId}/timelapse`, { as });

describe("an NSFW sticker's images", () => {
  it("are its veiled image to someone without the NSFW opt-in, with no URL of its drawing", async () => {
    const scene = await nsfwSticker();
    const optedOutId = insertUser(scene.test.db);
    const bodies = await Promise.all(
      (await scene.answers(optedOutId)).map(async (response) => {
        expect(response.status).toBe(200);
        return response.text();
      }),
    );
    for (const body of bodies) {
      for (const url of scene.drawingUrls) expect(body).not.toContain(url);
    }
    const [board, explore, detail, preview] = bodies;
    for (const body of [board, explore, detail]) expect(body).toContain(scene.veiled.webp.sticker);
    expect(JSON.parse(board)).toMatchObject({ boardStickers: [{ hasTimelapse: false }] });
    expect(JSON.parse(preview)).toMatchObject({ refusal: "nsfw_not_opted_in", sticker: null });
    const timelapse = await timelapseOf(scene, optedOutId);
    expect(timelapse.status).toBe(403);
    expect(await timelapse.json()).toMatchObject({ error: "nsfw_not_opted_in" });
  });

  it("reach no one signed out", async () => {
    const scene = await nsfwSticker();
    for (const response of [...(await scene.answers()), await timelapseOf(scene)]) {
      expect(response.status).toBe(401);
    }
  });

  it("are whole to someone opted in, with its timelapse", async () => {
    const scene = await nsfwSticker();
    const optedInId = insertUser(scene.test.db, { nsfwOptedInAt: scene.test.clock.now() });
    const [board, explore, detail, preview] = await Promise.all(
      (await scene.answers(optedInId)).map((response) => response.text()),
    );
    const [stickerWebp, giftStickerWebp] = scene.optedInWebps;
    for (const body of [board, explore, detail]) expect(body).toContain(stickerWebp);
    expect(preview).toContain(giftStickerWebp);
    expect(JSON.parse(board)).toMatchObject({ boardStickers: [{ hasTimelapse: true }] });
    expect((await timelapseOf(scene, optedInId)).status).toBe(200);
  });
});

describe("a newly sealed sticker's Sui object", () => {
  it("names an NSFW sticker's veiled image, and any other sticker's own PNG", async () => {
    let chain: FakeSui | undefined;
    const test = await createTestApp(({ db, clock }) => {
      chain = fakeSui(clock);
      return { sui: chain.sui, gasStation: chain.gasStation, suiWallets: fakeSuiWallets(db) };
    });
    const optedInId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    for (const nsfw of ["true", "false"]) {
      const ticketUseId = insertTicketUse(test.db, optedInId);
      const png = testPng(STICKER_SIZE.width, STICKER_SIZE.height, `nsfw ${nsfw}`);
      const parts = sealParts(ticketUseId, { nsfw, png: pngFile(png, "png") });
      const sealing = await test.app.request("/api/stickers", {
        method: "POST",
        body: sealFormData(parts),
        headers: await test.signInAs(optedInId),
      });
      expect(sealing.status).toBe(201);
    }
    const [nsfwMint, plainMint] = (chain?.built ?? []).flatMap((built) =>
      built.kind === "mint" ? [built.mint] : [],
    );
    if (!nsfwMint || !plainMint) throw new Error("Sealing minted neither sticker");
    const veiledHash = test.db
      .select({ veiledHash: stickers.veiledHash })
      .from(stickers)
      .where(eq(stickers.id, nsfwMint.stickerId))
      .get()?.veiledHash;
    if (!veiledHash) throw new Error("Sealing left the NSFW sticker without its veil");
    // File names under Display's image host, which serves them as the image store names them.
    expect(test.images.urls(veiledHash).png).toMatch(new RegExp(`/${nsfwMint.image}$`));
    expect(test.images.urls(plainMint.contentHash).png).toMatch(new RegExp(`/${plainMint.image}$`));
    expect(nsfwMint.image).not.toBe(plainMint.image);
  });
});
