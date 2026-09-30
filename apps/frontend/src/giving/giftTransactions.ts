import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddress,
  isHex,
  parseEventLogs,
  type Address,
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
/** As long as the smart wallet waits for its own transaction's receipt. */
const RECEIPT_TIMEOUT_MS = 120_000;
/**
 * A transaction sent before a reload is waited for this long after it went to the wallet, as the
 * wallet itself would have waited, before another is sent in its place.
 */
export const LANDING_MS = RECEIPT_TIMEOUT_MS;
/** How often the escrow is read while such a transaction lands. */
export const LANDING_POLL_MS = 4_000;

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

/** What's known of a gift's transaction already sent, so it's never sent twice. */
interface SentTransaction {
  /** When it went to the smart wallet, which answers only once it has landed. */
  sentAt?: number;
  hash?: Hash;
}

/** How a transaction going out is recorded, before and after the wallet takes it. */
export interface TransactionRecorder {
  /** Just before the transaction goes to the wallet: from then on it may land. */
  sending: (at: number) => void;
  submitted: (hash: Hash) => void;
}

export interface GiftTransactions {
  deposit: (
    giftId: string,
    transfer: { to: string; data: string },
    sent: SentTransaction,
    record: TransactionRecorder,
  ) => Promise<Hash | null>;
  /** `neverDeposited`: the escrow never had the sticker, so there was nothing to take out. */
  takeOut: (
    giftId: string,
    sent: SentTransaction,
    record: TransactionRecorder,
    deposit: SentTransaction,
  ) => Promise<"takenOut" | "neverDeposited">;
}

function configuredEscrow(): Address | null {
  const address: unknown = import.meta.env.VITE_STICKER_ESCROW_ADDRESS;
  return typeof address === "string" && isAddress(address) ? address : null;
}

/** Whether gifts go through the sticker escrow here. */
export const escrowConfigured = () => configuredEscrow() !== null;

function escrowAddress() {
  const address = configuredEscrow();
  if (!address) throw new Error("The sticker escrow address is not configured");
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

/**
 * The escrow's status once it moves on from `from`, read for as long as the wallet itself would
 * have waited on a transaction sent at `sentAt`; after that, the status as it stands.
 */
async function landing(giftId: string, from: number, sentAt: number) {
  console.info("Waiting for a gift transaction sent before this page loaded", { giftId, sentAt });
  for (;;) {
    const status = await statusOf(giftId);
    if (status !== null && status !== from) return status;
    const left = sentAt + LANDING_MS - Date.now();
    if (left <= 0) return status;
    await new Promise((resolve) => setTimeout(resolve, Math.min(LANDING_POLL_MS, left)));
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
  deposit: async (giftId, transfer, sent, record) => {
    let status = await statusOf(giftId);
    // Another deposit while one sent before a reload is still landing would reuse its nonce.
    if (status === 0 && !sent.hash && sent.sentAt !== undefined) {
      status = await landing(giftId, 0, sent.sentAt);
    }
    if (status === 1) return sent.hash ?? null;
    if (status !== null && status !== 0) throw new Error("This gift has already left the escrow");
    if (!isAddress(transfer.to) || !isHex(transfer.data)) {
      throw new Error("The sticker escrow transfer is invalid");
    }
    let hash = sent.hash;
    if (!hash) {
      if (status === null) throw new GiftTransactionUnconfirmedError("deposit");
      const wallet = await waitForSmartWallet();
      record.sending(Date.now());
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
      // Kept before the escrow's receipt is read, so a slow read can't cause a second deposit.
      record.submitted(hash);
    }
    const receipt = await confirmedTransfer(giftId, hash, "deposit");
    // Receipt polling can follow a replaced transaction; retain the hash that actually landed.
    if (receipt.transactionHash !== hash) record.submitted(receipt.transactionHash);
    return receipt.transactionHash;
  },
  takeOut: async (giftId, sent, record, deposit) => {
    let status = await statusOf(giftId);
    if (status === 1 && !sent.hash && sent.sentAt !== undefined) {
      status = await landing(giftId, 1, sent.sentAt);
    }
    if (status === 3 || status === 4) return "takenOut";
    if (status === 2) throw new Error("This sticker has already been received");
    if (sent.hash) {
      const receipt = await confirmedTransfer(giftId, sent.hash, "takeOut");
      if (receipt.transactionHash !== sent.hash) record.submitted(receipt.transactionHash);
      return "takenOut";
    }
    if ((status === 0 || status === null) && deposit.hash) {
      // A lagging latest-state read must not erase a deposit whose receipt we already have.
      const depositReceipt = await confirmedTransfer(giftId, deposit.hash, "deposit");
      status = await statusOf(giftId, depositReceipt.blockNumber);
    } else if (status === 0 && deposit.sentAt !== undefined) {
      status = await landing(giftId, 0, deposit.sentAt);
      // It didn't land while the wallet waited on it, so the escrow never had the sticker.
      if (status === 0) return "neverDeposited";
    }
    if (status === 3 || status === 4) return "takenOut";
    if (status === 0 || status === null) throw new GiftTransactionUnconfirmedError("takeOut");
    if (status === 2) throw new Error("This sticker has already been received");
    const wallet = await waitForSmartWallet();
    record.sending(Date.now());
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
      if (result === 3 || result === 4) return "takenOut";
      if (result === 2) throw new Error("This sticker has already been received");
      throw new GiftTransactionUnconfirmedError("takeOut");
    }
    record.submitted(hash);
    console.info("Gift take-out submitted", { giftId, hash });
    const receipt = await confirmedTransfer(giftId, hash, "takeOut");
    if (receipt.transactionHash !== hash) record.submitted(receipt.transactionHash);
    return "takenOut";
  },
};
