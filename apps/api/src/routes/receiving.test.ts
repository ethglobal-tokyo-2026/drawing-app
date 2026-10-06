import { GIFT_EXPIRY_MS, gifts, stickerPlacements, suiTransactions, users } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { and, eq, isNull } from "drizzle-orm";
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
import { SponsorshipError } from "../sui/types.ts";
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

/** How many claims the server built on Sui. */
const claimsBuilt = (test: GiftsTestApp) =>
  test.chain.built.filter(({ kind }) => kind === "claim").length;

/** The digest of the transaction Shinami sponsored last. */
function lastDigest(test: GiftsTestApp) {
  const last = test.chain.sponsorships.at(-1);
  if (!last) throw new Error("Shinami sponsored nothing");
  return last.sponsorship.digest;
}

/** On Sui, a gift in the escrow, and a receiver who opened its link, so it waits for them. */
async function openedOnSui(test: GiftsTestApp) {
  const deposited = await test.depositedGift();
  const receiverId = insertUser(test.db);
  await previewOf(await preview(test, receiverId, deposited.giftClaimToken));
  return { ...deposited, receiverId };
}

/** A claim for `receiverId` that ran on Sui while its answer was lost, so nothing recorded it. */
async function claimLandedUnrecorded(
  test: GiftsTestApp,
  receiverId: string,
  giftClaimToken: string,
) {
  test.chain.answerNext("lost");
  expect(await refusalOf(await receive(test, receiverId, giftClaimToken))).toMatchObject({
    status: 503,
    error: "claim_failed",
  });
  test.chain.show(lastDigest(test), { ok: true, events: [] });
}

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
});

describe("Receiving on Sui", () => {
  it("claims the gift for the receiver's wallet, and records the receive with the claim", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken, receiverId } = await openedOnSui(test);
    const received = await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(received.gift).toMatchObject({
      status: "received",
      escrowStatus: "claimed",
      receiverId,
    });
    const recipient = test.wallets.keyOf(receiverId).toSuiAddress();
    expect(test.chain.built.at(-1)).toEqual({ kind: "claim", giftId: gift.id, recipient });
    expect(test.chain.escrow.get(gift.id)).toEqual({ status: "claimed", recipient });
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
  });

  it.each(["link", "board"])(
    "recovers a completed receive through the %s without claiming again or resetting placement",
    async (entry) => {
      const test = await createGiftsTestApp({ onSui: true });
      const { gift, giftClaimToken, receiverId } = await openedOnSui(test);
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
      const retried = await receivedOf(await accept());
      expect(retried.gift).toEqual(first.gift);
      expect(retried.stickerPlacement).toMatchObject({
        placement: SPOT,
        seenAt: placement.seenAt?.toISOString(),
      });
      expect(claimsBuilt(test)).toBe(1);
    },
  );

  it("shares overlapping Accept requests by the same recipient", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, receiverId } = await openedOnSui(test);
    const results = await Promise.all([
      receiveGiftForYou(test.deps, receiverId, gift.id),
      receiveGiftForYou(test.deps, receiverId, gift.id),
    ]);
    expect(results[0]).toMatchObject({ refusal: null, received: { gift: { receiverId } } });
    expect(results[1]).toEqual(results[0]);
    expect(claimsBuilt(test)).toBe(1);
  });

  it("answers a claim Sui hasn't answered with claim_failed, then records it once Sui shows it ran", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, giftClaimToken, receiverId } = await openedOnSui(test);
    await claimLandedUnrecorded(test, receiverId, giftClaimToken);
    expect(test.giftRow(gift.id)).toMatchObject({ status: "packed", receiverId: null });
    expect(test.ownerOf(gift.stickerId)).toBe(giverId);

    expect((await receivedOf(await receive(test, receiverId, giftClaimToken))).gift).toMatchObject({
      status: "received",
      receiverId,
    });
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
    expect(claimsBuilt(test)).toBe(1);
  });

  it("records a claim that landed before the gift expired when Accept comes after, for its receiver only", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken, receiverId } = await openedOnSui(test);
    const unclaimed = await test.depositedGift();
    await claimLandedUnrecorded(test, receiverId, giftClaimToken);
    test.clock.advance(GIFT_EXPIRY_MS);

    await expectRefused(test, receiverId, unclaimed.giftClaimToken, 410, "gift_expired");
    const someoneElse = await receive(test, insertUser(test.db), giftClaimToken);
    expect(await refusalOf(someoneElse)).toMatchObject({ status: 409, error: "already_received" });
    expect(test.giftRow(gift.id).receiverId).toBeNull();
    await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
  });

  it.each([
    { escrow: "taken_out", status: 409, refusal: "taken_back" },
    { escrow: "expired_returned", status: 410, refusal: "gift_returned" },
  ] as const)(
    "answers a claim that failed because the escrow let the gift go ($escrow) with its refusal",
    async ({ escrow, status, refusal }) => {
      const test = await createGiftsTestApp({ onSui: true });
      const { giverId, gift, giftClaimToken, receiverId } = await openedOnSui(test);
      test.chain.escrow.set(gift.id, { status: escrow, recipient: null });
      test.chain.answerNext({ ok: false, failure: "MoveAbort(gift, 2)" });
      expect(await refusalOf(await receive(test, receiverId, giftClaimToken))).toMatchObject({
        status,
        error: refusal,
      });
      expect(test.ownerOf(gift.stickerId)).toBe(giverId);
    },
  );

  it("answers the claim's own failure when the escrow can't be read after it, and logs both", async () => {
    const logs = captureLogLines();
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken, receiverId } = await openedOnSui(test);
    const failure = "MoveAbort(gift, 2) in command 0";
    test.chain.answerNext({ ok: false, failure });
    vi.spyOn(test.chain.sui, "readGift").mockRejectedValueOnce(
      new ChainUnavailableError("Sui couldn't be asked for the gift"),
    );

    const failed = await refusalOf(await receive(test, receiverId, giftClaimToken));
    expect(failed).toMatchObject({ status: 503, error: "claim_failed" });
    expect(failed.detail).toContain(failure);
    logs.expectLogged("sui.tx.failed", { kind: "claim", giftId: gift.id });
    logs.expectLogged("gift.claim.check_failed", { giftId: gift.id, userId: receiverId });
    expect(test.giftRow(gift.id)).toMatchObject({ status: "packed", escrowStatus: "pending" });
  });

  it("answers Shinami being unreachable with sponsor_unavailable, leaving the gift to receive", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken, receiverId } = await openedOnSui(test);
    test.chain.refuseNext(
      new SponsorshipError("unavailable", "Shinami's gas_sponsorTransactionBlock timed out"),
    );
    expect(await refusalOf(await receive(test, receiverId, giftClaimToken))).toMatchObject({
      status: 503,
      error: "sponsor_unavailable",
    });
    await receivedOf(await receive(test, receiverId, giftClaimToken));
    expect(test.giftRow(gift.id).receiverId).toBe(receiverId);
  });

  it("refuses a receiver without a Sui wallet", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giftClaimToken, receiverId } = await openedOnSui(test);
    test.wallets.without.add(receiverId);
    expect(await refusalOf(await receive(test, receiverId, giftClaimToken))).toMatchObject({
      status: 409,
      error: "no_sui_wallet",
    });
  });

  it("refuses a gift whose deposit hasn't landed, leaving the giver's deposit to sign", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken } = await test.packagedGift();
    await expectRefused(test, insertUser(test.db), giftClaimToken, 409, "not_deposited");
    const open = test.db
      .select()
      .from(suiTransactions)
      .where(and(eq(suiTransactions.giftId, gift.id), isNull(suiTransactions.outcome)))
      .get();
    expect(open?.kind).toBe("deposit");
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

  it("an NSFW sticker to anyone not opted in, and gives it to someone opted in", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await test.packagedGift(insertUser(test.db), { nsfw: true });

    await expectRefused(test, insertUser(test.db), giftClaimToken, 403, "nsfw_not_opted_in");
    expect(test.giftRow(gift.id).forUserId).toBeNull();
    const optedInId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    expect(
      (await receivedOf(await receive(test, optedInId, giftClaimToken))).sticker,
    ).toMatchObject({
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

  it("a gift past its expiry", async () => {
    const test = await createGiftsTestApp();
    const { giftClaimToken } = await test.packagedGift();
    test.clock.advance(GIFT_EXPIRY_MS);
    await expectRefused(test, insertUser(test.db), giftClaimToken, 410, "gift_expired");
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
