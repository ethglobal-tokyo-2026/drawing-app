import type { Sticker } from "@drawing-app/api/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { setPrivyStatus } from "../identity/privy";
import { ApiError, type ApiClient } from "./apiClient";
import { withSuiWallet } from "./suiWalletApi";
import { sticker } from "./testFixtures";
import { emptyApi } from "./testing";

// Signing in, as in the app: tests run under LIFF Mock, where Privy is off and nothing waits.
beforeEach(() => setPrivyStatus({ state: "signing-in" }));

/** Privy has signed in and made the person's Sui wallet. */
const walletReady = () =>
  setPrivyStatus({ state: "signed-in", userId: "did:privy:1", suiWallet: `0x${"34".repeat(32)}` });

const refused = new Error("gift expired");

/** Makes `call` before Privy has the wallet, and checks the server hears it only once it's there. */
async function heldUntilTheWallet(server: Mock, call: Promise<unknown>) {
  const result = expect(call).rejects.toBe(refused);
  expect(server).not.toHaveBeenCalled();
  walletReady();
  await result;
}

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
  nsfw: false,
};

/** The server's answer to a seal that made `sealed`. */
const answer = (sealed: Sticker) => ({
  sticker: sealed,
  stickerPlacement: {
    stickerId: sealed.id,
    placement: null,
    largePlacement: null,
    seenAt: null,
    arrivedAt: sealed.sealedAt,
  },
});

describe("REST actions that need the person's Sui wallet", () => {
  it("waits for it before packaging a gift", async () => {
    const packageGift = vi.fn<ApiClient["packageGift"]>().mockRejectedValue(refused);
    const api = withSuiWallet(emptyApi({ packageGift }));
    await heldUntilTheWallet(packageGift, api.packageGift("sticker-1", "user-2"));
    expect(packageGift).toHaveBeenCalledExactlyOnceWith("sticker-1", "user-2");
  });

  it("waits for it before receiving a gift by its link", async () => {
    const receiveGift = vi.fn<ApiClient["receiveGift"]>().mockRejectedValue(refused);
    const api = withSuiWallet(emptyApi({ receiveGift }));
    const opening = { giftClaimToken: `0x${"cd".repeat(32)}`, liffContextType: "utou" as const };
    await heldUntilTheWallet(receiveGift, api.receiveGift(opening));
    expect(receiveGift).toHaveBeenCalledExactlyOnceWith(opening);
  });

  it("waits for it before receiving a gift from the board", async () => {
    const receiveGiftForYou = vi.fn<ApiClient["receiveGiftForYou"]>().mockRejectedValue(refused);
    const api = withSuiWallet(emptyApi({ receiveGiftForYou }));
    await heldUntilTheWallet(receiveGiftForYou, api.receiveGiftForYou("gift-1"));
    expect(receiveGiftForYou).toHaveBeenCalledExactlyOnceWith("gift-1");
  });

  it("waits for it before starting a ticket purchase", async () => {
    const startTicketPurchase = vi
      .fn<ApiClient["startTicketPurchase"]>()
      .mockRejectedValue(refused);
    const api = withSuiWallet(emptyApi({ startTicketPurchase }));
    const pack = { tickets: 3, priceYen: 270 };
    await heldUntilTheWallet(startTicketPurchase, api.startTicketPurchase(pack));
    expect(startTicketPurchase).toHaveBeenCalledExactlyOnceWith(pack);
  });

  it("starts the free first pack without waiting, as it pays nothing", async () => {
    const startTicketPurchase = vi
      .fn<ApiClient["startTicketPurchase"]>()
      .mockRejectedValue(refused);
    const api = withSuiWallet(emptyApi({ startTicketPurchase }));
    const free = { tickets: 3, priceYen: 0 };
    await expect(api.startTicketPurchase(free)).rejects.toBe(refused);
    expect(startTicketPurchase).toHaveBeenCalledExactlyOnceWith(free);
  });

  it("waits for it before Sealing, then takes a confirmed seal", async () => {
    const confirmed = answer(sticker({ objectId: `0x${"ef".repeat(32)}` }));
    const seal = vi.fn<ApiClient["seal"]>().mockResolvedValue(confirmed);
    const api = withSuiWallet(emptyApi({ seal }));
    const result = expect(api.seal(request)).resolves.toBe(confirmed);
    expect(seal).not.toHaveBeenCalled();
    walletReady();
    await result;
  });

  it("keeps Sealing retryable without its Sui object", async () => {
    walletReady();
    const seal = vi.fn<ApiClient["seal"]>().mockResolvedValue(answer(sticker({ objectId: null })));
    const api = withSuiWallet(emptyApi({ seal }));
    const failed = await api.seal(request).catch((error: unknown) => error);
    if (!(failed instanceof ApiError))
      throw new Error("Sealing unconfirmed didn't fail as an ApiError");
    expect(failed.code).toBe("mint_failed");
    // The seal key's chip shows the detail too.
    expect(failed.detail).not.toMatch(/NFT|crypto|token|wallet|mint|burn/i);
  });
});
