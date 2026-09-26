import { describe, expect, it } from "vitest";
import { createFakeLine, lineMessagingThrough, TEST_CHAT_MENU_IDS } from "../testing/fakeLine.ts";
import { createLineMessaging, LineApiError } from "./lineMessaging.ts";

const LINE_USER_ID = `U${"f".repeat(32)}`;
const TOKEN_LIFETIME_S = 900;
const { en } = TEST_CHAT_MENU_IDS;

describe("the Messaging API channel's chat menu calls", () => {
  it("issue one channel access token, and a new one a minute before it expires", async () => {
    let now = 0;
    const line = createFakeLine();
    const messaging = lineMessagingThrough(line, () => now);
    await messaging.linkMenu(LINE_USER_ID, en["3"]);
    now = (TOKEN_LIFETIME_S - 61) * 1000;
    await messaging.linkMenu(LINE_USER_ID, en["2"]);
    expect(line.calls.filter((call) => call === "token")).toHaveLength(1);
    now = (TOKEN_LIFETIME_S - 60) * 1000;
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

  it("refuse to start without the channel's ID and secret", () => {
    expect(() => createLineMessaging({ channelId: "", channelSecret: "secret" })).toThrow(
      /channel's ID and secret/,
    );
  });
});
