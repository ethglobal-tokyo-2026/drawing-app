import { afterEach, describe, expect, it, vi } from "vitest";
import { newIdempotencyKey } from "./idempotencyKey";

afterEach(() => vi.unstubAllGlobals());

describe("newIdempotencyKey", () => {
  it.each([
    [0x00, "00000000-0000-4000-8000-000000000000"],
    [0xff, "ffffffff-ffff-4fff-bfff-ffffffffffff"],
  ])("makes a v4 UUID from random bytes where crypto.randomUUID is missing", (byte, uuid) => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(byte) });
    expect(newIdempotencyKey()).toBe(uuid);
  });
});
