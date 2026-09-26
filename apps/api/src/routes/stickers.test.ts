import { MAX_TIME_USED_S, stickers, stickerTimelapses, ticketUses } from "@drawing-app/db";
import { insertUser, packGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { gzipSync } from "node:zlib";
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
  TEST_TIMELAPSE,
  testPng,
  testTimelapse,
  type SealParts,
} from "../stickers/testPngs.ts";
import { timelapseV1Schema } from "../stickers/timelapse.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import {
  fakeEns,
  fakeGiftChain,
  fakeMint,
  fakeNameWriter,
  fakeSmartWallets,
} from "../testing/fakes.ts";
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

  it("names the artist and the sticker under croquis.eth once the mint lands", async () => {
    const { writer, calls } = fakeNameWriter();
    const ens = fakeEns(writer);
    test = await createTestApp({ mint: fakeMint(), smartWallets: fakeSmartWallets(), ens });
    const artistId = insertUser(test.db, { handle: "Alice" });
    const { sticker } = await seal(artistId);
    await ens.naming.idle();

    expect(calls).toEqual([
      "person alice",
      `sticker ${sticker.tokenId} ${String(sticker.number).padStart(4, "0")}`,
    ]);
    const detail = await test.app.request(`/api/stickers/${sticker.id}`, {
      headers: await test.signInAs(artistId),
    });
    expect(await detail.json()).toMatchObject({
      sticker: { ensName: `${String(sticker.number).padStart(4, "0")}.alice.croquis.eth` },
    });
  });

  it("reports mint failure and retries the saved sticker on the same ticket", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const chainDown = new Error("The chain is down");
    const mint = fakeMint();
    let available = false;
    test = await createTestApp({
      mint: (request) => (available ? mint(request) : Promise.reject(chainDown)),
    });
    const artistId = insertUser(test.db);
    const ticketUseId = spendTicket(artistId);
    const failed = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    const [saved] = allStickers();
    if (!saved) throw new Error("The failed mint lost the saved sticker");
    const failedBody = await refusal(failed);
    expect(failedBody).toMatchObject({
      status: 503,
      error: "mint_failed",
    });
    expect(failedBody.detail).toContain(saved.id);
    expect(failedBody.detail).toContain(`(${chainDown.message})`);
    expect(saved.tokenId).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`"stickerId":"${saved.id}"`));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(chainDown.message));
    expect(test.images.saved.get(saved.contentHash)).toEqual(sealImages());
    expect(new Uint8Array(timelapseOf(saved.id)?.ops ?? [])).toEqual(testTimelapse());

    const stillFailed = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(await refusal(stillFailed)).toMatchObject({ status: 503, error: "mint_failed" });

    available = true;
    const retry = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(retry.status).toBe(200);
    const retried = sealResponseSchema.parse(await retry.json()).sticker;
    expect(retried).toMatchObject({ id: saved.id, tokenId: "1" });
    expect(allStickers()).toHaveLength(1);
    expect(test.db.select().from(ticketUses).all()).toHaveLength(1);
  });

  it("refuses an unconfirmed mint in real chain mode instead of answering success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    test = await createTestApp({ giftChain: fakeGiftChain(), mint: () => Promise.resolve(null) });
    const artistId = insertUser(test.db);
    const response = await postSeal(artistId, sealFormData(sealParts(spendTicket(artistId))));
    const refused = await refusal(response);
    expect(refused).toMatchObject({ status: 503, error: "mint_failed" });
    // The app shows the detail beside its own message.
    expect(refused.detail).not.toMatch(/NFT|crypto|token|wallet|mint|burn/i);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"event":"sticker.mint.failed"'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("The chain returned no confirmed record"),
    );
    expect(allStickers()).toMatchObject([{ tokenId: null, mintTxHash: null }]);
  });

  it("reconciles a mint after confirmation failed without creating another NFT", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mint = fakeMint();
    let confirmationAvailable = false;
    const submit = vi.fn(async (request: Parameters<typeof mint>[0]) => {
      const token = await mint(request);
      if (!confirmationAvailable) throw new Error("Receipt request timed out");
      return token;
    });
    test = await createTestApp({ mint: submit });
    const artistId = insertUser(test.db);
    const ticketUseId = spendTicket(artistId);
    const failed = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(await refusal(failed)).toMatchObject({ status: 503, error: "mint_failed" });
    const submitted = submit.mock.calls[0]?.[0];
    if (!submitted) throw new Error("No mint was submitted");

    confirmationAvailable = true;
    const retry = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(retry.status).toBe(200);
    const { sticker } = sealResponseSchema.parse(await retry.json());
    expect(sticker).toMatchObject({
      id: submitted.stickerId,
      tokenId: mint.minted.get(submitted.stickerId)?.tokenId,
      mintTxHash: mint.minted.get(submitted.stickerId)?.txHash,
    });
    expect(submit.mock.calls[1]?.[0]).toEqual(submitted);
    expect(mint.minted.size).toBe(1);

    const alreadyConfirmed = await postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    expect(alreadyConfirmed.status).toBe(200);
    expect(submit).toHaveBeenCalledTimes(2);
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

  it("says whether the sticker was sealed with its timelapse", async () => {
    const artistId = insertUser(test.db);
    const withOne = await seal(artistId);
    const without = await seal(artistId, { timelapse: undefined });
    const hasTimelapse = async (stickerId: string) =>
      stickerDetailSchema.parse(await (await getSticker(artistId, stickerId)).json()).hasTimelapse;
    expect(await hasTimelapse(withOne.sticker.id)).toBe(true);
    expect(await hasTimelapse(without.sticker.id)).toBe(false);
  });

  it("refuses an unknown sticker with sticker_not_found", async () => {
    const response = await getSticker(insertUser(test.db), "no-such-sticker");
    expect(await refusal(response)).toMatchObject({ status: 404, error: "sticker_not_found" });
  });
});

describe("GET /api/stickers/:stickerId/timelapse", () => {
  const getTimelapse = async (userId: string, stickerId: string) =>
    test.app.request(`/api/stickers/${stickerId}/timelapse`, {
      headers: await test.signInAs(userId),
    });

  it("answers how the sticker was drawn, as it was sealed, to anyone signed in", async () => {
    const { sticker } = await seal(insertUser(test.db));
    const response = await getTimelapse(insertUser(test.db), sticker.id);
    expect(response.status).toBe(200);
    expect(timelapseV1Schema.parse(await response.json())).toEqual(TEST_TIMELAPSE);
  });

  it("answers a timelapse from before densities were recorded without one", async () => {
    const artistId = insertUser(test.db);
    const { density: _dropped, ...older } = TEST_TIMELAPSE;
    const file = new File([gzipSync(JSON.stringify(older))], "t.json.gz");
    const { sticker } = await seal(artistId, { timelapse: file });
    const answered = timelapseV1Schema.parse(
      await (await getTimelapse(artistId, sticker.id)).json(),
    );
    expect(answered).toEqual(older);
    expect(answered.density).toBeUndefined();
  });

  it("refuses a sticker sealed without one with timelapse_not_found", async () => {
    const artistId = insertUser(test.db);
    const { sticker } = await seal(artistId, { timelapse: undefined });
    expect(await refusal(await getTimelapse(artistId, sticker.id))).toMatchObject({
      status: 404,
      error: "timelapse_not_found",
    });
  });

  it("refuses an unknown sticker with sticker_not_found", async () => {
    const response = await getTimelapse(insertUser(test.db), "no-such-sticker");
    expect(await refusal(response)).toMatchObject({ status: 404, error: "sticker_not_found" });
  });

  it("fails loudly, naming the sticker, when what's stored isn't a timelapse", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const artistId = insertUser(test.db);
    const notATimelapse = new File([gzipSync(JSON.stringify({ v: 1, ink: [1, 1] }))], "t.json.gz");
    const { sticker } = await seal(artistId, { timelapse: notATimelapse });
    expect(await refusal(await getTimelapse(artistId, sticker.id))).toMatchObject({
      status: 500,
      error: "internal_error",
    });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`Sticker ${sticker.id}'s stored timelapse can't be read`),
    );
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
