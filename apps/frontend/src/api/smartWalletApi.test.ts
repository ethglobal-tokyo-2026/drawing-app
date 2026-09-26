import type { Sticker } from "@drawing-app/api/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "./apiClient";
import { sticker } from "./testFixtures";
import { emptyApi } from "./testing";

// As in a build: with LIFF Mock on, as on the dev server by default, Sealing skips both checks.
vi.stubEnv("VITE_LIFF_MOCK", "off");

const { setSmartWallet } = await import("../identity/smartWallet");
const { withSmartWallet } = await import("./smartWalletApi");

afterEach(() => setSmartWallet(null));

const ready = () =>
  setSmartWallet({
    address: `0x${"12".repeat(20)}`,
    sendTransaction: async () => `0x${"ab".repeat(32)}`,
  });

const image = new Blob();
const request = {
  ticketUseId: 1,
  timeUsed: 1,
  width: 1,
  height: 1,
  outline: "M0 0Z",
  png: image,
  mask: image,
  spec: image,
  rim: image,
  flat: image,
};

/** The server's answer to a seal that made `sealed`. */
const answer = (sealed: Sticker) => ({
  sticker: sealed,
  stickerPlacement: {
    stickerId: sealed.id,
    placement: null,
    seenAt: null,
    arrivedAt: sealed.sealedAt,
  },
});

describe("REST actions that require a smart account", () => {
  it("waits for Privy before asking the server to receive a Sticker", async () => {
    const receiveGift = vi
      .fn<ApiClient["receiveGift"]>()
      .mockRejectedValue(new Error("gift expired"));
    const api = withSmartWallet(emptyApi({ receiveGift }));
    const opening = { giftClaimToken: `0x${"cd".repeat(32)}`, liffContextType: "utou" as const };
    const result = expect(api.receiveGift(opening)).rejects.toThrow("gift expired");
    expect(receiveGift).not.toHaveBeenCalled();
    ready();
    await result;
    expect(receiveGift).toHaveBeenCalledWith(opening);
  });

  it("waits for Privy before Sealing, then takes a confirmed seal", async () => {
    const confirmed = answer(sticker({ tokenId: "1", mintTxHash: `0x${"ef".repeat(32)}` }));
    const seal = vi.fn<ApiClient["seal"]>().mockResolvedValue(confirmed);
    const api = withSmartWallet(emptyApi({ seal }));
    const result = expect(api.seal(request)).resolves.toBe(confirmed);
    expect(seal).not.toHaveBeenCalled();
    ready();
    await result;
  });

  it.each([
    { tokenId: null, mintTxHash: null },
    { tokenId: "1", mintTxHash: null },
  ])("keeps Sealing retryable without mint confirmation: %j", async (confirmation) => {
    ready();
    const seal = vi.fn<ApiClient["seal"]>().mockResolvedValue(answer(sticker(confirmation)));
    const api = withSmartWallet(emptyApi({ seal }));
    await expect(api.seal(request)).rejects.toMatchObject({ code: "mint_failed" });
  });
});

describe("Sealing under LIFF Mock, on the dev server", () => {
  afterEach(() => {
    vi.stubEnv("VITE_LIFF_MOCK", "off");
  });

  it("doesn't wait for a smart account, and takes the mock chain's seal without a token", async () => {
    vi.stubEnv("VITE_LIFF_MOCK", "");
    vi.resetModules();
    const { withSmartWallet: underMock } = await import("./smartWalletApi");
    const unconfirmed = answer(sticker({ tokenId: null, mintTxHash: null }));
    const seal = vi.fn<ApiClient["seal"]>().mockResolvedValue(unconfirmed);
    // Privy is off here, so no smart account is ever set.
    await expect(underMock(emptyApi({ seal })).seal(request)).resolves.toBe(unconfirmed);
    expect(seal).toHaveBeenCalledWith(request);
  });
});
