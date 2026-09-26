import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";

const chain = vi.hoisted(() => ({ readContract: vi.fn(), waitForTransactionReceipt: vi.fn() }));
const wallet = vi.hoisted(() => ({ sendTransaction: vi.fn() }));
const walletReady = vi.hoisted(() => vi.fn());
vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  createPublicClient: () => chain,
}));
vi.mock("../identity/smartWallet", () => ({ waitForSmartWallet: walletReady }));

import { giftTransactions, GiftTransactionUnconfirmedError } from "./giftTransactions";

const giftId = `0x${"cd".repeat(32)}` as const;
const hash = `0x${"ab".repeat(32)}` as const;
const replacementHash = `0x${"ef".repeat(32)}` as const;
const address = `0x${"12".repeat(20)}` as const;
const transfer = { to: address, data: "0x1234" };

function giftReceipt(eventName: "GiftTakenOut" | "GiftStaged", id = giftId, contract = address) {
  return {
    status: "success",
    transactionHash: hash,
    blockNumber: 123n,
    logs: [
      {
        address: contract,
        data:
          eventName === "GiftStaged"
            ? encodeAbiParameters([{ type: "bytes32" }, { type: "uint64" }], [giftId, 123n])
            : "0x",
        topics: encodeEventTopics({
          abi: stickerGiftEscrowAbi,
          eventName,
          args: { giftId: id, tokenId: 1n, sender: address },
        }),
      },
    ],
  };
}

beforeEach(() => {
  vi.stubEnv("VITE_STICKER_ESCROW_ADDRESS", address);
  chain.readContract.mockReset().mockResolvedValue([address, address, 1n, giftId, 1n, 0]);
  chain.waitForTransactionReceipt.mockReset().mockResolvedValue(giftReceipt("GiftStaged"));
  wallet.sendTransaction.mockReset().mockResolvedValue(hash);
  walletReady.mockReset().mockResolvedValue(wallet);
});
afterEach(() => vi.unstubAllEnvs());

describe("Sepolia smart account Giving transactions", () => {
  it("records the submitted hash before waiting and resumes the same transaction after timeout", async () => {
    chain.waitForTransactionReceipt.mockRejectedValueOnce(new Error("Receipt timeout"));
    const submitted = vi.fn();
    await expect(giftTransactions.deposit(giftId, transfer, submitted)).rejects.toThrow(
      "could not be confirmed",
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

  it("remembers a replacement deposit's hash for backend confirmation and later recovery", async () => {
    chain.waitForTransactionReceipt.mockResolvedValue({
      ...giftReceipt("GiftStaged"),
      transactionHash: replacementHash,
    });
    const submitted = vi.fn();
    await expect(giftTransactions.deposit(giftId, transfer, submitted)).resolves.toBe(
      replacementHash,
    );
    expect(submitted).toHaveBeenNthCalledWith(1, hash);
    expect(submitted).toHaveBeenLastCalledWith(replacementHash);
  });

  it("confirms a known deposit without Privy readiness or a working latest-state read", async () => {
    chain.readContract.mockRejectedValue(new Error("RPC api key secret-value"));
    walletReady.mockRejectedValue(new Error("Wallet not ready"));
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn(), hash)).resolves.toBe(hash);
    expect(walletReady).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("does not submit anything when current state cannot be read and no receipt is known", async () => {
    chain.readContract.mockRejectedValue(new Error("RPC api key secret-value"));
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn())).rejects.toBeInstanceOf(
      GiftTransactionUnconfirmedError,
    );
    await expect(giftTransactions.takeOut(giftId, vi.fn())).rejects.toBeInstanceOf(
      GiftTransactionUnconfirmedError,
    );
    expect(walletReady).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("checks escrow after Privy times out before treating a deposit as failed", async () => {
    const providerError = new Error("request timed out with api key secret-value");
    wallet.sendTransaction.mockRejectedValue(providerError);
    chain.readContract
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 0])
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 1]);
    const submitted = vi.fn();

    await expect(giftTransactions.deposit(giftId, transfer, submitted)).resolves.toBeNull();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(submitted).not.toHaveBeenCalled();
  });

  it("keeps an uncertain Privy failure safe for the Giving screen", async () => {
    wallet.sendTransaction.mockRejectedValue(new Error("api key secret-value"));
    const submitted = vi.fn();
    const failure: unknown = await giftTransactions.deposit(giftId, transfer, submitted).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(GiftTransactionUnconfirmedError);
    expect(String(failure)).toContain("could not be confirmed");
    expect(String(failure)).not.toContain("secret-value");
    expect(submitted).not.toHaveBeenCalled();
  });

  it("refuses a reverted deposit", async () => {
    chain.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn())).rejects.toThrow("reverted");
  });

  it("does not take a Sticker away from someone who has received it", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 2]);
    await expect(giftTransactions.takeOut(giftId, vi.fn())).rejects.toThrow(
      "already been received",
    );
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("recognizes a take-out that landed after Privy timed out", async () => {
    chain.readContract
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 1])
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 3]);
    wallet.sendTransaction.mockRejectedValue(new Error("api key secret-value"));

    await expect(giftTransactions.takeOut(giftId, vi.fn())).resolves.toBeUndefined();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not treat a missing gift as a completed take-out", async () => {
    await expect(giftTransactions.takeOut(giftId, vi.fn())).rejects.toBeInstanceOf(
      GiftTransactionUnconfirmedError,
    );
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("reads the confirmed deposit block when latest state still says missing", async () => {
    chain.waitForTransactionReceipt
      .mockResolvedValue(giftReceipt("GiftTakenOut"))
      .mockResolvedValueOnce(giftReceipt("GiftStaged"));
    chain.readContract
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 0])
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 1]);
    const submitted = vi.fn();
    await expect(
      giftTransactions.takeOut(giftId, submitted, undefined, hash),
    ).resolves.toBeUndefined();
    expect(chain.readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ blockNumber: 123n }),
    );
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveBeenCalledWith(hash);
  });

  it("does not treat missing status after a submission failure as taken out", async () => {
    chain.readContract
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 1])
      .mockResolvedValueOnce([address, address, 1n, giftId, 1n, 0]);
    wallet.sendTransaction.mockRejectedValue(new Error("Timed out"));
    await expect(giftTransactions.takeOut(giftId, vi.fn())).rejects.toBeInstanceOf(
      GiftTransactionUnconfirmedError,
    );
  });

  it("retains a submitted take-out and checks its receipt without sending again", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 1]);
    chain.waitForTransactionReceipt
      .mockResolvedValue(giftReceipt("GiftTakenOut"))
      .mockRejectedValueOnce(new Error("Receipt timeout"));
    const submitted = vi.fn();
    await expect(giftTransactions.takeOut(giftId, submitted)).rejects.toBeInstanceOf(
      GiftTransactionUnconfirmedError,
    );
    expect(submitted).toHaveBeenCalledWith(hash);
    await expect(giftTransactions.takeOut(giftId, submitted, hash)).resolves.toBeUndefined();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("recognizes an already completed take-out even if remembered receipts are unavailable", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 3]);
    chain.waitForTransactionReceipt.mockRejectedValue(new Error("Old transaction replaced"));
    await expect(giftTransactions.takeOut(giftId, vi.fn(), hash, hash)).resolves.toBeUndefined();
    expect(chain.waitForTransactionReceipt).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("takes out a pending gift without waiting for an obsolete deposit hash", async () => {
    chain.readContract.mockResolvedValue([address, address, 1n, giftId, 1n, 1]);
    wallet.sendTransaction.mockResolvedValue(replacementHash);
    chain.waitForTransactionReceipt.mockImplementation(async ({ hash: requestedHash }) => {
      if (requestedHash === hash) throw new Error("Old transaction replaced");
      return { ...giftReceipt("GiftTakenOut"), transactionHash: replacementHash };
    });
    await expect(
      giftTransactions.takeOut(giftId, vi.fn(), undefined, hash),
    ).resolves.toBeUndefined();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("remembers a replacement take-out without submitting again when state reads fail", async () => {
    chain.readContract.mockRejectedValue(new Error("RPC unavailable"));
    chain.waitForTransactionReceipt.mockResolvedValue({
      ...giftReceipt("GiftTakenOut"),
      transactionHash: replacementHash,
    });
    const submitted = vi.fn();
    await expect(giftTransactions.takeOut(giftId, submitted, hash)).resolves.toBeUndefined();
    expect(submitted).toHaveBeenCalledWith(replacementHash);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("requires the correct gift's event from the escrow, not just a successful bundle", async () => {
    for (const receipt of [
      { status: "success", logs: [] },
      giftReceipt("GiftTakenOut", `0x${"ef".repeat(32)}`),
      giftReceipt("GiftTakenOut", giftId, `0x${"34".repeat(20)}`),
    ]) {
      chain.waitForTransactionReceipt.mockResolvedValue(receipt);
      await expect(giftTransactions.takeOut(giftId, vi.fn(), hash)).rejects.toThrow("reverted");
    }
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("does not confirm a deposit from a successful bundle without this gift's deposit event", async () => {
    chain.waitForTransactionReceipt.mockResolvedValue({ status: "success", logs: [] });
    await expect(giftTransactions.deposit(giftId, transfer, vi.fn(), hash)).rejects.toThrow(
      "reverted",
    );
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });
});
