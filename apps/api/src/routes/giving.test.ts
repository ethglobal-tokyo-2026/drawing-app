import { GIFT_EXPIRY_MS, stickers, users } from "@drawing-app/db";
import { bytes32, insertUser, packGift, receiveGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { keccak256 } from "viem";
import { assert, describe, expect, it } from "vitest";
import { giftClaimTokenSchema, pendingGiftsSchema } from "../gifts/packaging.ts";
import { createGiftsTestApp, giftOf } from "../gifts/testGifts.ts";
import { fakeSmartWallets } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";

const HOUR_MS = 60 * 60 * 1000;

describe("Packaging", () => {
  it("packs a gift whose Gift Claim Token only its commitment is kept for, then answers it again", async () => {
    const test = await createGiftsTestApp();
    const giverId = insertUser(test.db);
    const stickerId = test.sealSticker(giverId);
    const packed = await test.packageSticker(giverId, stickerId);
    expect(packed).toMatchObject({
      status: 201,
      gift: {
        stickerId,
        giverId,
        status: "packed",
        escrowStatus: "pending",
        expiresAt: new Date(test.clock.now().getTime() + GIFT_EXPIRY_MS).toISOString(),
      },
      escrowTransfer: null,
    });
    const token = giftClaimTokenSchema.parse(packed.giftClaimToken);
    expect(test.giftRow(packed.gift.id).claimCommitment).toBe(keccak256(token));
    expect(await test.packageSticker(giverId, stickerId)).toEqual({
      ...packed,
      status: 200,
      giftClaimToken: null,
    });
  });

  it("refuses a sticker you don't hold, an unknown one, and one in a sent gift", async () => {
    const test = await createGiftsTestApp();
    const me = insertUser(test.db);
    const friendsSticker = test.sealSticker(insertUser(test.db));
    expect(await refusalOf(await test.post(me, "", { stickerId: friendsSticker }))).toMatchObject({
      status: 403,
      error: "not_yours",
    });
    expect(
      await refusalOf(await test.post(me, "", { stickerId: "no-such-sticker" })),
    ).toMatchObject({ status: 404, error: "sticker_not_found" });
    const { giverId, gift } = await test.packagedGift();
    await giftOf(await test.share(giverId, gift.id, "sent"));
    expect(
      await refusalOf(await test.post(giverId, "", { stickerId: gift.stickerId })),
    ).toMatchObject({ status: 409, error: "gift_in_transit" });
  });

  it("on the mock chain, packs a taken-out sticker again, and lets its receiver give it on", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift } = await test.packagedGift();
    await giftOf(await test.takeOut(giverId, gift.id));
    const again = await test.packageSticker(giverId, gift.stickerId);
    expect(again).toMatchObject({ status: 201, gift: { status: "packed" } });
    expect(again.gift.id).not.toBe(gift.id);
    const receiverId = insertUser(test.db);
    receiveGift(test.db, again.gift.id, receiverId);
    expect(await test.packageSticker(receiverId, gift.stickerId)).toMatchObject({
      status: 201,
      gift: { giverId: receiverId, status: "packed" },
    });
  });
});

describe("Packaging on the escrow chain", () => {
  it("refuses a sticker that isn't minted", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const giverId = insertUser(test.db);
    const stickerId = test.sealSticker(giverId, { minted: false });
    expect(await refusalOf(await test.post(giverId, "", { stickerId }))).toMatchObject({
      status: 409,
      error: "not_minted",
    });
  });

  it("sends the sticker from the giver's smart wallet, and checks the deposit reported", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const packed = await test.packagedGift();
    const { giverId, gift } = packed;
    expect(packed).toMatchObject({
      status: 201,
      gift: { status: "packed", escrowStatus: "missing" },
    });

    const sender = await fakeSmartWallets().addressFor(giverId);
    assert(sender !== null, "The fake smart wallets give everyone one");
    const stored = test.db.select().from(users).where(eq(users.id, giverId)).get();
    expect(stored?.smartAccountAddress).toBe(sender);
    const row = test.giftRow(gift.id);
    const minted = test.db.select().from(stickers).where(eq(stickers.id, gift.stickerId)).get();
    const tokenId = minted?.tokenId;
    assert(tokenId, "The sticker is minted");
    expect(packed.escrowTransfer).toEqual(
      test.giftChain.prepareGiftTransfer({
        sender,
        tokenId,
        giftId: row.id,
        claimCommitment: row.claimCommitment,
        expiresAt: row.expiresAt,
      }),
    );
    // In the bag, the same transfer until the deposit lands.
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({
      status: 200,
      escrowTransfer: packed.escrowTransfer,
    });

    expect(await refusalOf(await test.deposit(giverId, row.id))).toMatchObject({
      status: 409,
      error: "deposit_not_landed",
    });
    test.landDeposit(row.id);
    expect(await giftOf(await test.post(giverId, `/${row.id}/deposit`, {}))).toMatchObject({
      status: "packed",
      escrowStatus: "pending",
    });
  });

  it("takes out a gift whose deposit isn't the one issued, and holds its sticker until the escrow lets go", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift } = await test.packagedGift();
    test.landDeposit(gift.id, { claimCommitment: bytes32("another commitment") });
    expect(await refusalOf(await test.deposit(giverId, gift.id))).toMatchObject({
      status: 409,
      error: "deposit_mismatch",
    });
    expect(test.giftRow(gift.id)).toMatchObject({ status: "taken_out", escrowStatus: "pending" });
    expect(
      await refusalOf(await test.post(giverId, "", { stickerId: gift.stickerId })),
    ).toMatchObject({ status: 409, error: "gift_in_transit" });
  });

  it("lets the receiver give a claimed sticker on without taking out its previous gift", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift, giftClaimToken } = await test.packagedGift();
    const { stickerId } = gift;
    const receiverId = insertUser(test.db);
    test.landDeposit(gift.id);
    await giftOf(await test.deposit(giverId, gift.id));
    await giftOf(await test.share(giverId, gift.id, "sent"));
    await giftOf(
      await test.post(receiverId, "/receive", { giftClaimToken, liffContextType: "utou" }),
    );
    const received = test.giftRow(gift.id);
    expect(received).toMatchObject({ status: "received", escrowStatus: "claimed", receiverId });

    const next = await test.packageSticker(receiverId, stickerId);
    expect(next).toMatchObject({
      status: 201,
      gift: { giverId: receiverId, stickerId, status: "packed", escrowStatus: "missing" },
    });
    expect(next.gift.id).not.toBe(gift.id);
    expect(next.escrowTransfer).not.toBeNull();
    expect(test.giftRow(gift.id)).toEqual(received);
    expect((await test.giftChain.readEscrowGift(gift.id)).status).toBe("claimed");
  });
});

describe("The picker's result", () => {
  it("sends a packed gift, and leaves a cancelled one as it was", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift } = await test.packagedGift();
    expect(await giftOf(await test.share(giverId, gift.id, "cancelled"))).toEqual(gift);
    const sent = await giftOf(await test.share(giverId, gift.id, "sent"));
    expect(sent).toMatchObject({ status: "sent", sentAt: test.clock.now().toISOString() });
    expect(await giftOf(await test.share(giverId, gift.id, "cancelled"))).toEqual(sent);
  });

  it("refuses to send a gift before its deposit lands, on the escrow chain", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift } = await test.packagedGift();
    expect(await refusalOf(await test.share(giverId, gift.id, "sent"))).toMatchObject({
      status: 409,
      error: "not_deposited",
    });
  });

  it("refuses a gift taken out", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift } = await test.packagedGift();
    await giftOf(await test.takeOut(giverId, gift.id));
    expect(await refusalOf(await test.share(giverId, gift.id, "sent"))).toMatchObject({
      status: 409,
      error: "gift_closed",
    });
  });
});

describe("Taking out", () => {
  it("takes a gift back from the bag, or after sending, and the mock escrow rejects it at once", async () => {
    const test = await createGiftsTestApp();
    const inTheBag = await test.packagedGift();
    const onItsWay = await test.packagedGift();
    await giftOf(await test.share(onItsWay.giverId, onItsWay.gift.id, "sent"));
    for (const { giverId, gift } of [inTheBag, onItsWay]) {
      expect(await giftOf(await test.takeOut(giverId, gift.id))).toMatchObject({
        status: "taken_out",
        escrowStatus: "rejected",
        takenOutAt: test.clock.now().toISOString(),
      });
    }
  });

  it("refuses a received gift and returns an already taken-out gift on retry", async () => {
    const test = await createGiftsTestApp();
    const received = await test.packagedGift();
    receiveGift(test.db, received.gift.id, insertUser(test.db));
    expect(await refusalOf(await test.takeOut(received.giverId, received.gift.id))).toMatchObject({
      status: 409,
      error: "already_received",
    });
    const { giverId, gift } = await test.packagedGift();
    await giftOf(await test.takeOut(giverId, gift.id));
    expect(await giftOf(await test.takeOut(giverId, gift.id))).toMatchObject({
      status: "taken_out",
      escrowStatus: "rejected",
    });
  });

  it.each(["missing", "pending"] as const)(
    "keeps the gift unchanged while the escrow reports %s instead of a confirmed take-out",
    async (escrowStatus) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { giverId, gift } = await test.packagedGift();
      if (escrowStatus === "pending") {
        test.landDeposit(gift.id);
        await giftOf(await test.deposit(giverId, gift.id));
      }
      const before = test.giftRow(gift.id);

      expect(await refusalOf(await test.takeOut(giverId, gift.id))).toMatchObject({
        status: 409,
        error: "take_out_not_landed",
      });
      expect(test.giftRow(gift.id)).toEqual(before);
    },
  );

  it("refuses to take out a gift claimed on-chain before Receiving is recorded", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift } = await test.packagedGift();
    test.landDeposit(gift.id);
    await giftOf(await test.deposit(giverId, gift.id));
    const before = test.giftRow(gift.id);
    const escrow = await test.giftChain.readEscrowGift(gift.id);
    test.giftChain.escrow.set(gift.id, { ...escrow, status: "claimed" });

    expect(await refusalOf(await test.takeOut(giverId, gift.id))).toMatchObject({
      status: 409,
      error: "already_received",
    });
    expect(test.giftRow(gift.id)).toEqual(before);
  });

  it.each(["rejected", "expired_returned"] as const)(
    "confirms %s before closing a chain gift, then lets the sticker be given again",
    async (escrowStatus) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { giverId, gift } = await test.packagedGift();
      test.landDeposit(gift.id);
      await giftOf(await test.deposit(giverId, gift.id));

      const escrow = await test.giftChain.readEscrowGift(gift.id);
      test.giftChain.escrow.set(gift.id, { ...escrow, status: escrowStatus });

      expect(await giftOf(await test.takeOut(giverId, gift.id))).toMatchObject({
        status: escrowStatus === "expired_returned" ? "returned" : "taken_out",
        escrowStatus,
      });
      expect(await giftOf(await test.takeOut(giverId, gift.id))).toMatchObject({ escrowStatus });
      expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({
        status: 201,
        gift: { status: "packed" },
      });
    },
  );
});

describe("A gift's routes", () => {
  it("refuse someone else's gift, an unknown gift, and a malformed gift id", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift } = await test.packagedGift();
    const stranger = insertUser(test.db);
    const unknownGift = bytes32("no such gift");
    const steps = [
      (userId: string, giftId: string) => test.deposit(userId, giftId),
      (userId: string, giftId: string) => test.share(userId, giftId, "sent"),
      (userId: string, giftId: string) => test.takeOut(userId, giftId),
    ];
    for (const step of steps) {
      expect(await refusalOf(await step(stranger, gift.id))).toMatchObject({
        status: 403,
        error: "not_yours",
      });
      expect(await refusalOf(await step(giverId, unknownGift))).toMatchObject({
        status: 404,
        error: "gift_not_found",
      });
      expect(await refusalOf(await step(giverId, gift.id.toUpperCase()))).toMatchObject({
        status: 400,
        error: "invalid_request",
      });
    }
    expect(test.giftRow(gift.id).status).toBe("packed");
  });
});

describe("GET /api/gifts/pending", () => {
  it("lists your packed and sent gifts, newest first, with their stickers", async () => {
    const test = await createGiftsTestApp();
    const me = insertUser(test.db);
    const hoursAgo = (hours: number) => new Date(test.clock.now().getTime() - hours * HOUR_MS);
    const pack = (giverId: string, values: Parameters<typeof packGift>[3]) =>
      packGift(test.db, test.sealSticker(giverId), giverId, { escrowStatus: "pending", ...values });
    const older = pack(me, { createdAt: hoursAgo(3) });
    const sent = pack(me, { createdAt: hoursAgo(2), status: "sent", sentAt: hoursAgo(1) });
    pack(me, { createdAt: hoursAgo(1), status: "taken_out", takenOutAt: hoursAgo(0) });
    pack(insertUser(test.db), {});

    const { gifts } = await bodyOf(await test.get(me, "/pending"), pendingGiftsSchema);
    expect(gifts.map(({ gift }) => gift.id)).toEqual([sent, older]);
    for (const { gift, sticker } of gifts) expect(sticker.id).toBe(gift.stickerId);
  });
});
