import { afterEach, describe, expect, it, vi } from "vitest";
import { setSmartWallet, waitForSmartWallet, type SmartWalletClient } from "./smartWallet";

afterEach(() => {
  setSmartWallet(null);
  vi.useRealTimers();
});

describe("the smart account becoming ready", () => {
  it("lets actions started before Privy loads resume when the client arrives", async () => {
    const pending = waitForSmartWallet();
    const wallet: SmartWalletClient = {
      address: `0x${"12".repeat(20)}`,
      sendTransaction: async () => `0x${"ab".repeat(32)}`,
    };
    setSmartWallet(wallet);
    await expect(pending).resolves.toBe(wallet);
    await expect(waitForSmartWallet()).resolves.toBe(wallet);
  });

  it("offers retry when Privy never supplies a client", async () => {
    vi.useFakeTimers();
    const result = expect(waitForSmartWallet()).rejects.toThrow("Please try again");
    await vi.runAllTimersAsync();
    await result;
  });
});
