import { afterEach, describe, expect, it, vi } from "vitest";
import { setSmartWallet } from "../identity/smartWallet";
import type { ApiClient } from "./apiClient";
import { withSmartWallet } from "./smartWalletApi";
import { sticker } from "./testFixtures";
import { emptyApi } from "./testing";

afterEach(() => setSmartWallet(null));

const ready = () =>
  setSmartWallet({
    address: `0x${"12".repeat(20)}`,
    sendTransaction: async () => `0x${"ab".repeat(32)}`,
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

  it("keeps Sealing retryable when images are saved but minting failed", async () => {
    ready();
    const seal = vi.fn<ApiClient["seal"]>();
    const unminted = sticker();
    seal.mockResolvedValue({
      sticker: unminted,
      stickerPlacement: {
        stickerId: unminted.id,
        placement: null,
        seenAt: null,
        arrivedAt: unminted.sealedAt,
      },
    });
    const api = withSmartWallet(emptyApi({ seal }));
    const image = new Blob();
    await expect(
      api.seal({
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
      }),
    ).rejects.toThrow("Please try Sealing again");
  });
});
