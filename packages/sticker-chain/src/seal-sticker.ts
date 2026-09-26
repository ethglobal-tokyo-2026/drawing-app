import {
  isAddress,
  isHex,
  erc721Abi,
  keccak256,
  parseEventLogs,
  stringToBytes,
  zeroAddress,
  type Abi,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";

interface SealedSticker {
  id: string;
  artistId: string;
  sealedAt: string;
  contentHash: Hex;
  metadataUri: string;
}

interface ArtistWalletRecord {
  address: Address;
  kind: "smart_account" | "signer_eoa";
  chainId: number;
}

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
  abi: Abi;
  findSticker: (stickerId: string) => Promise<SealedSticker | null>;
  findArtistSmartWallet: (artistId: string) => Promise<ArtistWalletRecord | null>;
  /** The host records diagnostics without the library choosing a logger or exposing request data. */
  onProgress?: (progress: SealProgress) => void;
}

function requireBigInt(value: unknown, field: string) {
  if (typeof value !== "bigint") throw new Error(`${field} is not a bigint`);
  return value;
}

function requireAddress(value: unknown, field: string) {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`${field} is not an address`);
  }
  return value;
}

function requireHex(value: unknown, field: string) {
  if (typeof value !== "string" || !isHex(value)) {
    throw new Error(`${field} is not hexadecimal`);
  }
  return value;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string") throw new Error(`${field} is not a string`);
  return value;
}

export function createStickerSealer({
  publicClient,
  walletClient,
  contractAddress,
  sealerAccount,
  abi,
  findSticker,
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
    sticker: SealedSticker,
    artistWallet: Address,
  ) {
    const tokenId = requireBigInt(
      await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "tokenIdForSticker",
        args: [stickerKey],
      }),
      "tokenIdForSticker",
    );
    if (tokenId === 0n) return null;
    const [artist, contentHash, metadataUri] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "artistOf",
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "contentHashOf",
        args: [tokenId],
      }),
      publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "tokenURI",
        args: [tokenId],
      }),
    ]);
    if (
      requireAddress(artist, "artistOf").toLowerCase() !== artistWallet.toLowerCase() ||
      requireHex(contentHash, "contentHashOf").toLowerCase() !==
        sticker.contentHash.toLowerCase() ||
      requireString(metadataUri, "tokenURI") !== sticker.metadataUri
    ) {
      throw new Error("On-chain sticker conflicts with sealed sticker data");
    }
    return { tokenId, alreadySealed: true as const };
  }

  return async function sealStickerForArtist({
    artistId,
    stickerId,
  }: {
    artistId: string;
    stickerId: string;
  }) {
    if (!artistId || !stickerId) throw new Error("Artist and sticker are required");
    const sticker = await findSticker(stickerId);
    if (
      !sticker ||
      sticker.id !== stickerId ||
      sticker.artistId !== artistId ||
      !sticker.sealedAt
    ) {
      throw new Error("Sticker is not sealed for this artist");
    }
    if (!isHex(sticker.contentHash) || sticker.contentHash.length !== 66 || !sticker.metadataUri) {
      throw new Error("Sealed sticker needs a content hash and metadata URI");
    }
    const walletRecord = await step(
      "wallet_lookup",
      () => findArtistSmartWallet(artistId),
      {},
      (wallet) => ({ address: wallet?.address, status: wallet ? "found" : "missing" }),
    );
    if (
      walletRecord?.kind !== "smart_account" ||
      walletRecord.chainId !== sepolia.id ||
      !isAddress(walletRecord.address)
    ) {
      throw new Error("Artist Ethereum Sepolia smart wallet is unavailable");
    }

    const stickerKey = keccak256(stringToBytes(sticker.id));
    const existing = await step(
      "chain_lookup",
      () => findOnChainSticker(stickerKey, sticker, walletRecord.address),
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
          abi,
          functionName: "sealSticker",
          args: [walletRecord.address, stickerKey, sticker.contentHash, sticker.metadataUri],
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
        () => publicClient.waitForTransactionReceipt({ hash }),
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
        () => findOnChainSticker(stickerKey, sticker, walletRecord.address),
        { txHash: transactionHash },
        (found) => ({ tokenId: found?.tokenId.toString(), recovered: found !== null }),
      );
      if (raced) return { ...raced, transactionHash };
      throw error;
    }

    return step(
      "verify",
      async () => {
        const minted = await findOnChainSticker(stickerKey, sticker, walletRecord.address);
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
            event.args.to.toLowerCase() === walletRecord.address.toLowerCase() &&
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
