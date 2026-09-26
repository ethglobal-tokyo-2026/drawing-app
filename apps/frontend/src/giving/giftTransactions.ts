import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddress,
  isHex,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { sepolia } from "viem/chains";
import { waitForSmartWallet } from "../identity/smartWallet";
import { i18next } from "../i18n/i18n";

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

export class GiftTransactionUnconfirmedError extends Error {
  constructor(action: "deposit" | "takeOut") {
    super(
      action === "deposit"
        ? i18next.t(($) => $.giving.depositUnconfirmed)
        : i18next.t(($) => $.giving.takeOutUnconfirmed),
    );
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

async function confirmed(hash: Hash, action: "deposit" | "takeOut") {
  let receipt: TransactionReceipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
  } catch (error) {
    console.warn("Gift transaction receipt could not be read", {
      hash,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    throw new GiftTransactionUnconfirmedError(action);
  }
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
    let hash = previousHash;
    if (!hash) {
      try {
        hash = await wallet.sendTransaction({ to: transfer.to, data: transfer.data });
      } catch (error) {
        console.warn("Gift deposit submission could not be confirmed", {
          giftId,
          errorName: error instanceof Error ? error.name : typeof error,
        });
        try {
          if ((await statusOf(giftId)) === 1) return null;
        } catch (lookupError) {
          console.warn("Gift escrow status could not be read", {
            giftId,
            errorName: lookupError instanceof Error ? lookupError.name : typeof lookupError,
          });
        }
        throw new GiftTransactionUnconfirmedError("deposit");
      }
    }
    // Keep the hash before waiting so a slow receipt cannot cause a second deposit on retry.
    submitted(hash);
    await confirmed(hash, "deposit");
    return hash;
  },
  takeOut: async (giftId, depositHash) => {
    if (depositHash) await confirmed(depositHash, "takeOut");
    const status = await statusOf(giftId);
    if (status === 0 || status === 3 || status === 4) return;
    if (status === 2) throw new Error("This sticker has already been received");
    const wallet = await waitForSmartWallet();
    let hash: Hash;
    try {
      hash = await wallet.sendTransaction({
        to: escrowAddress(),
        data: encodeFunctionData({
          abi: stickerGiftEscrowAbi,
          functionName: "takeOut",
          args: [checkedGiftId(giftId)],
        }),
      });
    } catch (error) {
      console.warn("Gift take-out submission could not be confirmed", {
        giftId,
        errorName: error instanceof Error ? error.name : typeof error,
      });
      let result: number | null = null;
      try {
        result = await statusOf(giftId);
      } catch (lookupError) {
        console.warn("Gift escrow status could not be read after taking out", {
          giftId,
          errorName: lookupError instanceof Error ? lookupError.name : typeof lookupError,
        });
      }
      if (result === 0 || result === 3 || result === 4) return;
      if (result === 2) throw new Error("This sticker has already been received");
      throw new GiftTransactionUnconfirmedError("takeOut");
    }
    await confirmed(hash, "takeOut");
  },
};
