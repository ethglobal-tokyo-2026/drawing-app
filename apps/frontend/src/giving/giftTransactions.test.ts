import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chain = vi.hoisted(() => ({ readContract: vi.fn(), waitForTransactionReceipt: vi.fn() }));
const wallet = vi.hoisted(() => ({ sendTransaction: vi.fn() }));
vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  createPublicClient: () => chain,
}));
vi.mock("../identity/smartWallet", () => ({ waitForSmartWallet: async () => wallet }));

import { giftTransactions } from "./giftTransactions";

const giftId = `0x${"cd".repeat(32)}` as const;
const hash = `0x${"ab".repeat(32)}` as const;
const address = `0x${"12".repeat(20)}` as const;
const transfer = { to: address, data: "0x1234" };

beforeEach(() => {
  vi.stubEnv("VITE_STICKER_ESCROW_ADDRESS", address);
  chain.readContract.mockReset().mockResolvedValue([address, address, 1n, giftId, 1n, 0]);
  chain.waitForTransactionReceipt.mockReset().mockResolvedValue({ status: "success" });
  wallet.sendTransaction.mockReset().mockResolvedValue(hash);
});
afterEach(() => vi.unstubAllEnvs());

describe("Sepolia smart account Giving transactions", () => {
  it("records the submitted hash before waiting and resumes the same transaction after timeout", async () => {
    chain.waitForTransactionReceipt.mockRejectedValueOnce(new Error("Receipt timeout"));
    const submitted = vi.fn();
    await expect(giftTransactions.deposit(giftId, transfer, submitted)).rejects.toThrow(
      "Receipt timeout",
    );
    expect(submitted).toHaveBeenCalledWith(hash);
    await expect(giftTransactions.deposit(giftId, transfer, submitted, hash)).resolves.toBe(hash);
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.sendTransaction).toHaveBeenCalledWith(transfer);
  });

  it("reconciles a landed deposit without sending again", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 1]);
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn())).resolves.toBeNull();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses a reverted deposit", async () => {
    chain.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn())).rejects.toThrow("reverted");
  });

  it("does not take a Sticker away from someone who has received it", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 2]);
    await expect(giftTransactions.takeOut(giftId)).rejects.toThrow("already been received");
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });
});
