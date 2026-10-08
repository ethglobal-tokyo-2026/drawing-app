import {
  KYOTO_SEIKA_TIME_USED_S,
  MAX_TIME_USED_S,
  stickers,
  stickerTimelapses,
  ticketUses,
} from "@drawing-app/db";
import {
  insertGratitude,
  insertTicketUse,
  insertUser,
  packGift,
  TEST_KYOTO_SEIKA_SUBJECTS,
} from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CdnPurge } from "../deps.ts";
import { markNsfwResponseSchema, markStickerNsfw } from "../stickers/markNsfw.ts";
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
import { fakeCdnPurge, fakeSuiWallets } from "../testing/fakes.ts";
import { fakeSui, type FakeSui } from "../testing/fakeSui.ts";
import { captureLogLines } from "../testing/logLines.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { giveSticker, insertSealedSticker } from "../testing/rows.ts";

const HOUR_MS = 60 * 60 * 1000;
/** A ticket use nobody spent. */
const UNKNOWN_TICKET_USE_ID = 999_999;

/** A sticker PNG's content hash, as Sealing names its images: its sha256. */
const hashOf = (png: Uint8Array) => `0x${createHash("sha256").update(png).digest("hex")}`;

/** The app on the fake Sui chain, where everyone has a Sui wallet. */
async function chainApp() {
  let chain: FakeSui | undefined;
  test = await createTestApp(({ db, clock }) => {
    chain = fakeSui(clock);
    return { sui: chain.sui, gasStation: chain.gasStation, suiWallets: fakeSuiWallets(db) };
  });
  if (!chain) throw new Error("createTestApp built no overrides");
  return chain;
}

let test: TestApp;
beforeEach(async () => {
  test = await createTestApp();
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Spends one of the person's tickets straight into ticket_uses, and returns its id. */
const spendTicket = (userId: string) => insertTicketUse(test.db, userId);

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
  return { ticketUseId, ...(await bodyOf(response, sealResponseSchema, 201)) };
}

const getSticker = (viewerId: string, stickerId: string) =>
  test.send("GET", `/api/stickers/${stickerId}`, { as: viewerId });

const allStickers = () => test.db.select().from(stickers).all();
const rowOf = (stickerId: string) =>
  test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();

/** An NSFW sticker's images as anyone without the NSFW opt-in gets them: its veil in place of its drawing. */
function veiledImagesOf(stickerId: string) {
  const row = rowOf(stickerId);
  if (!row?.veiledHash) throw new Error(`Sticker ${stickerId} has no veil`);
  return test.images.veiledUrls(row.contentHash, row.veiledHash);
}
const timelapseOf = (stickerId: string) =>
  test.db.select().from(stickerTimelapses).where(eq(stickerTimelapses.stickerId, stickerId)).get();

describe("POST /api/stickers", () => {
  it("stores the five images under the PNG's hash, spends the ticket, and shows the sticker as NEW", async () => {
    const artistId = insertUser(test.db);
    const { ticketUseId, sticker, stickerPlacement } = await seal(artistId);
    const images = sealImages();
    const contentHash = hashOf(images.png);
    expect(sticker).toMatchObject({
      artist: { id: artistId },
      ownerId: artistId,
      timeUsed: MAX_TIME_USED_S,
      ...STICKER_SIZE,
      contentHash,
      images: test.images.urls(contentHash),
      objectId: null,
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
  });

  it("seals an NSFW sticker for anyone, and someone without the NSFW opt-in then sees their own veiled", async () => {
    const optedInId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    const optedIn = (await seal(optedInId, { nsfw: "true" })).sticker;
    expect(optedIn).toMatchObject({
      nsfw: true,
      images: test.images.urls(optedIn.contentHash),
    });
    expect((await seal(optedInId)).sticker.nsfw).toBe(false);

    const optedOutId = insertUser(test.db);
    const png = testPng(STICKER_SIZE.width, STICKER_SIZE.height, "nsfw");
    const { sticker } = await seal(optedOutId, { nsfw: "true", png: pngFile(png, "png") });
    const veiled = veiledImagesOf(sticker.id);
    expect(sticker).toMatchObject({ nsfw: true, images: veiled });
    const detail = await bodyOf(await getSticker(optedOutId, sticker.id), stickerDetailSchema);
    expect(detail).toMatchObject({ sticker: { images: veiled }, hasTimelapse: false });
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

  it("mints the sticker on Sui as it seals, and answers with its object", async () => {
    const chain = await chainApp();
    const { sticker } = await seal(insertUser(test.db));
    expect(sticker.objectId).toBe(chain.sui.stickerObjectId(sticker.id));
    expect(allStickers()).toMatchObject([{ objectId: sticker.objectId }]);
  });

  it("refuses a seal whose mint fails, keeping the sticker, and mints it once on a retry with the same ticket", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain = await chainApp();
    const artistId = insertUser(test.db);
    const ticketUseId = spendTicket(artistId);
    const sealOnTicket = () => postSeal(artistId, sealFormData(sealParts(ticketUseId)));
    const failure = "MoveAbort(…, 0) in command 0";
    chain.answerNext({ ok: false, failure });
    const failed = await refusalOf(await sealOnTicket());
    const [saved] = allStickers();
    if (!saved) throw new Error("The failed mint lost the saved sticker");
    expect(failed).toMatchObject({ status: 503, error: "mint_failed" });
    expect(failed.detail).toContain(saved.id);
    // The app shows the detail beside its own message.
    expect(failed.detail).not.toMatch(/NFT|crypto|token|wallet|burn/i);
    expect(saved.objectId).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"event":"sticker.mint.failed"'));
    expect(test.images.saved.get(saved.contentHash)).toEqual(sealImages());

    const retried = (await bodyOf(await sealOnTicket(), sealResponseSchema)).sticker;
    expect(retried).toMatchObject({ id: saved.id, objectId: chain.sui.stickerObjectId(saved.id) });
    expect(allStickers()).toHaveLength(1);
    expect(test.db.select().from(ticketUses).all()).toHaveLength(1);
    const mints = () => chain.built.filter(({ kind }) => kind === "mint").length;
    const before = mints();
    expect((await bodyOf(await sealOnTicket(), sealResponseSchema)).sticker).toEqual(retried);
    expect(mints()).toBe(before);
  });

  it("refuses others' and unknown tickets, and answers an already sealed ticket without storing new images", async () => {
    const artistId = insertUser(test.db);
    const { ticketUseId: sealedTicket } = await seal(artistId);
    const before = allStickers();
    const refusedPng = testPng(STICKER_SIZE.width, STICKER_SIZE.height, "refused");
    const attempt = async (ticketUseId: number) =>
      refusalOf(
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
    expect((await bodyOf(repeated, sealResponseSchema)).sticker.id).toBe(before[0]?.id);
    expect(allStickers()).toEqual(before);
    expect(test.images.saved.has(hashOf(refusedPng))).toBe(false);
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
    {
      part: "timelapse",
      why: "not a timelapse",
      overrides: {
        timelapse: new File([gzipSync(JSON.stringify({ v: 1, ink: [1, 1] }))], "t.json.gz"),
      },
    },
    {
      part: "timelapse",
      why: "not gzipped",
      overrides: { timelapse: new File([JSON.stringify(TEST_TIMELAPSE)], "t.json.gz") },
    },
  ];

  it.each(malformed)(
    "refuses a $part that's $why with invalid_request, naming the part",
    async ({ part, overrides }) => {
      const artistId = insertUser(test.db);
      const form = sealFormData(sealParts(spendTicket(artistId), overrides));
      const answer = await refusalOf(await postSeal(artistId, form));
      expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
      expect(answer.detail).toContain(part);
      expect(allStickers()).toEqual([]);
    },
  );

  it("refuses a body over MAX_SEAL_BYTES with invalid_request, though each part is within its limit", async () => {
    const artistId = insertUser(test.db);
    const form = sealFormData(sealParts(spendTicket(artistId)));
    form.append("padding", new File([new Uint8Array(MAX_SEAL_BYTES)], "padding"));
    expect(await refusalOf(await postSeal(artistId, form))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
    expect(allStickers()).toEqual([]);
  });
});

/** The subject pair as the seal form sends it. */
const SUBJECTS_PART = JSON.stringify(TEST_KYOTO_SEIKA_SUBJECTS);

describe("POST /api/stickers on a ticket spent in Kyoto Seika Manga Expression Practice Mode", () => {
  /** Seals with `overrides` on a new ticket of the person's, spent in the mode or not. */
  const sealOn = (artistId: string, kyotoSeikaPractice: boolean, overrides: Partial<SealParts>) =>
    postSeal(
      artistId,
      sealFormData(
        sealParts(insertTicketUse(test.db, artistId, { kyotoSeikaPractice }), overrides),
      ),
    );

  it("keeps the subject pair and the mode's clock", async () => {
    const overrides = {
      timeUsed: String(KYOTO_SEIKA_TIME_USED_S),
      kyotoSeikaSubjects: SUBJECTS_PART,
    };
    const { sticker } = await bodyOf(
      await sealOn(insertUser(test.db), true, overrides),
      sealResponseSchema,
      201,
    );
    expect(sticker).toMatchObject({
      timeUsed: KYOTO_SEIKA_TIME_USED_S,
      kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS,
    });
  });

  const one = JSON.stringify(TEST_KYOTO_SEIKA_SUBJECTS.slice(0, 1));
  const refused: Array<{ why: string; kyotoSeika: boolean; overrides: Partial<SealParts> }> = [
    {
      why: "a sticker without its subjects on a ticket spent in the mode",
      kyotoSeika: true,
      overrides: {},
    },
    {
      why: "subjects on a standard ticket's sticker",
      kyotoSeika: false,
      overrides: { kyotoSeikaSubjects: SUBJECTS_PART },
    },
    {
      why: "time past the mode's clock",
      kyotoSeika: true,
      overrides: {
        timeUsed: String(KYOTO_SEIKA_TIME_USED_S + 1),
        kyotoSeikaSubjects: SUBJECTS_PART,
      },
    },
    {
      why: "subjects that aren't a pair",
      kyotoSeika: true,
      overrides: { kyotoSeikaSubjects: one },
    },
    {
      why: "subjects that aren't JSON",
      kyotoSeika: true,
      overrides: { kyotoSeikaSubjects: "風 × 再会" },
    },
  ];

  it.each(refused)(
    "refuses $why with invalid_request, naming the part and storing nothing",
    async ({ kyotoSeika, overrides }) => {
      const answer = await refusalOf(await sealOn(insertUser(test.db), kyotoSeika, overrides));
      expect(answer).toMatchObject({ status: 400, error: "invalid_request" });
      expect(answer.detail).toMatch(/timeUsed|kyotoSeikaSubjects/);
      expect(allStickers()).toEqual([]);
      expect(test.images.saved.size).toBe(0);
    },
  );
});

describe("GET /api/stickers/:stickerId", () => {
  it("shows who holds it now, its Original Artist, and its received gifts newest first", async () => {
    const artistId = insertUser(test.db);
    const firstReceiverId = insertUser(test.db);
    const ownerId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId);
    const later = new Date();
    const earlier = new Date(later.getTime() - HOUR_MS);
    const first = giveSticker(test.db, stickerId, artistId, firstReceiverId, earlier);
    const second = giveSticker(test.db, stickerId, firstReceiverId, ownerId, later);
    const combo = insertGratitude(test.db, second.id);
    // Given again, but the escrow returned it after the expiry, unreceived.
    packGift(test.db, stickerId, ownerId, {
      status: "returned",
      escrowStatus: "expired_returned",
      returnedAt: later,
    });

    const response = await getSticker(insertUser(test.db), stickerId);
    const { sticker, owner, transferTrail } = await bodyOf(response, stickerDetailSchema);
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
      (await bodyOf(await getSticker(artistId, stickerId), stickerDetailSchema)).hasTimelapse;
    expect(await hasTimelapse(withOne.sticker.id)).toBe(true);
    expect(await hasTimelapse(without.sticker.id)).toBe(false);
  });

  it("refuses an unknown sticker with sticker_not_found", async () => {
    const response = await getSticker(insertUser(test.db), "no-such-sticker");
    expect(await refusalOf(response)).toMatchObject({ status: 404, error: "sticker_not_found" });
  });

  it("shows the Kyoto Seika Subjects of a sticker drawn in Kyoto Seika Manga Expression Practice Mode, and none on any other", async () => {
    const artistId = insertUser(test.db);
    const kyotoSeikaSticker = insertSealedSticker(test.db, artistId, {
      kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS,
    });
    const subjectsOf = async (stickerId: string) =>
      (await bodyOf(await getSticker(insertUser(test.db), stickerId), stickerDetailSchema)).sticker
        .kyotoSeikaSubjects;
    expect(await subjectsOf(kyotoSeikaSticker)).toEqual(TEST_KYOTO_SEIKA_SUBJECTS);
    expect(await subjectsOf(insertSealedSticker(test.db, artistId))).toBeNull();
  });
});

describe("POST /api/stickers/:stickerId/nsfw", () => {
  /** The app with `cdnPurge`, and a sticker its Original Artist sealed without the mark. */
  async function sealedUnmarked(cdnPurge: CdnPurge | null = fakeCdnPurge()) {
    test = await createTestApp({ cdnPurge });
    const artistId = insertUser(test.db);
    const { sticker } = await seal(artistId);
    return { artistId, sticker };
  }
  const markNsfw = (userId: string, stickerId: string) =>
    test.send("POST", `/api/stickers/${stickerId}/nsfw`, { as: userId });

  it("marks its Original Artist's sticker 18+, veiled to anyone without the NSFW opt-in, and purges each CDN file that shows its drawing", async () => {
    const purge = fakeCdnPurge();
    const { artistId, sticker } = await sealedUnmarked(purge);
    const marked = await bodyOf(await markNsfw(artistId, sticker.id), markNsfwResponseSchema);
    const veiled = veiledImagesOf(sticker.id);
    expect(marked).toEqual({
      sticker: { ...sticker, nsfw: true, images: veiled },
      cdnPurged: true,
    });
    const { png, flat, webp } = test.images.urls(sticker.contentHash);
    expect(purge.urls.toSorted()).toEqual([png, flat, webp.sticker].toSorted());
    const optedInId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    const seen = await bodyOf(await getSticker(optedInId, sticker.id), stickerDetailSchema);
    expect(seen.sticker.images).toEqual(test.images.urls(sticker.contentHash));
  });

  it("refuses an unknown sticker, anyone but its Original Artist, even its holder, and one already marked", async () => {
    const purge = fakeCdnPurge();
    const { artistId, sticker } = await sealedUnmarked(purge);
    const holderId = insertUser(test.db);
    giveSticker(test.db, sticker.id, artistId, holderId);
    expect(await refusalOf(await markNsfw(artistId, "no-such-sticker"))).toMatchObject({
      status: 404,
      error: "sticker_not_found",
    });
    expect(await refusalOf(await markNsfw(holderId, sticker.id))).toMatchObject({
      status: 403,
      error: "not_original_artist",
    });
    expect(rowOf(sticker.id)?.nsfw).toBe(false);
    expect(purge.urls).toEqual([]);
    expect((await markNsfw(artistId, sticker.id)).status).toBe(200);
    const purged = purge.urls.length;
    expect(await refusalOf(await markNsfw(artistId, sticker.id))).toMatchObject({
      status: 409,
      error: "already_nsfw",
    });
    expect(purge.urls).toHaveLength(purged);
  });

  it("refuses with already_nsfw when another mark lands while the veil is made", async () => {
    const purge = fakeCdnPurge();
    const { artistId, sticker } = await sealedUnmarked(purge);
    const saveVeiled = test.images.saveVeiled;
    vi.spyOn(test.images, "saveVeiled").mockImplementationOnce(async (contentHash) => {
      const veiledHash = await saveVeiled(contentHash);
      test.db
        .update(stickers)
        .set({ nsfw: true, veiledHash })
        .where(eq(stickers.id, sticker.id))
        .run();
      return veiledHash;
    });
    expect(await refusalOf(await markNsfw(artistId, sticker.id))).toMatchObject({
      status: 409,
      error: "already_nsfw",
    });
    expect(purge.urls).toEqual([]);
  });

  it("makes one veil for marks of one sticker sent at once, and refuses the rest with already_nsfw", async () => {
    const { artistId, sticker } = await sealedUnmarked();
    const veils = vi.spyOn(test.images, "saveVeiled");
    // Each mark runs until it first waits before the next one starts.
    const outcomes = await Promise.all(
      Array.from({ length: 3 }, () => markStickerNsfw(test.deps, artistId, sticker.id)),
    );
    expect(veils).toHaveBeenCalledTimes(1);
    const answered = outcomes.map((outcome) =>
      "marked" in outcome ? 200 : outcome.refused.status,
    );
    expect(answered.toSorted((a, b) => a - b)).toEqual([200, 409, 409]);
  });

  it.each([
    { what: "fails", cdnPurge: () => fakeCdnPurge(false), logged: undefined },
    { what: "is off", cdnPurge: () => null, logged: "cdn.purge.skipped" },
  ])(
    "keeps the mark and answers cdnPurged false when the CDN purge $what",
    async ({ cdnPurge, logged }) => {
      const logs = captureLogLines();
      const { artistId, sticker } = await sealedUnmarked(cdnPurge());
      const marked = await bodyOf(await markNsfw(artistId, sticker.id), markNsfwResponseSchema);
      expect(marked).toMatchObject({ sticker: { nsfw: true }, cdnPurged: false });
      expect(rowOf(sticker.id)?.nsfw).toBe(true);
      if (logged) logs.expectLogged(logged, { stickerId: sticker.id });
    },
  );
});

describe("GET /api/stickers/:stickerId/timelapse", () => {
  const getTimelapse = (userId: string, stickerId: string) =>
    test.send("GET", `/api/stickers/${stickerId}/timelapse`, { as: userId });

  it("answers how the sticker was drawn, as it was sealed, to anyone signed in", async () => {
    const { sticker } = await seal(insertUser(test.db));
    const response = await getTimelapse(insertUser(test.db), sticker.id);
    expect(await bodyOf(response, timelapseV1Schema)).toEqual(TEST_TIMELAPSE);
  });

  it("refuses a sticker sealed without one with timelapse_not_found", async () => {
    const artistId = insertUser(test.db);
    const { sticker } = await seal(artistId, { timelapse: undefined });
    expect(await refusalOf(await getTimelapse(artistId, sticker.id))).toMatchObject({
      status: 404,
      error: "timelapse_not_found",
    });
  });

  it("refuses an unknown sticker with sticker_not_found", async () => {
    const response = await getTimelapse(insertUser(test.db), "no-such-sticker");
    expect(await refusalOf(response)).toMatchObject({ status: 404, error: "sticker_not_found" });
  });
});
