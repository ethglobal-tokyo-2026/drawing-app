// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { gratitudeOf } from "../api/mock/gratitude";
import { recordGratitudeBody } from "../api/testing";
import { newIdempotencyKey, resendPendingGratitude, sendGratitude } from "./gratitudeOutbox";

const body = recordGratitudeBody();

/** A server that answers every recordGratitude the same way: it records, it fails, or it never answers. */
const server = (answer: "records" | "never" | Error) => ({
  recordGratitude: vi.fn<ApiClient["recordGratitude"]>((sent) => {
    if (answer === "records") return Promise.resolve({ gratitude: gratitudeOf(sent, 0) });
    if (answer === "never") return new Promise(() => {});
    return Promise.reject(answer);
  }),
});

/** The next app open: what it sends again. */
async function nextOpenSends() {
  const next = server("records");
  await resendPendingGratitude(next);
  return next.recordGratitude.mock.calls.map(([sent]) => sent);
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("newIdempotencyKey", () => {
  it.each([
    [0x00, "00000000-0000-4000-8000-000000000000"],
    [0xff, "ffffffff-ffff-4fff-bfff-ffffffffffff"],
  ])("makes a v4 UUID from random bytes where crypto.randomUUID is missing", (byte, uuid) => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(byte) });
    expect(newIdempotencyKey()).toBe(uuid);
  });
});

describe("the gratitude outbox", () => {
  it("sends a combo and forgets it once the server records it", async () => {
    const api = server("records");
    await expect(sendGratitude(api, body)).resolves.toEqual({ state: "recorded" });
    expect(api.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
    expect(await nextOpenSends()).toEqual([]);
  });

  it.each([
    ["no answer", new TypeError("Failed to fetch")],
    ["a server error", new ApiError(500, { error: "internal_error" })],
    ["a server that doesn't record gratitude yet", new ApiError(404, { error: "route_not_found" })],
  ])("keeps a combo through %s and sends it again on the next open", async (_, failure) => {
    await expect(sendGratitude(server(failure), body)).resolves.toEqual({ state: "kept" });
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
    const result = await sendGratitude(server(new ApiError(status, { error: code })), body);
    expect(result).toMatchObject({ state: "refused", error: { status, code } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(code), body);
    expect(await nextOpenSends()).toEqual([]);
  });

  it("keeps a combo from before its request goes, and sends it once at a time", async () => {
    void sendGratitude(server("never"), body);
    // Its request is still out, so the resend leaves it be.
    expect(await nextOpenSends()).toEqual([]);
    // The page reloads mid-request: the next open sends it again.
    vi.resetModules();
    const reloaded = await import("./gratitudeOutbox");
    const next = server("records");
    await reloaded.resendPendingGratitude(next);
    expect(next.recordGratitude).toHaveBeenCalledExactlyOnceWith(body);
  });
});
