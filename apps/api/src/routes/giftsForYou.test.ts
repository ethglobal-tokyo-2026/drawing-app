import { insertUser } from "@drawing-app/db/testing";
import { describe, expect, it } from "vitest";
import {
  giftClaimTokenSchema,
  packagedGiftSchema,
  pendingGiftsSchema,
} from "../gifts/packaging.ts";
import { giftsForYouSchema, receivedGiftSchema } from "../gifts/receiving.ts";
import { createGiftsTestApp, giftOf, type GiftsTestApp } from "../gifts/testGifts.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";

/** A gift of a sticker its giver drew, packaged for `forUserId` if given, and sent through LINE. */
async function sentGift(test: GiftsTestApp, forUserId?: string) {
  const giverId = insertUser(test.db);
  const stickerId = test.sealSticker(giverId);
  const packaging = await test.post(giverId, "", { stickerId, ...(forUserId && { forUserId }) });
  const { gift, giftClaimToken } = await bodyOf(packaging, packagedGiftSchema, 201);
  await giftOf(await test.share(giverId, gift.id, "sent"));
  return { giverId, gift, giftClaimToken: giftClaimTokenSchema.parse(giftClaimToken) };
}

const waitingFor = async (test: GiftsTestApp, userId: string) =>
  (await bodyOf(await test.get(userId, "/for-you"), giftsForYouSchema)).gifts;
const receiveFromBoard = (test: GiftsTestApp, userId: string, giftId: string) =>
  test.post(userId, `/${giftId}/receive`);

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
    const pending = await bodyOf(await test.get(giverId, "/pending"), pendingGiftsSchema);
    expect(pending.gifts).toMatchObject([{ gift: { id: gift.id }, for: { id: bobId } }]);

    const received = await bodyOf(await receiveFromBoard(test, bobId, gift.id), receivedGiftSchema);
    expect(received.gift.receiverId).toBe(bobId);
    expect(test.ownerOf(gift.stickerId)).toBe(bobId);
    expect(await waitingFor(test, bobId)).toEqual([]);
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

  it("is an NSFW sticker only for an adult", async () => {
    const test = await createGiftsTestApp();
    const giverId = insertUser(test.db);
    const stickerId = test.sealSticker(giverId, { nsfw: true });
    const give = (forUserId: string) => test.post(giverId, "", { stickerId, forUserId });
    expect(await refusalOf(await give(insertUser(test.db)))).toMatchObject({
      status: 403,
      error: "adults_only",
    });
    const adultId = insertUser(test.db, { ageVerifiedAt: test.clock.now() });
    expect((await give(adultId)).status).toBe(201);
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
