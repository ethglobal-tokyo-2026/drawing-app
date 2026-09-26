import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddress,
  isHex,
  parseEventLogs,
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
  takeOut: (
    giftId: string,
    submitted: (hash: Hash) => void,
    previousHash?: Hash,
    depositHash?: Hash,
  ) => Promise<void>;
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

async function statusOf(giftId: string, blockNumber?: bigint) {
  const address = escrowAddress();
  const id = checkedGiftId(giftId);
  try {
    const gift = await publicClient.readContract({
      address,
      abi: stickerGiftEscrowAbi,
      functionName: "gifts",
      args: [id],
      blockNumber,
    });
    console.info("Gift escrow status read", {
      giftId,
      status: gift[5],
      blockNumber: blockNumber?.toString(),
    });
    return gift[5];
  } catch (error) {
    // A known receipt can still prove the transfer when a state read is unavailable.
    console.warn("Gift escrow status could not be read", {
      giftId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
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
  return receipt;
}

async function confirmedTransfer(giftId: string, hash: Hash, action: "deposit" | "takeOut") {
  const receipt = await confirmed(hash, action);
  const events = parseEventLogs({
    abi: stickerGiftEscrowAbi,
    eventName: action === "deposit" ? "GiftStaged" : "GiftTakenOut",
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === escrowAddress().toLowerCase()),
  });
  // An ERC-4337 bundle can succeed while the user's operation fails inside it.
  if (!events.some((event) => event.args.giftId.toLowerCase() === giftId.toLowerCase())) {
    console.warn("Gift transaction receipt has no matching escrow event", { giftId, hash, action });
    throw new GiftTransactionRevertedError();
  }
  console.info("Gift transaction confirmed", {
    giftId,
    hash: receipt.transactionHash,
    submittedHash: hash,
    action,
  });
  return receipt;
}

/** Only the user's Sepolia smart account sends; Privy's paymaster sponsors these transactions. */
export const giftTransactions: GiftTransactions = {
  deposit: async (giftId, transfer, submitted, previousHash) => {
    const status = await statusOf(giftId);
    if (status === 1) return previousHash ?? null;
    if (status !== null && status !== 0) throw new Error("This gift has already left the escrow");
    if (!isAddress(transfer.to) || !isHex(transfer.data)) {
      throw new Error("The sticker escrow transfer is invalid");
    }
    let hash = previousHash;
    if (!hash) {
      if (status === null) throw new GiftTransactionUnconfirmedError("deposit");
      const wallet = await waitForSmartWallet();
      try {
        hash = await wallet.sendTransaction({ to: transfer.to, data: transfer.data });
      } catch (error) {
        console.warn("Gift deposit submission could not be confirmed", {
          giftId,
          errorName: error instanceof Error ? error.name : typeof error,
        });
        if ((await statusOf(giftId)) === 1) return null;
        throw new GiftTransactionUnconfirmedError("deposit");
      }
    }
    // Keep the hash before waiting so a slow receipt cannot cause a second deposit on retry.
    submitted(hash);
    const receipt = await confirmedTransfer(giftId, hash, "deposit");
    // Receipt polling can follow a replaced transaction; retain the hash that actually landed.
    if (receipt.transactionHash !== hash) submitted(receipt.transactionHash);
    return receipt.transactionHash;
  },
  takeOut: async (giftId, submitted, previousHash, depositHash) => {
    let status = await statusOf(giftId);
    if (status === 3 || status === 4) return;
    if (status === 2) throw new Error("This sticker has already been received");
    if (previousHash) {
      const receipt = await confirmedTransfer(giftId, previousHash, "takeOut");
      if (receipt.transactionHash !== previousHash) submitted(receipt.transactionHash);
      return;
    }
    // A lagging latest-state read must not erase a deposit whose receipt we already have.
    if ((status === 0 || status === null) && depositHash) {
      const depositReceipt = await confirmedTransfer(giftId, depositHash, "deposit");
      status = await statusOf(giftId, depositReceipt.blockNumber);
    }
    if (status === 3 || status === 4) return;
    if (status === 0 || status === null) throw new GiftTransactionUnconfirmedError("takeOut");
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
      const result = await statusOf(giftId);
      if (result === 3 || result === 4) return;
      if (result === 2) throw new Error("This sticker has already been received");
      throw new GiftTransactionUnconfirmedError("takeOut");
    }
    submitted(hash);
    console.info("Gift take-out submitted", { giftId, hash });
    const receipt = await confirmedTransfer(giftId, hash, "takeOut");
    if (receipt.transactionHash !== hash) submitted(receipt.transactionHash);
  },
};
