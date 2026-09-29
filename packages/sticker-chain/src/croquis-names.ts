import type { Account, Address, Hash, PublicClient, WalletClient } from "viem";
import { croquisNamesAbi } from "@drawing-app/sticker-chain/contracts";

/** How long a naming transaction may take to land before it counts as failed. */
const RECEIPT_TIMEOUT_MS = 120_000;

interface NamingProgress {
  stage: "person_name" | "sticker_name" | "avatar";
  phase: "skipped" | "submitted" | "completed" | "failed";
  txHash?: Hash;
  error?: unknown;
}

interface CroquisNamesOptions {
  publicClient: Pick<PublicClient, "readContract" | "waitForTransactionReceipt">;
  walletClient: Pick<WalletClient, "writeContract">;
  account: Account;
  namesAddress: Address;
  /** The host records diagnostics without the library choosing a logger. */
  onProgress?: (progress: NamingProgress) => void;
}

/**
 * ENSIP-12's avatar for a sticker's NFT, spelled the way CroquisResolver spells it, so a person's
 * avatar and their sticker name's avatar agree.
 */
export function stickerAvatar(chainId: number, stickerContract: Address, tokenId: bigint) {
  return `eip155:${chainId}/erc721:${stickerContract.toLowerCase()}/${tokenId}`;
}

/** The name every person, sticker and gift name sits under; the deploy script builds it. */
export const CROQUIS_PARENT_NAME = "croquis.eth";

/** A sticker name's label: its number, padded as in "No.0042". */
export const stickerLabel = (number: number) => String(number).padStart(4, "0");

export const personEnsName = (label: string) => `${label}.${CROQUIS_PARENT_NAME}`;

export const stickerEnsName = (number: number, artistLabel: string) =>
  `${stickerLabel(number)}.${personEnsName(artistLabel)}`;

/**
 * Writes names under croquis.eth through CroquisNames. Each call reads the chain first, so a retry
 * after a timeout or a crash does nothing when the earlier attempt landed.
 */
export function createCroquisNames({
  publicClient,
  walletClient,
  account,
  namesAddress,
  onProgress,
}: CroquisNamesOptions) {
  const read = {
    labelOf: (person: Address) =>
      publicClient.readContract({
        address: namesAddress,
        abi: croquisNamesAbi,
        functionName: "labelOf",
        args: [person],
      }),
    stickerLabelOf: (tokenId: bigint) =>
      publicClient.readContract({
        address: namesAddress,
        abi: croquisNamesAbi,
        functionName: "stickerLabelOf",
        args: [tokenId],
      }),
  };

  async function send(stage: NamingProgress["stage"], hashOf: () => Promise<Hash>) {
    let txHash: Hash | undefined;
    try {
      txHash = await hashOf();
      onProgress?.({ stage, phase: "submitted", txHash });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: RECEIPT_TIMEOUT_MS,
      });
      if (receipt.status !== "success") throw new Error(`${stage} transaction ${txHash} reverted`);
      onProgress?.({ stage, phase: "completed", txHash });
      return txHash;
    } catch (error) {
      onProgress?.({ stage, phase: "failed", txHash, error });
      throw error;
    }
  }

  return {
    /** Gives `person` its forever name, unless it has one. Returns the label it holds. */
    async ensurePersonName(
      person: Address,
      label: string,
      records: { avatar: string; url: string },
    ) {
      const existing = await read.labelOf(person);
      if (existing) {
        onProgress?.({ stage: "person_name", phase: "skipped" });
        return { label: existing, created: false };
      }
      await send("person_name", () =>
        walletClient.writeContract({
          address: namesAddress,
          abi: croquisNamesAbi,
          functionName: "claimPersonName",
          args: [label, person, records.avatar, records.url],
          account,
          chain: null,
        }),
      );
      return { label, created: true };
    },

    /** Names a sticker under its Original Artist, unless it has a name. */
    async ensureStickerName(tokenId: bigint, label: string) {
      const existing = await read.stickerLabelOf(tokenId);
      if (existing) {
        onProgress?.({ stage: "sticker_name", phase: "skipped" });
        return { label: existing, created: false };
      }
      await send("sticker_name", () =>
        walletClient.writeContract({
          address: namesAddress,
          abi: croquisNamesAbi,
          functionName: "nameSticker",
          args: [tokenId, label],
          account,
          chain: null,
        }),
      );
      return { label, created: true };
    },

    /** The app's one record on a person's name. */
    async setAvatar(person: Address, avatar: string) {
      await send("avatar", () =>
        walletClient.writeContract({
          address: namesAddress,
          abi: croquisNamesAbi,
          functionName: "setAvatar",
          args: [person, avatar],
          account,
          chain: null,
        }),
      );
    },
  };
}
