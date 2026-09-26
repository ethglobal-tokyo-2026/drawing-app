import { GIFT_EXPIRY_MS, gifts, stickerPlacements, stickers, users } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { giftClaimTokenSchema } from "../gifts/packaging.ts";
import { giftPreviewSchema, receivedGiftSchema, type ReceiveRefusal } from "../gifts/receiving.ts";
import { createGiftsTestApp, giftOf, refusalOf, type GiftsTestApp } from "../gifts/testGifts.ts";

/** A spot on the board, as a drag leaves it. */
const SPOT = { onBoard: true, x: 0.25, y: 0.75, scale: 0.3, rotation: -4, z: 2 };
const HOUR_MS = 60 * 60 * 1000;
/** A 1:1 chat, where a Gift Message is received. */
const ONE_TO_ONE = "utou";
const GROUP_CHATS = ["group", "room", "square_chat"];

/** A gift of a sticker its giver drew, packaged through the route, with its Gift Claim Token. */
async function giftToOpen(test: GiftsTestApp, giverId = insertUser(test.db)) {
  const packed = await test.packageSticker(giverId, test.sealSticker(giverId));
  const giftClaimToken = giftClaimTokenSchema.parse(packed.giftClaimToken);
  return { giverId, gift: packed.gift, giftClaimToken };
}

const preview = (
  test: GiftsTestApp,
  userId: string,
  giftClaimToken: string,
  context = ONE_TO_ONE,
) => test.post(userId, "/preview", { giftClaimToken, liffContextType: context });
const receive = (
  test: GiftsTestApp,
  userId: string,
  giftClaimToken: string,
  context = ONE_TO_ONE,
) => test.post(userId, "/receive", { giftClaimToken, liffContextType: context });

async function previewOf(response: Response) {
  expect(response.status).toBe(200);
  return giftPreviewSchema.parse(await response.json());
}

async function receivedOf(response: Response) {
  expect(response.status).toBe(200);
  return receivedGiftSchema.parse(await response.json());
}

/** Receiving answers `status` and `refusal`; the preview names the same refusal, and no sticker. */
async function expectRefused(
  test: GiftsTestApp,
  userId: string,
  giftClaimToken: string,
  status: number,
  refusal: ReceiveRefusal,
  context = ONE_TO_ONE,
) {
  expect(await refusalOf(await receive(test, userId, giftClaimToken, context))).toMatchObject({
    status,
    error: refusal,
  });
  expect(await previewOf(await preview(test, userId, giftClaimToken, context))).toMatchObject({
    receivable: false,
    refusal,
    sticker: null,
  });
}

const ownerOf = (test: GiftsTestApp, stickerId: string) =>
  test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId;
const termsAcceptedAt = (test: GiftsTestApp, userId: string) =>
  test.db.select().from(users).where(eq(users.id, userId)).get()?.termsAcceptedAt;

describe("POST /api/gifts/preview", () => {
  it("shows the giver, the expiry and the sticker, and receives nothing", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift, giftClaimToken } = await giftToOpen(test);
    const receiverId = insertUser(test.db);
    expect(await previewOf(await preview(test, receiverId, giftClaimToken))).toMatchObject({
      giver: { id: giverId },
      expiresAt: gift.expiresAt,
      receivable: true,
      refusal: null,
      sticker: { id: gift.stickerId, ownerId: giverId },
    });
    expect(test.giftRow(gift.id).status).toBe("packed");
  });
});

describe("POST /api/gifts/receive", () => {
  it("gives the receiver the sticker, on their board as NEW, and records the terms line once", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await giftToOpen(test);
    const receiverId = insertUser(test.db);
    const acceptedAt = test.clock.now();
    expect(await receivedOf(await receive(test, receiverId, giftClaimToken))).toMatchObject({
      gift: {
        id: gift.id,
        status: "received",
        escrowStatus: "claimed",
        receiverId,
        receivedAt: acceptedAt.toISOString(),
      },
      sticker: { id: gift.stickerId, ownerId: receiverId },
      stickerPlacement: { stickerId: gift.stickerId, placement: null, seenAt: null },
    });
    expect(termsAcceptedAt(test, receiverId)).toEqual(acceptedAt);
    test.clock.advance(HOUR_MS);
    await receivedOf(await receive(test, receiverId, (await giftToOpen(test)).giftClaimToken));
    expect(termsAcceptedAt(test, receiverId)).toEqual(acceptedAt);
  });

  it("gives a forwarded link's sticker to the first person only", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await giftToOpen(test);
    const first = insertUser(test.db);
    await receivedOf(await receive(test, first, giftClaimToken));
    for (const userId of [insertUser(test.db), first]) {
      await expectRefused(test, userId, giftClaimToken, 409, "already_received");
    }
    expect(ownerOf(test, gift.stickerId)).toBe(first);
  });

  it("returns a sticker coming back to its old spot in the tray, NEW again", async () => {
    const test = await createGiftsTestApp();
    const artistId = insertUser(test.db);
    const { gift, giftClaimToken } = await giftToOpen(test, artistId);
    const artistsPlacement = and(
      eq(stickerPlacements.userId, artistId),
      eq(stickerPlacements.stickerId, gift.stickerId),
    );
    const placed = test.db
      .update(stickerPlacements)
      .set({ ...SPOT, seenAt: test.clock.now() })
      .where(artistsPlacement)
      .returning()
      .get();
    const friendId = insertUser(test.db);
    await receivedOf(await receive(test, friendId, giftClaimToken));
    const back = await test.packageSticker(friendId, gift.stickerId);
    const returned = await receivedOf(
      await receive(test, artistId, giftClaimTokenSchema.parse(back.giftClaimToken)),
    );
    expect(returned.stickerPlacement).toEqual({
      stickerId: gift.stickerId,
      placement: { ...SPOT, onBoard: false },
      seenAt: null,
      arrivedAt: placed.createdAt.toISOString(),
    });
    expect(ownerOf(test, gift.stickerId)).toBe(artistId);
  });

  it("claims the escrowed sticker before recording it as received", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift, giftClaimToken } = await giftToOpen(test);
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    const reads = vi.spyOn(test.giftChain, "readEscrowGift");
    const claims = vi.spyOn(test.giftChain, "claimGift");
    const received = await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(received.gift).toMatchObject({
      status: "received",
      escrowStatus: "claimed",
    });
    expect(test.giftRow(gift.id).claimTxHash).toBe(test.giftChain.claimTransactions.get(gift.id));
    expect(reads).toHaveBeenCalledTimes(1);
    expect(claims).toHaveBeenCalledWith({
      giftId: gift.id,
      giftClaimToken,
      recipientId: receiverId,
    });
    expect(test.giftChain.escrow.get(gift.id)).toMatchObject({
      status: "claimed",
      recipient: await test.deps.smartWallets.addressFor(receiverId),
    });
  });

  it("reconciles a claim that landed before its database update", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift, giftClaimToken } = await giftToOpen(test);
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    await previewOf(await preview(test, receiverId, giftClaimToken));
    const landed = await test.giftChain.claimGift({
      giftId: gift.id,
      giftClaimToken,
      recipientId: receiverId,
    });
    if (!landed.claimed) throw new Error("The fake escrow did not claim the gift");

    const received = await receivedOf(await receive(test, receiverId, giftClaimToken));

    expect(received.gift).toMatchObject({
      status: "received",
      escrowStatus: "claimed",
    });
    expect(test.giftRow(gift.id).claimTxHash).toBe(landed.txHash);
  });

  it("leaves ownership unchanged when the escrow claim fails", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift, giftClaimToken } = await giftToOpen(test);
    test.landDeposit(gift.id);
    vi.spyOn(test.giftChain, "claimGift").mockRejectedValue(new Error("Sepolia unavailable"));

    const response = await receive(test, insertUser(test.db), giftClaimToken);

    expect(response.status).toBe(500);
    expect(test.giftRow(gift.id)).toMatchObject({ status: "packed", escrowStatus: "pending" });
    expect(ownerOf(test, gift.stickerId)).toBe(giverId);
  });

  it("does not give database ownership to a second recipient after another wallet claimed", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift, giftClaimToken } = await giftToOpen(test);
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    await previewOf(await preview(test, receiverId, giftClaimToken));
    await test.giftChain.claimGift({ giftId: gift.id, giftClaimToken, recipientId: receiverId });

    const loser = await receive(test, insertUser(test.db), giftClaimToken);
    expect(loser.status).toBe(409);
    expect(await loser.json()).toMatchObject({ error: "already_received" });
    expect(ownerOf(test, gift.stickerId)).toBe(giverId);

    await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(ownerOf(test, gift.stickerId)).toBe(receiverId);
  });
});

describe("Receiving refuses", () => {
  it("a group, a multi-person chat and an OpenChat, changing nothing", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift, giftClaimToken } = await giftToOpen(test);
    const receiverId = insertUser(test.db);
    for (const context of GROUP_CHATS) {
      await expectRefused(test, receiverId, giftClaimToken, 403, "group_chat", context);
    }
    expect(test.giftRow(gift.id).status).toBe("packed");
    expect(ownerOf(test, gift.stickerId)).toBe(giverId);
  });

  it("an NSFW sticker to anyone not adult, and gives it to an adult", async () => {
    const test = await createGiftsTestApp();
    const giverId = insertUser(test.db);
    const stickerId = test.sealSticker(giverId);
    test.db.update(stickers).set({ nsfw: true }).where(eq(stickers.id, stickerId)).run();
    const packed = await test.packageSticker(giverId, stickerId);
    const giftClaimToken = giftClaimTokenSchema.parse(packed.giftClaimToken);

    await expectRefused(test, insertUser(test.db), giftClaimToken, 403, "adults_only");
    expect(test.giftRow(packed.gift.id).forUserId).toBeNull();
    const adultId = insertUser(test.db, { ageVerifiedAt: test.clock.now() });
    expect((await receivedOf(await receive(test, adultId, giftClaimToken))).sticker).toMatchObject({
      id: stickerId,
      nsfw: true,
    });
  });

  it("your own gift", async () => {
    const test = await createGiftsTestApp();
    const { giverId, giftClaimToken } = await giftToOpen(test);
    await expectRefused(test, giverId, giftClaimToken, 403, "own_gift");
  });

  it("a gift taken back, or returned", async () => {
    const test = await createGiftsTestApp();
    const receiverId = insertUser(test.db);
    const takenBack = await giftToOpen(test);
    await giftOf(await test.post(takenBack.giverId, `/${takenBack.gift.id}/take-out`));
    await expectRefused(test, receiverId, takenBack.giftClaimToken, 409, "taken_back");
    const returned = await giftToOpen(test);
    test.db
      .update(gifts)
      .set({ status: "returned", returnedAt: test.clock.now(), escrowStatus: "expired_returned" })
      .where(eq(gifts.id, returned.gift.id))
      .run();
    await expectRefused(test, receiverId, returned.giftClaimToken, 410, "gift_returned");
  });

  it("a gift past its expiry", async () => {
    const test = await createGiftsTestApp();
    const { giftClaimToken } = await giftToOpen(test);
    test.clock.advance(GIFT_EXPIRY_MS);
    await expectRefused(test, insertUser(test.db), giftClaimToken, 410, "gift_expired");
  });

  it("a gift whose deposit hasn't landed, on the escrow chain", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giftClaimToken } = await giftToOpen(test);
    await expectRefused(test, insertUser(test.db), giftClaimToken, 409, "not_deposited");
  });

  it("an unknown Gift Claim Token, and a malformed one", async () => {
    const test = await createGiftsTestApp();
    const { giftClaimToken } = await giftToOpen(test);
    const receiverId = insertUser(test.db);
    for (const open of [preview, receive]) {
      expect(await refusalOf(await open(test, receiverId, bytes32("no such gift")))).toMatchObject({
        status: 404,
        error: "gift_not_found",
      });
      expect(
        await refusalOf(await open(test, receiverId, giftClaimToken.slice(0, -1))),
      ).toMatchObject({ status: 400, error: "invalid_request" });
    }
  });

  it("anyone signed out", async () => {
    const test = await createGiftsTestApp();
    for (const path of ["/preview", "/receive"]) {
      const response = await test.app.request(`/api/gifts${path}`, { method: "POST" });
      expect(await refusalOf(response)).toMatchObject({ status: 401, error: "signed_out" });
    }
  });
});
