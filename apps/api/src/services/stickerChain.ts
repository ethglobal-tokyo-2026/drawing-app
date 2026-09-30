import { escrowStatuses } from "@drawing-app/db";
import { bytes32 } from "@drawing-app/sticker-chain/bytes32";
import { stickerGiftEscrowAbi, stickerNftAbi } from "@drawing-app/sticker-chain/contracts";
import {
  createGiftAuthorizer,
  createGiftClaim,
  giftClaimTokenMatches,
  prepareGiftTransfer,
} from "@drawing-app/sticker-chain/gift-sticker";
import { createCroquisNames, stickerLabel } from "@drawing-app/sticker-chain/croquis-names";
import { createStickerSealer } from "@drawing-app/sticker-chain/seal-sticker";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  isAddress,
  keccak256,
  nonceManager,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  ChainUnavailableError,
  type GiftChain,
  type Mint,
  type NameWriter,
  type SmartWallets,
} from "../deps.ts";
import { diagnosticStep, logFailure, logInfo } from "../diagnostics.ts";
import type { DiskImageStore } from "./imageStore.ts";

/** How long finding the block a Sticker event landed in may take. */
const EVENT_LOOKUP_TIMEOUT_MS = 30_000;
/** Probes between the event lookup's progress logs. */
const EVENT_LOOKUP_PROBES_PER_LOG = 8;
/**
 * How long after a mint starts its event lookup gives up, so Sealing answers within the app's wait,
 * upload included. A retry that raced a pending mint starts its lookup after its own receipt wait,
 * so it may run out; the next retry finds the mint with the whole lookup.
 */
export const MINT_LOOKUP_DEADLINE_MS = 40_000;
/**
 * How long Receiving waits for its claim to land. Under the app's wait for Receiving, with room to
 * read the escrow and find a late claim's event, so Receiving answers before the app gives up.
 */
export const CLAIM_RECEIPT_TIMEOUT_MS = 60_000;
/** How long one RPC request may take, short enough that a hung provider leaves time to retry. */
export const RPC_REQUEST_TIMEOUT_MS = 5_000;
/** Retries of a failed RPC request; with several URLs, each retry tries them all again. */
export const RPC_RETRY_COUNT = 1;

function address(value: string, name: string): Address {
  if (!isAddress(value)) throw new Error(`${name} is not an Ethereum address`);
  return value;
}

/** One RPC URL, or several separated by commas, each tried when the one before fails. */
export function rpcTransport(rpcUrl: string) {
  const urls = rpcUrl.split(",").map((url) => url.trim());
  const request = { timeout: RPC_REQUEST_TIMEOUT_MS };
  // The fallback retries the list, so its URLs don't retry on their own.
  return urls.length > 1
    ? fallback(
        urls.map((url) => http(url, request)),
        { retryCount: RPC_RETRY_COUNT },
      )
    : http(rpcUrl.trim(), { ...request, retryCount: RPC_RETRY_COUNT });
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
  const eventBlock = async (
    contract: Address,
    happened: (block: bigint) => Promise<boolean>,
    deadline = Number.POSITIVE_INFINITY,
  ) => {
    let first = 0n;
    // Uncached: viem reuses a block number for its polling interval, which can predate the transition.
    let last = await publicClient.getBlockNumber({ cacheTime: 0 });
    if (!(await happened(last))) {
      throw new Error("The confirmed chain state is not visible at the latest block");
    }
    const giveUpAt = Math.min(Date.now() + EVENT_LOOKUP_TIMEOUT_MS, deadline);
    let probes = 0;
    while (first < last) {
      if (Date.now() >= giveUpAt) throw new Error("Finding the Sticker event block timed out");
      const block = (first + last) / 2n;
      const code = await publicClient.getCode({ address: contract, blockNumber: block });
      if (code && code !== "0x" && (await happened(block))) last = block;
      else first = block + 1n;
      probes += 1;
      if (probes % EVENT_LOOKUP_PROBES_PER_LOG === 0) {
        logInfo("chain.event_lookup.progress", {
          contractAddress: contract,
          blockNumber: block.toString(),
        });
      }
    }
    return first;
  };

  /** The person's Ethereum Sepolia smart wallet; smartWallets logs the lookup. */
  const findSmartWallet = async (artistId: string) => {
    const found = await smartWallets.addressFor(artistId);
    return found && isAddress(found) ? found : null;
  };

  const mint: Mint = async (sticker) => {
    const started = Date.now();
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
        name: `Sticker No.${stickerLabel(sticker.number)}`,
        description: "A one-of-one sticker sealed in Croquis.",
        image,
        external_url: image,
        attributes: [
          { trait_type: "Content hash", value: sticker.contentHash },
          { trait_type: "Dimensions", value: `${sticker.width} × ${sticker.height}` },
        ],
      }),
    );
    const seal = createStickerSealer({
      publicClient,
      walletClient,
      contractAddress: stickerAddress,
      sealerAccount,
      findArtistSmartWallet: findSmartWallet,
      onProgress: ({ stage, phase, error, ...progress }) => {
        const event = `chain.mint.${stage}.${phase}`;
        const context = { ...fields, ...progress };
        if (phase === "failed") logFailure(event, error, context);
        else logInfo(event, context);
      },
    });
    const result = await diagnosticStep("chain.mint", fields, () => seal(sticker));
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
          started + MINT_LOOKUP_DEADLINE_MS,
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
        publicClient
          .readContract({
            address: escrowAddress,
            abi: stickerGiftEscrowAbi,
            functionName: "gifts",
            args: [bytes32(giftId, "Gift ID")],
          })
          .catch((error: unknown) => {
            throw new ChainUnavailableError(`Reading gift ${giftId} from the escrow failed`, {
              cause: error,
            });
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
          return escrowStatuses[gift[5]] === "claimed";
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
      const token = giftClaimToken === null ? null : bytes32(giftClaimToken, "Gift claim token");
      const recipientWallet = await findSmartWallet(recipientId);
      if (!recipientWallet) {
        throw new Error("Recipient Ethereum smart wallet is unavailable on the configured chain");
      }

      const reconcileClaim = async () => {
        const reconciled = await diagnosticStep("chain.claim.reconcile", fields, async () => {
          const gift = await readEscrowGift(id);
          if (gift.status === "missing") return null;
          const commitment = bytes32(gift.claimCommitment, "Claim commitment");
          if (token !== null && !giftClaimTokenMatches(token, commitment)) {
            throw new Error("Gift claim token is invalid");
          }
          if (gift.status !== "claimed") return null;
          if (gift.recipient.toLowerCase() !== recipientWallet.toLowerCase()) {
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
          token === null
            ? authorizer.authorizeClaimForNamedRecipient({
                giftId: id,
                recipientArtistId: recipientId,
              })
            : authorizer.authorizeClaim({
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
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            timeout: CLAIM_RECEIPT_TIMEOUT_MS,
          });
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
