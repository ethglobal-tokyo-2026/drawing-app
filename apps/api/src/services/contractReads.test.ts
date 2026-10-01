import {
  croquisNamesAbi,
  croquisResolverAbi,
  stickerGiftEscrowAbi,
} from "@drawing-app/sticker-chain/contracts";
import { CROQUIS_PARENT_NAME } from "@drawing-app/sticker-chain/croquis-names";
import {
  createPublicClient,
  decodeFunctionData,
  encodeFunctionResult,
  getAddress,
  isHex,
  keccak256,
  stringToBytes,
  toHex,
  type Abi,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { packetToBytes } from "viem/ens";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ChainUnavailableError } from "../deps.ts";
import { readConfiguredContracts } from "./contractReads.ts";
import { rpcTransport } from "./stickerChain.ts";

const address = (digit: string) => getAddress(`0x${digit.repeat(40)}`);
const configured = {
  relayer: address("1"),
  stickers: address("2"),
  escrow: address("3"),
  names: address("4"),
  resolver: address("5"),
};
const NAMER_ROLE = keccak256(stringToBytes("NAMER_ROLE"));

/** A contract the fake node holds: its ABI, and the answer of each function it has. */
interface FakeContract {
  abi: Abi;
  answers: Record<string, (...args: readonly unknown[]) => unknown>;
}

const ethCall = z.object({
  id: z.number(),
  params: z.tuple([z.object({ to: z.string(), data: z.custom<`0x${string}`>(isHex) }), z.string()]),
});

/**
 * A Sepolia node behind fetch, holding `contracts`. Its eth_call answers from a contract's
 * `answers`, and reverts as `revert` for a function the contract doesn't have, as Solidity does.
 */
function fakeNode(contracts: Record<Address, FakeContract>, revert: object) {
  // viem's HTTP transport sends each JSON-RPC request as a string body.
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const { id, params } = ethCall.parse(JSON.parse(init.body));
    const [{ to, data }] = params;
    const contract = contracts[getAddress(to)];
    if (!contract) throw new Error(`The fake node holds no contract at ${to}`);
    const { functionName, args = [] } = decodeFunctionData({ abi: contract.abi, data });
    const answer = contract.answers[functionName];
    return Response.json(
      answer
        ? {
            jsonrpc: "2.0",
            id,
            result: encodeFunctionResult({
              abi: contract.abi,
              functionName,
              result: answer(...args),
            }),
          }
        : { jsonrpc: "2.0", id, error: revert },
    );
  });
}

/** The contracts, deployed together, with an escrow from before the names under croquis.eth. */
const preEnsEscrowDeploy = (): Record<Address, FakeContract> => ({
  [configured.names]: {
    abi: croquisNamesAbi,
    answers: {
      NAMER_ROLE: () => NAMER_ROLE,
      hasRole: (role, account) => role === NAMER_ROLE && account === configured.relayer,
      parentName: () => toHex(packetToBytes(CROQUIS_PARENT_NAME)),
      STICKERS: () => configured.stickers,
    },
  },
  [configured.resolver]: {
    abi: croquisResolverAbi,
    answers: { STICKERS: () => configured.stickers },
  },
  [configured.escrow]: {
    abi: stickerGiftEscrowAbi,
    answers: { sticker: () => configured.stickers },
  },
});

const read = () =>
  readConfiguredContracts(
    createPublicClient({ chain: sepolia, transport: rpcTransport("https://rpc.test") }),
    configured,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading the configured contracts", () => {
  it.each([
    ["code 3", { code: 3, message: "execution reverted", data: "0x" }],
    ["Geth's -32000", { code: -32000, message: "execution reverted" }],
  ])(
    "reads what each answers, and an escrow whose names() reverts (%s) as having none",
    async (_, revert) => {
      fakeNode(preEnsEscrowDeploy(), revert);
      expect(await read()).toEqual({
        configured,
        relayerIsNamer: true,
        namesParent: CROQUIS_PARENT_NAME,
        namesStickers: configured.stickers,
        resolverStickers: configured.stickers,
        escrowSticker: configured.stickers,
        escrowNames: null,
      });
    },
  );

  it("rejects with ChainUnavailableError when the RPC fails", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    await expect(read()).rejects.toBeInstanceOf(ChainUnavailableError);
  });
});
