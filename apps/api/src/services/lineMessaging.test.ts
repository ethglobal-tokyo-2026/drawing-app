import { describe, expect, it } from "vitest";
import {
  createFakeLine,
  lineMessagingThrough,
  TEST_CHAT_MENU_IDS,
  TOKEN_LIFETIME_S,
} from "../testing/fakeLine.ts";
import { LineApiError, retryKeyFor, TOKEN_REPLACE_MARGIN_MS } from "./lineMessaging.ts";

const LINE_USER_ID = `U${"f".repeat(32)}`;
const { en } = TEST_CHAT_MENU_IDS;
/** A UUID LINE takes as a retry key, of the version made from a name. */
const NAME_BASED_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("the Messaging API channel's chat menu calls", () => {
  it("issue one channel access token, and a new one shortly before it expires", async () => {
    let now = 0;
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line, () => now);
    await messaging.linkMenu(LINE_USER_ID, en["3"]);
    const replaceAt = TOKEN_LIFETIME_S * 1000 - TOKEN_REPLACE_MARGIN_MS;
    now = replaceAt - 1;
    await messaging.linkMenu(LINE_USER_ID, en["2"]);
    expect(line.calls.filter((call) => call === "token")).toHaveLength(1);
    now = replaceAt;
    await messaging.linkMenu(LINE_USER_ID, en["1"]);
    expect(line.calls.filter((call) => call === "token")).toHaveLength(2);
  });

  it("read back a person's menu, null with none, and unlink it", async () => {
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line);
    expect(await messaging.linkedMenu(LINE_USER_ID)).toBeNull();
    await messaging.linkMenu(LINE_USER_ID, en["3"]);
    expect(await messaging.linkedMenu(LINE_USER_ID)).toBe(en["3"]);
    await messaging.unlinkMenu(LINE_USER_ID);
    expect(await messaging.linkedMenu(LINE_USER_ID)).toBeNull();
  });

  it("start a batch with its resume key, and read its phase by LINE's request ID", async () => {
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line);
    line.reportNextBatch(["ongoing", "succeeded"]);
    const moves = [{ from: en["2"], to: en["3"] }];
    const requestId = await messaging.moveMenus(moves, "2026-09-28");
    expect(line.batches).toMatchObject([{ requestId, resumeRequestKey: "2026-09-28", moves }]);
    expect(await messaging.batchPhase(requestId)).toBe("ongoing");
    expect(await messaging.batchPhase(requestId)).toBe("succeeded");
  });

  it("say which failures asking again can fix: no answer, a rate limit, or LINE's own", async () => {
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line);
    const failure = async (answer: Response | Error) => {
      line.failNext("link", answer);
      const error = await messaging
        .linkMenu(LINE_USER_ID, en["3"])
        .catch((failed: unknown) => failed);
      if (!(error instanceof LineApiError)) throw new Error("Expected a LineApiError");
      return { status: error.status, retryable: error.retryable, message: error.message };
    };
    expect(await failure(new TypeError("fetch failed"))).toMatchObject({
      status: 0,
      retryable: true,
    });
    for (const status of [429, 500]) {
      expect(await failure(Response.json({ message: "busy" }, { status }))).toMatchObject({
        status,
        retryable: true,
      });
    }
    expect(await failure(Response.json({ message: "Not found" }, { status: 404 }))).toEqual({
      status: 404,
      retryable: false,
      message: "LINE rich menu link: HTTP 404: Not found",
    });
  });

  it("push a text with its retry key, and count LINE's 409 for a key it took as sent", async () => {
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line);
    const retryKey = retryKeyFor("a test announcement");
    expect(await messaging.pushText(LINE_USER_ID, "Hello", retryKey)).toBe("sent");
    expect(await messaging.pushText(LINE_USER_ID, "Hello", retryKey)).toBe("already_sent");
    expect(line.pushes).toEqual([{ to: LINE_USER_ID, text: "Hello", retryKey }]);
  });

  it("say a push past the month's messages can't be fixed by asking again, unlike a rate limit", async () => {
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line);
    const retryableAfter = async (message: string) => {
      line.failNext("push", Response.json({ message }, { status: 429 }));
      const error = await messaging
        .pushText(LINE_USER_ID, "Hello", retryKeyFor(message))
        .catch((failed: unknown) => failed);
      if (!(error instanceof LineApiError)) throw new Error("Expected a LineApiError");
      return error.retryable;
    };
    expect(await retryableAfter("You have reached your monthly limit.")).toBe(false);
    expect(await retryableAfter("The API rate limit has been exceeded. Try again later.")).toBe(
      true,
    );
  });
});

describe("retryKeyFor", () => {
  it("makes the same UUID for the same announcement, and another for another", () => {
    const key = retryKeyFor("gift 1 received");
    expect(key).toMatch(NAME_BASED_UUID);
    expect(retryKeyFor("gift 1 received")).toBe(key);
    expect(retryKeyFor("gift 2 received")).not.toBe(key);
  });
});
