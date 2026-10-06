import { GIFT_EXPIRY_MS } from "@drawing-app/db";
import { bytes32, insertUser, packGift, receiveGift } from "@drawing-app/db/testing";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { describe, expect, it } from "vitest";
import { claimCommitmentOf, giftClaimTokenSchema, pendingGiftsSchema } from "../gifts/packaging.ts";
import {
  createGiftsTestApp,
  giftOf,
  SOME_SIGNED_TRANSACTION,
  takeOutStartOf,
  type GiftsTestApp,
} from "../gifts/testGifts.ts";
import { SPONSORSHIP_MARGIN_MS } from "../sui/transactions.ts";
import { TransactionRefusedError } from "../sui/types.ts";
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
      deposit: null,
    });
    const token = giftClaimTokenSchema.parse(packed.giftClaimToken);
    expect(test.giftRow(packed.gift.id).claimCommitment).toBe(claimCommitmentOf(token));
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

describe("Packaging on Sui", () => {
  it("refuses a sticker that isn't minted, and a giver without a Sui wallet", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const giverId = insertUser(test.db);
    const unminted = test.sealSticker(giverId, { minted: false });
    expect(await refusalOf(await test.post(giverId, "", { stickerId: unminted }))).toMatchObject({
      status: 409,
      error: "not_minted",
    });
    test.wallets.without.add(giverId);
    const minted = test.sealSticker(giverId);
    expect(await refusalOf(await test.post(giverId, "", { stickerId: minted }))).toMatchObject({
      status: 409,
      error: "no_sui_wallet",
    });
  });

  it("sponsors the deposit of the gift's sticker from the giver's wallet, answers it again until it lands, and none after", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const packed = await test.packagedGift();
    const { giverId, gift, deposit } = packed;
    expect(packed).toMatchObject({
      status: 201,
      gift: { status: "packed", escrowStatus: "missing" },
    });
    if (!deposit) throw new Error("Packaging answered no deposit to sign");
    const row = test.giftRow(gift.id);
    expect(test.chain.built).toEqual([
      {
        kind: "deposit",
        deposit: {
          sender: test.wallets.keyOf(giverId).toSuiAddress(),
          stickerObjectId: test.chain.sui.stickerObjectId(gift.stickerId),
          giftId: row.id,
          claimCommitment: row.claimCommitment,
          expiresAt: row.expiresAt,
        },
      },
    ]);
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({
      status: 200,
      giftClaimToken: null,
      deposit,
    });

    const landed = await giftOf(
      await test.deposit(giverId, gift.id, await test.signed(giverId, deposit)),
    );
    expect(landed).toMatchObject({ status: "packed", escrowStatus: "pending" });
    expect(test.chain.escrow.get(gift.id)?.status).toBe("pending");
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({
      status: 200,
      deposit: null,
    });
    expect(test.chain.sponsorships).toHaveLength(1);
  });

  it("sponsors the same gift's deposit again once the last one is about to lapse unsigned", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, deposit } = await test.packagedGift();
    if (!deposit) throw new Error("Packaging answered no deposit to sign");
    test.clock.set(new Date(Date.parse(deposit.expiresAt) - SPONSORSHIP_MARGIN_MS));

    const again = await test.packageSticker(giverId, gift.stickerId);
    expect(again).toMatchObject({ status: 200, gift: { id: gift.id } });
    expect(again.deposit?.digest).not.toBe(deposit.digest);
    expect(
      await refusalOf(await test.deposit(giverId, gift.id, await test.signed(giverId, deposit))),
    ).toMatchObject({
      status: 409,
      error: "sponsorship_expired",
    });
  });
});

/** On Sui, a packaged gift and the giver's signature over its deposit. */
async function signedDeposit(test: GiftsTestApp) {
  const packed = await test.packagedGift();
  if (!packed.deposit) throw new Error("Packaging answered no deposit to sign");
  return { ...packed, signed: await test.signed(packed.giverId, packed.deposit) };
}

describe("A signed deposit on Sui", () => {
  it("refuses a signature that isn't the giver's wallet's, and one for a deposit the gift doesn't have", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, deposit, signed } = await signedDeposit(test);
    if (!deposit) throw new Error("Packaging answered no deposit to sign");
    const forged = await Ed25519Keypair.generate().signTransaction(fromBase64(deposit.txBytes));
    expect(
      await refusalOf(
        await test.deposit(giverId, gift.id, { ...signed, signature: forged.signature }),
      ),
    ).toMatchObject({ status: 400, error: "signature_invalid" });
    expect(
      await refusalOf(await test.deposit(giverId, gift.id, SOME_SIGNED_TRANSACTION)),
    ).toMatchObject({ status: 409, error: "sponsorship_expired" });
    expect(test.chain.submissions).toEqual([]);
  });

  it("closes a gift whose deposit failed on Sui, in Sui's words, so its sticker packs again", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, signed } = await signedDeposit(test);
    const failure = "MoveAbort(MoveLocation { module: gift }, 0) in command 0";
    test.chain.answerNext({ ok: false, failure });
    const refused = await refusalOf(await test.deposit(giverId, gift.id, signed));
    expect(refused).toMatchObject({ status: 409, error: "transaction_failed" });
    expect(refused.detail).toContain(failure);
    expect(test.giftRow(gift.id)).toMatchObject({ status: "taken_out", escrowStatus: "missing" });
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it("answers a deposit Sui refuses outright as expired, and one whose answer was lost when sent again", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const refused = await signedDeposit(test);
    test.chain.answerNext(new TransactionRefusedError("Invalid user signature"));
    const expired = await refusalOf(
      await test.deposit(refused.giverId, refused.gift.id, refused.signed),
    );
    expect(expired).toMatchObject({ status: 409, error: "sponsorship_expired" });
    expect(expired.detail).toContain("Invalid user signature");

    const lost = await signedDeposit(test);
    test.chain.answerNext("lost");
    expect(
      await refusalOf(await test.deposit(lost.giverId, lost.gift.id, lost.signed)),
    ).toMatchObject({
      status: 503,
      error: "deposit_not_landed",
    });
    test.chain.show(lost.signed.digest, { ok: true, events: [] });
    expect(await giftOf(await test.deposit(lost.giverId, lost.gift.id, lost.signed))).toMatchObject(
      {
        escrowStatus: "pending",
      },
    );
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

  it("refuses to send a gift before its deposit lands, on Sui", async () => {
    const test = await createGiftsTestApp({ onSui: true });
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
  it("takes a gift back from the bag, or after sending, at once on the mock chain", async () => {
    const test = await createGiftsTestApp();
    const inTheBag = await test.packagedGift();
    const onItsWay = await test.packagedGift();
    await giftOf(await test.share(onItsWay.giverId, onItsWay.gift.id, "sent"));
    for (const { giverId, gift } of [inTheBag, onItsWay]) {
      expect(await giftOf(await test.takeOut(giverId, gift.id))).toMatchObject({
        status: "taken_out",
        escrowStatus: "taken_out",
        takenOutAt: test.clock.now().toISOString(),
      });
    }
  });

  it("refuses a received gift and answers an already taken-out gift on retry", async () => {
    const test = await createGiftsTestApp();
    const received = await test.packagedGift();
    receiveGift(test.db, received.gift.id, insertUser(test.db));
    expect(await refusalOf(await test.takeOut(received.giverId, received.gift.id))).toMatchObject({
      status: 409,
      error: "already_received",
    });
    const { giverId, gift } = await test.packagedGift();
    const takenOut = await giftOf(await test.takeOut(giverId, gift.id));
    expect(await giftOf(await test.takeOut(giverId, gift.id))).toEqual(takenOut);
  });
});

describe("Taking out on Sui", () => {
  it("closes a gift whose deposit was never sent, dropping the unsigned deposit", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, signed } = await signedDeposit(test);
    const started = await takeOutStartOf(await test.takeOut(giverId, gift.id));
    expect(started.gift).toMatchObject({ status: "taken_out", escrowStatus: "missing" });
    expect(started.takeOut).toBeUndefined();
    expect(await refusalOf(await test.deposit(giverId, gift.id, signed))).toMatchObject({
      status: 409,
      error: "sponsorship_expired",
    });
    expect(test.chain.submissions).toEqual([]);
  });

  it("answers the take-out of a gift the escrow holds for the giver to sign, then records it once it lands", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift } = await test.depositedGift();
    const { takeOut } = await takeOutStartOf(await test.takeOut(giverId, gift.id));
    if (!takeOut) throw new Error("Take-out's start answered no take-out to sign");
    expect(test.chain.built.at(-1)).toEqual({
      kind: "take_out",
      sender: test.wallets.keyOf(giverId).toSuiAddress(),
      giftId: gift.id,
    });
    expect((await takeOutStartOf(await test.takeOut(giverId, gift.id))).takeOut).toEqual(takeOut);

    const takenOut = await giftOf(
      await test.submitTakeOut(giverId, gift.id, await test.signed(giverId, takeOut)),
    );
    expect(takenOut).toMatchObject({ status: "taken_out", escrowStatus: "taken_out" });
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it("answers a take-out that failed because the gift was received first as already received", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift } = await test.depositedGift();
    const { takeOut } = await takeOutStartOf(await test.takeOut(giverId, gift.id));
    if (!takeOut) throw new Error("Take-out's start answered no take-out to sign");
    test.chain.escrow.set(gift.id, { status: "claimed", recipient: `0x${"7".repeat(64)}` });
    test.chain.answerNext({ ok: false, failure: "MoveAbort(gift, 2)" });
    expect(
      await refusalOf(
        await test.submitTakeOut(giverId, gift.id, await test.signed(giverId, takeOut)),
      ),
    ).toMatchObject({ status: 409, error: "already_received" });
  });
});

describe("A gift's routes", () => {
  it("refuse someone else's gift, an unknown gift, and a malformed gift id", async () => {
    const test = await createGiftsTestApp();
    const { giverId, gift } = await test.packagedGift();
    const stranger = insertUser(test.db);
    const unknownGift = bytes32("no such gift");
    const steps = [
      (userId: string, giftId: string) => test.deposit(userId, giftId, SOME_SIGNED_TRANSACTION),
      (userId: string, giftId: string) => test.share(userId, giftId, "sent"),
      (userId: string, giftId: string) => test.takeOut(userId, giftId),
      (userId: string, giftId: string) =>
        test.submitTakeOut(userId, giftId, SOME_SIGNED_TRANSACTION),
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
    pack(me, {
      createdAt: hoursAgo(1),
      status: "taken_out",
      takenOutAt: hoursAgo(0),
      escrowStatus: "taken_out",
    });
    pack(insertUser(test.db), {});

    const { gifts } = await bodyOf(await test.get(me, "/pending"), pendingGiftsSchema);
    expect(gifts.map(({ gift }) => gift.id)).toEqual([sent, older]);
    for (const { gift, sticker } of gifts) expect(sticker.id).toBe(gift.stickerId);
  });
});
