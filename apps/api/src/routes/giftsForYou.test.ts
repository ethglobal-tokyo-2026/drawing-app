import { stickers } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { giftClaimTokenSchema, packagedGiftSchema } from "../gifts/packaging.ts";
import { giftsForYouSchema, receivedGiftSchema } from "../gifts/receiving.ts";
import { createGiftsTestApp, refusalOf, type GiftsTestApp } from "../gifts/testGifts.ts";

/** A gift of a sticker its giver drew, packaged for `forUserId` if given, and sent through LINE. */
async function sentGift(test: GiftsTestApp, forUserId?: string) {
  const giverId = insertUser(test.db);
  const stickerId = test.sealSticker(giverId);
  const response = await test.post(giverId, "", { stickerId, ...(forUserId && { forUserId }) });
  const { gift, giftClaimToken } = packagedGiftSchema.parse(await response.json());
  // On the escrow chain, the giver's wallet deposits it before LINE sends it.
  if (test.giftRow(gift.id).escrowStatus === "missing") {
    test.landDeposit(gift.id);
    await test.post(giverId, `/${gift.id}/deposit`, {});
  }
  await test.post(giverId, `/${gift.id}/shared`, { outcome: "sent" });
  return { giverId, gift, giftClaimToken: giftClaimTokenSchema.parse(giftClaimToken) };
}

const waitingFor = async (test: GiftsTestApp, userId: string) =>
  giftsForYouSchema.parse(await (await test.get(userId, "/for-you")).json()).gifts;
const receiveFromBoard = (test: GiftsTestApp, userId: string, giftId: string) =>
  test.post(userId, `/${giftId}/receive`);
const ownerOf = (test: GiftsTestApp, stickerId: string) =>
  test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId;

describe("gifts waiting for you", () => {
  it("lists a gift picked for you in the app, and gives it to you from your board", async () => {
    const test = await createGiftsTestApp();
    const bobId = insertUser(test.db);
    const { giverId, gift } = await sentGift(test, bobId);
    expect(await waitingFor(test, bobId)).toMatchObject([
      { gift: { id: gift.id }, sticker: { id: gift.stickerId }, giver: { id: giverId } },
    ]);
    expect(await waitingFor(test, insertUser(test.db))).toEqual([]);
    // The giver's gifts on their way say who it went to.
    const pending = await (await test.get(giverId, "/pending")).json();
    expect(pending).toMatchObject({ gifts: [{ gift: { id: gift.id }, for: { id: bobId } }] });

    const response = await receiveFromBoard(test, bobId, gift.id);
    expect(response.status).toBe(200);
    expect(receivedGiftSchema.parse(await response.json()).gift.receiverId).toBe(bobId);
    expect(ownerOf(test, gift.stickerId)).toBe(bobId);
    expect(await waitingFor(test, bobId)).toEqual([]);
  });

  it("claims it on the escrow chain without the link's token", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const bobId = insertUser(test.db);
    const { gift } = await sentGift(test, bobId);
    expect((await receiveFromBoard(test, bobId, gift.id)).status).toBe(200);
    expect(test.giftChain.escrow.get(gift.id)?.status).toBe("claimed");
  });

  it("waits for the first person to open its link, and gives it to no one else", async () => {
    const test = await createGiftsTestApp();
    const { gift, giftClaimToken } = await sentGift(test);
    const [carolId, daveId] = [insertUser(test.db), insertUser(test.db)];
    for (const userId of [carolId, daveId]) {
      await test.post(userId, "/preview", { giftClaimToken, liffContextType: "utou" });
    }
    expect(await waitingFor(test, carolId)).toHaveLength(1);
    expect(await waitingFor(test, daveId)).toEqual([]);

    expect(await refusalOf(await receiveFromBoard(test, daveId, gift.id))).toMatchObject({
      status: 404,
      error: "gift_not_found",
    });
    expect((await receiveFromBoard(test, carolId, gift.id)).status).toBe(200);
  });

  it("isn't for its own giver, or for someone who isn't in the app", async () => {
    const test = await createGiftsTestApp();
    const giverId = insertUser(test.db);
    const give = (forUserId: string) =>
      test.post(giverId, "", { stickerId: test.sealSticker(giverId), forUserId });
    expect(await refusalOf(await give(giverId))).toMatchObject({ status: 403, error: "own_gift" });
    expect(await refusalOf(await give("nobody"))).toMatchObject({
      status: 404,
      error: "user_not_found",
    });
  });
});
