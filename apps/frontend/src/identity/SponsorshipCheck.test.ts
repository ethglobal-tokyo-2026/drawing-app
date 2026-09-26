import { describe, expect, it, vi } from "vitest";
import { sepolia } from "viem/chains";
import { checkSponsorship } from "./sponsorship";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;
const HASH = `0x${"22".repeat(32)}` as const;

function participants({
  after = 0n,
  status = "success" as const,
  chainId = sepolia.id as number,
} = {}) {
  const sendTransaction = vi.fn(async () => HASH);
  const getBalance = vi.fn().mockResolvedValueOnce(0n).mockResolvedValueOnce(after);
  const waitForTransactionReceipt = vi.fn(async () => ({ status }));
  return {
    smartWallet: {
      address: ADDRESS,
      chainId,
      sendTransaction,
    },
    chain: { getBalance, waitForTransactionReceipt },
    sendTransaction,
    getBalance,
    waitForTransactionReceipt,
  };
}

describe("gas sponsorship check", () => {
  it("passes after a confirmed zero-value transaction leaves the smart account balance unchanged", async () => {
    const test = participants();

    await expect(checkSponsorship(test.smartWallet, test.chain)).resolves.toEqual({
      hash: HASH,
      balance: 0n,
    });
    expect(test.sendTransaction).toHaveBeenCalledWith({ to: ADDRESS, value: 0n });
    expect(test.getBalance).toHaveBeenCalledTimes(2);
    expect(test.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: HASH,
      timeout: 60_000,
    });
  });

  it("refuses the wrong chain before sending", async () => {
    const test = participants({ chainId: 1 });

    await expect(checkSponsorship(test.smartWallet, test.chain)).rejects.toThrow(
      "not on Ethereum Sepolia",
    );
    expect(test.sendTransaction).not.toHaveBeenCalled();
  });

  it("fails when the smart account spends ETH", async () => {
    const test = participants({ after: 1n });

    await expect(checkSponsorship(test.smartWallet, test.chain)).rejects.toThrow(
      "ETH balance changed",
    );
  });
});
