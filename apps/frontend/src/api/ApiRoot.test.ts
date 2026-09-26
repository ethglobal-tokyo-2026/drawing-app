// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

// Only whether the app's client waits for Privy's smart account matters here.
vi.mock("./smartWalletApi", () => ({ withSmartWallet: vi.fn((api: unknown) => api) }));

/** Each case imports ApiRoot's whole module graph afresh, which takes seconds when every core is busy. */
const FRESH_IMPORT_TIMEOUT_MS = 30_000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the app's API client", () => {
  it.each([
    ["waits for the smart account wherever LINE is real, as in every build", "off", true],
    ["skips it under LIFF Mock, where Privy is off and the API's mock chain seals", "", false],
  ])(
    "%s",
    async (_, liffMock, waits) => {
      // The app picks its client as serverClients loads.
      vi.stubEnv("VITE_LIFF_MOCK", liffMock);
      vi.resetModules();
      const { withSmartWallet } = await import("./smartWalletApi");
      vi.mocked(withSmartWallet).mockClear();
      await import("./serverClients");
      expect(vi.mocked(withSmartWallet).mock.calls.length > 0).toBe(waits);
    },
    FRESH_IMPORT_TIMEOUT_MS,
  );
});
