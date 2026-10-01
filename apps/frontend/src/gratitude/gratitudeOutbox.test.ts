// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { gratitudeOf } from "../api/testing";
import { recordGratitudeBody } from "../api/testing";
import { refusingStorage } from "../ui/testing";
import { GAME_CONFIG } from "./gameConfig";
import {
  isGratitudeWaiting,
  keepGratitudeInPlay,
  onGratitudeLeftOutbox,
  resendGratitudeWhenReachable,
  resendPendingGratitude,
  sendGratitude,
} from "./gratitudeOutbox";
import { readGratitudeRefusals } from "./gratitudeRefusals";

const body = recordGratitudeBody();
/** The person signed in, and someone else who signs in on the same device. */
const ME = "me";
const SOMEONE_ELSE = "someone-else";

/** A server that answers every recordGratitude the same way: it records, it fails, or it never answers. */
const server = (answer: "records" | "never" | Error) => ({
  recordGratitude: vi.fn<ApiClient["recordGratitude"]>((sent) => {
    if (answer === "records") return Promise.resolve(gratitudeOf(sent));
    if (answer === "never") return new Promise(() => {});
    return Promise.reject(answer);
  }),
});

/** The next app open, signed in as `userId`: what it sends again. */
async function nextOpenSends(userId = ME) {
  const next = server("records");
  await resendPendingGratitude(next, userId);
  return next.recordGratitude.mock.calls.map(([sent]) => sent);
}

/** Your outbox as this device stores it, and storage the app didn't write, put there. */
const PENDING_KEY = `draw.gratitude.pending.${ME}`;
const stored = () => localStorage.getItem(PENDING_KEY);
const storedEntries = (): unknown[] => {
  const entries: unknown = JSON.parse(stored() ?? "[]");
  if (!Array.isArray(entries)) throw new Error(`The outbox isn't a list: ${stored()}`);
  return entries.map((entry: unknown) => entry);
};
const store = (raw: string) => localStorage.setItem(PENDING_KEY, raw);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the gratitude outbox", () => {
  it("sends a combo and forgets it once the server records it", async () => {
    const api = server("records");
    await expect(sendGratitude(api, ME, body)).resolves.toEqual({ state: "recorded" });
    expect(api.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
    expect(await nextOpenSends()).toEqual([]);
  });

  it.each([
    ["no answer", new TypeError("Failed to fetch")],
    ["a server error", new ApiError(500, { error: "internal_error" })],
    ["a server that doesn't record gratitude yet", new ApiError(404, { error: "route_not_found" })],
  ])("keeps a combo through %s and sends it again on the next open", async (_, failure) => {
    await expect(sendGratitude(server(failure), ME, body)).resolves.toEqual({ state: "kept" });
    expect(await nextOpenSends()).toEqual([body]);
    // Recorded that time, so the open after sends nothing.
    expect(await nextOpenSends()).toEqual([]);
  });

  it.each([
    [400, "replay_invalid"],
    [403, "not_receiver"],
    [404, "gift_not_found"],
    [409, "gift_not_received"],
    [409, "gratitude_already_recorded"],
  ])("forgets a combo the server refuses with %i %s, and logs why", async (status, code) => {
    const result = await sendGratitude(server(new ApiError(status, { error: code })), ME, body);
    expect(result).toMatchObject({ state: "refused", error: { status, code } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(code), body);
    expect(await nextOpenSends()).toEqual([]);
  });

  it("keeps a combo from before its request goes, and sends it once at a time", async () => {
    // Its own combo: the request it sends never ends, so its key stays out.
    const waiting = recordGratitudeBody({ idempotencyKey: crypto.randomUUID() });
    void sendGratitude(server("never"), ME, waiting);
    // Its request is still out, so the resend leaves it be.
    expect(await nextOpenSends()).toEqual([]);
    // The page reloads mid-request: the next open sends it again.
    vi.resetModules();
    const reloaded = await import("./gratitudeOutbox");
    const next = server("records");
    await reloaded.resendPendingGratitude(next, ME);
    expect(next.recordGratitude).toHaveBeenCalledExactlyOnceWith(waiting);
  });

  it("sends only the signed-in person's combos, and leaves another's for them", async () => {
    await sendGratitude(server(new TypeError("Failed to fetch")), ME, body);
    expect(await nextOpenSends(SOMEONE_ELSE)).toEqual([]);
    expect(await nextOpenSends(ME)).toEqual([body]);
  });

  it("sends the combos it can read, and keeps the entries it can't as they were", async () => {
    await sendGratitude(server(new TypeError("Failed to fetch")), ME, body);
    const unreadable = { giftId: "g2" };
    store(JSON.stringify([...storedEntries(), unreadable]));
    expect(await nextOpenSends()).toEqual([body]);
    // Recorded and forgotten, and the entry it can't read is written back as it was.
    expect(storedEntries()).toEqual([unreadable]);
  });

  it("sends a combo kept in play once no other tab can still be playing it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    keepGratitudeInPlay(ME, body);
    const next = server("records");
    const resent = resendPendingGratitude(next, ME);
    // A tab still playing it would end it by its safety stop, and send it itself.
    await vi.advanceTimersByTimeAsync(GAME_CONFIG.maxDurationMs);
    expect(next.recordGratitude).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    await resent;
    expect(next.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
  });

  it("writes nothing over a list it can't read, and still sends the combo", async () => {
    store("{not a list");
    const api = server("records");
    await expect(sendGratitude(api, ME, body)).resolves.toEqual({ state: "recorded" });
    expect(api.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
    expect(stored()).toBe("{not a list");
  });

  it("answers lost, not kept, when the device can't keep the combo and the send doesn't get through", async () => {
    vi.stubGlobal("localStorage", refusingStorage);
    await expect(
      sendGratitude(server(new TypeError("Failed to fetch")), ME, body),
    ).resolves.toEqual({
      state: "lost",
    });
    // Nothing holds it: a later open has nothing to send, and the gift is still owed gratitude.
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(false);
    // A send that does get through still records it.
    await expect(sendGratitude(server("records"), ME, body)).resolves.toEqual({
      state: "recorded",
    });
  });
});

describe("why the server refused gratitude", () => {
  const noAnswer = () => server(new TypeError("Failed to fetch"));
  const refusal = new ApiError(403, {
    error: "not_receiver",
    detail: "the gift is someone else's",
  });

  it("is kept per gift when a resend after reconnecting is refused, and let go once the gift's gratitude is recorded", async () => {
    // Kept for want of a connection: nothing is refused yet.
    await sendGratitude(noAnswer(), ME, body);
    expect(readGratitudeRefusals(ME)).toEqual([]);
    // Refused once the phone is back online, with no screen waiting on the answer.
    await resendPendingGratitude(server(refusal), ME);
    expect(readGratitudeRefusals(ME)).toEqual([
      { giftId: body.giftId, status: 403, code: "not_receiver", detail: refusal.detail },
    ]);
    expect(readGratitudeRefusals(SOMEONE_ELSE)).toEqual([]);
    // A later combo for the gift that the server records makes the refusal moot.
    await sendGratitude(server("records"), ME, recordGratitudeBody({ idempotencyKey: "later" }));
    expect(readGratitudeRefusals(ME)).toEqual([]);
  });

  it("keeps only the latest refusal of a gift, and the others' as they were", async () => {
    await sendGratitude(server(refusal), ME, body);
    const other = recordGratitudeBody({ giftId: "g2", idempotencyKey: "other" });
    await sendGratitude(server(new ApiError(404, { error: "gift_not_found" })), ME, other);
    await sendGratitude(
      server(new ApiError(409, { error: "gratitude_already_recorded" })),
      ME,
      recordGratitudeBody({ idempotencyKey: "again" }),
    );
    expect(readGratitudeRefusals(ME).map(({ giftId, code }) => [giftId, code])).toEqual([
      ["g2", "gift_not_found"],
      [body.giftId, "gratitude_already_recorded"],
    ]);
  });
});

describe("gratitude waiting in the outbox", () => {
  const noAnswer = () => server(new TypeError("Failed to fetch"));

  it("is known for its gift from the moment it's kept until the server records or refuses it", async () => {
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(false);
    await sendGratitude(noAnswer(), ME, body);
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(true);
    // Only for that gift, and only for the person it was kept for.
    expect(isGratitudeWaiting(ME, "another-gift")).toBe(false);
    expect(isGratitudeWaiting(SOMEONE_ELSE, body.giftId)).toBe(false);
    await nextOpenSends();
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(false);
  });

  it("counts a combo still in play, which a page torn down leaves to send", () => {
    keepGratitudeInPlay(ME, body);
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(true);
  });

  it("asks without logging a list it can't read, which sending and keeping log", () => {
    store("{not a list");
    expect(isGratitudeWaiting(ME, body.giftId)).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("tells a screen when a kept combo has left, recorded or refused, but not when one is kept", async () => {
    const left = vi.fn();
    const stop = onGratitudeLeftOutbox(left);
    await sendGratitude(noAnswer(), ME, body);
    expect(left).not.toHaveBeenCalled();
    await nextOpenSends();
    expect(left).toHaveBeenCalledExactlyOnceWith({
      idempotencyKey: body.idempotencyKey,
      result: { state: "recorded" },
    });
    await sendGratitude(
      server(new ApiError(409, { error: "gratitude_already_recorded" })),
      ME,
      body,
    );
    expect(left).toHaveBeenCalledTimes(2);
    expect(left.mock.lastCall?.[0]).toMatchObject({
      idempotencyKey: body.idempotencyKey,
      result: { state: "refused", error: { status: 409 } },
    });
    stop();
    await sendGratitude(server("records"), ME, body);
    expect(left).toHaveBeenCalledTimes(2);
  });
});

describe("sending kept gratitude again while the app stays open", () => {
  /** The page's visibility, as the app sees it; `state` is what `document.visibilityState` says. */
  const showPage = (state: "hidden" | "visible") => {
    Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  afterEach(() => Reflect.deleteProperty(document, "visibilityState"));

  it("sends what's kept as the app starts, and again when the phone is back online or the app is back in front", async () => {
    await sendGratitude(server(new TypeError("Failed to fetch")), ME, body);
    // Still no connection: each try keeps it.
    const api = server(new TypeError("Failed to fetch"));
    const stop = resendGratitudeWhenReachable(api, ME);
    await vi.waitFor(() => expect(api.recordGratitude).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(api.recordGratitude).toHaveBeenCalledTimes(2));

    // Going to the background sends nothing; coming back does.
    showPage("hidden");
    showPage("visible");
    await vi.waitFor(() => expect(api.recordGratitude).toHaveBeenCalledTimes(3));
    expect(api.recordGratitude.mock.calls.map(([sent]) => sent)).toEqual([body, body, body]);

    // Once stopped, nothing else sends it.
    stop();
    window.dispatchEvent(new Event("online"));
    showPage("visible");
    await Promise.resolve();
    expect(api.recordGratitude).toHaveBeenCalledTimes(3);
  });
});
