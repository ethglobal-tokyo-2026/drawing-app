// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

// Only whether the app's client waits for Privy's smart account matters here.
vi.mock("./smartWalletApi", () => ({ withSmartWallet: vi.fn((api: unknown) => api) }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the app's API client", () => {
  it.each([
    ["waits for the smart account wherever LINE is real, as in every build", "off", true],
    ["skips it under LIFF Mock, where Privy is off and the API's mock chain seals", "", false],
  ])("%s", async (_, liffMock, waits) => {
    // ApiRoot picks its client as it loads.
    vi.stubEnv("VITE_LIFF_MOCK", liffMock);
    vi.resetModules();
    const { withSmartWallet } = await import("./smartWalletApi");
    vi.mocked(withSmartWallet).mockClear();
    await import("./ApiRoot");
    expect(vi.mocked(withSmartWallet).mock.calls.length > 0).toBe(waits);
  });
});
