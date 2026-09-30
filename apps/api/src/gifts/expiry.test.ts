import { GIFT_EXPIRY_MS } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { AFTER_MIDNIGHT_MS } from "../midnightJob.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf } from "../testing/responses.ts";
import { nextTokyoTicketDayStart } from "../ticketDays.ts";
import { CLOSE_UNLANDED_AFTER_MS, returnExpiredGifts, startExpiredGiftReturns } from "./expiry.ts";
import { receivedGiftSchema } from "./receiving.ts";
import { createGiftsTestApp, giftOf, type GiftsTestApp } from "./testGifts.ts";

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

/** A new gift whose deposit landed in the escrow and was reported: in the bag, or sent. */
async function giftInEscrow(test: GiftsTestApp, status: "packed" | "sent" = "sent") {
  const packed = await test.packagedGift();
  test.landDeposit(packed.gift.id);
  await giftOf(await test.deposit(packed.giverId, packed.gift.id));
  if (status === "sent") await giftOf(await test.share(packed.giverId, packed.gift.id, "sent"));
  return packed;
}

const sweep = (test: GiftsTestApp) => returnExpiredGifts(test.deps, test.giftChain);

/** The sweep's tally: `counts`, and none of any other outcome. */
const swept = (counts: Partial<Awaited<ReturnType<typeof returnExpiredGifts>>>) => ({
  returned: 0,
  recorded: 0,
  closed: 0,
  left: 0,
  failed: 0,
  ...counts,
});

describe("The expiry sweep", () => {
  it.each(["packed", "sent"] as const)(
    "sends an expired %s gift's sticker back on chain and records the gift returned, so the sticker can be given again",
    async (status) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { giverId, gift } = await giftInEscrow(test, status);
      test.clock.advance(PAST_EXPIRY_MS);

      expect(await sweep(test)).toEqual(swept({ returned: 1 }));
      expect((await test.giftChain.readEscrowGift(gift.id)).status).toBe("expired_returned");
      expect(test.giftRow(gift.id)).toMatchObject({
        status: "returned",
        escrowStatus: "expired_returned",
        returnedAt: test.clock.now(),
      });
      expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
    },
  );

  it("leaves a gift that hasn't expired", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const expired = await giftInEscrow(test);
    test.clock.advance(2 * HOUR_MS);
    const waiting = await giftInEscrow(test);
    test.clock.advance(GIFT_EXPIRY_MS - HOUR_MS);
    const before = test.giftRow(waiting.gift.id);

    expect(await sweep(test)).toEqual(swept({ returned: 1 }));
    expect(test.giftRow(expired.gift.id).status).toBe("returned");
    expect(test.giftRow(waiting.gift.id)).toEqual(before);
    expect((await test.giftChain.readEscrowGift(waiting.gift.id)).status).toBe("pending");
  });

  it.each([
    ["expired_returned", "returned"],
    ["rejected", "taken_out"],
  ] as const)(
    "records a gift the escrow already shows %s as %s, without sending it back",
    async (escrowStatus, status) => {
      const test = await createGiftsTestApp({ escrowChain: true });
      const { gift } = await giftInEscrow(test);
      test.setEscrowStatus(gift.id, escrowStatus);
      test.clock.advance(PAST_EXPIRY_MS);

      expect(await sweep(test)).toEqual(swept({ recorded: 1 }));
      expect(test.giftRow(gift.id)).toMatchObject({ status, escrowStatus });
    },
  );

  it("leaves a gift the escrow shows claimed for Receiving to record, and one it doesn't hold, logging each", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const claimed = await giftInEscrow(test);
    const elsewhere = await giftInEscrow(test);
    const receiverId = insertUser(test.db);
    const { giftClaimToken } = claimed;
    await test.giftChain.claimGift({
      giftId: claimed.gift.id,
      giftClaimToken,
      recipientId: receiverId,
    });
    // Its deposit is in another escrow, as after the escrow is deployed again.
    test.giftChain.escrow.delete(elsewhere.gift.id);
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ left: 2 }));
    for (const { gift } of [claimed, elsewhere]) {
      expect(test.giftRow(gift.id)).toMatchObject({ status: "sent", escrowStatus: "pending" });
    }
    logs.expectLogged("gift.expiry.left", { giftId: claimed.gift.id, status: "claimed" });
    logs.expectLogged("gift.expiry.left", { giftId: elsewhere.gift.id, status: "missing" });
    const received = await test.post(receiverId, "/receive", {
      giftClaimToken,
      liffContextType: "utou",
    });
    expect((await bodyOf(received, receivedGiftSchema)).gift).toMatchObject({
      status: "received",
      receiverId,
    });
  });

  it("sends back and records a packed gift whose deposit landed but was never reported", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift } = await test.packagedGift();
    test.landDeposit(gift.id);
    test.clock.advance(PAST_EXPIRY_MS);

    expect(await sweep(test)).toEqual(swept({ returned: 1 }));
    expect((await test.giftChain.readEscrowGift(gift.id)).status).toBe("expired_returned");
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "returned",
      escrowStatus: "expired_returned",
    });
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it("closes a packed gift whose deposit never landed once CLOSE_UNLANDED_AFTER_MS has passed its expiry, so its sticker can be given again", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { giverId, gift } = await test.packagedGift();
    test.clock.advance(PAST_EXPIRY_MS + CLOSE_UNLANDED_AFTER_MS);

    expect(await sweep(test)).toEqual(swept({ closed: 1 }));
    expect(test.giftRow(gift.id)).toMatchObject({
      status: "taken_out",
      escrowStatus: "missing",
      takenOutAt: test.clock.now(),
    });
    logs.expectLogged("gift.expiry.closed", { giftId: gift.id, status: "taken_out" });
    expect(await test.packageSticker(giverId, gift.stickerId)).toMatchObject({ status: 201 });
  });

  it("leaves a packed gift whose deposit hasn't landed while CLOSE_UNLANDED_AFTER_MS hasn't passed its expiry", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift } = await test.packagedGift();
    test.clock.advance(GIFT_EXPIRY_MS + CLOSE_UNLANDED_AFTER_MS / 2);
    const before = test.giftRow(gift.id);

    expect(await sweep(test)).toEqual(swept({ left: 1 }));
    expect(test.giftRow(gift.id)).toEqual(before);
    logs.expectLogged("gift.expiry.left", { giftId: gift.id, status: "missing" });
  });

  it("goes on past a gift whose return fails, and logs the failure with its gift ID", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const failing = await giftInEscrow(test);
    test.clock.advance(HOUR_MS);
    const next = await giftInEscrow(test);
    test.clock.advance(PAST_EXPIRY_MS);
    const cause = new Error("Returning the gift reverted");
    vi.spyOn(test.giftChain, "returnExpiredGift").mockRejectedValueOnce(cause);

    expect(await sweep(test)).toEqual(swept({ returned: 1, failed: 1 }));
    expect(test.giftRow(failing.gift.id)).toMatchObject({
      status: "sent",
      escrowStatus: "pending",
    });
    expect(test.giftRow(next.gift.id)).toMatchObject({
      status: "returned",
      escrowStatus: "expired_returned",
    });
    expect(logs.entries).toContainEqual(
      expect.objectContaining({
        event: "gift.expiry.failed",
        giftId: failing.gift.id,
        causes: [expect.objectContaining({ message: cause.message })],
      }),
    );
  });

  it("runs at boot, for what downtime left, then just after each midnight, Tokyo time", async () => {
    const test = await createGiftsTestApp({ escrowChain: true });
    const { gift } = await giftInEscrow(test);
    test.clock.advance(PAST_EXPIRY_MS);
    const waits: number[] = [];
    const job = startExpiredGiftReturns({
      ...test.deps,
      schedule: (_, ms) => {
        waits.push(ms);
        return () => {};
      },
    });
    assert(job, "The escrow chain has gifts to return");
    await job.idle();

    expect(test.giftRow(gift.id).status).toBe("returned");
    const now = test.clock.now();
    expect(waits).toEqual([
      nextTokyoTicketDayStart(now).getTime() + AFTER_MIDNIGHT_MS - now.getTime(),
    ]);
    job.stop();
  });
});
