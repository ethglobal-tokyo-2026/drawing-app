import { GIFT_EXPIRY_MS } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { AFTER_MIDNIGHT_MS } from "../midnightJob.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { nextTokyoTicketDayStart } from "../ticketDays.ts";
import { returnExpiredGifts, startExpiredGiftReturns, type ExpirySweep } from "./expiry.ts";
import { receivedGiftSchema } from "./receiving.ts";
import { createGiftsTestApp, giftOf, takeOutStartOf, type GiftsTestApp } from "./testGifts.ts";

const HOUR_MS = 60 * 60 * 1000;
/** From Packaging to an hour past the gift's expiry. */
const PAST_EXPIRY_MS = GIFT_EXPIRY_MS + HOUR_MS;

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A new gift the escrow holds: in the bag, or sent. */
async function giftInEscrow(test: GiftsTestApp, status: "packed" | "sent" = "sent") {
  const deposited = await test.depositedGift();
  if (status === "sent") {
    await giftOf(await test.share(deposited.giverId, deposited.gift.id, "sent"));
  }
  return deposited;
}

const sweep = (test: GiftsTestApp) => returnExpiredGifts(test.deps);

/** The sweep's tally: `counts`, and none of any other outcome. */
const swept = (counts: Partial<ExpirySweep>): ExpirySweep => ({
  returned: 0,
  recorded: 0,
  closed: 0,
  left: 0,
  failed: 0,
  ...counts,
});

const escrowOf = async (test: GiftsTestApp, giftId: string) =>
  (await test.chain.sui.readGift(giftId)).status;

const returnsBuilt = (test: GiftsTestApp) =>
  test.chain.built.filter(({ kind }) => kind === "return").length;

/** Sui ran the transaction Shinami sponsored last, as it shows from now on. */
function showLastRan(test: GiftsTestApp) {
  const last = test.chain.sponsorships.at(-1);
  assert(last, "Shinami sponsored a transaction");
  test.chain.show(last.sponsorship.digest, { ok: true, events: [] });
}

/** What a route refused `send` with when Sui's answer was lost; unless `ran` is false, Sui ran it. */
async function answerLost(test: GiftsTestApp, send: () => Promise<Response>, { ran = true } = {}) {
  test.chain.answerNext("lost");
  const refused = await refusalOf(await send());
  if (ran) showLastRan(test);
  return refused;
}

describe("The expiry sweep", () => {
  it.each(["packed", "sent"] as const)(
    "sends an expired %s gift's sticker back on Sui and records the gift returned, so the sticker can be given again",
    async (status) => {
      const test = await createGiftsTestApp({ onSui: true });
      const { giverId, gift } = await giftInEscrow(test, status);
      test.clock.advance(PAST_EXPIRY_MS);

      expect(await sweep(test)).toEqual(swept({ returned: 1 }));
      expect(await escrowOf(test, gift.id)).toBe("expired_returned");
      expect(test.giftRow(gift.id)).toMatchObject({
        status: "returned",
        escrowStatus: "expired_returned",
        returnedAt: test.clock.now(),
      });
      expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
    },
  );

  it("leaves a gift that hasn't expired", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const expired = await giftInEscrow(test);
    test.clock.advance(2 * HOUR_MS);
    const waiting = await giftInEscrow(test);
    test.clock.advance(GIFT_EXPIRY_MS - HOUR_MS);
    const before = test.giftRow(waiting.gift.id);

    expect(await sweep(test)).toEqual(swept({ returned: 1 }));
    expect(test.giftRow(expired.gift.id).status).toBe("returned");
    expect(test.giftRow(waiting.gift.id)).toEqual(before);
    expect(await escrowOf(test, waiting.gift.id)).toBe("pending");
  });

  it("follows a return whose answer was lost until Sui shows it ran, sending no second one", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift } = await giftInEscrow(test);
    test.clock.advance(PAST_EXPIRY_MS);
    test.chain.answerNext("lost");
    expect(await sweep(test)).toEqual(swept({ failed: 1 }));
    test.chain.answerNext("lost");
    expect(await sweep(test)).toEqual(swept({ left: 1 }));
    logs.expectLogged("gift.expiry.left", { giftId: gift.id });
    expect(test.giftRow(gift.id).status).toBe("sent");
    showLastRan(test);

    expect(await sweep(test)).toEqual(swept({ recorded: 1 }));
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "returned",
      escrowStatus: "expired_returned",
    });
    expect(returnsBuilt(test)).toBe(1);
  });

  it("records a gift whose take-out ran while its answer was lost as taken out, without sending it back", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift } = await giftInEscrow(test);
    const { takeOut } = await takeOutStartOf(await test.takeOut(giverId, gift.id));
    assert(takeOut, "The escrow holds the gift, so its giver signs its take-out");
    const signed = await test.signed(giverId, takeOut);
    expect(
      await answerLost(test, () => test.submitTakeOut(giverId, gift.id, signed)),
    ).toMatchObject({ error: "take_out_not_landed" });
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ recorded: 1 }));
    expect(test.giftRow(gift.id)).toMatchObject({ status: "taken_out", escrowStatus: "taken_out" });
    expect(returnsBuilt(test)).toBe(0);
  });

  it("records a gift whose claim ran while its answer was lost as its receiver's, without sending it back", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift, giftClaimToken } = await giftInEscrow(test);
    const receiverId = insertUser(test.db);
    const receive = () =>
      test.post(receiverId, "/receive", { giftClaimToken, liffContextType: "utou" });
    expect(await answerLost(test, receive)).toMatchObject({ error: "claim_failed" });
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ recorded: 1 }));
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "received",
      escrowStatus: "claimed",
      receiverId,
    });
    expect(test.ownerOf(gift.stickerId)).toBe(receiverId);
    expect(returnsBuilt(test)).toBe(0);
    expect((await bodyOf(await receive(), receivedGiftSchema)).gift).toMatchObject({
      status: "received",
      receiverId,
    });
  });

  it("records a gift its giver took out from their own wallet, without sending it back", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift } = await giftInEscrow(test);
    test.chain.escrow.set(gift.id, { status: "taken_out", recipient: null });
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ recorded: 1 }));
    expect(test.giftRow(gift.id)).toMatchObject({ status: "taken_out", escrowStatus: "taken_out" });
    expect(returnsBuilt(test)).toBe(0);
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it("sends a gift back only once Sui's clock, which return_expired checks, is past its expiry, though the server's clock passed it first", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift } = await giftInEscrow(test);
    const { expiresAt } = test.giftRow(gift.id);
    test.clock.advance(PAST_EXPIRY_MS);
    test.chain.setClock(expiresAt);
    expect(await sweep(test)).toEqual(swept({}));
    test.chain.setClock(new Date(expiresAt.getTime() + 1));
    expect(await sweep(test)).toEqual(swept({ returned: 1 }));
  });

  it("sends back a packed gift whose deposit ran while its answer was lost", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { giverId, gift, deposit } = await test.packagedGift();
    assert(deposit, "Packaging answered the deposit to sign");
    const signed = await test.signed(giverId, deposit);
    expect(await answerLost(test, () => test.deposit(giverId, gift.id, signed))).toMatchObject({
      error: "deposit_not_landed",
    });
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ returned: 1 }));
    expect(await escrowOf(test, gift.id)).toBe("expired_returned");
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "returned",
      escrowStatus: "expired_returned",
    });
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it.each([
    { deposit: "was never signed", sent: false },
    { deposit: "was sent but never showed on Sui", sent: true },
  ])(
    "closes a packed gift whose deposit $deposit, so its sticker can be given again",
    async ({ sent }) => {
      const test = await createGiftsTestApp({ onSui: true });
      const { giverId, gift, deposit } = await test.packagedGift();
      if (sent) {
        assert(deposit, "Packaging answered the deposit to sign");
        const signed = await test.signed(giverId, deposit);
        await answerLost(test, () => test.deposit(giverId, gift.id, signed), { ran: false });
      }
      test.clock.advance(PAST_EXPIRY_MS);

      expect(await sweep(test)).toEqual(swept({ closed: 1 }));
      expect(test.giftRow(gift.id)).toMatchObject({
        status: "taken_out",
        escrowStatus: "missing",
        takenOutAt: test.clock.now(),
      });
      expect(returnsBuilt(test)).toBe(0);
      logs.expectLogged("gift.expiry.closed", { giftId: gift.id, status: "taken_out" });
      expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
    },
  );

  it("goes on past a gift whose return fails, and logs the failure with its gift ID", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const failing = await giftInEscrow(test);
    test.clock.advance(HOUR_MS);
    const next = await giftInEscrow(test);
    test.clock.advance(PAST_EXPIRY_MS);
    const failure = "MoveAbort(gift, 4) in command 0";
    test.chain.answerNext({ ok: false, failure });

    expect(await sweep(test)).toEqual(swept({ returned: 1, failed: 1 }));
    expect(test.giftRow(failing.gift.id)).toMatchObject({
      status: "sent",
      escrowStatus: "pending",
    });
    expect(test.giftRow(next.gift.id)).toMatchObject({
      status: "returned",
      escrowStatus: "expired_returned",
    });
    logs.expectLogged("gift.expiry.failed", { giftId: failing.gift.id });
    expect(logs.raw.find((line) => line.includes("gift.expiry.failed"))).toContain(failure);
  });

  it("runs at boot, for what downtime left, then just after each midnight, Tokyo time, after following lost gift transactions", async () => {
    const test = await createGiftsTestApp({ onSui: true });
    const { gift } = await giftInEscrow(test);
    test.clock.advance(PAST_EXPIRY_MS);
    const claimed = await giftInEscrow(test);
    const receiverId = insertUser(test.db);
    const receive = () =>
      test.post(receiverId, "/receive", {
        giftClaimToken: claimed.giftClaimToken,
        liffContextType: "utou",
      });
    expect(await answerLost(test, receive)).toMatchObject({ error: "claim_failed" });
    const waits: number[] = [];
    const job = startExpiredGiftReturns({
      ...test.deps,
      schedule: (_, ms) => {
        waits.push(ms);
        return () => {};
      },
    });
    assert(job, "Sui runs the expiry sweep");
    await job.idle();

    expect(test.giftRow(gift.id).status).toBe("returned");
    expect(test.giftRow(claimed.gift.id)).toMatchObject({ status: "received", receiverId });
    expect(test.ownerOf(claimed.gift.stickerId)).toBe(receiverId);
    const now = test.clock.now();
    expect(waits).toEqual([
      nextTokyoTicketDayStart(now).getTime() + AFTER_MIDNIGHT_MS - now.getTime(),
    ]);
    job.stop();
  });
});
