import { stickerGiftEscrowAbi, stickerNftAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createGiftAuthorizer,
  createGiftClaim,
  giftClaimTokenMatches,
  prepareGiftTransfer,
} from "@drawing-app/sticker-chain/gift-sticker";
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

  const readEscrowGift: GiftChain["readEscrowGift"] = async (giftId) => {
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
  };

  const findSmartWallet = async (artistId: string) => {
    const found = await smartWallets.addressFor(artistId);
    return found && isAddress(found)
      ? { address: found, kind: "smart_account" as const, chainId: sepolia.id }
      : null;
  };
  const authorizer = createGiftAuthorizer({
    signer: sealerAccount,
    chainId: sepolia.id,
    escrowContract: escrowAddress,
    findGift: async (giftId) => {
      const gift = await readEscrowGift(giftId);
      return gift.status === "missing"
        ? null
        : {
            giftId,
            claimCommitment: bytes32(gift.claimCommitment, "Gift claim commitment"),
            expiresAt: Math.floor(gift.expiresAt.getTime() / 1000),
            status: gift.status,
          };
    },
    findArtistSmartWallet: findSmartWallet,
  });

  const claimTransactionHash = async (giftId: Hex) => {
    const events = await publicClient.getContractEvents({
      address: escrowAddress,
      abi: stickerGiftEscrowAbi,
      eventName: "GiftClaimed",
      args: { giftId },
      fromBlock: 0n,
      toBlock: "latest",
    });
    const event = events.at(-1);
    if (!event) throw new Error(`Claimed gift ${giftId} has no GiftClaimed event`);
    return event.transactionHash;
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
    readEscrowGift,
    claimGift: async ({ giftId, giftClaimToken, recipientId }) => {
      const id = bytes32(giftId, "Gift ID");
      const token = bytes32(giftClaimToken, "Gift claim token");
      const recipientWallet = await findSmartWallet(recipientId);
      if (!recipientWallet) {
        throw new Error("Recipient Ethereum smart wallet is unavailable on the configured chain");
      }

      const reconcileClaim = async () => {
        const gift = await readEscrowGift(id);
        if (gift.status === "missing") return null;
        if (!giftClaimTokenMatches(token, bytes32(gift.claimCommitment, "Claim commitment"))) {
          throw new Error("Gift claim token is invalid");
        }
        if (gift.status !== "claimed") return null;
        if (gift.recipient.toLowerCase() !== recipientWallet.address.toLowerCase()) {
          return { claimed: false as const };
        }
        return { claimed: true as const, txHash: await claimTransactionHash(id) };
      };

      const existing = await reconcileClaim();
      if (existing) return existing;
      const authorized = await authorizer.authorizeClaim({
        giftId: id,
        giftClaimToken: token,
        recipientArtistId: recipientId,
      });
      try {
        const txHash = await walletClient.writeContract({
          address: escrowAddress,
          abi: stickerGiftEscrowAbi,
          functionName: "claimGift",
          args: [
            id,
            authorized.recipient,
            BigInt(authorized.authorizationDeadline),
            authorized.authorization,
          ],
          account: sealerAccount,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") throw new Error(`Claiming gift ${id} reverted`);
        return { claimed: true, txHash };
      } catch (error) {
        // A timeout can hide a transaction that landed. Read the escrow before allowing a retry.
        const reconciled = await reconcileClaim();
        if (reconciled) return reconciled;
        throw error;
      }
    },
  };

  return { mint, giftChain };
}
