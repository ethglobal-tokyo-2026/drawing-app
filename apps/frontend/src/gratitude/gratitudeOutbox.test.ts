// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { gratitudeOf } from "../api/testing";
import { recordGratitudeBody } from "../api/testing";
import { resendPendingGratitude, sendGratitude } from "./gratitudeOutbox";

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
const store = (raw: string) => localStorage.setItem(PENDING_KEY, raw);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
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
    const unreadable = { giftId: "g2" };
    store(JSON.stringify([body, unreadable]));
    expect(await nextOpenSends()).toEqual([body]);
    // Recorded and forgotten; the entry it can't read stays, and so does the next combo kept beside it.
    const next = recordGratitudeBody({ idempotencyKey: crypto.randomUUID() });
    await sendGratitude(server(new TypeError("Failed to fetch")), ME, next);
    expect(JSON.parse(stored() ?? "null")).toEqual([next, unreadable]);
  });

  it("writes nothing over a list it can't read, and still sends the combo", async () => {
    store("{not a list");
    const api = server("records");
    await expect(sendGratitude(api, ME, body)).resolves.toEqual({ state: "recorded" });
    expect(api.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
    expect(stored()).toBe("{not a list");
  });
});
