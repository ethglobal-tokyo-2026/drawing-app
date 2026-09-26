import type { Hash } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { emptyApi } from "../api/testing";
import { gift } from "../api/testFixtures";
import { createApiGiftBackend, GiftPackagingError } from "./giftBackend";
import {
  GiftTransactionRevertedError,
  GiftTransactionUnconfirmedError,
  type GiftTransactions,
} from "./giftTransactions";

const hash: Hash = `0x${"ab".repeat(32)}`;
const takeOutHash: Hash = `0x${"ef".repeat(32)}`;
const token = `0x${"cd".repeat(32)}`;
const transfer = { to: `0x${"12".repeat(20)}`, data: "0x1234" };

function setup() {
  const packed = gift({ status: "packed", escrowStatus: "missing" });
  const packageGift = vi
    .fn()
    .mockResolvedValueOnce({ gift: packed, giftClaimToken: token, escrowTransfer: transfer })
    .mockResolvedValue({ gift: packed, giftClaimToken: null, escrowTransfer: transfer });
  const reportDeposit = vi.fn(async () => packed);
  const takeOutGift = vi.fn(async () => ({ ...packed, status: "taken_out" as const }));
  const transactions: GiftTransactions = {
    deposit: vi.fn<GiftTransactions["deposit"]>(async (_id, _transfer, submitted) => {
      submitted(hash);
      return hash;
    }),
    takeOut: vi.fn<GiftTransactions["takeOut"]>(async (_id, submitted) => {
      submitted(takeOutHash);
    }),
  };
  const api = emptyApi({ packageGift, reportDeposit, takeOutGift });
  const backend = createApiGiftBackend({
    api,
    transactions,
    fromHandle: "alice",
    liffId: "123-abc",
  });
  const sticker = { id: packed.stickerId, no: 147, timeUsed: 12 };
  return { packed, backend, sticker, transactions, reportDeposit, takeOutGift, packageGift, api };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Giving through the smart account", () => {
  it("confirms the escrow deposit before returning a Gift Message", async () => {
    const t = setup();
    const packed = await t.backend.pack(t.sticker);
    expect(t.transactions.deposit).toHaveBeenCalledWith(
      t.packed.id,
      transfer,
      expect.any(Function),
      undefined,
    );
    expect(t.reportDeposit).toHaveBeenCalledWith(t.packed.id, hash);
    expect(packed.giftId).toBe(t.packed.id);
    await t.backend.takeOut(packed.giftId);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      packed.giftId,
      expect.any(Function),
      undefined,
      hash,
    );
    expect(t.takeOutGift).toHaveBeenCalledWith(packed.giftId);
  });

  it("retains the claim token and submitted hash when deposit reporting fails", async () => {
    const t = setup();
    t.reportDeposit.mockRejectedValueOnce(new Error("Server unavailable"));
    await expect(t.backend.pack(t.sticker)).rejects.toThrow("Server unavailable");
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      t.packed.id,
      transfer,
      expect.any(Function),
      hash,
    );
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("keeps the allocated gift identifiable for Taking out after deposit reporting fails", async () => {
    const t = setup();
    const failure = new ApiError(502, { error: "internal_error", detail: "Server unavailable" });
    t.reportDeposit.mockRejectedValueOnce(failure);
    await expect(t.backend.pack(t.sticker)).rejects.toMatchObject({
      giftId: t.packed.id,
      cause: failure,
    });
    await t.backend.takeOut(t.packed.id);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      t.packed.id,
      expect.any(Function),
      undefined,
      hash,
    );
    expect(t.packageGift).toHaveBeenCalledTimes(1);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
  });

  it("clears a failed deposit hash so a retry can submit a new transaction", async () => {
    const t = setup();
    vi.mocked(t.transactions.deposit).mockImplementationOnce(async (_id, _transfer, submitted) => {
      submitted(hash);
      throw new GiftTransactionRevertedError();
    });
    await expect(t.backend.pack(t.sticker)).rejects.toThrow("reverted");
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      t.packed.id,
      transfer,
      expect.any(Function),
      undefined,
    );
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("reuses the gift and token after closing and reopening Giving on the same page", async () => {
    const t = setup();
    const firstGift = await t.backend.pack(t.sticker);
    t.packageGift.mockResolvedValue({ gift: t.packed, giftClaimToken: null, escrowTransfer: null });
    const reopened = createApiGiftBackend({
      api: t.api,
      transactions: t.transactions,
      fromHandle: "alice",
      liffId: "123-abc",
    });
    await expect(reopened.pack(t.sticker)).resolves.toEqual(firstGift);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("does not record a taken-out Sticker when the chain fails", async () => {
    const t = setup();
    await t.backend.pack(t.sticker);
    vi.mocked(t.transactions.takeOut).mockRejectedValueOnce(new Error("Paymaster refused"));
    await expect(t.backend.takeOut(t.packed.id)).rejects.toThrow("Paymaster refused");
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("settles and takes out a previous deposit before replacing a lost Gift Claim Token", async () => {
    const t = setup();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    t.packageGift
      .mockReset()
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        escrowTransfer: transfer,
      });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: replacement.id });
    expect(t.transactions.deposit).toHaveBeenCalledTimes(2);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      t.packed.id,
      expect.any(Function),
      undefined,
      hash,
    );
    expect(t.takeOutGift).toHaveBeenCalledWith(t.packed.id);
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      replacement.id,
      transfer,
      expect.any(Function),
      undefined,
    );
  });

  it("shares an in-progress pack across Giving instances instead of replacing its token", async () => {
    const t = setup();
    const second = createApiGiftBackend({
      api: t.api,
      transactions: t.transactions,
      fromHandle: "alice",
      liffId: "123-abc",
    });
    const [firstGift, secondGift] = await Promise.all([
      t.backend.pack(t.sticker),
      second.pack(t.sticker),
    ]);
    expect(firstGift).toEqual(secondGift);
    expect(t.packageGift).toHaveBeenCalledTimes(1);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("resumes an uncertain take-out without depositing again during token recovery", async () => {
    const t = setup();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    t.packageGift
      .mockReset()
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        escrowTransfer: transfer,
      });
    vi.mocked(t.transactions.takeOut).mockImplementationOnce(async (_id, submitted) => {
      submitted(takeOutHash);
      throw new GiftTransactionUnconfirmedError("takeOut");
    });
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
    expect(t.takeOutGift).not.toHaveBeenCalled();
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: replacement.id });
    expect(t.transactions.takeOut).toHaveBeenLastCalledWith(
      t.packed.id,
      expect.any(Function),
      takeOutHash,
      hash,
    );
    expect(t.transactions.deposit).toHaveBeenCalledTimes(2);
    expect(t.takeOutGift).toHaveBeenCalledTimes(1);
  });

  it("retries API confirmation without requesting another take-out approval", async () => {
    vi.useFakeTimers();
    const t = setup();
    await t.backend.pack(t.sticker);
    t.takeOutGift.mockRejectedValueOnce(
      new ApiError(409, { error: "take_out_not_landed", detail: "Still pending" }),
    );
    const first = t.backend.takeOut(t.packed.id);
    const second = t.backend.takeOut(t.packed.id);
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);
    expect(t.transactions.takeOut).toHaveBeenCalledTimes(1);
    expect(t.takeOutGift).toHaveBeenCalledTimes(2);
  });
});
