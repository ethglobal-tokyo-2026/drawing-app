import { GIFT_EXPIRY_MS, gifts, stickerPlacements, users } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChainUnavailableError } from "../deps.ts";
import { giftClaimTokenSchema } from "../gifts/packaging.ts";
import {
  giftPreviewSchema,
  receivedGiftSchema,
  receiveGiftForYou,
  type ReceiveRefusal,
} from "../gifts/receiving.ts";
import { createGiftsTestApp, giftOf, type GiftsTestApp } from "../gifts/testGifts.ts";
import { captureLogLines } from "../testing/logLines.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { SPOT } from "../testing/rows.ts";

const HOUR_MS = 60 * 60 * 1000;
/** A 1:1 chat, where a Gift Message is received. */
const ONE_TO_ONE = "utou";
const GROUP_CHATS = ["group", "room", "square_chat"];

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

const previewOf = (response: Response) => bodyOf(response, giftPreviewSchema);
const receivedOf = (response: Response) => bodyOf(response, receivedGiftSchema);

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

const termsAcceptedAt = (test: GiftsTestApp, userId: string) =>
  test.db.select().from(users).where(eq(users.id, userId)).get()?.termsAcceptedAt;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/gifts/preview", () => {
  it("shows the giver, the expiry and the sticker, and receives nothing", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift, giftClaimToken } = await test.packagedGift();
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
    const { gift, giftClaimToken } = await test.packagedGift();
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
    await receivedOf(await receive(test, receiverId, (await test.packagedGift()).giftClaimToken));
    expect(termsAcceptedAt(test, receiverId)).toEqual(acceptedAt);
  });

  it("gives a forwarded link's sticker to the first person only", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await test.packagedGift();
    const first = insertUser(test.db);
    await receivedOf(await receive(test, first, giftClaimToken));
    await expectRefused(test, insertUser(test.db), giftClaimToken, 409, "already_received");
    expect(test.ownerOf(gift.stickerId)).toBe(first);
  });

  it.each(["link", "board"])(
    "recovers a completed receive through the %s without repeating the claim or resetting placement",
    async (entry) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { gift, giftClaimToken } = await test.packagedGift();
      test.landDeposit(gift.id);
      const receiverId = insertUser(test.db);
      await previewOf(await preview(test, receiverId, giftClaimToken));
      const claims = vi.spyOn(test.giftChain, "claimGift");
      const accept = () =>
        entry === "link"
          ? receive(test, receiverId, giftClaimToken)
          : test.post(receiverId, `/${gift.id}/receive`);
      const first = await receivedOf(await accept());
      test.clock.advance(GIFT_EXPIRY_MS);
      const placement = test.db
        .update(stickerPlacements)
        .set({ ...SPOT, seenAt: test.clock.now() })
        .where(
          and(
            eq(stickerPlacements.userId, receiverId),
            eq(stickerPlacements.stickerId, gift.stickerId),
          ),
        )
        .returning()
        .get();
      const recorded = test.giftRow(gift.id);
      const retried = await receivedOf(await accept());
      expect(retried.gift).toEqual(first.gift);
      expect(retried.stickerPlacement).toMatchObject({
        placement: SPOT,
        seenAt: placement.seenAt?.toISOString(),
      });
      expect(test.giftRow(gift.id)).toEqual(recorded);
      expect(claims).toHaveBeenCalledTimes(1);
    },
  );

  it("shares overlapping Accept requests by the same recipient", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift, giftClaimToken } = await test.packagedGift();
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    await previewOf(await preview(test, receiverId, giftClaimToken));
    const claim = test.giftChain.claimGift;
    const finishClaim = vi.fn<() => void>();
    const pending = new Promise<void>((resolve) => finishClaim.mockImplementation(resolve));
    const claims = vi.spyOn(test.giftChain, "claimGift").mockImplementation(async (request) => {
      await pending;
      return claim(request);
    });
    const first = receiveGiftForYou(test.deps, receiverId, gift.id);
    const retry = receiveGiftForYou(test.deps, receiverId, gift.id);
    finishClaim();
    const results = await Promise.all([first, retry]);
    expect(results[0]).toMatchObject({ refusal: null, received: { gift: { receiverId } } });
    expect(results[1]).toEqual(results[0]);
    expect(claims).toHaveBeenCalledTimes(1);
  });

  it("does not restore an old receipt after its sticker has been given again", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await test.packagedGift();
    const receiverId = insertUser(test.db);
    await receivedOf(await receive(test, receiverId, giftClaimToken));
    const next = await test.packageSticker(receiverId, gift.stickerId);
    await expectRefused(test, receiverId, giftClaimToken, 409, "already_received");
    const nextReceiver = insertUser(test.db);
    await receivedOf(
      await receive(test, nextReceiver, giftClaimTokenSchema.parse(next.giftClaimToken)),
    );
    await expectRefused(test, receiverId, giftClaimToken, 409, "already_received");
    expect(test.ownerOf(gift.stickerId)).toBe(nextReceiver);
  });

  it("returns a sticker coming back to its old spot in the tray, NEW again", async () => {
    const test = await createGiftsTestApp();
    const artistId = insertUser(test.db);
    const { gift, giftClaimToken } = await test.packagedGift(artistId);
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
    expect(test.ownerOf(gift.stickerId)).toBe(artistId);
  });

  it("claims the escrowed sticker before recording it as received", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift, giftClaimToken } = await test.packagedGift();
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
    const { gift, giftClaimToken } = await test.packagedGift();
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

  it("answers a claim the chain didn't confirm with claim_failed, then receives the gift once the claim lands", async () => {
    const logs = captureLogLines();
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift, giftClaimToken } = await test.packagedGift();
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    const claim = test.giftChain.claimGift;
    const receiptTimeout = new Error("Timed out waiting for the claim to be confirmed");
    vi.spyOn(test.giftChain, "claimGift").mockRejectedValueOnce(receiptTimeout);

    const failed = await refusalOf(await receive(test, receiverId, giftClaimToken));
    expect(failed).toMatchObject({ status: 503, error: "claim_failed" });
    expect(failed.detail).toContain(gift.id);
    expect(failed.detail).toContain(`(${receiptTimeout.message})`);
    logs.expectLogged("gift.claim.failed", { giftId: gift.id, userId: receiverId });
    expect(logs.raw.join("\n")).toContain(receiptTimeout.message);
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "packed",
      escrowStatus: "pending",
      receiverId: null,
    });
    expect(test.ownerOf(gift.stickerId)).toBe(giverId);

    const landed = await claim({ giftId: gift.id, giftClaimToken, recipientId: receiverId });
    if (!landed.claimed) throw new Error("The fake escrow did not claim the gift");
    await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(test.giftRow(gift.id)).toMatchObject({ status: "received", claimTxHash: landed.txHash });
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
  });

  it("answers the claim's own failure when the check after it can't read the escrow, and logs both", async () => {
    const logs = captureLogLines();
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift, giftClaimToken } = await test.packagedGift();
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    await previewOf(await preview(test, receiverId, giftClaimToken));
    const claimFailure = new Error("Timed out waiting for the claim to be confirmed");
    vi.spyOn(test.giftChain, "claimGift").mockRejectedValueOnce(claimFailure);
    vi.spyOn(test.giftChain, "readEscrowGift").mockRejectedValueOnce(
      new ChainUnavailableError("Reading the escrow failed", { cause: new Error("fetch failed") }),
    );

    const failed = await refusalOf(await receive(test, receiverId, giftClaimToken));

    expect(failed).toMatchObject({ status: 503, error: "claim_failed" });
    expect(failed.detail).toContain(claimFailure.message);
    logs.expectLogged("gift.claim.failed", { giftId: gift.id, userId: receiverId });
    logs.expectLogged("gift.claim.check_failed", { giftId: gift.id, userId: receiverId });
    expect(test.giftRow(gift.id)).toMatchObject({ status: "packed", escrowStatus: "pending" });
  });

  it("answers an escrow the chain can't read with chain_unavailable, and its cause", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giftClaimToken } = await test.packagedGift();
    const cause = new Error("fetch failed");
    vi.spyOn(test.giftChain, "readEscrowGift").mockRejectedValueOnce(
      new ChainUnavailableError("Reading the escrow failed", { cause }),
    );

    const refused = await refusalOf(await preview(test, insertUser(test.db), giftClaimToken));
    expect(refused).toMatchObject({ status: 502, error: "chain_unavailable" });
    expect(refused.detail).toContain(cause.message);
  });

  it("records a claim that landed before the gift expired, when Accept comes only after", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const claimed = await test.packagedGift();
    const unclaimed = await test.packagedGift();
    test.landDeposit(claimed.gift.id);
    test.landDeposit(unclaimed.gift.id);
    const receiverId = insertUser(test.db);
    const landed = await test.giftChain.claimGift({
      giftId: claimed.gift.id,
      giftClaimToken: claimed.giftClaimToken,
      recipientId: receiverId,
    });
    if (!landed.claimed) throw new Error("The fake escrow did not claim the gift");
    test.clock.advance(GIFT_EXPIRY_MS);

    await expectRefused(test, receiverId, unclaimed.giftClaimToken, 410, "gift_expired");
    const someoneElse = await receive(test, insertUser(test.db), claimed.giftClaimToken);
    expect(await refusalOf(someoneElse)).toMatchObject({ status: 409, error: "already_received" });
    const opened = await previewOf(await preview(test, receiverId, claimed.giftClaimToken));
    expect(opened.receivable).toBe(true);
    await receivedOf(await receive(test, receiverId, claimed.giftClaimToken));
    expect(test.giftRow(claimed.gift.id)).toMatchObject({
      status: "received",
      claimTxHash: landed.txHash,
    });
    expect(test.ownerOf(claimed.gift.stickerId)).toBe(receiverId);
  });

  it("does not give database ownership to a second recipient after another wallet claimed", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift, giftClaimToken } = await test.packagedGift();
    test.landDeposit(gift.id);
    const receiverId = insertUser(test.db);
    await previewOf(await preview(test, receiverId, giftClaimToken));
    await test.giftChain.claimGift({ giftId: gift.id, giftClaimToken, recipientId: receiverId });

    const loser = await receive(test, insertUser(test.db), giftClaimToken);
    expect(await refusalOf(loser)).toMatchObject({ status: 409, error: "already_received" });
    expect(test.ownerOf(gift.stickerId)).toBe(giverId);

    await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
  });
});

describe("Receiving refuses", () => {
  it("a group, a multi-person chat and an OpenChat, changing nothing", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift, giftClaimToken } = await test.packagedGift();
    const receiverId = insertUser(test.db);
    for (const context of GROUP_CHATS) {
      await expectRefused(test, receiverId, giftClaimToken, 403, "group_chat", context);
    }
    expect(test.giftRow(gift.id).status).toBe("packed");
    expect(test.ownerOf(gift.stickerId)).toBe(giverId);
  });

  it("an NSFW sticker to anyone not adult, and gives it to an adult", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await test.packagedGift(insertUser(test.db), { nsfw: true });

    await expectRefused(test, insertUser(test.db), giftClaimToken, 403, "adults_only");
    expect(test.giftRow(gift.id).forUserId).toBeNull();
    const adultId = insertUser(test.db, { ageVerifiedAt: test.clock.now() });
    expect((await receivedOf(await receive(test, adultId, giftClaimToken))).sticker).toMatchObject({
      id: gift.stickerId,
      nsfw: true,
    });
  });

  it("your own gift", async () => {
    const test = await createGiftsTestApp();
    const { giverId, giftClaimToken } = await test.packagedGift();
    await expectRefused(test, giverId, giftClaimToken, 403, "own_gift");
  });

  it("a gift taken back, or returned", async () => {
    const test = await createGiftsTestApp();
    const receiverId = insertUser(test.db);
    const takenBack = await test.packagedGift();
    await giftOf(await test.takeOut(takenBack.giverId, takenBack.gift.id));
    await expectRefused(test, receiverId, takenBack.giftClaimToken, 409, "taken_back");
    const returned = await test.packagedGift();
    test.db
      .update(gifts)
      .set({ status: "returned", returnedAt: test.clock.now(), escrowStatus: "expired_returned" })
      .where(eq(gifts.id, returned.gift.id))
      .run();
    await expectRefused(test, receiverId, returned.giftClaimToken, 410, "gift_returned");
  });

  it.each([
    { escrow: "rejected", status: 409, refusal: "taken_back", recorded: "taken_out" },
    { escrow: "expired_returned", status: 410, refusal: "gift_returned", recorded: "returned" },
  ] as const)(
    "a gift the escrow let go ($escrow) before the server recorded it, instead of failing the claim",
    async ({ escrow, status, refusal, recorded }) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { giverId, gift, giftClaimToken } = await test.packagedGift();
      test.landDeposit(gift.id);
      const receiverId = insertUser(test.db);
      const opened = await previewOf(await preview(test, receiverId, giftClaimToken));
      expect(opened.receivable).toBe(true);
      test.setEscrowStatus(gift.id, escrow);

      await expectRefused(test, receiverId, giftClaimToken, status, refusal);
      expect(test.giftRow(gift.id)).toMatchObject({
        status: recorded,
        escrowStatus: escrow,
        receiverId: null,
      });
      expect(test.ownerOf(gift.stickerId)).toBe(giverId);
    },
  );

  it("a gift past its expiry", async () => {
    const test = await createGiftsTestApp();
    const { giftClaimToken } = await test.packagedGift();
    test.clock.advance(GIFT_EXPIRY_MS);
    await expectRefused(test, insertUser(test.db), giftClaimToken, 410, "gift_expired");
  });

  it("a gift whose deposit hasn't landed, on the escrow chain", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giftClaimToken } = await test.packagedGift();
    await expectRefused(test, insertUser(test.db), giftClaimToken, 409, "not_deposited");
  });

  it("an unknown Gift Claim Token, and a malformed one", async () => {
    const test = await createGiftsTestApp();
    const { giftClaimToken } = await test.packagedGift();
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
});
