import type { Sticker } from "@drawing-app/api/client";
import { acceptSession, suspendSession } from "./sessionContext";
import { accountSelection, sessionEnvelope } from "./sessionTestFixtures";
import { FRESH_TICKETS, TEST_ME } from "./testing";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { setPrivyStatus } from "../identity/privy";
import { ApiError, type ApiClient } from "./apiClient";
import { withSuiWallet as guardedApi } from "./suiWalletApi";
import { gift, sticker } from "./testFixtures";
import { emptyApi } from "./testing";

// Signing in, as in the app: tests run under LIFF Mock, where Privy is off and nothing waits.
beforeEach(() => {
  acceptSession(sessionEnvelope(TEST_ME));
  setPrivyStatus({ state: "signing-in" });
});
const withSuiWallet = (api: ApiClient) => guardedApi(api, accountSelection(TEST_ME.id));

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
  drawnWidth: 1,
  drawnHeight: 1,
  outline: "M0 0Z",
  png: image,
  mask: image,
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

  it("starts a free pack without waiting, as it pays nothing", async () => {
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

it("does not submit an old signature after the accepted selection version changes", async () => {
  const reportDeposit = vi.fn<ApiClient["reportDeposit"]>();
  const api = withSuiWallet(emptyApi({ reportDeposit }));
  acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "later" }));
  await expect(
    api.reportDeposit("gift", { digest: "digest", signature: "signature" }),
  ).rejects.toMatchObject({ code: "session_account_changed" });
  expect(reportDeposit).not.toHaveBeenCalled();
});

const delayedOperations: { name: string; invoke: (api: ApiClient) => Promise<unknown> }[] = [
  { name: "packageGift", invoke: (api) => api.packageGift("sticker-1", "user-2") },
  {
    name: "reportDeposit",
    invoke: (api) => api.reportDeposit("gift-1", { digest: "digest", signature: "signature" }),
  },
  {
    name: "takeOutGift",
    invoke: (api) => api.takeOutGift("gift-1", { digest: "digest", signature: "signature" }),
  },
  {
    name: "buyTickets",
    invoke: (api) => api.buyTickets({ purchaseId: 1, digest: "digest", signature: "signature" }),
  },
  { name: "seal", invoke: (api) => api.seal(request) },
  {
    name: "receiveGift",
    invoke: (api) => api.receiveGift({ giftClaimToken: "claim", liffContextType: "utou" }),
  },
  { name: "receiveGiftForYou", invoke: (api) => api.receiveGiftForYou("gift-1") },
  {
    name: "startTicketPurchase",
    invoke: (api) => api.startTicketPurchase({ tickets: 3, priceYen: 270 }),
  },
];
it.each(delayedOperations)(
  "discards a delayed $name result after same-version restoration",
  async ({ invoke }) => {
    walletReady();
    let finish!: () => void;
    let started!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pendingResponse = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const respond = async <T>(value: T) => {
      started();
      await pendingResponse;
      return value;
    };
    const sealed = answer(sticker({ objectId: `0x${"ef".repeat(32)}` }));
    const received = { ...sealed, gift: gift() };
    const api = withSuiWallet(
      emptyApi({
        packageGift: () =>
          respond({
            gift: gift(),
            delivery: "line",
            messageAttempt: null,
            forUserId: "user-2",
            giftClaimToken: "claim",
            deposit: {
              digest: "D".repeat(44),
              txBytes: "dHg=",
              expiresAt: "2026-10-13T12:00:00.000Z",
            },
          }),
        reportDeposit: () => respond(gift()),
        takeOutGift: () => respond(gift()),
        buyTickets: () => respond(FRESH_TICKETS),
        seal: () => respond(sealed),
        receiveGift: () => respond(received),
        receiveGiftForYou: () => respond(received),
        startTicketPurchase: () =>
          respond({
            purchase: { id: 1, tickets: 3, priceYen: 270 },
            payment: {
              digest: "D".repeat(44),
              txBytes: "dHg=",
              expiresAt: "2026-10-13T12:00:00.000Z",
            },
          }),
      }),
    );
    const result = invoke(api);
    await requestStarted;
    suspendSession();
    acceptSession(sessionEnvelope(TEST_ME));
    walletReady();
    finish();
    await expect(result).rejects.toMatchObject({ code: "session_account_changed" });
  },
);

for (const state of ["suspended", "changed"] as const) {
  it.each(delayedOperations)(
    `returns a rejected promise from $name when the session is ${state}`,
    async ({ invoke }) => {
      const api = withSuiWallet(emptyApi());
      if (state === "suspended") suspendSession();
      else acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "later" }));
      let result: Promise<unknown> | undefined;
      expect(() => {
        result = invoke(api);
      }).not.toThrow();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).rejects.toMatchObject({ code: "session_account_changed" });
    },
  );
}

it.each([null, { id: `0x${"cd".repeat(32)}`, state: "cancelled" as const }])(
  "retains the known-unsent message snapshot through guarded signed take-out: %j",
  async (unsentMessageAttempt) => {
    const takeOutGift = vi.fn<ApiClient["takeOutGift"]>().mockResolvedValue(gift());
    const api = withSuiWallet(emptyApi({ takeOutGift }));
    const signed = { digest: "digest", signature: "signature" };
    await api.takeOutGift("gift-1", signed, unsentMessageAttempt);
    expect(takeOutGift).toHaveBeenCalledExactlyOnceWith("gift-1", signed, unsentMessageAttempt);
  },
);
