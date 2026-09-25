import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  stringToBytes,
} from "viem";
import { afterEach, describe, expect, it } from "vitest";
import { createStickerSealer } from "../src/seal-sticker.js";
import {
  readFoundryArtifact,
  startAnvil,
  type AnvilInstance,
} from "./helpers/foundry.js";

const artifact = readFoundryArtifact("StickerNFT", "StickerNFT");
const chain = defineChain({
  id: 4801,
  name: "Local World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost"] } },
});
const stickerId = "sticker-123";
const stickerKey = keccak256(stringToBytes(stickerId));
const contentHash = keccak256(stringToBytes("sealed-sticker-bytes"));
const metadataUri = "ipfs://bafybeigdyrzt5sticker/metadata.json";
const activeAnvils: AnvilInstance[] = [];

afterEach(async () => {
  await Promise.all(activeAnvils.splice(0).map(({ close }) => close()));
});

async function setup() {
  const anvil = await startAnvil(chain.id);
  activeAnvils.push(anvil);
  const publicClient = createPublicClient({ chain, transport: http(anvil.rpcUrl) });
  const accounts = anvil.accounts;
  const [admin, artist, recipient, stranger] = accounts;
  if (!admin || !artist || !recipient || !stranger) {
    throw new Error("Local chain did not create the required test accounts");
  }
  const walletClient = createWalletClient({ chain, transport: http(anvil.rpcUrl), account: admin });
  const deploymentHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [admin.address],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentHash });
  if (!receipt.contractAddress) throw new Error("StickerNFT deployment returned no address");
  return {
    publicClient,
    walletClient,
    contractAddress: receipt.contractAddress,
    admin,
    artist,
    recipient,
    stranger,
  };
}

type TestContext = Awaited<ReturnType<typeof setup>>;

async function sealSticker(context: TestContext, account = context.admin) {
  const hash = await context.walletClient.writeContract({
    address: context.contractAddress,
    abi: artifact.abi,
    functionName: "sealSticker",
    args: [context.artist.address, stickerKey, contentHash, metadataUri],
    account,
    chain,
  });
  return context.publicClient.waitForTransactionReceipt({ hash });
}

describe("StickerNFT", () => {
  it("mints a sealed sticker to its artist with immutable provenance", async () => {
    const context = await setup();
    await expect(sealSticker(context)).resolves.toMatchObject({ status: "success" });

    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "ownerOf",
      args: [1n],
    })).resolves.toBe(context.artist.address);
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "artistOf",
      args: [1n],
    })).resolves.toBe(context.artist.address);
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "contentHashOf",
      args: [1n],
    })).resolves.toBe(contentHash);
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "tokenURI",
      args: [1n],
    })).resolves.toBe(metadataUri);
  });

  it("allows only an approved sealer and only one NFT per sticker", async () => {
    const context = await setup();
    await expect(sealSticker(context, context.stranger)).rejects.toThrow();
    await sealSticker(context);
    await expect(sealSticker(context)).rejects.toThrow();
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "balanceOf",
      args: [context.artist.address],
    })).resolves.toBe(1n);
  });

  it("keeps the original artist and content after a later transfer", async () => {
    const context = await setup();
    await sealSticker(context);
    const hash = await context.walletClient.writeContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "safeTransferFrom",
      args: [context.artist.address, context.recipient.address, 1n],
      account: context.artist,
      chain,
    });
    await context.publicClient.waitForTransactionReceipt({ hash });

    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "ownerOf",
      args: [1n],
    })).resolves.toBe(context.recipient.address);
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "artistOf",
      args: [1n],
    })).resolves.toBe(context.artist.address);
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "contentHashOf",
      args: [1n],
    })).resolves.toBe(contentHash);
  });
});

describe("sticker sealing backend", () => {
  it("uses persisted artist data and reconciles retries", async () => {
    const context = await setup();
    const sealForArtist = createStickerSealer({
      publicClient: context.publicClient,
      walletClient: context.walletClient,
      contractAddress: context.contractAddress,
      sealerAccount: context.admin,
      abi: artifact.abi,
      findSticker: async (id) => id === stickerId ? {
        id,
        artistId: "line-user-1",
        sealedAt: "2026-09-25T00:00:00Z",
        contentHash,
        metadataUri,
      } : null,
      findArtistSmartWallet: async (artistId) => artistId === "line-user-1" ? {
        address: context.artist.address,
        kind: "smart_account",
        chainId: 4801,
      } : null,
    });

    await expect(sealForArtist({ artistId: "another-user", stickerId }))
      .rejects.toThrow("Sticker is not sealed for this artist");
    await expect(sealForArtist({ artistId: "line-user-1", stickerId }))
      .resolves.toMatchObject({ tokenId: 1n, alreadySealed: false });
    await expect(sealForArtist({ artistId: "line-user-1", stickerId }))
      .resolves.toEqual({ tokenId: 1n, alreadySealed: true });
  });

  it("refuses a signer EOA in place of the artist smart account", async () => {
    const context = await setup();
    const sealForArtist = createStickerSealer({
      publicClient: context.publicClient,
      walletClient: context.walletClient,
      contractAddress: context.contractAddress,
      sealerAccount: context.admin,
      abi: artifact.abi,
      findSticker: async () => ({
        id: stickerId,
        artistId: "line-user-1",
        sealedAt: "2026-09-25T00:00:00Z",
        contentHash,
        metadataUri,
      }),
      findArtistSmartWallet: async () => ({
        address: context.artist.address,
        kind: "signer_eoa",
        chainId: 4801,
      }),
    });

    await expect(sealForArtist({ artistId: "line-user-1", stickerId }))
      .rejects.toThrow("smart wallet is unavailable");
    await expect(context.publicClient.readContract({
      address: context.contractAddress,
      abi: artifact.abi,
      functionName: "tokenIdForSticker",
      args: [stickerKey],
    })).resolves.toBe(0n);
  });
});
