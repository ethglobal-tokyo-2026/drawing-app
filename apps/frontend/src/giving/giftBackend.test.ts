import type { Hash } from "viem";
import { describe, expect, it, vi } from "vitest";
import { emptyApi } from "../api/testing";
import { gift } from "../api/testFixtures";
import { createApiGiftBackend } from "./giftBackend";
import type { GiftTransactions } from "./giftTransactions";

const hash: Hash = `0x${"ab".repeat(32)}`;
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
    takeOut: vi.fn(async () => {}),
  };
  const api = emptyApi({ packageGift, reportDeposit, takeOutGift });
  const backend = createApiGiftBackend({
    api,
    transactions,
    fromHandle: "alice",
    liffId: "123-abc",
  });
  const sticker = { id: packed.stickerId, no: 147, timeUsed: 12 };
  return { packed, backend, sticker, transactions, reportDeposit, takeOutGift, packageGift };
}

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
    expect(t.transactions.takeOut).toHaveBeenCalledWith(packed.giftId, hash);
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
    expect(t.transactions.takeOut).toHaveBeenCalledWith(t.packed.id, hash);
    expect(t.takeOutGift).toHaveBeenCalledWith(t.packed.id);
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      replacement.id,
      transfer,
      expect.any(Function),
      undefined,
    );
  });
});
