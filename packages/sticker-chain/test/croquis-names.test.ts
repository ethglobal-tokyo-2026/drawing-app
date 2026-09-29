import {
  createWalletClient,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  namehash,
  parseAbi,
  stringToBytes,
  toHex,
  type Hex,
} from "viem";
import { packetToBytes } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { createCroquisNames, stickerAvatar } from "../src/croquis-names.js";
import {
  answerGatewayRequest,
  encodeGatewayRequest,
  requestedName,
  signGatewayAnswer,
} from "../src/ens-gateway.js";
import { croquisNamesAbi, croquisResolverAbi, stickerNftAbi } from "../src/generated/contracts.js";
import { deployCroquisStack } from "./helpers/croquis.js";
import { deployStickerNft, localSepolia, startLocalChain } from "./helpers/foundry.js";

const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function multicall(bytes[] calls) view returns (bytes[])",
]);
const resolveAbi = parseAbi(["function resolve(bytes name, bytes data) view returns (bytes)"]);
const gatewayKey: Hex = `0x${"6a".repeat(32)}`;

async function setup() {
  const { accounts, transport, publicClient } = await startLocalChain();
  const [admin, artist, relayer] = accounts;
  if (!admin || !artist || !relayer) throw new Error("Local chain did not create test accounts");
  const walletClient = createWalletClient({ chain: localSepolia, transport, account: admin });
  const sticker = await deployStickerNft(publicClient, walletClient);
  const gatewaySigner = privateKeyToAccount(gatewayKey);
  const croquis = await deployCroquisStack({
    publicClient,
    walletClient,
    account: admin,
    chain: localSepolia,
    sticker,
    relayer: relayer.address,
    gatewaySigner: gatewaySigner.address,
  });
  const seal = await walletClient.writeContract({
    address: sticker,
    abi: stickerNftAbi,
    functionName: "sealSticker",
    args: [
      artist.address,
      keccak256(stringToBytes("first")),
      keccak256(stringToBytes("first")),
      "x",
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: seal });
  const relayerWallet = createWalletClient({ chain: localSepolia, transport, account: relayer });
  return { publicClient, relayerWallet, relayer, artist, sticker, gatewaySigner, ...croquis };
}

describe("createCroquisNames", () => {
  it("names a person and their sticker once each, and moves the person's avatar", async () => {
    const context = await setup();
    const progress: string[] = [];
    const names = createCroquisNames({
      publicClient: context.publicClient,
      walletClient: context.relayerWallet,
      account: context.relayer,
      namesAddress: context.names,
      onProgress: ({ stage, phase }) => progress.push(`${stage}:${phase}`),
    });
    const firstAvatar = stickerAvatar(localSepolia.id, context.sticker, 1n);
    const records = { avatar: firstAvatar, url: "https://app/@alice" };

    await expect(names.ensurePersonName(context.artist.address, "alice", records)).resolves.toEqual(
      {
        label: "alice",
        created: true,
      },
    );
    await expect(names.ensurePersonName(context.artist.address, "other", records)).resolves.toEqual(
      {
        label: "alice",
        created: false,
      },
    );
    await names.ensureStickerName(1n, "0001");
    await expect(names.ensureStickerName(1n, "0002")).resolves.toEqual({
      label: "0001",
      created: false,
    });
    await expect(
      context.publicClient.readContract({
        address: context.names,
        abi: croquisNamesAbi,
        functionName: "stickerNameOf",
        args: [1n],
      }),
    ).resolves.toBe("0001.alice.croquis.eth");
    // The sticker name's avatar is the same URI the app writes on the person's name.
    await expect(
      context.publicClient.readContract({
        address: context.resolver,
        abi: croquisResolverAbi,
        functionName: "text",
        args: [namehash("0001.alice.croquis.eth"), "avatar"],
      }),
    ).resolves.toBe(firstAvatar);

    const nextAvatar = stickerAvatar(localSepolia.id, context.sticker, 2n);
    await names.setAvatar(context.artist.address, nextAvatar);
    const personResolver = await context.publicClient.readContract({
      address: context.names,
      abi: croquisNamesAbi,
      functionName: "resolverOf",
      args: [context.artist.address],
    });
    const avatarCall = encodeFunctionData({
      abi: profileAbi,
      functionName: "text",
      args: [namehash("alice.croquis.eth"), "avatar"],
    });
    const resolved = await context.publicClient.readContract({
      address: personResolver,
      abi: resolveAbi,
      functionName: "resolve",
      args: [toHex(packetToBytes("alice.croquis.eth")), avatarCall],
    });
    expect(decodeAbiParameters([{ type: "string" }], resolved)[0]).toBe(nextAvatar);
    expect(progress).toEqual([
      "person_name:submitted",
      "person_name:completed",
      "person_name:skipped",
      "sticker_name:submitted",
      "sticker_name:completed",
      "sticker_name:skipped",
      "avatar:submitted",
      "avatar:completed",
    ]);
  }, 30_000);
});

describe("the ENS gateway", () => {
  it("signs answers CroquisResolver accepts, and only from its trusted signer", async () => {
    const context = await setup();
    const node = namehash("bob.croquis.eth");
    const call = encodeFunctionData({
      abi: profileAbi,
      functionName: "multicall",
      args: [
        [
          encodeFunctionData({ abi: profileAbi, functionName: "addr", args: [node] }),
          encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "url"] }),
          encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "unset"] }),
        ],
      ],
    });
    const request = encodeGatewayRequest("bob.croquis.eth", call);
    expect(requestedName(request)).toBe("bob.croquis.eth");
    const result = answerGatewayRequest(request, {
      address: context.artist.address,
      texts: { url: "https://app/@bob" },
    });
    const expires = BigInt(Math.floor(Date.now() / 1000) + 300);
    const answer = (signer = context.gatewaySigner) =>
      signGatewayAnswer({ signer, resolver: context.resolver, request, result, expires });

    const accepted = await context.publicClient.readContract({
      address: context.resolver,
      abi: croquisResolverAbi,
      functionName: "resolveWithProof",
      args: [await answer(), request],
    });
    const [answers] = decodeAbiParameters([{ type: "bytes[]" }], accepted);
    expect(answers).toEqual([
      encodeAbiParameters([{ type: "address" }], [context.artist.address]),
      encodeAbiParameters([{ type: "string" }], ["https://app/@bob"]),
      encodeAbiParameters([{ type: "string" }], [""]),
    ]);

    await expect(
      context.publicClient.readContract({
        address: context.resolver,
        abi: croquisResolverAbi,
        functionName: "resolveWithProof",
        args: [await answer(privateKeyToAccount(`0x${"0b".repeat(32)}`)), request],
      }),
    ).rejects.toThrow(/UntrustedGatewaySigner/);
  }, 30_000);
});
