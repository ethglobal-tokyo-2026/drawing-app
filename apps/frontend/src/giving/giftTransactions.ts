import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";
import { createPublicClient, encodeFunctionData, http, isAddress, isHex, type Hash } from "viem";
import { sepolia } from "viem/chains";
import { waitForSmartWallet } from "../identity/smartWallet";

const rpcUrl: unknown = import.meta.env.VITE_STICKER_RPC_URL;
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(typeof rpcUrl === "string" && rpcUrl ? rpcUrl : undefined),
});
const RECEIPT_TIMEOUT_MS = 120_000;

export class GiftTransactionRevertedError extends Error {
  constructor() {
    super("The sticker transaction reverted");
  }
}

export interface GiftTransactions {
  deposit: (
    giftId: string,
    transfer: { to: string; data: string },
    submitted: (hash: Hash) => void,
    previousHash?: Hash,
  ) => Promise<Hash | null>;
  takeOut: (giftId: string, depositHash?: Hash) => Promise<void>;
}

function escrowAddress() {
  const address: unknown = import.meta.env.VITE_STICKER_ESCROW_ADDRESS;
  if (typeof address !== "string" || !isAddress(address)) {
    throw new Error("The sticker escrow address is not configured");
  }
  return address;
}

function checkedGiftId(giftId: string) {
  if (!isHex(giftId) || giftId.length !== 66) throw new Error("The gift ID is invalid");
  return giftId;
}

async function statusOf(giftId: string) {
  const gift = await publicClient.readContract({
    address: escrowAddress(),
    abi: stickerGiftEscrowAbi,
    functionName: "gifts",
    args: [checkedGiftId(giftId)],
  });
  return gift[5];
}

async function confirmed(hash: Hash) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: RECEIPT_TIMEOUT_MS,
  });
  if (receipt.status !== "success") throw new GiftTransactionRevertedError();
}

/** Only the user's Sepolia smart account sends; Privy's paymaster sponsors these transactions. */
export const giftTransactions: GiftTransactions = {
  deposit: async (giftId, transfer, submitted, previousHash) => {
    const status = await statusOf(giftId);
    if (status === 1) return previousHash ?? null;
    if (status !== 0) throw new Error("This gift has already left the escrow");
    if (!isAddress(transfer.to) || !isHex(transfer.data)) {
      throw new Error("The sticker escrow transfer is invalid");
    }
    const wallet = await waitForSmartWallet();
    const hash =
      previousHash ?? (await wallet.sendTransaction({ to: transfer.to, data: transfer.data }));
    // Keep the hash before waiting so a slow receipt cannot cause a second deposit on retry.
    submitted(hash);
    await confirmed(hash);
    return hash;
  },
  takeOut: async (giftId, depositHash) => {
    if (depositHash) await confirmed(depositHash);
    const status = await statusOf(giftId);
    if (status === 0 || status === 3 || status === 4) return;
    if (status === 2) throw new Error("This sticker has already been received");
    const wallet = await waitForSmartWallet();
    const hash = await wallet.sendTransaction({
      to: escrowAddress(),
      data: encodeFunctionData({
        abi: stickerGiftEscrowAbi,
        functionName: "takeOut",
        args: [checkedGiftId(giftId)],
      }),
    });
    await confirmed(hash);
  },
};
