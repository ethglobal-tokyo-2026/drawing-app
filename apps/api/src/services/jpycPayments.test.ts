import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOT_LANDED_RETRY_MS, readLanded, SUI_READ_TIMEOUT_MS } from "./jpycPayments.ts";

/** What a read finds once Sui shows the transaction. */
const FOUND = { payments: [] };

/** A fullnode that shows the transaction from its `showsOn`th read, or never. */
const fullnode = (showsOn = Infinity) => {
  const read = vi.fn(() => Promise.resolve(read.mock.calls.length >= showsOn ? FOUND : null));
  return read;
};

/** A read the fullnode never answers, until the wait running out cuts it off. */
const unanswered = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason));
  });

beforeEach(() => {
  vi.useFakeTimers();
  // Node's own AbortSignal.timeout runs on the real clock, which the fake one doesn't move.
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("The read timed out", "TimeoutError")), ms);
    return controller.signal;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reading a payment from Sui", () => {
  it("asks again while Sui doesn't show a transaction yet", async () => {
    const read = fullnode(3);
    const reading = readLanded(read);
    await vi.advanceTimersByTimeAsync(NOT_LANDED_RETRY_MS * 2);
    await expect(reading).resolves.toBe(FOUND);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("answers null once the wait runs out with Sui still not showing it", async () => {
    const read = fullnode();
    const reading = readLanded(read);
    await vi.advanceTimersByTimeAsync(SUI_READ_TIMEOUT_MS);
    await expect(reading).resolves.toBeNull();
    expect(read.mock.calls.length).toBeGreaterThan(1);
  });

  it("answers null when the wait runs out mid-read, once Sui has said it doesn't show the transaction", async () => {
    const read = vi.fn((signal: AbortSignal) =>
      read.mock.calls.length === 1 ? Promise.resolve(null) : unanswered(signal),
    );
    const reading = readLanded(read);
    await vi.advanceTimersByTimeAsync(SUI_READ_TIMEOUT_MS);
    await expect(reading).resolves.toBeNull();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("rejects when Sui answers no read before the wait runs out", async () => {
    const reading = readLanded(unanswered);
    const rejected = expect(reading).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(SUI_READ_TIMEOUT_MS);
    await rejected;
  });

  it("rejects at the first failure to reach Sui, rather than waiting it out", async () => {
    const outage = new Error("fullnode unreachable");
    const read = vi.fn(() => Promise.reject(outage));
    await expect(readLanded(read)).rejects.toBe(outage);
    expect(read).toHaveBeenCalledOnce();
  });
});
