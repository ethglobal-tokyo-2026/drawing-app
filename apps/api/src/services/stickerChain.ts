import { stickerGiftEscrowAbi, stickerNftAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createGiftAuthorizer,
  createGiftClaim,
  giftClaimTokenMatches,
  prepareGiftTransfer,
} from "@drawing-app/sticker-chain/gift-sticker";
import { createCroquisNames } from "@drawing-app/sticker-chain/croquis-names";
import { createStickerSealer } from "@drawing-app/sticker-chain/seal-sticker";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  isAddress,
  isHex,
  keccak256,
  nonceManager,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import type { GiftChain, Mint, NameWriter, SmartWallets } from "../deps.ts";
import { diagnosticStep, logFailure, logInfo } from "../diagnostics.ts";
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

/**
 * The RPC for one URL, or for several separated by commas, each tried in turn when the one before
 * refuses: free RPCs each refuse something (Tenderly's public gateway rate-limits sending
 * transactions; PublicNode's searches no more than 50,000 blocks for events).
 */
export function rpcTransport(rpcUrl: string) {
  const urls = rpcUrl.split(",").map((url) => url.trim());
  return urls.length > 1 ? fallback(urls.map((url) => http(url))) : http(rpcUrl.trim());
}

export function createStickerChain({
  rpcUrl,
  stickerContract,
  escrowContract,
  namesContract,
  sealerPrivateKey,
  smartWallets,
  images,
}: {
  rpcUrl: string;
  stickerContract: string;
  escrowContract: string;
  namesContract: string;
  sealerPrivateKey: Hex;
  smartWallets: SmartWallets;
  images: DiskImageStore;
}): { mint: Mint; giftChain: GiftChain; nameWriter: NameWriter } {
  const stickerAddress = address(stickerContract, "STICKER_NFT_ADDRESS");
  const escrowAddress = address(escrowContract, "STICKER_GIFT_ESCROW_ADDRESS");
  // Minting and Receiving share the relayer; concurrent requests need distinct nonces.
  const sealerAccount = privateKeyToAccount(sealerPrivateKey, { nonceManager });
  const transport = rpcTransport(rpcUrl);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ chain: sepolia, transport, account: sealerAccount });

  // Historical state locates the transition without asking a provider to search the whole chain.
  const eventBlock = async (contract: Address, happened: (block: bigint) => Promise<boolean>) => {
    let first = 0n;
    // Uncached: viem reuses a block number for its polling interval, which can predate the transition.
    let last = await publicClient.getBlockNumber({ cacheTime: 0 });
    if (!(await happened(last))) {
      throw new Error("The confirmed chain state is not visible at the latest block");
    }
    const deadline = Date.now() + 30_000;
    let probes = 0;
    while (first < last) {
      if (Date.now() >= deadline) throw new Error("Finding the Sticker event block timed out");
      const block = (first + last) / 2n;
      const code = await publicClient.getCode({ address: contract, blockNumber: block });
      if (code && code !== "0x" && (await happened(block))) last = block;
      else first = block + 1n;
      probes += 1;
      if (probes % 8 === 0) {
        logInfo("chain.event_lookup.progress", {
          contractAddress: contract,
          blockNumber: block.toString(),
        });
      }
    }
    return first;
  };

  const mint: Mint = async (sticker) => {
    const fields = {
      stickerId: sticker.stickerId,
      artistId: sticker.artistId,
      chainId: sepolia.id,
      contractAddress: stickerAddress,
      address: sealerAccount.address,
    };
    const image = images.urls(sticker.contentHash).png;
    await diagnosticStep("chain.mint.metadata", fields, () =>
      images.saveMetadata(sticker.stickerId, {
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
      }),
    );
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
      onProgress: ({ stage, phase, error, ...progress }) => {
        const event = `chain.mint.${stage}.${phase}`;
        const context = { ...fields, ...progress };
        if (phase === "failed") logFailure(event, error, context);
        else logInfo(event, context);
      },
    });
    const result = await diagnosticStep("chain.mint", fields, () =>
      seal({ artistId: sticker.artistId, stickerId: sticker.stickerId }),
    );
    let txHash = "transactionHash" in result ? result.transactionHash : undefined;
    if (!txHash) {
      txHash = await diagnosticStep("chain.mint.event_lookup", fields, async () => {
        const stickerId = keccak256(stringToBytes(sticker.stickerId));
        const block = await eventBlock(
          stickerAddress,
          async (blockNumber) =>
            (await publicClient.readContract({
              address: stickerAddress,
              abi: stickerNftAbi,
              functionName: "tokenIdForSticker",
              args: [stickerId],
              blockNumber,
            })) !== 0n,
        );
        const [event] = await publicClient.getContractEvents({
          address: stickerAddress,
          abi: stickerNftAbi,
          eventName: "StickerSealed",
          args: { stickerId },
          fromBlock: block,
          toBlock: block,
        });
        return event?.transactionHash;
      });
    }
    if (!txHash) throw new Error("The sticker is minted, but its transaction hash was not found");
    logInfo("chain.mint.confirmed", {
      ...fields,
      tokenId: result.tokenId.toString(),
      txHash,
      recovered: result.alreadySealed,
    });
    return { tokenId: result.tokenId.toString(), txHash };
  };

  const readEscrowGift: GiftChain["readEscrowGift"] = async (giftId) => {
    const [sender, recipient, tokenId, claimCommitment, expiresAt, status] = await diagnosticStep(
      "chain.escrow.read",
      { giftId, chainId: sepolia.id, contractAddress: escrowAddress },
      () =>
        publicClient.readContract({
          address: escrowAddress,
          abi: stickerGiftEscrowAbi,
          functionName: "gifts",
          args: [bytes32(giftId, "Gift ID")],
        }),
    );
    const named = escrowStatuses[status];
    if (!named) throw new Error(`Escrow returned unknown gift status ${status}`);
    logInfo("chain.escrow.result", { giftId, status: named, tokenId: tokenId.toString() });
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
    const found = await diagnosticStep("chain.wallet.lookup", { artistId }, () =>
      smartWallets.addressFor(artistId),
    );
    logInfo("chain.wallet.result", {
      artistId,
      address: found ?? undefined,
      status: found ? "found" : "missing",
    });
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
    const events = await diagnosticStep(
      "chain.claim.event_lookup",
      { giftId, chainId: sepolia.id, contractAddress: escrowAddress },
      async () => {
        const block = await eventBlock(escrowAddress, async (blockNumber) => {
          const gift = await publicClient.readContract({
            address: escrowAddress,
            abi: stickerGiftEscrowAbi,
            functionName: "gifts",
            args: [giftId],
            blockNumber,
          });
          return gift[5] === 2;
        });
        return publicClient.getContractEvents({
          address: escrowAddress,
          abi: stickerGiftEscrowAbi,
          eventName: "GiftClaimed",
          args: { giftId },
          fromBlock: block,
          toBlock: block,
        });
      },
    );
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
      const fields = {
        giftId,
        recipientId,
        chainId: sepolia.id,
        contractAddress: escrowAddress,
        address: sealerAccount.address,
      };
      const id = bytes32(giftId, "Gift ID");
      const token = bytes32(giftClaimToken, "Gift claim token");
      const recipientWallet = await findSmartWallet(recipientId);
      if (!recipientWallet) {
        throw new Error("Recipient Ethereum smart wallet is unavailable on the configured chain");
      }

      const reconcileClaim = async () => {
        const reconciled = await diagnosticStep("chain.claim.reconcile", fields, async () => {
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
        });
        logInfo("chain.claim.reconcile.result", {
          ...fields,
          recovered: reconciled?.claimed ?? false,
          status:
            reconciled === null
              ? "not_claimed"
              : reconciled.claimed
                ? "claimed"
                : "other_recipient",
          txHash: reconciled?.claimed ? reconciled.txHash : undefined,
        });
        return reconciled;
      };

      const existing = await reconcileClaim();
      if (existing) return existing;
      let txHash: Hex | undefined;
      try {
        const authorized = await diagnosticStep("chain.claim.authorize", fields, () =>
          authorizer.authorizeClaim({
            giftId: id,
            giftClaimToken: token,
            recipientArtistId: recipientId,
          }),
        );
        txHash = await diagnosticStep("chain.claim.submit", fields, () =>
          walletClient.writeContract({
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
          }),
        );
        logInfo("chain.claim.submitted", { ...fields, txHash });
        const hash = txHash;
        await diagnosticStep("chain.claim.receipt", { ...fields, txHash }, async () => {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          logInfo("chain.claim.receipt.result", {
            ...fields,
            txHash,
            status: receipt.status,
            blockNumber: receipt.blockNumber?.toString(),
          });
          if (receipt.status !== "success") throw new Error(`Claiming gift ${id} reverted`);
        });
        return { claimed: true, txHash };
      } catch (error) {
        logFailure("chain.claim.transaction.failed", error, { ...fields, txHash });
        // A timeout can hide a transaction that landed. Read the escrow before allowing a retry.
        const reconciled = await reconcileClaim();
        if (reconciled) return reconciled;
        throw error;
      }
    },
  };

  const croquisNames = createCroquisNames({
    publicClient,
    walletClient,
    account: sealerAccount,
    namesAddress: address(namesContract, "CROQUIS_NAMES_ADDRESS"),
    onProgress: ({ stage, phase, txHash, error }) => {
      const fields = { chainId: sepolia.id, contractAddress: namesContract, txHash };
      if (phase === "failed") logFailure(`chain.ens.${stage}.failed`, error, fields);
      else logInfo(`chain.ens.${stage}.${phase}`, fields);
    },
  });
  const nameWriter: NameWriter = {
    ensurePersonName: (person, label, records) =>
      croquisNames.ensurePersonName(address(person, "Person"), label, records),
    ensureStickerName: (tokenId, label) => croquisNames.ensureStickerName(BigInt(tokenId), label),
    setAvatar: (person, avatar) => croquisNames.setAvatar(address(person, "Person"), avatar),
  };

  return { mint, giftChain, nameWriter };
}
