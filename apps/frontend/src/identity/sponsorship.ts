import { type Address, type Hash, type TransactionReceipt } from "viem";
import { sepolia } from "viem/chains";

const RECEIPT_TIMEOUT_MS = 60_000;

interface SmartWalletSender {
  address: Address;
  chainId: number | undefined;
  sendTransaction: (transaction: { to: Address; value: bigint }) => Promise<Hash>;
}

interface ChainReader {
  getBalance: (request: { address: Address }) => Promise<bigint>;
  waitForTransactionReceipt: (request: {
    hash: Hash;
    timeout: number;
  }) => Promise<Pick<TransactionReceipt, "status">>;
}

export interface SponsorshipResult {
  hash: Hash;
  balance: bigint;
}

/** Sends a zero-value transaction and proves that the smart account's ETH paid none of its gas. */
export async function checkSponsorship(
  smartWallet: SmartWalletSender,
  chain: ChainReader,
): Promise<SponsorshipResult> {
  if (smartWallet.chainId !== sepolia.id) {
    throw new Error("The smart account is not on Ethereum Sepolia");
  }
  const before = await chain.getBalance({ address: smartWallet.address });
  const hash = await smartWallet.sendTransaction({ to: smartWallet.address, value: 0n });
  const receipt = await chain.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
  if (receipt.status !== "success") throw new Error("The sponsored transaction reverted");
  const after = await chain.getBalance({ address: smartWallet.address });
  if (after !== before) {
    throw new Error("The smart account’s ETH balance changed during the gas check");
  }
  return { hash, balance: after };
}
