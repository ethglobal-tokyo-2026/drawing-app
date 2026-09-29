import {
  isAddress,
  erc721Abi,
  keccak256,
  parseEventLogs,
  stringToBytes,
  zeroAddress,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { bytes32 } from "@drawing-app/sticker-chain/bytes32";
import { stickerNftAbi } from "@drawing-app/sticker-chain/contracts";

/**
 * How long Sealing waits for its mint to land. Under the app's wait for Sealing, so Sealing answers
 * with its own error, and the retry it offers finds a late mint on chain.
 */
export const SEAL_RECEIPT_TIMEOUT_MS = 30_000;

interface SealProgressFields {
  txHash?: Hex;
  tokenId?: string;
  blockNumber?: string;
  address?: Address;
  status?: string;
  recovered?: boolean;
}

interface SealProgress extends SealProgressFields {
  stage:
    | "wallet_lookup"
    | "chain_lookup"
    | "simulate"
    | "submit"
    | "receipt"
    | "transaction"
    | "reconcile"
    | "verify";
  phase: "started" | "completed" | "failed";
  elapsedMs?: number;
  error?: unknown;
}

interface StickerSealerOptions {
  publicClient: Pick<
    PublicClient,
    "readContract" | "simulateContract" | "waitForTransactionReceipt"
  >;
  walletClient: Pick<WalletClient, "writeContract">;
  contractAddress: Address;
  sealerAccount: Account;
  /** The artist's Ethereum Sepolia smart wallet, which receives the NFT; null while they have none. */
  findArtistSmartWallet: (artistId: string) => Promise<Address | null>;
  /** The host records diagnostics without the library choosing a logger or exposing request data. */
  onProgress?: (progress: SealProgress) => void;
}

export function createStickerSealer({
  publicClient,
  walletClient,
  contractAddress,
  sealerAccount,
  findArtistSmartWallet,
  onProgress,
}: StickerSealerOptions) {
  if (!isAddress(contractAddress)) throw new Error("Invalid sticker contract address");

  async function step<T>(
    stage: SealProgress["stage"],
    action: () => Promise<T>,
    fields: SealProgressFields = {},
    resultFields: (result: T) => SealProgressFields = () => ({}),
  ): Promise<T> {
    const started = performance.now();
    onProgress?.({ ...fields, stage, phase: "started" });
    try {
      const result = await action();
      onProgress?.({
        ...fields,
        ...resultFields(result),
        stage,
        phase: "completed",
        elapsedMs: Math.round(performance.now() - started),
      });
      return result;
    } catch (error) {
      onProgress?.({
        ...fields,
        stage,
        phase: "failed",
        elapsedMs: Math.round(performance.now() - started),
        error,
      });
      throw error;
    }
  }

  async function findOnChainSticker(
    stickerKey: Hex,
    sealed: { contentHash: Hex; metadataUri: string },
    artistWallet: Address,
  ) {
    const tokenId = await publicClient.readContract({
      address: contractAddress,
      abi: stickerNftAbi,
      functionName: "tokenIdForSticker",
      args: [stickerKey],
    });
    if (tokenId === 0n) return null;
    const [artist, contentHash, metadataUri] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: stickerNftAbi,
        functionName: "artistOf",
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: stickerNftAbi,
        functionName: "contentHashOf",
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: stickerNftAbi,
        functionName: "tokenURI",
        args: [tokenId],
      }),
    ]);
    if (
      artist.toLowerCase() !== artistWallet.toLowerCase() ||
      contentHash.toLowerCase() !== sealed.contentHash.toLowerCase() ||
      metadataUri !== sealed.metadataUri
    ) {
      throw new Error("On-chain sticker conflicts with sealed sticker data");
    }
    return { tokenId, alreadySealed: true as const };
  }

  return async function sealStickerForArtist({
    stickerId,
    artistId,
    contentHash,
    metadataUri,
  }: {
    stickerId: string;
    artistId: string;
    contentHash: string;
    metadataUri: string;
  }) {
    if (!stickerId || !artistId) throw new Error("Artist and sticker are required");
    if (!metadataUri) throw new Error("Sealed sticker needs a metadata URI");
    const sealed = { contentHash: bytes32(contentHash, "Sticker content hash"), metadataUri };
    const artistWallet = await step(
      "wallet_lookup",
      () => findArtistSmartWallet(artistId),
      {},
      (wallet) => ({ address: wallet ?? undefined, status: wallet ? "found" : "missing" }),
    );
    if (!artistWallet) throw new Error("Artist Ethereum Sepolia smart wallet is unavailable");

    const stickerKey = keccak256(stringToBytes(stickerId));
    const existing = await step(
      "chain_lookup",
      () => findOnChainSticker(stickerKey, sealed, artistWallet),
      {},
      (found) => ({ tokenId: found?.tokenId.toString(), recovered: found !== null }),
    );
    if (existing) return existing;

    let transactionHash: Hex | undefined;
    let receipt: TransactionReceipt;
    try {
      const { request } = await step("simulate", () =>
        publicClient.simulateContract({
          address: contractAddress,
          abi: stickerNftAbi,
          functionName: "sealSticker",
          args: [artistWallet, stickerKey, sealed.contentHash, metadataUri],
          account: sealerAccount,
        }),
      );
      transactionHash = await step(
        "submit",
        () => walletClient.writeContract(request),
        {},
        (txHash) => ({ txHash }),
      );
      const hash = transactionHash;
      receipt = await step(
        "receipt",
        () => publicClient.waitForTransactionReceipt({ hash, timeout: SEAL_RECEIPT_TIMEOUT_MS }),
        { txHash: hash },
        (confirmed) => ({
          status: confirmed.status,
          blockNumber: confirmed.blockNumber?.toString(),
        }),
      );
      if (receipt.status !== "success") throw new Error("Sticker sealing transaction reverted");
    } catch (error) {
      // Preserve the transaction error even if the reconciliation read also fails.
      onProgress?.({ stage: "transaction", phase: "failed", txHash: transactionHash, error });
      const raced = await step(
        "reconcile",
        () => findOnChainSticker(stickerKey, sealed, artistWallet),
        { txHash: transactionHash },
        (found) => ({ tokenId: found?.tokenId.toString(), recovered: found !== null }),
      );
      // Only a successful receipt proves our transaction is the mint: a retry's reverts once an
      // earlier pending seal lands. The host finds the transaction that minted the sticker.
      if (raced) return raced;
      throw error;
    }

    return step(
      "verify",
      async () => {
        const minted = await findOnChainSticker(stickerKey, sealed, artistWallet);
        if (!minted) throw new Error("Sealing transaction succeeded without a sticker NFT");
        // The mint receipt proves the initial recipient even if the artist later gives it away.
        const transfers = parseEventLogs({
          abi: erc721Abi,
          eventName: "Transfer",
          logs: receipt.logs,
        });
        const received = transfers.some(
          (event) =>
            event.address.toLowerCase() === contractAddress.toLowerCase() &&
            event.args.from === zeroAddress &&
            event.args.to.toLowerCase() === artistWallet.toLowerCase() &&
            event.args.tokenId === minted.tokenId,
        );
        if (!received)
          throw new Error("Mint receipt does not confirm the artist received the sticker");
        return { tokenId: minted.tokenId, transactionHash, alreadySealed: false as const };
      },
      { txHash: transactionHash },
      (minted) => ({ tokenId: minted.tokenId.toString(), status: "minted" }),
    );
  };
}
