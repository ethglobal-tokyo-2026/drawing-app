import {
  isAddress,
  isHex,
  keccak256,
  stringToBytes,
  type Abi,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
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
}: StickerSealerOptions) {
  if (!isAddress(contractAddress)) throw new Error("Invalid sticker contract address");

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
    const walletRecord = await findArtistSmartWallet(artistId);
    if (
      walletRecord?.kind !== "smart_account" ||
      walletRecord.chainId !== sepolia.id ||
      !isAddress(walletRecord.address)
    ) {
      throw new Error("Artist Ethereum Sepolia smart wallet is unavailable");
    }

    const stickerKey = keccak256(stringToBytes(sticker.id));
    const existing = await findOnChainSticker(stickerKey, sticker, walletRecord.address);
    if (existing) return existing;

    let transactionHash: Hex | undefined;
    try {
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: "sealSticker",
        args: [walletRecord.address, stickerKey, sticker.contentHash, sticker.metadataUri],
        account: sealerAccount,
      });
      transactionHash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
      if (receipt.status !== "success") throw new Error("Sticker sealing transaction reverted");
    } catch (error) {
      const raced = await findOnChainSticker(stickerKey, sticker, walletRecord.address);
      if (raced) return { ...raced, transactionHash };
      throw error;
    }

    const minted = await findOnChainSticker(stickerKey, sticker, walletRecord.address);
    if (!minted) throw new Error("Sealing transaction succeeded without a sticker NFT");
    return { tokenId: minted.tokenId, transactionHash, alreadySealed: false as const };
  };
}
