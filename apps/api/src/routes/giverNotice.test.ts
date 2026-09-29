import { GIFT_EXPIRY_MS, users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { receivedRetryKey, receivedText, RETRY_WINDOW_MS } from "../gifts/giverNotice.ts";
import { receivedGiftSchema } from "../gifts/receiving.ts";
import { createGiftsTestApp, giftOf, type GiftsTestApp } from "../gifts/testGifts.ts";
import { createFakeLine, type FakeLine } from "../testing/fakeLine.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf } from "../testing/responses.ts";

/** A LINE user ID as LINE writes them: U and 32 hex digits. */
const GIVER_LINE_USER_ID = `U${"0123456789abcdef".repeat(2)}`;
const RECEIVER_HANDLE = "bob";

let line: FakeLine;
let test: GiftsTestApp;
let log: LogLines;
// The giver reads Japanese; the receiver, @bob, reads English.
let giverId: string;
let receiverId: string;

beforeEach(async () => {
  log = captureLogLines();
  line = createFakeLine();
  test = await createGiftsTestApp({ line });
  giverId = insertUser(test.db, { lineUserId: GIVER_LINE_USER_ID, language: "ja" });
  receiverId = insertUser(test.db, { handle: RECEIVER_HANDLE, language: "en" });
});

afterEach(() => {
  expect(log.raw.join("\n")).not.toContain(GIVER_LINE_USER_ID);
  vi.restoreAllMocks();
});

const receive = (userId: string, giftClaimToken: string, liffContextType = "utou") =>
  test.post(userId, "/receive", { giftClaimToken, liffContextType });

/** A new gift from the giver, received through its link, with its message settled. */
async function receivedGift() {
  const { gift, giftClaimToken } = await test.packagedGift(giverId);
  await bodyOf(await receive(receiverId, giftClaimToken), receivedGiftSchema);
  await test.deps.giverNotice.idle();
  return { gift, giftClaimToken };
}

const pushedAt = (giftId: string) => test.giftRow(giftId).pushedToGiverAt;
const pushCalls = () => line.calls.filter((call) => call.startsWith("push"));
const pushFailure = (status: number, message: string) => Response.json({ message }, { status });

describe("the giver's message once their gift is received", () => {
  it("goes to the giver once, in their language, naming the receiver, with the gift's retry key", async () => {
    const { gift, giftClaimToken } = await receivedGift();
    expect(line.pushes).toEqual([
      {
        to: GIVER_LINE_USER_ID,
        text: receivedText("ja", `@${RECEIVER_HANDLE}`),
        retryKey: receivedRetryKey(gift.id),
      },
    ]);
    expect(pushedAt(gift.id)).toEqual(test.clock.now());

    // Neither Accept again, as after a lost response, nor a sweep sends it again.
    await bodyOf(await receive(receiverId, giftClaimToken), receivedGiftSchema);
    await test.deps.giverNotice.sweep();
    expect(pushCalls()).toHaveLength(1);
  });

  it("isn't sent for a gift taken back, or a receive refused", async () => {
    const takenBack = await test.packagedGift(giverId);
    await giftOf(await test.takeOut(giverId, takenBack.gift.id));
    expect((await receive(receiverId, takenBack.giftClaimToken)).status).toBe(409);
    const refused = await test.packagedGift(giverId);
    expect((await receive(giverId, refused.giftClaimToken)).status).toBe(403);
    expect((await receive(receiverId, refused.giftClaimToken, "group")).status).toBe(403);
    test.clock.advance(GIFT_EXPIRY_MS);
    expect((await receive(receiverId, refused.giftClaimToken)).status).toBe(410);

    await test.deps.giverNotice.idle();
    await test.deps.giverNotice.sweep();
    expect(line.calls).toEqual([]);
  });

  it("is retried with the same key after a lost answer, and LINE's 409 counts as sent", async () => {
    line.loseNextAnswer("push");
    const { gift } = await receivedGift();
    expect(pushedAt(gift.id)).toBeNull();

    await test.deps.giverNotice.sweep();
    const key = receivedRetryKey(gift.id);
    expect(pushCalls()).toEqual([`push ${key}`, `push ${key}`]);
    expect(line.pushes).toHaveLength(1);
    expect(pushedAt(gift.id)).toEqual(test.clock.now());
    log.expectLogged("gift.giver_notice.sent", { giftId: gift.id, status: "already_sent" });
  });

  it("is sent by a sweep after it failed, and given up once a retry could send it twice", async () => {
    line.failNext("push", pushFailure(500, "Internal server error"));
    const failedOnce = await receivedGift();
    expect(line.pushes).toEqual([]);
    await test.deps.giverNotice.sweep();
    expect(line.pushes).toMatchObject([{ retryKey: receivedRetryKey(failedOnce.gift.id) }]);

    line.failNext("push", new TypeError("fetch failed"));
    const late = await receivedGift();
    test.clock.advance(RETRY_WINDOW_MS);
    const tries = pushCalls().length;
    await test.deps.giverNotice.sweep();
    expect(pushCalls()).toHaveLength(tries);
    expect(pushedAt(late.gift.id)).toEqual(test.clock.now());
    log.expectLogged("gift.giver_notice.given_up", {
      giftId: late.gift.id,
      status: "retry_window_passed",
    });
  });

  it("is given up at once when LINE refuses it, the month's limit included", async () => {
    line.failNext("push", pushFailure(429, "You have reached your monthly limit."));
    const { gift } = await receivedGift();
    await test.deps.giverNotice.sweep();
    expect(pushCalls()).toHaveLength(1);
    expect(pushedAt(gift.id)).toEqual(test.clock.now());
  });

  it("is skipped for a giver whose account is deleted", async () => {
    const { gift, giftClaimToken } = await test.packagedGift(giverId);
    test.db
      .update(users)
      .set({
        deletedAt: test.clock.now(),
        lineUserId: null,
        lineDisplayName: null,
        linePictureUrl: null,
        handle: null,
      })
      .where(eq(users.id, giverId))
      .run();
    await bodyOf(await receive(receiverId, giftClaimToken), receivedGiftSchema);
    await test.deps.giverNotice.idle();
    expect(line.calls).toEqual([]);
    expect(pushedAt(gift.id)).toEqual(test.clock.now());
  });
});
