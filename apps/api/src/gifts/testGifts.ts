import { gifts, stickers } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { fromBase64 } from "@mysten/sui/utils";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { SignedTransaction, SponsoredTransaction } from "../shapes.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { giverNoticeThrough, type FakeLine } from "../testing/fakeLine.ts";
import { fakeSuiWallets } from "../testing/fakes.ts";
import { fakeSui, type FakeSui } from "../testing/fakeSui.ts";
import { bodyOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import {
  giftClaimTokenSchema,
  giftResponseSchema,
  packagedGiftSchema,
  takeOutStartSchema,
  type sharedBodySchema,
} from "./packaging.ts";

/** A well-formed signed transaction that no gift has: for routes that refuse before looking. */
export const SOME_SIGNED_TRANSACTION: SignedTransaction = {
  digest: "1".repeat(44),
  signature: "AA==",
};

/**
 * The app for Giving and Receiving: on the mock chain, or with `onSui` on the fake Sui chain and gas
 * station, where everyone has a wallet that signs. With `line`, the giver's messages go through it.
 * The clock starts at the real time, since the gifts_expiry CHECK compares expires_at with the
 * database's clock.
 */
export async function createGiftsTestApp({
  line,
  onSui = false,
}: { line?: FakeLine; onSui?: boolean } = {}) {
  const made: { chain?: FakeSui; wallets?: ReturnType<typeof fakeSuiWallets> } = {};
  const test = await createTestApp((base) => {
    made.chain = fakeSui(base.clock);
    made.wallets = fakeSuiWallets(base.db);
    return {
      ...(onSui && {
        sui: made.chain.sui,
        gasStation: made.chain.gasStation,
        suiWallets: made.wallets,
      }),
      ...(line && giverNoticeThrough(line)(base)),
    };
  });
  const { chain, wallets } = made;
  if (!chain || !wallets) throw new Error("The test app was made without its chain");
  test.clock.set(new Date());

  const post = (userId: string, path: string, body?: unknown) =>
    test.send("POST", `/api/gifts${path}`, { as: userId, body });

  const giftRow = (giftId: string) => {
    const row = test.db.select().from(gifts).where(eq(gifts.id, giftId)).get();
    if (!row) throw new Error(`There's no gift ${giftId}`);
    return row;
  };

  /** A sticker `artistId` drew and holds; on Sui, minted unless `minted` is false. */
  const sealSticker = (artistId: string, { nsfw = false, minted = onSui } = {}) => {
    const stickerId = insertSealedSticker(test.db, artistId, { nsfw });
    if (minted) {
      test.db
        .update(stickers)
        .set({ objectId: chain.sui.stickerObjectId(stickerId) })
        .where(eq(stickers.id, stickerId))
        .run();
    }
    return stickerId;
  };

  /** POST /api/gifts, answered 201 or 200. */
  const packageSticker = async (userId: string, stickerId: string) => {
    const response = await post(userId, "", { stickerId });
    return { status: response.status, ...packagedGiftSchema.parse(await response.json()) };
  };

  /** `userId`'s wallet's signature over a sponsored transaction, as the app posts it. */
  const signed = async (userId: string, tx: SponsoredTransaction): Promise<SignedTransaction> => ({
    digest: tx.digest,
    signature: (await wallets.keyOf(userId).signTransaction(fromBase64(tx.txBytes))).signature,
  });

  const packagedGift = async (giverId = insertUser(test.db), sticker: { nsfw?: boolean } = {}) => {
    const packed = await packageSticker(giverId, sealSticker(giverId, sticker));
    const giftClaimToken = giftClaimTokenSchema.parse(packed.giftClaimToken);
    return { giverId, ...packed, giftClaimToken };
  };

  const deposit = (userId: string, giftId: string, body: SignedTransaction) =>
    post(userId, `/${giftId}/deposit`, body);

  return {
    ...test,
    chain,
    wallets,
    post,
    get: (userId: string, path: string) => test.send("GET", `/api/gifts${path}`, { as: userId }),
    giftRow,
    sealSticker,
    packageSticker,
    signed,
    /** A new sticker `giverId` drew, packaged through the route: its answer, with the Gift Claim Token. */
    packagedGift,
    /** On Sui, a packaged gift whose signed deposit landed, so the escrow holds it. */
    depositedGift: async (giverId = insertUser(test.db), sticker: { nsfw?: boolean } = {}) => {
      const packed = await packagedGift(giverId, sticker);
      if (!packed.deposit) throw new Error("Packaging answered no deposit to sign");
      const gift = await giftOf(
        await deposit(giverId, packed.gift.id, await signed(giverId, packed.deposit)),
      );
      return { ...packed, gift };
    },

    /** Who holds the sticker. */
    ownerOf: (stickerId: string) =>
      test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId,

    deposit,
    /** LINE's friend picker answered `outcome` for the gift's message. */
    share: (userId: string, giftId: string, outcome: z.infer<typeof sharedBodySchema>["outcome"]) =>
      post(userId, `/${giftId}/shared`, { outcome }),
    /** Take-out's start: on the mock chain, or for a gift the escrow doesn't hold, it closes at once. */
    takeOut: (userId: string, giftId: string) => post(userId, `/${giftId}/take-out/start`),
    submitTakeOut: (userId: string, giftId: string, body: SignedTransaction) =>
      post(userId, `/${giftId}/take-out`, body),
  };
}

export type GiftsTestApp = Awaited<ReturnType<typeof createGiftsTestApp>>;

/** The gift a 200 `{ gift }` answers with. */
export const giftOf = async (response: Response) =>
  (await bodyOf(response, giftResponseSchema)).gift;

/** Take-out's start's 200: the gift, and any take-out to sign. */
export const takeOutStartOf = (response: Response) => bodyOf(response, takeOutStartSchema);
