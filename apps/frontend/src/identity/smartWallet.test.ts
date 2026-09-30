import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privyStatus, setPrivyStatus } from "./privy";
import {
  setSmartWallet,
  smartWalletFailed,
  waitForSmartWallet,
  type SmartWalletClient,
} from "./smartWallet";

const wallet: SmartWalletClient = {
  address: `0x${"12".repeat(20)}`,
  sendTransaction: async () => `0x${"ab".repeat(32)}`,
};

beforeEach(() => {
  setPrivyStatus({ state: "signing-in" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  setSmartWallet(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the smart account becoming ready", () => {
  it("lets actions started before Privy loads resume when the client arrives", async () => {
    const pending = waitForSmartWallet();
    setSmartWallet(wallet);
    await expect(pending).resolves.toBe(wallet);
    await expect(waitForSmartWallet()).resolves.toBe(wallet);
  });

  it("offers retry, in the catalog's words, when Privy never supplies a client", async () => {
    vi.useFakeTimers();
    const result = expect(waitForSmartWallet()).rejects.toMatchObject({
      code: "smart_account_not_ready",
    });
    await vi.runAllTimersAsync();
    await result;
  });

  it("asks for LINE at once when Privy failed on LINE's expired sign-in", async () => {
    vi.useFakeTimers();
    setPrivyStatus({ state: "failed", reason: "LINE’s ID token has expired", reconnectLine: true });
    await expect(waitForSmartWallet()).rejects.toMatchObject({ code: "line_token_expired" });
    // Nothing is left waiting on the timeout.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("signs in to Privy again after a failed sign-in, and takes the client that follows", async () => {
    setPrivyStatus({ state: "failed", reason: "couldn’t reach the auth server" });
    const pending = waitForSmartWallet();
    expect(privyStatus()).toEqual({ state: "signing-in" });
    setSmartWallet(wallet);
    await expect(pending).resolves.toBe(wallet);
  });

  it("gives the fresh sign-in its try, though the client had failed before Privy did", async () => {
    smartWalletFailed("bundler unreachable");
    setPrivyStatus({ state: "failed", reason: "couldn’t reach the auth server" });
    const pending = waitForSmartWallet();
    expect(privyStatus()).toEqual({ state: "signing-in" });
    setSmartWallet(wallet);
    await expect(pending).resolves.toBe(wallet);
  });

  it("stops at once, with Privy's reason, when the fresh try fails too", async () => {
    vi.useFakeTimers();
    setPrivyStatus({ state: "failed", reason: "couldn’t reach the auth server" });
    const pending = waitForSmartWallet();
    setPrivyStatus({ state: "failed", reason: "Privy refused the sign-in: rate limited" });
    await expect(pending).rejects.toMatchObject({
      code: "smart_account_not_ready",
      detail: "Privy refused the sign-in: rate limited",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("asks for the client again when it failed to start, and stops if it fails again", async () => {
    setPrivyStatus({ state: "signed-in", userId: "did:privy:1" });
    smartWalletFailed("bundler unreachable");
    const first = waitForSmartWallet();
    setSmartWallet(wallet);
    await expect(first).resolves.toBe(wallet);

    setSmartWallet(null);
    smartWalletFailed("bundler unreachable");
    const second = waitForSmartWallet();
    smartWalletFailed("bundler still unreachable");
    await expect(second).rejects.toMatchObject({
      code: "smart_account_not_ready",
      detail: "bundler still unreachable",
    });
  });

  it("doesn't wait on the dev server, where Privy stays off", async () => {
    setPrivyStatus({ state: "off" });
    await expect(waitForSmartWallet()).rejects.toMatchObject({
      code: "smart_account_not_ready",
    });
  });
});
