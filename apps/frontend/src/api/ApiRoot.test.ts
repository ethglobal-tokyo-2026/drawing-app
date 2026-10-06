// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

// Only whether the app's client waits for Privy's Sui wallet matters here.
vi.mock("./suiWalletApi", () => ({ withSuiWallet: vi.fn((api: unknown) => api) }));

/** Each case imports ApiRoot's whole module graph afresh, which takes seconds when every core is busy. */
const FRESH_IMPORT_TIMEOUT_MS = 30_000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the app's API client", () => {
  it.each([
    ["waits for the Sui wallet wherever LINE is real, as in every build", "off", true],
    ["skips it under LIFF Mock, where Privy is off and the API's mock chain seals", "", false],
  ])(
    "%s",
    async (_, liffMock, waits) => {
      // The app picks its client as serverClients loads.
      vi.stubEnv("VITE_LIFF_MOCK", liffMock);
      vi.resetModules();
      const { withSuiWallet } = await import("./suiWalletApi");
      vi.mocked(withSuiWallet).mockClear();
      await import("./serverClients");
      expect(vi.mocked(withSuiWallet).mock.calls.length > 0).toBe(waits);
    },
    FRESH_IMPORT_TIMEOUT_MS,
  );
});
