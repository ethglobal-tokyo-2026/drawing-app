import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  keccak256,
  stringToBytes,
  type Hex,
} from "viem";
import { afterEach, describe, expect, it } from "vitest";
import { createGiftAuthorizer, createGiftClaim, prepareGiftTransfer } from "../src/gift-sticker.js";
import { readFoundryArtifact, startAnvil, type AnvilInstance } from "./helpers/foundry.js";

const stickerArtifact = readFoundryArtifact("StickerNFT", "StickerNFT");
const escrowArtifact = readFoundryArtifact("StickerGiftEscrow", "StickerGiftEscrow");
const chain = defineChain({
  id: 4801,
  name: "Local World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost"] } },
});
const contentHash = keccak256(stringToBytes("sealed-sticker-bytes"));
const activeAnvils: AnvilInstance[] = [];

afterEach(async () => {
  await Promise.all(activeAnvils.splice(0).map(({ close }) => close()));
});

async function setup() {
  const anvil = await startAnvil(chain.id);
  activeAnvils.push(anvil);
  const transport = http(anvil.rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const testClient = createTestClient({ chain, mode: "anvil", transport });
  const accounts = anvil.accounts;
  const [admin, artist, recipient, claimSigner, stranger, relayer] = accounts;
  if (!admin || !artist || !recipient || !claimSigner || !stranger || !relayer) {
    throw new Error("Local chain did not create the required test accounts");
  }
  const walletClient = createWalletClient({ chain, transport, account: admin });
  const stickerDeployment = await walletClient.deployContract({
    abi: stickerArtifact.abi,
    bytecode: stickerArtifact.bytecode,
    args: [admin.address],
  });
  const stickerReceipt = await publicClient.waitForTransactionReceipt({ hash: stickerDeployment });
  if (!stickerReceipt.contractAddress) throw new Error("Sticker deployment returned no address");
  const escrowDeployment = await walletClient.deployContract({
    abi: escrowArtifact.abi,
    bytecode: escrowArtifact.bytecode,
    args: [stickerReceipt.contractAddress, admin.address, claimSigner.address],
  });
  const escrowReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowDeployment });
  if (!escrowReceipt.contractAddress) throw new Error("Escrow deployment returned no address");
  const mintHash = await walletClient.writeContract({
    address: stickerReceipt.contractAddress,
    abi: stickerArtifact.abi,
    functionName: "sealSticker",
    args: [
      artist.address,
      keccak256(stringToBytes("sticker-for-giving")),
      contentHash,
      "ipfs://sticker/metadata.json",
    ],
    account: admin,
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  return {
    publicClient,
    testClient,
    walletClient,
    stickerAddress: stickerReceipt.contractAddress,
    escrowAddress: escrowReceipt.contractAddress,
    admin,
    artist,
    recipient,
    claimSigner,
    stranger,
    relayer,
  };
}

type TestContext = Awaited<ReturnType<typeof setup>>;

async function stageGift(context: TestContext, expiresAt: number) {
  let seed = 1;
  const claim = createGiftClaim((size) => new Uint8Array(size).fill(seed++));
  const transfer = prepareGiftTransfer({
    sender: context.artist.address,
    stickerContract: context.stickerAddress,
    escrowContract: context.escrowAddress,
    tokenId: 1n,
    giftId: claim.giftId,
    claimCommitment: claim.claimCommitment,
    expiresAt,
  });
  const hash = await context.walletClient.sendTransaction({
    ...transfer,
    account: context.artist,
    chain,
  });
  await context.publicClient.waitForTransactionReceipt({ hash });
  return claim;
}

function createAuthorizer(
  context: TestContext,
  giftId: Hex,
  claimCommitment: Hex,
  expiresAt: number,
  signer = context.claimSigner,
) {
  return createGiftAuthorizer({
    signer,
    chainId: chain.id,
    escrowContract: context.escrowAddress,
    findGift: async (requestedGiftId) =>
      requestedGiftId === giftId
        ? {
            giftId,
            claimCommitment,
            expiresAt,
            status: "pending",
          }
        : null,
    findArtistSmartWallet: async (artistId) =>
      artistId === "recipient-artist"
        ? {
            address: context.recipient.address,
            kind: "smart_account",
            chainId: chain.id,
          }
        : artistId === "recipient-with-signer-only"
          ? {
              address: context.recipient.address,
              kind: "signer_eoa",
              chainId: chain.id,
            }
          : null,
  });
}

describe("StickerGiftEscrow", () => {
  it("stages a gift before the recipient has a smart account", async () => {
    const context = await setup();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const claim = await stageGift(context, expiresAt);

    await expect(
      context.publicClient.readContract({
        address: context.stickerAddress,
        abi: stickerArtifact.abi,
        functionName: "ownerOf",
        args: [1n],
      }),
    ).resolves.toBe(getAddress(context.escrowAddress));
    const gift = await context.publicClient.readContract({
      address: context.escrowAddress,
      abi: escrowArtifact.abi,
      functionName: "gifts",
      args: [claim.giftId],
    });
    if (!Array.isArray(gift)) throw new Error("Escrow returned invalid gift data");
    expect(gift).toEqual([
      context.artist.address,
      "0x0000000000000000000000000000000000000000",
      1n,
      claim.claimCommitment,
      BigInt(expiresAt),
      1,
    ]);
  }, 20_000);

  it("releases a staged sticker to a later-created smart account", async () => {
    const context = await setup();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const claim = await stageGift(context, expiresAt);
    const authorizer = createAuthorizer(context, claim.giftId, claim.claimCommitment, expiresAt);
    const authorized = await authorizer.authorizeClaim({
      giftId: claim.giftId,
      claimToken: claim.claimToken,
      recipientArtistId: "recipient-artist",
    });
    const hash = await context.walletClient.writeContract({
      address: context.escrowAddress,
      abi: escrowArtifact.abi,
      functionName: "claimGift",
      args: [
        claim.giftId,
        context.recipient.address,
        BigInt(authorized.authorizationDeadline),
        authorized.authorization,
      ],
      account: context.relayer,
      chain,
    });
    await context.publicClient.waitForTransactionReceipt({ hash });

    await expect(
      context.publicClient.readContract({
        address: context.stickerAddress,
        abi: stickerArtifact.abi,
        functionName: "ownerOf",
        args: [1n],
      }),
    ).resolves.toBe(context.recipient.address);
    await expect(
      context.publicClient.readContract({
        address: context.escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "pendingGiftForToken",
        args: [1n],
      }),
    ).resolves.toBe(`0x${"00".repeat(32)}`);
  }, 20_000);

  it("rejects invalid claim tokens, signer authorizations, and signer EOAs", async () => {
    const context = await setup();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const claim = await stageGift(context, expiresAt);
    const authorizer = createAuthorizer(context, claim.giftId, claim.claimCommitment, expiresAt);
    await expect(
      authorizer.authorizeClaim({
        giftId: claim.giftId,
        claimToken: `0x${"ff".repeat(32)}`,
        recipientArtistId: "recipient-artist",
      }),
    ).rejects.toThrow("claim token is invalid");
    await expect(
      authorizer.authorizeClaim({
        giftId: claim.giftId,
        claimToken: claim.claimToken,
        recipientArtistId: "recipient-with-signer-only",
      }),
    ).rejects.toThrow("smart wallet is unavailable");

    const unauthorized = await createAuthorizer(
      context,
      claim.giftId,
      claim.claimCommitment,
      expiresAt,
      context.stranger,
    ).authorizeClaim({
      giftId: claim.giftId,
      claimToken: claim.claimToken,
      recipientArtistId: "recipient-artist",
    });
    await expect(
      context.walletClient.writeContract({
        address: context.escrowAddress,
        abi: escrowArtifact.abi,
        functionName: "claimGift",
        args: [
          claim.giftId,
          context.recipient.address,
          BigInt(unauthorized.authorizationDeadline),
          unauthorized.authorization,
        ],
        account: context.relayer,
        chain,
      }),
    ).rejects.toThrow();
  }, 20_000);

  it("returns rejected and expired gifts to the sender", async () => {
    const rejectedContext = await setup();
    const rejectedExpiresAt = Math.floor(Date.now() / 1000) + 3600;
    const rejectedClaim = await stageGift(rejectedContext, rejectedExpiresAt);
    const rejection = await createAuthorizer(
      rejectedContext,
      rejectedClaim.giftId,
      rejectedClaim.claimCommitment,
      rejectedExpiresAt,
    ).authorizeRejection({
      giftId: rejectedClaim.giftId,
      claimToken: rejectedClaim.claimToken,
    });
    const rejectionHash = await rejectedContext.walletClient.writeContract({
      address: rejectedContext.escrowAddress,
      abi: escrowArtifact.abi,
      functionName: "rejectGift",
      args: [
        rejectedClaim.giftId,
        BigInt(rejection.authorizationDeadline),
        rejection.authorization,
      ],
      account: rejectedContext.relayer,
      chain,
    });
    await rejectedContext.publicClient.waitForTransactionReceipt({ hash: rejectionHash });
    await expect(
      rejectedContext.publicClient.readContract({
        address: rejectedContext.stickerAddress,
        abi: stickerArtifact.abi,
        functionName: "ownerOf",
        args: [1n],
      }),
    ).resolves.toBe(rejectedContext.artist.address);

    const expiredContext = await setup();
    const expiredAt = Math.floor(Date.now() / 1000) + 60;
    const expiredClaim = await stageGift(expiredContext, expiredAt);
    await expiredContext.testClient.increaseTime({ seconds: 120 });
    await expiredContext.testClient.mine({ blocks: 1 });
    const returnHash = await expiredContext.walletClient.writeContract({
      address: expiredContext.escrowAddress,
      abi: escrowArtifact.abi,
      functionName: "returnExpiredGift",
      args: [expiredClaim.giftId],
      account: expiredContext.stranger,
      chain,
    });
    await expiredContext.publicClient.waitForTransactionReceipt({ hash: returnHash });
    await expect(
      expiredContext.publicClient.readContract({
        address: expiredContext.stickerAddress,
        abi: stickerArtifact.abi,
        functionName: "ownerOf",
        args: [1n],
      }),
    ).resolves.toBe(expiredContext.artist.address);
  }, 30_000);
});
