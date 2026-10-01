import {
  croquisNamesAbi,
  croquisResolverAbi,
  stickerGiftEscrowAbi,
} from "@drawing-app/sticker-chain/contracts";
import { dnsToText } from "@drawing-app/sticker-chain/ens-gateway";
import {
  BaseError,
  ContractFunctionZeroDataError,
  ExecutionRevertedError,
  type PublicClient,
} from "viem";
import { ChainUnavailableError, type ConfiguredContracts, type ContractReads } from "../deps.ts";

/** A read the contract refused: the node says it reverted, or nothing at the address answered. */
const refused = (error: unknown) =>
  error instanceof BaseError &&
  error.walk(
    (cause) =>
      cause instanceof ExecutionRevertedError || cause instanceof ContractFunctionZeroDataError,
  ) !== null;

/** `read`'s answer, or null when the contract refused it. Any other failure is the RPC's. */
async function unlessRefused<T>(read: () => Promise<T>, what: string): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (refused(error)) return null;
    throw new ChainUnavailableError(`Reading ${what} failed`, { cause: error });
  }
}

/** Reads what the configured contracts answer about each other, all at once. */
export async function readConfiguredContracts(
  publicClient: Pick<PublicClient, "readContract">,
  configured: ConfiguredContracts,
): Promise<ContractReads> {
  const { relayer, escrow, names, resolver } = configured;
  const namesCall = { address: names, abi: croquisNamesAbi } as const;
  const escrowCall = { address: escrow, abi: stickerGiftEscrowAbi } as const;
  const [relayerIsNamer, namesParent, namesStickers, resolverStickers, escrowSticker, escrowNames] =
    await Promise.all([
      unlessRefused(async () => {
        const role = await publicClient.readContract({ ...namesCall, functionName: "NAMER_ROLE" });
        return publicClient.readContract({
          ...namesCall,
          functionName: "hasRole",
          args: [role, relayer],
        });
      }, `CroquisNames ${names}'s NAMER_ROLE`),
      unlessRefused(
        async () =>
          dnsToText(await publicClient.readContract({ ...namesCall, functionName: "parentName" })),
        `CroquisNames ${names}'s parentName()`,
      ),
      unlessRefused(
        () => publicClient.readContract({ ...namesCall, functionName: "STICKERS" }),
        `CroquisNames ${names}'s STICKERS()`,
      ),
      unlessRefused(
        () =>
          publicClient.readContract({
            address: resolver,
            abi: croquisResolverAbi,
            functionName: "STICKERS",
          }),
        `CroquisResolver ${resolver}'s STICKERS()`,
      ),
      unlessRefused(
        () => publicClient.readContract({ ...escrowCall, functionName: "sticker" }),
        `StickerGiftEscrow ${escrow}'s sticker()`,
      ),
      unlessRefused(
        () => publicClient.readContract({ ...escrowCall, functionName: "names" }),
        `StickerGiftEscrow ${escrow}'s names()`,
      ),
    ]);
  return {
    configured,
    relayerIsNamer: relayerIsNamer === true,
    namesParent,
    namesStickers,
    resolverStickers,
    escrowSticker,
    escrowNames,
  };
}
