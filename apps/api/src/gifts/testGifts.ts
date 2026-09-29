import { gifts, stickers, users } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { EscrowGift } from "../deps.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeGiftChain, fakeSmartWallets } from "../testing/fakes.ts";
import { bodyOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import {
  giftClaimTokenSchema,
  giftResponseSchema,
  packagedGiftSchema,
  type sharedBodySchema,
} from "./packaging.ts";

/** A pending gift in the escrow has no recipient yet: the zero address. */
const NO_RECIPIENT = `0x${"0".repeat(40)}`;
/** The escrow transfer's hash, as the giver's smart wallet reports it. */
const DEPOSIT_TX = bytes32("deposit transaction");

/**
 * The app for Giving and Receiving: the mock chain, or the escrow chain on the fake gift chain, where
 * everyone has a smart wallet. The clock starts at the real time, since the gifts_expiry CHECK
 * compares expires_at with the database's clock.
 */
export async function createGiftsTestApp({ escrowChain = false } = {}) {
  const giftChain = fakeGiftChain();
  const test = await createTestApp(({ db }) =>
    escrowChain ? { giftChain, smartWallets: fakeSmartWallets(db) } : {},
  );
  test.clock.set(new Date());
  let tokenCount = 0;

  const post = (userId: string, path: string, body?: unknown) =>
    test.send("POST", `/api/gifts${path}`, { as: userId, body });

  const giftRow = (giftId: string) => {
    const row = test.db.select().from(gifts).where(eq(gifts.id, giftId)).get();
    if (!row) throw new Error(`There's no gift ${giftId}`);
    return row;
  };

  /** A sticker `artistId` drew and holds; minted on the escrow chain unless `minted` is false. */
  const sealSticker = (artistId: string, { minted = escrowChain, nsfw = false } = {}) => {
    if (!minted) return insertSealedSticker(test.db, artistId, { nsfw });
    tokenCount += 1;
    const tokenId = String(tokenCount);
    return insertSealedSticker(test.db, artistId, { nsfw, tokenId, mintTxHash: bytes32(tokenId) });
  };

  /** POST /api/gifts, answered 201 or 200. */
  const packageSticker = async (userId: string, stickerId: string) => {
    const response = await post(userId, "", { stickerId });
    return { status: response.status, ...packagedGiftSchema.parse(await response.json()) };
  };

  return {
    ...test,
    giftChain,
    post,
    get: (userId: string, path: string) => test.send("GET", `/api/gifts${path}`, { as: userId }),
    giftRow,
    sealSticker,
    packageSticker,

    /** A new sticker `giverId` drew, packaged through the route: its answer, with the Gift Claim Token. */
    packagedGift: async (giverId = insertUser(test.db), sticker: { nsfw?: boolean } = {}) => {
      const packed = await packageSticker(giverId, sealSticker(giverId, sticker));
      const giftClaimToken = giftClaimTokenSchema.parse(packed.giftClaimToken);
      return { giverId, ...packed, giftClaimToken };
    },

    /** Who holds the sticker. */
    ownerOf: (stickerId: string) =>
      test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId,

    /** The giver reports the gift's deposit, made in DEPOSIT_TX. */
    deposit: (userId: string, giftId: string) =>
      post(userId, `/${giftId}/deposit`, { txHash: DEPOSIT_TX }),
    /** LINE's friend picker answered `outcome` for the gift's message. */
    share: (userId: string, giftId: string, outcome: z.infer<typeof sharedBodySchema>["outcome"]) =>
      post(userId, `/${giftId}/shared`, { outcome }),
    takeOut: (userId: string, giftId: string) => post(userId, `/${giftId}/take-out`),

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

/** The gift a 200 `{ gift }` answers with. */
export const giftOf = async (response: Response) =>
  (await bodyOf(response, giftResponseSchema)).gift;
