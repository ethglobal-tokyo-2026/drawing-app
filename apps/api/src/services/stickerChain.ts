import { stickerGiftEscrowAbi, stickerNftAbi } from "@drawing-app/sticker-chain/contracts";
import { createGiftClaim, prepareGiftTransfer } from "@drawing-app/sticker-chain/gift-sticker";
import { createStickerSealer } from "@drawing-app/sticker-chain/seal-sticker";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  isHex,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import type { GiftChain, Mint, SmartWallets } from "../deps.ts";
import type { DiskImageStore } from "./imageStore.ts";

const escrowStatuses = ["missing", "pending", "claimed", "rejected", "expired_returned"] as const;

function address(value: string, name: string): Address {
  if (!isAddress(value)) throw new Error(`${name} is not an Ethereum address`);
  return value;
}

function bytes32(value: string, name: string): Hex {
  if (!isHex(value) || value.length !== 66) throw new Error(`${name} is not 32 bytes`);
  return value;
}

export function createStickerChain({
  rpcUrl,
  stickerContract,
  escrowContract,
  sealerPrivateKey,
  smartWallets,
  images,
}: {
  rpcUrl: string;
  stickerContract: string;
  escrowContract: string;
  sealerPrivateKey: Hex;
  smartWallets: SmartWallets;
  images: DiskImageStore;
}): { mint: Mint; giftChain: GiftChain } {
  const stickerAddress = address(stickerContract, "STICKER_NFT_ADDRESS");
  const escrowAddress = address(escrowContract, "STICKER_GIFT_ESCROW_ADDRESS");
  const sealerAccount = privateKeyToAccount(sealerPrivateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ chain: sepolia, transport, account: sealerAccount });

  const mint: Mint = async (sticker) => {
    const image = images.urls(sticker.contentHash).png;
    await images.saveMetadata(sticker.stickerId, {
      name: sticker.number ? `Sticker No.${String(sticker.number).padStart(4, "0")}` : "Sticker",
      description: "A one-of-one sticker sealed in Daily Drawing App.",
      image,
      external_url: image,
      attributes: [
        { trait_type: "Content hash", value: sticker.contentHash },
        ...(sticker.width && sticker.height
          ? [{ trait_type: "Dimensions", value: `${sticker.width} × ${sticker.height}` }]
          : []),
      ],
    });
    const seal = createStickerSealer({
      publicClient,
      walletClient,
      contractAddress: stickerAddress,
      sealerAccount,
      abi: stickerNftAbi,
      findSticker: async (stickerId) =>
        stickerId === sticker.stickerId
          ? {
              id: sticker.stickerId,
              artistId: sticker.artistId,
              sealedAt: sticker.sealedAt?.toISOString() ?? new Date().toISOString(),
              contentHash: bytes32(sticker.contentHash, "Sticker content hash"),
              metadataUri: sticker.metadataUri,
            }
          : null,
      findArtistSmartWallet: async (artistId) => {
        const found = await smartWallets.addressFor(artistId);
        return found && isAddress(found)
          ? { address: found, kind: "smart_account", chainId: sepolia.id }
          : null;
      },
    });
    const result = await seal({ artistId: sticker.artistId, stickerId: sticker.stickerId });
    let txHash = "transactionHash" in result ? result.transactionHash : undefined;
    if (!txHash) {
      const [event] = await publicClient.getContractEvents({
        address: stickerAddress,
        abi: stickerNftAbi,
        eventName: "StickerSealed",
        args: { stickerId: keccak256(stringToBytes(sticker.stickerId)) },
        fromBlock: 0n,
        toBlock: "latest",
      });
      txHash = event?.transactionHash;
    }
    if (!txHash) throw new Error("The sticker is minted, but its transaction hash was not found");
    return { tokenId: result.tokenId.toString(), txHash };
  };

  const giftChain: GiftChain = {
    createGiftClaim,
    prepareGiftTransfer: ({ sender, tokenId, giftId, claimCommitment, expiresAt }) =>
      prepareGiftTransfer({
        sender: address(sender, "Gift sender"),
        stickerContract: stickerAddress,
        escrowContract: escrowAddress,
        tokenId: BigInt(tokenId),
        giftId: bytes32(giftId, "Gift ID"),
        claimCommitment: bytes32(claimCommitment, "Gift claim commitment"),
        expiresAt: Math.floor(expiresAt.getTime() / 1000),
      }),
    readEscrowGift: async (giftId) => {
      const [sender, recipient, tokenId, claimCommitment, expiresAt, status] =
        await publicClient.readContract({
          address: escrowAddress,
          abi: stickerGiftEscrowAbi,
          functionName: "gifts",
          args: [bytes32(giftId, "Gift ID")],
        });
      const named = escrowStatuses[status];
      if (!named) throw new Error(`Escrow returned unknown gift status ${status}`);
      return {
        sender,
        recipient,
        tokenId: tokenId.toString(),
        claimCommitment,
        expiresAt: new Date(Number(expiresAt) * 1000),
        status: named,
      };
    },
  };

  return { mint, giftChain };
}
