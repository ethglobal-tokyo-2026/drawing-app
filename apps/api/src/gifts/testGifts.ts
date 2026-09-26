import { gifts, stickers, users } from "@drawing-app/db";
import { bytes32 } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { expect } from "vitest";
import type { EscrowGift } from "../deps.ts";
import { errorBodySchema } from "../errors.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeGiftChain, fakeSmartWallets } from "../testing/fakes.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { giftResponseSchema, packagedGiftSchema } from "./packaging.ts";

/** A pending gift in the escrow has no recipient yet: the zero address. */
const NO_RECIPIENT = `0x${"0".repeat(40)}`;

/**
 * The app for Giving and Receiving: the mock chain, or the escrow chain on the fake gift chain, where
 * everyone has a smart wallet. The clock starts at the real time, since the gifts_expiry CHECK
 * compares expires_at with the database's clock.
 */
export async function createGiftsTestApp({ escrowChain = false } = {}) {
  const giftChain = fakeGiftChain();
  const test = await createTestApp(
    escrowChain ? { giftChain, smartWallets: fakeSmartWallets() } : {},
  );
  test.clock.set(new Date());
  let tokenCount = 0;

  const request = async (userId: string, method: "GET" | "POST", path: string, body?: unknown) =>
    test.app.request(`/api/gifts${path}`, {
      method,
      headers: { "content-type": "application/json", ...(await test.signInAs(userId)) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const post = (userId: string, path: string, body?: unknown) =>
    request(userId, "POST", path, body);

  const giftRow = (giftId: string) => {
    const row = test.db.select().from(gifts).where(eq(gifts.id, giftId)).get();
    if (!row) throw new Error(`There's no gift ${giftId}`);
    return row;
  };

  return {
    ...test,
    giftChain,
    post,
    get: (userId: string, path: string) => request(userId, "GET", path),
    giftRow,

    /** A sticker `artistId` drew and holds; minted on the escrow chain unless `minted` is false. */
    sealSticker: (artistId: string, { minted = escrowChain } = {}) => {
      if (!minted) return insertSealedSticker(test.db, artistId);
      tokenCount += 1;
      const tokenId = String(tokenCount);
      return insertSealedSticker(test.db, artistId, { tokenId, mintTxHash: bytes32(tokenId) });
    },

    /** POST /api/gifts, answered 201 or 200. */
    packageSticker: async (userId: string, stickerId: string) => {
      const response = await post(userId, "", { stickerId });
      return { status: response.status, ...packagedGiftSchema.parse(await response.json()) };
    },

    /**
     * Lands a gift's deposit in the fake escrow as packaging issued it, read back as the chain gives
     * it: a checksummed sender and the expiry in whole seconds. `changes` makes it another deposit.
     */
    landDeposit: (giftId: string, changes: Partial<EscrowGift> = {}) => {
      const gift = giftRow(giftId);
      const issued = test.db
        .select({ sender: users.smartAccountAddress, tokenId: stickers.tokenId })
        .from(users)
        .innerJoin(stickers, eq(stickers.id, gift.stickerId))
        .where(eq(users.id, gift.giverId))
        .get();
      if (!issued?.sender || !issued.tokenId) {
        throw new Error(`Gift ${giftId} wasn't packaged on the escrow chain`);
      }
      giftChain.escrow.set(giftId, {
        sender: `0x${issued.sender.slice(2).toUpperCase()}`,
        recipient: NO_RECIPIENT,
        tokenId: issued.tokenId,
        claimCommitment: gift.claimCommitment,
        expiresAt: new Date(Math.floor(gift.expiresAt.getTime() / 1000) * 1000),
        status: "pending",
        ...changes,
      });
    },
  };
}

export type GiftsTestApp = Awaited<ReturnType<typeof createGiftsTestApp>>;

/** The status and ErrorBody a request was refused with. */
export const refusalOf = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

/** The gift a 200 `{ gift }` answers with. */
export async function giftOf(response: Response) {
  expect(response.status).toBe(200);
  return giftResponseSchema.parse(await response.json()).gift;
}
