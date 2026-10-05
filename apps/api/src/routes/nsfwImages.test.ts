import { stickerPlacements, stickers, stickerTimelapses, ticketUses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Mint } from "../deps.ts";
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
import { insertSealedSticker, SPOT } from "../testing/rows.ts";
import { ticketKindAt } from "../tickets/tickets.ts";

/**
 * An NSFW sticker with its veiled image and timelapse, on its Original Artist's board and sealed
 * today, and a gift of another of theirs whose link anyone can open.
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
    expect(JSON.parse(detail)).toMatchObject({ hasTimelapse: false });
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

  it("are whole to someone with the NSFW opt-in on, with its timelapse", async () => {
    const scene = await nsfwSticker();
    const optedInId = insertUser(scene.test.db, { nsfwOptedInAt: scene.test.clock.now() });
    const [board, explore, detail, preview] = await Promise.all(
      (await scene.answers(optedInId)).map((response) => response.text()),
    );
    const [stickerWebp, giftStickerWebp] = scene.drawingUrls.filter((url) => url.endsWith(".webp"));
    for (const body of [board, explore, detail]) expect(body).toContain(stickerWebp);
    expect(preview).toContain(giftStickerWebp);
    expect(JSON.parse(detail)).toMatchObject({ hasTimelapse: true });
    expect((await timelapseOf(scene, optedInId)).status).toBe(200);
  });

  it("follow the viewer's NSFW opt-in as they turn it on and off", async () => {
    const scene = await nsfwSticker();
    const viewerId = insertUser(scene.test.db);
    for (const nsfwOptIn of [true, false]) {
      const body = { nsfwOptIn };
      const setting = await scene.test.send("POST", "/api/me/nsfw-opt-in", { as: viewerId, body });
      expect(setting.status).toBe(200);
      expect((await timelapseOf(scene, viewerId)).status).toBe(nsfwOptIn ? 200 : 403);
    }
  });
});

describe("a newly sealed sticker's NFT metadata", () => {
  it("names an NSFW sticker's veiled image, and any other sticker's own PNG", async () => {
    const minted: Parameters<Mint>[0][] = [];
    const test = await createTestApp({
      mint: (request) => {
        minted.push(request);
        return Promise.resolve(null);
      },
    });
    const artistId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    for (const [dayIndex, nsfw] of ["true", "false"].entries()) {
      const ticket = test.db
        .insert(ticketUses)
        .values({
          userId: artistId,
          ticketDay: "2026-09-26",
          dayIndex,
          kind: ticketKindAt(dayIndex),
        })
        .returning({ id: ticketUses.id })
        .get();
      const png = testPng(STICKER_SIZE.width, STICKER_SIZE.height, `nsfw ${nsfw}`);
      const parts = sealParts(ticket.id, { nsfw, png: pngFile(png, "png") });
      const sealing = await test.app.request("/api/stickers", {
        method: "POST",
        body: sealFormData(parts),
        headers: await test.signInAs(artistId),
      });
      expect(sealing.status).toBe(201);
    }
    const [nsfwMint, plainMint] = minted;
    if (!nsfwMint || !plainMint) throw new Error("Sealing minted neither sticker");
    const veiledHash = test.db
      .select({ veiledHash: stickers.veiledHash })
      .from(stickers)
      .where(eq(stickers.id, nsfwMint.stickerId))
      .get()?.veiledHash;
    if (!veiledHash) throw new Error("Sealing left the NSFW sticker without its veil");
    expect(nsfwMint.image).toBe(test.images.urls(veiledHash).png);
    expect(plainMint.image).toBe(test.images.urls(plainMint.contentHash).png);
  });
});
