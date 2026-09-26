import { MAX_TIME_USED_S, stickers, stickerTimelapses, ticketUses } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorBodySchema } from "../errors.ts";
import { keccak256 } from "../keccak256.ts";
import { sealResponseSchema } from "../stickers/seal.ts";
import { MAX_SEAL_BYTES } from "../stickers/sealForm.ts";
import { stickerDetailSchema } from "../stickers/stickerDetail.ts";
import {
  pngFile,
  sealFormData,
  sealImages,
  sealParts,
  STICKER_SIZE,
  testPng,
  testTimelapse,
  type SealParts,
} from "../stickers/testPngs.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeMint } from "../testing/fakes.ts";
import { insertGratitude, insertSealedSticker, receiveGift } from "../testing/rows.ts";
import { ticketKindAt } from "../tickets/tickets.ts";

const HOUR_MS = 60 * 60 * 1000;
/** The ticket day the tests' tickets are spent on. */
const TICKET_DAY = "2026-09-26";
/** A ticket use nobody spent. */
const UNKNOWN_TICKET_USE_ID = 999_999;

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});
afterEach(() => {
  vi.restoreAllMocks();
});

let ticketsSpent = 0;
/** Spends one of the person's tickets straight into ticket_uses, and returns its id. */
function spendTicket(userId: string): number {
  const dayIndex = ticketsSpent++;
  const use = test.db
    .insert(ticketUses)
    .values({ userId, ticketDay: TICKET_DAY, dayIndex, kind: ticketKindAt(dayIndex) })
    .returning({ id: ticketUses.id })
    .get();
  return use.id;
}

const postSeal = async (userId: string, form: FormData) =>
  test.app.request("/api/stickers", {
    method: "POST",
    body: form,
    headers: await test.signInAs(userId),
  });

/** Seals on a new ticket of the person's; returns the ticket and the 201's body. */
async function seal(userId: string, overrides: Partial<SealParts> = {}) {
  const ticketUseId = spendTicket(userId);
  const response = await postSeal(userId, sealFormData(sealParts(ticketUseId, overrides)));
  expect(response.status).toBe(201);
  return { ticketUseId, ...sealResponseSchema.parse(await response.json()) };
}

/** The status and ErrorBody a request was refused with. */
const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

const allStickers = () => test.db.select().from(stickers).all();
const timelapseOf = (stickerId: string) =>
  test.db.select().from(stickerTimelapses).where(eq(stickerTimelapses.stickerId, stickerId)).get();

describe("POST /api/stickers", () => {
  it("stores the five images under the PNG's hash, spends the ticket, and shows the sticker as NEW", async () => {
    const artistId = insertUser(test.db);
    const { ticketUseId, sticker, stickerPlacement } = await seal(artistId);
    const images = sealImages();
    const contentHash = keccak256(images.png);
    expect(sticker).toMatchObject({
      artist: { id: artistId },
      ownerId: artistId,
      timeUsed: MAX_TIME_USED_S,
      ...STICKER_SIZE,
      contentHash,
      images: test.images.urls(contentHash),
      tokenId: null,
      mintTxHash: null,
    });
    expect(test.images.saved.get(contentHash)).toEqual(images);
    expect(stickerPlacement).toMatchObject({
      stickerId: sticker.id,
      placement: null,
      seenAt: null,
    });
    const ticket = test.db.select().from(ticketUses).where(eq(ticketUses.id, ticketUseId)).get();
    expect(ticket?.stickerId).toBe(sticker.id);
    expect(new Uint8Array(timelapseOf(sticker.id)?.ops ?? [])).toEqual(testTimelapse());
    // The NFT's metadata JSON goes beside the sticker's images, named by the sticker.
    const [row] = allStickers();
    expect(row?.metadataUri).toBe(new URL(`${sticker.id}.json`, sticker.images.png).href);
  });

  it("numbers seals across everyone, one after another", async () => {
    const first = await seal(insertUser(test.db));
    const second = await seal(insertUser(test.db));
    expect(second.sticker.number).toBe(first.sticker.number + 1);
  });

  it("takes the timelapse as optional", async () => {
    const { sticker } = await seal(insertUser(test.db), { timelapse: undefined });
    expect(timelapseOf(sticker.id)).toBeUndefined();
  });

  it("keeps the first seal's files when a later seal uploads the same PNG", async () => {
    const first = await seal(insertUser(test.db));
    const otherMask = testPng(STICKER_SIZE.width, STICKER_SIZE.height, "another mask");
    const second = await seal(insertUser(test.db), { mask: pngFile(otherMask, "mask") });
    expect(second.sticker.id).not.toBe(first.sticker.id);
    expect(second.sticker.contentHash).toBe(first.sticker.contentHash);
    expect(test.images.saved.get(first.sticker.contentHash)?.mask).toEqual(sealImages().mask);
  });

  it("stores a mint that lands, and answers with it", async () => {
    const mint = fakeMint();
    test = await createTestApp({ mint });
    const { sticker } = await seal(insertUser(test.db));
    const token = mint.minted.get(sticker.id);
    expect(token).toBeDefined();
    const minted = { tokenId: token?.tokenId, mintTxHash: token?.txHash };
    expect(sticker).toMatchObject(minted);
    expect(allStickers()).toMatchObject([minted]);
  });

  it("retries an unminted sticker on the same ticket without creating another sticker", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const chainDown = new Error("The chain is down");
    const mint = fakeMint();
    let available = false;
    test = await createTestApp({
      mint: (request) => (available ? mint(request) : Promise.reject(chainDown)),
    });
    const artistId = insertUser(test.db);
    const { ticketUseId, sticker } = await seal(artistId);
    expect(sticker.tokenId).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(sticker.id), chainDown);

    available = true;
    const retry = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(retry.status).toBe(200);
    const retried = sealResponseSchema.parse(await retry.json()).sticker;
    expect(retried).toMatchObject({ id: sticker.id, tokenId: "1" });
    expect(allStickers()).toHaveLength(1);
  });

  it("refuses others' and unknown tickets, and answers an already sealed ticket without storing new images", async () => {
    const artistId = insertUser(test.db);
    const { ticketUseId: sealedTicket } = await seal(artistId);
    const before = allStickers();
    const refusedPng = testPng(STICKER_SIZE.width, STICKER_SIZE.height, "refused");
    const attempt = async (ticketUseId: number) =>
      refusal(
        await postSeal(
          artistId,
          sealFormData(sealParts(ticketUseId, { png: pngFile(refusedPng, "png") })),
        ),
      );
    const othersTicket = spendTicket(insertUser(test.db));
    expect(await attempt(othersTicket)).toMatchObject({ status: 403, error: "ticket_not_yours" });
    expect(await attempt(UNKNOWN_TICKET_USE_ID)).toMatchObject({
      status: 404,
      error: "ticket_not_found",
    });
    const repeated = await postSeal(artistId, sealFormData(sealParts(sealedTicket)));
    expect(repeated.status).toBe(200);
    expect(sealResponseSchema.parse(await repeated.json()).sticker.id).toBe(before[0]?.id);
    expect(allStickers()).toEqual(before);
    expect(test.images.saved.has(keccak256(refusedPng))).toBe(false);
  });

  const malformed: Array<{ part: string; why: string; overrides: Partial<SealParts> }> = [
    {
      part: "timeUsed",
      why: "past the drawing clock",
      overrides: { timeUsed: String(MAX_TIME_USED_S + 1) },
    },
    {
      part: "png",
      why: "not a PNG",
      overrides: {
        png: new File([new TextEncoder().encode("GIF89a")], "png.png", { type: "image/png" }),
      },
    },
    {
      part: "png",
      why: "not the sticker's size",
      overrides: { png: pngFile(testPng(STICKER_SIZE.width + 1, STICKER_SIZE.height), "png") },
    },
    { part: "flat", why: "missing", overrides: { flat: undefined } },
  ];

  it.each(malformed)(
    "refuses a $part that's $why with invalid_request, naming the part",
    async ({ part, overrides }) => {
      const artistId = insertUser(test.db);
      const form = sealFormData(sealParts(spendTicket(artistId), overrides));
      const answer = await refusal(await postSeal(artistId, form));
      expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
      expect(answer.detail).toContain(part);
      expect(allStickers()).toEqual([]);
    },
  );

  it("refuses a body over MAX_SEAL_BYTES with invalid_request, though each part is within its limit", async () => {
    const artistId = insertUser(test.db);
    const form = sealFormData(sealParts(spendTicket(artistId)));
    form.append("padding", new File([new Uint8Array(MAX_SEAL_BYTES)], "padding"));
    expect(await refusal(await postSeal(artistId, form))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
    expect(allStickers()).toEqual([]);
  });
});

const getSticker = async (viewerId: string, stickerId: string) =>
  test.app.request(`/api/stickers/${stickerId}`, { headers: await test.signInAs(viewerId) });

describe("GET /api/stickers/:stickerId", () => {
  it("shows who holds it now, its Original Artist, and its received gifts newest first", async () => {
    const artistId = insertUser(test.db);
    const firstReceiverId = insertUser(test.db);
    const ownerId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId);
    const later = new Date();
    const earlier = new Date(later.getTime() - HOUR_MS);
    const first = receiveGift(
      test.db,
      packGift(test.db, stickerId, artistId),
      firstReceiverId,
      earlier,
    );
    const second = receiveGift(
      test.db,
      packGift(test.db, stickerId, firstReceiverId),
      ownerId,
      later,
    );
    const combo = insertGratitude(test.db, second.id);
    // Received, but the escrow returned it when the claim didn't land before the expiry.
    packGift(test.db, stickerId, ownerId, {
      status: "returned",
      escrowStatus: "expired_returned",
      receiverId: insertUser(test.db),
      receivedAt: later,
      returnedAt: later,
    });

    const response = await getSticker(insertUser(test.db), stickerId);
    expect(response.status).toBe(200);
    const { sticker, owner, transferTrail } = stickerDetailSchema.parse(await response.json());
    expect(sticker).toMatchObject({ id: stickerId, artist: { id: artistId } });
    expect(owner.id).toBe(ownerId);
    expect(transferTrail).toMatchObject([
      {
        giftId: second.id,
        giver: { id: firstReceiverId },
        receiver: { id: ownerId },
        receivedAt: later.toISOString(),
        gratitude: { giftId: second.id, recordedAt: combo.createdAt.toISOString() },
      },
      {
        giftId: first.id,
        giver: { id: artistId },
        receiver: { id: firstReceiverId },
        receivedAt: earlier.toISOString(),
        gratitude: null,
      },
    ]);
  });

  it("refuses an unknown sticker with sticker_not_found", async () => {
    const response = await getSticker(insertUser(test.db), "no-such-sticker");
    expect(await refusal(response)).toMatchObject({ status: 404, error: "sticker_not_found" });
  });
});

describe("the sticker routes", () => {
  it("need a session", async () => {
    const sealing = await test.app.request("/api/stickers", {
      method: "POST",
      body: sealFormData(sealParts(UNKNOWN_TICKET_USE_ID)),
    });
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    const reading = await test.app.request(`/api/stickers/${stickerId}`);
    for (const response of [sealing, reading]) {
      expect(await refusal(response)).toEqual({ status: 401, error: "signed_out" });
    }
  });
});
