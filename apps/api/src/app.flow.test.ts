import { bytes32 } from "@drawing-app/db/testing";
import { hc, parseResponse, type ClientResponse } from "hono/client";
import { describe, expect, it } from "vitest";
import type { AppType } from "./app.ts";
import type { LineProfile } from "./deps.ts";
import { giftClaimTokenSchema } from "./gifts/packaging.ts";
import { recordBody } from "./gratitude/testReplays.ts";
import { ME } from "./stickerBoards/board.ts";
import { sealUpload } from "./stickers/testPngs.ts";
import { createTestApp, type TestApp } from "./testing/createTestApp.ts";
import { fakeLineIdToken } from "./testing/fakes.ts";

/** Any origin will do: the test app answers every call itself. */
const API_ORIGIN = "https://api.test";
const OK = 200;
const CREATED = 201;
/** LINE accounts, as the fake LINE verifier reads them from their ID tokens. */
const ALICE: LineProfile = { sub: "line-alice", name: "Alice" };
const BOB: LineProfile = { sub: "line-bob", name: "Bob" };
/** The zone both phones report at sign-in. */
const DEVICE_ZONE = "Asia/Tokyo";
/** A 1:1 chat, where a Gift Message is received. */
const ONE_TO_ONE = "utou";
/** The escrow transfer's hash, as Alice's smart wallet reports it. */
const DEPOSIT_TX = bytes32("deposit transaction");
/** Alice spends one ticket on the sticker and gives it once; Bob thanks her with one combo. */
const ONE_TICKET = 1;
const ONE_GIFT = 1;
const ONE_COMBO = 1;

/**
 * One person's typed client on the test app. Like their phone, it keeps the session cookie the API
 * sets, and sends it with every call after.
 */
function clientFor(test: TestApp) {
  let sessionCookie: string | undefined;
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (sessionCookie !== undefined) headers.set("Cookie", sessionCookie);
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

/** Signs in with the LINE account's ID token: their client, now carrying their session, and `me`. */
async function signIn(test: TestApp, profile: LineProfile) {
  const api = clientFor(test);
  const { me } = await answered(
    api.session.$post({ json: { idToken: fakeLineIdToken(profile), timeZone: DEVICE_ZONE } }),
    OK,
  );
  return { api, me };
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
  it("walks one sticker's whole life: sealed, given, received, thanked, and shown", async () => {
    const test = await createTestApp();
    // Packaging sets a gift's expiry by this clock, and gifts_expiry checks it against the gift's
    // packing time, which is the database's.
    test.clock.set(new Date());

    const alice = await signIn(test, ALICE);
    const bob = await signIn(test, BOB);

    // Alice spends a daily ticket, and seals a sticker on it.
    const { tickets } = await answered(alice.api.tickets.$get(), OK);
    const spent = await answered(
      alice.api.tickets.spend.$post({ json: { kind: "daily" } }),
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

    // She packages it on the mock chain, reports the deposit, and sends it.
    const packaged = await answered(
      alice.api.gifts.$post({ json: { stickerId: sticker.id } }),
      CREATED,
    );
    const giftId = packaged.gift.id;
    const giftClaimToken = giftClaimTokenSchema.parse(packaged.giftClaimToken);
    await answered(
      alice.api.gifts[":giftId"].deposit.$post({ param: { giftId }, json: { txHash: DEPOSIT_TX } }),
      OK,
    );
    const shared = await answered(
      alice.api.gifts[":giftId"].shared.$post({ param: { giftId }, json: { outcome: "sent" } }),
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
    expect((await answered(alice.api.me.$get(), OK)).me.unseenGratitudeCount).toBe(ONE_COMBO);
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
    const { activity } = await answered(bob.api.explore.$get(), OK);
    expect(activity.find((entry) => entry.type === "sealed")).toMatchObject({
      sticker: { id: sticker.id },
    });
    expect(activity.find((entry) => entry.type === "received")).toMatchObject({
      sticker: { id: sticker.id },
      giver: { id: alice.me.id },
      receiver: { id: bob.me.id },
    });
  });
});
