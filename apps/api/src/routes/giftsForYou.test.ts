import { insertUser } from "@drawing-app/db/testing";
import { describe, expect, it } from "vitest";
import { giftClaimTokenSchema, packagedGiftSchema } from "../gifts/packaging.ts";
import { giftPreviewSchema, giftsForYouSchema, receivedGiftSchema } from "../gifts/receiving.ts";
import { createGiftsTestApp, giftOf, type GiftsTestApp } from "../gifts/testGifts.ts";
import { stickerBoardSchema } from "../stickerBoards/board.ts";
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
const previewFromBoard = (test: GiftsTestApp, userId: string, giftId: string) =>
  test.get(userId, `/${giftId}/preview`);

describe("gifts waiting for you", () => {
  it("lists a gift picked for you in the app, and gives it to you from your board", async () => {
    const test = await createGiftsTestApp();
    const bobId = insertUser(test.db);
    const { giverId, gift } = await sentGift(test, bobId);
    expect(await waitingFor(test, bobId)).toMatchObject([
      { gift: { id: gift.id }, sticker: { id: gift.stickerId }, giver: { id: giverId } },
    ]);
    expect(await waitingFor(test, insertUser(test.db))).toEqual([]);
    // The giver's board says who the gift waits for.
    const board = await bodyOf(
      await test.send("GET", `/api/sticker-boards/${giverId}`, { as: giverId }),
      stickerBoardSchema,
    );
    expect(
      board.boardStickers.find((s) => s.sticker.id === gift.stickerId)?.openGift,
    ).toMatchObject({ id: gift.id, status: "sent", for: { id: bobId } });

    const received = await bodyOf(await receiveFromBoard(test, bobId, gift.id), receivedGiftSchema);
    expect(received.gift.receiverId).toBe(bobId);
    expect(test.ownerOf(gift.stickerId)).toBe(bobId);
    expect(await waitingFor(test, bobId)).toEqual([]);
  });

  it("previews a gift waiting for you with its link's checks, and no one else's", async () => {
    const test = await createGiftsTestApp();
    const bobId = insertUser(test.db);
    const { giverId, gift } = await sentGift(test, bobId);
    const previewed = async () =>
      bodyOf(await previewFromBoard(test, bobId, gift.id), giftPreviewSchema);
    expect(await previewed()).toMatchObject({
      giver: { id: giverId },
      receivable: true,
      refusal: null,
      sticker: { id: gift.stickerId },
    });
    expect(
      await refusalOf(await previewFromBoard(test, insertUser(test.db), gift.id)),
    ).toMatchObject({ status: 404, error: "gift_not_found" });

    await giftOf(await test.takeOut(giverId, gift.id));
    expect(await previewed()).toMatchObject({
      receivable: false,
      refusal: "taken_back",
      sticker: null,
    });
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

  it("is an NSFW sticker only for someone opted in", async () => {
    const test = await createGiftsTestApp();
    const giverId = insertUser(test.db);
    const stickerId = test.sealSticker(giverId, { nsfw: true });
    const give = (forUserId: string) => test.post(giverId, "", { stickerId, forUserId });
    expect(await refusalOf(await give(insertUser(test.db)))).toMatchObject({
      status: 403,
      error: "nsfw_not_opted_in",
    });
    const optedInId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
    expect((await give(optedInId)).status).toBe(201);
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
