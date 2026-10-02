import { CROQUIS_PARENT_NAME } from "@drawing-app/sticker-chain/croquis-names";
import { isAddressEqual, type Address } from "viem";
import type { ContractReads, NamingState, ReadContracts } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";

/** The configured contracts don't agree with each other. */
class ContractMismatchError extends Error {
  name = "ContractMismatchError";
}

/** One comparison the contract check makes. */
interface Comparison {
  holds: boolean;
  /**
   * Naming can't work while it fails: names would revert, describe another StickerNFT's stickers,
   * or sit under another parent name than the one the API shows.
   */
  stopsNaming: boolean;
  /** What's wrong when it fails, naming the addresses or names involved. */
  mismatch: string;
}

/** A contract's answer to `getter`, compared with the configured `expected`. */
function compareAnswer(
  { contract, getter, answer }: { contract: string; getter: string; answer: Address | null },
  expected: { contract: string; address: Address },
  { stopsNaming, whyMissing }: { stopsNaming: boolean; whyMissing?: string },
): Comparison {
  const missing = `${contract} has no ${getter}`;
  return {
    holds: answer !== null && isAddressEqual(answer, expected.address),
    stopsNaming,
    mismatch:
      answer !== null
        ? `${contract}'s ${getter} is ${answer}, not the configured ${expected.contract} ${expected.address}`
        : whyMissing
          ? `${missing}, ${whyMissing}`
          : missing,
  };
}

/** Each comparison, keyed as chain.contracts.checked logs it. */
function compare(reads: ContractReads) {
  const { relayer, stickers, escrow, names, resolver } = reads.configured;
  const stickerNft = { contract: "StickerNFT", address: stickers };
  return {
    namerRole: {
      holds: reads.relayerIsNamer,
      stopsNaming: true,
      mismatch: `CroquisNames ${names} doesn't grant NAMER_ROLE to the relayer ${relayer}`,
    },
    namesParent: {
      holds: reads.namesParent === CROQUIS_PARENT_NAME,
      stopsNaming: true,
      mismatch:
        reads.namesParent === null
          ? `CroquisNames ${names} has no parentName()`
          : `CroquisNames ${names}'s parentName() is ${reads.namesParent}, not the API's CROQUIS_PARENT_NAME ${CROQUIS_PARENT_NAME}`,
    },
    namesStickers: compareAnswer(
      { contract: `CroquisNames ${names}`, getter: "STICKERS()", answer: reads.namesStickers },
      stickerNft,
      { stopsNaming: true },
    ),
    resolverStickers: compareAnswer(
      {
        contract: `CroquisResolver ${resolver}`,
        getter: "STICKERS()",
        answer: reads.resolverStickers,
      },
      stickerNft,
      { stopsNaming: true },
    ),
    escrowSticker: compareAnswer(
      { contract: `StickerGiftEscrow ${escrow}`, getter: "sticker()", answer: reads.escrowSticker },
      stickerNft,
      { stopsNaming: false },
    ),
    escrowNames: compareAnswer(
      { contract: `StickerGiftEscrow ${escrow}`, getter: "names()", answer: reads.escrowNames },
      { contract: "CroquisNames", address: names },
      { stopsNaming: false, whyMissing: "so it's from before CroquisNames" },
    ),
  } satisfies Record<string, Comparison>;
}

/**
 * The contract check: reads whether the configured contracts agree, logs what it found, and answers
 * naming's state, off while a mismatch means naming can't work. When the reads fail, naming stays as
 * `current`. Never rejects.
 */
export async function checkContracts(
  readContracts: ReadContracts,
  current: NamingState,
): Promise<NamingState> {
  try {
    const reads = await readContracts();
    const comparisons = compare(reads);
    const failed = Object.values(comparisons).filter((comparison) => !comparison.holds);
    const stopping = failed.filter((comparison) => comparison.stopsNaming);
    const state: NamingState =
      stopping.length === 0
        ? { on: true }
        : { on: false, reason: stopping.map((comparison) => comparison.mismatch).join("; ") };
    const fields = {
      address: reads.configured.relayer,
      contractAddress: reads.configured.names,
      naming: state.on ? "on" : "off",
    } as const;
    logInfo("chain.contracts.checked", {
      ...fields,
      namerRole: comparisons.namerRole.holds,
      namesParent: comparisons.namesParent.holds,
      namesStickers: comparisons.namesStickers.holds,
      resolverStickers: comparisons.resolverStickers.holds,
      escrowSticker: comparisons.escrowSticker.holds,
      escrowNames: comparisons.escrowNames.holds,
    });
    if (failed.length > 0) {
      const mismatches = failed.map((comparison) => comparison.mismatch).join("; ");
      logFailure("chain.contracts.mismatch", new ContractMismatchError(mismatches), {
        ...fields,
        count: failed.length,
      });
    }
    return state;
  } catch (error) {
    logFailure("chain.contracts.check_failed", error, { naming: current.on ? "on" : "off" });
    return current;
  }
}
