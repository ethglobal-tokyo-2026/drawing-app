import { bytes32, insertUser } from "@drawing-app/db/testing";
import { hc, parseResponse, type ClientResponse } from "hono/client";
import { describe, expect, it } from "vitest";
import type { AppType } from "./app.ts";
import type { LineProfile } from "./deps.ts";
import { claimCommitmentOf, giftClaimTokenSchema, packagedGiftSchema } from "./gifts/packaging.ts";
import { giftsForYouSchema, giftPreviewSchema } from "./gifts/receiving.ts";
import { createGiftsTestApp, giftOf, takeOutStartOf } from "./gifts/testGifts.ts";
import { recordBody } from "./gratitude/testReplays.ts";
import { devAccessToken } from "./services/devSignIn.ts";
import { ME } from "./stickerBoards/board.ts";
import { SPONSORSHIP_MARGIN_MS } from "./sui/transactions.ts";
import { bodyOf } from "./testing/responses.ts";
import { sealUpload } from "./stickers/testPngs.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";
import { spendBody } from "./tickets/testSpends.ts";

/** Any origin will do: the test app answers every call itself. */
const API_ORIGIN = "https://api.test";
const OK = 200;
const CREATED = 201;
/** LINE accounts, as the fake LINE verifier reads them from their access tokens. */
const ALICE: LineProfile = { sub: "line-alice", name: "Alice" };
const BOB: LineProfile = { sub: "line-bob", name: "Bob" };
/** A 1:1 chat, where a Gift Message is received. */
const ONE_TO_ONE = "utou";
/** The escrow transfer's hash, as Alice's smart wallet reports it. */
/** Alice spends one ticket on the sticker and gives it once; Bob sends gratitude with one combo. */
const ONE_TICKET = 1;
const ONE_GIFT = 1;
const ONE_COMBO = 1;

/**
 * One person's typed client on the test app. Like their phone, it keeps the session cookie the API
 * sets, and sends it with every call after.
 */
function clientFor(test: TestApp, cookie?: string, expectedUserId?: string) {
  let sessionCookie = cookie;
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (sessionCookie !== undefined) headers.set("Cookie", sessionCookie);
    if (expectedUserId !== undefined) headers.set("x-croquis-user-id", expectedUserId);
    const response = await test.app.request(input, { ...init, headers });
    const setCookie = response.headers.get("set-cookie");
    // A Cookie header sends back only the name=value that starts Set-Cookie.
    if (setCookie !== null) [sessionCookie] = setCookie.split(";");
    return response;
  };
  return hc<AppType>(API_ORIGIN, { fetch }).api;
}

type Api = ReturnType<typeof clientFor>;

/** The body the call answered with `status`; any other status fails the test, showing its body. */
async function answered<Answer extends ClientResponse<unknown>>(
  call: Promise<Answer>,
  status: Answer["status"],
) {
  const response = await call;
  expect(response.status, await response.clone().text()).toBe(status);
  return parseResponse(response);
}

/** Signs in with the LINE account's access token: their client, now carrying their session, and `me`. */
async function signIn(test: TestApp, profile: LineProfile) {
  const api = clientFor(test);
  const response = await api.session.$post({
    json: { accessToken: devAccessToken(profile), language: "en" },
  });
  const { me } = await answered(Promise.resolve(response), OK);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  return { api: clientFor(test, cookie, me.id), me };
}

/** The stickers on your own Sticker Board and in your sticker tray. */
const ownBoardStickers = async (api: Api) =>
  (await answered(api["sticker-boards"][":userId"].$get({ param: { userId: ME } }), OK))
    .boardStickers;

const ownUserStats = async (api: Api) =>
  (
    await answered(
      api["sticker-boards"][":userId"]["user-stats"].$get({ param: { userId: ME } }),
      OK,
    )
  ).userStats;

describe("the REST API, through the typed client", () => {
  it("walks one sticker's whole life: sealed, given, received, sent gratitude, and shown", async () => {
    const test = await createTestApp();
    // Packaging sets a gift's expiry by this clock, and gifts_expiry checks it against the gift's
    // packing time, which is the database's.
    test.clock.set(new Date());

    const alice = await signIn(test, ALICE);
    const bob = await signIn(test, BOB);

    // Alice spends a daily ticket, and seals a sticker on it.
    const { tickets } = await answered(alice.api.tickets.$get(), OK);
    const spent = await answered(
      alice.api.tickets.spend.$post({ json: spendBody("daily") }),
      CREATED,
    );
    expect(spent.tickets.dailyLeft).toBe(tickets.dailyLeft - ONE_TICKET);
    const { sticker } = await answered(
      alice.api.stickers.$post({ form: sealUpload(spent.ticketUse.id) }),
      CREATED,
    );
    expect(await ownBoardStickers(alice.api)).toMatchObject([
      { stickerId: sticker.id, held: true },
    ]);

    // She packages it on the mock chain, where it's in the escrow at once, and sends it.
    const packaged = await answered(
      alice.api.gifts.$post({ json: { stickerId: sticker.id } }),
      CREATED,
    );
    expect(packaged.deposit).toBeNull();
    const giftId = packaged.gift.id;
    const giftClaimToken = giftClaimTokenSchema.parse(packaged.giftClaimToken);
    const attemptId = bytes32("message attempt");
    await answered(
      alice.api.gifts[":giftId"]["message-attempt"].$post({
        param: { giftId },
        json: { attemptId },
      }),
      OK,
    );
    const shared = await answered(
      alice.api.gifts[":giftId"].shared.$post({
        param: { giftId },
        json: { attemptId, outcome: "sent" },
      }),
      OK,
    );
    expect(shared.gift.status).toBe("sent");

    // Bob opens the Gift Message in their 1:1 chat, and receives the sticker.
    const preview = await answered(
      bob.api.gifts.preview.$post({ json: { giftClaimToken, liffContextType: ONE_TO_ONE } }),
      OK,
    );
    expect(preview).toMatchObject({ receivable: true, sticker: { id: sticker.id } });
    await answered(
      bob.api.gifts.receive.$post({ json: { giftClaimToken, liffContextType: ONE_TO_ONE } }),
      OK,
    );
    expect(await ownBoardStickers(bob.api)).toMatchObject([
      { stickerId: sticker.id, held: true, seenAt: null },
    ]);

    const combo = recordBody(giftId);
    await answered(bob.api.gratitude.$post({ json: combo }), CREATED);

    // Alice sees the pink tag, watches the combo's replay, and marks it watched.
    expect((await answered(alice.api.me.$get({ header: {} }), OK)).me.unseenGratitudeCount).toBe(
      ONE_COMBO,
    );
    const { unseen } = await answered(alice.api.gratitude.unseen.$get(), OK);
    expect(unseen).toMatchObject([
      { gratitude: { giftId }, sticker: { id: sticker.id }, receiver: { id: bob.me.id } },
    ]);
    const { replay } = await answered(
      alice.api.gratitude[":giftId"].$get({ param: { giftId } }),
      OK,
    );
    expect(replay).toEqual(combo.replay);
    const seen = await answered(
      alice.api.gratitude[":giftId"].seen.$post({ param: { giftId } }),
      OK,
    );
    expect(seen.gratitude.seenByGiverAt).toBe(test.clock.now().toISOString());

    expect((await ownUserStats(alice.api)).given).toBe(ONE_GIFT);
    expect((await ownUserStats(bob.api)).received).toBe(ONE_GIFT);

    const detail = await answered(
      bob.api.stickers[":stickerId"].$get({ param: { stickerId: sticker.id } }),
      OK,
    );
    expect(detail.transferTrail).toMatchObject([
      { giftId, giver: { id: alice.me.id }, receiver: { id: bob.me.id }, gratitude: { giftId } },
    ]);
    const { pile } = await answered(bob.api.explore.$get(), OK);
    expect(pile.stickers).toMatchObject([
      { sticker: { id: sticker.id }, givenTo: { id: bob.me.id } },
    ]);
  });
});

describe("resuming a packaged gift through the REST API", () => {
  it.each([false, true])(
    "keeps Bob as the recipient across board changes (Sui: %s)",
    async (onSui) => {
      const test = await createGiftsTestApp({ onSui });
      const aliceId = insertUser(test.db);
      const bobId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
      const carolId = insertUser(test.db, { nsfwOptedInAt: test.clock.now() });
      const optedOutId = insertUser(test.db);
      const stickerId = test.sealSticker(aliceId, { nsfw: true });
      const first = await bodyOf(
        await test.post(aliceId, "", { stickerId, forUserId: bobId }),
        packagedGiftSchema,
        CREATED,
      );
      const giftId = first.gift.id;
      const giftClaimToken = giftClaimTokenSchema.parse(first.giftClaimToken);
      const commitment = claimCommitmentOf(giftClaimToken);
      // Reopening from your board, another board, or an ineligible person's board only resumes it.
      const destinations = [undefined, carolId, null, optedOutId, aliceId, "unknown-person"];
      const resume = async () => {
        for (const forUserId of destinations) {
          const response = await test.post(aliceId, "", { stickerId, forUserId });
          expect(response.status, await response.clone().text()).toBe(OK);
          expect(test.giftRow(giftId)).toMatchObject({
            forUserId: bobId,
            claimCommitment: commitment,
          });
          const again = await bodyOf(response, packagedGiftSchema);
          expect(again).toMatchObject({
            gift: { id: giftId },
            forUserId: bobId,
            giftClaimToken: null,
          });
        }
      };
      await resume();
      if (onSui) {
        if (!first.deposit) throw new Error("Sui Packaging must return a deposit");
        test.clock.set(new Date(Date.parse(first.deposit.expiresAt) - SPONSORSHIP_MARGIN_MS));
        const renewed = await bodyOf(
          await test.post(aliceId, "", { stickerId, forUserId: optedOutId }),
          packagedGiftSchema,
        );
        expect(renewed).toMatchObject({
          gift: { id: giftId },
          forUserId: bobId,
          giftClaimToken: null,
        });
        if (!renewed.deposit) throw new Error("An expired sponsorship must be renewed");
        expect(renewed.deposit.digest).not.toBe(first.deposit.digest);
        await giftOf(
          await test.deposit(aliceId, giftId, await test.signed(aliceId, renewed.deposit)),
        );
        await resume();
      }
      await giftOf(await test.share(aliceId, giftId, "sent"));
      const waiting = await bodyOf(await test.get(bobId, "/for-you"), giftsForYouSchema);
      expect(waiting.gifts).toMatchObject([{ gift: { id: giftId } }]);
      expect((await bodyOf(await test.get(carolId, "/for-you"), giftsForYouSchema)).gifts).toEqual(
        [],
      );
      const preview = await bodyOf(
        await test.post(bobId, "/preview", { giftClaimToken, liffContextType: ONE_TO_ONE }),
        giftPreviewSchema,
      );
      expect(preview).toMatchObject({ receivable: true, sticker: { id: stickerId } });
      expect(test.giftRow(giftId)).toMatchObject({ forUserId: bobId, claimCommitment: commitment });

      const { takeOut } = await takeOutStartOf(await test.takeOut(aliceId, giftId));
      if (takeOut) {
        await giftOf(
          await test.submitTakeOut(aliceId, giftId, await test.signed(aliceId, takeOut)),
        );
      }
      const changed = await bodyOf(
        await test.post(aliceId, "", { stickerId, forUserId: carolId }),
        packagedGiftSchema,
        CREATED,
      );
      expect(changed.forUserId).toBe(carolId);
      expect(changed.gift.id).not.toBe(giftId);
      expect(changed.giftClaimToken).not.toBe(giftClaimToken);
    },
  );
});
